"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
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

/**
 * Renders its tooltip through a portal onto document.body, positioned via getBoundingClientRect
 * — the row it lives in sits inside the report table's overflow-x-auto wrapper, and setting
 * overflow-x forces overflow-y to clip too, so a plain CSS absolute tooltip gets cut off by that
 * ancestor whenever it's tall enough (a long explanation) or the icon is near the wrapper's edge.
 * Fixed-positioning it outside the DOM tree it's clipped by sidesteps that entirely.
 */
function InfoIcon({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const iconRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !iconRef.current) return;
    const iconRect = iconRef.current.getBoundingClientRect();
    const tipRect = tipRef.current?.getBoundingClientRect();
    const tipWidth = tipRect?.width ?? 256;
    const tipHeight = tipRect?.height ?? 0;
    const gap = 8;
    const openBelow = iconRect.top - tipHeight - gap < 8;
    const top = openBelow ? iconRect.bottom + gap : iconRect.top - tipHeight - gap;
    const left = Math.min(Math.max(iconRect.left, 8), window.innerWidth - tipWidth - 8);
    setPos({ top, left });
  }, [open]);

  return (
    <span
      ref={iconRef}
      className="relative inline-flex shrink-0"
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
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
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={tipRef}
            className="pointer-events-none fixed z-50 w-64 rounded-md px-3 py-2 text-xs font-normal normal-case shadow-lg"
            style={{
              background: "#0b1d27",
              color: "#ffffff",
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
              visibility: pos ? "visible" : "hidden",
            }}
          >
            {text}
          </div>,
          document.body
        )}
    </span>
  );
}

export default function GroupRow({
  label,
  total,
  detail,
  altRow,
  unit,
  level = 0,
  infoText,
  hasChildren = false,
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
  /** Whether `children` actually has anything in it — `detail.length > 0` alone can't tell, since
   * a parent-of-parents row has no detail of its own, only nested GroupRows. Determines whether the
   * expand arrow (and the ability to open the row at all) is shown. */
  hasChildren?: boolean;
  /** Extra rows (typically nested GroupRows) shown after `detail` while this row is open. */
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const expandable = detail.length > 0 || hasChildren;
  const isOpen = expandable && open;

  return (
    <>
      <tr
        onClick={expandable ? () => setOpen((o) => !o) : undefined}
        role={expandable ? "button" : undefined}
        aria-expanded={expandable ? isOpen : undefined}
        className={expandable ? "cursor-pointer select-none" : undefined}
        style={{ background: altRow ? ROW_ALT : "transparent" }}
      >
        <td className={LABEL_PADDING[level] ?? LABEL_PADDING[LABEL_PADDING.length - 1]}>
          <span className="inline-flex items-center gap-2 font-bold" style={{ color: TEXT_BRIGHT }}>
            <span className="inline-block w-4 text-base" style={{ color: "#5fd4f4" }}>
              {expandable ? (isOpen ? "▾" : "▸") : ""}
            </span>
            {label}
            {infoText && <InfoIcon text={infoText} />}
          </span>
        </td>
        <td className="px-3 py-2 text-sm font-bold" style={{ color: TEXT_BRIGHT }}>
          {formatFieldValue(total, unit)}
        </td>
      </tr>
      {isOpen && (
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
