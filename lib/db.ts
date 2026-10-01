import { Pool } from "pg";
import { normalizeReport, type CustomActivity, type MonthlyReport } from "./report";

// Standard node-postgres pool — works against any Postgres instance
// (local, on-prem NAS, or a hosted provider), unlike @vercel/postgres
// which assumes a Vercel/Neon-managed database and forces SSL.
declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __schemaReady: Promise<void> | undefined;
}

/**
 * pg-connection-string emits a SECURITY WARNING whenever the connection
 * string has sslmode=require (common in Neon/managed Postgres URLs), since
 * a future major version changes what that mode means. We control SSL
 * explicitly via the `ssl` option below, so strip sslmode from the URL to
 * avoid the warning and any ambiguity about which setting wins.
 */
function stripSslMode(connectionString: string | undefined): string | undefined {
  if (!connectionString) return connectionString;
  try {
    const url = new URL(connectionString);
    url.searchParams.delete("sslmode");
    return url.toString();
  } catch {
    return connectionString;
  }
}

/**
 * Whether to require TLS for this connection. POSTGRES_SSL, if set,
 * always wins. Otherwise infer it from the host: a local/on-prem Postgres
 * (localhost, a NAS on the LAN) has no TLS listener, while every hosted
 * provider (Neon, RDS, etc.) requires it — so default to on for any
 * non-local host instead of relying on a flag that's easy to forget to set.
 */
function resolveSsl(connectionString: string | undefined): boolean {
  if (process.env.POSTGRES_SSL === "true") return true;
  if (process.env.POSTGRES_SSL === "false") return false;
  if (!connectionString) return false;
  try {
    const host = new URL(connectionString).hostname;
    return host !== "localhost" && host !== "127.0.0.1";
  } catch {
    return false;
  }
}

function getPool(): Pool {
  if (!global.__pgPool) {
    const raw = process.env.POSTGRES_URL;
    global.__pgPool = new Pool({
      connectionString: stripSslMode(raw),
      ssl: resolveSsl(raw) ? { rejectUnauthorized: false } : undefined,
    });
  }
  return global.__pgPool;
}

/** Idempotent — safe to call on every request; only does work once per process. */
export function ensureSchema(): Promise<void> {
  if (!global.__schemaReady) {
    global.__schemaReady = (async () => {
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
      // Append-only log of every save — monthly_reports only ever holds the current state, so
      // without this a concurrent or mistaken save silently and irrecoverably overwrites whatever
      // was there before. Never updated or deleted, only ever inserted into.
      await pool.query(`
        CREATE TABLE IF NOT EXISTS report_history (
          id SERIAL PRIMARY KEY,
          month TEXT NOT NULL,
          data JSONB NOT NULL,
          saved_by TEXT NOT NULL,
          saved_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS report_history_month_saved_at_idx ON report_history (month, saved_at DESC);
      `);
    })();
  }
  return global.__schemaReady!;
}

export async function getMonthlyReport(month: string): Promise<MonthlyReport | null> {
  await ensureSchema();
  const [{ rows }, customActivities] = await Promise.all([
    getPool().query<{ data: unknown }>(`SELECT data FROM monthly_reports WHERE month = $1;`, [month]),
    getCustomActivities(),
  ]);
  if (!rows[0]) return null;
  return normalizeReport(rows[0].data, customActivities);
}

/** Production Support Activities (Digital Archive & Production Support) can be extended by the
 * team at any time (e.g. "Production support meeting") — unlike everything else in a report, this
 * list isn't month-specific, so it lives in `settings` rather than in `monthly_reports`. */
export async function getCustomActivities(): Promise<CustomActivity[]> {
  await ensureSchema();
  const { rows } = await getPool().query<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'production_support_activities';`
  );
  if (!rows[0]) return [];
  try {
    const parsed = JSON.parse(rows[0].value);
    return Array.isArray(parsed)
      ? parsed.filter((e): e is CustomActivity => typeof e?.id === "string" && typeof e?.label === "string")
      : [];
  } catch {
    return [];
  }
}

export async function addCustomActivity(label: string): Promise<CustomActivity> {
  await ensureSchema();
  const activities = await getCustomActivities();
  const activity: CustomActivity = { id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, label };
  const next = [...activities, activity];
  await getPool().query(
    `
    INSERT INTO settings (key, value)
    VALUES ('production_support_activities', $1)
    ON CONFLICT (key) DO UPDATE SET value = $1;
    `,
    [JSON.stringify(next)]
  );
  return activity;
}

export async function upsertMonthlyReport(month: string, data: MonthlyReport, savedBy: string): Promise<void> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `
      INSERT INTO monthly_reports (month, data, updated_at)
      VALUES ($1, $2::jsonb, now())
      ON CONFLICT (month)
      DO UPDATE SET data = $2::jsonb, updated_at = now();
      `,
      [month, JSON.stringify(data)]
    );
    await client.query(
      `INSERT INTO report_history (month, data, saved_by) VALUES ($1, $2::jsonb, $3);`,
      [month, JSON.stringify(data), savedBy]
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export type ReportHistoryEntry = {
  id: number;
  savedBy: string;
  savedAt: Date;
};

export async function listReportHistory(month: string): Promise<ReportHistoryEntry[]> {
  await ensureSchema();
  const { rows } = await getPool().query<{ id: number; saved_by: string; saved_at: Date }>(
    `SELECT id, saved_by, saved_at FROM report_history WHERE month = $1 ORDER BY saved_at DESC;`,
    [month]
  );
  return rows.map((r) => ({ id: r.id, savedBy: r.saved_by, savedAt: r.saved_at }));
}

export async function getReportHistoryEntryData(id: number): Promise<MonthlyReport | null> {
  await ensureSchema();
  const { rows } = await getPool().query<{ data: unknown }>(`SELECT data FROM report_history WHERE id = $1;`, [id]);
  if (!rows[0]) return null;
  return normalizeReport(rows[0].data);
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

export async function getReminderRecipients(): Promise<string[]> {
  await ensureSchema();
  const { rows } = await getPool().query<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'reminder_recipients';`
  );
  if (!rows[0]) return [];
  try {
    const parsed = JSON.parse(rows[0].value);
    return Array.isArray(parsed) ? parsed.filter((e): e is string => typeof e === "string") : [];
  } catch {
    return [];
  }
}

export async function setReminderRecipients(emails: string[]): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `
    INSERT INTO settings (key, value)
    VALUES ('reminder_recipients', $1)
    ON CONFLICT (key) DO UPDATE SET value = $1;
    `,
    [JSON.stringify(emails)]
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
