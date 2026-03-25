import type {
  VendorPurchaseOrder,
  VendorReceivedLotDetail,
} from "@/shared/services/vendorPurchaseOrderService";
import type { VendorBox } from "@/shared/services/vendorBoxService";

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
): { productName: string; code: string }[] {
  const norm = lotNumber.trim().toUpperCase();
  const lot = (po.receivedLotDetails || []).find(
    (l) => (l.lotNumber || "").trim().toUpperCase() === norm
  );
  if (!lot?.poItems?.length) return [];
  const byId = new Map((po.poItems || []).map((it) => [String(it._id ?? it.id), it]));
  const out: { productName: string; code: string }[] = [];
  for (const p of lot.poItems) {
    const line = byId.get(String(p.poItem));
    if (!line) continue;
    const pid = line.productId;
    const code = typeof pid === "object" ? pid?.factoryCode || pid?.vendorCode || "" : "";
    const productName = line.productName || (typeof pid === "object" ? pid?.name || "" : "");
    if (productName || code) out.push({ productName, code });
  }
  const key = (x: { productName: string; code: string }) => `${x.productName}__${x.code}`;
  return out.filter((x, i, a) => a.findIndex((y) => key(y) === key(x)) === i);
}

/** Per-line product and received qty for a receipt lot (from `receivedLotDetails[].poItems`). */
export function getVendorLotReceivedLines(
  po: VendorPurchaseOrder,
  lot: VendorReceivedLotDetail
): { productName: string; quantity: number }[] {
  const byId = new Map((po.poItems || []).map((it) => [String(it._id ?? it.id), it]));
  const out: { productName: string; quantity: number }[] = [];
  for (const p of lot.poItems || []) {
    const line = byId.get(String(p.poItem));
    if (!line) continue;
    const pid = line.productId;
    const productName =
      line.productName || (typeof pid === "object" ? pid?.name || "" : "") || "";
    out.push({ productName, quantity: Number(p.receivedQuantity ?? 0) });
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
    columnsPerRow: 2,
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
