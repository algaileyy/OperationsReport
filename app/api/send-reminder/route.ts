import { NextRequest, NextResponse } from "next/server";
import { sendMonthlyReminder } from "@/lib/email";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  try {
    const result = await sendMonthlyReminder();
    if (result.sent === 0) {
      return NextResponse.json({ error: "No recipients configured yet." }, { status: 400 });
    }
    return NextResponse.json({ ok: true, sent: result.sent });
  } catch (err) {
    console.error("send-reminder error:", err);
    const message = err instanceof Error ? err.message : "Failed to send reminder.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
