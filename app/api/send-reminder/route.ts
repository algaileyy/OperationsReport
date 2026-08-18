import { NextResponse } from "next/server";
import { sendMonthlyReminder } from "@/lib/email";

export async function POST() {
  try {
    const result = await sendMonthlyReminder();
    if (result.sent === 0) {
      return NextResponse.json({ error: "No recipients configured yet." }, { status: 400 });
    }
    return NextResponse.json({ ok: true, sent: result.sent });
  } catch (err) {
    console.error("send-reminder error:", err);
    return NextResponse.json({ error: "Failed to send reminder." }, { status: 500 });
  }
}
