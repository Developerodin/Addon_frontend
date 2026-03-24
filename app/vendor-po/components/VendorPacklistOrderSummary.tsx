"use client";

import React from "react";
import type { VendorPurchaseOrder } from "@/shared/services/vendorPurchaseOrderService";
import { readVendorName } from "./vendorPacklistHelpers";

/** PO header + line preview (yarn PacklistModal parity). */
export function VendorPacklistOrderSummary({ po }: { po: VendorPurchaseOrder }) {
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
          <div className="mt-0.5 text-xs text-gray-900">
            {po.createdAt ? new Date(po.createdAt).toLocaleDateString() : "—"}
          </div>
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
                {po.poItems.map((item) => {
                  const pid = item.productId;
                  const name =
                    item.productName || (typeof pid === "object" ? pid?.name || "" : "") || "—";
                  return (
                    <tr key={item._id || name}>
                      <td className="px-2 py-1 border border-gray-200">{name}</td>
                      <td className="px-2 py-1 text-right border border-gray-200">{item.quantity}</td>
                      <td className="px-2 py-1 text-right border border-gray-200">{item.rate}</td>
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
