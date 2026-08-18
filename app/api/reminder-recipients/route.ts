import { NextRequest, NextResponse } from "next/server";
import { getReminderRecipients, setReminderRecipients } from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  const recipients = await getReminderRecipients();
  return NextResponse.json({ recipients });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const emails = body?.recipients;

  if (!Array.isArray(emails) || !emails.every((e) => typeof e === "string" && EMAIL_RE.test(e))) {
    return NextResponse.json({ error: "Invalid recipient list." }, { status: 400 });
  }

  await setReminderRecipients(emails);
  return NextResponse.json({ ok: true });
}
