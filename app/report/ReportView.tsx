import { monthLabel } from "@/lib/months";
import { formatNumber, formatFieldValue } from "@/lib/format";
import { TEAMS, type TeamConfig, type TeamData } from "@/lib/teams";
import type { MonthlyReport, SourceEntry } from "@/lib/report";
import GroupRow from "./GroupRow";
import ExportButton from "./ExportButton";

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

function hexToHsl(hex: string): [number, number, number] {
  const [r0, g0, b0] = hexToRgb(hex);
  const r = r0 / 255, g = g0 / 255, b = b0 / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360 / 360;
  const ss = s / 100;
  const ll = l / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (ss === 0) {
    r = g = b = ll;
  } else {
    const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
    const p = 2 * ll - q;
    r = hue2rgb(p, q, hh + 1 / 3);
    g = hue2rgb(p, q, hh);
    b = hue2rgb(p, q, hh - 1 / 3);
  }
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * N distinct shades of one team's accent hue. Lightness is spread widely
 * (not a tight tint-toward-white ramp) and alternates a small hue nudge so
 * adjacent pie slices stay visually distinguishable even at low slice counts.
 */
function shadeSteps(hex: string, count: number): string[] {
  if (count <= 1) return [hex];
  const [h, s] = hexToHsl(hex);
  const sat = Math.max(s, 55);
  return Array.from({ length: count }, (_, i) => {
    const l = 32 + (i / (count - 1)) * 45;
    const hue = h + (i % 2 === 1 ? 12 : 0);
    return hslToHex(hue, sat, l);
  });
}

/** Lightened for legibility as text/dots directly on the dark report background. */
function accentOnDark(hex: string): string {
  return mixWithWhite(hex, 0.38);
}

/** The one headline number each team leads with in the executive summary. */
function headlineFor(team: TeamConfig, data: TeamData): { label: string; value: number; unit?: string } {
  switch (team.key) {
    case "publishing":
    case "mediaManagement": {
      const g = team.groups![0];
      return { label: g.label, value: g.sumKeys.reduce((s, k) => s + (data[k] ?? 0), 0) };
    }
    case "archivingSupport": {
      const g = team.groups!.find((g) => g.key === "archived")!;
      return { label: g.label, value: g.sumKeys.reduce((s, k) => s + (data[k] ?? 0), 0), unit: g.unit };
    }
    case "mediaIngest":
      return { label: "Total Assets Processed (In GCP)", value: data.totalAssetsProcessed ?? 0 };
    default:
      return { label: team.name, value: 0 };
  }
}

function SectionHeading({ n, title }: { n?: number; title: string }) {
  return (
    <h2 className="mb-3 flex items-baseline gap-2 text-lg font-bold" style={{ color: TEXT_BRIGHT }}>
      {n != null && <span style={{ color: ACCENT_CYAN }}>{n}.</span>}
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

function ExecutiveSummary({ report }: { report: MonthlyReport }) {
  const notes = TEAMS.map((t) => ({ team: t, note: report.notes?.[t.key] })).filter((n) => n.note);

  return (
    <section
      className="mb-6 rounded-2xl p-5 print:mb-4 print:break-inside-avoid print:rounded-lg print:p-4"
      style={{ background: PANEL, border: `1px solid ${PANEL_BORDER}` }}
    >
      <SectionHeading title="Executive Summary" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {TEAMS.map((team) => {
          const accent = accentOnDark(ACCENT_HEX[team.accent]);
          const headline = headlineFor(team, report.teams[team.key] ?? {});
          return (
            <div key={team.key} className="rounded-lg p-4" style={{ background: "rgba(0,0,0,0.15)" }}>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold" style={{ color: accent }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
                {team.name}
              </p>
              <p className="stat-value text-2xl font-extrabold" style={{ color: TEXT_BRIGHT }}>
                {formatFieldValue(headline.value, headline.unit)}
              </p>
              <p className="text-xs" style={{ color: TEXT_DIM }}>
                {headline.label}
              </p>
            </div>
          );
        })}
      </div>
      {notes.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5 text-sm" style={{ color: TEXT_DIM }}>
          {notes.map(({ team, note }) => (
            <li key={team.key}>
              <strong style={{ color: TEXT_BRIGHT }}>{team.name}:</strong> {note}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TeamPie({
  team,
  data,
  sourceTotals = [],
}: {
  team: TeamConfig;
  data: TeamData;
  /** Each source-breakdown's total, added as one more slice alongside the plain fields. */
  sourceTotals?: { label: string; value: number }[];
}) {
  const accent = ACCENT_HEX[team.accent];
  // Only unitless fields are comparable counts and can share one pie; a
  // field with a unit (e.g. TB) isn't the same kind of quantity, so it's
  // shown as its own callout instead of a slice.
  const pieFields = [
    ...team.fields.filter((f) => !f.unit).map((f) => ({ label: f.label, value: data[f.key] ?? 0 })),
    ...sourceTotals,
  ];
  const calloutFields = team.fields.filter((f) => f.unit).map((f) => ({ label: f.label, value: data[f.key] ?? 0, unit: f.unit }));

  const colors = shadeSteps(accent, pieFields.length);
  const sum = pieFields.reduce((s, f) => s + f.value, 0);
  const denom = sum || 1;

  let cumulative = 0;
  const stops = pieFields
    .map((f, i) => {
      const startDeg = (cumulative / denom) * 360;
      cumulative += f.value;
      const endDeg = (cumulative / denom) * 360;
      return `${colors[i]} ${startDeg}deg ${endDeg}deg`;
    })
    .join(", ");

  return (
    <div className="rounded-xl bg-white p-5 shadow-xl print:break-inside-avoid print:rounded-lg print:p-3 print:shadow-none">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3 print:mb-2">
        <p className="text-sm font-bold" style={{ color: accent }}>
          {team.name}
        </p>
        {calloutFields.map((f) => (
          <p key={f.label} className="text-sm" style={{ color: "#33454f" }}>
            {f.label}: <strong style={{ color: "#0b1d27" }}>{formatFieldValue(f.value, f.unit)}</strong>
          </p>
        ))}
      </div>
      {pieFields.length > 0 && (
        <div className="flex items-center gap-4">
          <div
            className="h-28 w-28 shrink-0 rounded-full print:h-20 print:w-20"
            style={{
              background: sum > 0 ? `conic-gradient(${stops})` : "#e4e7ec",
              border: sum > 0 ? undefined : "1px dashed #c3c9d1",
            }}
          />
          {sum > 0 ? (
            <div className="flex flex-col gap-1 text-xs" style={{ color: "#33454f" }}>
              {pieFields.map((f, i) => (
                <div key={f.label} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colors[i] }} />
                  <span>
                    {f.label}: <strong>{formatNumber(f.value)}</strong>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm italic" style={{ color: "#8b93a1" }}>
              No data entered yet for this team.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReportView({
  monthKey,
  report,
  updatedAt,
  banner,
}: {
  monthKey: string;
  report: MonthlyReport;
  updatedAt: Date | null;
  /** Optional callout shown above the title — used by the /input preview to mark draft/unpublished months. */
  banner?: React.ReactNode;
}) {
  return (
    <main className="min-h-screen print:min-h-0" style={{ background: GRADIENT }}>
      {banner}
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 pb-4 pt-10 sm:px-10 print:px-8 print:pb-3 print:pt-8">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl" style={{ color: TEXT_BRIGHT }}>
            Operations Report
          </h1>
          <p className="mt-1 text-sm" style={{ color: TEXT_DIM }}>
            {monthLabel(monthKey)}
            {updatedAt &&
              ` · Last updated ${new Date(updatedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                timeZone: "UTC",
              })}`}
          </p>
        </div>
        <ExportButton />
      </div>

      <div className="mx-auto max-w-4xl px-4 pb-12 sm:px-6 lg:px-10 print:max-w-none print:px-8 print:pb-6">
        <ExecutiveSummary report={report} />

        <div className="flex flex-col gap-6 print:gap-4">
          {TEAMS.map((team, idx) => {
            const teamData = report.teams[team.key] ?? {};
            const groups = team.groups ?? [];
            const groupedKeys = new Set(groups.flatMap((g) => g.detailFieldKeys));
            const plainFields = team.fields.filter((f) => !groupedKeys.has(f.key));
            const fieldLabel = (key: string) => team.fields.find((f) => f.key === key)?.label ?? key;
            const note = report.notes?.[team.key];
            const sourceBreakdowns = team.sourceBreakdowns ?? [];
            const sourceTotals = sourceBreakdowns.map((sb) => {
              const entries: SourceEntry[] = report.sourceBreakdowns?.[team.key]?.[sb.key] ?? [];
              return { label: sb.label, value: entries.reduce((s, e) => s + e.count, 0) };
            });
            let rowIndex = 0;

            return (
              <section
                key={team.key}
                className="rounded-2xl p-5 print:rounded-lg print:p-4"
                style={{ background: PANEL, border: `1px solid ${PANEL_BORDER}` }}
              >
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
                      {groups.map((group) => {
                        const total = group.sumKeys.reduce((s, k) => s + (teamData[k] ?? 0), 0);
                        const detail = group.detailFieldKeys.map((k) => ({ label: fieldLabel(k), value: teamData[k] ?? 0 }));
                        const alt = rowIndex++ % 2 === 1;
                        return (
                          <GroupRow key={group.key} label={group.label} total={total} detail={detail} altRow={alt} unit={group.unit} />
                        );
                      })}
                      {sourceBreakdowns.map((sb) => {
                        const entries: SourceEntry[] = report.sourceBreakdowns?.[team.key]?.[sb.key] ?? [];
                        const total = entries.reduce((s, e) => s + e.count, 0);
                        const detail = entries.map((e) => ({ label: e.source || "(unnamed source)", value: e.count }));
                        const alt = rowIndex++ % 2 === 1;
                        return <GroupRow key={sb.key} label={sb.label} total={total} detail={detail} altRow={alt} />;
                      })}
                      {plainFields.map((field) => {
                        const alt = rowIndex++ % 2 === 1;
                        return (
                          <tr key={field.key} style={{ background: alt ? ROW_ALT : "transparent" }}>
                            <Td>
                              <strong style={{ color: TEXT_BRIGHT }}>{field.label}</strong>
                            </Td>
                            <Td>{formatFieldValue(teamData[field.key] ?? 0, field.unit)}</Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {note && (
                  <p className="mt-3 text-sm italic" style={{ color: TEXT_DIM }}>
                    {note}
                  </p>
                )}
                <div className="mt-4">
                  <TeamPie team={team} data={teamData} sourceTotals={sourceTotals} />
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
