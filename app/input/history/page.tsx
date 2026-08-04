import Link from "next/link";
import { getPublishedMonth, getReportUpdatedAt, listMonthsWithData } from "@/lib/db";
import { monthLabel } from "@/lib/months";
import InputNav from "../InputNav";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const [months, publishedMonth] = await Promise.all([listMonthsWithData(), getPublishedMonth()]);

  const rows = await Promise.all(
    months.map(async (month) => ({
      month,
      updatedAt: await getReportUpdatedAt(month),
    }))
  );

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <InputNav />
      <h1 className="mb-2 text-xl font-semibold" style={{ color: "var(--ink-primary)" }}>
        Report History
      </h1>
      <p className="mb-6 text-sm" style={{ color: "var(--ink-secondary)" }}>
        Every month that has saved data, most recent first.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
          No reports saved yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--border)" }}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr style={{ background: "var(--surface-page)" }}>
                <th className="px-4 py-2 text-left font-medium" style={{ color: "var(--ink-secondary)" }}>
                  Month
                </th>
                <th className="px-4 py-2 text-left font-medium" style={{ color: "var(--ink-secondary)" }}>
                  Status
                </th>
                <th className="px-4 py-2 text-left font-medium" style={{ color: "var(--ink-secondary)" }}>
                  Last Updated
                </th>
                <th className="px-4 py-2 text-left font-medium" style={{ color: "var(--ink-secondary)" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ month, updatedAt }, i) => {
                const isLive = month === publishedMonth;
                return (
                  <tr key={month} style={{ background: i % 2 ? "var(--surface-page)" : "transparent" }}>
                    <td className="px-4 py-2.5 font-medium" style={{ color: "var(--ink-primary)" }}>
                      {monthLabel(month)}
                    </td>
                    <td className="px-4 py-2.5">
                      {isLive ? (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold"
                          style={{ background: "rgba(12,163,12,0.12)", color: "#0ca30c" }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#0ca30c" }} />
                          Live
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: "var(--ink-secondary)" }}>
                      {updatedAt
                        ? new Date(updatedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            timeZone: "UTC",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-3">
                        <Link href={`/input?month=${month}`} className="underline" style={{ color: "#2a78d6" }}>
                          Edit
                        </Link>
                        <Link href={`/input/preview?month=${month}`} className="underline" style={{ color: "#2a78d6" }}>
                          Preview / Export
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
