export type OrderSide = "buy" | "sell";

export type ScheduledOrderStatus =
  | "pending"
  | "executing"
  | "completed"
  | "failed"
  | "cancelled";

export type ScheduledOrder = {
  id: string;
  label: string;
  side: OrderSide;
  /** ISO 8601 */
  scheduledAt: string;
  rpcUrl: string;
  privateKey: string;
  to: string;
  /** ETH 字符串，如 "0.1" */
  valueEth: string;
  /** 0x 开头的 calldata，可为空 */
  data: string;
  gasLimit: string;
  status: ScheduledOrderStatus;
  createdAt: string;
  executedAt?: string;
  txHash?: string;
  errorMessage?: string;
};

export type ScheduledOrderInput = Omit<
  ScheduledOrder,
  "id" | "status" | "createdAt" | "executedAt" | "txHash" | "errorMessage"
>;
