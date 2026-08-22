import type {
  VendorPackListEntry,
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
  /** Index into `packListDetails`; `null` means all PO lines (no packlist). */
  packlistIndex: number | null;
};

/**
 * Normalize packlist details which the API may return as a single object or an array.
 */
export function packlistToArray(
  pd: VendorPurchaseOrder["packListDetails"] | undefined
): VendorPackListEntry[] {
  if (!pd) return [];
  return Array.isArray(pd) ? pd : [pd];
}

/**
 * All PO line `_id`s that exist on the order.
 */
export function allPoLineIds(poItems: VendorPurchaseOrderItem[]): string[] {
  return poItems.map((it) => getPoLineItemId(it)).filter((id): id is string => !!id);
}

/**
 * PO line ids for a packlist. Empty `packlist.poItems` falls back to all PO lines (legacy).
 */
export function lineIdsForPacklist(
  packlist: VendorPackListEntry | undefined,
  poItems: VendorPurchaseOrderItem[]
): string[] {
  const fromPacklist = (packlist?.poItems || []).map(String).filter((id) => id.trim() !== "");
  if (fromPacklist.length === 0) return allPoLineIds(poItems);
  const valid = new Set(allPoLineIds(poItems));
  const resolved = fromPacklist.filter((id) => valid.has(id));
  return resolved.length > 0 ? resolved : fromPacklist;
}

/**
 * Filter PO lines to the given ids, preserving PO order. Empty `ids` returns all lines.
 */
export function poItemsForLineIds(
  poItems: VendorPurchaseOrderItem[],
  ids: string[]
): VendorPurchaseOrderItem[] {
  if (!ids.length) return poItems;
  const set = new Set(ids.map(String));
  return poItems.filter((it) => {
    const id = getPoLineItemId(it);
    return !!id && set.has(id);
  });
}

/**
 * PO lines shown on an invoice card (packlist-scoped when `packlistIndex` is set).
 */
export function visiblePoItemsForDraft(
  draft: VendorLotDraft,
  poItems: VendorPurchaseOrderItem[],
  packlists: VendorPackListEntry[]
): VendorPurchaseOrderItem[] {
  if (draft.packlistIndex != null && packlists[draft.packlistIndex]) {
    return poItemsForLineIds(poItems, lineIdsForPacklist(packlists[draft.packlistIndex], poItems));
  }
  const keys = Object.keys(draft.lineQty);
  if (keys.length) return poItemsForLineIds(poItems, keys);
  return poItems;
}

/**
 * Display label for a packlist (challan, then packing number, then index).
 */
export function packlistLabel(packlist: VendorPackListEntry | undefined, index: number): string {
  const challan = packlist?.challanNumber?.trim();
  if (challan) return challan;
  const packing = packlist?.packingNumber?.trim();
  if (packing) return packing;
  return `Packlist ${index + 1}`;
}

/**
 * Zeroed qty/box map keyed by PO line id.
 */
export function emptyLineQtyMap(poItems: VendorPurchaseOrderItem[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const it of poItems) {
    const id = getPoLineItemId(it);
    if (id) m[id] = 0;
  }
  return m;
}

/**
 * Empty invoice draft scoped to the given PO lines / packlist.
 */
export function emptyLotDraftForItems(
  items: VendorPurchaseOrderItem[],
  packlistIndex: number | null
): VendorLotDraft {
  return {
    lotNumber: "",
    numberOfBoxes: 1,
    lineQty: emptyLineQtyMap(items),
    lineBoxes: emptyLineQtyMap(items),
    isExisting: false,
    packlistIndex,
  };
}

/**
 * First unused packlist index, else the first packlist, else `null` (all PO lines).
 */
export function nextPacklistIndexForAdd(
  packlists: VendorPackListEntry[],
  drafts: VendorLotDraft[]
): number | null {
  if (!packlists.length) return null;
  const used = new Set(
    drafts.map((d) => d.packlistIndex).filter((i): i is number => i != null)
  );
  for (let i = 0; i < packlists.length; i++) {
    if (!used.has(i)) return i;
  }
  return 0;
}

/**
 * New invoice for "Add invoice": unused packlist if any, else first packlist, else all lines.
 */
export function createEmptyLotDraft(
  poItems: VendorPurchaseOrderItem[],
  packlists: VendorPackListEntry[],
  drafts: VendorLotDraft[]
): VendorLotDraft {
  const idx = nextPacklistIndexForAdd(packlists, drafts);
  const items =
    idx == null ? poItems : poItemsForLineIds(poItems, lineIdsForPacklist(packlists[idx], poItems));
  return emptyLotDraftForItems(items, idx);
}

/**
 * Rebuild qty/box maps when the user picks a different packlist on a new invoice.
 */
