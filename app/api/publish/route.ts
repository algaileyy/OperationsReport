import { NextRequest, NextResponse } from "next/server";
import { setPublishedMonth } from "@/lib/db";

const MONTH_RE = /^\d{4}-\d{2}$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const month = body?.month;

  if (typeof month !== "string" || !MONTH_RE.test(month)) {
    return NextResponse.json({ error: "Invalid month." }, { status: 400 });
  }

  await setPublishedMonth(month);
  return NextResponse.json({ ok: true });
}
