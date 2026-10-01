import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { listReportHistory } from "@/lib/db";
import { monthLabel } from "@/lib/months";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import InputNav from "../../InputNav";
import HistoryDetailClient from "./HistoryDetailClient";

export const dynamic = "force-dynamic";

export default async function MonthHistoryPage({ params }: { params: { month: string } }) {
  const role = await verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (role !== "admin") {
    redirect("/input/history");
  }

  const entries = await listReportHistory(params.month);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <InputNav />
      <h1 className="mb-2 text-xl font-semibold" style={{ color: "var(--ink-primary)" }}>
        Save History — {monthLabel(params.month)}
      </h1>
      <p className="mb-6 text-sm" style={{ color: "var(--ink-secondary)" }}>
        Every save ever made for this month, most recent first. Restoring an older version saves it
        as the current state — it doesn&apos;t erase anything, so you can always come back here.
      </p>
      <HistoryDetailClient
        month={params.month}
        entries={entries.map((e) => ({ id: e.id, savedBy: e.savedBy, savedAt: e.savedAt.toISOString() }))}
      />
    </main>
  );
}
