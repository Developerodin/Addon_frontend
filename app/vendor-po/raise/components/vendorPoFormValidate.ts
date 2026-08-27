import type { VendorPOLineItem } from "../types";
import type { VendorPoFormFieldAccess, VendorPoRaiseFormMode } from "./vendorPoRaiseAccess";

export type VendorPoFormSubmitAction = "draft" | "submit";

/**
 * Validate vendor PO form for draft save or vendor submit.
 * Mutates `errors` in place and returns whether the form is valid.
 */
export function validateVendorPoForm(params: {
  action: VendorPoFormSubmitAction;
  fieldAccess: VendorPoFormFieldAccess;
  formMode: VendorPoRaiseFormMode;
  vendorId: string;
  creditDays: number;
  estimatedOrderDeliveryDate: string;
  lineItems: VendorPOLineItem[];
  errors: Record<string, string>;
}): boolean {
  const {
    action,
    fieldAccess,
    formMode,
    vendorId,
    creditDays,
    estimatedOrderDeliveryDate,
    lineItems,
    errors,
  } = params;
  const requirePricing = action === "submit" && fieldAccess.canEditPricingFields;

  if (fieldAccess.canEditHeader) {
    if (!vendorId.trim()) errors.vendor = "Vendor is required";
    if (creditDays < 0) errors.creditDays = "Credit days must be 0 or greater";
    if (!estimatedOrderDeliveryDate?.trim()) {
      errors.estimatedOrderDeliveryDate = "Estimated order delivery date is required";
    }
  }

  if (!lineItems.length) errors.lineItems = "At least one line item is required";

  const articleIdCounts = new Map<string, number>();
  lineItems.forEach((row) => {
    if (!row.articleId) return;
    articleIdCounts.set(row.articleId, (articleIdCounts.get(row.articleId) || 0) + 1);
  });

  lineItems.forEach((row) => {
    if (fieldAccess.canEditUserLineFields) {
      if (!row.articleId) errors[`article_${row.id}`] = "Article is required";
      if (row.articleId && (articleIdCounts.get(row.articleId) || 0) > 1) {
        errors[`dup_article_${row.id}`] = "This article is already on another line";
      }
      if (row.orderedQty <= 0) errors[`qty_${row.id}`] = "Qty must be greater than 0";
    }
    if (requirePricing || (action === "submit" && formMode === "full")) {
      if ((row.rate ?? 0) <= 0) errors[`rate_${row.id}`] = "Rate must be greater than 0";
      if ((row.gstRate ?? 0) <= 0) errors[`gst_${row.id}`] = "GST % is required";
    }
  });

  return Object.keys(errors).length === 0;
}
