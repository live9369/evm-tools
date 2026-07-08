import { JsonRpcProvider, Wallet } from "ethers";
import { buildTxRequest, type TxInput } from "./buildTxRequest";
import { applyFastFeesToTx, resolveFastTxFees } from "./fastTxFees";

export type SimulateInput = TxInput & {
  rpcUrl: string;
  privateKey: string;
};

export type SimulateResult = {
  from: string;
  gasEstimate: string;
  gasLimit: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  gasPrice?: string;
  callResult: string;
};

export async function simulateTransaction(
  input: SimulateInput
): Promise<SimulateResult> {
  const provider = new JsonRpcProvider(input.rpcUrl);
  const wallet = new Wallet(input.privateKey, provider);
  const base = buildTxRequest(input);
  const fees = await resolveFastTxFees(provider, input);
  const txRequest = applyFastFeesToTx(base, fees);

  const callResult = await provider.call({
    from: wallet.address,
    to: txRequest.to,
    value: txRequest.value,
    data: txRequest.data,
  });

  return {
    from: wallet.address,
    gasEstimate: fees.gasEstimate.toString(),
    gasLimit: fees.gasLimit.toString(),
    maxFeePerGas: fees.maxFeePerGas?.toString(),
    maxPriorityFeePerGas: fees.maxPriorityFeePerGas?.toString(),
    gasPrice: fees.gasPrice?.toString(),
    callResult,
  };
}

export async function broadcastTransaction(
  input: SimulateInput
): Promise<{ txHash: string }> {
  const provider = new JsonRpcProvider(input.rpcUrl);
  const wallet = new Wallet(input.privateKey, provider);
  const base = buildTxRequest(input);
  const fees = await resolveFastTxFees(provider, input);
  const txRequest = applyFastFeesToTx(base, fees);

  const tx = await wallet.sendTransaction(txRequest);
  return { txHash: tx.hash };
}
