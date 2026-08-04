import { getMonthlyReport, getPublishedMonth, getReportUpdatedAt } from "@/lib/db";
import { emptyReport } from "@/lib/report";
import ReportView from "./ReportView";

export const dynamic = "force-dynamic";

const GRADIENT =
  "linear-gradient(135deg, #12283d 0%, #164a5c 30%, #1c7a86 65%, #2fc2c9 100%)";

export default async function ReportPage() {
  const publishedMonth = await getPublishedMonth();

  if (!publishedMonth) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center text-white" style={{ background: GRADIENT }}>
        <p>No report has been published yet. Check back soon.</p>
      </main>
    );
  }

  const [data, updatedAt] = await Promise.all([
    getMonthlyReport(publishedMonth),
    getReportUpdatedAt(publishedMonth),
  ]);

  const report = data ?? emptyReport();

  return <ReportView monthKey={publishedMonth} report={report} updatedAt={updatedAt} />;
}
