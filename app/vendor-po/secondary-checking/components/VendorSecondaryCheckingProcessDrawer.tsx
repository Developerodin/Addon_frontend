"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { CRM } from "../../vendor-list/crmUiClasses";
import type {
  VendorProductionFlow,
  QualityFloorQuantity,
} from "@/shared/services/vendorProductionFlowService";
import vendorGrnService, { type VendorGrn } from "@/shared/services/vendorGrnService";
import {
  resolveScReconciliation,
  savedVerifiedQty,
  type ScDraftTotals,
} from "../utils/resolveScReconciliation";

/** Form state: floor qty (container scan happens after save in a separate modal). */
export type VendorSecondaryCheckingProcessData = Partial<QualityFloorQuantity>;

type Props = {
  open: boolean;
  flow: VendorProductionFlow | null;
  /** True while GET-by-id is in flight — drawer shell shows until fresh flow is loaded. */
  loading?: boolean;
  onClose: () => void;
  processingData: VendorSecondaryCheckingProcessData;
  setProcessingData: React.Dispatch<
    React.SetStateAction<VendorSecondaryCheckingProcessData>
  >;
  onSave: () => void;
  saving?: boolean;
  /** When true, Save is disabled (invalid / noop form — see page evaluateSecondaryCheckingSave). */
  saveDisabled?: boolean;
  /** Called after a GRN is issued from this drawer. */
  onGrnIssued?: (grn: VendorGrn) => void;
};

/**
 * Wide right drawer for editing secondary-checking floor quantities (matches production “Update order” drawer).
 */
