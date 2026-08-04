# Operations Report

A small internal tool with two pages:

- **`/input`** — password-protected form where the team enters each month's
  numbers per team, and controls which month is currently "live."
- **`/report`** — public page that shows whichever month is marked live,
  grouped into stat tiles by team.

Both pages render from a single field list in [`lib/teams.ts`](lib/teams.ts),
so the input form and the public report can never drift out of sync.

## Teams & fields

- **Publishing Team** — Shows in CMS, Episodes in CMS, Movies in CMS (Total
  Assets in CMS is calculated automatically as Episodes + Movies).
- **Media Management** — Assets Received, Project Received, Moved to Archive,
  Assets Requested (Circulation), Archive Media Desk Deliveries, Total
  Archive Assets in Clean-Up, Total Archive Assets in Technical Review.
- **Archiving & Production Support Team** — Revisioning, Textless/Clean QC
  Completed, Archived.
- **Media Ingest Team** — Archived Movies, Archived Episodes, Catch up
  Movies, Catch up Episodes, Quality Control Completed, Total Assets
  Currently Processing, Total Assets Processed (In GCP).

To rename a field, add a field, or add a whole new team section, edit
`lib/teams.ts` — everything else (form, report, validation) picks it up
automatically. To change the order teams appear in on the public report,
edit `REPORT_ORDER` in the same file.

The data layer uses the standard `pg` (node-postgres) driver against
`POSTGRES_URL`, so it works against any Postgres — local, NAS-hosted, or a
cloud provider — not just Vercel/Neon.

## Currently running (temporary, on a workstation)

This app is running right now on `algaileyy`'s Windows workstation, at
`http://<workstation-LAN-IP>:3000`, until it's moved to the NAS. Everything
was installed **without a system-wide installer** — Node.js and PostgreSQL
were unzipped as portable binaries under `D:\AI\tools`, so nothing outside
that folder and this repo was touched:

| Path | What it is |
|---|---|
| `D:\AI\tools\node-v24.19.0-win-x64\` | Portable Node.js runtime |
| `D:\AI\tools\pgsql\` | Portable PostgreSQL 17 binaries |
| `D:\AI\tools\pgdata\` | The actual database files (this is your data) |
| `D:\AI\tools\start-operations-report.bat` | Starts Postgres + the app |
| `D:\AI\tools\stop-operations-report.bat` | Stops both |
| `D:\AI\tools\status-operations-report.bat` | Checks whether both are running |
| `D:\AI\tools\logs\` | `app.log` and `postgres.log` |
| Scheduled Task `OperationsReportServer` | Runs the start script automatically at logon |

Credentials and the DB connection string live in `.env.local` in this repo
folder (gitignored — never pushed to GitHub):
- `INPUT_PASSWORD` — shared password for `/input`. Change it here, then
  re-run `stop-operations-report.bat` + `start-operations-report.bat` (or
  just log off/on) to pick it up.
- `AUTH_SECRET` — signs session cookies. Don't share this one.
- `POSTGRES_URL` — points at the local Postgres on port `5433`.

**To make it reachable by teammates**, an inbound firewall rule for port
3000 is needed, and that requires admin rights this session doesn't have.
Run this once in an **elevated** PowerShell (right-click → Run as
administrator):

```powershell
netsh advfirewall firewall add rule name="Operations Report (3000)" dir=in action=allow protocol=TCP localport=3000
```

After that, teammates on the same network reach the report at
`http://<that-workstation-IP>:3000/report` and the input form at
`http://<that-workstation-IP>:3000/input`.

This setup is HTTP only (no TLS) and lives on one person's workstation, so
treat it as a bridge to the NAS, not the final home for this.

## Moving to the NAS later

1. Copy this repo (or `git clone` it fresh from GitHub) onto the NAS.
2. Get Postgres running on the NAS — most NAS platforms (Synology, QNAP,
   TrueNAS, Unraid) support this via a Docker container far more easily
   than a manual binary install.
3. Migrate the data: `pg_dump` the workstation database and restore it into
   the NAS one, so you don't lose whatever's been entered before the move:
   ```bash
   # on the workstation
   D:\AI\tools\pgsql\bin\pg_dump.exe -h localhost -p 5433 -U opsapp -d opsreport -Fc -f opsreport.dump
   # copy opsreport.dump to the NAS, then
   pg_restore -h <nas-host> -U opsapp -d opsreport --create opsreport.dump
   ```
4. Point `POSTGRES_URL` in the NAS's `.env.local` at the NAS's own Postgres,
   set `INPUT_PASSWORD` / `AUTH_SECRET` there too, `npm install && npm run
   build && npm run start`.
5. Retire the workstation copy: run `stop-operations-report.bat`, delete
   the Scheduled Task (`schtasks /delete /tn OperationsReportServer`), and
   remove the temporary firewall rule.

Ask for help with this step when you're ready — happy to script the dump/
restore and the NAS-side setup once you know which NAS platform and whether
it runs Docker.

## Local development setup (any machine)

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open http://localhost:3000.

## How "which month is live" works

Every save is scoped to a `(team, month)` pair, so teams can enter next
month's numbers early without affecting what's currently public. The
`/input` page has a "Live report month" control — whichever month is
selected there is the one `/report` displays, for every team, until someone
changes it again.

## Verified so far

- `npm run build` compiles cleanly, no type errors.
- Full flow tested via the API: signed in, saved numbers for two teams,
  published a month, and confirmed `/report` renders them correctly
  (including the auto-calculated CMS total).
- Not yet verified: the actual UI in a browser (only tested through curl so
  far), and dark mode. Worth a manual click-through before relying on it
  for a real monthly report.
- Also worth a second look: the field mapping for Media Management in
  `lib/teams.ts` — it was reconciled from two slightly different lists in
  the original spec.
