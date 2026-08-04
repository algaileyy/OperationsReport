import { NextRequest, NextResponse } from "next/server";
import { getMonthlyReport } from "@/lib/db";
import { emptyReport } from "@/lib/report";

const MONTH_RE = /^\d{4}-\d{2}$/;

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month");

  if (!month || !MONTH_RE.test(month)) {
    return NextResponse.json({ error: "Invalid month." }, { status: 400 });
  }

  const data = (await getMonthlyReport(month)) ?? emptyReport();
  return NextResponse.json({ data });
}
