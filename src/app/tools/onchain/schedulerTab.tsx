"use client";

import { useState } from "react";
import { ScheduleOrderForm } from "./components/ScheduleOrderForm";
import { OrderList } from "./components/OrderList";
import { useScheduledOrders } from "./useScheduledOrders";

export default function SchedulerTab() {
  const { orders, hydrated, addOrder, cancelOrder, removeOrder } =
    useScheduledOrders();
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(
    null
  );

  function showToast(type: "ok" | "err", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <div className="space-y-8">
      <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-sm dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        <strong>注意：</strong>定时任务在本浏览器标签页内运行，关闭页面后不会执行。私钥保存在本机
        localStorage，仅建议在测试环境使用小额钱包。
      </div>

      {toast && (
        <div
          className={`p-3 rounded text-sm ${
            toast.type === "ok"
              ? "bg-green-50 text-green-800 border border-green-200 dark:bg-green-950/30 dark:text-green-200 dark:border-green-900"
              : "bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/30 dark:text-red-200 dark:border-red-900"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <ScheduleOrderForm
        onSubmit={(input) => {
          try {
            addOrder(input);
            showToast("ok", "定时单已创建");
          } catch (err) {
            showToast(
              "err",
              err instanceof Error ? err.message : String(err)
            );
          }
        }}
      />

      {hydrated ? (
        <OrderList
          orders={orders}
          onCancel={cancelOrder}
          onRemove={removeOrder}
        />
      ) : (
        <p className="text-sm text-[var(--muted)]">加载中…</p>
      )}
    </div>
  );
}
