"use client";

import React from "react";
import type { VendorPurchaseOrder, VendorReceivedLotDetail } from "@/shared/services/vendorPurchaseOrderService";
import { dashOr, vendorCodeFromPoLineItem } from "../../components/vendorPacklistHelpers";
import { getVendorLotReceivedLines, type VendorLotReceivedLineRow } from "./vendorReceiveProcessHelpers";

type Props = {
  apiPo: VendorPurchaseOrder;
  itemsOpen: boolean;
  setItemsOpen: (open: boolean) => void;
};

const th =
  "px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200";

/**
 * Stack invoice line values in one cell.
 * @param lines - Received lines for the invoice
 * @param render - Cell text for one line
 * @param alignEnd - Right-align numeric columns
 */
function StackedLines({
  lines,
  render,
  alignEnd = false,
}: {
  lines: VendorLotReceivedLineRow[];
  render: (row: VendorLotReceivedLineRow) => React.ReactNode;
  alignEnd?: boolean;
}) {
  if (lines.length === 0) return "—";
  return (
    <div className={`flex flex-col gap-0.5 ${alignEnd ? "items-end" : ""}`}>
      {lines.map((row, i) => (
        <span key={i}>{render(row)}</span>
      ))}
    </div>
  );
}

/** Order lines and per-invoice received quantities for the receive process page. */
export function VendorReceiveProcessSummaryTables({ apiPo, itemsOpen, setItemsOpen }: Props) {
  const poItems = apiPo.poItems || [];
  const lotRows = apiPo.receivedLotDetails || [];

  return (
    <>
      {poItems.length > 0 && (
        <div className="mb-4 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setItemsOpen(!itemsOpen)}
            className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-gray-100 transition-colors"
            aria-expanded={itemsOpen}
          >
            <span className="text-xs font-bold text-gray-800">Order lines</span>
            <i className={`ri-arrow-${itemsOpen ? "up" : "down"}-s-line text-gray-600 text-sm`} />
          </button>
          {itemsOpen && (
            <div className="px-3 pb-3 overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50/30">
                    <th className={th}>Product</th>
                    <th className={th}>Vendor code</th>
                    <th className={th}>Type</th>
                    <th className={th}>Color</th>
                    <th className={th}>Pattern</th>
                    <th className={`${th} text-right`}>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {poItems.map((it, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="px-1.5 py-2 text-[11px] text-gray-700 border border-gray-200">{it.productName || "—"}</td>
                      <td className="px-1.5 py-2 text-[11px] text-gray-700 border border-gray-200">
                        {vendorCodeFromPoLineItem(it) || "no vendor code"}
                      </td>
                      <td className="px-1.5 py-2 text-[11px] text-gray-700 border border-gray-200">{dashOr(it.type)}</td>
                      <td className="px-1.5 py-2 text-[11px] text-gray-700 border border-gray-200">{dashOr(it.color)}</td>
                      <td className="px-1.5 py-2 text-[11px] text-gray-700 border border-gray-200">{dashOr(it.pattern)}</td>
                      <td className="px-1.5 py-2 text-[11px] text-right text-gray-700 border border-gray-200">
                        {Number(it.quantity || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {lotRows.length > 0 && (
        <div className="mb-4 rounded-md border border-gray-200 overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50/30">
                <th className={th}>Invoice</th>
                <th className={th}>Product</th>
                <th className={th}>Vendor code</th>
                <th className={th}>Type</th>
                <th className={th}>Color</th>
                <th className={th}>Pattern</th>
                <th className={`${th} text-right`}>Received qty</th>
                <th className={`${th} text-right`}>Boxes</th>
                <th className={`${th} text-right`}>Total boxes</th>
              </tr>
            </thead>
            <tbody>
              {lotRows.map((lot) => (
                <LotRow key={lot.lotNumber} apiPo={apiPo} lot={lot} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/**
 * One received invoice, with a stacked cell per article.
 * @param apiPo - Purchase order used to resolve line attributes
 * @param lot - Received invoice row
 */
function LotRow({ apiPo, lot }: { apiPo: VendorPurchaseOrder; lot: VendorReceivedLotDetail }) {
  const lines = getVendorLotReceivedLines(apiPo, lot);
  const td = "px-1.5 py-2 text-[11px] text-gray-700 border border-gray-200 align-top";
  return (
    <tr className="hover:bg-gray-50/50">
      <td className={td}>{lot.lotNumber}</td>
      <td className={td}>
        <StackedLines lines={lines} render={(row) => row.productName.trim() || "—"} />
      </td>
      <td className={td}>
        <StackedLines lines={lines} render={(row) => row.vendorCode || "no vendor code"} />
      </td>
      <td className={td}>
        <StackedLines lines={lines} render={(row) => dashOr(row.type)} />
      </td>
      <td className={td}>
        <StackedLines lines={lines} render={(row) => dashOr(row.color)} />
      </td>
      <td className={td}>
        <StackedLines lines={lines} render={(row) => dashOr(row.pattern)} />
      </td>
      <td className={`${td} text-right tabular-nums`}>
        <StackedLines lines={lines} alignEnd render={(row) => row.quantity} />
      </td>
      <td className={`${td} text-right tabular-nums`}>
        <StackedLines lines={lines} alignEnd render={(row) => row.boxes} />
      </td>
      <td className={`${td} text-right`}>{lot.numberOfBoxes}</td>
    </tr>
  );
}
