import { REPORT_ORDER, TEAMS, getTeam, publishingTotal } from "@/lib/teams";
import { getAllReportData, getPublishedMonth, getReportUpdatedAt } from "@/lib/db";
import { monthLabel } from "@/lib/months";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

const ACCENT_HEX: Record<string, string> = {
  blue: "#2a78d6",
  orange: "#eb6834",
  aqua: "#1baf7a",
  violet: "#4a3aa7",
};

export default async function ReportPage() {
  const publishedMonth = await getPublishedMonth();

  if (!publishedMonth) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
        <p style={{ color: "var(--ink-secondary)" }}>
          No report has been published yet. Check back soon.
        </p>
      </main>
    );
  }

  const [allData, updatedAt] = await Promise.all([
    getAllReportData(publishedMonth),
    getReportUpdatedAt(publishedMonth),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-10">
        <p className="text-sm font-medium uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>
          Operations Report
        </p>
        <h1 className="text-3xl font-semibold" style={{ color: "var(--ink-primary)" }}>
          {monthLabel(publishedMonth)}
        </h1>
        {updatedAt && (
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            Last updated{" "}
            {new Date(updatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              timeZone: "UTC",
            })}
          </p>
        )}
      </header>

      <div className="flex flex-col gap-8">
        {REPORT_ORDER.map((teamKey) => {
          const team = getTeam(teamKey);
          if (!team) return null;
          const data = allData[teamKey] ?? {};
          const accent = ACCENT_HEX[team.accent];

          const tiles = team.fields.map((f) => ({ label: f.label, value: data[f.key] }));
          if (team.key === "publishing") {
            tiles.push({ label: "Total Assets in CMS (movies and episodes)", value: publishingTotal(data) });
          }

          return (
            <section
              key={team.key}
              className="rounded-xl border p-6"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <div className="mb-5 flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
                <h2 className="text-lg font-semibold" style={{ color: "var(--ink-primary)" }}>
                  {team.name}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {tiles.map((tile) => (
                  <div
                    key={tile.label}
                    className="rounded-lg p-4"
                    style={{ background: "var(--surface-page)" }}
                  >
                    <p className="text-xs" style={{ color: "var(--ink-secondary)" }}>
                      {tile.label}
                    </p>
                    <p
                      className="stat-value mt-1 text-2xl font-semibold"
                      style={{ color: "var(--ink-primary)" }}
                    >
                      {formatNumber(tile.value)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <footer className="mt-10 text-center text-xs" style={{ color: "var(--ink-muted)" }}>
        {TEAMS.length} teams reporting
      </footer>
    </main>
  );
}
