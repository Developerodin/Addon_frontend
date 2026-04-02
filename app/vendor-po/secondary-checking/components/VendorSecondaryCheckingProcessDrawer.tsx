"use client";

import React from "react";
import { CRM } from "../../vendor-list/crmUiClasses";
import type {
  VendorProductionFlow,
  QualityFloorQuantity,
} from "@/shared/services/vendorProductionFlowService";

type Props = {
  open: boolean;
  flow: VendorProductionFlow | null;
  /** True while GET-by-id is in flight — drawer shell shows until fresh flow is loaded. */
  loading?: boolean;
  onClose: () => void;
  processingData: Partial<QualityFloorQuantity>;
  setProcessingData: React.Dispatch<React.SetStateAction<Partial<QualityFloorQuantity>>>;
  onSave: () => void;
  saving?: boolean;
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
}: Props) {
  if (!open) return null;

  const scSaved = flow?.floorQuantities.secondaryChecking;

  return (
    <>
      <div
        className={CRM.drawerBackdrop}
        onClick={() => {
          if (!saving && !loading) onClose();
        }}
        aria-hidden
      />
      <div className={CRM.drawerShellLg} role="dialog" aria-modal="true" aria-labelledby="vendor-sc-process-title">
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
            disabled={!!saving}
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
            <strong>Saved counts</strong> are shown above the inputs. Enter <strong>only what you want to change</strong> below — leave a field blank to keep the saved value, then{" "}
            <strong>Save &amp; update</strong>.
          </p>

          <div className={CRM.drawerSection}>
            <div className={CRM.drawerSectionHead}>1. Batch summary</div>
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">Vendor</span>
                <span className="font-semibold text-gray-900">
                  {typeof flow.vendor === "object" ? flow.vendor?.header?.vendorName ?? "—" : "—"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">VPO</span>
                <span className="font-semibold text-purple-700">
                  {typeof flow.vendorPurchaseOrder === "object" ? flow.vendorPurchaseOrder?.vpoNumber ?? "—" : "—"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">Planned</span>
                <span className="font-semibold text-gray-900">{flow.plannedQuantity.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">Received</span>
                <span className="font-semibold text-gray-900">
                  {(flow.floorQuantities.secondaryChecking?.received ?? 0).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">Batch id</span>
                <span className="font-mono text-[10px] text-gray-600">{flow.id}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">Current floor</span>
                <span className="font-semibold text-purple-800">{flow.currentFloorKey}</span>
              </div>
            </div>
          </div>

          <div className={CRM.drawerSection}>
            <div className={CRM.drawerSectionHead}>2. Quality counts (M1 / M2 / M4)</div>
            {scSaved && (
              <div className="px-3 pt-2 pb-1">
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1.5">Saved on server (current)</p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    M1: {(scSaved.m1Quantity ?? 0).toLocaleString()}
                  </span>
                  <span className="inline-flex items-center rounded border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    M2: {(scSaved.m2Quantity ?? 0).toLocaleString()}
                  </span>
                  <span className="inline-flex items-center rounded border border-red-100 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-800">
                    M4: {(scSaved.m4Quantity ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
            <div className="p-3 pt-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={CRM.label}>M1 qty (good)</label>
                <input
                  type="number"
                  min={0}
                  className={`${CRM.input} border-emerald-200 focus:border-emerald-500`}
                  placeholder="Leave blank to keep saved"
                  value={processingData.m1Quantity === undefined || processingData.m1Quantity === null ? "" : processingData.m1Quantity}
                  onChange={(e) => {
                    const v = e.target.value;
                    setProcessingData((p) => ({
                      ...p,
                      m1Quantity: v === "" ? undefined : Number(v),
                    }));
                  }}
                />
              </div>
              <div>
                <label className={CRM.label}>M2 qty (repair)</label>
                <input
                  type="number"
                  min={0}
                  className={`${CRM.input} border-amber-200 focus:border-amber-500`}
                  placeholder="Leave blank to keep saved"
                  value={processingData.m2Quantity === undefined || processingData.m2Quantity === null ? "" : processingData.m2Quantity}
                  onChange={(e) => {
                    const v = e.target.value;
                    setProcessingData((p) => ({
                      ...p,
                      m2Quantity: v === "" ? undefined : Number(v),
                    }));
                  }}
                />
              </div>
              <div>
                <label className={CRM.label}>M4 qty (reject)</label>
                <input
                  type="number"
                  min={0}
                  className={`${CRM.input} border-red-200 focus:border-red-500`}
                  placeholder="Leave blank to keep saved"
                  value={processingData.m4Quantity === undefined || processingData.m4Quantity === null ? "" : processingData.m4Quantity}
                  onChange={(e) => {
                    const v = e.target.value;
                    setProcessingData((p) => ({
                      ...p,
                      m4Quantity: v === "" ? undefined : Number(v),
                    }));
                  }}
                />
              </div>
            </div>
          </div>

          <div className={CRM.drawerSection}>
            <div className={CRM.drawerSectionHead}>3. Repair remarks</div>
            <div className="p-3">
              <label className={CRM.label}>Remarks</label>
              <textarea
                className={`${CRM.input} h-24 resize-none`}
                placeholder="Notes about M2 / repair items..."
                value={processingData.repairRemarks ?? ""}
                onChange={(e) => setProcessingData((p) => ({ ...p, repairRemarks: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className={CRM.drawerFooterBar}>
          <button type="button" onClick={onClose} className={CRM.btnDrawerCancel} disabled={!!saving}>
            Cancel
          </button>
          <button type="button" onClick={onSave} className={CRM.btnPrimary} disabled={!!saving}>
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
