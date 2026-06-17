"use client";

import React, { useState } from "react";
import NumericInput from "@/shared/utils/numericInput";
import type { VendorM3FlowRow } from "@/shared/services/vendorM2M3M4ManagementService";

export interface M3OutwardDrawerProps {
  row: VendorM3FlowRow;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (quantity: number, remarks: string) => Promise<void>;
}

/**
 * Drawer to mark vendor M3 quantity as outward with required remarks.
 */
export default function M3OutwardDrawer({
  row,
  isSubmitting = false,
  onClose,
  onSubmit,
}: M3OutwardDrawerProps) {
  const maxQty = row.m3Snapshot.availableForOutward;
  const [quantity, setQuantity] = useState(maxQty > 0 ? maxQty : 0);
  const [remarks, setRemarks] = useState("");

  const handleSubmit = async () => {
    if (quantity <= 0 || quantity > maxQty) return;
    if (!remarks.trim()) return;
    await onSubmit(quantity, remarks.trim());
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} aria-hidden="true" />
      <aside
        className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right border-l-2 border-orange-200"
        role="dialog"
        aria-labelledby="vendor-m3-outward-title"
        aria-modal="true"
      >
        <header className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-orange-50">
          <h2 id="vendor-m3-outward-title" className="text-sm font-bold text-orange-900">
            Mark M3 Outward
          </h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-800 text-lg leading-none" aria-label="Close outward drawer">×</button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="text-[11px] text-gray-700 space-y-1">
            <p><span className="font-semibold">VPO:</span> {row.vpoNumber || "—"}</p>
            <p><span className="font-semibold">Reference:</span> {row.referenceCode || "—"}</p>
            <p>
              <span className="font-semibold">Available:</span>{" "}
              <span className="text-orange-800 font-bold">{maxQty}</span>
            </p>
          </div>

          <div>
            <label htmlFor="vendor-m3-outward-qty" className="block text-[11px] font-bold text-gray-800 mb-1">
              Outward quantity
            </label>
            <NumericInput
              id="vendor-m3-outward-qty"
              className="w-full py-2 px-3 text-sm border-2 border-orange-200 rounded"
              value={quantity}
              min={0}
              max={maxQty}
              onChange={setQuantity}
              allowDecimals
              placeholder="0"
              aria-label="Outward quantity"
            />
          </div>

          <div>
            <label htmlFor="vendor-m3-outward-remarks" className="block text-[11px] font-bold text-gray-800 mb-1">
              Remarks <span className="text-orange-600">*</span>
            </label>
            <textarea
              id="vendor-m3-outward-remarks"
              rows={4}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full py-2 px-3 text-sm border-2 border-gray-300 rounded resize-y min-h-[80px]"
              placeholder="Reason for outward..."
              aria-label="Outward remarks"
            />
          </div>
        </div>

        <footer className="p-4 border-t border-gray-200 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 text-sm font-semibold border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
          <button
            type="button"
            disabled={isSubmitting || quantity <= 0 || quantity > maxQty || !remarks.trim()}
            onClick={() => void handleSubmit()}
            className="flex-1 py-2 text-sm font-semibold bg-orange-700 text-white rounded hover:bg-orange-800 disabled:opacity-50"
          >
            {isSubmitting ? "Saving…" : "Confirm Outward"}
          </button>
        </footer>
      </aside>
    </>
  );
}
