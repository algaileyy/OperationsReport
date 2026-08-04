// Convenience script to create tables ahead of time. Not required — the app
// creates them automatically on first request — but useful right after
// connecting a fresh Postgres database.
import { sql } from "@vercel/postgres";

async function main() {
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
  console.log("Schema ready.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
