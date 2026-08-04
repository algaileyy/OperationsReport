"use client";

import { useState } from "react";
import { formatNumber } from "@/lib/format";

const TEXT_BRIGHT = "#ffffff";
const TEXT_DETAIL = "#cfeef2";
const ROW_ALT = "rgba(255,255,255,0.04)";
const DETAIL_BG = "rgba(0,0,0,0.12)";

type DetailItem = { label: string; value: number };

export default function GroupRow({
  label,
  total,
  detail,
  altRow,
}: {
  label: string;
  total: number;
  detail: DetailItem[];
  altRow: boolean;
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
        <td className="px-3 py-2 text-sm">
          <span className="inline-flex items-center gap-2 font-bold" style={{ color: TEXT_BRIGHT }}>
            <span className="inline-block w-3 text-xs" style={{ color: "#5fd4f4" }}>
              {open ? "▾" : "▸"}
            </span>
            {label}
          </span>
        </td>
        <td className="px-3 py-2 text-sm font-bold" style={{ color: TEXT_BRIGHT }}>
          {formatNumber(total)}
        </td>
      </tr>
      {open &&
        detail.map((d) => (
          <tr key={d.label} style={{ background: DETAIL_BG }}>
            <td className="py-1.5 pl-9 pr-3 text-sm" style={{ color: TEXT_DETAIL }}>
              {d.label}
            </td>
            <td className="px-3 py-1.5 text-sm" style={{ color: TEXT_DETAIL }}>
              {formatNumber(d.value)}
            </td>
          </tr>
        ))}
    </>
  );
}
