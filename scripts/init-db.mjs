// Convenience script to create tables ahead of time. Not required — the app
// creates them automatically on first request — but useful right after
// connecting a fresh Postgres database.
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.POSTGRES_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

async function main() {
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
  console.log("Schema ready.");
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    return pool.end().finally(() => process.exit(1));
  });
