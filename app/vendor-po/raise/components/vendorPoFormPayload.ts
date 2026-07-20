import type { VendorPOFormData } from "../types";
import type { CreateVendorPoPayload, UpdateVendorPoPayload } from "@/shared/services/vendorPurchaseOrderService";
import type { VendorPoFormSubmitAction } from "./VendorPOForm";

type VendorRow = { id: string; vendorName: string };

/**
 * Build create/update API payload from form state.
 * @param data - Form values
 * @param selectedVendor - Selected vendor (from picker)
 * @param action - draft save or submit to vendor
 */
export function buildVendorPoApiPayload(
  data: VendorPOFormData,
  selectedVendor: VendorRow | null,
  action: VendorPoFormSubmitAction
): CreateVendorPoPayload {
  const subTotal = data.lineItems.reduce(
    (sum, item) => sum + Number(item.orderedQty || 0) * Number(item.rate || 0),
    0
  );
  const gst = data.lineItems.reduce(
    (sum, item) =>
      sum + (Number(item.orderedQty || 0) * Number(item.rate || 0) * Number(item.gstRate || 0)) / 100,
    0
  );
  const total = subTotal + gst;
  const vendorName = selectedVendor?.vendorName?.trim() ?? "";

  return {
    vendor: data.vendorId,
    vendorName,
    poItems: data.lineItems.map((item) => ({
      productId: item.articleId,
      productName: item.articleName,
      quantity: Number(item.orderedQty || 0),
      rate: Number(item.rate || 0),
      gstRate: Number(item.gstRate || 0),
      estimatedDeliveryDate: item.estimatedDeliveryDate || undefined,
      type: item.type?.trim() || undefined,
      color: item.color?.trim() || undefined,
      pattern: item.pattern?.trim() || undefined,
    })),
    subTotal,
    gst,
    total,
    creditDays: Number(data.creditDays || 0),
    estimatedOrderDeliveryDate: data.estimatedOrderDeliveryDate
      ? new Date(data.estimatedOrderDeliveryDate).toISOString()
      : undefined,
    notes: data.remarks || undefined,
    currentStatus: action === "submit" ? "submitted_to_vendor" : "draft",
  };
}

/**
 * Build PATCH payload from form state (includes line _id when persisted).
 * @param data - Form values
 * @param selectedVendor - Selected vendor (from picker)
 * @param action - draft save or submit to vendor
 */
export function buildVendorPoUpdatePayload(
  data: VendorPOFormData,
  selectedVendor: VendorRow | null,
  action: VendorPoFormSubmitAction
): UpdateVendorPoPayload {
  const base = buildVendorPoApiPayload(data, selectedVendor, action);
  return {
    ...base,
    poItems: data.lineItems.map((item) => ({
      _id: item.id.startsWith("li-") ? undefined : item.id,
      productId: item.articleId,
      productName: item.articleName,
      quantity: Number(item.orderedQty || 0),
      rate: Number(item.rate || 0),
      gstRate: Number(item.gstRate || 0),
      estimatedDeliveryDate: item.estimatedDeliveryDate || undefined,
      type: item.type?.trim() || undefined,
      color: item.color?.trim() || undefined,
      pattern: item.pattern?.trim() || undefined,
    })),
  };
}
