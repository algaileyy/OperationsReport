import { NextRequest, NextResponse } from "next/server";
import { sendMonthlyReminder } from "@/lib/email";

/**
 * Triggered by Vercel Cron (see vercel.json). Not behind session auth —
 * middleware.ts intentionally excludes this route — since the cron caller
 * has no session cookie. Authorized instead via CRON_SECRET, which Vercel
 * sends as a Bearer token automatically for scheduled invocations.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendMonthlyReminder();
    return NextResponse.json({ ok: true, sent: result.sent });
  } catch (err) {
    console.error("cron reminder error:", err);
    return NextResponse.json({ error: "Failed to send reminder." }, { status: 500 });
  }
}
