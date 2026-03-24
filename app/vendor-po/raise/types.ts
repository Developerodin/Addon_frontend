import type { VendorPoApiStatus, VendorPurchaseOrder } from "@/shared/services/vendorPurchaseOrderService";

/** UI labels aligned with yarn purchase lifecycle + vendor API enums. */
export type VendorPOStatus =
  | "Submitted to vendor"
  | "In transit"
  | "Goods partially received"
  | "Goods received"
  | "QC pending"
  | "Rejected"
  | "PO accepted"
  | "PO accepted partially";

export type VendorPOPriority = "High" | "Medium" | "Low" | "Urgent";

/** Line item for Create/Edit form and stored PO */
export interface VendorPOLineItem {
  id: string;
  articleId: string;
  articleCode: string;
  articleName: string;
  orderedQty: number;
  rate?: number;
  gstRate?: number;
  estimatedDeliveryDate?: string;
  /** Already received quantity (for receive flow); default 0 */
  receivedQty?: number;
  lineRemarks?: string;
}

/** Article option for dropdown/search */
export interface VendorPOArticle {
  id: string;
  code: string;
  name: string;
}

export interface VendorPO {
  id: string;
  poNo: string;
  poDate: string;
  vendorId: string;
  vendorName: string;
  priority: VendorPOPriority;
  creditDays?: number;
  estimatedOrderDeliveryDate?: string;
  totalQty: number;
  receivedQty: number;
  status: VendorPOStatus;
  articleSummary?: string;
  remarks?: string;
  lineItems?: VendorPOLineItem[];
  createdAt?: string;
  updatedAt?: string;
  /** Raw API status (for branching without stringifying UI label). */
  apiStatus?: VendorPoApiStatus;
  /** Last fetched API document (optional; set by list/detail mappers). */
  rawPurchaseOrder?: VendorPurchaseOrder;
}

/** Form payload for Create/Edit */
export interface VendorPOFormData {
  vendorId: string;
  creditDays?: number;
  estimatedOrderDeliveryDate?: string;
  remarks: string;
  lineItems: VendorPOLineItem[];
}
