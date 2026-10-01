import { TEAMS, type SourceBreakdownConfig, type TeamData } from "./teams";

export type SourceEntry = {
  id: string;
  source: string;
  count: number;
  /** Only meaningful when the breakdown has unitOptions (e.g. Media Ingest's Content Size) —
   * which unit this particular entry's count is in, so entries can mix TB and GB. */
  unit?: string;
};

/** How many of the breakdown's canonical unit (unitOptions[0]) one of this unit equals — only
 * TB/GB pairs exist today, so this is the only conversion needed. */
const UNIT_CONVERSION: Record<string, number> = { TB: 1, GB: 0.001 };

/** Sums a breakdown's entries into its canonical unit (unitOptions[0]), converting any entry
 * that used a different unit (e.g. a GB entry folded into a TB total) — a plain sum for a
 * breakdown without unitOptions, since every entry then shares the same fixed (or absent) unit. */
export function sumSourceEntries(entries: SourceEntry[], sb: SourceBreakdownConfig): number {
  if (!sb.unitOptions) return entries.reduce((s, e) => s + e.count, 0);
  const canonical = sb.unitOptions[0];
  const canonicalFactor = UNIT_CONVERSION[canonical] ?? 1;
  return entries.reduce((s, e) => {
    const unit = e.unit && sb.unitOptions!.includes(e.unit) ? e.unit : canonical;
    const factor = (UNIT_CONVERSION[unit] ?? 1) / canonicalFactor;
    return s + e.count * factor;
  }, 0);
}

/** teamKey -> breakdownKey -> entries */
export type SourceBreakdowns = Record<string, Record<string, SourceEntry[]>>;

/** A by-source activity the Digital Archive & Production Support team added on the fly (e.g.
 * "Production support meeting"), on top of the fixed Re-versioning/Editing/Upscaling ones —
 * stored separately (lib/db.ts) since, unlike everything else here, it isn't month-specific: once
 * added it's available in every month going forward, the same way a fixed field would be. */
export type CustomActivity = { id: string; label: string };

/** The only team custom activities can be added to today — Production Support Activities is the
 * one open-ended "by source" segment teams asked to extend themselves. */
export const CUSTOM_ACTIVITY_TEAM_KEY = "archivingSupport";

/** Report-wide narrative context, shown at the top of the report alongside the Executive Summary. */
export type ReportHighlights = {
  mainAchievements: string;
  challenges: string;
  newInitiatives: string;
};

export type MonthlyReport = {
  teams: Record<string, TeamData>;
  notes: Record<string, string>;
  sourceBreakdowns: SourceBreakdowns;
  highlights: ReportHighlights;
  /** Report-wide note not tied to any one team — shown first in the Executive Summary's Notes list. */
  generalNotes: string;
  /** Replaces the "Total Tasks" glance card's usual auto-sum across every team when set — 0 means
   * unset (use the auto-calculated total), same "0 = nothing entered" convention every other
   * number field already uses. */
  totalTasksOverride: number;
  /** teamKey -> fieldKey -> which of that field's unitOptions is currently selected (e.g. "TB" vs
   * "GB" for Media Ingest's Storage Freed) — only meaningful for fields with unitOptions set. */
  fieldUnits: Record<string, Record<string, string>>;
  /** teamKey -> replaces that team's own pie card's "Total" center — its usual auto-sum of that
   * team's unitless slices — when set. 0 means unset (use the auto-calculated total), same
   * convention as totalTasksOverride above. */
  teamTotalOverrides: Record<string, number>;
};

/** Certain breakdowns start with specific sources pre-listed (rather than left for someone to type
 * from scratch) so the naming stays exactly consistent across months. Keyed by breakdown key alone
 * since those are unique across the whole schema. */
const STARTER_SOURCES: Record<string, string[]> = {
  artworkAndBadgesIngested: ["Show Artwork", "Movie Artwork", "Show Badges", "Movie Badges"],
  archiveInProgress: ["AJ360", "Atheer", "Doha Debates", "Syria Now", "Sadeem"],
};

/** Appends whichever starter sources aren't already present (by name, case-insensitive) — applied
 * on every read/save, not just to a brand-new month, so a month whose data existed before a starter
 * source was introduced still picks it up instead of it only ever showing up for future months. */
function withStarterSources(entries: SourceEntry[], breakdownKey: string): SourceEntry[] {
  const starters = STARTER_SOURCES[breakdownKey];
  if (!starters) return entries;
  const existing = new Set(entries.map((e) => e.source.trim().toLowerCase()));
  const missing = starters.filter((s) => !existing.has(s.toLowerCase()));
  const seeded = missing.map((source, i) => ({ id: `${breakdownKey}-seed-${entries.length + i}`, source, count: 0 }));
  return [...entries, ...seeded];
}

