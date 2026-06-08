/** Regex for in-progress or complete half-step values: 1, 1., 1.5, .5 */
export const HALF_STEP_INPUT_PATTERN = /^(?:\d+\.?$|\d+\.5|\.5?)$/;

export const HALF_STEP_QTY_ERROR =
  'Quantity must be a whole number or .5 (e.g. 1, 1.5)';

/**
 * Returns whether a parsed number is a valid half-step quantity (whole or .5).
 */
export function isValidHalfStepValue(n: number): boolean {
  if (!Number.isFinite(n)) return false;
  return Math.abs(n * 2 - Math.round(n * 2)) < 1e-9;
}

/**
 * Returns whether a string is valid partial or complete half-step input while typing.
 */
export function isValidHalfStepInput(inputValue: string): boolean {
  return HALF_STEP_INPUT_PATTERN.test(inputValue);
}

/**
 * Throws if the quantity is not a valid half-step value (for submit guards).
 */
export function assertHalfStepQuantity(n: number, label = 'Quantity'): void {
  if (!Number.isFinite(n) || n < 0 || !isValidHalfStepValue(n)) {
    throw new Error(`${label}: ${HALF_STEP_QTY_ERROR}`);
  }
}

/**
 * Returns an error message if invalid, or null if the quantity is a valid half-step.
 */
export function getHalfStepQuantityError(n: number, label = 'Quantity'): string | null {
  if (!Number.isFinite(n) || n < 0 || !isValidHalfStepValue(n)) {
    return `${label}: ${HALF_STEP_QTY_ERROR}`;
  }
  return null;
}

export interface HalfStepField {
  value: number;
  label: string;
  /** When true, skip validation for zero values (optional transfer/shift inputs). */
  skipZero?: boolean;
}

/**
 * Returns the first half-step validation error across multiple fields, or null if all valid.
 */
export function getFirstHalfStepError(fields: HalfStepField[]): string | null {
  for (const { value, label, skipZero } of fields) {
    if (skipZero && value === 0) continue;
    const err = getHalfStepQuantityError(value, label);
    if (err) return err;
  }
  return null;
}

const QTY_DUST_EPSILON = 1e-6;

/**
 * Normalizes a production quantity: snaps float dust to 0 and rounds to 2 decimals.
 */
export function normalizeProductionQty(n: number | null | undefined): number {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return 0;
  if (Math.abs(v) < QTY_DUST_EPSILON) return 0;
  return Math.round(v * 100) / 100;
}

/**
 * Formats a production quantity for display (up to 2 decimal places).
 */
export function formatProductionQty(n: number | null | undefined): string {
  return normalizeProductionQty(n).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * CSV-safe production quantity string (no scientific notation, max 2 decimal places).
 */
export function productionQtyCsvValue(n: number | null | undefined): string {
  const v = normalizeProductionQty(n);
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
