import type { VendorPoApiStatus, VendorPurchaseOrder } from "@/shared/services/vendorPurchaseOrderService";

/** UI labels aligned with yarn purchase lifecycle + vendor API enums. */
export type VendorPOStatus =
  | "Draft"
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
  /** From product attributes (Product / Type); auto-filled when article is selected */
  type?: string;
  color?: string;
  pattern?: string;
  orderedQty: number;
  rate?: number;
  gstRate?: number;
  estimatedDeliveryDate?: string;
  /** Already received quantity (for receive flow); default 0 */
  receivedQty?: number;
  lineRemarks?: string;
  /** Set when the line was filled from Excel/CSV import — article cell is locked. */
  imported?: boolean;
}

/** Article option for dropdown/search */
export interface VendorPOArticle {
  id: string;
  /** Same as vendor code when present; empty when product has no vendor code (no factory fallback). */
  code: string;
  name: string;
  internalCode?: string;
  vendorCode?: string;
  factoryCode?: string;
  /** From attributes; applied to line item on select */
  type?: string;
  color?: string;
  pattern?: string;
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
