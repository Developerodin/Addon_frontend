import type {
  QualityFloorQuantity,
  VendorProductionFlow,
} from "@/shared/services/vendorProductionFlowService";

/** Aggregated quantity totals for secondary checking flows. */
export interface VendorScQuantityTotals {
  planned: number;
  pendingFromBoxes: number;
  received: number;
  remaining: number;
  transferred: number;
  m1: number;
  m2: number;
  m3: number;
  vm4: number;
}

/** Vendor PO order group with nested article flows. */
export interface VendorScOrderGroup {
  vpoId: string;
  vpoNumber: string;
  vendorName: string;
  flows: VendorProductionFlow[];
  totals: VendorScQuantityTotals;
}

/** Flat article row with order context. */
export interface VendorScArticleRow {
  flow: VendorProductionFlow;
  vpoId: string;
  vpoNumber: string;
  vendorName: string;
  vendorCode: string;
  productName: string;
}

/**
 * Resolves vendor purchase order id from a production flow.
 * @param flow - Vendor production flow document
 */
export function getVpoId(flow: VendorProductionFlow): string {
  const vpo = flow.vendorPurchaseOrder;
  if (!vpo) return "";
  if (typeof vpo === "object") return vpo.id || vpo._id || "";
  return vpo;
}

/**
 * Resolves VPO number label from a production flow.
 * @param flow - Vendor production flow document
 */
export function getVpoNumber(flow: VendorProductionFlow): string {
  const vpo = flow.vendorPurchaseOrder;
  if (!vpo) return "N/A";
  if (typeof vpo === "object") return vpo.vpoNumber || "N/A";
  return "N/A";
}

/**
 * Resolves vendor display name from a production flow.
 * @param flow - Vendor production flow document
 */
export function getVendorName(flow: VendorProductionFlow): string {
  const vendor = flow.vendor;
  if (!vendor) return "Unknown";
  if (typeof vendor === "object") return vendor.header?.vendorName || "Unknown";
  return "Unknown";
}

/**
 * Resolves article vendor code from a production flow product (PO line / product snapshot).
 * @param flow - Vendor production flow document
 */
export function getArticleVendorCode(flow: VendorProductionFlow): string {
  const product = flow.product;
  if (!product || typeof product !== "object") return "no vendor code";
  const code = product.vendorCode?.trim();
  return code || "no vendor code";
}

/**
 * Resolves product display name from a production flow.
 * @param flow - Vendor production flow document
 */
export function getProductName(flow: VendorProductionFlow): string {
  const product = flow.product;
  if (!product) return "—";
  if (typeof product === "object") return product.name || "—";
  return "—";
}

/**
 * Resolves flow document id (supports id or _id from API).
 * @param flow - Vendor production flow document
 */
export function getFlowId(flow: VendorProductionFlow | Record<string, unknown>): string {
  const f = flow as VendorProductionFlow & { _id?: string };
  return f.id || f._id || "";
}

/**
 * Whether a flow has active secondary checking work (received, remaining, or pending scan).
 * @param flow - Vendor production flow document
 */
export function isActiveSecondaryCheckingFlow(flow: VendorProductionFlow): boolean {
  const sc = flow.floorQuantities?.secondaryChecking;
  if (!sc) return false;
  return (
    (sc.received ?? 0) > 0 ||
    (sc.remaining ?? 0) > 0 ||
    (sc.pendingFromBoxes ?? 0) > 0
  );
}

/**
 * Filters flows to those with active secondary checking quantities.
 * @param flows - All vendor production flows
 */
export function filterActiveScFlows(
  flows: VendorProductionFlow[],
): VendorProductionFlow[] {
  return flows.filter(isActiveSecondaryCheckingFlow);
}

/**
 * Whether secondary checking still has work (remaining qty or boxes pending scan).
 * @param flow - Vendor production flow document
 */
export function hasSecondaryCheckingWorkRemaining(flow: VendorProductionFlow): boolean {
  const sc = flow.floorQuantities?.secondaryChecking;
  return (sc?.remaining ?? 0) > 0 || (sc?.pendingFromBoxes ?? 0) > 0;
}

/**
 * Whether this flow has secondary checking floor history.
 *
 * An article only counts as "on the floor" once at least one of its boxes has been
 * **scanned & accepted** here — acceptance moves units from `pendingFromBoxes` into
 * `received`. Boxes that are merely awaiting a scan (`pendingFromBoxes` only) must NOT
 * surface the article in the order / article views; the operator must accept a box first.
 * @param flow - Vendor production flow document
 */
