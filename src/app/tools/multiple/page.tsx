"use client";

import { useState } from "react";
import {
  PANCAKE_BSC,
  V3_FEE_TIERS,
  defaultRouter,
  type DexVersion,
} from "./pancake";
import {
  buildWarmupConfigKey,
  executeBatchSwap,
  executeWarmup,
  isWarmupValid,
  parsePrivateKeys,
  previewQuote,
  queryInputBalances,
  swapFormToJson,
  type BatchBalanceResult,
  type BatchSwapResult,
  type SwapForm,
  type WalletSwapStatus,
  type WalletWarmupStatus,
  type WarmupResult,
} from "./swap";
import { copyText } from "./copyText";

const inputClass =
  "w-full border border-[var(--border)] rounded p-2 bg-[var(--card)] font-mono text-sm";

const privateKeysPlaceholder = `[
  "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
]`;
const emptyForm: SwapForm = {
  rpcUrl: "https://bsc-dataseed.binance.org",
  version: "v2",
  routerAddress: PANCAKE_BSC.routerV2,
  tokenIn: "",
  tokenOut: "",
  fee: 2500,
  amountMode: "fixed",
  amountIn: "",
  amountPercent: "100",
  slippagePercent: "0.5",
  deadlineMinutes: "20",
  nativeIn: false,
  nativeOut: false,
  privateKeysText: "",
};

function statusColor(status: WalletSwapStatus["status"]) {
  switch (status) {
    case "success":
      return "text-green-700 dark:text-green-300";
    case "error":
      return "text-red-700 dark:text-red-300";
    case "pending":
      return "text-[var(--muted)]";
    case "skipped":
      return "text-[var(--muted)]";
    default:
      return "text-blue-700 dark:text-blue-300";
  }
}

function warmupStatusColor(status: WalletWarmupStatus["status"]) {
  switch (status) {
    case "ready":
      return "text-green-700 dark:text-green-300";
    case "error":
      return "text-red-700 dark:text-red-300";
    case "skipped":
    case "pending":
      return "text-[var(--muted)]";
    default:
      return "text-blue-700 dark:text-blue-300";
  }
}

