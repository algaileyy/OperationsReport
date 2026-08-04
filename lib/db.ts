import { Pool } from "pg";
import type { TeamData } from "./teams";

// Standard node-postgres pool — works against any Postgres instance
// (local, on-prem NAS, or a hosted provider), unlike @vercel/postgres
// which assumes a Vercel/Neon-managed database and forces SSL.
declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function getPool(): Pool {
  if (!global.__pgPool) {
    global.__pgPool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      ssl:
        process.env.POSTGRES_SSL === "true"
          ? { rejectUnauthorized: false }
          : undefined,
    });
  }
  return global.__pgPool;
}

let schemaReady: Promise<void> | null = null;

/** Idempotent — safe to call on every request; only does work once per cold start. */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const pool = getPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS reports (
          id SERIAL PRIMARY KEY,
          team_key TEXT NOT NULL,
          month TEXT NOT NULL,
          data JSONB NOT NULL DEFAULT '{}'::jsonb,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (team_key, month)
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
    })();
  }
  return schemaReady;
}

export async function getReportData(teamKey: string, month: string): Promise<TeamData> {
  await ensureSchema();
  const { rows } = await getPool().query<{ data: TeamData }>(
    `SELECT data FROM reports WHERE team_key = $1 AND month = $2;`,
    [teamKey, month]
  );
  return rows[0]?.data ?? {};
}

export async function getAllReportData(month: string): Promise<Record<string, TeamData>> {
  await ensureSchema();
  const { rows } = await getPool().query<{ team_key: string; data: TeamData }>(
    `SELECT team_key, data FROM reports WHERE month = $1;`,
    [month]
  );
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
  await getPool().query(
    `
    INSERT INTO reports (team_key, month, data, updated_at)
    VALUES ($1, $2, $3::jsonb, now())
    ON CONFLICT (team_key, month)
    DO UPDATE SET data = $3::jsonb, updated_at = now();
    `,
    [teamKey, month, JSON.stringify(data)]
  );
}

export async function listMonthsWithData(): Promise<string[]> {
  await ensureSchema();
  const { rows } = await getPool().query<{ month: string }>(
    `SELECT DISTINCT month FROM reports ORDER BY month DESC;`
  );
  return rows.map((r) => r.month);
}

export async function getPublishedMonth(): Promise<string | null> {
  await ensureSchema();
  const { rows } = await getPool().query<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'published_month';`
  );
  return rows[0]?.value ?? null;
}

export async function setPublishedMonth(month: string): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `
    INSERT INTO settings (key, value)
    VALUES ('published_month', $1)
    ON CONFLICT (key) DO UPDATE SET value = $1;
    `,
    [month]
  );
}

export async function getReportUpdatedAt(month: string): Promise<Date | null> {
  await ensureSchema();
  const { rows } = await getPool().query<{ updated_at: Date }>(
    `SELECT MAX(updated_at) AS updated_at FROM reports WHERE month = $1;`,
    [month]
  );
  return rows[0]?.updated_at ?? null;
}
