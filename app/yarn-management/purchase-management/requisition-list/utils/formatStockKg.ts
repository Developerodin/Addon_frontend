/**
 * Formats kg stock values for table display (locale-aware, 3 decimal max when needed).
 * @param kg - Weight in kilograms
 */
export function formatStockKg(kg: number | null | undefined): string {
  const n = Number(kg ?? 0);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}
