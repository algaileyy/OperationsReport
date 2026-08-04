# Operations Report

Two ways in:

- **Desktop app** (`desktop/`) — the app your team actually uses to enter
  numbers. A portable `.exe`, no installer, same pattern as `finfo`. It
  opens the hosted `/input` page in its own window.
- **`/report`** — the public link anyone can open in a browser to see
  whichever month is currently marked live, grouped into stat tiles by
  team.

Both talk to one deployment (Vercel, recommended) and one database, so
every teammate's desktop app and the public report link always agree.

Both the input form and the report render from a single field list in
[`lib/teams.ts`](lib/teams.ts), so they can't drift out of sync with each
other.

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
`POSTGRES_URL`, so it works against Vercel/Neon, a NAS, or a local
Postgres — set `POSTGRES_SSL=true` for hosted providers that require it
(Neon does), leave it unset for a local instance.

## Deploying the website (Vercel + Postgres)

1. **Import the repo**: [vercel.com/new](https://vercel.com/new) → import
   `algaileyy/OperationsReport`. Framework preset auto-detects as Next.js.
2. **Add a database**: in the project, *Storage* → *Create Database* →
   Postgres (Neon) → connect it. Vercel auto-injects `POSTGRES_URL` and
   friends — also add `POSTGRES_SSL=true` manually (Neon requires SSL, and
   this app doesn't assume it by default the way `@vercel/postgres` would).
3. **Set the two auth env vars** under *Settings → Environment Variables*:
   - `INPUT_PASSWORD` — shared password for `/input`.
   - `AUTH_SECRET` — long random string, signs session cookies. Generate
     with: `node -e "console.log(crypto.randomUUID() + crypto.randomUUID())"`
4. **Deploy.** Tables are created automatically on first request.
5. Copy the resulting URL (e.g. `https://operations-report.vercel.app`) —
   that's what goes into the desktop app's setup screen, and what you
   share as the `/report` link.

## The desktop app

See [`desktop/README.md`](desktop/README.md) for how it works and how to
build it. Short version: `cd desktop && npm install && npm run package`
produces a portable build; zip it and attach it to a GitHub Release the
same way `finfo-portable.zip` is distributed, so teammates can download
and double-click without installing anything.

The zip wasn't committed here (it's ~110 MB of Electron runtime) — build
it yourself with the steps above, or ask for the one already built during
this session.

## How "which month is live" works

Every save is scoped to a `(team, month)` pair, so teams can enter next
month's numbers early without affecting what's currently public. The
`/input` page has a "Live report month" control — whichever month is
selected there is the one `/report` displays, for every team, until someone
changes it again.

## Local development (any machine)

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open http://localhost:3000.

## Temporary workstation hosting (fallback, not the plan going forward)

Before landing on Vercel, this was briefly set up to run directly on a
team workstation — Node.js and Postgres installed portably under
`D:\AI\tools`, started via a Scheduled Task (`OperationsReportServer`).
That's still there and working, but it depends on one person's machine
staying on and reachable, needs a manually-opened firewall port, and has
no TLS. Once the Vercel deployment is live and the desktop app points at
it, that workstation setup should be decommissioned:

```powershell
D:\AI\tools\stop-operations-report.bat
schtasks /delete /tn OperationsReportServer /f
netsh advfirewall firewall delete rule name="Operations Report (3000)"
```

(Only run the last line if that firewall rule was ever actually added —
it required admin rights that weren't available when this was set up.)

## Verified so far

- `npm run build` compiles cleanly, no type errors.
- Full data flow tested via the API: signed in, saved numbers for two
  teams, published a month, confirmed `/report` renders them correctly
  (including the auto-calculated CMS total).
- The desktop app was packaged successfully (Electron 33, portable win32
  build), but this environment has no access to an interactive Windows
  desktop session, so the window itself has **not been visually
  confirmed** — worth actually opening it once before handing it to the
  team.
- Not yet deployed to Vercel — that needs your account.
- Worth a second look: the field mapping for Media Management in
  `lib/teams.ts` — it was reconciled from two slightly different lists in
  the original spec.
