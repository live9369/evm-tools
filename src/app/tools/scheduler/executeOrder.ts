import { JsonRpcProvider, Wallet, parseEther, isHexString } from "ethers";
import type { ScheduledOrder } from "./types";

export async function executeScheduledOrder(
  order: ScheduledOrder
): Promise<{ txHash: string }> {
  const provider = new JsonRpcProvider(order.rpcUrl);
  const wallet = new Wallet(order.privateKey, provider);

  const value =
    order.valueEth.trim() === ""
      ? BigInt(0)
      : parseEther(order.valueEth.trim());

  const data =
    order.data.trim() === ""
      ? "0x"
      : order.data.trim().startsWith("0x")
        ? order.data.trim()
        : `0x${order.data.trim()}`;

  if (!isHexString(data)) {
    throw new Error("calldata 不是合法的十六进制");
  }

  const txRequest: {
    to: string;
    value: bigint;
    data: string;
    gasLimit?: bigint;
  } = {
    to: order.to,
    value,
    data,
  };

  if (order.gasLimit.trim() !== "") {
    const gas = BigInt(order.gasLimit.trim());
    if (gas <= BigInt(0)) throw new Error("gas limit 必须大于 0");
    txRequest.gasLimit = gas;
  }

  const tx = await wallet.sendTransaction(txRequest);
  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error("交易已发送但未收到回执");
  }

  return { txHash: receipt.hash };
}
