"use client";

import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";

const STORAGE_KEY = "ops-theme";
const ORDER: Theme[] = ["system", "light", "dark"];
const LABEL: Record<Theme, string> = { system: "Auto", light: "Light", dark: "Dark" };
const ICON: Record<Theme, string> = { system: "\u{1F5A5}️", light: "☀️", dark: "\u{1F319}" };

function applyTheme(theme: Theme) {
  if (theme === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  // Sync with whatever the pre-paint inline script (see layout.tsx) already applied.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    setTheme(next);
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <button
      onClick={cycle}
      className="rounded-md border px-2.5 py-1 text-xs font-medium"
      style={{ borderColor: "var(--border)", color: "var(--ink-secondary)", background: "var(--surface)" }}
      title={`Theme: ${LABEL[theme]} — click to change`}
    >
      {ICON[theme]} {LABEL[theme]}
    </button>
  );
}
