"use client";

import ThemeToggle from "./ThemeToggle";

export default function TopBar() {
  return (
    <header className="h-14 w-full flex items-center justify-between px-8 bg-[var(--card)] border-b border-[var(--border)]">
      
      <div className="font-semibold text-[18px]">
        EVM Tools
      </div>

      <div className="ml-auto flex items-center gap-4">
        <ThemeToggle />
      </div>
    </header>
  );
}
