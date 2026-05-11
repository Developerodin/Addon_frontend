"use client";

import React, { useState } from "react";
import { toast } from "react-hot-toast";
import yarnPurchaseOrderService from "@/shared/services/yarnPurchaseOrderService";

type QcLotVendorReturnProps = {
  poNumber: string;
  lotNumber: string;
  lotStatus: string;
  userEmail: string;
  userId: string;
  onDone: () => Promise<void>;
};

/**
 * Per-lot button + dialog: sets lot status to `lot_returned_to_vendor` and annotates box QC (rejected) with remark.
 */
export function QcLotVendorReturn({ poNumber, lotNumber, lotStatus, userEmail, userId, onDone }: QcLotVendorReturnProps) {
  const [open, setOpen] = useState(false);
  const [remark, setRemark] = useState("");
  const [busy, setBusy] = useState(false);

  const eligible = lotStatus === "lot_qc_pending" || lotStatus === "lot_pending";
  if (!eligible) return null;

  const handleConfirm = async () => {
    const r = remark.trim();
    if (!r) {
      toast.error("Enter a return remark");
      return;
    }
    if (!userId || !userEmail) {
      toast.error("Login required");
      return;
    }
    setBusy(true);
    try {
      await yarnPurchaseOrderService.updateLotStatusQCApprove({
        poNumber,
        lotNumber,
        lotStatus: "lot_returned_to_vendor",
        updated_by: { username: userEmail, user_id: userId },
        notes: `Lot ${lotNumber} return to vendor (QC) — ${r} — by ${userEmail}`,
        remarks: `Return to vendor: ${r}`,
      });
      toast.success(`Lot ${lotNumber} marked return to vendor`);
      setOpen(false);
      setRemark("");
      await onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update lot");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setRemark("");
          setOpen(true);
        }}
        disabled={busy}
        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-amber-600 text-amber-900 bg-white text-[10px] font-bold hover:bg-amber-50 disabled:opacity-50"
      >
        <i className="ri-arrow-go-back-line text-[10px]" aria-hidden />
        Return lot
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`qc-lot-ret-${lotNumber}`}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 border border-gray-200">
            <h2 id={`qc-lot-ret-${lotNumber}`} className="text-sm font-bold text-gray-900 mb-2">
              Return lot {lotNumber} to vendor?
            </h2>
            <p className="text-[11px] text-gray-600 mb-2">
              Lot stays on the PO with status <strong>returned to vendor</strong>. Related boxes are marked QC rejected
              with your remark so this stock is not treated as accepted.
            </p>
            <label htmlFor={`qc-lot-remark-${lotNumber}`} className="text-[11px] font-semibold text-gray-700 block mb-1">
              Remark <span className="text-red-600">*</span>
            </label>
            <textarea
              id={`qc-lot-remark-${lotNumber}`}
              rows={3}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 mb-3"
              placeholder="Reason for lot return…"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1.5 text-[11px] font-semibold text-gray-700 border border-gray-200 rounded"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-[11px] font-bold text-white bg-amber-700 rounded hover:bg-amber-800 disabled:opacity-50"
                onClick={() => void handleConfirm()}
                disabled={busy}
              >
                {busy ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
