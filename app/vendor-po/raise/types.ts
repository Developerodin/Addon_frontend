export type VendorPOStatus =
  | "Draft"
  | "Approved"
  | "Partially Received"
  | "Fully Received"
  | "Closed";

export type VendorPOPriority = "High" | "Medium" | "Low" | "Urgent";

/** Line item for Create/Edit form and stored PO */
export interface VendorPOLineItem {
  id: string;
  articleId: string;
  articleCode: string;
  articleName: string;
  orderedQty: number;
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
  totalQty: number;
  receivedQty: number;
  status: VendorPOStatus;
  articleSummary?: string;
  remarks?: string;
  lineItems?: VendorPOLineItem[];
  createdAt?: string;
  updatedAt?: string;
}

/** Form payload for Create/Edit */
export interface VendorPOFormData {
  vendorId: string;
  priority: VendorPOPriority;
  remarks: string;
  lineItems: VendorPOLineItem[];
}
