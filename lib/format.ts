export function formatNumber(n: number | undefined): string {
  return (n ?? 0).toLocaleString("en-US");
}

/** e.g. formatFieldValue(105, "TB") -> "105TB" */
export function formatFieldValue(n: number | undefined, unit?: string): string {
  return `${formatNumber(n)}${unit ?? ""}`;
}
