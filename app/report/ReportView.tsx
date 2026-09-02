import { monthRangeLabel } from "@/lib/months";
import { formatFieldValue } from "@/lib/format";
import { TEAMS, getTeam, type TeamConfig, type TeamData } from "@/lib/teams";
import type { MonthlyReport, SourceEntry } from "@/lib/report";
import GroupRow from "./GroupRow";
import ExportButton from "./ExportButton";
import InteractivePie from "./InteractivePie";

const PANEL = "rgba(255,255,255,0.07)";
const PANEL_BORDER = "rgba(255,255,255,0.14)";
const HEADER_ROW = "rgba(6,32,40,0.55)";
const ROW_ALT = "rgba(255,255,255,0.04)";
const TEXT_BRIGHT = "#ffffff";
const TEXT_DIM = "#bfe4ea";
const ACCENT_CYAN = "#5fd4f4";
const ACCENT_GREEN = "#34d399";
const ACCENT_AMBER = "#fbbf24";

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

/** Table VALUE cells label plain counts as "Assets" (e.g. "186 Assets") — a field/group/breakdown
 * with its own unit (TB, GB, hours) keeps that instead, since it isn't a comparable asset count. */
function displayUnit(configUnit?: string): string {
  return configUnit ?? " Assets";
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

/** Grand total of every unitless count across all teams — plain fields plus unitless source-breakdown totals. */
function totalTasksAcrossTeams(report: MonthlyReport): number {
  let total = 0;
  for (const team of TEAMS) {
    const data = report.teams[team.key] ?? {};
    for (const f of team.fields) {
      if (!f.unit) total += data[f.key] ?? 0;
    }
    for (const sb of team.sourceBreakdowns ?? []) {
      if (!sb.unit) {
        const entries: SourceEntry[] = report.sourceBreakdowns?.[team.key]?.[sb.key] ?? [];
        total += entries.reduce((s, e) => s + e.count, 0);
      }
    }
  }
  return total;
}

function totalArchived(report: MonthlyReport): number {
  const entries: SourceEntry[] = report.sourceBreakdowns?.["archivingSupport"]?.["archived"] ?? [];
  return entries.reduce((s, e) => s + e.count, 0);
}

/** The "Assets Circulation" glance card shows Media Desk's total activity, not a single field. */
function mediaDeskActivityTotal(report: MonthlyReport): number {
  const group = getTeam("mediaManagement")?.groups?.[0];
  if (!group) return 0;
  const data = report.teams["mediaManagement"] ?? {};
  return group.sumKeys.reduce((s, k) => s + (data[k] ?? 0), 0);
}

/** QC hours are only tracked (in hours) by Media Ingest — Digital Archive's QC is counted in assets,
 * not hours — so the "QC Hours Total" glance card reads that one field instead of a separately
 * entered total that would just duplicate it. */
function qcHoursTotal(report: MonthlyReport): number {
  return report.teams["mediaIngest"]?.["qualityControlCompleted"] ?? 0;
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

/** Each line the person typed becomes its own bullet — strips a leading dash/asterisk/dot they may have typed themselves. */
function commentLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean);
}

function HighlightBlock({ color, label, text }: { color: string; label: string; text: string }) {
  return (
    <div className="border-l-2 pl-3" style={{ borderColor: color }}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color }}>
        {label}
      </p>
      <ul className="list-disc space-y-0.5 pl-4 text-sm" style={{ color: TEXT_DIM }}>
        {commentLines(text).map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

function DividerLabel({ text }: { text: string }) {
  return (
    <div className="mb-3 flex items-center gap-3 print:mb-2">
      <span className="h-px flex-1" style={{ background: PANEL_BORDER }} />
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: TEXT_DIM }}>
        {text}
      </p>
      <span className="h-px flex-1" style={{ background: PANEL_BORDER }} />
    </div>
  );
}

function GlanceCard({
  label,
  value,
  unit,
  caption,
}: {
  label: string;
  value: number;
  unit?: string;
  caption: string;
}) {
  return (
    <div className="rounded-lg border-t-2 p-4" style={{ background: "rgba(0,0,0,0.15)", borderColor: ACCENT_CYAN }}>
      <p className="mb-1 text-xs font-semibold" style={{ color: ACCENT_CYAN }}>
        {label}
      </p>
      <p className="stat-value text-2xl font-extrabold" style={{ color: TEXT_BRIGHT }}>
        {formatFieldValue(value, unit)}
      </p>
      <p className="text-xs" style={{ color: TEXT_DIM }}>
        {caption}
      </p>
    </div>
  );
}

