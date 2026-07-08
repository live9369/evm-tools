import { JsonRpcProvider, Wallet } from "ethers";
import type { ScheduledOrder } from "./types";
import { buildTxRequest } from "./buildTxRequest";

export async function executeScheduledOrder(
  order: ScheduledOrder
): Promise<{ txHash: string }> {
  const provider = new JsonRpcProvider(order.rpcUrl);
  const wallet = new Wallet(order.privateKey, provider);
  const txRequest = buildTxRequest(order);

  const tx = await wallet.sendTransaction(txRequest);
  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error("交易已发送但未收到回执");
  }

  return { txHash: receipt.hash };
}
