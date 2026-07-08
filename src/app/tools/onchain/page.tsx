"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import SchedulerTab from "./schedulerTab";
import InstantSend from "./instantSend";

const tabs = [
  { key: "scheduler", label: "⏰ 定时挂单" },
  { key: "instant", label: "⚡ 即刻上链" },
];

function OnchainToolsContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState("scheduler");

  useEffect(() => {
    const nextTab = searchParams.get("tab");
    if (nextTab === "instant" || nextTab === "scheduler") {
      setTab(nextTab);
    }
  }, [searchParams]);

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Onchain</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          定时发送交易，或即刻模拟并广播十六进制 calldata。
        </p>
      </div>

      <div className="flex gap-4 border-b border-[var(--border)]">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`pb-3 px-2 border-b-2 transition text-sm ${
              tab === t.key
                ? "border-[var(--accent)] font-semibold text-[var(--fg)]"
                : "border-transparent text-[var(--muted)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "scheduler" && <SchedulerTab />}
      {tab === "instant" && <InstantSend />}
    </section>
  );
}

export default function OnchainTools() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">加载中…</p>}>
      <OnchainToolsContent />
    </Suspense>
  );
}
