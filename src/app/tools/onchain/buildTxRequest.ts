import { parseEther, isHexString } from "ethers";

export type TxInput = {
  to: string;
  valueEth: string;
  data: string;
  gasLimit: string;
  from?: string;
};

export function buildTxRequest(input: TxInput): {
  to: string;
  value: bigint;
  data: string;
  gasLimit?: bigint;
} {
  const value =
    input.valueEth.trim() === ""
      ? BigInt(0)
      : parseEther(input.valueEth.trim());

  const data =
    input.data.trim() === ""
      ? "0x"
      : input.data.trim().startsWith("0x")
        ? input.data.trim()
        : `0x${input.data.trim()}`;

  if (!isHexString(data)) {
    throw new Error("calldata 不是合法的十六进制");
  }

  const txRequest: {
    to: string;
    value: bigint;
    data: string;
    gasLimit?: bigint;
  } = {
    to: input.to,
    value,
    data,
  };

  if (input.gasLimit.trim() !== "") {
    const gas = BigInt(input.gasLimit.trim());
    if (gas <= BigInt(0)) throw new Error("gas limit 必须大于 0");
    txRequest.gasLimit = gas;
  }

  return txRequest;
}
