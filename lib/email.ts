import { getReminderRecipients } from "./db";
import { currentMonthKey, monthLabel } from "./months";

const RESEND_API_URL = "https://api.resend.com/emails";

function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL || "Media Operations Report <onboarding@resend.dev>";
}

function inputUrl(): string {
  const base = process.env.APP_URL || "https://operations-report-one.vercel.app";
  return `${base.replace(/\/$/, "")}/input`;
}

export async function sendReminderEmail(opts: { to: string[]; month: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set.");
  }
  if (opts.to.length === 0) {
    throw new Error("No recipients configured.");
  }

  const label = monthLabel(opts.month);
  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: opts.to,
      subject: `Reminder: submit your ${label} numbers`,
      html:
        `<p>Hi team,</p>` +
        `<p>Friendly reminder to submit your numbers for <strong>${label}</strong> in the Media Operations Report.</p>` +
        `<p><a href="${inputUrl()}">Open the data entry tool</a></p>`,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Resend API error ${res.status}: ${errText.slice(0, 300)}`);
  }
}

/** Sends this month's reminder to whichever recipients are currently configured. */
export async function sendMonthlyReminder(): Promise<{ sent: number }> {
  const recipients = await getReminderRecipients();
  if (recipients.length === 0) return { sent: 0 };
  await sendReminderEmail({ to: recipients, month: currentMonthKey() });
  return { sent: recipients.length };
}
