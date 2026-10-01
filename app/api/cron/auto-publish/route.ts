import { NextRequest, NextResponse } from "next/server";
import { setPublishedMonth } from "@/lib/db";
import { computeAutoPublishMonth } from "@/lib/months";

/**
 * Triggered by Vercel Cron on the 25th of each month (see vercel.json). Not behind session auth —
 * middleware.ts intentionally excludes this route — since the cron caller has no session cookie.
 * Authorized instead via CRON_SECRET, which Vercel sends as a Bearer token automatically for
 * scheduled invocations. An admin can still manually publish a different month afterward via the
 * normal "Set as live report" control — this just sets the default each cycle.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const month = computeAutoPublishMonth();
    await setPublishedMonth(month);
    return NextResponse.json({ ok: true, month });
  } catch (err) {
    console.error("cron auto-publish error:", err);
    return NextResponse.json({ error: "Failed to auto-publish." }, { status: 500 });
  }
}
