import { monthRangeLabel } from "@/lib/months";
import { formatFieldValue } from "@/lib/format";
import { TEAMS, getTeam, type FieldConfig, type TeamConfig, type TeamData } from "@/lib/teams";
import type { MonthlyReport, SourceEntry } from "@/lib/report";
import GroupRow, { InfoIcon } from "./GroupRow";
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

/** A field's unit is either fixed (`unit`) or picked per-month via a dropdown on /input
 * (`unitOptions`, e.g. Media Ingest's Storage Freed choosing TB vs GB) — this resolves whichever
 * applies, falling back to the first option so a field is never left without a unit. Returns
 * undefined only for a genuinely unitless field (a comparable count, eligible for a pie slice). */
function effectiveFieldUnit(field: FieldConfig, teamFieldUnits: Record<string, string> | undefined): string | undefined {
  if (field.unit) return field.unit;
  if (field.unitOptions) return teamFieldUnits?.[field.key] ?? field.unitOptions[0];
  return undefined;
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

/** Grand total of every unitless count across all teams — plain fields plus unitless source-breakdown
 * totals — unless a manual override was entered on /input, which takes over entirely. */
function totalTasksAcrossTeams(report: MonthlyReport): number {
  if (report.totalTasksOverride) return report.totalTasksOverride;
  let total = 0;
  for (const team of TEAMS) {
    const data = report.teams[team.key] ?? {};
    for (const f of team.fields) {
      if (!effectiveFieldUnit(f, report.fieldUnits?.[team.key])) total += data[f.key] ?? 0;
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
  infoText,
}: {
  label: string;
  value: number;
  unit?: string;
  caption: string;
  infoText?: string;
}) {
  return (
    <div className="rounded-lg border-t-2 p-4" style={{ background: "rgba(0,0,0,0.15)", borderColor: ACCENT_CYAN }}>
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold" style={{ color: ACCENT_CYAN }}>
        {label}
        {infoText && <InfoIcon text={infoText} />}
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
        <GlanceCard
          label="Total Tasks"
          value={totalTasksAcrossTeams(report)}
          caption="Across all teams this month"
          infoText="Sum of every plain-number count entered across all three teams — excludes TB and hours, since those aren't the same kind of quantity as a task count."
        />
        <GlanceCard
          label="Archived Total"
          value={totalArchived(report)}
          unit="TB"
          caption="Digital Archive & Production Support"
          infoText="Completed production media — masters, assets, episodes, and project files — validated and moved into long-term storage (primarily DIVA) once a project wraps."
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
  fieldUnits,
  totalOverride,
}: {
  team: TeamConfig;
  data: TeamData;
  /** Each source-breakdown's total, folded in alongside the plain fields. */
  sourceTotals?: { label: string; value: number; unit?: string; highlight?: boolean }[];
  /** This team's fieldKey -> chosen unit, for fields with unitOptions (e.g. TB vs GB). */
  fieldUnits?: Record<string, string>;
  /** Overrides the donut's default "Total" center (this team's own auto-summed unitless slices)
   * with a manually entered number, when set. */
  totalOverride?: number;
}) {
  const accent = ACCENT_HEX[team.accent];
  // Only unitless values are comparable counts and can share one pie; a
  // value with a unit (e.g. TB) isn't the same kind of quantity, so it's
  // shown as its own callout instead of a slice. Anything at 0 is dropped
  // entirely, same as everywhere else in the report.
  const nonZeroTotals = sourceTotals.filter((s) => s.value !== 0);
  const pieFields = [
    ...team.fields
      .filter((f) => !effectiveFieldUnit(f, fieldUnits) && (data[f.key] ?? 0) !== 0)
      .map((f) => ({ label: f.label, value: data[f.key] ?? 0 })),
    ...nonZeroTotals.filter((s) => !s.unit),
  ];
  // `highlight`-flagged callouts (Array.sort is stable, so this only promotes them ahead of the
  // rest without disturbing relative order otherwise) surface first — the figures worth calling
  // out at a glance shouldn't depend on where their field happens to sit in the config.
  const calloutFields = [
    ...team.fields
      .filter((f) => effectiveFieldUnit(f, fieldUnits) && (data[f.key] ?? 0) !== 0)
      .map((f) => ({ label: f.label, value: data[f.key] ?? 0, unit: effectiveFieldUnit(f, fieldUnits), highlight: f.highlight })),
    ...nonZeroTotals.filter((s) => s.unit),
  ].sort((a, b) => (b.highlight ? 1 : 0) - (a.highlight ? 1 : 0));

  const colors = shadeSteps(accent, pieFields.length);

  return (
    <div className="rounded-xl bg-white p-5 shadow-xl print:break-inside-avoid print:rounded-lg print:p-3 print:shadow-none">
      <div className="mb-3 print:mb-2">
        <p className="text-sm font-bold" style={{ color: accent }}>
          {team.name}
        </p>
      </div>
      {(pieFields.length > 0 || calloutFields.length > 0 || !!totalOverride) && (
        <InteractivePie
          fields={pieFields}
          colors={colors}
          calloutFields={calloutFields}
          accentColor={accent}
          totalOverride={totalOverride}
        />
      )}
    </div>
  );
}

/** A row that may itself contain nested rows (Media Ingest's QC Hours, Digital Archive's QC
 * Completed / Production Support Activities) — built once as plain data, then pruned and rendered
 * generically so the "hide anything at 0" and "no arrow with nothing to expand" rules only need to
 * be implemented in one place instead of at every nesting site. */
type TreeNode = {
  key: string;
  label: string;
  total: number;
  unit?: string;
  infoText?: string;
  detail?: { label: string; value: number }[];
  children?: TreeNode[];
};

/** Drops zero-valued detail entries and nodes, keeping a parent only if its own total is non-zero
 * or it still has surviving children (a parent's total isn't always the sum of its children — Media
 * Ingest's QC Hours total is its own entered value, independent of the Failed/Passed counts nested
 * under it). */
function pruneZero(nodes: TreeNode[]): TreeNode[] {
  return nodes
    .map((n) => ({
      ...n,
      detail: n.detail?.filter((d) => d.value !== 0),
      children: n.children ? pruneZero(n.children) : undefined,
    }))
    .filter((n) => n.total !== 0 || (n.children?.length ?? 0) > 0);
}

function RowTree({ nodes, level, seed }: { nodes: TreeNode[]; level: number; seed: { i: number } }) {
  return (
    <>
      {nodes.map((n) => {
        const alt = seed.i++ % 2 === 1;
        const hasChildren = (n.children?.length ?? 0) > 0;
        return (
          <GroupRow
            key={n.key}
            label={n.label}
            total={n.total}
            detail={n.detail ?? []}
            altRow={alt}
            unit={n.unit ?? displayUnit()}
            level={level}
            infoText={n.infoText}
            hasChildren={hasChildren}
          >
            {hasChildren && <RowTree nodes={n.children!} level={level + 1} seed={seed} />}
          </GroupRow>
        );
      })}
    </>
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
            // A field with a segmentSlot is rendered inline within a team-specific custom tree
            // below (e.g. archivingSupport's Textless/Cleans QC), not as a generic flat row.
            const plainFields = team.fields.filter(
              (f) => !groupedKeys.has(f.key) && !f.segmentSlot && (teamData[f.key] ?? 0) !== 0
            );
            const fieldLabel = (key: string) => team.fields.find((f) => f.key === key)?.label ?? key;
            const note = report.notes?.[team.key];
            const sourceBreakdowns = team.sourceBreakdowns ?? [];
            const sourceTotals = sourceBreakdowns.map((sb) => {
              const entries: SourceEntry[] = report.sourceBreakdowns?.[team.key]?.[sb.key] ?? [];
              return { label: sb.label, value: entries.reduce((s, e) => s + e.count, 0), unit: sb.unit, highlight: sb.highlight };
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
                  <TeamPie
                    team={team}
                    data={teamData}
                    sourceTotals={sourceTotals}
                    fieldUnits={report.fieldUnits?.[team.key]}
                    totalOverride={report.teamTotalOverrides?.[team.key]}
                  />
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
                        if (total === 0) return null;
                        const detail = group.detailFieldKeys
                          .map((k) => ({ label: fieldLabel(k), value: teamData[k] ?? 0 }))
                          .filter((d) => d.value !== 0);
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
                        .filter((sb) => {
                          if (team.key === "mediaIngest") {
                            return !["catchUpContentFailed", "archiveContentFailed", "catchUpContentPassed", "archiveContentPassed"].includes(
                              sb.key
                            );
                          }
                          if (team.key === "archivingSupport") {
                            return ![
                              "textlessCleansPassedQC",
                              "textlessCleansFailedQC",
                              "rushesReceived",
                              "rushesPassedQC",
                              "rushesFailedQC",
                              "projectFilesPassed",
                              "projectFilesReceived",
                              "revisioningBySource",
                              "editingBySource",
                              "upscalingBySource",
                            ].includes(sb.key);
                          }
                          return true;
                        })
                        .map((sb) => {
                          const entries: SourceEntry[] = report.sourceBreakdowns?.[team.key]?.[sb.key] ?? [];
                          const total = entries.reduce((s, e) => s + e.count, 0);
                          if (total === 0) return null;
                          const detail = entries
                            .filter((e) => e.count !== 0)
                            .map((e) => ({ label: e.source || "(unnamed source)", value: e.count }));
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
                                sb.key === "artworkAndBadgesIngested"
                                  ? "Badges get burnt onto show and movie artwork using a tool operated by Media Ingest team."
                                  : sb.key === "archived"
                                    ? "The archive process is the workflow for preparing, validating, and permanently storing production media (masters, assets, episodes, and project files) into long-term archive storage — primarily the DIVA system — while freeing up space on active servers."
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
                              <Td>
                                {formatFieldValue(
                                  teamData[field.key] ?? 0,
                                  displayUnit(effectiveFieldUnit(field, report.fieldUnits?.[team.key]))
                                )}
                              </Td>
                            </tr>
                          );
                        })}
                      {team.key === "mediaIngest" &&
                        (() => {
                          const bySource = (key: string) => {
                            const entries: SourceEntry[] = report.sourceBreakdowns?.["mediaIngest"]?.[key] ?? [];
                            return {
                              total: entries.reduce((s, e) => s + e.count, 0),
                              detail: entries.map((e) => ({ label: e.source || "(unnamed source)", value: e.count })),
                            };
                          };
                          const nodes = pruneZero([
                            {
                              key: "qualityControlCompleted",
                              label: fieldLabel("qualityControlCompleted"),
                              total: teamData["qualityControlCompleted"] ?? 0,
                              unit: " H",
                              infoText:
                                "Quality control checks frame quality (black frames, freezes, drops, artifacts), audio (codec, sample rate, loudness) and color range/aspect ratio. Assets failing any check are rejected, not published.",
                              children: [
                                { key: "catchUpContentFailed", label: "Catch-up Content Failed", ...bySource("catchUpContentFailed") },
                                { key: "archiveContentFailed", label: "Archive Content Failed", ...bySource("archiveContentFailed") },
                                { key: "catchUpContentPassed", label: "Catch-up Content Passed", ...bySource("catchUpContentPassed") },
                                { key: "archiveContentPassed", label: "Archive Content Passed", ...bySource("archiveContentPassed") },
                              ],
                            },
                          ]);
                          const seed = { i: rowIndex };
                          const rendered = <RowTree nodes={nodes} level={0} seed={seed} />;
                          rowIndex = seed.i;
                          return rendered;
                        })()}
                      {team.key === "archivingSupport" &&
                        (() => {
                          const bySource = (key: string) => {
                            const entries: SourceEntry[] = report.sourceBreakdowns?.["archivingSupport"]?.[key] ?? [];
                            return {
                              total: entries.reduce((s, e) => s + e.count, 0),
                              detail: entries.map((e) => ({ label: e.source || "(unnamed source)", value: e.count })),
                            };
                          };
                          const passedQC = bySource("textlessCleansPassedQC");
                          const failedQC = bySource("textlessCleansFailedQC");
                          const rushesReceived = bySource("rushesReceived");
                          const rushesPassedQC = bySource("rushesPassedQC");
                          const rushesFailedQC = bySource("rushesFailedQC");
                          const filesPassed = bySource("projectFilesPassed");
                          const filesReceived = bySource("projectFilesReceived");
                          const revisioning = bySource("revisioningBySource");
                          const editing = bySource("editingBySource");
                          const upscaling = bySource("upscalingBySource");
                          // Textless/Cleans QC's headline number is what was received this month —
                          // its own entered value, independent of the Passed/Failed/In Progress counts
                          // nested under it — same pattern as Media Ingest's QC Hours total above.
                          const textlessReceived = teamData["textlessCleansReceived"] ?? 0;
                          const textlessInProgress = teamData["textlessCleansInProgress"] ?? 0;
                          const textlessSize = teamData["textlessCleansSize"] ?? 0;
                          const textlessHours = teamData["textlessCleansHours"] ?? 0;
                          const textlessTotal = textlessReceived;
                          const rushesTotal = rushesReceived.total + rushesPassedQC.total + rushesFailedQC.total;
                          const projectFilesTotal = filesPassed.total + filesReceived.total;
                          const productionSupportTotal = revisioning.total + editing.total + upscaling.total;

                          const nodes = pruneZero([
                            {
                              key: "qualityControlCompleted",
                              label: "Quality Control Completed",
                              total: textlessTotal + rushesTotal + projectFilesTotal,
                              children: [
                                {
                                  key: "textlessCleans",
                                  label: "Textless/Cleans QC",
                                  total: textlessTotal,
                                  children: [
                                    { key: "passedQC", label: "Passed QC", ...passedQC },
                                    { key: "failedQC", label: "Failed QC", ...failedQC },
                                    { key: "qcInProgress", label: "QC in Progress", total: textlessInProgress, detail: [] },
                                    { key: "textlessSize", label: "Size", total: textlessSize, unit: "GB", detail: [] },
                                    { key: "textlessHours", label: "Hours of QC", total: textlessHours, unit: "H", detail: [] },
                                  ],
                                },
                                {
                                  key: "rushes",
                                  label: "Rushes",
                                  total: rushesTotal,
                                  children: [
                                    { key: "rushesReceived", label: "Received", ...rushesReceived },
                                    { key: "rushesPassedQC", label: "Passed QC", ...rushesPassedQC },
                                    { key: "rushesFailedQC", label: "Failed QC", ...rushesFailedQC },
                                  ],
                                },
                                {
                                  key: "projectFiles",
                                  label: "Project files",
                                  total: projectFilesTotal,
                                  children: [
                                    { key: "filesPassed", label: "Passed", ...filesPassed },
                                    { key: "filesReceived", label: "Received", ...filesReceived },
                                  ],
                                },
                              ],
                            },
                            {
                              key: "productionSupportActivities",
                              label: "Production Support Activities",
                              total: productionSupportTotal,
                              children: [
                                { key: "revisioningBySource", label: "Re-versioning", ...revisioning },
                                { key: "editingBySource", label: "Editing", ...editing },
                                {
                                  key: "upscalingBySource",
                                  label: "Upscaling",
                                  ...upscaling,
                                  infoText:
                                    "Upscaling is a restoration workflow where old or lower-resolution archival footage is enhanced to a higher resolution for reuse in new productions.",
                                },
                              ],
                            },
                          ]);
                          const seed = { i: rowIndex };
                          const rendered = <RowTree nodes={nodes} level={0} seed={seed} />;
                          rowIndex = seed.i;
                          return rendered;
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
