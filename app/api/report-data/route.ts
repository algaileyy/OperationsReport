import { NextRequest, NextResponse } from "next/server";
import { getTeam } from "@/lib/teams";
import { getReportData } from "@/lib/db";

const MONTH_RE = /^\d{4}-\d{2}$/;

export async function GET(req: NextRequest) {
  const teamKey = req.nextUrl.searchParams.get("teamKey");
  const month = req.nextUrl.searchParams.get("month");

  const team = teamKey ? getTeam(teamKey) : undefined;
  if (!team) {
    return NextResponse.json({ error: "Unknown team." }, { status: 400 });
  }
  if (!month || !MONTH_RE.test(month)) {
    return NextResponse.json({ error: "Invalid month." }, { status: 400 });
  }

  const data = await getReportData(team.key, month);
  return NextResponse.json({ data });
}