export function hasSecondaryCheckingFloorHistory(flow: VendorProductionFlow): boolean {
  const sc = flow.floorQuantities?.secondaryChecking;
  if (!sc) return false;
  return (sc.received ?? 0) > 0 || (sc.transferred ?? 0) > 0;
}

/**
 * Filters flows for secondary checking floor UI.
 * @param flows - Flows from list API
 * @param showAll - When true, include completed batches
 */
export function filterSecondaryCheckingFlowsForView(
  flows: VendorProductionFlow[],
  showAll: boolean,
): VendorProductionFlow[] {
  if (showAll) return flows.filter(hasSecondaryCheckingFloorHistory);
  return flows.filter(
    (f) => hasSecondaryCheckingFloorHistory(f) && hasSecondaryCheckingWorkRemaining(f),
  );
}

/**
 * Sums secondary checking quantities across flows.
 * @param flows - Flows to aggregate
 */
export function sumScQuantities(
  flows: VendorProductionFlow[],
): VendorScQuantityTotals {
  const totals: VendorScQuantityTotals = {
    planned: 0,
    pendingFromBoxes: 0,
    received: 0,
    remaining: 0,
    transferred: 0,
    m1: 0,
    m2: 0,
    m3: 0,
    vm4: 0,
  };

  for (const flow of flows) {
    const sc: QualityFloorQuantity = flow.floorQuantities?.secondaryChecking ?? {
      received: 0,
      completed: 0,
      remaining: 0,
      transferred: 0,
      m1Quantity: 0,
      m2Quantity: 0,
      m3Quantity: 0,
      vm4Quantity: 0,
      m1Transferred: 0,
      m1Remaining: 0,
      repairStatus: "NOT_REQUIRED",
    };
    totals.planned += flow.plannedQuantity ?? 0;
    totals.pendingFromBoxes += sc.pendingFromBoxes ?? 0;
    totals.received += sc.received ?? 0;
    totals.remaining += sc.remaining ?? 0;
    totals.transferred += sc.transferred ?? 0;
    totals.m1 += sc.m1Quantity ?? 0;
    totals.m2 += sc.m2Quantity ?? 0;
    totals.m3 += sc.m3Quantity ?? 0;
    totals.vm4 += sc.vm4Quantity ?? (sc as { m4Quantity?: number }).m4Quantity ?? 0;
  }

  return totals;
}

/**
 * Groups production flows by vendor purchase order.
 * @param flows - Vendor production flows (typically active SC flows)
 */
export function groupFlowsByOrder(
  flows: VendorProductionFlow[],
): VendorScOrderGroup[] {
  const map = new Map<string, VendorScOrderGroup>();

  for (const flow of flows) {
    const vpoId = getVpoId(flow) || getFlowId(flow);
    if (!map.has(vpoId)) {
      map.set(vpoId, {
        vpoId,
        vpoNumber: getVpoNumber(flow),
        vendorName: getVendorName(flow),
        flows: [],
        totals: {
          planned: 0,
          pendingFromBoxes: 0,
          received: 0,
          remaining: 0,
          transferred: 0,
          m1: 0,
          m2: 0,
          m3: 0,
          vm4: 0,
        },
      });
    }
    map.get(vpoId)!.flows.push(flow);
  }

  return Array.from(map.values())
    .map((group) => ({
      ...group,
      totals: sumScQuantities(group.flows),
    }))
    .sort((a, b) => a.vpoNumber.localeCompare(b.vpoNumber));
}

/**
 * Flattens flows into article rows with order context.
 * @param flows - Vendor production flows
 */
export function flattenFlowsToArticles(
  flows: VendorProductionFlow[],
): VendorScArticleRow[] {
  return flows
    .map((flow) => ({
      flow,
      vpoId: getVpoId(flow),
      vpoNumber: getVpoNumber(flow),
      vendorName: getVendorName(flow),
      vendorCode: getArticleVendorCode(flow),
      productName: getProductName(flow),
    }))
    .sort((a, b) => {
      const poCmp = a.vpoNumber.localeCompare(b.vpoNumber);
      if (poCmp !== 0) return poCmp;
      return a.productName.localeCompare(b.productName);
    });
}

/**
 * Status badge CSS class for a secondary checking flow row.
 * @param flow - Vendor production flow document
 */
export function statusBadgeClass(flow: VendorProductionFlow): string {
  const isCompleted =
    (flow.floorQuantities.secondaryChecking.completed ?? 0) > 0;
  if (isCompleted) {
    return "inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight bg-green-100 text-green-800";
  }
  return "inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight bg-red-100 text-red-800";
}
