"use client";

import Link from "next/link";
import React, { useState } from "react";
import { toast } from "react-hot-toast";
import yarnPurchaseOrderService, { type QcVendorReturnResult } from "@/shared/services/yarnPurchaseOrderService";
import { QcVendorReturnResultLinks } from "./QcVendorReturnResultLinks";

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
 * PO-level hybrid QC return: pre-ST auto-finalize + ST pending PO Return scan.
 */
export function QcVendorReturnSection({
  poNumber,
  apiCurrentStatus,
  userEmail,
  userId,
  onDone,
}: QcVendorReturnSectionProps) {
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [poRemark, setPoRemark] = useState("");
  const [poBusy, setPoBusy] = useState(false);
  const [result, setResult] = useState<QcVendorReturnResult | null>(null);

  const poAlreadyReturned = apiCurrentStatus === "returned_to_vendor";

  /**
   * Builds a toast message covering challan issuance and/or pending ST cones.
   */
  const toastForQcReturnResult = (res: QcVendorReturnResult, label: string) => {
    const parts: string[] = [];
    if (res.autoReturnedBoxCount > 0) {
      const boxChallan = (res.boxChallan as { challanNumber?: string } | null)?.challanNumber;
      parts.push(`${res.autoReturnedBoxCount} box(es) returned${boxChallan ? ` · ${boxChallan}` : ''}`);
    }
    if (res.autoReturnedCount > 0) {
      const coneChallan = (res.coneChallan as { challanNumber?: string } | null)?.challanNumber;
      parts.push(`${res.autoReturnedCount} cone(s) returned${coneChallan ? ` · ${coneChallan}` : ''}`);
    }
    if (!parts.length && res.challanNumber) parts.push(`Challan ${res.challanNumber}`);
    if (res.pendingStCount > 0) parts.push(`${res.pendingStCount} ST cone(s) need PO Return`);
    if (res.excludedConeCount > 0) parts.push(`${res.excludedConeCount} skipped (issued/used)`);
    if (parts.length === 0) {
      toast.success(`${label} marked return to vendor`);
      return;
    }
    toast.success(`${label} — ${parts.join(" · ")}`);
  };

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
      const res = await yarnPurchaseOrderService.finalizeQcPoReturn({ poNumber, remark });
      setResult(res);
      toastForQcReturnResult(res, "PO");
      setPoRemark("");
      await onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update PO");
    } finally {
      setPoBusy(false);
    }
  };

  const closeModal = () => {
    setPoModalOpen(false);
    setPoRemark("");
    setResult(null);
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2 items-center justify-between p-3 bg-amber-50/80 rounded-lg border border-amber-200">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wide">Return to vendor (QC)</p>
          <p className="text-[11px] text-amber-800/90 mt-0.5">
            Pre-storage cones get a return challan immediately. ST cones are completed on PO Return. PO status and
            history record your remark.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setPoRemark("");
            setResult(null);
            setPoModalOpen(true);
          }}
          disabled={poBusy || poAlreadyReturned}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-700 text-white text-[11px] font-bold hover:bg-amber-800 disabled:opacity-45 disabled:cursor-not-allowed"
        >
          <i className="ri-arrow-go-back-line text-xs" aria-hidden />
          Return full PO
        </button>
      </div>

      {poAlreadyReturned && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-orange-200 bg-orange-50/90 px-3 py-2 text-[11px] text-orange-950"
        >
          PO is already <strong>returned to vendor</strong>. Use{" "}
          <Link
            href={`/yarn-management/purchase-management/po-return?poNumber=${encodeURIComponent(poNumber)}`}
            className="font-bold underline hover:text-orange-900"
          >
            PO Return
          </Link>{" "}
          for any remaining ST cones, or view{" "}
          <Link
            href="/yarn-management/purchase-management/po-return-challan"
            className="font-bold underline hover:text-orange-900"
          >
            return challans
          </Link>
          .
        </div>
      )}

      {poModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="qc-po-return-title"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 border border-gray-200">
            <h2 id="qc-po-return-title" className="text-sm font-bold text-gray-900 mb-2">
              {result ? "PO return processed" : "Return entire PO to vendor?"}
            </h2>
            {!result ? (
              <>
                <p className="text-[11px] text-gray-600 mb-2">
                  PO <span className="font-mono font-semibold">{poNumber}</span> moves to{" "}
                  <strong>returned to vendor</strong>. Pre-storage cones are archived and challan issued; ST cones
                  need PO Return finalize.
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
              </>
            ) : (
              <div className="mb-3">
                <QcVendorReturnResultLinks poNumber={poNumber} result={result} />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1.5 text-[11px] font-semibold text-gray-700 border border-gray-200 rounded"
                onClick={closeModal}
                disabled={poBusy}
              >
                {result ? "Close" : "Cancel"}
              </button>
              {!result && (
                <button
                  type="button"
                  className="px-3 py-1.5 text-[11px] font-bold text-white bg-amber-700 rounded hover:bg-amber-800 disabled:opacity-50"
                  onClick={() => void handlePoReturnConfirm()}
                  disabled={poBusy}
                >
                  {poBusy ? "Saving…" : "Confirm PO return"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
