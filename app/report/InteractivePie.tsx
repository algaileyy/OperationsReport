"use client";

import { useState } from "react";
import { formatNumber, formatFieldValue } from "@/lib/format";

type Slice = { label: string; value: number };
type Callout = { label: string; value: number; unit?: string; highlight?: boolean };

/**
 * SVG donut chart with hover-highlighted slices, a synced legend, and a
 * floating tooltip anchored to the hovered slice — a drop-in replacement for
 * the plain conic-gradient pie + static legend, built with no new
 * dependencies (a stroke-based donut plus React hover state instead of a
 * charting library).
 */
export default function InteractivePie({
  fields,
  colors,
  calloutFields = [],
  accentColor,
  totalOverride,
}: {
  fields: Slice[];
  colors: string[];
  /** Unit-bearing figures (e.g. TB) that can't share the donut with plain counts — shown as extra
   * legend rows instead, with a neutral marker since they don't correspond to a slice. */
  calloutFields?: Callout[];
  /** Background for a `highlight`-flagged callout's badge — falls back to a neutral dark shade
   * when omitted. */
  accentColor?: string;
  /** Replaces the default (nothing hovered) center's "Total" figure — normally the sum of
   * `fields` — with a manually entered number. Slice proportions still use the real sum;
   * only the displayed headline figure changes. */
  totalOverride?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  // A hovered callout has no slice of its own to light up, but still takes over the center label —
  // mutually exclusive with `hover` so only one thing drives the center at a time.
  const [hoverCallout, setHoverCallout] = useState<number | null>(null);
  const sum = fields.reduce((s, f) => s + f.value, 0);
  const r = 36;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * r;

  let cumulative = 0;
  const segments = fields.map((f, i) => {
    const startFrac = sum > 0 ? cumulative / sum : 0;
    cumulative += f.value;
    const endFrac = sum > 0 ? cumulative / sum : 0;
    const midFrac = (startFrac + endFrac) / 2;
    // Clock-angle convention (0deg = top, clockwise) so the anchor lands
    // exactly on the slice drawn by the rotate(-90) stroke below.
    const rad = (midFrac * 360 * Math.PI) / 180;
    return {
      label: f.label,
      value: f.value,
      i,
      length: (endFrac - startFrac) * circumference,
      offset: -startFrac * circumference,
      pct: sum > 0 ? Math.round((f.value / sum) * 100) : 0,
      anchorX: 50 + r * Math.sin(rad),
      anchorY: 50 - r * Math.cos(rad),
    };
  });

  const active = hover != null ? segments[hover] : null;
  const activeCallout = hoverCallout != null ? calloutFields[hoverCallout] : null;

  const displayTotal = totalOverride ? totalOverride : sum;
  const centerLabel = activeCallout ? activeCallout.label.toUpperCase() : active ? `${active.pct}%` : "Total";
  const centerValue = activeCallout
    ? formatFieldValue(activeCallout.value, activeCallout.unit)
    : active
      ? formatNumber(active.value)
      : formatNumber(displayTotal);
  const centerColor = activeCallout ? "#5b6472" : active ? colors[active.i] : "#0b1d27";

  const calloutLegend = calloutFields.map((c, i) =>
    c.highlight ? (
      <div
        key={c.label}
        className="flex items-center justify-between gap-3 rounded-md px-2 py-1 transition-opacity"
        style={{ background: accentColor ?? "#0b1d27", cursor: "pointer", opacity: hoverCallout === i ? 0.85 : 1 }}
        onMouseEnter={() => {
          setHoverCallout(i);
          setHover(null);
        }}
        onMouseLeave={() => setHoverCallout((h) => (h === i ? null : h))}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.85)" }}>
          {c.label}
        </span>
        <span className="text-xs font-extrabold" style={{ color: "#ffffff" }}>
          {formatFieldValue(c.value, c.unit)}
        </span>
      </div>
    ) : (
      <div
        key={c.label}
        className="flex items-center gap-1.5 rounded px-1 py-0.5 transition-colors"
        style={{ background: hoverCallout === i ? "rgba(0,0,0,0.05)" : "transparent", cursor: "pointer" }}
        onMouseEnter={() => {
          setHoverCallout(i);
          setHover(null);
        }}
        onMouseLeave={() => setHoverCallout((h) => (h === i ? null : h))}
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: "#8b93a1" }} />
        <span>
          {c.label}: <strong>{formatFieldValue(c.value, c.unit)}</strong>
        </span>
      </div>
    )
  );

  const centerOverlay = (hoverCallout != null || displayTotal > 0) && (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
      <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: "#8b93a1" }}>
        {centerLabel}
      </span>
      <span className="stat-value text-sm font-extrabold leading-tight" style={{ color: centerColor }}>
        {centerValue}
      </span>
    </div>
  );

  if (sum <= 0) {
    if (calloutFields.length === 0 && !totalOverride) {
      return (
        <div className="flex items-center gap-4">
          <div className="h-28 w-28 shrink-0 rounded-full print:h-20 print:w-20" style={{ border: "1px dashed #c3c9d1" }} />
          <p className="text-sm italic" style={{ color: "#8b93a1" }}>
            No data entered yet for this team.
          </p>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-4">
        <div className="relative h-28 w-28 shrink-0 print:h-20 print:w-20 rounded-full" style={{ border: "1px dashed #c3c9d1" }}>
          {centerOverlay}
        </div>
        <div className="flex flex-col gap-1 text-xs" style={{ color: "#33454f" }}>
          {calloutLegend}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-28 w-28 shrink-0 print:h-20 print:w-20">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          {segments.map((s) => (
            <circle
              key={s.label + s.i}
              cx={50}
              cy={50}
              r={r}
              fill="none"
              stroke={colors[s.i]}
              strokeWidth={hover === s.i ? strokeWidth + 4 : strokeWidth}
              strokeDasharray={`${s.length} ${circumference - s.length}`}
              strokeDashoffset={s.offset}
              transform="rotate(-90 50 50)"
              style={{
                opacity: hoverCallout != null || (hover != null && hover !== s.i) ? 0.35 : 1,
                transition: "stroke-width 150ms ease, opacity 150ms ease",
                cursor: "pointer",
              }}
              onMouseEnter={() => {
                setHover(s.i);
                setHoverCallout(null);
              }}
              onMouseLeave={() => setHover((h) => (h === s.i ? null : h))}
            />
          ))}
        </svg>
        {centerOverlay}
        {active && hoverCallout == null && (
          <div
            className="pointer-events-none absolute z-10 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold text-white shadow-lg print:hidden"
            style={{
              left: `${active.anchorX}%`,
              top: `${active.anchorY}%`,
              transform: "translate(-50%, -130%)",
              background: "#0b1d27",
            }}
          >
            {active.label}: {formatNumber(active.value)}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 text-xs" style={{ color: "#33454f" }}>
        {calloutLegend}
        {segments.map((s) => (
          <div
            key={s.label + s.i}
            className="flex items-center gap-1.5 rounded px-1 py-0.5 transition-colors"
            style={{ background: hover === s.i ? "rgba(0,0,0,0.05)" : "transparent", cursor: "pointer" }}
            onMouseEnter={() => {
              setHover(s.i);
              setHoverCallout(null);
            }}
            onMouseLeave={() => setHover((h) => (h === s.i ? null : h))}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colors[s.i] }} />
            <span>
              {s.label}: <strong>{formatNumber(s.value)}</strong>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
