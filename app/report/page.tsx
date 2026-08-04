import { getMonthlyReport, getPublishedMonth, getReportUpdatedAt } from "@/lib/db";
import { monthLabel } from "@/lib/months";
import { formatNumber } from "@/lib/format";
import { TEAMS, publishingTotal, type TeamConfig, type TeamData } from "@/lib/teams";
import { emptyReport } from "@/lib/report";

export const dynamic = "force-dynamic";

const GRADIENT =
  "linear-gradient(135deg, #12283d 0%, #164a5c 30%, #1c7a86 65%, #2fc2c9 100%)";
const PANEL = "rgba(255,255,255,0.07)";
const PANEL_BORDER = "rgba(255,255,255,0.14)";
const HEADER_ROW = "rgba(6,32,40,0.55)";
const ROW_ALT = "rgba(255,255,255,0.04)";
const TEXT_BRIGHT = "#ffffff";
const TEXT_DIM = "#bfe4ea";
const ACCENT_CYAN = "#5fd4f4";

const ACCENT_HEX: Record<string, string> = {
  blue: "#2a78d6",
  orange: "#eb6834",
  aqua: "#1baf7a",
  violet: "#4a3aa7",
};

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixWithWhite(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

/** N shades of one team's accent hue, full color first, lightening toward white. */
function shadeSteps(hex: string, count: number): string[] {
  if (count <= 1) return [hex];
  return Array.from({ length: count }, (_, i) => mixWithWhite(hex, (i / (count - 1)) * 0.6));
}

function SectionHeading({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="mb-3 flex items-baseline gap-2 text-lg font-bold" style={{ color: TEXT_BRIGHT }}>
      <span style={{ color: ACCENT_CYAN }}>{n}.</span>
      {title}
    </h2>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: TEXT_BRIGHT }}>
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-3 py-2 text-sm" style={{ color: "#e7f6f8" }}>
      {children}
    </td>
  );
}

function TeamPie({ team, data }: { team: TeamConfig; data: TeamData }) {
  const accent = ACCENT_HEX[team.accent];
  const fields = team.fields.map((f) => ({ label: f.label, value: data[f.key] ?? 0 }));
  const colors = shadeSteps(accent, fields.length);
  const sum = fields.reduce((s, f) => s + f.value, 0);
  const denom = sum || 1;

  let cumulative = 0;
  const stops = fields
    .map((f, i) => {
      const startDeg = (cumulative / denom) * 360;
      cumulative += f.value;
      const endDeg = (cumulative / denom) * 360;
      return `${colors[i]} ${startDeg}deg ${endDeg}deg`;
    })
    .join(", ");

  return (
    <div className="mb-6 last:mb-0">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="text-sm font-bold" style={{ color: accent }}>
          {team.name}
        </p>
        <p className="shrink-0 text-lg font-bold" style={{ color: "#0b1d27" }}>
          {formatNumber(sum)}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div
          className="h-28 w-28 shrink-0 rounded-full"
          style={{ background: sum > 0 ? `conic-gradient(${stops})` : "#eef0f4" }}
        />
        <div className="flex flex-col gap-1 text-xs" style={{ color: "#33454f" }}>
          {fields.map((f, i) => (
            <div key={f.label} className="flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colors[i] }} />
              <span>
                {f.label}: <strong>{formatNumber(f.value)}</strong>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function ReportPage() {
  const publishedMonth = await getPublishedMonth();

  if (!publishedMonth) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center text-white" style={{ background: GRADIENT }}>
        <p>No report has been published yet. Check back soon.</p>
      </main>
    );
  }

  const [data, updatedAt] = await Promise.all([
    getMonthlyReport(publishedMonth),
    getReportUpdatedAt(publishedMonth),
  ]);

  const report = data ?? emptyReport();

  return (
    <main className="min-h-screen" style={{ background: GRADIENT }}>
      <div className="px-6 pb-4 pt-10 sm:px-10">
        <h1 className="text-2xl font-extrabold sm:text-3xl" style={{ color: TEXT_BRIGHT }}>
          Operations Report
        </h1>
        <p className="mt-1 text-sm" style={{ color: TEXT_DIM }}>
          {monthLabel(publishedMonth)}
          {updatedAt &&
            ` · Last updated ${new Date(updatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              timeZone: "UTC",
            })}`}
        </p>
      </div>

      <div className="flex flex-col gap-6 px-4 pb-12 sm:px-6 lg:flex-row lg:items-start lg:px-10">
        {/* Sidebar: one pie chart per team */}
        <aside className="rounded-2xl bg-white p-6 shadow-xl lg:w-[340px] lg:shrink-0">
          {TEAMS.map((team) => (
            <TeamPie key={team.key} team={team} data={report.teams[team.key] ?? {}} />
          ))}
        </aside>

        {/* Main content: one table section per team */}
        <div className="flex flex-1 flex-col gap-6">
          {TEAMS.map((team, idx) => {
            const teamData = report.teams[team.key] ?? {};
            const rows = team.fields.map((f) => ({ label: f.label, value: teamData[f.key] ?? 0 }));
            if (team.key === "publishing") {
              rows.push({ label: "Total Assets in CMS (movies and episodes)", value: publishingTotal(teamData) });
            }

            return (
              <section key={team.key} className="rounded-2xl p-5" style={{ background: PANEL, border: `1px solid ${PANEL_BORDER}` }}>
                <SectionHeading n={idx + 1} title={team.name} />
                <div className="overflow-x-auto rounded-lg" style={{ border: `1px solid ${PANEL_BORDER}` }}>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr style={{ background: HEADER_ROW }}>
                        <Th>Metric</Th>
                        <Th>Value</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={row.label} style={{ background: i % 2 ? ROW_ALT : "transparent" }}>
                          <Td>
                            <strong style={{ color: TEXT_BRIGHT }}>{row.label}</strong>
                          </Td>
                          <Td>{formatNumber(row.value)}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
