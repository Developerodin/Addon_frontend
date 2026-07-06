"use client";

import React from "react";
import type { ContainerMaster } from "@/shared/services/containersMasterService";
import { getVendorContainerLineDisplays } from "../utils/vendorContainerDisplay";

type Props = {
  container: ContainerMaster;
};

/**
 * Read-only vendor pipeline lines on a scanned container (VPO, vendor, product, qty).
 */
export function VendorContainerScanLinesPanel({ container }: Props) {
  const lines = getVendorContainerLineDisplays(container);

  if (lines.length === 0) return null;

  return (
    <div className="p-2 bg-purple-50/60 rounded border border-purple-200 text-[11px] text-gray-900 space-y-2">
      <h4 className="text-[11px] font-bold text-purple-900 uppercase tracking-wider">
        Vendor batch lines ({lines.length})
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-purple-100">
          <thead>
            <tr className="bg-white/80 text-[10px] uppercase text-gray-500">
              <th className="border border-purple-100 px-1.5 py-1 text-left">VPO</th>
              <th className="border border-purple-100 px-1.5 py-1 text-left">Vendor</th>
              <th className="border border-purple-100 px-1.5 py-1 text-left">Vendor code</th>
              <th className="border border-purple-100 px-1.5 py-1 text-left">Product</th>
              <th className="border border-purple-100 px-1.5 py-1 text-left">Batch ref</th>
              <th className="border border-purple-100 px-1.5 py-1 text-right">Qty</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr key={`${line.vpoNumber}-${line.referenceCode}-${idx}`} className="bg-white">
                <td className="border border-purple-100 px-1.5 py-1 font-bold text-purple-700">
                  {line.vpoNumber}
                </td>
                <td className="border border-purple-100 px-1.5 py-1 font-medium">
                  {line.vendorName}
                </td>
                <td className="border border-purple-100 px-1.5 py-1 font-mono font-semibold text-gray-800">
                  {line.vendorCode}
                </td>
                <td className="border border-purple-100 px-1.5 py-1">{line.productName}</td>
                <td className="border border-purple-100 px-1.5 py-1 font-semibold">
                  {line.referenceCode}
                </td>
                <td className="border border-purple-100 px-1.5 py-1 text-right font-bold">
                  {line.qty.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
