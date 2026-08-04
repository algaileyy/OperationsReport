import { REPORT_ORDER, TEAMS, getTeam, publishingTotal } from "@/lib/teams";
import { getAllReportData, getPublishedMonth, getReportUpdatedAt } from "@/lib/db";
import { monthLabel } from "@/lib/months";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

// The report is a deliverable everyone should see the same way, so it uses a
// fixed light palette rather than following the viewer's OS dark-mode setting
// (unlike /input, which is an internal tool and can follow it).
const PAGE_BG = "#f4f6fb";
const CARD_BG = "#ffffff";
const INK_PRIMARY = "#111827";
const INK_SECONDARY = "#4b5563";
const INK_MUTED = "#6b7280";
const BORDER = "rgba(17,24,39,0.08)";
const NAVY = "#0d366b";
const NAVY_LIGHT = "#86b6ef";

const ACCENT_HEX: Record<string, string> = {
  blue: "#2a78d6",
  orange: "#eb6834",
  aqua: "#1baf7a",
  violet: "#4a3aa7",
};

const TRACK_HEX: Record<string, string> = {
  blue: "#e3eefa",
  orange: "#fce8e0",
  aqua: "#e0f5ec",
  violet: "#e9e6f6",
};

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

/** Horizontal bar: magnitude comparison within one team, own scale, value at the tip. */
function BarRow({
  label,
  value,
  max,
  accent,
  track,
}: {
  label: string;
  value: number | undefined;
  max: number;
  accent: string;
  track: string;
}) {
  const v = value ?? 0;
  const pct = max > 0 ? Math.max((v / max) * 100, v > 0 ? 2 : 0) : 0;
  return (
    <div>
      <div className="mb-1.5 text-sm font-medium" style={{ color: INK_SECONDARY }}>
        {label}
      </div>
      <div className="flex items-center gap-3">
        <div className="h-3 flex-1 overflow-hidden rounded-full" style={{ background: track }}>
          <div className="h-3 rounded-r-full" style={{ width: `${pct}%`, background: accent }} />
        </div>
        <span className="stat-value w-16 shrink-0 text-right text-sm font-bold" style={{ color: INK_PRIMARY }}>
          {formatNumber(v)}
        </span>
      </div>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: number | undefined; accent: string }) {
  return (
    <div className="rounded-lg border-t-4 p-4" style={{ borderTopColor: accent, background: PAGE_BG }}>
      <p className="stat-value text-3xl font-bold leading-none" style={{ color: INK_PRIMARY }}>
        {formatNumber(value)}
      </p>
      <p className="mt-2 text-xs leading-snug" style={{ color: INK_SECONDARY }}>
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
    <div className="flex items-center gap-4 rounded-lg p-4" style={{ background: PAGE_BG }}>
      <div
        className="relative h-24 w-24 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${aColor} 0deg ${aDeg}deg, ${bColor} ${aDeg}deg 360deg)` }}
      >
        <div className="absolute inset-[10px] flex items-center justify-center rounded-full" style={{ background: PAGE_BG }}>
          <span className="text-lg font-bold" style={{ color: INK_PRIMARY }}>
            {aPct}%
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2 text-xs">
        <div className="flex items-center gap-1.5" style={{ color: INK_SECONDARY }}>
          <span className="h-2 w-2 rounded-full" style={{ background: aColor }} />
          {aLabel}: <strong style={{ color: INK_PRIMARY }}>{formatNumber(a)}</strong>
        </div>
        <div className="flex items-center gap-1.5" style={{ color: INK_SECONDARY }}>
          <span className="h-2 w-2 rounded-full" style={{ background: bColor }} />
          {bLabel}: <strong style={{ color: INK_PRIMARY }}>{formatNumber(b)}</strong>
        </div>
      </div>
    </div>
  );
}

export default async function ReportPage() {
  const publishedMonth = await getPublishedMonth();

  if (!publishedMonth) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center" style={{ background: PAGE_BG }}>
        <p style={{ color: INK_SECONDARY }}>No report has been published yet. Check back soon.</p>
      </main>
    );
  }

  const [allData, updatedAt] = await Promise.all([
    getAllReportData(publishedMonth),
    getReportUpdatedAt(publishedMonth),
  ]);

  return (
    <main style={{ background: PAGE_BG }}>
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
            const track = TRACK_HEX[team.accent];

            const isPublishing = team.key === "publishing";
            const max = isPublishing ? 0 : Math.max(1, ...team.fields.map((f) => data[f.key] ?? 0));

            return (
              <section
                key={team.key}
                className="rounded-xl shadow-sm"
                style={{ background: CARD_BG, boxShadow: "0 1px 3px rgba(17,24,39,0.06), 0 1px 2px rgba(17,24,39,0.04)" }}
              >
                <div className="flex items-center gap-3 border-b p-5" style={{ borderColor: BORDER }}>
                  <TeamBadge initial={team.name.charAt(0)} accent={accent} />
                  <h2 className="text-xl font-bold" style={{ color: INK_PRIMARY }}>
                    {team.name}
                  </h2>
                </div>

                <div className="p-5">
                  {isPublishing ? (
                    <>
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        {team.fields.map((field) => (
                          <StatTile key={field.key} label={field.label} value={data[field.key]} accent={accent} />
                        ))}
                      </div>
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
                    </>
                  ) : (
                    <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                      {team.fields.map((field) => (
                        <BarRow
                          key={field.key}
                          label={field.label}
                          value={data[field.key]}
                          max={max}
                          accent={accent}
                          track={track}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <footer className="mt-10 text-center text-xs" style={{ color: INK_MUTED }}>
          {TEAMS.length} teams reporting
        </footer>
      </div>
    </main>
  );
}
