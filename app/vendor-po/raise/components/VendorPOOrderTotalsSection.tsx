"use client";
import React from "react";

type Totals = { totalOrderedQty: number; subTotal: number; gst: number; total: number };

type Props = {
  totals: Totals;
  /** Money columns (subtotal / GST / total). Qty is always shown. */
  showMoneyTotals?: boolean;
};

/**
 * Formats a summed ordered qty for display (no currency).
 * @param n - Sum of line orderedQty
 */
function formatQty(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

/**
 * Formats a money amount as INR.
 * @param n - Amount
 */
function formatMoney(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Order-level article qty + optional subtotal / GST / total (read-only, auto-calculated). */
export default function VendorPOOrderTotalsSection({ totals, showMoneyTotals = true }: Props) {
  return (
    <div className="border-t pt-4">
      <div className="max-w-lg ml-auto">
        <table className="min-w-full border border-gray-200 bg-white">
          <thead>
            <tr>
              <th
                className="border border-gray-200 px-2 py-1 text-[10px] font-bold text-gray-700 bg-gray-50/30 text-right uppercase tracking-wider whitespace-normal leading-tight"
                scope="col"
              >
                <span className="block">Article Total</span>
                <span className="block">Order Qty</span>
              </th>
              {showMoneyTotals ? (
                <>
                  <th className="border border-gray-200 px-2 py-1 text-[10px] font-bold text-gray-700 bg-gray-50/30 text-right uppercase tracking-wider">
                    Sub Total
                  </th>
                  <th className="border border-gray-200 px-2 py-1 text-[10px] font-bold text-gray-700 bg-gray-50/30 text-right uppercase tracking-wider">
                    GST
                  </th>
                  <th className="border border-gray-200 px-2 py-1 text-[10px] font-bold text-gray-700 bg-gray-50/30 text-right uppercase tracking-wider">
                    Total
                  </th>
                </>
              ) : null}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-200 px-2 py-1.5 text-xs font-semibold text-gray-900 text-right tabular-nums">
                {formatQty(totals.totalOrderedQty)}
              </td>
              {showMoneyTotals ? (
                <>
                  <td className="border border-gray-200 px-2 py-1.5 text-xs text-gray-900 text-right tabular-nums">
                    {formatMoney(totals.subTotal)}
                  </td>
                  <td className="border border-gray-200 px-2 py-1.5 text-xs text-gray-900 text-right tabular-nums">
                    {formatMoney(totals.gst)}
                  </td>
                  <td className="border border-gray-200 px-2 py-1.5 text-xs font-bold text-gray-900 text-right tabular-nums">
                    {formatMoney(totals.total)}
                  </td>
                </>
              ) : null}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
