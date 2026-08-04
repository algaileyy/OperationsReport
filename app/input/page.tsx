import { getMonthlyReport, getPublishedMonth, listMonthsWithData } from "@/lib/db";
import { currentMonthKey } from "@/lib/months";
import { emptyReport } from "@/lib/report";
import InputClient from "./InputClient";

export const dynamic = "force-dynamic";

export default async function InputPage() {
  const [publishedMonth, monthsWithData] = await Promise.all([
    getPublishedMonth(),
    listMonthsWithData(),
  ]);

  const defaultMonth = publishedMonth ?? currentMonthKey();
  const initialData = (await getMonthlyReport(defaultMonth)) ?? emptyReport();

  return (
    <InputClient
      publishedMonth={publishedMonth}
      monthsWithData={monthsWithData}
      defaultMonth={defaultMonth}
      initialData={initialData}
    />
  );
}
