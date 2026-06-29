import type {
  VendorPurchaseOrder,
  VendorReceivedLotDetail,
} from "@/shared/services/vendorPurchaseOrderService";
import type { VendorBox } from "@/shared/services/vendorBoxService";
import { vendorCodeFromPoLineItem } from "../../components/vendorPacklistHelpers";

/** PO line option resolved from a receipt lot for box assignment UI. */
export type VendorPoLotLineOption = {
  productName: string;
  code: string;
  type: string;
  color: string;
  pattern: string;
};

/** Received line row with article attributes for display tables. */
export type VendorLotReceivedLineRow = {
  productName: string;
  quantity: number;
  boxes: number;
  vendorCode: string;
  type: string;
  color: string;
  pattern: string;
};

/** Max pcs per vendor box — blocks barcode accidentally saved as units. */
export const MAX_VENDOR_BOX_UNITS = 100_000;

/** Sanitize numeric input for weight/qty fields. */
export function validateVendorProcessNum(value: string, allowDec = true): string {
  if (value === "") return "";
  return allowDec ? value.replace(/[^\d.]/g, "").replace(/^([^.]*\.)[^.]*\./, "$1") : value.replace(/[^\d]/g, "");
}

export function getVendorBoxId(box: VendorBox): string {
  return String(box._id || box.id || box.boxId || "");
}

/** Product options from PO lines referenced by a receipt lot (for dropdowns). */
export function getVendorPoItemOptionsForLot(
  po: VendorPurchaseOrder,
  lotNumber: string
): VendorPoLotLineOption[] {
  const norm = lotNumber.trim().toUpperCase();
  const lot = (po.receivedLotDetails || []).find(
    (l) => (l.lotNumber || "").trim().toUpperCase() === norm
  );
  if (!lot?.poItems?.length) return [];
  const byId = new Map((po.poItems || []).map((it) => [String(it._id ?? it.id), it]));
  const out: VendorPoLotLineOption[] = [];
  for (const p of lot.poItems) {
    const line = byId.get(String(p.poItem));
    if (!line) continue;
    const pid = line.productId;
    const productName = line.productName || (typeof pid === "object" ? pid?.name || "" : "");
    const code = vendorCodeFromPoLineItem(line);
    if (productName || code) {
      out.push({
        productName,
        code,
        type: line.type?.trim() || "",
        color: line.color?.trim() || "",
        pattern: line.pattern?.trim() || "",
      });
    }
  }
  const key = (x: VendorPoLotLineOption) =>
    `${x.productName}__${x.code}__${x.type}__${x.color}__${x.pattern}`;
  return out.filter((x, i, a) => a.findIndex((y) => key(y) === key(x)) === i);
}

/**
 * Resolve article attributes from PO lines by product name (and optional lot).
 * @param po - Purchase order with populated lines
 * @param productName - Product display name on the box
 * @param lotNumber - Optional invoice lot for scoped lookup
 */
export function resolveVendorBoxLineAttrsFromPo(
  po: VendorPurchaseOrder,
  productName: string,
  lotNumber?: string
): Pick<VendorPoLotLineOption, "code" | "type" | "color" | "pattern"> {
  const norm = productName.trim().toLowerCase();
  if (!norm) {
    return { code: "", type: "", color: "", pattern: "" };
  }
  if (lotNumber?.trim()) {
    const opt = getVendorPoItemOptionsForLot(po, lotNumber).find(
      (row) => row.productName.trim().toLowerCase() === norm
    );
    if (opt) {
      return { code: opt.code, type: opt.type, color: opt.color, pattern: opt.pattern };
    }
  }
  const line = (po.poItems || []).find((it) => {
    const pid = it.productId;
    const name =
      it.productName?.trim().toLowerCase() ||
      (typeof pid === "object" ? String(pid?.name || "").trim().toLowerCase() : "");
    return name === norm;
  });
  if (!line) {
    return { code: "", type: "", color: "", pattern: "" };
  }
  return {
    code: vendorCodeFromPoLineItem(line),
    type: line.type?.trim() || "",
    color: line.color?.trim() || "",
    pattern: line.pattern?.trim() || "",
  };
}

