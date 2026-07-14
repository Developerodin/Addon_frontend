import type { WarehouseReturnItem } from "@/shared/services/whmsFulfilmentService";

export type ReturnRowErrors = Record<string, string[]>;

const itemKey = (item: WarehouseReturnItem) => item.id || item._id || item.styleCode;

/** Default stock decision implied by inspected condition. */
export const decisionForCondition = (
  condition: WarehouseReturnItem["condition"],
): WarehouseReturnItem["decision"] => {
  switch (condition) {
    case "saleable":
      return "restock";
    case "damaged":
      return "damaged-stock";
    case "repair":
      return "repair";
    default:
      return "";
  }
};

/**
 * Clamp verified qty: 0 when nothing scanned, otherwise capped at scanned qty.
 */
export const clampVerifiedQty = (scannedQty: number, raw: number): number => {
  const scanned = Math.max(0, Math.floor(Number(scannedQty) || 0));
  if (scanned <= 0) return 0;
  const parsed = Math.max(0, Math.floor(Number(raw) || 0));
  return Math.min(parsed, scanned);
};

/**
 * Validate a single return line for verified qty / condition / decision.
 */
export const validateReturnItemFields = (item: WarehouseReturnItem): string[] => {
  const errors: string[] = [];
  const scanned = Number(item.scannedQty || 0);
  const verified = Number(item.verifiedQty || 0);
  const invoice = Number(item.invoiceQty || 0);

  if (verified < 0) errors.push("Verified qty cannot be negative");
  if (scanned <= 0 && verified > 0) errors.push("Cannot verify qty without scanned items");
  if (verified > scanned) errors.push(`Verified qty cannot exceed scanned (${scanned})`);

  if (scanned > 0) {
    if (verified <= 0) errors.push("Set verified qty for scanned lines");
    if (!item.condition) errors.push("Condition is required");
    if (!item.decision) errors.push("Decision is required");
  }

  if (verified > 0 && scanned > invoice && item.decision === "restock") {
    errors.push("Cannot restock more than invoiced when scan exceeds invoice");
  }

  return errors;
};

/**
 * Validate entire return before submit for approval.
 */
export const validateReturnForSubmit = (
  items: WarehouseReturnItem[],
): { valid: boolean; rowErrors: ReturnRowErrors; message?: string } => {
  const rowErrors: ReturnRowErrors = {};
  let scannedTotal = 0;

  for (const item of items) {
    scannedTotal += Number(item.scannedQty || 0);
    const errs = validateReturnItemFields(item);
    if (errs.length) rowErrors[itemKey(item)] = errs;
  }

  if (scannedTotal <= 0) {
    return { valid: false, rowErrors, message: "Scan at least one returned product before submitting" };
  }

  if (Object.keys(rowErrors).length > 0) {
    return { valid: false, rowErrors, message: "Fix validation errors on scanned lines before submitting" };
  }

  return { valid: true, rowErrors };
};

/**
 * Validate return before supervisor approval.
 */
export const validateReturnForApprove = (
  items: WarehouseReturnItem[],
): { valid: boolean; rowErrors: ReturnRowErrors; message?: string } => {
  const rowErrors: ReturnRowErrors = {};

  for (const item of items) {
    const verified = Number(item.verifiedQty || 0);
    if (verified <= 0) continue;
    const errs: string[] = [];
    if (!item.decision) errs.push("Decision is required for verified lines");
    if (!item.condition) errs.push("Condition is required for verified lines");
    if (errs.length) rowErrors[itemKey(item)] = errs;
  }

  if (Object.keys(rowErrors).length > 0) {
    return { valid: false, rowErrors, message: "Set condition and decision for every verified line" };
  }

  return { valid: true, rowErrors };
};
