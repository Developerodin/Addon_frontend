import type { Article } from "@/shared/services/productionService";
import { normalizeProductionQty } from "@/shared/utils/halfStepQuantity";
import { getCumulativeQty } from "@/shared/utils/qcFloorQuantities";

export type ContainerStagingArticle = {
  article: Article;
  quantity: number;
  /** True when qty comes from pending handoff (transfer already recorded, bag missing). */
  fromPendingHandoff: boolean;
};

type HandoffLeg = "finalChecking-dispatch" | "dispatch-warehouse";

/**
 * Qty transferred from source floor but not yet received on destination (container accept pending).
 */
export function getPendingContainerHandoffQty(
  article: Article,
  leg: HandoffLeg = "finalChecking-dispatch"
): number {
  if (leg === "finalChecking-dispatch") {
    const fc = getCumulativeQty(article, "finalChecking");
    const dispatchReceived = normalizeProductionQty(article.floorQuantities?.dispatch?.received ?? 0);
    return Math.max(0, normalizeProductionQty(fc.m1Transferred - dispatchReceived));
  }
  const dispatch = normalizeProductionQty(article.floorQuantities?.dispatch?.transferred ?? 0);
  const warehouseReceived = normalizeProductionQty(article.floorQuantities?.warehouse?.received ?? 0);
  return Math.max(0, normalizeProductionQty(dispatch - warehouseReceived));
}

/**
 * Resolve articles + qty for container staging from drawer transfer lines or pending handoff recovery.
 */
export function resolveArticlesForContainerStaging(
  articles: Article[],
  updateData: Record<string, { transferItems?: Array<{ transferred?: number }> } | undefined>,
  getTransferTotal: (items: Array<{ transferred?: number }>) => number,
  leg: HandoffLeg = "finalChecking-dispatch"
): ContainerStagingArticle[] {
  const fromDrawer: ContainerStagingArticle[] = [];
  for (const article of articles) {
    const id = article.id ?? article._id;
    if (!id) continue;
    const qty = getTransferTotal(updateData[id]?.transferItems ?? []);
    if (qty > 0) fromDrawer.push({ article, quantity: qty, fromPendingHandoff: false });
  }
  if (fromDrawer.length > 0) return fromDrawer;

  const fromPending: ContainerStagingArticle[] = [];
  for (const article of articles) {
    const pending = getPendingContainerHandoffQty(article, leg);
    if (pending > 0) fromPending.push({ article, quantity: pending, fromPendingHandoff: true });
  }
  return fromPending;
}

/**
 * True when any article has qty waiting in a container on the next floor.
 */
export function hasPendingContainerHandoff(
  articles: Article[],
  leg: HandoffLeg = "finalChecking-dispatch"
): boolean {
  return articles.some((a) => getPendingContainerHandoffQty(a, leg) > 0);
}
