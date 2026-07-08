"use client";

import { useState } from "react";
import type { ScheduledOrderInput, OrderSide } from "../types";

type Props = {
  onSubmit: (input: ScheduledOrderInput) => void;
};

const emptyForm = {
  label: "",
  side: "buy" as OrderSide,
  scheduledAt: "",
  rpcUrl: "",
  privateKey: "",
  to: "",
  valueEth: "0",
  data: "",
  gasLimit: "",
};

function defaultDateTimeLocal(): string {
  const d = new Date();
  d.setHours(20, 0, 0, 0);
  if (d.getTime() <= Date.now()) {
    d.setDate(d.getDate() + 1);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScheduleOrderForm({ onSubmit }: Props) {
  const [form, setForm] = useState({ ...emptyForm, scheduledAt: defaultDateTimeLocal() });
  const [error, setError] = useState("");

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.rpcUrl.startsWith("http")) {
      setError("请输入有效的 RPC URL");
      return;
    }
    if (!form.privateKey.trim()) {
      setError("请填写私钥");
      return;
    }
    if (!form.to.startsWith("0x") || form.to.length !== 42) {
      setError("请填写有效的合约/接收地址 (0x + 40 hex)");
      return;
    }

    try {
      const scheduledAt = new Date(form.scheduledAt).toISOString();
      onSubmit({
        label: form.label.trim() || `${form.side === "buy" ? "买入" : "卖出"} 定时单`,
        side: form.side,
        scheduledAt,
        rpcUrl: form.rpcUrl.trim(),
        privateKey: form.privateKey.trim(),
        to: form.to.trim(),
        valueEth: form.valueEth.trim() || "0",
        data: form.data.trim(),
        gasLimit: form.gasLimit.trim(),
      });
      setForm({ ...emptyForm, scheduledAt: defaultDateTimeLocal() });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="ev-card space-y-4">
      <h2 className="font-semibold text-lg">新建定时单</h2>
      <p className="text-sm text-[var(--muted)]">
        到点自动发送链上交易。买入/卖出需自行在 Calldata 工具构造好 calldata 后粘贴到下方。
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">备注</span>
          <input
            className="w-full border border-[var(--border)] rounded p-2 bg-[var(--card)]"
            value={form.label}
            onChange={(e) => update("label", e.target.value)}
            placeholder="例如：晚上8点买 PEPE"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">方向</span>
          <select
            className="w-full border border-[var(--border)] rounded p-2 bg-[var(--card)]"
            value={form.side}
            onChange={(e) => update("side", e.target.value as OrderSide)}
          >
            <option value="buy">买入</option>
            <option value="sell">卖出</option>
          </select>
        </label>

        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="font-medium">执行时间（本地时区）</span>
          <input
            type="datetime-local"
            className="w-full border border-[var(--border)] rounded p-2 bg-[var(--card)]"
            value={form.scheduledAt}
            onChange={(e) => update("scheduledAt", e.target.value)}
            required
          />
        </label>

        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="font-medium">RPC URL</span>
          <input
            className="w-full border border-[var(--border)] rounded p-2 bg-[var(--card)] font-mono text-sm"
            value={form.rpcUrl}
            onChange={(e) => update("rpcUrl", e.target.value)}
            placeholder="https://..."
            required
          />
        </label>

        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="font-medium">私钥</span>
          <input
            type="password"
            className="w-full border border-[var(--border)] rounded p-2 bg-[var(--card)] font-mono text-sm"
            value={form.privateKey}
            onChange={(e) => update("privateKey", e.target.value)}
            placeholder="0x..."
            autoComplete="off"
            required
          />
        </label>

        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="font-medium">To（Router / 合约地址）</span>
          <input
            className="w-full border border-[var(--border)] rounded p-2 bg-[var(--card)] font-mono text-sm"
            value={form.to}
            onChange={(e) => update("to", e.target.value)}
            placeholder="0x..."
            required
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">Value (ETH)</span>
          <span className="text-xs text-[var(--muted)] block">
            例如 0.1 ETH 填 0.1（ETH 单位，无需补 18 位 wei）
          </span>
          <input
            className="w-full border border-[var(--border)] rounded p-2 bg-[var(--card)]"
            value={form.valueEth}
            onChange={(e) => update("valueEth", e.target.value)}
            placeholder="0.1"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">Gas Limit（可选）</span>
          <input
            className="w-full border border-[var(--border)] rounded p-2 bg-[var(--card)]"
            value={form.gasLimit}
            onChange={(e) => update("gasLimit", e.target.value)}
            placeholder="留空自动估算"
          />
        </label>

        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="font-medium">Calldata</span>
          <textarea
            className="w-full h-28 border border-[var(--border)] rounded p-2 bg-[var(--card)] font-mono text-xs"
            value={form.data}
            onChange={(e) => update("data", e.target.value)}
            placeholder="0x...（从 Calldata 工具复制）"
          />
        </label>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="px-4 py-2 bg-[var(--accent)] text-white rounded hover:opacity-90 transition"
      >
        添加定时单
      </button>
    </form>
  );
}
