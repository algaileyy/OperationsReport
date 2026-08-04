export function formatNumber(n: number | undefined): string {
  return (n ?? 0).toLocaleString("en-US");
}
