"use client";
import React from "react";

type Totals = { subTotal: number; gst: number; total: number };

type Props = {
  totals: Totals;
};

/** Order-level subtotal / GST / total (read-only, auto-calculated). */
export default function VendorPOOrderTotalsSection({ totals }: Props) {
  const fmt = (n: number) =>
    `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="border-t pt-4">
      <div className="max-w-lg ml-auto">
        <table className="min-w-full border border-gray-200 bg-white">
          <thead>
            <tr>
              <th className="border border-gray-200 px-2 py-1 text-[10px] font-bold text-gray-700 bg-gray-50/30 text-right uppercase tracking-wider">
                Sub Total
              </th>
              <th className="border border-gray-200 px-2 py-1 text-[10px] font-bold text-gray-700 bg-gray-50/30 text-right uppercase tracking-wider">
                GST
              </th>
              <th className="border border-gray-200 px-2 py-1 text-[10px] font-bold text-gray-700 bg-gray-50/30 text-right uppercase tracking-wider">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-200 px-2 py-1.5 text-xs text-gray-900 text-right tabular-nums">{fmt(totals.subTotal)}</td>
              <td className="border border-gray-200 px-2 py-1.5 text-xs text-gray-900 text-right tabular-nums">{fmt(totals.gst)}</td>
              <td className="border border-gray-200 px-2 py-1.5 text-xs font-bold text-gray-900 text-right tabular-nums">{fmt(totals.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
