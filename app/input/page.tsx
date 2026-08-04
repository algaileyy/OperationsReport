import { getMonthlyReport, getPublishedMonth, listMonthsWithData } from "@/lib/db";
import { currentMonthKey } from "@/lib/months";
import { emptyReport } from "@/lib/report";
import InputNav from "./InputNav";
import InputClient from "./InputClient";

export const dynamic = "force-dynamic";

const MONTH_RE = /^\d{4}-\d{2}$/;

export default async function InputPage({ searchParams }: { searchParams: { month?: string } }) {
  const [publishedMonth, monthsWithData] = await Promise.all([
    getPublishedMonth(),
    listMonthsWithData(),
  ]);

  const requestedMonth = searchParams.month && MONTH_RE.test(searchParams.month) ? searchParams.month : null;
  const defaultMonth = requestedMonth ?? publishedMonth ?? currentMonthKey();
  const initialData = (await getMonthlyReport(defaultMonth)) ?? emptyReport();

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <InputNav />
      <InputClient
        publishedMonth={publishedMonth}
        monthsWithData={monthsWithData}
        defaultMonth={defaultMonth}
        initialData={initialData}
      />
    </main>
  );
}
