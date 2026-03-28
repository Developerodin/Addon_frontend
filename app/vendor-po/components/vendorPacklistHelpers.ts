import type {
  VendorPurchaseOrder,
  VendorPurchaseOrderItem,
  VendorPackListEntry,
  VendorPackListFile,
  VendorReceivedLotDetail,
} from "@/shared/services/vendorPurchaseOrderService";

/** Legacy APIs may still return `totalWeight` on packlist rows. */
export function packlistRowTotalUnits(item: VendorPackListEntry): number {
  const raw = item as VendorPackListEntry & { totalWeight?: number };
  return Number(raw.totalUnits ?? raw.totalWeight ?? 0);
}

/** Legacy APIs may still return `totalWeight` on receipt lots. */
export function receivedLotTotalUnits(lot: VendorReceivedLotDetail): number {
  const raw = lot as VendorReceivedLotDetail & { totalWeight?: number };
  return Number(raw.totalUnits ?? raw.totalWeight ?? 0);
}

/** Backend may return `id` or `_id` for embedded PO lines. */
export function getPoLineItemId(item: VendorPurchaseOrderItem): string | undefined {
  const raw = item._id ?? item.id;
  if (raw == null || String(raw).trim() === "") return undefined;
  return String(raw);
}

/** Vendor article code from line snapshot or populated `productId`. */
export function vendorCodeFromPoLineItem(item: VendorPurchaseOrderItem): string {
  if (item.vendorCode?.trim()) return item.vendorCode.trim();
  const pid = item.productId;
  if (typeof pid === "object" && pid !== null) {
    return String(pid.vendorCode ?? "").trim();
  }
  return "";
}

/** Resolve a PO line `_id` from packlist `poItems[]` to a product display name using hydrated `po.poItems`. */
export function productNameForPoLineId(
  lineId: string,
  poItems: VendorPurchaseOrderItem[] | undefined
): string {
  if (!poItems?.length) return lineId;
  const id = String(lineId);
  for (const item of poItems) {
    const lid = getPoLineItemId(item);
    if (lid != null && String(lid) === id) {
      const pid = item.productId;
      const name =
        item.productName || (typeof pid === "object" && pid ? String((pid as { name?: string }).name || "") : "") || "";
      return name || id;
    }
  }
  return id;
}

export type PacklistRow = VendorPackListEntry & { files?: VendorPackListFile[] };

export function readVendorName(vendor: VendorPurchaseOrder["vendor"]): string {
  if (!vendor) return "—";
  if (typeof vendor === "string") return vendor;
  return vendor.header?.vendorName || "—";
}

export function defaultRow(po: VendorPurchaseOrder | null): PacklistRow {
  const est = po?.estimatedOrderDeliveryDate
    ? new Date(po.estimatedOrderDeliveryDate).toISOString().split("T")[0]
    : "";
  return {
    packingNumber: "",
    courierName: "",
    courierNumber: "",
    vehicleNumber: "",
    challanNumber: "",
    dispatchDate: new Date().toISOString().split("T")[0],
    estimatedDeliveryDate: est,
    numberOfBoxes: 0,
    totalUnits: 0,
    notes: "",
    poItems: [],
    files: [],
  };
}

export function normalizeExistingPacklist(
  data: VendorPackListEntry | VendorPackListEntry[] | null | undefined,
  po: VendorPurchaseOrder | null
): PacklistRow[] {
  if (!data) return [];
  const arr = Array.isArray(data) ? data : [data];
  const estDefault = po?.estimatedOrderDeliveryDate
    ? new Date(po.estimatedOrderDeliveryDate).toISOString().split("T")[0]
    : "";
  return arr.map((item) => ({
    packingNumber: item.packingNumber || "",
    courierName: item.courierName || "",
    courierNumber: item.courierNumber || "",
    vehicleNumber: item.vehicleNumber || "",
    challanNumber: item.challanNumber || "",
    dispatchDate: item.dispatchDate?.slice(0, 10) || new Date().toISOString().split("T")[0],
    estimatedDeliveryDate: item.estimatedDeliveryDate?.slice(0, 10) || estDefault,
    numberOfBoxes: item.numberOfBoxes ?? 0,
    totalUnits: packlistRowTotalUnits(item),
    notes: item.notes || "",
    poItems: Array.isArray(item.poItems) ? item.poItems : [],
    files: item.files || [],
  }));
}
