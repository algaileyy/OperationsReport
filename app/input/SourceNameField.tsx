"use client";

import { useState } from "react";

const inputStyle = {
  borderColor: "var(--border)",
  background: "var(--surface)",
  color: "var(--ink-primary)",
} as const;

const CUSTOM_OPTION = "__custom__";

/** Source-name field for a by-source entry row — a dropdown of known recurring sources when the
 * breakdown has a commonSources list configured, with an escape hatch to type a one-off name;
 * otherwise just the plain free-text box it's always been. */
export default function SourceNameField({
  commonSources,
  value,
  onChange,
}: {
  commonSources?: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  // Sticky "I'm typing a custom one" mode — without it, picking "+ Add a new source…" and then
  // typing would flip back to the dropdown the instant the text no longer matches "__custom__".
  const [customMode, setCustomMode] = useState(false);

  if (!commonSources || commonSources.length === 0) {
    return (
      <input
        type="text"
        placeholder="Source, e.g. Atheer"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded-md border px-3 py-2 text-sm"
        style={inputStyle}
      />
    );
  }

  const isKnown = value === "" || commonSources.includes(value);
  const showCustomInput = customMode || !isKnown;

  if (showCustomInput) {
    return (
      <div className="flex flex-1 items-center gap-2">
        <input
          type="text"
          placeholder="New source name"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-md border px-3 py-2 text-sm"
          style={inputStyle}
        />
        <button
          type="button"
          onClick={() => {
            setCustomMode(false);
            onChange("");
          }}
          className="shrink-0 whitespace-nowrap text-xs underline"
          style={{ color: "var(--ink-muted)" }}
        >
          Choose from list
        </button>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === CUSTOM_OPTION) {
          setCustomMode(true);
          onChange("");
        } else {
          onChange(e.target.value);
        }
      }}
      className="flex-1 rounded-md border px-3 py-2 text-sm"
      style={inputStyle}
    >
      <option value="">Select a source…</option>
      {commonSources.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
      <option value={CUSTOM_OPTION}>+ Add a new source…</option>
    </select>
  );
}
