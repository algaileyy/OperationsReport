import { NextRequest, NextResponse } from "next/server";
import { getReportHistoryEntryData, listReportHistory } from "@/lib/db";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

const MONTH_RE = /^\d{4}-\d{2}$/;

/** Admin-only: ?month=YYYY-MM lists that month's save history; ?id=N returns one entry's full
 * saved data (for viewing or restoring). */
export async function GET(req: NextRequest) {
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  const idParam = req.nextUrl.searchParams.get("id");
  if (idParam) {
    const id = Number(idParam);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "Invalid id." }, { status: 400 });
    }
    const data = await getReportHistoryEntryData(id);
    if (!data) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ data });
  }

  const month = req.nextUrl.searchParams.get("month");
  if (!month || !MONTH_RE.test(month)) {
    return NextResponse.json({ error: "Invalid month." }, { status: 400 });
  }
  const entries = await listReportHistory(month);
  return NextResponse.json({ entries });
}
