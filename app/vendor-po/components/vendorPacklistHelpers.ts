import type {
  VendorPurchaseOrder,
  VendorPurchaseOrderItem,
  VendorPackListEntry,
  VendorPackListFile,
} from "@/shared/services/vendorPurchaseOrderService";

/** Backend may return `id` or `_id` for embedded PO lines. */
export function getPoLineItemId(item: VendorPurchaseOrderItem): string | undefined {
  const raw = item._id ?? item.id;
  if (raw == null || String(raw).trim() === "") return undefined;
  return String(raw);
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
    totalWeight: 0,
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
    totalWeight: item.totalWeight ?? 0,
    notes: item.notes || "",
    poItems: Array.isArray(item.poItems) ? item.poItems : [],
    files: item.files || [],
  }));
}
