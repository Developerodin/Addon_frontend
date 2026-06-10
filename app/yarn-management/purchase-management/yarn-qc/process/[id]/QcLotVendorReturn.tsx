"use client";

import React, { useState } from "react";
import { toast } from "react-hot-toast";
import yarnPurchaseOrderService, { type QcVendorReturnResult } from "@/shared/services/yarnPurchaseOrderService";
import { QcVendorReturnResultLinks } from "./QcVendorReturnResultLinks";

type QcLotVendorReturnProps = {
  poNumber: string;
  lotNumber: string;
  lotStatus: string;
  userEmail: string;
  userId: string;
  onDone: () => Promise<void>;
};

/** Lot statuses eligible for per-lot vendor return from QC. */
const QC_LOT_RETURN_ELIGIBLE_STATUSES = new Set([
  "lot_pending",
  "lot_qc_pending",
  "lot_rejected",
]);

/**
 * Per-lot button + dialog: hybrid QC return (pre-ST auto-finalize + ST pending scan).
 * Shown for pending and rejected lots; hidden for accepted or already-returned lots.
 */
export function QcLotVendorReturn({ poNumber, lotNumber, lotStatus, userEmail, userId, onDone }: QcLotVendorReturnProps) {
  const [open, setOpen] = useState(false);
  const [remark, setRemark] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<QcVendorReturnResult | null>(null);

  const eligible = QC_LOT_RETURN_ELIGIBLE_STATUSES.has(lotStatus);
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
      const res = await yarnPurchaseOrderService.finalizeQcLotReturn({
        poNumber,
        lotNumber,
        remark: r,
      });
      setResult(res);
      const parts: string[] = [];
      if (res.autoReturnedBoxCount > 0) {
        const bn = (res.boxChallan as { challanNumber?: string } | null)?.challanNumber ?? res.challanNumber;
        parts.push(`${res.autoReturnedBoxCount} box(es)${bn ? ` · ${bn}` : ''}`);
      }
      if (res.autoReturnedCount > 0) {
        const cn = (res.coneChallan as { challanNumber?: string } | null)?.challanNumber;
        parts.push(`${res.autoReturnedCount} cone(s)${cn ? ` · ${cn}` : ''}`);
      }
      if (res.pendingStCount > 0) parts.push(`${res.pendingStCount} ST cone(s) need PO Return`);
      if (res.excludedConeCount > 0) parts.push(`${res.excludedConeCount} skipped`);
      if (parts.length > 0) {
        toast.success(`Lot ${lotNumber} — ${parts.join(' · ')}`);
      } else {
        toast.success(`Lot ${lotNumber} marked return to vendor`);
      }
      await onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to return lot");
    } finally {
      setBusy(false);
    }
  };

  const closeModal = () => {
    setOpen(false);
    setRemark("");
    setResult(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setRemark("");
          setResult(null);
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
              {result ? `Lot ${lotNumber} return processed` : `Return lot ${lotNumber} to vendor?`}
            </h2>
            {!result ? (
              <>
                {lotStatus === "lot_rejected" && (
                  <p className="text-[11px] text-red-800 bg-red-50 border border-red-200 rounded px-2 py-1.5 mb-2">
                    This lot was QC rejected. Confirming will process vendor return and issue challan(s) where
                    applicable.
                  </p>
                )}
                <p className="text-[11px] text-gray-600 mb-2">
                  Pre-storage cones are returned immediately and a challan is issued. Cones already in short-term
                  storage must be finalized on{" "}
                  <strong>PO Return</strong>. Lot status becomes <strong>returned to vendor</strong>.
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
              </>
            ) : (
              <div className="mb-3">
                <QcVendorReturnResultLinks poNumber={poNumber} lotNumber={lotNumber} result={result} />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1.5 text-[11px] font-semibold text-gray-700 border border-gray-200 rounded"
                onClick={closeModal}
                disabled={busy}
              >
                {result ? "Close" : "Cancel"}
              </button>
              {!result && (
                <button
                  type="button"
                  className="px-3 py-1.5 text-[11px] font-bold text-white bg-amber-700 rounded hover:bg-amber-800 disabled:opacity-50"
                  onClick={() => void handleConfirm()}
                  disabled={busy}
                >
                  {busy ? "Saving…" : "Confirm"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
