import type { ScheduledOrder } from "./types";

const STORAGE_KEY = "evm-tools-scheduled-orders";

export function loadOrders(): ScheduledOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScheduledOrder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOrders(orders: ScheduledOrder[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}
