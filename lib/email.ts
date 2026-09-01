import nodemailer from "nodemailer";
import { getReminderRecipients } from "./db";
import { currentMonthKey, monthLabel } from "./months";

function inputUrl(): string {
  const base = process.env.APP_URL || "https://operations-report-one.vercel.app";
  return `${base.replace(/\/$/, "")}/input`;
}

function getTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("GMAIL_USER / GMAIL_APP_PASSWORD are not set.");
  }
  return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
}

export async function sendReminderEmail(opts: { to: string[]; month: string }): Promise<void> {
  if (opts.to.length === 0) {
    throw new Error("No recipients configured.");
  }

  const label = monthLabel(opts.month);
  const transport = getTransport();
  await transport.sendMail({
    from: `Media Operations Report <${process.env.GMAIL_USER}>`,
    to: opts.to,
    subject: `Reminder: submit your ${label} numbers`,
    html:
      `<p>Hi team,</p>` +
      `<p>Friendly reminder to submit your numbers for <strong>${label}</strong> in the Media Operations Report.</p>` +
      `<p><a href="${inputUrl()}">Open the data entry tool</a></p>`,
  });
}

/** Sends this month's reminder to whichever recipients are currently configured. */
export async function sendMonthlyReminder(): Promise<{ sent: number }> {
  const recipients = await getReminderRecipients();
  if (recipients.length === 0) return { sent: 0 };
  await sendReminderEmail({ to: recipients, month: currentMonthKey() });
  return { sent: recipients.length };
}
