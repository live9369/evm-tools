"use client";

import { useRouter } from "next/navigation";
import {
  INSTANT_SEND_PATH,
  saveCalldataForInstant,
} from "../calldataTransfer";

type Props = {
  calldata: string;
  className?: string;
};

export function SendToInstantButton({ calldata, className = "" }: Props) {
  const router = useRouter();
  const trimmed = calldata.trim();

  if (!trimmed.startsWith("0x")) return null;

  function handleSend() {
    saveCalldataForInstant(trimmed);
    router.push(INSTANT_SEND_PATH);
  }

  return (
    <button
      type="button"
      onClick={handleSend}
      className={`px-3 py-1.5 text-sm border border-[var(--border)] rounded bg-[var(--card)] hover:bg-[var(--hover)] transition ${className}`}
    >
      ⚡ 填充到即刻上链
    </button>
  );
}
