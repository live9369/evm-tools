type Props = {
  valueEth: string;
  gasLimit: string;
  onValueEthChange: (value: string) => void;
  onGasLimitChange: (value: string) => void;
  /** 嵌入双列表单时占满一行 */
  className?: string;
};

const inputClass =
  "w-full border border-[var(--border)] rounded p-2 bg-[var(--card)]";

export function TxValueGasFields({
  valueEth,
  gasLimit,
  onValueEthChange,
  onGasLimitChange,
  className = "",
}: Props) {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 gap-4 sm:col-span-2 ${className}`}
    >
      <label className="flex flex-col text-sm min-w-0">
        <div className="mb-1 min-h-[2.5rem] flex flex-col justify-end">
          <span className="font-medium">Value (ETH)</span>
          <span className="text-xs text-[var(--muted)]">填 ETH 数量，如 0.1</span>
        </div>
        <input
          className={inputClass}
          value={valueEth}
          onChange={(e) => onValueEthChange(e.target.value)}
          placeholder="0.1"
          title="0.1 ETH 填 0.1，无需 wei"
        />
      </label>

      <label className="flex flex-col text-sm min-w-0">
        <div className="mb-1 min-h-[2.5rem] flex flex-col justify-end">
          <span className="font-medium">Gas Limit（可选）</span>
          <span className="text-xs text-[var(--muted)]">留空则估算 +25%</span>
        </div>
        <input
          className={inputClass}
          value={gasLimit}
          onChange={(e) => onGasLimitChange(e.target.value)}
          placeholder="自动"
        />
      </label>
    </div>
  );
}
