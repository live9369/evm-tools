const STORAGE_KEY = "evm-tools-pending-instant-calldata";

export function saveCalldataForInstant(calldata: string): void {
  localStorage.setItem(STORAGE_KEY, calldata.trim());
}

export function consumeCalldataForInstant(): string | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(STORAGE_KEY);
  if (value) localStorage.removeItem(STORAGE_KEY);
  return value;
}

export const INSTANT_SEND_PATH = "/tools/onchain?tab=instant";
