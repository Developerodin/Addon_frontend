import type {
  VendorPurchaseOrder,
  VendorPurchaseOrderItem,
  VendorReceivedLotDetail,
  VendorReceivedLotPoItem,
} from "@/shared/services/vendorPurchaseOrderService";
import { getPoLineItemId } from "./vendorPacklistHelpers";

/** One receipt lot being edited in the modal (yarn-style multi-lot). */
export type VendorLotDraft = {
  lotNumber: string;
  numberOfBoxes: number;
  /** PO line id → qty received in this lot */
  lineQty: Record<string, number>;
  /** PO line id → boxes received in this lot */
  lineBoxes: Record<string, number>;
  /** true when this lot was loaded from the API (already saved) — should be read-only in UI */
  isExisting?: boolean;
};

export function emptyLineQtyMap(poItems: VendorPurchaseOrderItem[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const it of poItems) {
    const id = getPoLineItemId(it);
    if (id) m[id] = 0;
  }
  return m;
}

/** Seed drafts from API lots, or one empty row. */
export function buildVendorLotDrafts(po: VendorPurchaseOrder): VendorLotDraft[] {
  const items = po.poItems || [];
  const existing = po.receivedLotDetails;
  if (existing?.length) {
    return existing.map((lot) => {
      const lineQty = emptyLineQtyMap(items);
      const lineBoxes = emptyLineQtyMap(items);
      for (const p of lot.poItems || []) {
        if (p.poItem) lineQty[p.poItem] = Number(p.receivedQuantity || 0);
        if (p.poItem) lineBoxes[p.poItem] = Math.max(0, Number(p.receivedBoxes || 0));
      }
      return {
        lotNumber: lot.lotNumber || "",
        numberOfBoxes: Math.max(1, Number(lot.numberOfBoxes || 1)),
        lineQty,
        lineBoxes,
        isExisting: true,
      };
    });
  }
  return [{ lotNumber: "", numberOfBoxes: 1, lineQty: emptyLineQtyMap(items), lineBoxes: emptyLineQtyMap(items), isExisting: false }];
}

export function orderedQtyByLine(poItems: VendorPurchaseOrderItem[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const it of poItems) {
    const id = getPoLineItemId(it);
    if (id) m[id] = Number(it.quantity || 0);
  }
  return m;
}

/** Max qty this line can take in `lotIndex` given other drafts. */
export function maxQtyForLineInLot(
  lineId: string,
  lotIndex: number,
  drafts: VendorLotDraft[],
  orderedByLine: Record<string, number>
): number {
  let sumOther = 0;
  drafts.forEach((lot, idx) => {
    if (idx === lotIndex) return;
    sumOther += Number(lot.lineQty[lineId] ?? 0);
  });
  const ordered = orderedByLine[lineId] ?? 0;
  return Math.max(0, ordered - sumOther);
}

/** Total boxes for an invoice = sum of per-article boxes (single source of truth). */
export function totalBoxesForDraft(draft: VendorLotDraft): number {
  return Object.keys(draft.lineBoxes).reduce((s, k) => s + Math.max(0, Number(draft.lineBoxes[k] ?? 0)), 0);
}

export function validateVendorLotDrafts(
  drafts: VendorLotDraft[],
  orderedByLine: Record<string, number>,
  poItems: VendorPurchaseOrderItem[]
): string | null {
  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i];
    if (d.isExisting) continue;
    if (!d.lotNumber.trim()) return `Invoice ${i + 1}: invoice number is required`;
    const batch = Object.keys(d.lineQty).reduce((s, k) => s + Math.max(0, Number(d.lineQty[k] ?? 0)), 0);
    if (batch <= 0) return `Invoice ${i + 1}: enter received quantity for at least one line`;
    // Per-article boxes are authoritative: every received article needs at least one box.
    for (const lineId of Object.keys(d.lineQty)) {
      const qty = Math.max(0, Number(d.lineQty[lineId] ?? 0));
      const boxes = Math.max(0, Number(d.lineBoxes[lineId] ?? 0));
      if (qty > 0 && boxes < 1) {
        const name = poItems.find((it) => getPoLineItemId(it) === lineId)?.productName || "an article";
        return `Invoice ${i + 1}: enter number of boxes for ${name}`;
      }
    }
    if (totalBoxesForDraft(d) < 1) return `Invoice ${i + 1}: total boxes must be at least 1`;
  }
  // Note: over-receipt is intentionally allowed — vendors sometimes ship more than ordered,
  // so we no longer block received qty from exceeding the ordered qty.
  return null;
}

export function draftsToReceivedLotDetails(drafts: VendorLotDraft[]): VendorReceivedLotDetail[] {
  return drafts.map((d) => {
    const poItems: VendorReceivedLotPoItem[] = [];
    for (const [poItem, q] of Object.entries(d.lineQty)) {
      const n = Math.max(0, Number(q));
      const receivedBoxes = Math.max(0, Number(d.lineBoxes[poItem] ?? 0));
      if (n > 0) poItems.push({ poItem, receivedQuantity: n, receivedBoxes });
    }
    /** Vendor PO Joi schema: catalog lots use `totalUnits` (yarn-only fields like extra weight are omitted). */
    const totalUnits = poItems.reduce((s, p) => s + Number(p.receivedQuantity || 0), 0);
    /** Lot-level box count is derived from per-article boxes (single source of truth). */
    const numberOfBoxes = totalBoxesForDraft(d);
    return {
      lotNumber: d.lotNumber.trim(),
      numberOfBoxes,
      totalUnits,
      poItems,
      status: "lot_pending",
    };
  });
}

export function totalReceivedFromDrafts(drafts: VendorLotDraft[]): number {
  return drafts.reduce(
    (sum, lot) =>
      sum + Object.keys(lot.lineQty).reduce((s, k) => s + Math.max(0, Number(lot.lineQty[k] ?? 0)), 0),
    0
  );
}
