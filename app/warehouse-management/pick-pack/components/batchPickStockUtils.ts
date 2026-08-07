import type { PickListBatchItem } from "@/shared/services/whmsPickListBatchService";

/**
 * Max pickable qty for a batch line, capped by live warehouse stock for its styleCode.
 * Over-required is allowed; lines sharing a styleCode share the same stock pool.
 * Formula: availableStock + saved picks for style − other lines' draft picks.
 * @param item - Target batch line
 * @param items - All batch lines
 * @param draftPicks - Current draft picked quantities by itemKey
 */
export function getMaxPickableByStock(
  item: PickListBatchItem,
  items: PickListBatchItem[],
  draftPicks: Record<string, number>,
): number {
  const available =
    typeof item.availableStock === "number" && !Number.isNaN(item.availableStock)
      ? Math.max(0, Number(item.availableStock))
      : 0;

  const sameStyle = (items || []).filter((i) => i.styleCode === item.styleCode);
  const savedTotal = sameStyle.reduce((s, i) => s + Number(i.pickedQty || 0), 0);
  const othersDraft = sameStyle
    .filter((i) => i.itemKey !== item.itemKey)
    .reduce((s, i) => s + Number(draftPicks[i.itemKey] ?? i.pickedQty ?? 0), 0);

  return Math.max(0, available + savedTotal - othersDraft);
}
