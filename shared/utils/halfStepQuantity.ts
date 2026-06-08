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
