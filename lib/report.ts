import { TEAMS, type TeamData } from "./teams";

export type MonthlyReport = {
  teams: Record<string, TeamData>;
  notes: Record<string, string>;
};

export function emptyReport(): MonthlyReport {
  const teams: Record<string, TeamData> = {};
  const notes: Record<string, string> = {};
  for (const t of TEAMS) {
    teams[t.key] = {};
    notes[t.key] = "";
  }
  return { teams, notes };
}

/** Coerce arbitrary JSON into a well-formed MonthlyReport, dropping anything malformed. */
export function normalizeReport(raw: unknown): MonthlyReport {
  const src = raw as { teams?: Record<string, Record<string, unknown>>; notes?: Record<string, unknown> } | null;
  const teamsSrc = src?.teams ?? {};
  const notesSrc = src?.notes ?? {};

  const teams: Record<string, TeamData> = {};
  const notes: Record<string, string> = {};

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
  }

  return { teams, notes };
}
