"use client";

import { Contract, JsonRpcProvider, formatUnits, isAddress } from "ethers";
import { useState } from "react";

const erc20Abi = [
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
];

type QueryResult = {
  tokenName: string;
  tokenSymbol: string;
  decimals: number;
  balanceRaw: string;
  balanceFormatted: string;
  allowanceRaw: string;
  allowanceFormatted: string;
};

const emptyForm = {
  rpcUrl: "",
  tokenAddress: "",
  ownerAddress: "",
  spenderAddress: "",
};

const inputClass =
  "w-full border border-[var(--border)] rounded p-2 bg-[var(--card)] font-mono text-sm";

export default function TokenBalanceAllowancePage() {
  const [form, setForm] = useState(emptyForm);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setResult(null);
    setError("");
  }

  function validateForm() {
    if (!form.rpcUrl.trim().startsWith("http")) {
      return "请输入有效的 RPC URL";
    }
    if (!isAddress(form.tokenAddress.trim())) {
      return "请输入有效的 Token 合约地址";
    }
    if (!isAddress(form.ownerAddress.trim())) {
      return "请输入有效的用户地址 Owner";
    }
    if (!isAddress(form.spenderAddress.trim())) {
      return "请输入有效的授权对象 Spender 地址";
    }
    return "";
  }

  async function handleQuery() {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const provider = new JsonRpcProvider(form.rpcUrl.trim());
      const token = new Contract(form.tokenAddress.trim(), erc20Abi, provider);
      const owner = form.ownerAddress.trim();
      const spender = form.spenderAddress.trim();

      const [decimalsValue, symbolValue, nameValue, balance, allowance] =
        await Promise.all([
          token.decimals(),
          token.symbol(),
          token.name(),
          token.balanceOf(owner),
          token.allowance(owner, spender),
        ]);

      const decimals = Number(decimalsValue);
      const tokenSymbol = String(symbolValue);

      setResult({
        tokenName: String(nameValue),
        tokenSymbol,
        decimals,
        balanceRaw: balance.toString(),
        balanceFormatted: `${formatUnits(balance, decimals)} ${tokenSymbol}`,
        allowanceRaw: allowance.toString(),
        allowanceFormatted: `${formatUnits(allowance, decimals)} ${tokenSymbol}`,
      });
    } catch (err) {
      setError("查询失败：" + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Token Balance & Allowance</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          查询指定 ERC-20 Token 下，指定用户的余额，以及该用户授权给 Spender 的额度。
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

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Token 合约地址</span>
          <input
            className={inputClass}
            value={form.tokenAddress}
            onChange={(e) => update("tokenAddress", e.target.value)}
            placeholder="0x..."
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Owner 用户地址</span>
          <input
            className={inputClass}
            value={form.ownerAddress}
            onChange={(e) => update("ownerAddress", e.target.value)}
            placeholder="0x..."
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Spender 授权对象地址</span>
          <input
            className={inputClass}
            value={form.spenderAddress}
            onChange={(e) => update("spenderAddress", e.target.value)}
            placeholder="0x..."
          />
        </label>

        <button
          type="button"
          onClick={() => void handleQuery()}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 text-sm"
        >
          {loading ? "查询中…" : "查询"}
        </button>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="p-4 rounded border border-[var(--border)] bg-[var(--bg)] text-sm space-y-4">
            <div>
              <p className="font-semibold">Token</p>
              <p className="mt-1 font-mono break-all">
                {result.tokenName} ({result.tokenSymbol}), decimals: {result.decimals}
              </p>
            </div>

            <div>
              <p className="font-semibold">Balance</p>
              <p className="mt-1 font-mono break-all">
                {result.balanceFormatted}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)] font-mono break-all">
                raw: {result.balanceRaw}
              </p>
            </div>

            <div>
              <p className="font-semibold">Allowance</p>
              <p className="mt-1 font-mono break-all">
                {result.allowanceFormatted}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)] font-mono break-all">
                raw: {result.allowanceRaw}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
