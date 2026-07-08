"use client";

import { SendToInstantButton } from "./SendToInstantButton";

type Props = {
  calldata: string;
  label?: string;
};

export function CalldataOutputPanel({ calldata, label = "生成的 Calldata" }: Props) {
  if (!calldata) return null;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <textarea
        className="w-full h-32 border border-[var(--border)] rounded p-3 font-mono text-sm bg-[var(--card)] text-[var(--fg)]"
        readOnly
        value={calldata}
      />
      <SendToInstantButton calldata={calldata} />
    </div>
  );
}
