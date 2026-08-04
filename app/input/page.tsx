import { TEAMS } from "@/lib/teams";
import { getPublishedMonth, getReportData, listMonthsWithData } from "@/lib/db";
import { currentMonthKey, recentMonthOptions } from "@/lib/months";
import InputClient from "./InputClient";

export const dynamic = "force-dynamic";

export default async function InputPage() {
  const [publishedMonth, monthsWithData] = await Promise.all([
    getPublishedMonth(),
    listMonthsWithData(),
  ]);

  const defaultMonth = publishedMonth ?? currentMonthKey();
  const defaultTeam = TEAMS[0];
  const initialData = await getReportData(defaultTeam.key, defaultMonth);

  return (
    <InputClient
      publishedMonth={publishedMonth}
      monthOptions={recentMonthOptions(monthsWithData)}
      defaultMonth={defaultMonth}
      defaultTeamKey={defaultTeam.key}
      initialData={initialData}
    />
  );
}
