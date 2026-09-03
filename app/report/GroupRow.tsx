"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatFieldValue } from "@/lib/format";

const TEXT_BRIGHT = "#ffffff";
const TEXT_DETAIL = "#cfeef2";
const ROW_ALT = "rgba(255,255,255,0.04)";
const DETAIL_BG = "rgba(0,0,0,0.12)";

/** `unit` overrides the row's shared `unit` for this one entry — for a breakdown where entries
 * mix units (e.g. one source in TB, another in GB), so each shows what it was actually entered
 * as while the row's own total still uses the row's canonical unit. */
type DetailItem = { label: string; value: number; unit?: string };

/** A row that may itself contain nested rows (Media Ingest's QC Hours, Digital Archive's QC
 * Completed / Production Support Activities) — built once as plain data, then pruned and rendered
 * generically so the "hide anything at 0" and "no arrow with nothing to expand" rules only need to
 * be implemented in one place instead of at every nesting site. */
export type TreeNode = {
  key: string;
  label: string;
  total: number;
  unit?: string;
  infoText?: string;
  detail?: DetailItem[];
  children?: TreeNode[];
};

/** Drops zero-valued detail entries and nodes, keeping a parent only if its own total is non-zero
 * or it still has surviving children (a parent's total isn't always the sum of its children — Media
 * Ingest's QC Hours total is its own entered value, independent of the Failed/Passed counts nested
 * under it). */
export function pruneZero(nodes: TreeNode[]): TreeNode[] {
  return nodes
    .map((n) => ({
      ...n,
      detail: n.detail?.filter((d) => d.value !== 0),
      children: n.children ? pruneZero(n.children) : undefined,
    }))
    .filter((n) => n.total !== 0 || (n.children?.length ?? 0) > 0);
}

/** Renders one level of a TreeNode list as GroupRows, recursing into each node's own children (via
 * GroupRow itself, one level deeper) until the tree is exhausted. */
export function RowTree({
  nodes,
  level,
  seed,
  screenVisible = true,
}: {
  nodes: TreeNode[];
  level: number;
  seed: { i: number };
  /** Whether every ancestor above this level is currently open, so this whole level shows on
   * screen at all — passed straight through as a plain prop to every row at this level. */
  screenVisible?: boolean;
}) {
  return (
    <>
      {nodes.map((n) => {
        const alt = seed.i++ % 2 === 1;
        return (
          <GroupRow
            key={n.key}
            label={n.label}
            total={n.total}
            detail={n.detail ?? []}
            altRow={alt}
            unit={n.unit ?? " Assets"}
            level={level}
            infoText={n.infoText}
            childNodes={n.children}
            seed={seed}
            screenVisible={screenVisible}
          />
        );
      })}
    </>
  );
}

/**
 * Renders its tooltip through a portal onto document.body, positioned via getBoundingClientRect
 * — the row it lives in sits inside the report table's overflow-x-auto wrapper, and setting
 * overflow-x forces overflow-y to clip too, so a plain CSS absolute tooltip gets cut off by that
 * ancestor whenever it's tall enough (a long explanation) or the icon is near the wrapper's edge.
 * Fixed-positioning it outside the DOM tree it's clipped by sidesteps that entirely.
 */
export function InfoIcon({ text }: { text: string }) {
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
  childNodes,
  seed,
  screenVisible = true,
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
  /** Nested rows shown while this row is open, rendered one level deeper via RowTree — only a
   * tree-shaped row (Media Ingest's QC Hours, Digital Archive's QC Completed / Production Support
   * Activities) has these; a flat by-source breakdown has none. */
  childNodes?: TreeNode[];
  /** Shared row-striping counter — required whenever childNodes is set, so striping continues
   * seamlessly into the nested level instead of restarting. */
  seed?: { i: number };
  /** Whether every ancestor row is currently open, so this row shows on screen at all — a nested
   * row whose parent is collapsed passes this down as false. Detail/nested rows are always kept in
   * the DOM (never conditionally unmounted) so a print stylesheet can force them visible regardless
   * of on-screen collapse state; this prop is what drives that screen-only hiding. Exported PDFs are
   * a static snapshot with no click affordance, so print always shows every row expanded. */
  screenVisible?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hasChildren = (childNodes?.length ?? 0) > 0;
  const expandable = detail.length > 0 || hasChildren;
  const isOpen = expandable && open;
  // Hidden on screen when any ancestor (or this row itself) is collapsed, but the `print:` variant
  // always wins in print media, so an exported PDF shows every row's full detail regardless of
  // what happened to be expanded in the browser at export time.
  const rowVisibility = screenVisible ? undefined : "hidden print:table-row";
  const childScreenVisible = screenVisible && isOpen;

  return (
    <>
      <tr
        onClick={expandable ? () => setOpen((o) => !o) : undefined}
        role={expandable ? "button" : undefined}
        aria-expanded={expandable ? isOpen : undefined}
        className={[expandable ? "cursor-pointer select-none" : "", rowVisibility].filter(Boolean).join(" ") || undefined}
        style={{ background: altRow ? ROW_ALT : "transparent" }}
      >
        <td className={LABEL_PADDING[level] ?? LABEL_PADDING[LABEL_PADDING.length - 1]}>
          <span className="inline-flex items-center gap-2 font-bold" style={{ color: TEXT_BRIGHT }}>
            <span className="inline-block w-4 text-base print:hidden" style={{ color: "#5fd4f4" }}>
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
      {detail.map((d) => (
        <tr key={d.label} className={childScreenVisible ? undefined : "hidden print:table-row"} style={{ background: DETAIL_BG }}>
          <td className={DETAIL_PADDING[level] ?? DETAIL_PADDING[DETAIL_PADDING.length - 1]} style={{ color: TEXT_DETAIL }}>
            {d.label}
          </td>
          <td className="px-3 py-1.5 text-sm" style={{ color: TEXT_DETAIL }}>
            {formatFieldValue(d.value, d.unit ?? unit)}
          </td>
        </tr>
      ))}
      {hasChildren && <RowTree nodes={childNodes!} level={level + 1} seed={seed!} screenVisible={childScreenVisible} />}
    </>
  );
}
