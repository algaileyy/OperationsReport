import { NextRequest, NextResponse } from "next/server";
import { getCustomActivities, getMonthlyReport } from "@/lib/db";
import { emptyReport, visibleHighlights } from "@/lib/report";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

const MONTH_RE = /^\d{4}-\d{2}$/;

export async function GET(req: NextRequest) {
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const month = req.nextUrl.searchParams.get("month");

  if (!month || !MONTH_RE.test(month)) {
    return NextResponse.json({ error: "Invalid month." }, { status: 400 });
  }

  const data = (await getMonthlyReport(month)) ?? emptyReport(await getCustomActivities());
  // Without full Highlights access (admin, Omaima), only the caller's own entry should ever reach
  // their browser — not just be hidden from the UI, which view-source would still defeat.
  const filtered = { ...data, highlights: visibleHighlights(data.highlights, session.role, session.name) };
  return NextResponse.json({ data: filtered });
}
