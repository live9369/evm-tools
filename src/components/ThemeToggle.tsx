"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

const buttonClass =
  "px-3 py-2 rounded bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--hover)] transition";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        className={buttonClass}
        aria-label="Toggle theme"
        suppressHydrationWarning
      >
        Theme
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={buttonClass}
      aria-label="Toggle theme"
    >
      {isDark ? "🌞 Light" : "🌙 Dark"}
    </button>
  );
}
