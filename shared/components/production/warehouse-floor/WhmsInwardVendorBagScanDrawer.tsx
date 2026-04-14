"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { containersMasterService } from "@/shared/services/containersMasterService";

type Props = {
  open: boolean;
  onClose: () => void;
  onAccepted?: () => void | Promise<void>;
};

/**
 * Vendor inward: after dispatch → warehouse `PATCH …/transfer`, complete the handoff with empty-body
 * `POST …/containers-masters/barcode/:barcode/accept` (Warehouse Inward), per vendor dispatch doc.
 */
export default function WhmsInwardVendorBagScanDrawer({ open, onClose, onAccepted }: Props) {
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBarcode("");
  }, [open]);

  const runAccept = async () => {
    const bc = barcode.trim();
    if (!bc) {
      toast.error("Scan or enter the bag barcode.");
      return;
    }
    setLoading(true);
    try {
      await containersMasterService.acceptByBarcode(bc);
      try {
        await containersMasterService.clearActiveByBarcode(bc);
      } catch {
        /* best-effort */
      }
      toast.success("Container accept completed.");
      await onAccepted?.();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Accept failed");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[62]" onClick={() => !loading && onClose()} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="inward-vendor-bag-scan-title"
        className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-[63] flex flex-col overflow-hidden animate-slide-in-right"
      >
        <div className="flex justify-between items-center p-[10px] border-b border-gray-200 shrink-0">
          <h3 id="inward-vendor-bag-scan-title" className="text-sm font-bold text-gray-800">
            Scan bag — complete inward accept
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-gray-500 hover:text-gray-700 p-1"
            aria-label="Close"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-[10px] space-y-4">
          <p className="text-[11px] text-gray-600 leading-relaxed">
            Use the barcode of the <strong>Active</strong> bag used on dispatch for <strong>dispatch → warehouse</strong>{" "}
            transfer. This sends an empty-body accept so the server clears staged vendor items and completes the handoff.
          </p>
          <div className="space-y-1">
            <label htmlFor="inward-vendor-bag-bc" className="block text-[11px] font-medium text-[#495057]">
              Bag barcode <span className="text-red-600">*</span>
            </label>
            <input
              id="inward-vendor-bag-bc"
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void runAccept()}
              placeholder="Scan or type"
              disabled={loading}
              className="w-full border border-gray-200 rounded pl-3 pr-3 py-1.5 text-[11px] font-medium focus:ring-0 focus:border-teal-500"
              autoComplete="off"
              aria-label="Warehouse staged bag barcode"
            />
          </div>
          <button
            type="button"
            disabled={loading || !barcode.trim()}
            onClick={() => void runAccept()}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Confirm accept"}
          </button>
        </div>
      </div>
    </>
  );
}
