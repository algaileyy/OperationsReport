import { sql } from "@vercel/postgres";
import type { TeamData } from "./teams";

let schemaReady: Promise<void> | null = null;

/** Idempotent — safe to call on every request; only does work once per cold start. */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS reports (
          id SERIAL PRIMARY KEY,
          team_key TEXT NOT NULL,
          month TEXT NOT NULL,
          data JSONB NOT NULL DEFAULT '{}'::jsonb,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (team_key, month)
        );
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `;
    })();
  }
  return schemaReady;
}

export async function getReportData(teamKey: string, month: string): Promise<TeamData> {
  await ensureSchema();
  const { rows } = await sql<{ data: TeamData }>`
    SELECT data FROM reports WHERE team_key = ${teamKey} AND month = ${month};
  `;
  return rows[0]?.data ?? {};
}

export async function getAllReportData(month: string): Promise<Record<string, TeamData>> {
  await ensureSchema();
  const { rows } = await sql<{ team_key: string; data: TeamData }>`
    SELECT team_key, data FROM reports WHERE month = ${month};
  `;
  const out: Record<string, TeamData> = {};
  for (const row of rows) out[row.team_key] = row.data;
  return out;
}

export async function upsertReportData(
  teamKey: string,
  month: string,
  data: TeamData
): Promise<void> {
  await ensureSchema();
  await sql`
    INSERT INTO reports (team_key, month, data, updated_at)
    VALUES (${teamKey}, ${month}, ${JSON.stringify(data)}::jsonb, now())
    ON CONFLICT (team_key, month)
    DO UPDATE SET data = ${JSON.stringify(data)}::jsonb, updated_at = now();
  `;
}

export async function listMonthsWithData(): Promise<string[]> {
  await ensureSchema();
  const { rows } = await sql<{ month: string }>`
    SELECT DISTINCT month FROM reports ORDER BY month DESC;
  `;
  return rows.map((r) => r.month);
}

export async function getPublishedMonth(): Promise<string | null> {
  await ensureSchema();
  const { rows } = await sql<{ value: string }>`
    SELECT value FROM settings WHERE key = 'published_month';
  `;
  return rows[0]?.value ?? null;
}

export async function setPublishedMonth(month: string): Promise<void> {
  await ensureSchema();
  await sql`
    INSERT INTO settings (key, value)
    VALUES ('published_month', ${month})
    ON CONFLICT (key) DO UPDATE SET value = ${month};
  `;
}

export async function getReportUpdatedAt(month: string): Promise<Date | null> {
  await ensureSchema();
  const { rows } = await sql<{ updated_at: Date }>`
    SELECT MAX(updated_at) AS updated_at FROM reports WHERE month = ${month};
  `;
  return rows[0]?.updated_at ?? null;
}
