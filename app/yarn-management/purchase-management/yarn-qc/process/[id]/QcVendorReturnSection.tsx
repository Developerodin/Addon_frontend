"use client";

import React, { useState } from "react";
import { toast } from "react-hot-toast";
import yarnPurchaseOrderService from "@/shared/services/yarnPurchaseOrderService";

type QcVendorReturnSectionProps = {
  orderId: string;
  poNumber: string;
  /** Raw `currentStatus` from API (snake_case). */
  apiCurrentStatus?: string;
  userEmail: string;
  userId: string;
  onDone: () => Promise<void>;
};

/**
 * PO-level "return to vendor" on QC process: updates PO status + status history with remark and user email.
 */
export function QcVendorReturnSection({
  orderId,
  poNumber,
  apiCurrentStatus,
  userEmail,
  userId,
  onDone,
}: QcVendorReturnSectionProps) {
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [poRemark, setPoRemark] = useState("");
  const [poBusy, setPoBusy] = useState(false);

  const poAlreadyReturned = apiCurrentStatus === "returned_to_vendor";

  const handlePoReturnConfirm = async () => {
    if (!userId || !userEmail) {
      toast.error("Login required");
      return;
    }
    const remark = poRemark.trim();
    if (!remark) {
      toast.error("Enter a return remark");
      return;
    }
    setPoBusy(true);
    try {
      const notes = `QC return to vendor — ${remark} — by ${userEmail}`;
      await yarnPurchaseOrderService.updatePurchaseOrderStatus(
        orderId,
        "returned to vendor",
        userId,
        userEmail,
        notes
      );
      toast.success("PO marked returned to vendor (logged in status history)");
      setPoModalOpen(false);
      setPoRemark("");
      await onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update PO");
    } finally {
      setPoBusy(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2 items-center justify-between p-3 bg-amber-50/80 rounded-lg border border-amber-200">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wide">Return to vendor (QC)</p>
          <p className="text-[11px] text-amber-800/90 mt-0.5">
            Marks the full PO for supplier return. Status history records remark and your email.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setPoRemark("");
            setPoModalOpen(true);
          }}
          disabled={poBusy || poAlreadyReturned}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-700 text-white text-[11px] font-bold hover:bg-amber-800 disabled:opacity-45 disabled:cursor-not-allowed"
        >
          <i className="ri-arrow-go-back-line text-xs" aria-hidden />
          Return full PO
        </button>
      </div>

      {poModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="qc-po-return-title"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 border border-gray-200">
            <h2 id="qc-po-return-title" className="text-sm font-bold text-gray-900 mb-2">
              Return entire PO to vendor?
            </h2>
            <p className="text-[11px] text-gray-600 mb-2">
              PO <span className="font-mono font-semibold">{poNumber}</span> will move to{" "}
              <strong>returned to vendor</strong>. History will include this remark and{" "}
              <span className="font-mono">{userEmail}</span>.
            </p>
            <label htmlFor="qc-po-return-remark" className="text-[11px] font-semibold text-gray-700 block mb-1">
              Remark <span className="text-red-600">*</span>
            </label>
            <textarea
              id="qc-po-return-remark"
              rows={3}
              value={poRemark}
              onChange={(e) => setPoRemark(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 mb-3"
              placeholder="Reason for return (required)…"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1.5 text-[11px] font-semibold text-gray-700 border border-gray-200 rounded"
                onClick={() => setPoModalOpen(false)}
                disabled={poBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-[11px] font-bold text-white bg-amber-700 rounded hover:bg-amber-800 disabled:opacity-50"
                onClick={() => void handlePoReturnConfirm()}
                disabled={poBusy}
              >
                {poBusy ? "Saving…" : "Confirm PO return"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
