"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { CRM } from "../../vendor-list/crmUiClasses";
import type { QualityFloorQuantity, VendorProductionFlow, VendorTransferToFloorKey } from "@/shared/services/vendorProductionFlowService";

const TRANSFER_DEST_OPTIONS: { value: VendorTransferToFloorKey; label: string }[] = [
  { value: "washing", label: "Washing" },
  { value: "boarding", label: "Boarding" },
  { value: "branding", label: "Branding" },
  { value: "finalChecking", label: "Final checking" },
];

/**
 * M1 transfer pool comes from the checking-floor M1 bucket (`m1Quantity` / `m1Remaining`),
 * not from `received - m2 - m4` (that can disagree with persisted `m1Quantity`).
 */
function m1AvailableToTransfer(scLive: QualityFloorQuantity): number {
  const fromApi = scLive.m1Remaining;
  if (typeof fromApi === "number" && Number.isFinite(fromApi)) {
    return Math.max(0, fromApi);
  }
  return Math.max(0, (scLive.m1Quantity ?? 0) - (scLive.m1Transferred ?? 0));
}

type Props = {
  open: boolean;
  flow: VendorProductionFlow | null;
  onClose: () => void;
  onSubmit: (args: { toFloorKey: VendorTransferToFloorKey; quantity: number }) => void | Promise<void>;
  loading?: boolean;
};

export function VendorSecondaryCheckingTransferModal({ open, flow, onClose, onSubmit, loading }: Props) {
  const [toFloorKey, setToFloorKey] = useState<VendorTransferToFloorKey>("washing");
  const [qty, setQty] = useState("");

  const scLive = flow?.floorQuantities.secondaryChecking;
  const m1Avail = useMemo(() => (scLive ? m1AvailableToTransfer(scLive) : 0), [scLive]);
  const m1Qty = useMemo(() => (scLive ? Number(scLive.m1Quantity ?? 0) : 0), [scLive]);

  useEffect(() => {
    if (!open) return;
    setToFloorKey("washing");
    setQty("");
  }, [open, flow?.id]);

  const submit = async () => {
    if (!flow || !scLive) return;
    const n = Number(String(qty).trim());
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Enter a quantity greater than 0");
      return;
    }
    if (!Number.isInteger(n)) {
      toast.error("Quantity must be a whole number");
      return;
    }
    if (n > m1Avail) {
      toast.error(`Cannot exceed M1 available (${m1Avail})`);
      return;
    }
    await onSubmit({ toFloorKey, quantity: n });
  };

  if (!open) return null;

  return (
    <>
      <div
        className={CRM.drawerBackdrop}
        onClick={() => {
          if (!loading) onClose();
        }}
        aria-hidden
      />
      <div className={CRM.drawerShellLg} role="dialog" aria-modal="true" aria-labelledby="vendor-sc-transfer-title">
        <div className={CRM.drawerHeaderBar}>
          <h2 id="vendor-sc-transfer-title" className={CRM.drawerTitle}>
            {loading || !flow ? "Transfer M1 to next floor" : `Transfer M1 to next floor - ${flow.referenceCode || flow.id.slice(-6)}`}
          </h2>
          <button type="button" onClick={onClose} className={CRM.drawerCloseBtn} aria-label="Close" disabled={!!loading}>
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        {loading || !flow || !scLive ? (
          <div className="min-h-[320px] flex items-center justify-center">
            <div className={CRM.loadingWrap}>
              <div className={CRM.spinner} />
              <p className={CRM.loadingLabel}>Loading latest transfer data...</p>
            </div>
          </div>
        ) : (
          <div className={CRM.drawerBodyScroll}>
            <p className={CRM.drawerHint}>
              Pick destination and quantity to transfer from <strong>M1 available</strong>.
            </p>

            <div className={CRM.drawerSection}>
              <div className={CRM.drawerSectionHead}>1. M1 summary</div>
              <div className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">M1 qty (good)</span>
                  <span className="font-semibold text-gray-900">{m1Qty.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">Already transferred</span>
                  <span className="font-semibold text-gray-900">{(scLive.m1Transferred ?? 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">Available now</span>
                  <span className="font-semibold text-emerald-700">{m1Avail.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className={CRM.drawerSection}>
              <div className={CRM.drawerSectionHead}>2. Transfer</div>
              <div className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className={CRM.label}>Destination</label>
                  <select
                    className={CRM.select}
                    value={toFloorKey}
                    onChange={(e) => setToFloorKey(e.target.value as VendorTransferToFloorKey)}
                    disabled={!!loading}
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
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    disabled={!!loading || m1Avail <= 0}
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" className={`${CRM.btnDrawerCancel} w-full`} onClick={onClose} disabled={!!loading}>
                    Skip
                  </button>
                  <button
                    type="button"
                    className={`${CRM.btnSuccess} w-full`}
                    onClick={() => void submit()}
                    disabled={!!loading || m1Avail <= 0}
                  >
                    {loading ? "..." : "Transfer"}
                  </button>
                </div>
              </div>
              {m1Avail <= 0 && (
                <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mt-3">
                  No M1 available to transfer for this batch.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
