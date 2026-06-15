import type { VendorProductionFlow } from "@/shared/services/vendorProductionFlowService";

/** Optional draft M1–M4 totals while the process drawer form is being edited. */
export type ScDraftTotals = {
  m1?: number;
  m2?: number;
  m3?: number;
  m4?: number;
};

/** Quantity reconciliation row for secondary checking process drawer. */
export interface ScReconciliation {
  ordered: number;
  expected: number;
  scanAccepted: number;
  classified: number;
  /** Unclassified within scan-accepted qty (preview uses draft M1–M4 when provided). */
  remaining: number;
  pendingBoxScan: number;
  variancePreview: number;
}

/**
 * Resolves lot expected qty from VPO receivedLotDetails for a flow.
 * @param flow - Populated vendor production flow
 */
export function resolveLotExpectedQty(flow: VendorProductionFlow): number {
  const sc = flow.floorQuantities.secondaryChecking;
  let expected = 0;

  const vpo = flow.vendorPurchaseOrder;
  const product = flow.product;
  const productId =
    typeof product === "object"
      ? product?.id || (product as { _id?: string })?._id
      : product;

  if (!vpo || typeof vpo !== "object") return expected;

  const vpoExt = vpo as {
    poItems?: Array<{
      id?: string;
      _id?: string;
      productId?: string;
    }>;
    receivedLotDetails?: Array<{
      lotNumber: string;
      poItems?: Array<{ poItem?: string; receivedQuantity?: number }>;
    }>;
  };

  const poItem = vpoExt.poItems?.find(
    (it) => String(it.productId) === String(productId),
  );
  const poItemId = poItem?.id || poItem?._id;

  const lotSet = new Set(
    (sc.receivedData || [])
      .map((r) => r.lotNumber?.trim())
      .filter(Boolean) as string[],
  );
  if (lotSet.size === 0 && flow.referenceCode?.trim()) {
    lotSet.add(flow.referenceCode.trim());
  }

  (vpoExt.receivedLotDetails || []).forEach((lot) => {
    if (lotSet.size > 0 && !lotSet.has(lot.lotNumber)) return;
    const line = (lot.poItems || []).find(
      (pi) => String(pi.poItem) === String(poItemId),
    );
    expected += line?.receivedQuantity ?? 0;
  });

  return expected;
}

/**
 * Resolves expected vs verified quantities for the process drawer reconciliation table.
 * @param flow - Populated vendor production flow
 * @param draftTotals - Optional in-form M1–M4 preview (before save)
 */
export function resolveScReconciliation(
  flow: VendorProductionFlow,
  draftTotals?: ScDraftTotals,
): ScReconciliation {
  const sc = flow.floorQuantities.secondaryChecking;
  const resolveDraft = (key: "m1" | "m2" | "m3" | "m4", saved: number) => {
    const raw = draftTotals?.[key];
    if (raw === undefined || raw === null) return saved;
    const n = Math.round(Number(raw));
    return Number.isFinite(n) && n >= 0 ? n : saved;
  };
  const m1 = resolveDraft("m1", sc.m1Quantity ?? 0);
  const m2 = resolveDraft("m2", sc.m2Quantity ?? 0);
  const m3 = resolveDraft("m3", sc.m3Quantity ?? 0);
  const m4 = resolveDraft("m4", sc.m4Quantity ?? 0);
  const classified = m1 + m2 + m3 + m4;
  const scanAccepted = sc.received ?? 0;
  const pendingBoxScan = sc.pendingFromBoxes ?? 0;
  const remaining =
    draftTotals != null
      ? Math.max(0, scanAccepted - classified)
      : (sc.remaining ?? Math.max(0, scanAccepted - classified));

  let ordered = flow.plannedQuantity ?? 0;
  let expected = 0;

  const vpo = flow.vendorPurchaseOrder;
  const product = flow.product;
  const productId =
    typeof product === "object"
      ? product?.id || (product as { _id?: string })?._id
      : product;

  if (vpo && typeof vpo === "object") {
    const vpoExt = vpo as {
      poItems?: Array<{
        id?: string;
        _id?: string;
        productId?: string;
        quantity?: number;
      }>;
      receivedLotDetails?: Array<{
        lotNumber: string;
        poItems?: Array<{ poItem?: string; receivedQuantity?: number }>;
      }>;
    };

    const poItem = vpoExt.poItems?.find(
      (it) => String(it.productId) === String(productId),
    );
    const poItemId = poItem?.id || poItem?._id;
    if (poItem?.quantity != null) ordered = poItem.quantity;

    const lotSet = new Set(
      (sc.receivedData || [])
        .map((r) => r.lotNumber?.trim())
        .filter(Boolean) as string[],
    );
    if (lotSet.size === 0 && flow.referenceCode?.trim()) {
      lotSet.add(flow.referenceCode.trim());
    }

    (vpoExt.receivedLotDetails || []).forEach((lot) => {
      if (lotSet.size > 0 && !lotSet.has(lot.lotNumber)) return;
      const line = (lot.poItems || []).find(
        (pi) => String(pi.poItem) === String(poItemId),
      );
      expected += line?.receivedQuantity ?? 0;
    });
  }

  if (expected <= 0) expected = scanAccepted > 0 ? scanAccepted : ordered;

  return {
    ordered,
    expected,
    scanAccepted,
    classified,
    remaining,
    pendingBoxScan,
    variancePreview: classified - expected,
  };
}

/**
 * Sum of saved M1–M4 on secondary checking (verified qty at issue time).
 * @param flow - Vendor production flow
 */
export function savedVerifiedQty(flow: VendorProductionFlow): number {
  const sc = flow.floorQuantities.secondaryChecking;
  return (
    (sc.m1Quantity ?? 0) +
    (sc.m2Quantity ?? 0) +
    (sc.m3Quantity ?? 0) +
    (sc.m4Quantity ?? 0)
  );
}
