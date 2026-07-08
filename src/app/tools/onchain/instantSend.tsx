"use client";

import { useEffect, useState } from "react";
import {
  broadcastTransaction,
  simulateTransaction,
  type SimulateResult,
} from "./simulateTransaction";
import { TxValueGasFields } from "./components/TxValueGasFields";
import { consumeCalldataForInstant } from "@/app/tools/calldata/calldataTransfer";

const emptyForm = {
  rpcUrl: "",
  privateKey: "",
  to: "",
  valueEth: "0",
  data: "",
  gasLimit: "",
};

export default function InstantSend() {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [simulateResult, setSimulateResult] = useState<SimulateResult | null>(
    null
  );
  const [txHash, setTxHash] = useState("");
  const [prefilledFromCalldata, setPrefilledFromCalldata] = useState(false);

  useEffect(() => {
    const pending = consumeCalldataForInstant();
    if (pending) {
      setForm((prev) => ({ ...prev, data: pending }));
      setPrefilledFromCalldata(true);
    }
  }, []);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSimulateResult(null);
    setTxHash("");
    setError("");
  }

  function validateForm(): boolean {
    if (!form.rpcUrl.startsWith("http")) {
      setError("请输入有效的 RPC URL");
      return false;
    }
    if (!form.privateKey.trim()) {
      setError("请填写私钥");
      return false;
    }
    if (!form.to.startsWith("0x") || form.to.length !== 42) {
      setError("请填写有效的合约/接收地址 (0x + 40 hex)");
      return false;
    }
    return true;
  }

  function payload() {
    return {
      rpcUrl: form.rpcUrl.trim(),
      privateKey: form.privateKey.trim(),
      to: form.to.trim(),
      valueEth: form.valueEth.trim() || "0",
      data: form.data.trim(),
      gasLimit: form.gasLimit.trim(),
    };
  }

  async function handleSimulate() {
    if (!validateForm()) return;

    setSimulating(true);
    setError("");
    setSimulateResult(null);

    try {
      const result = await simulateTransaction(payload());
      setSimulateResult(result);
    } catch (err) {
      setError("模拟失败：" + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSimulating(false);
    }
  }

  async function handleBroadcast() {
    if (!validateForm()) return;

    setBroadcasting(true);
    setError("");
    setTxHash("");

    try {
      const { txHash: hash } = await broadcastTransaction(payload());
      setTxHash(hash);
    } catch (err) {
      setError("广播失败：" + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBroadcasting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-lg">即刻上链</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          填写 calldata 后先模拟，确认无误再广播。广播时自动提高 gas limit（+25%）与
          priority fee，优先快速进块。
        </p>
      </div>

      {prefilledFromCalldata && (
        <div className="p-3 rounded border border-blue-200 bg-blue-50 text-blue-900 text-sm dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
          已从 Calldata 工具填充 Calldata，请继续配置 RPC、私钥和 To 地址。
        </div>
      )}

      <div className="ev-card space-y-4">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">RPC URL</span>
          <input
            className="w-full border border-[var(--border)] rounded p-2 bg-[var(--card)] font-mono text-sm"
            value={form.rpcUrl}
            onChange={(e) => update("rpcUrl", e.target.value)}
            placeholder="https://..."
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">私钥</span>
          <input
            type="password"
            className="w-full border border-[var(--border)] rounded p-2 bg-[var(--card)] font-mono text-sm"
            value={form.privateKey}
            onChange={(e) => update("privateKey", e.target.value)}
            placeholder="0x..."
            autoComplete="off"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">To（Router / 合约地址）</span>
          <input
            className="w-full border border-[var(--border)] rounded p-2 bg-[var(--card)] font-mono text-sm"
            value={form.to}
            onChange={(e) => update("to", e.target.value)}
            placeholder="0x..."
          />
        </label>

        <TxValueGasFields
          valueEth={form.valueEth}
          gasLimit={form.gasLimit}
          onValueEthChange={(v) => update("valueEth", v)}
          onGasLimitChange={(v) => update("gasLimit", v)}
        />

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Calldata（十六进制）</span>
          <textarea
            className="w-full h-32 border border-[var(--border)] rounded p-2 bg-[var(--card)] font-mono text-xs"
            value={form.data}
            onChange={(e) => update("data", e.target.value)}
            placeholder="0x..."
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleSimulate()}
            disabled={simulating || broadcasting}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 text-sm"
          >
            {simulating ? "模拟中…" : "模拟"}
          </button>
          <button
            type="button"
            onClick={() => void handleBroadcast()}
            disabled={simulating || broadcasting}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50 text-sm"
          >
            {broadcasting ? "广播中…" : "广播"}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {simulateResult && (
          <div className="p-3 rounded border border-[var(--border)] bg-[var(--bg)] text-sm font-mono space-y-1">
            <p className="font-semibold text-[var(--fg)]">模拟成功（快速上链参数）</p>
            <p>From: {simulateResult.from}</p>
            <p>Gas 估算: {simulateResult.gasEstimate}</p>
            <p>Gas Limit（含缓冲）: {simulateResult.gasLimit}</p>
            {simulateResult.maxPriorityFeePerGas && (
              <p>Max Priority Fee: {simulateResult.maxPriorityFeePerGas}</p>
            )}
            {simulateResult.maxFeePerGas && (
              <p>Max Fee: {simulateResult.maxFeePerGas}</p>
            )}
            {simulateResult.gasPrice && (
              <p>Gas Price: {simulateResult.gasPrice}</p>
            )}
            <p className="break-all">Call 返回: {simulateResult.callResult}</p>
          </div>
        )}

        {txHash && (
          <div className="p-3 rounded border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 text-sm">
            <p className="font-semibold text-green-800 dark:text-green-200">
              已提交（加速 gas）
            </p>
            <p className="font-mono break-all mt-1">{txHash}</p>
            <p className="text-xs text-[var(--muted)] mt-2">
              交易已进入 mempool，可在区块浏览器查看确认状态。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
