"use client";

import { useEffect, useRef, useState } from "react";
import { monthLabel } from "@/lib/months";

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type Props = {
  value: string; // "YYYY-MM"
  onChange: (month: string) => void;
  /** Months (YYYY-MM) that already have saved data — shown with a dot. */
  markedMonths?: string[];
  label?: string;
};

export default function MonthPicker({ value, onChange, markedMonths = [], label }: Props) {
  const [open, setOpen] = useState(false);
  const [year, month] = value.split("-").map(Number);
  const [viewYear, setViewYear] = useState(year);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setViewYear(year);
  }, [year]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const markedSet = new Set(markedMonths);

  function pick(m: number) {
    const key = `${viewYear}-${String(m).padStart(2, "0")}`;
    onChange(key);
    setOpen(false);
  }

  return (
    <div className="relative inline-block" ref={rootRef}>
      {label && (
        <label className="mb-1 block text-sm" style={{ color: "var(--ink-secondary)" }}>
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium"
        style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--ink-primary)" }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
        {monthLabel(value)}
      </button>

      {open && (
        <div
          className="absolute z-20 mt-1 w-64 rounded-lg border p-3 shadow-lg"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              className="rounded px-2 py-1 text-sm"
              style={{ color: "var(--ink-secondary)" }}
              aria-label="Previous year"
            >
              ‹
            </button>
            <span className="text-sm font-semibold" style={{ color: "var(--ink-primary)" }}>
              {viewYear}
            </span>
            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              className="rounded px-2 py-1 text-sm"
              style={{ color: "var(--ink-secondary)" }}
              aria-label="Next year"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_ABBR.map((abbr, idx) => {
              const m = idx + 1;
              const key = `${viewYear}-${String(m).padStart(2, "0")}`;
              const isSelected = viewYear === year && m === month;
              const hasData = markedSet.has(key);
              return (
                <button
                  key={abbr}
                  type="button"
                  onClick={() => pick(m)}
                  className="relative rounded-md py-2 text-sm font-medium"
                  style={{
                    background: isSelected ? "#2a78d6" : "transparent",
                    color: isSelected ? "#ffffff" : "var(--ink-primary)",
                  }}
                >
                  {abbr}
                  {hasData && !isSelected && (
                    <span
                      className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                      style={{ background: "#2a78d6" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