export function retargetDraftToPacklist(
  draft: VendorLotDraft,
  packlistIndex: number | null,
  poItems: VendorPurchaseOrderItem[],
  packlists: VendorPackListEntry[]
): VendorLotDraft {
  const items =
    packlistIndex == null
      ? poItems
      : poItemsForLineIds(poItems, lineIdsForPacklist(packlists[packlistIndex], poItems));
  return {
    ...draft,
    packlistIndex,
    lineQty: emptyLineQtyMap(items),
    lineBoxes: emptyLineQtyMap(items),
  };
}

/**
 * Match a saved lot to an unused packlist: exact article-set first, then containing set.
 */
function matchPacklistIndex(
  receivedIds: string[],
  packlists: VendorPackListEntry[],
  used: Set<number>,
  poItems: VendorPurchaseOrderItem[]
): number | null {
  if (!packlists.length) return null;
  const rec = new Set(receivedIds);
  for (let i = 0; i < packlists.length; i++) {
    if (used.has(i)) continue;
    const ids = lineIdsForPacklist(packlists[i], poItems);
    if (ids.length === rec.size && ids.every((id) => rec.has(id))) return i;
  }
  if (receivedIds.length === 0) return null;
  for (let i = 0; i < packlists.length; i++) {
    if (used.has(i)) continue;
    const idSet = new Set(lineIdsForPacklist(packlists[i], poItems));
    if (receivedIds.every((id) => idSet.has(id))) return i;
  }
  return null;
}

/**
 * Map a persisted lot onto the visible lines for its matched packlist (or received lines).
 */
function draftFromExistingLot(
  lot: VendorReceivedLotDetail,
  visibleItems: VendorPurchaseOrderItem[],
  packlistIndex: number | null
): VendorLotDraft {
  const lineQty = emptyLineQtyMap(visibleItems);
  const lineBoxes = emptyLineQtyMap(visibleItems);
  for (const p of lot.poItems || []) {
    if (!p.poItem) continue;
    lineQty[p.poItem] = Number(p.receivedQuantity || 0);
    lineBoxes[p.poItem] = Math.max(0, Number(p.receivedBoxes || 0));
  }
  return {
    lotNumber: lot.lotNumber || "",
    numberOfBoxes: Math.max(1, Number(lot.numberOfBoxes || 1)),
    lineQty,
    lineBoxes,
    isExisting: true,
    packlistIndex,
  };
}

/**
 * Seed drafts: one invoice per packlist, or restore saved lots and leftover packlists.
 */
export function buildVendorLotDrafts(po: VendorPurchaseOrder): VendorLotDraft[] {
  const items = po.poItems || [];
  const packlists = packlistToArray(po.packListDetails);
  const existing = po.receivedLotDetails;

  if (existing?.length) {
    const used = new Set<number>();
    const drafts: VendorLotDraft[] = existing.map((lot) => {
      const receivedIds = (lot.poItems || []).map((p) => String(p.poItem || "")).filter(Boolean);
      const idx = matchPacklistIndex(receivedIds, packlists, used, items);
      if (idx != null) used.add(idx);
      const visible =
        idx != null
          ? poItemsForLineIds(items, lineIdsForPacklist(packlists[idx], items))
          : poItemsForLineIds(items, receivedIds.length ? receivedIds : allPoLineIds(items));
      return draftFromExistingLot(lot, visible, idx);
    });
    packlists.forEach((p, i) => {
      if (used.has(i)) return;
      drafts.push(emptyLotDraftForItems(poItemsForLineIds(items, lineIdsForPacklist(p, items)), i));
    });
    return drafts;
  }

  if (packlists.length > 0) {
    return packlists.map((p, i) =>
      emptyLotDraftForItems(poItemsForLineIds(items, lineIdsForPacklist(p, items)), i)
    );
  }

  return [emptyLotDraftForItems(items, null)];
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

/**
 * Unused leftover packlist invoices (no number, no qty) are skipped on save.
 */
export function isUnusedNewDraft(d: VendorLotDraft): boolean {
  if (d.isExisting) return false;
  if (d.lotNumber.trim()) return false;
  const batch = Object.keys(d.lineQty).reduce((s, k) => s + Math.max(0, Number(d.lineQty[k] ?? 0)), 0);
  return batch <= 0;
}

/** Require invoice #, qty, and per-article boxes on filled drafts; skip blank leftover packlists. */
export function validateVendorLotDrafts(
  drafts: VendorLotDraft[],
  orderedByLine: Record<string, number>,
  poItems: VendorPurchaseOrderItem[]
): string | null {
  const hasFilled = drafts.some((d) => d.isExisting || !isUnusedNewDraft(d));
  if (!hasFilled) return "Enter received quantity for at least one invoice";
  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i];
    if (d.isExisting || isUnusedNewDraft(d)) continue;
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
  return drafts.filter((d) => d.isExisting || !isUnusedNewDraft(d)).map((d) => {
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
