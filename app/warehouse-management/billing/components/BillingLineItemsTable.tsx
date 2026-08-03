"use client";

import React from "react";
import type { BillingLineRow } from "../billingLineItemsUtils";

type Props = {
  lines: BillingLineRow[];
  mode: "preview" | "invoice";
};

/**
 * Tabular billing line items — preview shows order vs scanned vs bill qty;
 * invoice mode shows rate and amount like the print view.
 */
export default function BillingLineItemsTable({ lines, mode }: Props) {
  if (lines.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-8 text-center" role="status">
        No billable line items found. Complete scanning with scanned quantities first.
      </p>
    );
  }

  const showPreviewCols = mode === "preview";

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-200" aria-label="Billing line items">
        <thead>
          <tr className="bg-gray-50/30">
            <th className="px-2 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">#</th>
            <th className="px-2 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Style Code</th>
            <th className="px-2 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">SKU</th>
            <th className="px-2 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Size</th>
            <th className="px-2 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Shade</th>
            {showPreviewCols ? (
              <>
                <th className="px-2 py-3 text-right text-[11px] font-bold uppercase border border-gray-200">Order Qty</th>
                <th className="px-2 py-3 text-right text-[11px] font-bold uppercase border border-gray-200">Scanned Qty</th>
                <th className="px-2 py-3 text-right text-[11px] font-bold uppercase border border-gray-200">Bill Qty</th>
                <th className="px-2 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Scan</th>
              </>
            ) : (
              <>
                <th className="px-2 py-3 text-right text-[11px] font-bold uppercase border border-gray-200">Qty</th>
                <th className="px-2 py-3 text-right text-[11px] font-bold uppercase border border-gray-200">Rate</th>
                <th className="px-2 py-3 text-right text-[11px] font-bold uppercase border border-gray-200">Amount</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {lines.map((row) => {
            const qtyMismatch = showPreviewCols && row.billQty !== row.orderQty;
            return (
              <tr key={`${row.srNo}-${row.styleCode}-${row.size}-${row.shade}`} className="hover:bg-gray-50/50">
                <td className="px-2 py-2 text-[12px] border border-gray-200">{row.srNo}</td>
                <td className="px-2 py-2 text-[12px] font-semibold border border-gray-200">{row.styleCode}</td>
                <td className="px-2 py-2 text-[12px] border border-gray-200">{row.skuCode || "—"}</td>
                <td className="px-2 py-2 text-[12px] border border-gray-200">{row.size || "—"}</td>
                <td className="px-2 py-2 text-[12px] border border-gray-200">{row.shade || "—"}</td>
                {showPreviewCols ? (
                  <>
                    <td className="px-2 py-2 text-[12px] text-right border border-gray-200">{row.orderQty}</td>
                    <td className="px-2 py-2 text-[12px] text-right border border-gray-200">{row.scannedQty}</td>
                    <td
                      className={`px-2 py-2 text-[12px] text-right font-semibold border border-gray-200 ${
                        qtyMismatch ? "text-amber-700" : "text-gray-900"
                      }`}
                    >
                      {row.billQty}
                    </td>
                    <td className="px-2 py-2 text-[12px] border border-gray-200">
                      {row.scanStatus ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                          {row.scanStatus}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-2 py-2 text-[12px] text-right font-semibold border border-gray-200">{row.billQty}</td>
                    <td className="px-2 py-2 text-[12px] text-right border border-gray-200">
                      {row.rate != null ? row.rate : "—"}
                    </td>
                    <td className="px-2 py-2 text-[12px] text-right border border-gray-200">
                      {row.amount != null ? row.amount : "—"}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
