"use client";

import React from "react";
import type { PackBatch } from "../types";
import OrderChipList from "./OrderChipList";
import StatusBadge from "./StatusBadge";

function batchTone(status: PackBatch["status"]) {
  switch (status) {
    case "ready":
      return "yellow" as const;
    case "packing":
      return "blue" as const;
    case "packed":
      return "green" as const;
    case "dispatch-ready":
      return "purple" as const;
    default:
      return "gray" as const;
  }
}

const sumPicked = (b: PackBatch) =>
  b.orders.reduce((s, o) => s + o.items.reduce((ss, i) => ss + i.pickedQty, 0), 0);
const sumPacked = (b: PackBatch) =>
  b.orders.reduce((s, o) => s + o.items.reduce((ss, i) => ss + i.packedQty, 0), 0);
const sumSkus = (b: PackBatch) => b.orders.reduce((s, o) => s + o.items.length, 0);

export default function PackTable({
  batches,
  onOpenBatch,
}: {
  batches: PackBatch[];
  onOpenBatch: (batch: PackBatch) => void;
}) {
  if (batches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <i className="ri-inbox-line text-xl text-gray-200"></i>
        </div>
        <h3 className="text-xs font-bold text-gray-400 mb-1">NO PACK BATCHES</h3>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto min-h-[260px]">
      <table className="w-full border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-50/30">
            <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
              Pack Batch ID
            </th>
            <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
              Order IDs
            </th>
            <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 w-28">
              Total SKUs
            </th>
            <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 w-44">
              Packed Items
            </th>
            <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 w-40">
              Status
            </th>
            <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 w-32">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {batches.map((b) => {
            const picked = sumPicked(b);
            const packed = sumPacked(b);
            const skus = sumSkus(b);
            const pct = picked > 0 ? Math.round((packed / picked) * 100) : 0;
            return (
              <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">
                  {b.id}
                </td>
                <td className="px-1.5 py-2.5 border border-gray-200">
                  <OrderChipList orderIds={b.orderIds} max={4} />
                </td>
                <td className="px-1.5 py-2.5 text-[12px] font-semibold text-gray-700 border border-gray-200">
                  {skus}
                </td>
                <td className="px-1.5 py-2.5 border border-gray-200">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold text-gray-800">
                        {packed} / {picked}
                      </span>
                      <span className="text-[10px] font-semibold text-gray-500">{pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded">
                      <div className="h-2 bg-purple-600 rounded" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
                    </div>
                  </div>
                </td>
                <td className="px-1.5 py-2.5 border border-gray-200">
                  <StatusBadge label={b.status} tone={batchTone(b.status)} />
                </td>
                <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary inline-flex items-center justify-center px-3 py-2 min-w-[110px]"
                    onClick={() => onOpenBatch(b)}
                  >
                    <i className="ri-box-3-line me-1"></i>
                    OPEN PACK
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