export function VendorSecondaryCheckingProcessDrawer({
  open,
  flow,
  loading,
  onClose,
  processingData,
  setProcessingData,
  onSave,
  saving,
  saveDisabled,
  onGrnIssued,
}: Props) {
  const [linkedGrn, setLinkedGrn] = useState<VendorGrn | null>(null);
  const [issuingGrn, setIssuingGrn] = useState(false);

  useEffect(() => {
    if (!open || !flow?.id) {
      setLinkedGrn(null);
      return;
    }
    let cancelled = false;
    void vendorGrnService.getActiveForFlow(flow.id).then((grn) => {
      if (!cancelled) setLinkedGrn(grn);
    });
    return () => {
      cancelled = true;
    };
  }, [open, flow?.id]);

  const draftTotals = useMemo((): ScDraftTotals | undefined => {
    const d: ScDraftTotals = {};
    if (
      processingData.m1Quantity !== undefined &&
      processingData.m1Quantity !== null
    ) {
      d.m1 = Number(processingData.m1Quantity);
    }
    if (
      processingData.m2Quantity !== undefined &&
      processingData.m2Quantity !== null
    ) {
      d.m2 = Number(processingData.m2Quantity);
    }
    if (
      processingData.m3Quantity !== undefined &&
      processingData.m3Quantity !== null
    ) {
      d.m3 = Number(processingData.m3Quantity);
    }
    if (
      processingData.m4Quantity !== undefined &&
      processingData.m4Quantity !== null
    ) {
      d.m4 = Number(processingData.m4Quantity);
    }
    return Object.keys(d).length > 0 ? d : undefined;
  }, [processingData]);

  if (!open) return null;

  const scSaved = flow?.floorQuantities.secondaryChecking;
  const reconciliation = flow
    ? resolveScReconciliation(flow, draftTotals)
    : null;
  const verifiedSaved = flow ? savedVerifiedQty(flow) : 0;
  const pendingBoxScan = scSaved?.pendingFromBoxes ?? 0;
  const scIncomplete =
    (scSaved?.remaining ?? 0) > 0 || pendingBoxScan > 0;

  /**
   * Manually issue GRN from current saved secondary checking totals.
   */
  const handleIssueGrn = async () => {
    if (!flow) return;
    if (verifiedSaved <= 0) {
      toast.error("Save M1–M4 classification before issuing GRN");
      return;
    }
    if (scIncomplete) {
      const ok = window.confirm(
        pendingBoxScan > 0
          ? `${pendingBoxScan.toLocaleString()} units still have boxes to scan, and/or classification is incomplete. Issue GRN anyway?`
          : "Classification is incomplete (unclassified scanned qty > 0). Issue GRN anyway?",
      );
      if (!ok) return;
    }
    setIssuingGrn(true);
    try {
      const grn = await vendorGrnService.issueFromFlow(flow.id, {
        allowIncomplete: scIncomplete,
      });
      setLinkedGrn(grn);
      toast.success(`GRN ${grn.grnNumber} issued`);
      onGrnIssued?.(grn);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to issue GRN");
    } finally {
      setIssuingGrn(false);
    }
  };

  return (
    <>
      <div
        className={CRM.drawerBackdrop}
        onClick={() => {
          if (!saving && !loading && !issuingGrn) onClose();
        }}
        aria-hidden
      />
      <div
        className={CRM.drawerShellLg}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vendor-sc-process-title"
      >
        <div className={CRM.drawerHeaderBar}>
          <h2 id="vendor-sc-process-title" className={CRM.drawerTitle}>
            {loading
              ? "Process secondary checking"
              : `Process secondary checking — ${(flow?.referenceCode || flow?.id.slice(-6)) ?? "—"}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={CRM.drawerCloseBtn}
            aria-label="Close"
            disabled={!!saving || issuingGrn}
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>
        {loading || !flow ? (
          <div className="min-h-[320px] flex items-center justify-center">
            <div className={CRM.loadingWrap}>
              <div className={CRM.spinner} />
              <p className={CRM.loadingLabel}>Loading latest batch data…</p>
            </div>
          </div>
        ) : (
          <>
            <div className={CRM.drawerBodyScroll}>
              <p className={CRM.drawerHint}>
                Enter <strong>absolute totals</strong> for M1 / M2 / M3 / M4 (blank = keep
                saved). Save sends <strong>setSplitTotals</strong> to the server. M1 saves
                open the container staging modal; M2/M3/M4-only saves post immediately.
              </p>

              {linkedGrn && (
                <div className="mx-3 mb-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px]">
                  <span className="font-bold text-emerald-900">Active GRN: </span>
                  <Link
                    href={`/vendor-po/grn/view/${encodeURIComponent(linkedGrn.grnNumber)}`}
                    className="font-bold text-emerald-700 underline"
                  >
                    {linkedGrn.grnNumber}
                  </Link>
                  {linkedGrn.incompleteClassification && (
                    <span className="ml-2 text-amber-800 font-semibold">(incomplete SC)</span>
                  )}
                </div>
              )}

              <div className={CRM.drawerSection}>
                <div className={CRM.drawerSectionHead}>1. Batch summary</div>
                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">
                      Vendor
                    </span>
                    <span className="font-semibold text-gray-900">
                      {typeof flow.vendor === "object"
                        ? (flow.vendor?.header?.vendorName ?? "—")
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">
                      VPO
                    </span>
                    <span className="font-semibold text-purple-700">
                      {typeof flow.vendorPurchaseOrder === "object"
                        ? (flow.vendorPurchaseOrder?.vpoNumber ?? "—")
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">
                      Batch from boxes
                    </span>
                    <span className="font-semibold text-gray-900">
                      {flow.plannedQuantity.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">
                      Scan accepted
                    </span>
                    <span className="font-semibold text-gray-900">
                      {(scSaved?.received ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">
                      Boxes not yet scanned
                    </span>
                    <span className="font-semibold text-orange-700">
                      {(scSaved?.pendingFromBoxes ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">
                      Unclassified (scanned qty)
                    </span>
                    <span className="font-semibold text-amber-900">
                      {(reconciliation?.remaining ?? scSaved?.remaining ?? 0).toLocaleString()}
                      {draftTotals ? (
                        <span className="ml-1 text-[9px] font-medium text-purple-600">
                          (preview)
                        </span>
                      ) : null}
                    </span>
                  </div>
                </div>
              </div>

              {reconciliation && (
                <div className={CRM.drawerSection}>
                  <div className={CRM.drawerSectionHead}>2. Quantity reconciliation</div>
                  <div className="p-3 overflow-x-auto">
                    <table className="w-full text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-[10px] uppercase text-gray-500">
                          <th className="border border-gray-200 px-2 py-1 text-left">Field</th>
                          <th className="border border-gray-200 px-2 py-1 text-right">Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ["Ordered (PO)", reconciliation.ordered],
                          ["Invoice / lot expected", reconciliation.expected],
                          ["Scan accepted", reconciliation.scanAccepted],
                          ["Boxes not yet scanned", reconciliation.pendingBoxScan],
                          ["Classified (M1+M2+M3+M4)", reconciliation.classified],
                          ["Unclassified (scanned qty)", reconciliation.remaining],
                          ["Variance preview", reconciliation.variancePreview],
                        ].map(([label, qty]) => (
                          <tr key={String(label)}>
                            <td className="border border-gray-200 px-2 py-1 font-medium text-gray-700">
                              {label}
                            </td>
                            <td
                              className={`border border-gray-200 px-2 py-1 text-right font-bold ${
                                label === "Variance preview" && Number(qty) !== 0
                                  ? Number(qty) > 0
                                    ? "text-emerald-700"
                                    : "text-red-700"
                                  : "text-gray-900"
                              }`}
                            >
                              {Number(qty).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className={CRM.drawerSection}>
                <div className={CRM.drawerSectionHead}>
                  3. Quality counts (M1 / M2 / M3 / M4)
                </div>
                {scSaved && (
                  <div className="px-3 pt-2 pb-1">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1.5">
                      Saved on server
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center rounded border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        M1: {(scSaved.m1Quantity ?? 0).toLocaleString()}
                      </span>
                      <span className="inline-flex items-center rounded border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        M2: {(scSaved.m2Quantity ?? 0).toLocaleString()}
                      </span>
                      <span className="inline-flex items-center rounded border border-violet-100 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-800">
                        M3: {(scSaved.m3Quantity ?? 0).toLocaleString()}
                      </span>
                      <span className="inline-flex items-center rounded border border-red-100 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-800">
                        M4: {(scSaved.m4Quantity ?? 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
                <div className="p-3 pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className={CRM.label}>M1 total (good)</label>
                    <input
                      type="number"
                      min={0}
                      aria-label="M1 total good"
                      className={`${CRM.input} border-emerald-200 focus:border-emerald-500`}
                      placeholder="Total M1 for batch"
                      value={
                        processingData.m1Quantity === undefined ||
                        processingData.m1Quantity === null
                          ? ""
                          : processingData.m1Quantity
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        setProcessingData((p) => {
                          if (v === "") return { ...p, m1Quantity: undefined };
                          const n = Number(v);
                          if (!Number.isFinite(n)) return p;
                          return { ...p, m1Quantity: Math.round(n) };
                        });
                      }}
                    />
                  </div>
                  <div>
                    <label className={CRM.label}>M2 total (repair)</label>
                    <input
                      type="number"
                      min={0}
                      aria-label="M2 total repair"
                      className={`${CRM.input} border-amber-200 focus:border-amber-500`}
                      placeholder="Total M2 for batch"
                      value={
                        processingData.m2Quantity === undefined ||
                        processingData.m2Quantity === null
                          ? ""
                          : processingData.m2Quantity
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        setProcessingData((p) => {
                          if (v === "") return { ...p, m2Quantity: undefined };
                          const n = Number(v);
                          if (!Number.isFinite(n)) return p;
                          return { ...p, m2Quantity: Math.round(n) };
                        });
                      }}
                    />
                  </div>
                  <div>
                    <label className={CRM.label}>M3 total</label>
                    <input
                      type="number"
                      min={0}
                      aria-label="M3 total"
                      className={`${CRM.input} border-violet-200 focus:border-violet-500`}
                      placeholder="Total M3 for batch"
                      value={
                        processingData.m3Quantity === undefined ||
                        processingData.m3Quantity === null
                          ? ""
                          : processingData.m3Quantity
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        setProcessingData((p) => {
                          if (v === "") return { ...p, m3Quantity: undefined };
                          const n = Number(v);
                          if (!Number.isFinite(n)) return p;
                          return { ...p, m3Quantity: Math.round(n) };
                        });
                      }}
                    />
                  </div>
                  <div>
                    <label className={CRM.label}>M4 total (reject)</label>
                    <input
                      type="number"
                      min={0}
                      aria-label="M4 total reject"
                      className={`${CRM.input} border-red-200 focus:border-red-500`}
                      placeholder="Total M4 for batch"
                      value={
                        processingData.m4Quantity === undefined ||
                        processingData.m4Quantity === null
                          ? ""
                          : processingData.m4Quantity
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        setProcessingData((p) => {
                          if (v === "") return { ...p, m4Quantity: undefined };
                          const n = Number(v);
                          if (!Number.isFinite(n)) return p;
                          return { ...p, m4Quantity: Math.round(n) };
                        });
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className={CRM.drawerSection}>
                <div className={CRM.drawerSectionHead}>4. Repair remarks</div>
                <div className="p-3">
                  <label className={CRM.label}>Remarks</label>
                  <textarea
                    className={`${CRM.input} h-24 resize-none`}
                    placeholder="Notes about M2 / repair items..."
                    value={processingData.repairRemarks ?? ""}
                    onChange={(e) =>
                      setProcessingData((p) => ({
                        ...p,
                        repairRemarks: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className={CRM.drawerFooterBar}>
              <button
                type="button"
                onClick={onClose}
                className={CRM.btnDrawerCancel}
                disabled={!!saving || issuingGrn}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleIssueGrn}
                className="inline-flex items-center gap-1 px-3 py-2 text-[11px] font-bold rounded border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                disabled={!!saving || issuingGrn || verifiedSaved <= 0}
                aria-label="Issue goods received note"
              >
                <i className="ri-file-list-3-line text-xs" />
                {issuingGrn ? "Issuing…" : "Issue GRN"}
              </button>
              <button
                type="button"
                onClick={onSave}
                className={CRM.btnPrimary}
                disabled={!!saving || !!saveDisabled || issuingGrn}
              >
                <i className="ri-save-line text-xs" />
                {saving ? "Saving…" : "Save & update"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
