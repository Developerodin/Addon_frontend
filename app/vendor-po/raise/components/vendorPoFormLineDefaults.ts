import { VendorPOLineItem } from "../types";

/** Creates a new empty line row for vendor PO forms. */
export function newVendorPOLineItem(): VendorPOLineItem {
  return {
    id: `li-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    articleId: "",
    articleCode: "",
    articleName: "",
    type: "",
    color: "",
    pattern: "",
    orderedQty: 0,
    rate: 0,
    gstRate: 0,
    estimatedDeliveryDate: "",
    lineRemarks: "",
  };
}