function ExecutiveSummary({ report }: { report: MonthlyReport }) {
  const hasHighlights =
    report.highlights.mainAchievements || report.highlights.challenges || report.highlights.newInitiatives;

  return (
    <section
      className="mb-6 rounded-2xl p-5 print:mb-4 print:break-inside-avoid print:rounded-lg print:p-4"
      style={{ background: PANEL, border: `1px solid ${PANEL_BORDER}` }}
    >
      <SectionHeading title="Executive Summary" />
      <DividerLabel text="This Month at a Glance" />
      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4 print:mb-4">
        <GlanceCard label="Total Tasks" value={totalTasksAcrossTeams(report)} caption="Across all teams this month" />
        <GlanceCard
          label="Archived Total"
          value={totalArchived(report)}
          unit="TB"
          caption="Digital Archive & Production Support"
        />
        <GlanceCard label="QC Hours Total" value={qcHoursTotal(report)} unit=" hrs" caption="Reported this month" />
        <GlanceCard label="Assets Circulation" value={mediaDeskActivityTotal(report)} caption="Media Desk" />
      </div>
      {hasHighlights && (
        <>
          <DividerLabel text="Highlights" />
          <div
            className="grid gap-x-6 gap-y-4 rounded-xl p-4 sm:grid-cols-3 print:p-3"
            style={{ background: "rgba(0,0,0,0.12)" }}
          >
            {report.highlights.mainAchievements && (
              <HighlightBlock color={ACCENT_GREEN} label="Main Achievements" text={report.highlights.mainAchievements} />
            )}
            {report.highlights.challenges && (
              <HighlightBlock color={ACCENT_AMBER} label="Challenges" text={report.highlights.challenges} />
            )}
            {report.highlights.newInitiatives && (
              <HighlightBlock color={ACCENT_CYAN} label="New Initiatives" text={report.highlights.newInitiatives} />
            )}
          </div>
        </>
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
  /** Each source-breakdown's total, folded in alongside the plain fields. */
  sourceTotals?: { label: string; value: number; unit?: string }[];
}) {
  const accent = ACCENT_HEX[team.accent];
  // Only unitless values are comparable counts and can share one pie; a
  // value with a unit (e.g. TB) isn't the same kind of quantity, so it's
  // shown as its own callout instead of a slice.
  const visibleFields = team.fields.filter((f) => !(f.hideWhenZero && (data[f.key] ?? 0) === 0));
  const pieFields = [
    ...visibleFields.filter((f) => !f.unit).map((f) => ({ label: f.label, value: data[f.key] ?? 0 })),
    ...sourceTotals.filter((s) => !s.unit),
  ];
  const calloutFields = [
    ...visibleFields.filter((f) => f.unit).map((f) => ({ label: f.label, value: data[f.key] ?? 0, unit: f.unit })),
    ...sourceTotals.filter((s) => s.unit),
  ];

  const colors = shadeSteps(accent, pieFields.length);

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
      {pieFields.length > 0 && <InteractivePie fields={pieFields} colors={colors} />}
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
    <main className="relative z-0 min-h-screen print:min-h-0 report-flat-page">
      {/* Decorative gradient layer, hidden for print (see globals.css for
          why overriding main's own background conditionally doesn't work
          reliably in the PDF export pipeline). print:hidden is a plain
          display:none toggle, which — unlike a conditional background
          override — is already proven reliable there. */}
      <div className="absolute inset-0 report-gradient-page print:hidden" style={{ zIndex: -1 }} />
      {banner}
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 pb-4 pt-10 sm:px-10 print:px-8 print:pb-3 print:pt-8">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl" style={{ color: TEXT_BRIGHT }}>
            Media Operations Report
          </h1>
          <p className="mt-1 text-base" style={{ color: TEXT_DIM }}>
            {monthRangeLabel(monthKey)}
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

      <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-10 print:max-w-none print:px-8 print:pb-6">
        <ExecutiveSummary report={report} />

        <div className="flex flex-col gap-6 print:gap-4">
          {TEAMS.map((team, idx) => {
            const teamData = report.teams[team.key] ?? {};
            const groups = team.groups ?? [];
            const groupedKeys = new Set(groups.flatMap((g) => g.detailFieldKeys));
            const plainFields = team.fields.filter(
              (f) => !groupedKeys.has(f.key) && !(f.hideWhenZero && (teamData[f.key] ?? 0) === 0)
            );
            const fieldLabel = (key: string) => team.fields.find((f) => f.key === key)?.label ?? key;
            const note = report.notes?.[team.key];
            const sourceBreakdowns = team.sourceBreakdowns ?? [];
            const sourceTotals = sourceBreakdowns.map((sb) => {
              const entries: SourceEntry[] = report.sourceBreakdowns?.[team.key]?.[sb.key] ?? [];
              return { label: sb.label, value: entries.reduce((s, e) => s + e.count, 0), unit: sb.unit };
            });
            let rowIndex = 0;

            return (
              <section
                key={team.key}
                className="rounded-2xl p-5 print:rounded-lg print:p-4 print:break-inside-avoid"
                style={{ background: PANEL, border: `1px solid ${PANEL_BORDER}` }}
              >
                <SectionHeading n={idx + 1} title={team.name} />
                <div className="mb-4">
                  <TeamPie team={team} data={teamData} sourceTotals={sourceTotals} />
                </div>
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
                          <GroupRow
                            key={group.key}
                            label={group.label}
                            total={total}
                            detail={detail}
                            altRow={alt}
                            unit={displayUnit(group.unit)}
                          />
                        );
                      })}
                      {sourceBreakdowns
                        .filter(
                          (sb) =>
                            team.key !== "mediaIngest" ||
                            !["catchUpContentFailed", "archiveContentFailed", "catchUpContentPassed", "archiveContentPassed"].includes(
                              sb.key
                            )
                        )
                        .map((sb) => {
                          const entries: SourceEntry[] = report.sourceBreakdowns?.[team.key]?.[sb.key] ?? [];
                          const total = entries.reduce((s, e) => s + e.count, 0);
                          const detail = entries.map((e) => ({ label: e.source || "(unnamed source)", value: e.count }));
                          const alt = rowIndex++ % 2 === 1;
                          return (
                            <GroupRow
                              key={sb.key}
                              label={sb.label}
                              total={total}
                              detail={detail}
                              altRow={alt}
                              unit={displayUnit(sb.unit)}
                              infoText={
                                sb.key === "badgesIngested"
                                  ? "Badges get burnt onto show and movie artwork using a tool operated by Media Ingest team."
                                  : undefined
                              }
                            />
                          );
                        })}
                      {plainFields
                        .filter((field) => team.key !== "mediaIngest" || field.key !== "qualityControlCompleted")
                        .map((field) => {
                          const alt = rowIndex++ % 2 === 1;
                          return (
                            <tr key={field.key} style={{ background: alt ? ROW_ALT : "transparent" }}>
                              <Td>
                                <strong style={{ color: TEXT_BRIGHT }}>{field.label}</strong>
                              </Td>
                              <Td>{formatFieldValue(teamData[field.key] ?? 0, displayUnit(field.unit))}</Td>
                            </tr>
                          );
                        })}
                      {team.key === "mediaIngest" &&
                        (() => {
                          const qcValue = teamData["qualityControlCompleted"] ?? 0;
                          const nestedRow = (key: string, label: string, alt: boolean) => {
                            const entries: SourceEntry[] = report.sourceBreakdowns?.["mediaIngest"]?.[key] ?? [];
                            return (
                              <GroupRow
                                key={key}
                                label={label}
                                total={entries.reduce((s, e) => s + e.count, 0)}
                                detail={entries.map((e) => ({ label: e.source || "(unnamed source)", value: e.count }))}
                                altRow={alt}
                                unit={displayUnit()}
                                indent
                              />
                            );
                          };
                          const altParent = rowIndex++ % 2 === 1;
                          const altChildren = [0, 1, 2, 3].map(() => rowIndex++ % 2 === 1);
                          return (
                            <GroupRow
                              key="qualityControlCompleted"
                              label={fieldLabel("qualityControlCompleted")}
                              total={qcValue}
                              detail={[]}
                              altRow={altParent}
                              unit=" H"
                              infoText="Quality control checks frame quality (black frames, freezes, drops, artifacts), audio (codec, sample rate, loudness) and color range/aspect ratio. Assets failing any check are rejected, not published."
                            >
                              {nestedRow("catchUpContentFailed", "Catch-up Content Failed", altChildren[0])}
                              {nestedRow("archiveContentFailed", "Archive Content Failed", altChildren[1])}
                              {nestedRow("catchUpContentPassed", "Catch-up Content Passed", altChildren[2])}
                              {nestedRow("archiveContentPassed", "Archive Content Passed", altChildren[3])}
                            </GroupRow>
                          );
                        })()}
                    </tbody>
                  </table>
                </div>
                {note && (
                  <p className="mt-3 text-sm italic" style={{ color: TEXT_DIM }}>
                    {note}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
