"use client";

import { useEffect, useState } from "react";
import MonthPicker from "../MonthPicker";
import { monthLabel } from "@/lib/months";
import { TEAMS, type TeamData } from "@/lib/teams";
import { emptyReport, type MonthlyReport } from "@/lib/report";
import { formatFieldValue } from "@/lib/format";

const ACCENT_HEX: Record<string, string> = {
  blue: "#2a78d6",
  orange: "#eb6834",
  aqua: "#1baf7a",
  violet: "#4a3aa7",
};

function DeltaCell({ delta, pct, unit }: { delta: number; pct: number | null; unit?: string }) {
  if (delta === 0) {
    return <span style={{ color: "var(--ink-muted)" }}>—</span>;
  }
  const up = delta > 0;
  const color = up ? "#2a78d6" : "#e34948";
  return (
    <span style={{ color }} className="font-medium">
      {up ? "▲" : "▼"} {formatFieldValue(Math.abs(delta), unit)}
      {pct !== null && <span className="ml-1 text-xs opacity-80">({up ? "+" : ""}{pct.toFixed(1)}%)</span>}
    </span>
  );
}

async function fetchMonth(month: string): Promise<MonthlyReport> {
  const res = await fetch(`/api/report-data?month=${month}`);
  if (!res.ok) return emptyReport();
  const body = await res.json();
  return body.data as MonthlyReport;
}

export default function CompareClient({
  monthsWithData,
  initialA,
  initialB,
}: {
  monthsWithData: string[];
  initialA: string;
  initialB: string;
}) {
  const [monthA, setMonthA] = useState(initialA);
  const [monthB, setMonthB] = useState(initialB);
  const [dataA, setDataA] = useState<MonthlyReport | null>(null);
  const [dataB, setDataB] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchMonth(monthA), fetchMonth(monthB)]).then(([a, b]) => {
      if (cancelled) return;
      setDataA(a);
      setDataB(b);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [monthA, monthB]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end gap-6">
        <MonthPicker value={monthA} onChange={setMonthA} markedMonths={monthsWithData} label="Compare" />
        <MonthPicker value={monthB} onChange={setMonthB} markedMonths={monthsWithData} label="Against" />
      </div>

      {loading || !dataA || !dataB ? (
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
          Loading…
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {TEAMS.map((team) => {
            const a: TeamData = dataA.teams[team.key] ?? {};
            const b: TeamData = dataB.teams[team.key] ?? {};
            const accent = ACCENT_HEX[team.accent];

            const rows = [
              ...(team.groups ?? []).map((g) => ({
                label: g.label,
                a: g.sumKeys.reduce((s, k) => s + (a[k] ?? 0), 0),
                b: g.sumKeys.reduce((s, k) => s + (b[k] ?? 0), 0),
                unitA: undefined as string | undefined,
                unitB: undefined as string | undefined,
                bold: true,
              })),
              ...team.fields.map((f) => ({
                label: f.label,
                a: a[f.key] ?? 0,
                b: b[f.key] ?? 0,
                // A unitOptions field's unit can differ per month (whichever was picked on
                // /input) — read each side's own choice rather than assuming one shared unit.
                unitA: f.unit ?? (f.unitOptions ? dataA.fieldUnits?.[team.key]?.[f.key] ?? f.unitOptions[0] : undefined),
                unitB: f.unit ?? (f.unitOptions ? dataB.fieldUnits?.[team.key]?.[f.key] ?? f.unitOptions[0] : undefined),
                bold: false,
              })),
            ];

            return (
              <section key={team.key} className="rounded-lg border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <div className="mb-4 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
                  <h2 className="text-base font-semibold" style={{ color: "var(--ink-primary)" }}>
                    {team.name}
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] border-collapse text-sm">
                    <thead>
                      <tr style={{ color: "var(--ink-muted)" }}>
                        <th className="p-1.5 text-left font-medium">Metric</th>
                        <th className="p-1.5 text-left font-medium">{monthLabel(monthA)}</th>
                        <th className="p-1.5 text-left font-medium">{monthLabel(monthB)}</th>
                        <th className="p-1.5 text-left font-medium">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        // "Compare A against B" reads as A relative to B.
                        const delta = row.a - row.b;
                        const pct = row.b !== 0 ? (delta / row.b) * 100 : null;
                        return (
                          <tr key={row.label} style={{ borderTop: "1px solid var(--border)" }}>
                            <td className="p-1.5" style={{ color: "var(--ink-primary)", fontWeight: row.bold ? 600 : 400 }}>
                              {row.label}
                            </td>
                            <td className="p-1.5" style={{ color: "var(--ink-secondary)" }}>
                              {formatFieldValue(row.a, row.unitA)}
                            </td>
                            <td className="p-1.5" style={{ color: "var(--ink-secondary)" }}>
                              {formatFieldValue(row.b, row.unitB)}
                            </td>
                            <td className="p-1.5">
                              <DeltaCell delta={delta} pct={pct} unit={row.unitB} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
