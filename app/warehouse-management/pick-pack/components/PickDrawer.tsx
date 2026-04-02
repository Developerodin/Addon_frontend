"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { PickItem } from "../types";
import StatusBadge from "./StatusBadge";

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

export default function PickDrawer({
  isOpen,
  item,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  item: PickItem | null;
  onClose: () => void;
  onSave: (itemId: string, pickupQty: number) => void;
}) {
  const [pickupQty, setPickupQty] = useState<number>(0);

  useEffect(() => {
    if (item) {
      setPickupQty(item.pickedQty);
    }
  }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const max = item?.requiredQty ?? 0;

  const canSave = useMemo(() => {
    if (!item) return false;
    if (item.status === "verified" || item.status === "skipped") return false;
    return pickupQty >= 0 && pickupQty <= max && pickupQty !== item.pickedQty;
  }, [item, pickupQty, max]);

  if (!isOpen || !item) return null;

  return (
    <div className={`fixed inset-0 z-50 overflow-hidden ${isOpen ? "" : "pointer-events-none"}`}>
      <div
        className={`fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />

      <div
        className={`fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl transform transition-transform duration-200 ease-in-out overflow-hidden flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="bg-purple-600 text-white px-6 py-4 flex-shrink-0">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h3 className="text-lg font-semibold">Pick Item Details</h3>
              <p className="text-sm text-white/80 mt-1">{item.sku}</p>
            </div>
            <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
          <div className="mt-3">
            <StatusBadge label={item.status} tone={statusTone(item.status)} size="md" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 border border-gray-100 rounded p-3">
              <div className="text-[10px] font-bold text-gray-500 uppercase">Order No</div>
              <div className="text-sm font-bold text-purple-700 mt-1">{item.orderNumber || "—"}</div>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded p-3">
              <div className="text-[10px] font-bold text-gray-500 uppercase">Style Code</div>
              <div className="text-sm font-bold text-gray-900 mt-1">{item.styleCode || item.sku}</div>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded p-3">
              <div className="text-[10px] font-bold text-gray-500 uppercase">Shade</div>
              <div className="text-sm font-bold text-gray-900 mt-1">{item.shade || "—"}</div>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded p-3">
              <div className="text-[10px] font-bold text-gray-500 uppercase">Unit</div>
              <div className="text-sm font-bold text-gray-900 mt-1">{item.unit}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-sky-50 border border-sky-100 rounded p-3">
              <div className="text-[10px] font-bold text-sky-700 uppercase">Required Qty</div>
              <div className="text-2xl font-extrabold text-sky-900 mt-1">{item.requiredQty}</div>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded p-3">
              <div className="text-[10px] font-bold text-amber-700 uppercase">Current Pickup</div>
              <div className="text-2xl font-extrabold text-amber-900 mt-1">{item.pickedQty}</div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded p-4">
            <label className="text-[11px] font-bold text-gray-600 uppercase block mb-2">
              Pickup Quantity
            </label>
            <input
              type="number"
              min={0}
              max={max}
              value={pickupQty}
              disabled={item.status === "verified" || item.status === "skipped"}
              onChange={(e) => setPickupQty(Math.max(0, Number(e.target.value)))}
              className="w-full bg-white border border-gray-200 rounded px-3 py-2.5 text-lg font-bold text-center outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition-colors disabled:bg-gray-50 disabled:text-gray-400"
            />
            {pickupQty > 0 && pickupQty < item.requiredQty && (
              <div className="text-[11px] font-semibold text-orange-700 bg-orange-50 border border-orange-100 rounded px-3 py-2 mt-3">
                <i className="ri-alert-line me-1"></i>
                Partial pickup ({pickupQty}/{item.requiredQty})
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 flex gap-2 justify-end bg-white">
          <button type="button" className="ti-btn ti-btn-light px-4 py-2.5" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="ti-btn ti-btn-primary px-4 py-2.5"
            onClick={() => onSave(item.id, pickupQty)}
            disabled={!canSave}
          >
            <i className="ri-save-line me-1"></i>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
