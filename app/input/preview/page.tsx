import Link from "next/link";
import { getMonthlyReport, getPublishedMonth, getReportUpdatedAt } from "@/lib/db";
import { currentMonthKey, monthLabel } from "@/lib/months";
import { emptyReport } from "@/lib/report";
import ReportView from "../../report/ReportView";

export const dynamic = "force-dynamic";

const MONTH_RE = /^\d{4}-\d{2}$/;

export default async function PreviewPage({ searchParams }: { searchParams: { month?: string } }) {
  const month = searchParams.month && MONTH_RE.test(searchParams.month) ? searchParams.month : currentMonthKey();

  const [data, publishedMonth, updatedAt] = await Promise.all([
    getMonthlyReport(month),
    getPublishedMonth(),
    getReportUpdatedAt(month),
  ]);

  const report = data ?? emptyReport();
  const isLive = month === publishedMonth;

  const banner = (
    <div
      className="print:hidden flex flex-wrap items-center justify-between gap-2 px-6 py-2 text-sm sm:px-10"
      style={{ background: isLive ? "rgba(12,163,12,0.25)" : "rgba(250,178,25,0.25)", color: "#ffffff" }}
    >
      <span>
        {isLive
          ? `Preview — ${monthLabel(month)} is the live report right now.`
          : `Preview only — ${monthLabel(month)} is not published. This is not what the public /report link shows.`}
      </span>
      <Link href="/input" className="underline">
        Back to editing
      </Link>
    </div>
  );

  return <ReportView monthKey={month} report={report} updatedAt={updatedAt} banner={banner} />;
}
