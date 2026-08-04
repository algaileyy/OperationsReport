import { listMonthsWithData } from "@/lib/db";
import { currentMonthKey } from "@/lib/months";
import InputNav from "../InputNav";
import CompareClient from "./CompareClient";

export const dynamic = "force-dynamic";

export default async function ComparePage() {
  const monthsWithData = await listMonthsWithData();

  const initialB = monthsWithData[0] ?? currentMonthKey();
  const initialA = monthsWithData[1] ?? initialB;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <InputNav />
      <h1 className="mb-2 text-xl font-semibold" style={{ color: "var(--ink-primary)" }}>
        Compare Months
      </h1>
      <p className="mb-6 text-sm" style={{ color: "var(--ink-secondary)" }}>
        See how each team&apos;s numbers changed between two months.
      </p>
      <CompareClient monthsWithData={monthsWithData} initialA={initialA} initialB={initialB} />
    </main>
  );
}
