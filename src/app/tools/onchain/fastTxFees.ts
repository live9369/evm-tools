import {
  JsonRpcProvider,
  type TransactionRequest,
  parseUnits,
} from "ethers";
import { buildTxRequest, type TxInput } from "./buildTxRequest";

/** gas limit 在估算基础上 +25% */
const GAS_LIMIT_NUM = BigInt(125);
const GAS_LIMIT_DEN = BigInt(100);

/** priority / legacy gas price 加价倍数（×1.5） */
const FEE_BUMP_NUM = BigInt(15);
const FEE_BUMP_DEN = BigInt(10);

/** 最低 priority fee（2 gwei） */
const MIN_PRIORITY_FEE = parseUnits("2", "gwei");

export type FastTxFees = {
  gasEstimate: bigint;
  gasLimit: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  gasPrice?: bigint;
};

function bump(value: bigint, min?: bigint): bigint {
  const bumped = (value * FEE_BUMP_NUM) / FEE_BUMP_DEN;
  if (min !== undefined && bumped < min) return min;
  return bumped;
}

export async function resolveFastTxFees(
  provider: JsonRpcProvider,
  input: TxInput
): Promise<FastTxFees> {
  const base = buildTxRequest(input);
  const estimateRequest: {
    to: string;
    value: bigint;
    data: string;
    from?: string;
  } = { to: base.to, value: base.value, data: base.data };
  if (input.from) estimateRequest.from = input.from;

  const gasEstimate = await provider.estimateGas(estimateRequest);
  const gasLimit =
    base.gasLimit ??
    (gasEstimate * GAS_LIMIT_NUM) / GAS_LIMIT_DEN + BigInt(50_000);

  const feeData = await provider.getFeeData();
  const block = await provider.getBlock("latest");
  const baseFee = block?.baseFeePerGas ?? BigInt(0);

  if (feeData.maxFeePerGas != null && feeData.maxPriorityFeePerGas != null) {
    const maxPriorityFeePerGas = bump(
      feeData.maxPriorityFeePerGas,
      MIN_PRIORITY_FEE
    );
    const networkMax = feeData.maxFeePerGas;
    const fromBaseFee =
      baseFee > BigInt(0) ? baseFee * BigInt(2) + maxPriorityFeePerGas : networkMax;
    const bumpedMax = bump(networkMax);
    const maxFeePerGas =
      fromBaseFee > bumpedMax ? fromBaseFee : bumpedMax;

    return {
      gasEstimate,
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
    };
  }

  const gasPrice = bump(
    feeData.gasPrice ?? parseUnits("30", "gwei")
  );

  return {
    gasEstimate,
    gasLimit,
    gasPrice,
  };
}

export function applyFastFeesToTx(
  tx: ReturnType<typeof buildTxRequest>,
  fees: FastTxFees
): TransactionRequest {
  const request: TransactionRequest = {
    to: tx.to,
    value: tx.value,
    data: tx.data,
    gasLimit: fees.gasLimit,
  };

  if (fees.maxFeePerGas != null && fees.maxPriorityFeePerGas != null) {
    request.maxFeePerGas = fees.maxFeePerGas;
    request.maxPriorityFeePerGas = fees.maxPriorityFeePerGas;
  } else if (fees.gasPrice != null) {
    request.gasPrice = fees.gasPrice;
  }

  return request;
}
