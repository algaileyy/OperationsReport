import { TEAMS, type TeamData } from "./teams";

export type MonthlyReport = {
  teams: Record<string, TeamData>;
};

export function emptyReport(): MonthlyReport {
  const teams: Record<string, TeamData> = {};
  for (const t of TEAMS) teams[t.key] = {};
  return { teams };
}

/** Coerce arbitrary JSON into a well-formed MonthlyReport, dropping anything malformed. */
export function normalizeReport(raw: unknown): MonthlyReport {
  const src = (raw as { teams?: Record<string, Record<string, unknown>> } | null)?.teams ?? {};
  const teams: Record<string, TeamData> = {};

  for (const team of TEAMS) {
    const teamSrc = src[team.key] ?? {};
    const clean: TeamData = {};
    for (const field of team.fields) {
      const n = Number(teamSrc[field.key]);
      clean[field.key] = Number.isFinite(n) && n >= 0 ? n : 0;
    }
    teams[team.key] = clean;
  }

  return { teams };
}
