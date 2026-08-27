/**
 * Client-side mirror of backend vendor GRN financial math (rupee discount).
 */

export interface VendorGrnAdjustmentInputs {
  discountAmount?: number;
  freightAmount?: number;
  freightGstPercent?: number;
  roundOff?: number | null;
}

export interface VendorGrnFinancials {
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
  taxLabel: string;
}

export interface VendorGrnTotalsItem {
  amount?: number;
  verifiedQty?: number;
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
 * Normalize vendor GRN adjustment inputs (rupee discount).
 * @param adjustments - raw form values
 */
export const normalizeVendorAdjustments = (adjustments: VendorGrnAdjustmentInputs = {}) => {
  const hasRoundOff = adjustments.roundOff !== undefined && adjustments.roundOff !== null;
  return {
    discountAmount: Math.max(0, toNumber(adjustments.discountAmount)),
    freightAmount: Math.max(0, toNumber(adjustments.freightAmount)),
    freightGstPercent: Math.min(100, Math.max(0, toNumber(adjustments.freightGstPercent))),
    roundOff: hasRoundOff ? toNumber(adjustments.roundOff) : null,
  };
};

/**
 * Compute vendor GRN financial totals from line amounts, vendor state, and rupee adjustments.
 * @param items - GRN line snapshots
 * @param vendorState - vendor state string
 * @param adjustments - discount ₹, freight, freight GST %, round-off
 * @param applyAutoRoundOff - when true and roundOff not explicit, round to nearest rupee
 */
export const computeVendorGrnFinancials = (
  items: VendorGrnTotalsItem[],
  vendorState?: string,
  adjustments: VendorGrnAdjustmentInputs = {},
  applyAutoRoundOff = true
): VendorGrnFinancials => {
  const subTotal = items.reduce((s, it) => s + toNumber(it.amount), 0);
  const adj = normalizeVendorAdjustments(adjustments);
  const discountAmount = Math.min(adj.discountAmount, subTotal);
  const taxableValue = subTotal - discountAmount;

  const avgGstRate = items.length
    ? items.reduce((s, it) => s + toNumber(it.gstRate), 0) / items.length
    : 0;

  const itemGst = (taxableValue * avgGstRate) / 100;
  const freightAmount = adj.freightAmount;
  const freightGst = (freightAmount * adj.freightGstPercent) / 100;
  const totalGst = itemGst + freightGst;

  const sameState = SUPPLIER_HOME_STATES.has((vendorState || '').toLowerCase());
  const sgst = sameState ? totalGst / 2 : 0;
  const cgst = sameState ? totalGst / 2 : 0;
  const igst = sameState ? 0 : totalGst;

  const preRoundTotal = taxableValue + itemGst + freightAmount + freightGst;
  const roundOffSuggested = Math.round(preRoundTotal) - preRoundTotal;

  const hasFinancialAdj =
    adj.discountAmount > 0 || adj.freightAmount > 0 || adj.freightGstPercent > 0;

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
    taxLabel,
  };
};
