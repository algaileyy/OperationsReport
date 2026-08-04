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

## Local setup

Requires [Node.js](https://nodejs.org) 18.18+ (this machine didn't have
Node installed, so this project has not been run/built locally — see
"Before you rely on this" below).

```bash
npm install
cp .env.example .env.local   # then fill in the values, see below
npm run dev
```

Open http://localhost:3000.

## Deploying (Vercel + Postgres)

1. **Push this folder to a GitHub repo**, then in the
   [Vercel dashboard](https://vercel.com/new) import that repo as a new
   project. Framework preset should auto-detect as Next.js.
2. **Add a database**: in the new Vercel project, go to *Storage* → *Create
   Database* → choose Postgres (Neon). Connect it to the project — Vercel
   automatically injects the `POSTGRES_*` environment variables, no manual
   copy/paste needed.
3. **Set the two auth env vars** under *Settings* → *Environment
   Variables*:
   - `INPUT_PASSWORD` — the shared password your team will use to sign in
     at `/input`.
   - `AUTH_SECRET` — any long random string (used to sign session cookies).
     Generate one locally with:
     `node -e "console.log(crypto.randomUUID() + crypto.randomUUID())"`
4. **Deploy.** The database tables are created automatically the first time
   the app queries them — no manual migration step needed.
5. Share the `/report` link with whoever should see the published numbers,
   and the `/input` link with the team members who enter data.

## How "which month is live" works

Every save is scoped to a `(team, month)` pair, so teams can enter next
month's numbers early without affecting what's currently public. The
`/input` page has a "Live report month" control — whichever month is
selected there is the one `/report` displays, for every team, until someone
changes it again.

## Before you rely on this

This code was written without a local Node.js install available, so it has
**not been run or visually tested**. Before pointing your team at it:

- Run `npm install && npm run build` locally (or let Vercel's build catch
  issues) and fix anything that surfaces.
- Sign in at `/input`, save a few numbers for a test month, publish it, and
  confirm `/report` renders as expected — in both light and dark mode.
- Confirm the field mapping in `lib/teams.ts` (especially the Media
  Management section) matches what your team actually wants — that section
  was reconciled from two different lists in your spec and is worth a
  second look.
