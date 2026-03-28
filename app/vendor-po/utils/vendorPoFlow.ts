import type { VendorPO, VendorPOPriority, VendorPOStatus } from "../raise/types";

/** Badge classes for `VendorPOStatus` (lists + modals). */
export function vendorPoUiStatusClass(status: VendorPOStatus): string {
  switch (status) {
    case "Submitted to vendor":
      return "bg-gray-100 text-gray-800";
    case "In transit":
      return "bg-purple-100 text-purple-800";
    case "Goods partially received":
      return "bg-amber-100 text-amber-800";
    case "Goods received":
      return "bg-green-100 text-green-800";
    case "QC pending":
      return "bg-cyan-100 text-cyan-800";
    case "Rejected":
      return "bg-red-100 text-red-800";
    case "PO accepted":
    case "PO accepted partially":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
import type {
  VendorPoApiStatus,
  VendorPurchaseOrder,
  VendorPurchaseOrderItem,
  VendorReceivedLotDetail,
} from "@/shared/services/vendorPurchaseOrderService";

/** Map API status → UI label (aligned with yarn PO lifecycle). */
export function vendorPoApiStatusToUi(code: VendorPoApiStatus): VendorPOStatus {
  const map: Record<VendorPoApiStatus, VendorPOStatus> = {
    submitted_to_vendor: "Submitted to vendor",
    in_transit: "In transit",
    goods_partially_received: "Goods partially received",
    goods_received: "Goods received",
    qc_pending: "QC pending",
    po_rejected: "Rejected",
    po_accepted: "PO accepted",
    po_accepted_partially: "PO accepted partially",
  };
  return map[code] ?? "Submitted to vendor";
}

function readVendorName(vendor: VendorPurchaseOrder["vendor"]): string {
  if (!vendor) return "N/A";
  if (typeof vendor === "string") return vendor;
  return vendor.header?.vendorName || "N/A";
}

function readVendorId(vendor: VendorPurchaseOrder["vendor"]): string {
  if (!vendor) return "";
  if (typeof vendor === "string") return vendor;
  return vendor.id || vendor._id || "";
}

/** Sum received qty from line items, else from received lots. */
export function totalReceivedQtyFromApi(po: VendorPurchaseOrder): number {
  const items = po.poItems || [];
  const fromLines = items.reduce((s, it) => s + Number((it as VendorPurchaseOrderItem).receivedQuantity || 0), 0);
  if (fromLines > 0) return fromLines;

  const lots = po.receivedLotDetails;
  if (lots?.length) {
    return lots.reduce(
      (sum, lot) =>
        sum + (lot.poItems || []).reduce((ls, p) => ls + Number(p.receivedQuantity || 0), 0),
      0
    );
  }

  return 0;
}

/**
 * Map API purchase order → UI VendorPO (single place for raise + receive lists).
 */
export function mapVendorPurchaseOrderToUi(po: VendorPurchaseOrder): VendorPO {
  const lineItems = (po.poItems || []).map((item) => {
    const pid = item.productId;
    const articleId = typeof pid === "string" ? pid : pid?.id || pid?._id || "";
    return {
      id: item._id || `${po.id}-${String(articleId)}`,
      articleId,
      articleCode: typeof pid === "object" ? pid?.vendorCode || "" : "",
      articleName: item.productName || (typeof pid === "object" ? pid?.name || "" : ""),
      type: item.type ?? "",
      color: item.color ?? "",
      pattern: item.pattern ?? "",
      orderedQty: Number(item.quantity || 0),
      rate: Number(item.rate ?? 0),
      gstRate: Number(item.gstRate ?? 0),
      estimatedDeliveryDate: item.estimatedDeliveryDate || "",
      receivedQty: Number(item.receivedQuantity || 0),
      lineRemarks: "",
    };
  });
  const totalQty = lineItems.reduce((s, li) => s + li.orderedQty, 0);
  const receivedQty = totalReceivedQtyFromApi(po);

  return {
    id: po.id,
    poNo: po.vpoNumber,
    poDate: po.createdAt ? new Date(po.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    vendorId: readVendorId(po.vendor),
    vendorName: readVendorName(po.vendor),
    priority: "Medium" as VendorPOPriority,
    creditDays: Number(po.creditDays ?? 0),
    estimatedOrderDeliveryDate: po.estimatedOrderDeliveryDate
      ? new Date(po.estimatedOrderDeliveryDate).toISOString().split("T")[0]
      : "",
    totalQty,
    receivedQty,
    status: vendorPoApiStatusToUi(po.currentStatus),
    articleSummary: (po.poItems || []).map((i) => i.productName).filter(Boolean).join(", "),
    remarks: po.notes,
    lineItems,
    createdAt: po.createdAt,
    updatedAt: po.updatedAt,
    apiStatus: po.currentStatus,
    /** Full API doc for modals / process (same reference as list item). */
    rawPurchaseOrder: po,
  };
}

/** Build lot rows for bulk box create from received lot details. */
export function lotDetailsForBulkBoxes(
  vpoNumber: string,
  lots: VendorReceivedLotDetail[] | undefined
): { lotNumber: string; numberOfBoxes: number; vendorPoItemId?: string; productId?: string }[] {
  if (!lots?.length) return [];
  return lots
    .filter((l) => l.lotNumber?.trim() && Number(l.numberOfBoxes) > 0)
    .map((l) => ({
      lotNumber: l.lotNumber.trim(),
      numberOfBoxes: Number(l.numberOfBoxes),
      vendorPoItemId: l.poItems?.[0]?.poItem,
    }));
}
