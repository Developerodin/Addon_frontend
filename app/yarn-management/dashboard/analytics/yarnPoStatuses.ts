/** Mirrors AddOn_backend yarnPurchaseOrder.model `yarnPurchaseOrderStatuses` */
export const YARN_PO_STATUSES = [
  "draft",
  "submitted_to_supplier",
  "in_transit",
  "goods_partially_received",
  "goods_received",
  "qc_pending",
  "po_rejected",
  "po_accepted",
  "po_accepted_partially",
  "returned_to_vendor",
] as const;

export type YarnPoStatus = (typeof YARN_PO_STATUSES)[number];
