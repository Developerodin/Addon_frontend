"use client";

import React from "react";
import type { PickItem } from "../types";
import StatusBadge from "./StatusBadge";
import RackLocationChip from "./RackLocationChip";
import OrderChipList from "./OrderChipList";
import QtyInputCell from "./QtyInputCell";

function statusTone(status: PickItem["status"]) {
  switch (status) {
    case "pending":
      return "yellow" as const;
    case "partial":
      return "orange" as const;
    case "picked":
      return "blue" as const;
    case "verified":
      return "green" as const;
    case "skipped":
      return "red" as const;
    default:
      return "gray" as const;
  }
}

export default function PickTable({
  items,
  onOpenPick,
  onInlineQtyChange,
}: {
  items: PickItem[];
  onOpenPick: (item: PickItem) => void;
  onInlineQtyChange: (itemId: string, pickedQty: number) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <i className="ri-inbox-line text-xl text-gray-200"></i>
        </div>
        <h3 className="text-xs font-bold text-gray-400 mb-1">NO PICK ITEMS</h3>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto min-h-[260px]">
      <table className="w-full border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-50/30">
            <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 w-16">
              Path #
            </th>
            <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 w-28">
              SKU
            </th>
            <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
              Item
            </th>
            <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 w-40">
              Rack Location
            </th>
            <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 w-40">
              Qty (Req / Picked)
            </th>
            <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 w-44">
              Linked Orders
            </th>
            <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 w-28">
              Status
            </th>
            <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 w-28">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const pct = item.requiredQty > 0 ? Math.round((item.pickedQty / item.requiredQty) * 100) : 0;
            const warn = item.pickedQty > 0 && item.pickedQty < item.requiredQty && item.status === "picked";
            const canEdit = item.status !== "verified" && item.status !== "skipped";

            return (
              <tr
                key={item.id}
                className="hover:bg-gray-50/50 transition-colors group"
              >
                <td className="px-1.5 py-2.5 border border-gray-200">
                  <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-[12px] font-bold">
                    {item.pathIndex}
                  </div>
                </td>
                <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">
                  {item.sku}
                </td>
                <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-700 border border-gray-200">
                  <div className="font-semibold text-gray-800">{item.name}</div>
                  {item.batchId ? (
                    <div className="text-[10px] text-gray-500">Batch: {item.batchId}</div>
                  ) : null}
                </td>
                <td className="px-1.5 py-2.5 border border-gray-200">
                  <RackLocationChip location={item.rackLocation} />
                </td>
                <td className="px-1.5 py-2.5 border border-gray-200">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] font-bold text-gray-700">
                        {item.requiredQty} {item.unit}
                      </div>
                      <div className="text-[10px] font-semibold text-gray-500">{pct}%</div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded">
                      <div
                        className="h-2 bg-purple-600 rounded"
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[10px] text-gray-500">
                        Picked:
                      </div>
                      <QtyInputCell
                        value={item.pickedQty}
                        min={0}
                        max={item.requiredQty}
                        onChange={(next) => onInlineQtyChange(item.id, next)}
                        disabled={!canEdit}
                        warn={warn}
                        className="scale-[0.92] origin-right"
                      />
                    </div>
                  </div>
                </td>
                <td className="px-1.5 py-2.5 border border-gray-200">
                  <OrderChipList orderIds={item.linkedOrderIds} max={3} />
                </td>
                <td className="px-1.5 py-2.5 border border-gray-200">
                  <StatusBadge
                    label={item.status}
                    tone={statusTone(item.status)}
                    size="sm"
                  />
                </td>
                <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                  <button
                    type="button"
                    onClick={() => onOpenPick(item)}
                    className="ti-btn ti-btn-primary inline-flex items-center justify-center px-3 py-2 min-w-[92px]"
                  >
                    <i className="ri-hand-coin-line me-1"></i>
                    PICK
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

