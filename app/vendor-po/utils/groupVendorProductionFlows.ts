import type {
  BrandingFloorQuantity,
  DispatchFloorQuantity,
  FinalCheckingFloorQuantity,
  VendorProductionFlow,
} from "@/shared/services/vendorProductionFlowService";
import { getVendorFlowProductFactoryCode } from "@/app/vendor-po/utils/getVendorProductFactoryCode";
import { getDispatchTransferableRemaining } from "../dispatch/dispatchTransferUtils";
import { getVendorFinalCheckingRemaining } from "../final-checking/finalCheckingRemaining";

/** Flat article row with order context. */
export interface VendorFlowArticleRow {
  flow: VendorProductionFlow;
  vpoId: string;
  vpoNumber: string;
  vendorName: string;
  vendorCode: string;
  productName: string;
  /** Catalog factory code (article number) for product image lookup. */
  factoryCode: string;
}

/** Vendor PO order group with nested article flows. */
export interface VendorFlowOrderGroup<TTotals> {
  vpoId: string;
  vpoNumber: string;
  vendorName: string;
  flows: VendorProductionFlow[];
  totals: TTotals;
}

/** Aggregated branding quantity totals. */
export interface BrandingQuantityTotals {
  received: number;
  completed: number;
  remaining: number;
  transferred: number;
}