export function emptyReport(customActivities: CustomActivity[] = []): MonthlyReport {
  const teams: Record<string, TeamData> = {};
  const notes: Record<string, string> = {};
  const sourceBreakdowns: SourceBreakdowns = {};
  const fieldUnits: Record<string, Record<string, string>> = {};
  const teamTotalOverrides: Record<string, number> = {};
  for (const t of TEAMS) {
    teams[t.key] = {};
    notes[t.key] = "";
    sourceBreakdowns[t.key] = {};
    for (const sb of t.sourceBreakdowns ?? []) {
      sourceBreakdowns[t.key][sb.key] = withStarterSources([], sb.key);
    }
    if (t.key === CUSTOM_ACTIVITY_TEAM_KEY) {
      for (const activity of customActivities) {
        sourceBreakdowns[t.key][activity.id] = [];
      }
    }
    fieldUnits[t.key] = {};
    for (const f of t.fields) {
      if (f.unitOptions) fieldUnits[t.key][f.key] = f.unitOptions[0];
    }
    teamTotalOverrides[t.key] = 0;
  }
  return {
    teams,
    notes,
    sourceBreakdowns,
    highlights: { mainAchievements: "", challenges: "", newInitiatives: "" },
    generalNotes: "",
    totalTasksOverride: 0,
    fieldUnits,
    teamTotalOverrides,
  };
}

function normalizeSourceEntries(raw: unknown, idPrefix: string, unitOptions?: string[]): SourceEntry[] {
  return Array.isArray(raw)
    ? raw.map((e, i) => {
        const entry = e as Partial<SourceEntry> | null;
        const count = Number(entry?.count);
        return {
          id: typeof entry?.id === "string" ? entry.id : `${idPrefix}-${i}`,
          source: typeof entry?.source === "string" ? entry.source : "",
          count: Number.isFinite(count) && count >= 0 ? count : 0,
          unit:
            unitOptions && typeof entry?.unit === "string" && unitOptions.includes(entry.unit)
              ? entry.unit
              : unitOptions?.[0],
        };
      })
    : [];
}

/** Coerce arbitrary JSON into a well-formed MonthlyReport, dropping anything malformed. */
export function normalizeReport(raw: unknown, customActivities: CustomActivity[] = []): MonthlyReport {
  const src = raw as {
    teams?: Record<string, Record<string, unknown>>;
    notes?: Record<string, unknown>;
    sourceBreakdowns?: Record<string, Record<string, unknown>>;
    highlights?: Record<string, unknown>;
    generalNotes?: unknown;
    totalTasksOverride?: unknown;
    fieldUnits?: Record<string, Record<string, unknown>>;
    teamTotalOverrides?: Record<string, unknown>;
  } | null;
  const teamsSrc = src?.teams ?? {};
  const notesSrc = src?.notes ?? {};
  const sbSrc = src?.sourceBreakdowns ?? {};
  const highlightsSrc = src?.highlights ?? {};
  const fieldUnitsSrc = src?.fieldUnits ?? {};
  const teamTotalOverridesSrc = src?.teamTotalOverrides ?? {};

  const teams: Record<string, TeamData> = {};
  const notes: Record<string, string> = {};
  const sourceBreakdowns: SourceBreakdowns = {};
  const fieldUnits: Record<string, Record<string, string>> = {};
  const teamTotalOverrides: Record<string, number> = {};

  for (const team of TEAMS) {
    const teamSrc = teamsSrc[team.key] ?? {};
    const clean: TeamData = {};
    for (const field of team.fields) {
      const n = Number(teamSrc[field.key]);
      clean[field.key] = Number.isFinite(n) && n >= 0 ? n : 0;
    }
    teams[team.key] = clean;

    const note = notesSrc[team.key];
    notes[team.key] = typeof note === "string" ? note : "";

    fieldUnits[team.key] = {};
    for (const field of team.fields) {
      if (!field.unitOptions) continue;
      const raw = fieldUnitsSrc[team.key]?.[field.key];
      fieldUnits[team.key][field.key] =
        typeof raw === "string" && field.unitOptions.includes(raw) ? raw : field.unitOptions[0];
    }

    const overrideN = Number(teamTotalOverridesSrc[team.key]);
    teamTotalOverrides[team.key] = Number.isFinite(overrideN) && overrideN >= 0 ? overrideN : 0;

    sourceBreakdowns[team.key] = {};
    for (const sb of team.sourceBreakdowns ?? []) {
      const entries = normalizeSourceEntries(sbSrc[team.key]?.[sb.key], sb.key, sb.unitOptions);
      sourceBreakdowns[team.key][sb.key] = withStarterSources(entries, sb.key);
    }
    if (team.key === CUSTOM_ACTIVITY_TEAM_KEY) {
      for (const activity of customActivities) {
        sourceBreakdowns[team.key][activity.id] = normalizeSourceEntries(sbSrc[team.key]?.[activity.id], activity.id);
      }
    }
  }

  const highlights: ReportHighlights = {
    mainAchievements: typeof highlightsSrc.mainAchievements === "string" ? highlightsSrc.mainAchievements : "",
    challenges: typeof highlightsSrc.challenges === "string" ? highlightsSrc.challenges : "",
    newInitiatives: typeof highlightsSrc.newInitiatives === "string" ? highlightsSrc.newInitiatives : "",
  };

  const totalTasksOverrideN = Number(src?.totalTasksOverride);

  return {
    teams,
    notes,
    sourceBreakdowns,
    highlights,
    generalNotes: typeof src?.generalNotes === "string" ? src.generalNotes : "",
    totalTasksOverride: Number.isFinite(totalTasksOverrideN) && totalTasksOverrideN >= 0 ? totalTasksOverrideN : 0,
    fieldUnits,
    teamTotalOverrides,
  };
}
