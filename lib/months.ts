/** Month keys are always "YYYY-MM" (UTC), sorted lexicographically = chronologically. */

export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, 1));
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** e.g. "August 1 – 31, 2026" — the full date span the report covers. */
export function monthRangeLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const startStr = start.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
  return `${startStr} – ${lastDay}, ${year}`;
}

/** Recent months for pickers, newest first, including any months that already have data. */
export function recentMonthOptions(extra: string[] = [], count = 15): string[] {
  const set = new Set<string>(extra);
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    set.add(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return Array.from(set).sort().reverse();
}
