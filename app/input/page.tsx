import { cookies } from "next/headers";
import { getMonthlyReport, getPublishedMonth, getReminderRecipients, listMonthsWithData } from "@/lib/db";
import { computeEditingMonth } from "@/lib/months";
import { emptyReport } from "@/lib/report";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import InputNav from "./InputNav";
import InputClient from "./InputClient";

export const dynamic = "force-dynamic";

const MONTH_RE = /^\d{4}-\d{2}$/;

export default async function InputPage({ searchParams }: { searchParams: { month?: string } }) {
  const role = (await verifySession(cookies().get(SESSION_COOKIE)?.value))?.role ?? "member";
  const [publishedMonth, monthsWithData, reminderRecipients] = await Promise.all([
    getPublishedMonth(),
    listMonthsWithData(),
    getReminderRecipients(),
  ]);

  // Non-admins can only ever see/edit the current rolling editing month — their own choice of
  // month (if any snuck in via the URL) is ignored, not just hidden in the UI.
  const requestedMonth = searchParams.month && MONTH_RE.test(searchParams.month) ? searchParams.month : null;
  const defaultMonth =
    role === "admin" ? requestedMonth ?? publishedMonth ?? computeEditingMonth() : computeEditingMonth();
  const initialData = (await getMonthlyReport(defaultMonth)) ?? emptyReport();

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <InputNav />
      <InputClient
        role={role}
        publishedMonth={publishedMonth}
        monthsWithData={monthsWithData}
        defaultMonth={defaultMonth}
        initialData={initialData}
        initialRecipients={reminderRecipients}
      />
    </main>
  );
}
