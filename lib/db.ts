import { Pool } from "pg";
import { normalizeReport, type MonthlyReport } from "./report";

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
        CREATE TABLE IF NOT EXISTS monthly_reports (
          month TEXT PRIMARY KEY,
          data JSONB NOT NULL DEFAULT '{}'::jsonb,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
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

export async function getMonthlyReport(month: string): Promise<MonthlyReport | null> {
  await ensureSchema();
  const { rows } = await getPool().query<{ data: unknown }>(
    `SELECT data FROM monthly_reports WHERE month = $1;`,
    [month]
  );
  if (!rows[0]) return null;
  return normalizeReport(rows[0].data);
}

export async function upsertMonthlyReport(month: string, data: MonthlyReport): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `
    INSERT INTO monthly_reports (month, data, updated_at)
    VALUES ($1, $2::jsonb, now())
    ON CONFLICT (month)
    DO UPDATE SET data = $2::jsonb, updated_at = now();
    `,
    [month, JSON.stringify(data)]
  );
}

export async function listMonthsWithData(): Promise<string[]> {
  await ensureSchema();
  const { rows } = await getPool().query<{ month: string }>(
    `SELECT month FROM monthly_reports ORDER BY month DESC;`
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
    `SELECT updated_at FROM monthly_reports WHERE month = $1;`,
    [month]
  );
  return rows[0]?.updated_at ?? null;
}
