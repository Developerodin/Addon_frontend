"use client";

import React, { useState } from "react";
import NumericInput from "@/shared/utils/numericInput";
import {
  formatVendorQcFloor,
  type VendorM2EntryRow,
} from "@/shared/services/vendorM2M3M4ManagementService";

export type M2ResolveAction = "merge" | "m3" | "m4";

export interface M2ResolveDrawerProps {
  entry: VendorM2EntryRow;
  action: M2ResolveAction;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (quantity: number, remarks: string) => Promise<void>;
}

const ACTION_LABELS: Record<M2ResolveAction, { title: string; hint: string; btn: string }> = {
  merge: {
    title: "Merge M2 → M1 (cascade)",
    hint: "Adds qty to M1 on source floor and all downstream vendor floors through Dispatch.",
    btn: "Confirm merge",
  },
  m3: {
    title: "Transfer M2 → M3",
    hint: "Moves qty from M2 to M3 on the source QC floor only.",
    btn: "Transfer to M3",
  },
  m4: {
    title: "Transfer M2 → M4",
    hint: "Moves qty from M2 to M4 (FC) or vendor return qty (SC) on the source QC floor.",
    btn: "Transfer to M4",
  },
};

/**
 * Drawer to resolve an open vendor M2 entry (merge cascade or transfer to M3/M4).
 */
export default function M2ResolveDrawer({
  entry,
  action,
  isSubmitting = false,
  onClose,
  onSubmit,
}: M2ResolveDrawerProps) {
  const maxQty = entry.remainingQuantity ?? entry.quantity;
  const [quantity, setQuantity] = useState(maxQty > 0 ? maxQty : 0);
  const [remarks, setRemarks] = useState("");
  const labels = ACTION_LABELS[action];

  const canSubmit =
    !isSubmitting &&
    quantity > 0 &&
    quantity <= maxQty &&
    remarks.trim().length > 0 &&
    !(action === "merge" && entry.canMergeToM1 === false);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onSubmit(quantity, remarks.trim());
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} aria-hidden="true" />
      <aside
        className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l-2 border-yellow-300"
        role="dialog"
        aria-labelledby="vendor-m2-resolve-title"
        aria-modal="true"
      >
        <header className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-yellow-50">
          <h2 id="vendor-m2-resolve-title" className="text-sm font-bold text-yellow-900">
            {labels.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-lg leading-none"
            aria-label="Close resolve drawer"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="text-[11px] text-gray-700 space-y-1">
            <p>
              <span className="font-semibold">Entry:</span> {entry.entryId}
            </p>
            <p>
              <span className="font-semibold">VPO:</span> {entry.vpoNumber || "—"}
            </p>
            <p>
              <span className="font-semibold">Reference:</span> {entry.referenceCode || "—"}
            </p>
            <p>
              <span className="font-semibold">Source floor:</span> {formatVendorQcFloor(entry.sourceFloor)}
            </p>
            <p>
              <span className="font-semibold">Remaining:</span>{" "}
              <span className="text-yellow-800 font-bold">{maxQty}</span>
            </p>
            <p className="text-[10px] text-yellow-800 mt-2">{labels.hint}</p>
            {action === "merge" && entry.canMergeToM1 === false && (
              <p className="text-[10px] text-red-700 font-medium mt-2" role="alert">
                {entry.mergeBlockedReason || "Merge is blocked until the flow reaches Dispatch."}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="vendor-m2-resolve-qty" className="block text-[11px] font-bold text-gray-800 mb-1">
              Quantity
            </label>
            <NumericInput
              id="vendor-m2-resolve-qty"
              className="w-full py-2 px-3 text-sm border-2 border-yellow-200 rounded"
              value={quantity}
              min={0}
              max={maxQty}
              onChange={setQuantity}
              allowDecimals
              aria-label="Resolve quantity"
            />
          </div>

          <div>
            <label htmlFor="vendor-m2-resolve-remarks" className="block text-[11px] font-bold text-gray-800 mb-1">
              Remarks <span className="text-yellow-700">*</span>
            </label>
            <textarea
              id="vendor-m2-resolve-remarks"
              rows={4}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full py-2 px-3 text-sm border-2 border-gray-300 rounded resize-y min-h-[80px]"
              placeholder="Repair completed offline / reason for transfer"
              aria-required="true"
            />
          </div>
        </div>

        <footer className="p-4 border-t border-gray-200 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 text-sm font-bold border-2 border-gray-300 rounded text-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
            className="flex-1 py-2 text-sm font-bold bg-yellow-500 text-yellow-950 rounded border-2 border-yellow-600 disabled:opacity-50"
          >
            {isSubmitting ? "Saving…" : labels.btn}
          </button>
        </footer>
      </aside>
    </>
  );
}
