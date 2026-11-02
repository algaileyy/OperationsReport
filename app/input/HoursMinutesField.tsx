"use client";

const inputStyle = {
  borderColor: "var(--border)",
  background: "var(--surface)",
  color: "var(--ink-primary)",
} as const;

/** Splits an "H"-unit field (e.g. Quality Control Completed, Hours of QC) into separate Hours and
 * Minutes inputs — easier to enter "6h 30m" directly than work out 6.5 by hand. The two combine
 * back into the same decimal-hours value everything else (totals, the report, exports) already
 * expects, via the same onChange a plain number input would call. */
export default function HoursMinutesField({
  value,
  onChange,
}: {
  value: number;
  onChange: (hoursDecimal: number) => void;
}) {
  const totalMinutes = Math.round((value || 0) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  function update(h: number, m: number) {
    onChange((h * 60 + m) / 60);
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={hours || ""}
        onChange={(e) => update(Number(e.target.value) || 0, minutes)}
        placeholder="0"
        aria-label="Hours"
        className="w-20 rounded-md border px-3 py-2 text-sm"
        style={inputStyle}
      />
      <span className="text-sm" style={{ color: "var(--ink-secondary)" }}>
        h
      </span>
      <input
        type="number"
        min={0}
        max={59}
        inputMode="numeric"
        value={minutes || ""}
        onChange={(e) => update(hours, Math.min(59, Math.max(0, Number(e.target.value) || 0)))}
        placeholder="0"
        aria-label="Minutes"
        className="w-20 rounded-md border px-3 py-2 text-sm"
        style={inputStyle}
      />
      <span className="text-sm" style={{ color: "var(--ink-secondary)" }}>
        m
      </span>
    </div>
  );
}
