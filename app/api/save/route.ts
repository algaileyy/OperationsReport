import { NextRequest, NextResponse } from "next/server";
import { getTeam, type TeamData } from "@/lib/teams";
import { upsertReportData } from "@/lib/db";

const MONTH_RE = /^\d{4}-\d{2}$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const teamKey = body?.teamKey;
  const month = body?.month;
  const data = body?.data;

  const team = typeof teamKey === "string" ? getTeam(teamKey) : undefined;
  if (!team) {
    return NextResponse.json({ error: "Unknown team." }, { status: 400 });
  }
  if (typeof month !== "string" || !MONTH_RE.test(month)) {
    return NextResponse.json({ error: "Invalid month." }, { status: 400 });
  }
  if (typeof data !== "object" || data === null) {
    return NextResponse.json({ error: "Invalid data." }, { status: 400 });
  }

  // Only persist known fields for this team, coerced to non-negative numbers.
  const clean: TeamData = {};
  for (const field of team.fields) {
    const raw = (data as Record<string, unknown>)[field.key];
    const num = Number(raw);
    clean[field.key] = Number.isFinite(num) && num >= 0 ? num : 0;
  }

  await upsertReportData(team.key, month, clean);
  return NextResponse.json({ ok: true });
}
