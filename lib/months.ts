/** Month keys are always "YYYY-MM" (UTC), sorted lexicographically = chronologically. */

export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** The month non-admins are allowed to edit: a rolling ~30-day window from the 25th of one
 * calendar month through the 24th of the next, labeled by the earlier month — e.g. Sept 25
 * through Oct 24 is all "September" (giving the team the rest of September plus the first 25 days
 * of October to finalize it), then it flips to "October" on Oct 25. Matches computeAutoPublishMonth:
 * the day a new editing month opens (the 25th) is the same day the previous one auto-publishes. */
export function computeEditingMonth(now: Date = new Date()): string {
  const monthOffset = now.getUTCDate() >= 25 ? 0 : -1;
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** The month that auto-publishes to the live report on the 25th of each month — the one just
 * before the current calendar month, which has then had 25 days (the rest of its own month, plus
 * the first 25 days after) to be finalized before going public. Called only from the 25th cron, so
 * it doesn't need its own day-of-month check — "now" is simply whenever the cron fires. */
export function computeAutoPublishMonth(now: Date = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
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
