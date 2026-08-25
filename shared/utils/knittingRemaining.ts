/**
 * Knitting remaining for one article — the same field Article View Rem shows.
 *
 * Reports must use this. Never derive remaining from planned − completed;
 * the floor ledger is `received − completed − m4`, stored on
 * `floorQuantities.knitting.remaining`.
 * @param article Article (or a lean subset with floorQuantities.knitting)
 */
export function knittingRemainingQty(
  article:
    | {
        floorQuantities?: {
          knitting?: { remaining?: number | null };
        };
      }
    | null
    | undefined,
): number {
  const remaining = article?.floorQuantities?.knitting?.remaining;
  if (remaining == null) return 0;
  const n = typeof remaining === "number" ? remaining : Number(remaining);
  return Number.isFinite(n) ? n : 0;
}
