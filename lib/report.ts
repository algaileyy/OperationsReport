import { TEAMS, type TeamData } from "./teams";

export type SourceEntry = {
  id: string;
  source: string;
  count: number;
};

/** teamKey -> breakdownKey -> entries */
export type SourceBreakdowns = Record<string, Record<string, SourceEntry[]>>;

export type MonthlyReport = {
  teams: Record<string, TeamData>;
  notes: Record<string, string>;
  sourceBreakdowns: SourceBreakdowns;
};

export function emptyReport(): MonthlyReport {
  const teams: Record<string, TeamData> = {};
  const notes: Record<string, string> = {};
  const sourceBreakdowns: SourceBreakdowns = {};
  for (const t of TEAMS) {
    teams[t.key] = {};
    notes[t.key] = "";
    sourceBreakdowns[t.key] = {};
    for (const sb of t.sourceBreakdowns ?? []) {
      sourceBreakdowns[t.key][sb.key] = [];
    }
  }
  return { teams, notes, sourceBreakdowns };
}

/** Coerce arbitrary JSON into a well-formed MonthlyReport, dropping anything malformed. */
export function normalizeReport(raw: unknown): MonthlyReport {
  const src = raw as {
    teams?: Record<string, Record<string, unknown>>;
    notes?: Record<string, unknown>;
    sourceBreakdowns?: Record<string, Record<string, unknown>>;
  } | null;
  const teamsSrc = src?.teams ?? {};
  const notesSrc = src?.notes ?? {};
  const sbSrc = src?.sourceBreakdowns ?? {};

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
      sourceBreakdowns[team.key][sb.key] = entries;
    }
  }

  return { teams, notes, sourceBreakdowns };
}
