import { NextRequest, NextResponse } from "next/server";
import { normalizeReport } from "@/lib/report";
import { upsertMonthlyReport } from "@/lib/db";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { computeEditingMonth } from "@/lib/months";

const MONTH_RE = /^\d{4}-\d{2}$/;

export async function POST(req: NextRequest) {
  const role = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const body = await req.json().catch(() => null);
  const month = body?.month;

  if (typeof month !== "string" || !MONTH_RE.test(month)) {
    return NextResponse.json({ error: "Invalid month." }, { status: 400 });
  }

  // Non-admins can only ever save to the current rolling editing month — enforced here too, not
  // just by hiding the month picker, since the UI restriction alone wouldn't stop a direct request.
  if (role !== "admin" && month !== computeEditingMonth()) {
    return NextResponse.json({ error: "This month is locked. Only an admin can edit past or future months." }, { status: 403 });
  }

  const data = normalizeReport(body?.data);
  await upsertMonthlyReport(month, data);
  return NextResponse.json({ ok: true });
}
