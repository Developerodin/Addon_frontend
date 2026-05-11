"use client";

import React from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  modalStep: number;
  modalTotalSteps: number;
  headline: string;
  selectedPoNumber: string;
  scope: "entire_po" | "lots";
  typedAck: string;
  onTypedAckChange: (v: string) => void;
  onNextStep: () => void;
  onFinalize: () => void;
  finalizing: boolean;
};

/**
 * Multi-step destructive confirmation for vendor return finalize.
 */
export function PoVendorReturnConfirmModal({
  open,
  onClose,
  modalStep,
  modalTotalSteps,
  headline,
  selectedPoNumber,
  scope,
  typedAck,
  onTypedAckChange,
  onNextStep,
  onFinalize,
  finalizing,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vr-modal-title"
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="vr-modal-title" className="text-sm font-bold text-gray-900">
          Confirm vendor return · Step {modalStep + 1} / {modalTotalSteps}
        </h3>
        <p className="text-[11px] text-gray-600 mt-2">{headline || "—"}</p>
        <p className="text-[11px] text-gray-600 mt-1">
          PO <span className="font-mono">{selectedPoNumber}</span> · {scope} · ST, LT, and unallocated
          stock in this scope will be removed (eligible cones only; issued/used cones block finalize).
        </p>

        {modalStep < 3 && (
          <p className="text-xs text-gray-800 mt-3">
            {modalStep === 0 && "You are about to remove stock from the system and update this PO. Continue?"}
            {modalStep === 1 &&
              "This cannot be undone. ERP cancellation must still be completed separately. Continue?"}
            {modalStep === 2 &&
              "Final check: all ST / LT / unallocated boxes in scope plus eligible (not issued) cones will be deleted. This cannot be undone."}
          </p>
        )}

        {modalStep === 3 && (
          <div className="mt-3">
            <label htmlFor="vr-type-ack" className="block text-[11px] font-medium text-gray-600 mb-1">
              Type RETURN to confirm
            </label>
            <input
              id="vr-type-ack"
              value={typedAck}
              onChange={(e) => onTypedAckChange(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-xs font-mono"
              autoComplete="off"
              aria-required="true"
            />
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50"
            disabled={finalizing}
          >
            Cancel
          </button>
          {modalStep < 3 ? (
            <button
              type="button"
              onClick={onNextStep}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-gray-900 rounded-md hover:bg-gray-800"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={onFinalize}
              disabled={finalizing || typedAck.trim().toUpperCase() !== "RETURN"}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-40"
            >
              {finalizing ? "Working…" : "Execute vendor return"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
