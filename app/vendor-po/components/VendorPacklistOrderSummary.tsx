"use client";

import React from "react";
import type { VendorPurchaseOrder } from "@/shared/services/vendorPurchaseOrderService";
import { readVendorName, vendorCodeFromPoLineItem } from "./vendorPacklistHelpers";

function dashOr(value: string | undefined): string {
  const t = value?.trim();
  return t || "—";
}

function formatOrderDateLabel(raw: string | undefined): string {
  if (!raw?.trim()) return "—";
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

/** PO header + line preview (yarn PacklistModal parity). Order date = record created time (same as list `poDate`). */
export function VendorPacklistOrderSummary({
  po,
  orderDateFallback,
}: {
  po: VendorPurchaseOrder;
  /** When list API omits `createdAt` on the document, pass mapped row `createdAt` or `poDate`. */
  orderDateFallback?: string;
}) {
  const createdLike =
    po.createdAt ??
    (po as { created_at?: string }).created_at ??
    orderDateFallback ??
    po.updatedAt;

  return (
    <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <h4 className="text-xs font-semibold text-gray-700 mb-2">Order details</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="text-[10px] font-medium text-gray-600">PO number</label>
          <div className="mt-0.5 text-xs text-gray-900 font-medium">{po.vpoNumber}</div>
        </div>
        <div>
          <label className="text-[10px] font-medium text-gray-600">Vendor</label>
          <div className="mt-0.5 text-xs text-gray-900">{readVendorName(po.vendor)}</div>
        </div>
        <div>
          <label className="text-[10px] font-medium text-gray-600">Order date</label>
          <div className="mt-0.5 text-xs text-gray-900">{formatOrderDateLabel(createdLike)}</div>
        </div>
        <div>
          <label className="text-[10px] font-medium text-gray-600">Total</label>
          <div className="mt-0.5 text-xs text-gray-900 font-medium">{Number(po.total ?? 0).toLocaleString()}</div>
        </div>
      </div>
      {po.poItems && po.poItems.length > 0 && (
        <div className="mt-3">
          <label className="text-[10px] font-medium text-gray-600 mb-1 block">Order lines</label>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 text-xs">
              <thead className="bg-gray-50/30">
                <tr>
                  <th className="px-2 py-1 text-left border border-gray-200">Product</th>
                  <th className="px-2 py-1 text-right border border-gray-200">Qty</th>
                  <th className="px-2 py-1 text-right border border-gray-200">Rate</th>
                </tr>
              </thead>
              <tbody>
                {po.poItems.map((item, idx) => {
                  const pid = item.productId;
                  const name =
                    item.productName || (typeof pid === "object" ? pid?.name || "" : "") || "—";
                  const vendorCodeLabel = vendorCodeFromPoLineItem(item) || "—";
                  return (
                    <tr key={String(item._id ?? item.id ?? `line-${idx}`)}>
                      <td className="px-2 py-1.5 border border-gray-200 align-top">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                          <div className="min-w-0 flex-1 font-medium text-gray-900">{name}</div>
                          <div className="min-w-0 flex-1 text-[10px] leading-snug text-gray-600 sm:text-right">
                            <div className="sm:text-right">
                              <span className="text-gray-500">Vendor code:</span> {vendorCodeLabel}
                            </div>
                            <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 sm:justify-end">
                              <span>
                                <span className="text-gray-500">Type:</span> {dashOr(item.type)}
                              </span>
                              <span>
                                <span className="text-gray-500">Color:</span> {dashOr(item.color)}
                              </span>
                              <span>
                                <span className="text-gray-500">Pattern:</span> {dashOr(item.pattern)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-right border border-gray-200 align-top tabular-nums">
                        {item.quantity}
                      </td>
                      <td className="px-2 py-1.5 text-right border border-gray-200 align-top tabular-nums">
                        {item.rate}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
