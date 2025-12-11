"use client";

import { useTheme } from "./ThemeProvider";

type ThemeToggleProps = {
  className?: string;
  variant?: "inline" | "floating";
};

export function ThemeToggle({
  className = "",
  variant = "inline",
}: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme, isReady } = useTheme();
  const isDark = resolvedTheme === "dark";

  const baseStyles =
    "inline-flex items-center gap-2 rounded-full border bg-[var(--card)] px-3 py-2 text-xs font-semibold text-[color:var(--page-foreground)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
  const tone = "border-[var(--border-strong)]";
  const floatStyles =
    variant === "floating"
      ? "fixed right-4 top-4 z-50 backdrop-blur bg-[color-mix(in_srgb,var(--card)_90%,transparent)]"
      : "";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`${baseStyles} ${tone} ${floatStyles} ${className}`.trim()}
      aria-pressed={isDark}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      aria-label="Toggle color theme"
      disabled={!isReady}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--card-soft)] text-base">
        {isDark ? "🌙" : "☀️"}
      </span>
      <span className="whitespace-nowrap">
        {isDark ? "Dark" : "Light"} mode
      </span>
    </button>
  );
}
