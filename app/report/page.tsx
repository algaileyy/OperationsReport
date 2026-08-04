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

const NAVY = "#0d366b";
const NAVY_LIGHT = "#86b6ef";

function TeamBadge({ initial, accent }: { initial: string; accent: string }) {
  return (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
      style={{ background: accent }}
    >
      {initial}
    </span>
  );
}

function StatTile({ label, value, accent }: { label: string; value: number | undefined; accent: string }) {
  return (
    <div
      className="rounded-lg border-t-4 p-4"
      style={{ borderTopColor: accent, background: "var(--surface-page)" }}
    >
      <p
        className="stat-value text-3xl font-bold leading-none"
        style={{ color: "var(--ink-primary)" }}
      >
        {formatNumber(value)}
      </p>
      <p className="mt-2 text-xs leading-snug" style={{ color: "var(--ink-secondary)" }}>
        {label}
      </p>
    </div>
  );
}

/** Legitimate part-of-whole donut: episodes + movies genuinely sum to the CMS total. */
function CompositionDonut({
  a,
  b,
  aLabel,
  bLabel,
  aColor,
  bColor,
}: {
  a: number;
  b: number;
  aLabel: string;
  bLabel: string;
  aColor: string;
  bColor: string;
}) {
  const total = a + b || 1;
  const aPct = Math.round((a / total) * 100);
  const aDeg = (a / total) * 360;

  return (
    <div className="flex items-center gap-4 rounded-lg p-4" style={{ background: "var(--surface-page)" }}>
      <div
        className="relative h-24 w-24 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${aColor} 0deg ${aDeg}deg, ${bColor} ${aDeg}deg 360deg)` }}
      >
        <div
          className="absolute inset-[10px] flex items-center justify-center rounded-full"
          style={{ background: "var(--surface-page)" }}
        >
          <span className="text-lg font-bold" style={{ color: "var(--ink-primary)" }}>
            {aPct}%
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2 text-xs">
        <div className="flex items-center gap-1.5" style={{ color: "var(--ink-secondary)" }}>
          <span className="h-2 w-2 rounded-full" style={{ background: aColor }} />
          {aLabel}: <strong style={{ color: "var(--ink-primary)" }}>{formatNumber(a)}</strong>
        </div>
        <div className="flex items-center gap-1.5" style={{ color: "var(--ink-secondary)" }}>
          <span className="h-2 w-2 rounded-full" style={{ background: bColor }} />
          {bLabel}: <strong style={{ color: "var(--ink-primary)" }}>{formatNumber(b)}</strong>
        </div>
      </div>
    </div>
  );
}

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
    <main>
      <header style={{ background: NAVY }}>
        <div className="mx-auto max-w-5xl px-6 py-14">
          <p className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: NAVY_LIGHT }}>
            Statistics &amp; Results
          </p>
          <h1 className="mt-2 text-4xl font-extrabold text-white sm:text-5xl">Operations Report</h1>
          <p className="mt-3 text-lg font-medium" style={{ color: "#cfe1f8" }}>
            {monthLabel(publishedMonth)}
          </p>
          {updatedAt && (
            <p className="mt-1 text-xs" style={{ color: NAVY_LIGHT }}>
              Last updated{" "}
              {new Date(updatedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                timeZone: "UTC",
              })}
            </p>
          )}
        </div>
        <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${NAVY_LIGHT}, ${NAVY})` }} />
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col gap-8">
          {REPORT_ORDER.map((teamKey) => {
            const team = getTeam(teamKey);
            if (!team) return null;
            const data = allData[teamKey] ?? {};
            const accent = ACCENT_HEX[team.accent];

            return (
              <section
                key={team.key}
                className="rounded-xl border shadow-sm"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <div className="flex items-center gap-3 border-b p-5" style={{ borderColor: "var(--border)" }}>
                  <TeamBadge initial={team.name.charAt(0)} accent={accent} />
                  <h2 className="text-xl font-bold" style={{ color: "var(--ink-primary)" }}>
                    {team.name}
                  </h2>
                </div>

                <div className="p-5">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {team.fields.map((field) => (
                      <StatTile key={field.key} label={field.label} value={data[field.key]} accent={accent} />
                    ))}
                  </div>

                  {team.key === "publishing" && (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <StatTile
                        label="Total Assets in CMS (movies and episodes)"
                        value={publishingTotal(data)}
                        accent={accent}
                      />
                      <CompositionDonut
                        a={data.episodesInCms ?? 0}
                        b={data.moviesInCms ?? 0}
                        aLabel="Episodes"
                        bLabel="Movies"
                        aColor={accent}
                        bColor={NAVY_LIGHT}
                      />
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <footer className="mt-10 text-center text-xs" style={{ color: "var(--ink-muted)" }}>
          {TEAMS.length} teams reporting
        </footer>
      </div>
    </main>
  );
}
