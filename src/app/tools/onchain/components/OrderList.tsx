"use client";

import { useEffect, useState } from "react";
import type { ScheduledOrder, ScheduledOrderStatus } from "../types";

type Props = {
  orders: ScheduledOrder[];
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
};

const STATUS_LABEL: Record<ScheduledOrderStatus, string> = {
  pending: "等待中",
  executing: "执行中",
  completed: "已完成",
  failed: "失败",
  cancelled: "已取消",
};

const STATUS_CLASS: Record<ScheduledOrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  executing: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

function formatCountdown(iso: string, now: number): string {
  const diff = new Date(iso).getTime() - now;
  if (diff <= 0) return "即将执行";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return `${h} 时 ${m} 分 ${s} 秒`;
}

function formatLocalTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

/** 独立计时器，now 参与渲染，避免 React Compiler 跳过未使用的 tick 更新 */
function PendingCountdown({ scheduledAt }: { scheduledAt: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <p className="text-sm font-mono text-[var(--accent)]">
      倒计时：{formatCountdown(scheduledAt, now)}
    </p>
  );
}

export function OrderList({ orders, onCancel, onRemove }: Props) {
  if (orders.length === 0) {
    return (
      <div className="ev-card text-sm text-[var(--muted)]">
        暂无定时单。创建后请保持本页面打开，到点才会自动发交易。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-lg">定时单列表</h2>
      {orders.map((order) => (
        <article key={order.id} className="ev-card space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-medium">{order.label}</h3>
              <p className="text-sm text-[var(--muted)]">
                {order.side === "buy" ? "买入" : "卖出"} · 计划{" "}
                {formatLocalTime(order.scheduledAt)}
              </p>
            </div>
            <span
              className={`text-xs font-medium px-2 py-1 rounded ${STATUS_CLASS[order.status]}`}
            >
              {STATUS_LABEL[order.status]}
            </span>
          </div>

          {order.status === "pending" && (
            <PendingCountdown scheduledAt={order.scheduledAt} />
          )}

          <dl className="grid gap-1 text-xs font-mono text-[var(--muted)] sm:grid-cols-2">
            <div>
              <dt className="inline">To: </dt>
              <dd className="inline break-all">{order.to}</dd>
            </div>
            <div>
              <dt className="inline">Value: </dt>
              <dd className="inline">{order.valueEth} ETH</dd>
            </div>
            {order.txHash && (
              <div className="sm:col-span-2">
                <dt className="inline">Tx: </dt>
                <dd className="inline break-all">{order.txHash}</dd>
              </div>
            )}
            {order.errorMessage && (
              <div className="sm:col-span-2 text-red-600 dark:text-red-400">
                {order.errorMessage}
              </div>
            )}
          </dl>

          <div className="flex gap-2">
            {order.status === "pending" && (
              <button
                type="button"
                onClick={() => onCancel(order.id)}
                className="px-3 py-1.5 text-sm border border-[var(--border)] rounded hover:bg-[var(--hover)]"
              >
                取消
              </button>
            )}
            {order.status !== "pending" && order.status !== "executing" && (
              <button
                type="button"
                onClick={() => onRemove(order.id)}
                className="px-3 py-1.5 text-sm text-red-600 border border-red-200 dark:border-red-900 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                删除
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
