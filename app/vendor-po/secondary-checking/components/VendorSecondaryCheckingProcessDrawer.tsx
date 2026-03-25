"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { CRM } from "../../vendor-list/crmUiClasses";
import type {
  VendorProductionFlow,
  QualityFloorQuantity,
  RepairStatus,
  VendorTransferToFloorKey,
} from "@/shared/services/vendorProductionFlowService";

const TRANSFER_DEST_OPTIONS: { value: VendorTransferToFloorKey; label: string }[] = [
  { value: "washing", label: "Washing" },
  { value: "boarding", label: "Boarding" },
  { value: "branding", label: "Branding" },
  { value: "finalChecking", label: "Final checking" },
];

function m1AvailableToTransfer(sc: QualityFloorQuantity): number {
  return Math.max(0, (sc.m1Quantity ?? 0) - (sc.m1Transferred ?? 0));
}

type Props = {
  open: boolean;
  flow: VendorProductionFlow | null;
  onClose: () => void;
  processingData: Partial<QualityFloorQuantity>;
  setProcessingData: React.Dispatch<React.SetStateAction<Partial<QualityFloorQuantity>>>;
  onSave: () => void;
  /** PATCH /production-flow/:id/transfer — from secondaryChecking */
  onTransferM1: (toFloorKey: VendorTransferToFloorKey, quantity: number) => void | Promise<void>;
  transferLoading: boolean;
};

/**
 * Wide right drawer for editing secondary-checking floor quantities (matches production “Update order” drawer).
 */
export function VendorSecondaryCheckingProcessDrawer({
  open,
  flow,
  onClose,
  processingData,
  setProcessingData,
  onSave,
  onTransferM1,
  transferLoading,
}: Props) {
  const [transferTo, setTransferTo] = useState<VendorTransferToFloorKey>("washing");
  const [transferQty, setTransferQty] = useState("");

  useEffect(() => {
    if (open && flow) {
      setTransferTo("washing");
      setTransferQty("");
    }
  }, [open, flow?.id]);

  const scLive = flow?.floorQuantities.secondaryChecking;
  const m1Avail = useMemo(() => (scLive ? m1AvailableToTransfer(scLive) : 0), [scLive]);

  const handleTransferSubmit = async () => {
    if (!flow) return;
    const n = Number(String(transferQty).trim());
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Enter a quantity greater than 0");
      return;
    }
    if (n > m1Avail) {
      toast.error(`Cannot exceed M1 available (${m1Avail})`);
      return;
    }
    await onTransferM1(transferTo, n);
    setTransferQty("");
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
      <div className={CRM.drawerShellLg} role="dialog" aria-modal="true" aria-labelledby="vendor-sc-process-title">
        <div className={CRM.drawerHeaderBar}>
          <h2 id="vendor-sc-process-title" className={CRM.drawerTitle}>
            Process secondary checking — {flow.referenceCode || flow.id.slice(-6)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={CRM.drawerCloseBtn}
            aria-label="Close"
            disabled={transferLoading}
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>
        <div className={CRM.drawerBodyScroll}>
          <p className={CRM.drawerHint}>
            <strong>How to update:</strong> set received quantity if it differs from planned, then enter M2/M4 counts and
            repair status. M1 (good) is derived from received minus M2/M4. Click <strong>Save &amp; update</strong> when done.
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
            <div className={CRM.drawerSectionHead}>2. Receipt &amp; repair</div>
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={CRM.label}>Batch received qty</label>
                <input
                  type="number"
                  className={CRM.input}
                  value={processingData.received}
                  onChange={(e) => setProcessingData((p) => ({ ...p, received: Number(e.target.value) }))}
                />
                <p className="text-[10px] text-gray-500 mt-1">Update if physical receipt differs from planned.</p>
              </div>
              <div>
                <label className={CRM.label}>Repair status</label>
                <select
                  className={CRM.select}
                  value={processingData.repairStatus ?? "NOT_REQUIRED"}
                  onChange={(e) =>
                    setProcessingData((p) => ({ ...p, repairStatus: e.target.value as RepairStatus }))
                  }
                >
                  <option value="NOT_REQUIRED">Not required</option>
                  <option value="REQUIRED">Required</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="REPAIRED">Repaired</option>
                </select>
              </div>
            </div>
          </div>

          <div className={CRM.drawerSection}>
            <div className={CRM.drawerSectionHead}>3. Quality counts (M2 / M4)</div>
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={CRM.label}>M2 qty (repair)</label>
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
            <div className={CRM.drawerSectionHead}>4. Repair remarks</div>
            <div className="p-3">
              <label className={CRM.label}>Remarks</label>
              <textarea
                className={`${CRM.input} h-24 resize-none`}
                placeholder="Notes about M2 / repair items..."
                value={processingData.repairRemarks}
                onChange={(e) => setProcessingData((p) => ({ ...p, repairRemarks: e.target.value }))}
              />
            </div>
          </div>

          <div className={CRM.drawerSection}>
            <div className={CRM.drawerSectionHead}>5. Send M1 to next floor</div>
            <div className="p-3 space-y-3">
              <p className="text-[10px] text-gray-600 leading-relaxed">
                Transfers from <strong>M1 available</strong> (M1 good minus already transferred). Destination receives the
                quantity; batch <strong>current floor</strong> moves to that floor.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="sm:col-span-1">
                  <label className={CRM.label}>Destination</label>
                  <select
                    className={CRM.select}
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value as VendorTransferToFloorKey)}
                    disabled={transferLoading}
                  >
                    {TRANSFER_DEST_OPTIONS.map((o) => (
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
                    max={m1Avail || undefined}
                    className={CRM.input}
                    placeholder={m1Avail ? `Max ${m1Avail}` : "0"}
                    value={transferQty}
                    onChange={(e) => setTransferQty(e.target.value)}
                    disabled={transferLoading || m1Avail <= 0}
                  />
                </div>
                <div>
                  <button
                    type="button"
                    className={`${CRM.btnSuccess} w-full sm:w-auto`}
                    disabled={transferLoading || m1Avail <= 0}
                    onClick={() => void handleTransferSubmit()}
                  >
                    {transferLoading ? "…" : <><i className="ri-arrow-right-up-line" /> Transfer</>}
                  </button>
                </div>
              </div>
              {m1Avail <= 0 && (
                <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                  No M1 left to transfer — save counts first or all good pieces are already sent.
                </p>
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
            Save &amp; update
          </button>
        </div>
      </div>
    </>
  );
}
