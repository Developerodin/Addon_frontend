"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { CRM } from "../../vendor-list/crmUiClasses";
import { VendorFloorBatchSummary } from "../../components/VendorFloorBatchSummary";
import type {
  FinalCheckingM2TransferToFloorKey,
  FinalCheckingFloorQuantity,
  RepairStatus,
  VendorProductionFlow,
} from "@/shared/services/vendorProductionFlowService";

const M2_TRANSFER_DEST_OPTIONS: { value: FinalCheckingM2TransferToFloorKey; label: string }[] = [
  { value: "washing", label: "Washing" },
  { value: "boarding", label: "Boarding" },
  { value: "branding", label: "Branding" },
];

function m1AvailableToTransfer(fc: FinalCheckingFloorQuantity): number {
  return Math.max(0, (fc.m1Quantity ?? 0) - (fc.m1Transferred ?? 0));
}
function m2AvailableToTransfer(fc: FinalCheckingFloorQuantity): number {
  return Math.max(0, (fc.m2Quantity ?? 0) - (fc.m2Transferred ?? 0));
}

type Props = {
  open: boolean;
  flow: VendorProductionFlow | null;
  onClose: () => void;
  processingData: Partial<FinalCheckingFloorQuantity>;
  setProcessingData: React.Dispatch<React.SetStateAction<Partial<FinalCheckingFloorQuantity>>>;
  onSave: () => void;
  onTransferM2: (toFloorKey: FinalCheckingM2TransferToFloorKey, quantity: number) => void | Promise<void>;
  transferLoading: boolean;
};