/**
 * Resolve a box's own article (product + attributes) from the PO.
 * Prefers the box's persisted `vendorPoItemId` (exact PO line), then falls back to its
 * `productName`. This keeps each box bound to the article it was created for instead of
 * defaulting every box to the lot's first article.
 * @param po - Purchase order with populated lines
 * @param box - The vendor box
 */
export function resolveVendorBoxArticleFromPo(
  po: VendorPurchaseOrder,
  box: VendorBox
): VendorPoLotLineOption {
  const empty: VendorPoLotLineOption = { productName: "", code: "", type: "", color: "", pattern: "" };
  const lineFromId = box.vendorPoItemId
    ? (po.poItems || []).find((it) => String(it._id ?? it.id) === String(box.vendorPoItemId))
    : undefined;
  if (lineFromId) {
    const pid = lineFromId.productId;
    return {
      productName: lineFromId.productName || (typeof pid === "object" ? pid?.name || "" : "") || box.productName || "",
      code: vendorCodeFromPoLineItem(lineFromId),
      type: lineFromId.type?.trim() || "",
      color: lineFromId.color?.trim() || "",
      pattern: lineFromId.pattern?.trim() || "",
    };
  }
  const name = box.productName?.trim() || "";
  if (!name) return empty;
  const attrs = resolveVendorBoxLineAttrsFromPo(po, name, box.lotNumber || undefined);
  return { productName: name, ...attrs };
}

/** Per-line product and received qty for a receipt lot (from `receivedLotDetails[].poItems`). */
export function getVendorLotReceivedLines(
  po: VendorPurchaseOrder,
  lot: VendorReceivedLotDetail
): VendorLotReceivedLineRow[] {
  const byId = new Map((po.poItems || []).map((it) => [String(it._id ?? it.id), it]));
  const out: VendorLotReceivedLineRow[] = [];
  for (const p of lot.poItems || []) {
    const line = byId.get(String(p.poItem));
    if (!line) continue;
    const pid = line.productId;
    const productName =
      line.productName || (typeof pid === "object" ? pid?.name || "" : "") || "";
    out.push({
      productName,
      quantity: Number(p.receivedQuantity ?? 0),
      boxes: Math.max(0, Number(p.receivedBoxes ?? 0)),
      vendorCode: vendorCodeFromPoLineItem(line),
      type: line.type?.trim() || "",
      color: line.color?.trim() || "",
      pattern: line.pattern?.trim() || "",
    });
  }
  return out;
}

/** Default ZPL label settings — aligned with yarn process `50mm * 70mm` vertical preset. */
export function defaultVendorLabelPrintSettings() {
  return {
    paperWidth: 398,
    paperHeight: 558,
    orientation: "vertical" as const,
    labelsPerPage: 1,
    columnsPerRow: 1,
    firstLabelTopMargin: 0,
    showCutLines: false,
    qrCodeSize: 5,
    titleFontSize: 20,
    detailsFontSize: 20,
    boxIdFontSize: 20,
    yarnFontSize: 20,
    supplierFontSize: 20,
    shadeLotFontSize: 20,
    barcodeHeight: 100,
    barcodeWidth: 3,
  };
}

export function groupVendorBoxesByLot(
  boxes: VendorBox[],
  boxData: Record<
    string,
    { lotNumber?: string; productName?: string }
  >
): { grouped: Record<string, VendorBox[]>; sortedLots: string[]; unassigned: VendorBox[] } {
  const grouped: Record<string, VendorBox[]> = {};
  const unassigned: VendorBox[] = [];
  for (const box of boxes) {
    const id = getVendorBoxId(box);
    const lot = boxData[id]?.lotNumber?.trim() || box.lotNumber?.trim() || "";
    if (lot) {
      if (!grouped[lot]) grouped[lot] = [];
      grouped[lot].push(box);
    } else unassigned.push(box);
  }
  const sortedLots = Object.keys(grouped).sort((a, b) => {
    const an = parseInt(a.replace(/\D/g, ""), 10) || 0;
    const bn = parseInt(b.replace(/\D/g, ""), 10) || 0;
    if (an !== bn) return an - bn;
    return a.localeCompare(b);
  });
  return { grouped, sortedLots, unassigned };
}
