/**
 * Client-side mirror of backend GRN totals computation.
 * Keeps Edit Header preview and drawer summary aligned with server math.
 */

export interface GrnAdjustmentInputs {
  discountPercent?: number;
  freightAmount?: number;
  freightGstPercent?: number;
  roundOff?: number | null;
}

export interface GrnComputedTotals {
  subTotal: number;
  discountAmount: number;
  taxableValue: number;
  itemGst: number;
  freightAmount: number;
  freightGst: number;
  preRoundTotal: number;
  roundOff: number;
  roundOffSuggested: number;
  sgst: number;
  cgst: number;
  igst: number;
  gst: number;
  grandTotal: number;
  totalQty: number;
  taxLabel: string;
}

export interface GrnTotalsItem {
  amount?: number;
  quantity?: number;
  gstRate?: number;
}

const SUPPLIER_HOME_STATES = new Set(['maharashtra', 'mh']);

/**
 * Coerce any value to a finite number, defaulting to 0.
 * @param value - raw input
 */
const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Normalize adjustment inputs with safe bounds.
 * @param adjustments - raw form values
 */
export const normalizeAdjustments = (adjustments: GrnAdjustmentInputs = {}) => {
  const hasRoundOff = adjustments.roundOff !== undefined && adjustments.roundOff !== null;
  return {
    discountPercent: Math.min(100, Math.max(0, toNumber(adjustments.discountPercent))),
    freightAmount: Math.max(0, toNumber(adjustments.freightAmount)),
    freightGstPercent: Math.min(100, Math.max(0, toNumber(adjustments.freightGstPercent))),
    roundOff: hasRoundOff ? toNumber(adjustments.roundOff) : null,
  };
};

/**
 * Compute GRN financial totals from line items, supplier state, and adjustments.
 * @param items - GRN line item snapshots
 * @param supplierState - supplier state string (e.g. Maharashtra)
 * @param adjustments - discount, freight, round-off inputs
 * @param applyAutoRoundOff - when true and roundOff not explicit, round to nearest rupee
 */
export const computeGrnTotals = (
  items: GrnTotalsItem[],
  supplierState?: string,
  adjustments: GrnAdjustmentInputs = {},
  applyAutoRoundOff = true
): GrnComputedTotals => {
  const subTotal = items.reduce((s, it) => s + toNumber(it.amount), 0);
  const totalQty = items.reduce((s, it) => s + toNumber(it.quantity), 0);

  const adj = normalizeAdjustments(adjustments);
  const discountAmount = (subTotal * adj.discountPercent) / 100;
  const taxableValue = subTotal - discountAmount;

  const avgGstRate = items.length
    ? items.reduce((s, it) => s + toNumber(it.gstRate), 0) / items.length
    : 0;

  const itemGst = (taxableValue * avgGstRate) / 100;
  const freightAmount = adj.freightAmount;
  const freightGst = (freightAmount * adj.freightGstPercent) / 100;
  const totalGst = itemGst + freightGst;

  const sameState = SUPPLIER_HOME_STATES.has((supplierState || '').toLowerCase());
  const sgst = sameState ? totalGst / 2 : 0;
  const cgst = sameState ? totalGst / 2 : 0;
  const igst = sameState ? 0 : totalGst;

  const preRoundTotal = taxableValue + itemGst + freightAmount + freightGst;
  const roundOffSuggested = Math.round(preRoundTotal) - preRoundTotal;

  const hasFinancialAdj =
    adj.discountPercent > 0 || adj.freightAmount > 0 || adj.freightGstPercent > 0;

  let roundOff = 0;
  if (adj.roundOff !== null) {
    roundOff = adj.roundOff;
  } else if (applyAutoRoundOff || hasFinancialAdj) {
    roundOff = roundOffSuggested;
  }

  const grandTotal = preRoundTotal + roundOff;
  const taxLabel = sameState
    ? `GST ${avgGstRate.toFixed(1)}%`
    : `IGST ${avgGstRate.toFixed(1)}%`;

  return {
    subTotal,
    discountAmount,
    taxableValue,
    itemGst,
    freightAmount,
    freightGst,
    preRoundTotal,
    roundOff,
    roundOffSuggested,
    sgst,
    cgst,
    igst,
    gst: totalGst,
    grandTotal,
    totalQty,
    taxLabel,
  };
};

/** Indian-numbering INR formatter. */
export const fmtGrnINR = (value: number, fractionDigits = 2): string =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
