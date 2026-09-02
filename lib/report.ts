import { TEAMS, type TeamData } from "./teams";

export type SourceEntry = {
  id: string;
  source: string;
  count: number;
};

/** teamKey -> breakdownKey -> entries */
export type SourceBreakdowns = Record<string, Record<string, SourceEntry[]>>;

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
};

/** The Artwork breakdown starts with these two sources pre-listed (rather than left for someone to
 * type from scratch) so the naming stays exactly consistent across months. */
const ARTWORK_STARTER_SOURCES = ["Artwork", "Badging"];

/** Appends whichever starter sources aren't already present (by name, case-insensitive) — applied
 * on every read/save, not just to a brand-new month, so a month whose data existed before a starter
 * source was introduced still picks it up instead of it only ever showing up for future months. */
function withStarterSources(entries: SourceEntry[], breakdownKey: string): SourceEntry[] {
  const existing = new Set(entries.map((e) => e.source.trim().toLowerCase()));
  const missing = ARTWORK_STARTER_SOURCES.filter((s) => !existing.has(s.toLowerCase()));
  const seeded = missing.map((source, i) => ({ id: `${breakdownKey}-seed-${entries.length + i}`, source, count: 0 }));
  return [...entries, ...seeded];
}

export function emptyReport(): MonthlyReport {
  const teams: Record<string, TeamData> = {};
  const notes: Record<string, string> = {};
  const sourceBreakdowns: SourceBreakdowns = {};
  for (const t of TEAMS) {
    teams[t.key] = {};
    notes[t.key] = "";
    sourceBreakdowns[t.key] = {};
    for (const sb of t.sourceBreakdowns ?? []) {
      sourceBreakdowns[t.key][sb.key] =
        t.key === "mediaIngest" && sb.key === "artwork" ? withStarterSources([], sb.key) : [];
    }
  }
  return {
    teams,
    notes,
    sourceBreakdowns,
    highlights: { mainAchievements: "", challenges: "", newInitiatives: "" },
    generalNotes: "",
  };
}

/** Coerce arbitrary JSON into a well-formed MonthlyReport, dropping anything malformed. */
export function normalizeReport(raw: unknown): MonthlyReport {
  const src = raw as {
    teams?: Record<string, Record<string, unknown>>;
    notes?: Record<string, unknown>;
    sourceBreakdowns?: Record<string, Record<string, unknown>>;
    highlights?: Record<string, unknown>;
    generalNotes?: unknown;
  } | null;
  const teamsSrc = src?.teams ?? {};
  const notesSrc = src?.notes ?? {};
  const sbSrc = src?.sourceBreakdowns ?? {};
  const highlightsSrc = src?.highlights ?? {};

  const teams: Record<string, TeamData> = {};
  const notes: Record<string, string> = {};
  const sourceBreakdowns: SourceBreakdowns = {};

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

    sourceBreakdowns[team.key] = {};
    for (const sb of team.sourceBreakdowns ?? []) {
      const rawEntries = sbSrc[team.key]?.[sb.key];
      const entries: SourceEntry[] = Array.isArray(rawEntries)
        ? rawEntries.map((e, i) => {
            const entry = e as Partial<SourceEntry> | null;
            const count = Number(entry?.count);
            return {
              id: typeof entry?.id === "string" ? entry.id : `${sb.key}-${i}`,
              source: typeof entry?.source === "string" ? entry.source : "",
              count: Number.isFinite(count) && count >= 0 ? count : 0,
            };
          })
        : [];
      sourceBreakdowns[team.key][sb.key] =
        team.key === "mediaIngest" && sb.key === "artwork" ? withStarterSources(entries, sb.key) : entries;
    }
  }

  const highlights: ReportHighlights = {
    mainAchievements: typeof highlightsSrc.mainAchievements === "string" ? highlightsSrc.mainAchievements : "",
    challenges: typeof highlightsSrc.challenges === "string" ? highlightsSrc.challenges : "",
    newInitiatives: typeof highlightsSrc.newInitiatives === "string" ? highlightsSrc.newInitiatives : "",
  };

  return {
    teams,
    notes,
    sourceBreakdowns,
    highlights,
    generalNotes: typeof src?.generalNotes === "string" ? src.generalNotes : "",
  };
}
