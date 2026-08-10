"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const TABS = [
  { href: "/input", label: "Data Entry" },
  { href: "/input/history", label: "History" },
  { href: "/input/compare", label: "Compare" },
];

export default function InputNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex items-center justify-between border-b" style={{ borderColor: "var(--border)" }}>
      <div className="flex gap-1">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="px-3 py-2 text-sm font-medium"
              style={{
                color: active ? "#2a78d6" : "var(--ink-secondary)",
                borderBottom: active ? "2px solid #2a78d6" : "2px solid transparent",
                marginBottom: "-1px",
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      <ThemeToggle />
    </nav>
  );
}