export default function MultipleSwapPage() {
  const [form, setForm] = useState<SwapForm>(emptyForm);
  const [error, setError] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [quote, setQuote] = useState<{
    amountOut: string;
    amountOutMin: string;
    amountInUsed: string;
    path: string[];
    note?: string;
  } | null>(null);
  const [result, setResult] = useState<BatchSwapResult | null>(null);
  const [balances, setBalances] = useState<BatchBalanceResult | null>(null);
  const [queryingBalances, setQueryingBalances] = useState(false);
  const [warmup, setWarmup] = useState<WarmupResult | null>(null);
  const [warming, setWarming] = useState(false);
  const [copied, setCopied] = useState(false);

  const warmupValid = isWarmupValid(warmup, form);

  function invalidateWarmupIfNeeded(next: SwapForm) {
    setWarmup((prev) =>
      prev && prev.configKey !== buildWarmupConfigKey(next) ? null : prev
    );
  }

  function update<K extends keyof SwapForm>(key: K, value: SwapForm[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      invalidateWarmupIfNeeded(next);
      return next;
    });
    setError("");
    setQuote(null);
    setResult(null);
    setBalances(null);
  }

  function setVersion(version: DexVersion) {
    setForm((prev) => {
      const next = {
        ...prev,
        version,
        routerAddress: defaultRouter(version),
      };
      invalidateWarmupIfNeeded(next);
      return next;
    });
    setQuote(null);
    setResult(null);
    setError("");
    setBalances(null);
  }

  async function handleWarmup() {
    setWarming(true);
    setError("");
    setWarmup(null);
    try {
      const data = await executeWarmup(form, (wallets) => {
        setWarmup({
          configKey: buildWarmupConfigKey(form),
          wallets,
        });
      });
      setWarmup(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setWarming(false);
    }
  }

  async function handleQueryBalances() {
    setQueryingBalances(true);
    setError("");
    setBalances(null);
    try {
      const data = await queryInputBalances(form);
      setBalances(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setQueryingBalances(false);
    }
  }

  async function handleQuote() {
    setQuoting(true);
    setError("");
    setQuote(null);
    try {
      const q = await previewQuote(form);
      setQuote(q);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setQuoting(false);
    }
  }

  async function handleExecute() {
    setExecuting(true);
    setError("");
    setResult(null);
    try {
      const batch = await executeBatchSwap(
        form,
        (wallets) => {
          setResult({ wallets });
        },
        warmupValid ? warmup : null
      );
      setResult(batch);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExecuting(false);
      setWarmup(null);
    }
  }

  async function handleCopyConfig() {
    try {
      await copyText(swapFormToJson(form));
      setCopied(true);
      setError("");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError("复制失败：" + (err instanceof Error ? err.message : String(err)));
    }
  }

  const walletCount = parsePrivateKeys(form.privateKeysText).length;

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Multiple Swap</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          批量兑换：多个钱包按相同参数在 PancakeSwap V2 / V3 上执行 swap。
          当前预设为 BSC 主网 Router 地址。
        </p>
      </div>

      <div className="ev-card space-y-4">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">RPC URL</span>
          <input
            className={inputClass}
            value={form.rpcUrl}
            onChange={(e) => update("rpcUrl", e.target.value)}
            placeholder="https://..."
          />
        </label>

        <div className="space-y-2">
          <span className="text-sm font-medium">DEX 版本</span>
          <div className="flex gap-3">
            {(["v2", "v3"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVersion(v)}
                className={`px-4 py-2 rounded text-sm border transition ${
                  form.version === v
                    ? "border-[var(--accent)] bg-[var(--hover)] font-medium"
                    : "border-[var(--border)] text-[var(--muted)]"
                }`}
              >
                Pancake {v.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Router 地址</span>
          <input
            className={inputClass}
            value={form.routerAddress}
            onChange={(e) => update("routerAddress", e.target.value)}
            placeholder="0x..."
          />
        </label>

        {form.version === "v3" && (
          <label className="block space-y-1 text-sm">
            <span className="font-medium">V3 费率档位 (fee)</span>
            <select
              className={inputClass}
              value={form.fee}
              onChange={(e) => update("fee", Number(e.target.value))}
            >
              {V3_FEE_TIERS.map((f) => (
                <option key={f} value={f}>
                  {f / 10000}% ({f})
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Token In</span>
              <input
                className={inputClass}
                value={form.tokenIn}
                onChange={(e) => update("tokenIn", e.target.value)}
                placeholder="0x..."
                disabled={form.nativeIn}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.nativeIn}
                onChange={(e) => update("nativeIn", e.target.checked)}
              />
              原生币输入 (BNB)
            </label>
          </div>

          <div className="space-y-2">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Token Out</span>
              <input
                className={inputClass}
                value={form.tokenOut}
                onChange={(e) => update("tokenOut", e.target.value)}
                placeholder="0x..."
                disabled={form.nativeOut}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.nativeOut}
                onChange={(e) => update("nativeOut", e.target.checked)}
              />
              原生币输出 (BNB)
            </label>
          </div>
        </div>

        <div className="space-y-3">
          <span className="text-sm font-medium">兑换数量模式</span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => update("amountMode", "fixed")}
              className={`px-4 py-2 rounded text-sm border transition ${
                form.amountMode === "fixed"
                  ? "border-[var(--accent)] bg-[var(--hover)] font-medium"
                  : "border-[var(--border)] text-[var(--muted)]"
              }`}
            >
              固定金额
            </button>
            <button
              type="button"
              onClick={() => update("amountMode", "percent")}
              className={`px-4 py-2 rounded text-sm border transition ${
                form.amountMode === "percent"
                  ? "border-[var(--accent)] bg-[var(--hover)] font-medium"
                  : "border-[var(--border)] text-[var(--muted)]"
              }`}
            >
              余额百分比
            </button>
          </div>
          <p className="text-xs text-[var(--muted)]">
            买单常用固定金额；卖单可按每个钱包 Token In 余额的百分比卖出。
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {form.amountMode === "fixed" ? (
            <label className="block space-y-1 text-sm">
              <span className="font-medium">每钱包兑换数量</span>
              <input
                className={inputClass}
                value={form.amountIn}
                onChange={(e) => update("amountIn", e.target.value)}
                placeholder="例如 0.1"
              />
            </label>
          ) : (
            <label className="block space-y-1 text-sm">
              <span className="font-medium">卖出余额百分比 (%)</span>
              <input
                className={inputClass}
                value={form.amountPercent}
                onChange={(e) => update("amountPercent", e.target.value)}
                placeholder="例如 100"
              />
            </label>
          )}

          <label className="block space-y-1 text-sm">
            <span className="font-medium">滑点 (%)</span>
            <input
              className={inputClass}
              value={form.slippagePercent}
              onChange={(e) => update("slippagePercent", e.target.value)}
              placeholder="0.5"
            />
          </label>

          {form.version === "v2" && (
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Deadline (分钟)</span>
              <input
                className={inputClass}
                value={form.deadlineMinutes}
                onChange={(e) => update("deadlineMinutes", e.target.value)}
                placeholder="20"
              />
            </label>
          )}
        </div>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">
            私钥列表（每行一个或 JSON 数组，共 {walletCount} 个钱包）
          </span>
          <textarea
            className="w-full h-32 border border-[var(--border)] rounded p-2 bg-[var(--card)] font-mono text-xs"
            value={form.privateKeysText}
            onChange={(e) => update("privateKeysText", e.target.value)}
            placeholder={privateKeysPlaceholder}
            autoComplete="off"
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleCopyConfig()}
            className="px-4 py-2 border border-[var(--border)] rounded hover:bg-[var(--hover)] transition text-sm"
          >
            {copied ? "已复制" : "复制配置 (JSON)"}
          </button>
          <button
            type="button"
            onClick={() => void handleWarmup()}
            disabled={
              quoting || executing || queryingBalances || warming || form.nativeIn
            }
            className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 transition disabled:opacity-50 text-sm"
            title={form.nativeIn ? "原生币输入无需授权预热" : undefined}
          >
            {warming ? "预热中…" : "预热授权"}
          </button>
          <button
            type="button"
            onClick={() => void handleQueryBalances()}
            disabled={quoting || executing || queryingBalances || warming}
            className="px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700 transition disabled:opacity-50 text-sm"
          >
            {queryingBalances ? "查询中…" : "查询余额"}
          </button>
          <button
            type="button"
            onClick={() => void handleQuote()}
            disabled={quoting || executing || queryingBalances || warming}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 text-sm"
          >
            {quoting ? "报价中…" : "预览报价"}
          </button>
          <button
            type="button"
            onClick={() => void handleExecute()}
            disabled={quoting || executing || queryingBalances || warming}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50 text-sm"
          >
            {executing ? "批量执行中…" : "批量兑换"}
          </button>
        </div>

        {warmupValid && (
          <p className="text-xs text-green-700 dark:text-green-300">
            预热有效：批量兑换将跳过已预热的 Allowance 检查与 Approve（仅限本次兑换数量 ≤ 预热授权额度）。
          </p>
        )}

        {warmup && (
          <div className="space-y-3">
            <p className="font-semibold text-sm">
              预热状态
              {!warmupValid && (
                <span className="ml-2 text-xs font-normal text-amber-700 dark:text-amber-300">
                  配置已变更，预热已失效，请重新预热
                </span>
              )}
            </p>
            {warmup.wallets.map((w) => (
              <div
                key={w.address}
                className="p-3 rounded border border-[var(--border)] bg-[var(--bg)] text-sm space-y-1"
              >
                <p className="font-mono break-all text-xs">{w.address}</p>
                <p className={warmupStatusColor(w.status)}>
                  [{w.status}] {w.message}
                </p>
                {w.allowanceRaw && (
                  <p className="text-xs text-[var(--muted)] font-mono">
                    Allowance: {w.allowanceRaw}
                  </p>
                )}
                {w.approveTxHash && (
                  <p className="font-mono text-xs break-all text-[var(--muted)]">
                    Approve: {w.approveTxHash}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {balances && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold text-sm">
                Token In 余额（{balances.tokenLabel}）
              </p>
              <p className="text-sm font-mono">
                合计: {balances.totalFormatted}
              </p>
            </div>
            {balances.wallets.map((w) => (
              <div
                key={w.address}
                className="p-3 rounded border border-[var(--border)] bg-[var(--bg)] text-sm space-y-1"
              >
                <p className="font-mono break-all text-xs">{w.address}</p>
                {w.error ? (
                  <p className="text-red-700 dark:text-red-300">{w.error}</p>
                ) : (
                  <>
                    <p className="font-mono">{w.balanceFormatted}</p>
                    <p className="text-xs text-[var(--muted)] font-mono">
                      raw: {w.balanceRaw}
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {quote && (
          <div className="p-4 rounded border border-[var(--border)] bg-[var(--bg)] text-sm space-y-2">
            <p className="font-semibold">报价预览</p>
            {quote.note && (
              <p className="text-xs text-[var(--muted)]">{quote.note}</p>
            )}
            <p className="font-mono text-xs break-all">
              Path: {quote.path.join(" → ")}
            </p>
            <p>输入数量: {quote.amountInUsed}</p>
            <p>预估输出: {quote.amountOut}</p>
            <p>最小输出 (含滑点): {quote.amountOutMin}</p>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <p className="font-semibold text-sm">执行结果</p>
            {result.wallets.map((w) => (
              <div
                key={w.address}
                className="p-3 rounded border border-[var(--border)] bg-[var(--bg)] text-sm space-y-1"
              >
                <p className="font-mono break-all">{w.address}</p>
                <p className={statusColor(w.status)}>
                  [{w.status}] {w.message}
                </p>
                {w.approveTxHash && (
                  <p className="font-mono text-xs break-all text-[var(--muted)]">
                    Approve: {w.approveTxHash}
                  </p>
                )}
                {w.swapTxHash && (
                  <p className="font-mono text-xs break-all text-[var(--muted)]">
                    Swap: {w.swapTxHash}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
