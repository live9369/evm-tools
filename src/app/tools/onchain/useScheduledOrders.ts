"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ScheduledOrder, ScheduledOrderInput } from "./types";
import { loadOrders, saveOrders } from "./storage";
import { executeScheduledOrder } from "./executeOrder";

const TICK_MS = 1000;

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useScheduledOrders() {
  const [orders, setOrders] = useState<ScheduledOrder[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const executingRef = useRef<Set<string>>(new Set());

  const persist = useCallback((next: ScheduledOrder[]) => {
    setOrders(next);
    saveOrders(next);
  }, []);

  useEffect(() => {
    persist(loadOrders());
    setHydrated(true);
  }, [persist]);

  const addOrder = useCallback(
    (input: ScheduledOrderInput) => {
      const scheduledMs = new Date(input.scheduledAt).getTime();
      if (Number.isNaN(scheduledMs)) {
        throw new Error("执行时间无效");
      }
      if (scheduledMs <= Date.now()) {
        throw new Error("执行时间必须晚于当前时间");
      }

      const order: ScheduledOrder = {
        ...input,
        id: createId(),
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      setOrders((prev) => {
        const next = [order, ...prev];
        saveOrders(next);
        return next;
      });
      return order;
    },
    []
  );

  const cancelOrder = useCallback(
    (id: string) => {
      persist(
        orders.map((o) =>
          o.id === id && o.status === "pending"
            ? { ...o, status: "cancelled" as const }
            : o
        )
      );
    },
    [orders, persist]
  );

  const removeOrder = useCallback(
    (id: string) => {
      persist(orders.filter((o) => o.id !== id));
    },
    [orders, persist]
  );

  const runDueOrders = useCallback(async () => {
    const now = Date.now();
    const due = orders.filter(
      (o) =>
        o.status === "pending" &&
        new Date(o.scheduledAt).getTime() <= now &&
        !executingRef.current.has(o.id)
    );

    for (const order of due) {
      executingRef.current.add(order.id);

      const executing = orders.map((o) =>
        o.id === order.id ? { ...o, status: "executing" as const } : o
      );
      persist(executing);

      try {
        const { txHash } = await executeScheduledOrder(order);
        const updated = loadOrders().map((o) =>
          o.id === order.id
            ? {
                ...o,
                status: "completed" as const,
                txHash,
                executedAt: new Date().toISOString(),
                errorMessage: undefined,
              }
            : o
        );
        persist(updated);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const updated = loadOrders().map((o) =>
          o.id === order.id
            ? {
                ...o,
                status: "failed" as const,
                executedAt: new Date().toISOString(),
                errorMessage: message,
              }
            : o
        );
        persist(updated);
      } finally {
        executingRef.current.delete(order.id);
      }
    }
  }, [orders, persist]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = setInterval(() => {
      void runDueOrders();
    }, TICK_MS);
    void runDueOrders();
    return () => clearInterval(timer);
  }, [hydrated, runDueOrders]);

  return {
    orders,
    hydrated,
    addOrder,
    cancelOrder,
    removeOrder,
  };
}