/** Aggregated final checking quantity totals. */
export interface FinalCheckingQuantityTotals {
  received: number;
  remaining: number;
  pendingFromBoxes: number;
  m1: number;
  m2: number;
  m4: number;
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
 * Resolves article vendor code from a production flow product.
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
 * Resolves catalog factory code (article number) from a vendor production flow.
 * @param flow - Vendor production flow document
 */
export function getProductFactoryCode(flow: VendorProductionFlow): string {
  return getVendorFlowProductFactoryCode(flow);
}

/**
 * Resolves flow document id (supports id or _id from API).
 * @param flow - Vendor production flow document
 */
export function getFlowId(
  flow: VendorProductionFlow | Record<string, unknown>,
): string {
  const f = flow as VendorProductionFlow & { _id?: string };
  return f.id || f._id || "";
}

/**
 * Groups production flows by vendor purchase order.
 * @param flows - Vendor production flows
 * @param sumTotals - Aggregator for group totals
 */
export function groupFlowsByOrder<TTotals>(
  flows: VendorProductionFlow[],
  sumTotals: (flows: VendorProductionFlow[]) => TTotals,
): VendorFlowOrderGroup<TTotals>[] {
  const map = new Map<string, VendorFlowOrderGroup<TTotals>>();

  for (const flow of flows) {
    const vpoId = getVpoId(flow) || getFlowId(flow);
    if (!map.has(vpoId)) {
      map.set(vpoId, {
        vpoId,
        vpoNumber: getVpoNumber(flow),
        vendorName: getVendorName(flow),
        flows: [],
        totals: sumTotals([]),
      });
    }
    map.get(vpoId)!.flows.push(flow);
  }

  return Array.from(map.values())
    .map((group) => ({
      ...group,
      totals: sumTotals(group.flows),
    }))
    .sort((a, b) => a.vpoNumber.localeCompare(b.vpoNumber));
}

/**
 * Flattens flows into article rows with order context.
 * @param flows - Vendor production flows
 */
export function flattenFlowsToArticles(
  flows: VendorProductionFlow[],
): VendorFlowArticleRow[] {
  return flows
    .map((flow) => ({
      flow,
      vpoId: getVpoId(flow),
      vpoNumber: getVpoNumber(flow),
      vendorName: getVendorName(flow),
      vendorCode: getArticleVendorCode(flow),
      productName: getProductName(flow),
      factoryCode: getProductFactoryCode(flow),
    }))
    .sort((a, b) => {
      const poCmp = a.vpoNumber.localeCompare(b.vpoNumber);
      if (poCmp !== 0) return poCmp;
      return a.productName.localeCompare(b.productName);
    });
}

/**
 * Whether a flow has active branding work.
 * @param flow - Vendor production flow document
 */
export function isActiveBrandingFlow(flow: VendorProductionFlow): boolean {
  const br = flow.floorQuantities?.branding;
  if (!br) return false;
  return (br.received ?? 0) > 0 || (br.remaining ?? 0) > 0;
}

/**
 * Filters flows to those with active branding quantities.
 * @param flows - All vendor production flows
 */
export function filterActiveBrandingFlows(
  flows: VendorProductionFlow[],
): VendorProductionFlow[] {
  return flows.filter(isActiveBrandingFlow);
}

/**
 * Whether branding still has transferable / incomplete quantity on this floor.
 * @param flow - Vendor production flow document
 */
export function hasBrandingWorkRemaining(flow: VendorProductionFlow): boolean {
  const br = flow.floorQuantities?.branding;
  return (br?.remaining ?? 0) > 0;
}

/**
 * Whether this flow has any branding floor history (received or forwarded).
 * @param flow - Vendor production flow document
 */
export function hasBrandingFloorHistory(flow: VendorProductionFlow): boolean {
  const br = flow.floorQuantities?.branding;
  if (!br) return false;
  return (br.received ?? 0) > 0 || (br.transferred ?? 0) > 0;
}

/**
 * Filters flows for branding floor UI: open work only, or full history when showAll.
 * @param flows - Flows from list API
 * @param showAll - When true, include completed batches (0 remaining)
 */
export function filterBrandingFlowsForView(
  flows: VendorProductionFlow[],
  showAll: boolean,
): VendorProductionFlow[] {
  if (showAll) return flows.filter(hasBrandingFloorHistory);
  return flows.filter((f) => hasBrandingFloorHistory(f) && hasBrandingWorkRemaining(f));
}

/**
 * Whether re-boarding still has transferable / incomplete quantity on this floor.
 * @param flow - Vendor production flow document
 */
export function hasReBoardingWorkRemaining(flow: VendorProductionFlow): boolean {
  const rb = flow.floorQuantities?.reBoarding;
  return (rb?.remaining ?? 0) > 0;
}

/**
 * Whether this flow has any re-boarding floor history (received or forwarded).
 * @param flow - Vendor production flow document
 */
export function hasReBoardingFloorHistory(flow: VendorProductionFlow): boolean {
  const rb = flow.floorQuantities?.reBoarding;
  if (!rb) return false;
  return (rb.received ?? 0) > 0 || (rb.transferred ?? 0) > 0;
}

/**
 * Filters flows for re-boarding floor UI: open work only, or full history when showAll.
 * @param flows - Flows from list API
 * @param showAll - When true, include completed batches (0 remaining)
 */
export function filterReBoardingFlowsForView(
  flows: VendorProductionFlow[],
  showAll: boolean,
): VendorProductionFlow[] {
  if (showAll) return flows.filter(hasReBoardingFloorHistory);
  return flows.filter(
    (f) => hasReBoardingFloorHistory(f) && hasReBoardingWorkRemaining(f),
  );
}

/**
 * Sums re-boarding quantities across flows.
 * @param flows - Flows to aggregate
 */
export function sumReBoardingQuantities(
  flows: VendorProductionFlow[],
): BrandingQuantityTotals {
  const totals: BrandingQuantityTotals = {
    received: 0,
    completed: 0,
    remaining: 0,
    transferred: 0,
  };

  for (const flow of flows) {
    const rb: BrandingFloorQuantity = flow.floorQuantities?.reBoarding ?? {
      received: 0,
      completed: 0,
      remaining: 0,
      transferred: 0,
    };
    totals.received += rb.received ?? 0;
    totals.completed += rb.completed ?? 0;
    totals.remaining += rb.remaining ?? 0;
    totals.transferred += rb.transferred ?? 0;
  }

  return totals;
}

/**
 * Sums branding quantities across flows.
 * @param flows - Flows to aggregate
 */
export function sumBrandingQuantities(
  flows: VendorProductionFlow[],
): BrandingQuantityTotals {
  const totals: BrandingQuantityTotals = {
    received: 0,
    completed: 0,
    remaining: 0,
    transferred: 0,
  };

  for (const flow of flows) {
    const br: BrandingFloorQuantity = flow.floorQuantities?.branding ?? {
      received: 0,
      completed: 0,
      remaining: 0,
      transferred: 0,
    };
    totals.received += br.received ?? 0;
    totals.completed += br.completed ?? 0;
    totals.remaining += br.remaining ?? 0;
    totals.transferred += br.transferred ?? 0;
  }

  return totals;
}

/**
 * Whether a flow has active final checking work.
 * @param flow - Vendor production flow document
 */
export function isActiveFinalCheckingFlow(flow: VendorProductionFlow): boolean {
  const fc = flow.floorQuantities?.finalChecking;
  if (!fc) return false;
  return (
    (fc.received ?? 0) > 0 ||
    getVendorFinalCheckingRemaining(fc) > 0 ||
    (fc.pendingFromBoxes ?? 0) > 0
  );
}

/**
 * Filters flows to those with active final checking quantities.
 * @param flows - All vendor production flows
 */
export function filterActiveFinalCheckingFlows(
  flows: VendorProductionFlow[],
): VendorProductionFlow[] {
  return flows.filter(isActiveFinalCheckingFlow);
}

/**
 * Whether final checking still has work (remaining qty or boxes pending scan).
 * @param flow - Vendor production flow document
 */
export function hasFinalCheckingWorkRemaining(flow: VendorProductionFlow): boolean {
  const fc = flow.floorQuantities?.finalChecking;
  return getVendorFinalCheckingRemaining(fc) > 0 || (fc?.pendingFromBoxes ?? 0) > 0;
}

/**
 * Whether this flow has any final checking floor history.
 * @param flow - Vendor production flow document
 */
export function hasFinalCheckingFloorHistory(flow: VendorProductionFlow): boolean {
  const fc = flow.floorQuantities?.finalChecking;
  if (!fc) return false;
  return (
    (fc.received ?? 0) > 0 ||
    (fc.transferred ?? 0) > 0 ||
    (fc.pendingFromBoxes ?? 0) > 0
  );
}

/**
 * Filters flows for final checking floor UI.
 * @param flows - Flows from list API
 * @param showAll - When true, include completed batches
 */
export function filterFinalCheckingFlowsForView(
  flows: VendorProductionFlow[],
  showAll: boolean,
): VendorProductionFlow[] {
  if (showAll) return flows.filter(hasFinalCheckingFloorHistory);
  return flows.filter(
    (f) => hasFinalCheckingFloorHistory(f) && hasFinalCheckingWorkRemaining(f),
  );
}

/**
 * Sums final checking quantities across flows.
 * @param flows - Flows to aggregate
 */
export function sumFinalCheckingQuantities(
  flows: VendorProductionFlow[],
): FinalCheckingQuantityTotals {
  const totals: FinalCheckingQuantityTotals = {
    received: 0,
    remaining: 0,
    pendingFromBoxes: 0,
    m1: 0,
    m2: 0,
    m4: 0,
  };

  for (const flow of flows) {
    const fc: FinalCheckingFloorQuantity = flow.floorQuantities?.finalChecking ?? {
      received: 0,
      completed: 0,
      remaining: 0,
      transferred: 0,
      m1Quantity: 0,
      m2Quantity: 0,
      m3Quantity: 0,
      m4Quantity: 0,
      m1Transferred: 0,
      m1Remaining: 0,
      repairStatus: "NOT_REQUIRED",
    };
    totals.received += fc.received ?? 0;
    totals.remaining += getVendorFinalCheckingRemaining(fc);
    totals.pendingFromBoxes += fc.pendingFromBoxes ?? 0;
    totals.m1 += fc.m1Quantity ?? 0;
    totals.m2 += fc.m2Quantity ?? 0;
    totals.m4 += fc.m4Quantity ?? 0;
  }

  return totals;
}

/** Aggregated dispatch quantity totals. */
export interface DispatchQuantityTotals {
  fcReceived: number;
  dispReceived: number;
  whStaged: number;
  remaining: number;
}

/**
 * Whether a flow has active dispatch work or inbound from FC.
 * @param flow - Vendor production flow document
 */
export function isActiveDispatchFlow(flow: VendorProductionFlow): boolean {
  const fc = flow.floorQuantities?.finalChecking;
  const disp = flow.floorQuantities?.dispatch;
  if ((disp?.received ?? 0) > 0) return true;
  if (getDispatchTransferableRemaining(flow) > 0) return true;
  if ((fc?.received ?? 0) > 0) return true;
  return false;
}

/**
 * Filters flows to those with dispatch-relevant quantities.
 * @param flows - All vendor production flows
 */
export function filterActiveDispatchFlows(
  flows: VendorProductionFlow[],
): VendorProductionFlow[] {
  return flows.filter(isActiveDispatchFlow);
}

/**
 * Whether this flow has dispatch-floor history (received, WH staged, or FC inbound).
 * @param flow - Vendor production flow document
 */
export function hasDispatchFloorHistory(flow: VendorProductionFlow): boolean {
  const fc = flow.floorQuantities?.finalChecking;
  const disp = flow.floorQuantities?.dispatch;
  return (
    (disp?.received ?? 0) > 0 ||
    (disp?.transferred ?? 0) > 0 ||
    (fc?.received ?? 0) > 0
  );
}

/**
 * Whether dispatch still has quantity to move to warehouse.
 * @param flow - Vendor production flow document
 */
export function hasDispatchWorkRemaining(flow: VendorProductionFlow): boolean {
  return getDispatchTransferableRemaining(flow) > 0;
}

/**
 * Filters flows for dispatch floor UI.
 * @param flows - Flows from list API
 * @param showAll - When true, include completed / fully staged batches
 */
export function filterDispatchFlowsForView(
  flows: VendorProductionFlow[],
  showAll: boolean,
): VendorProductionFlow[] {
  if (showAll) return flows.filter(hasDispatchFloorHistory);
  return flows.filter((f) => hasDispatchFloorHistory(f) && hasDispatchWorkRemaining(f));
}

/**
 * Sums dispatch-related quantities across flows.
 * @param flows - Flows to aggregate
 */
export function sumDispatchQuantities(
  flows: VendorProductionFlow[],
): DispatchQuantityTotals {
  const totals: DispatchQuantityTotals = {
    fcReceived: 0,
    dispReceived: 0,
    whStaged: 0,
    remaining: 0,
  };

  for (const flow of flows) {
    const fc = flow.floorQuantities?.finalChecking;
    const disp: DispatchFloorQuantity = flow.floorQuantities?.dispatch ?? {
      received: 0,
      completed: 0,
      remaining: 0,
      transferred: 0,
    };
    totals.fcReceived += fc?.received ?? 0;
    totals.dispReceived += disp.received ?? 0;
    totals.whStaged += disp.transferred ?? 0;
    totals.remaining += getDispatchTransferableRemaining(flow);
  }

  return totals;
}
