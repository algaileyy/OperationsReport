"use client";

import { useState, type ReactNode } from "react";
import { formatFieldValue } from "@/lib/format";

const TEXT_BRIGHT = "#ffffff";
const TEXT_DETAIL = "#cfeef2";
const ROW_ALT = "rgba(255,255,255,0.04)";
const DETAIL_BG = "rgba(0,0,0,0.12)";

type DetailItem = { label: string; value: number };

/** Label/detail padding at each nesting depth — Tailwind needs literal class names, so this is a
 * small fixed lookup rather than a computed string. Only 0-2 are used (three levels deep, max). */
const LABEL_PADDING = ["px-3 py-2 text-sm", "py-2 pl-9 pr-3 text-sm", "py-2 pl-16 pr-3 text-sm"];
const DETAIL_PADDING = ["py-1.5 pl-9 pr-3 text-sm", "py-1.5 pl-16 pr-3 text-sm", "py-1.5 pl-24 pr-3 text-sm"];

export default function GroupRow({
  label,
  total,
  detail,
  altRow,
  unit,
  level = 0,
  infoText,
  children,
}: {
  label: string;
  total: number;
  detail: DetailItem[];
  altRow: boolean;
  unit?: string;
  /** Nesting depth (0 = top-level) — renders the header and detail rows further right at each
   * level, for a GroupRow nested inside another GroupRow's expanded state. */
  level?: number;
  /** Shows a white info icon next to the label with this text in a hover tooltip. */
  infoText?: string;
  /** Extra rows (typically nested GroupRows) shown after `detail` while this row is open. */
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr
        onClick={() => setOpen((o) => !o)}
        role="button"
        aria-expanded={open}
        className="cursor-pointer select-none"
        style={{ background: altRow ? ROW_ALT : "transparent" }}
      >
        <td className={LABEL_PADDING[level] ?? LABEL_PADDING[LABEL_PADDING.length - 1]}>
          <span className="inline-flex items-center gap-2 font-bold" style={{ color: TEXT_BRIGHT }}>
            <span className="inline-block w-4 text-base" style={{ color: "#5fd4f4" }}>
              {open ? "▾" : "▸"}
            </span>
            {label}
            {infoText && (
              <span
                className="group relative inline-flex shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5 cursor-help opacity-80 hover:opacity-100"
                  aria-label="More information"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="11" x2="12" y2="16" />
                  <circle cx="12" cy="7.5" r="0.5" fill="#ffffff" stroke="none" />
                </svg>
                <span
                  className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 w-64 rounded-md px-3 py-2 text-xs font-normal normal-case opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                  style={{ background: "#0b1d27", color: "#ffffff" }}
                >
                  {infoText}
                </span>
              </span>
            )}
          </span>
        </td>
        <td className="px-3 py-2 text-sm font-bold" style={{ color: TEXT_BRIGHT }}>
          {formatFieldValue(total, unit)}
        </td>
      </tr>
      {open && (
        <>
          {detail.map((d) => (
            <tr key={d.label} style={{ background: DETAIL_BG }}>
              <td className={DETAIL_PADDING[level] ?? DETAIL_PADDING[DETAIL_PADDING.length - 1]} style={{ color: TEXT_DETAIL }}>
                {d.label}
              </td>
              <td className="px-3 py-1.5 text-sm" style={{ color: TEXT_DETAIL }}>
                {formatFieldValue(d.value, unit)}
              </td>
            </tr>
          ))}
          {children}
        </>
      )}
    </>
  );
}