export function VendorFinalCheckingProcessDrawer({
  open,
  flow,
  onClose,
  processingData,
  setProcessingData,
  onSave,
  onTransferM2,
  transferLoading,
}: Props) {
  const [m2TransferTo, setM2TransferTo] = useState<FinalCheckingM2TransferToFloorKey>("washing");
  const [m2TransferQty, setM2TransferQty] = useState("");
  const finalLive = flow?.floorQuantities.finalChecking;
  const m1Avail = useMemo(() => (finalLive ? m1AvailableToTransfer(finalLive) : 0), [finalLive]);
  const m2Avail = useMemo(() => (finalLive ? m2AvailableToTransfer(finalLive) : 0), [finalLive]);

  useEffect(() => {
    if (open && flow) {
      setM2TransferTo("washing");
      setM2TransferQty("");
    }
  }, [open, flow?.id]);

  const submitM2Transfer = async () => {
    const n = Number(String(m2TransferQty).trim());
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Enter a quantity greater than 0");
      return;
    }
    if (n > m2Avail) {
      toast.error(`Cannot exceed M2 available (${m2Avail})`);
      return;
    }
    await onTransferM2(m2TransferTo, n);
    setM2TransferQty("");
  };

  if (!open || !flow) return null;

  return (
    <>
      <div
        className={CRM.drawerBackdrop}
        onClick={() => {
          if (!transferLoading) onClose();
        }}
        aria-hidden
      />
      <div className={CRM.drawerShellLg} role="dialog" aria-modal="true" aria-labelledby="vendor-final-process-title">
        <div className={CRM.drawerHeaderBar}>
          <h2 id="vendor-final-process-title" className={CRM.drawerTitle}>
            Final QC — {flow.referenceCode || flow.id.slice(-6)}
          </h2>
          <button type="button" onClick={onClose} className={CRM.drawerCloseBtn} aria-label="Close" disabled={transferLoading}>
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <div className={CRM.drawerBodyScroll}>
          <p className={CRM.drawerHint}>
            <strong>How to update:</strong> review received quantity, set M1/M2/M4 counts, repair status and remarks, then
            save. M1 goes to dispatch on confirm; use M2 reroute to send repair qty to rework floor.
          </p>

          <VendorFloorBatchSummary flow={flow} />

          <div className={CRM.drawerSection}>
            <div className={CRM.drawerSectionHead}>2. Quality counts (M1 / M2 / M4)</div>
            <div className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={CRM.label}>M1 qty (pass)</label>
                <input
                  type="number"
                  className={`${CRM.input} border-emerald-200 focus:border-emerald-500`}
                  value={processingData.m1Quantity}
                  onChange={(e) => setProcessingData((p) => ({ ...p, m1Quantity: Number(e.target.value) }))}
                />
                {finalLive && (
                  <p className="text-[10px] text-gray-500 mt-1">
                    M1 transferred: {(finalLive.m1Transferred ?? 0).toLocaleString()} · Available for dispatch:{" "}
                    <strong className="text-emerald-700">{m1Avail.toLocaleString()}</strong>
                  </p>
                )}
              </div>
              <div>
                <label className={CRM.label}>M2 qty (fix)</label>
                <input
                  type="number"
                  className={`${CRM.input} border-amber-200 focus:border-amber-500`}
                  value={processingData.m2Quantity}
                  onChange={(e) => setProcessingData((p) => ({ ...p, m2Quantity: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className={CRM.label}>M4 qty (reject)</label>
                <input
                  type="number"
                  className={`${CRM.input} border-red-200 focus:border-red-500`}
                  value={processingData.m4Quantity}
                  onChange={(e) => setProcessingData((p) => ({ ...p, m4Quantity: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>

          <div className={CRM.drawerSection}>
            <div className={CRM.drawerSectionHead}>3. Repair details</div>
            <div className="p-3 space-y-3">
              <div>
                <label className={CRM.label}>Repair status</label>
                <select
                  className={CRM.select}
                  value={processingData.repairStatus ?? "NOT_REQUIRED"}
                  onChange={(e) => setProcessingData((p) => ({ ...p, repairStatus: e.target.value as RepairStatus }))}
                >
                  <option value="NOT_REQUIRED">Not required</option>
                  <option value="REQUIRED">Required</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="REPAIRED">Repaired</option>
                </select>
              </div>
              <textarea
                className={`${CRM.input} h-24 resize-none`}
                placeholder="Notes about repair items..."
                value={processingData.repairRemarks ?? ""}
                onChange={(e) => setProcessingData((p) => ({ ...p, repairRemarks: e.target.value }))}
              />
            </div>
          </div>

          <div className={CRM.drawerSection}>
            <div className={CRM.drawerSectionHead}>4. M1 to dispatch</div>
            <div className="p-3">
              <p className="text-[10px] text-gray-600 leading-relaxed">
                M1 is dispatched when you click <strong>Confirm Batch</strong> from the list. This will move pending final-checking
                qty to dispatch and mark the flow as dispatch-ready.
              </p>
            </div>
          </div>

          <div className={CRM.drawerSection}>
            <div className={CRM.drawerSectionHead}>5. M2 reroute (rework floor)</div>
            <div className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className={CRM.label}>Destination</label>
                <select
                  className={CRM.select}
                  value={m2TransferTo}
                  onChange={(e) => setM2TransferTo(e.target.value as FinalCheckingM2TransferToFloorKey)}
                  disabled={transferLoading}
                >
                  {M2_TRANSFER_DEST_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={CRM.label}>Quantity</label>
                <input
                  type="number"
                  min={1}
                  max={m2Avail || undefined}
                  className={CRM.input}
                  value={m2TransferQty}
                  placeholder={m2Avail ? `Max ${m2Avail}` : "0"}
                  onChange={(e) => setM2TransferQty(e.target.value)}
                  disabled={transferLoading || m2Avail <= 0}
                />
              </div>
              <div>
                <button
                  type="button"
                  className={`${CRM.btnSuccess} w-full sm:w-auto`}
                  disabled={transferLoading || m2Avail <= 0}
                  onClick={() => void submitM2Transfer()}
                >
                  {transferLoading ? "…" : <><i className="ri-arrow-right-up-line" /> Transfer M2</>}
                </button>
              </div>
            </div>
          </div>

          <div className={CRM.drawerSection}>
            <div className={CRM.drawerSectionHead}>6. Style breakdown (read-only)</div>
            <div className="p-3 space-y-1">
              {processingData.transferredData?.length ? (
                processingData.transferredData.map((t, i) => (
                  <div key={i} className="text-[10px] text-gray-600 bg-white p-2 border border-gray-100 rounded">
                    {t.brand} - {t.styleCode}: <span className="font-bold text-gray-800">{t.transferred} pcs</span>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-gray-500">No style entries.</p>
              )}
            </div>
          </div>
        </div>

        <div className={CRM.drawerFooterBar}>
          <button type="button" onClick={onClose} className={CRM.btnDrawerCancel} disabled={transferLoading}>
            Cancel
          </button>
          <button type="button" onClick={onSave} className={CRM.btnPrimary} disabled={transferLoading}>
            <i className="ri-save-line text-xs" />
            Save QC findings
          </button>
        </div>
      </div>
    </>
  );
}
