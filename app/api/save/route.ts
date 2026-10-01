import { NextRequest, NextResponse } from "next/server";
import { emptyReport, normalizeReport } from "@/lib/report";
import { getMonthlyReport, upsertMonthlyReport } from "@/lib/db";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { computeEditingMonth } from "@/lib/months";
import { TEAMS, allowedTeamKeysFor } from "@/lib/teams";

const MONTH_RE = /^\d{4}-\d{2}$/;

export async function POST(req: NextRequest) {
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const month = body?.month;

  if (typeof month !== "string" || !MONTH_RE.test(month)) {
    return NextResponse.json({ error: "Invalid month." }, { status: 400 });
  }

  // Non-admins can only ever save to the current rolling editing month — enforced here too, not
  // just by hiding the month picker, since the UI restriction alone wouldn't stop a direct request.
  if (session.role !== "admin" && month !== computeEditingMonth()) {
    return NextResponse.json({ error: "This month is locked. Only an admin can edit past or future months." }, { status: 403 });
  }

  const data = normalizeReport(body?.data);

  // A member restricted to certain teams (e.g. Omar -> Digital Archive & Production Support only)
  // can't touch other teams' sections even via a direct request — whatever they submit for a team
  // they're not allowed to edit is discarded in favor of what's actually saved for it already.
  const allowedKeys = allowedTeamKeysFor(session.role, session.name);
  if (allowedKeys) {
    const existing = (await getMonthlyReport(month)) ?? emptyReport();
    for (const team of TEAMS) {
      if (!allowedKeys.includes(team.key)) {
        data.teams[team.key] = existing.teams[team.key];
        data.notes[team.key] = existing.notes[team.key];
        data.sourceBreakdowns[team.key] = existing.sourceBreakdowns[team.key];
        data.fieldUnits[team.key] = existing.fieldUnits[team.key];
        data.teamTotalOverrides[team.key] = existing.teamTotalOverrides[team.key];
      }
    }
  }

  await upsertMonthlyReport(month, data, session.name);
  return NextResponse.json({ ok: true });
}
