"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { CRM } from "../../vendor-list/crmUiClasses";
import { VendorFloorBatchSummary } from "../../components/VendorFloorBatchSummary";
import vendorProductionFlowService, {
  type FinalCheckingM2TransferToFloorKey,
  type FinalCheckingFloorQuantity,
  type RepairStatus,
  type VendorProductionFlow,
} from "@/shared/services/vendorProductionFlowService";
import { getStyleCodesByVendorCode, type StyleCodeByVendorRow } from "@/shared/services/productService";
import { resolveVendorCodeForStyleLookup } from "../../branding/brandingFloorUtils";
import {
  rowsFromTransferredApi,
  styleOptionId,
  toTransferredPayloadRows,
  type TransferredStyleRowDraft,
} from "../../utils/transferredStyleRows";
import { FinalCheckingStyleTransferSection } from "./FinalCheckingStyleTransferSection";

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
  onSaved: (updated: VendorProductionFlow) => void;
  onTransferM2: (toFloorKey: FinalCheckingM2TransferToFloorKey, quantity: number) => void | Promise<void>;
  transferLoading: boolean;
};

/**
 * Final QC drawer: M1/M2/M4 + repair + editable `transferredData` (style + qty, same as branding).
 * PATCH uses `mode: "replace"` for `transferredData`; rebind from response via `onSaved`.
 */
export function VendorFinalCheckingProcessDrawer({
  open,
  flow,
  onClose,
  onSaved,
  onTransferM2,
  transferLoading,
}: Props) {
  const [m2Quantity, setM2Quantity] = useState(0);
  const [m4Quantity, setM4Quantity] = useState(0);
  const [repairStatus, setRepairStatus] = useState<RepairStatus>("NOT_REQUIRED");
  const [repairRemarks, setRepairRemarks] = useState("");
  const [rows, setRows] = useState<TransferredStyleRowDraft[]>([{ styleCodeId: "", brand: "", transferred: 0 }]);
  const [styleOptions, setStyleOptions] = useState<StyleCodeByVendorRow[]>([]);
  const [loadingStyles, setLoadingStyles] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vendorCodeResolved, setVendorCodeResolved] = useState<string | null>(null);
  const [m2TransferTo, setM2TransferTo] = useState<FinalCheckingM2TransferToFloorKey>("washing");
  const [m2TransferQty, setM2TransferQty] = useState("");

  const finalLive = flow?.floorQuantities.finalChecking;
  const receivedQty = finalLive?.received ?? 0;
  const remainingQty = finalLive?.remaining ?? 0;
  const transferCap = Math.max(0, Number(m1Quantity) || 0);
  const totalTransferred = useMemo(
    () => rows.reduce((sum, r) => sum + Math.max(0, Number(r.transferred) || 0), 0),
    [rows]
  );
  const m1Quantity = totalTransferred;

  const m1Avail = useMemo(() => (finalLive ? m1AvailableToTransfer(finalLive) : 0), [finalLive]);
  const m2Avail = useMemo(() => (finalLive ? m2AvailableToTransfer(finalLive) : 0), [finalLive]);

  useEffect(() => {
    if (!open || !flow) return;
    const fc = flow.floorQuantities.finalChecking;
    setM2Quantity(fc.m2Quantity ?? 0);
    setM4Quantity(fc.m4Quantity ?? 0);
    setRepairStatus(fc.repairStatus ?? "NOT_REQUIRED");
    setRepairRemarks(fc.repairRemarks ?? "");
    setRows(rowsFromTransferredApi(fc.transferredData));
  }, [open, flow?.id]);

  const loadStyles = useCallback(async () => {
    if (!flow) return;
    setLoadingStyles(true);
    try {
      const vc = await resolveVendorCodeForStyleLookup(flow);
      setVendorCodeResolved(vc);
      if (!vc) {
        toast.error("Could not resolve vendor code for style lookup.");
        setStyleOptions([]);
        return;
      }
      const res = await getStyleCodesByVendorCode(vc);
      setStyleOptions(res.styleCodes ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load style codes";
      toast.error(msg);
      setStyleOptions([]);
    } finally {
      setLoadingStyles(false);
    }
  }, [flow]);

  useEffect(() => {
    if (open && flow) void loadStyles();
  }, [open, flow?.id, loadStyles]);

  useEffect(() => {
    if (!open || !styleOptions.length) return;
    setRows((prev) => {
      let changed = false;
      const next = prev.map((r) => {
        const sid = r.styleCodeId.trim();
        if (!sid || r.brand.trim()) return r;
        const opt = styleOptions.find((o) => styleOptionId(o) === sid);
        if (!opt) return r;
        const b = (opt.brand ?? "").trim();
        if (b === r.brand) return r;
        changed = true;
        return { ...r, brand: b };
      });
      return changed ? next : prev;
    });
  }, [open, styleOptions]);

  useEffect(() => {
    if (open && flow) {
      setM2TransferTo("washing");
      setM2TransferQty("");
    }
  }, [open, flow?.id]);

  const updateRow = (index: number, patch: Partial<TransferredStyleRowDraft>) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        ...patch,
        transferred: Math.max(0, Number((patch.transferred ?? next[index].transferred) || 0)),
      };
      return next;
    });
  };

  const onStyleSelect = (index: number, styleId: string) => {
    if (!styleId) {
      updateRow(index, { styleCodeId: "", brand: "" });
      return;
    }
    const opt = styleOptions.find((o) => styleOptionId(o) === styleId);
    updateRow(index, {
      styleCodeId: styleId,
      brand: (opt?.brand ?? "").trim(),
    });
  };

  const addRow = () => {
    setRows((prev) => [...prev, { styleCodeId: "", brand: "", transferred: 0 }]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const handleSave = async () => {
    if (!flow) return;
    if (totalTransferred > transferCap) {
      toast.error(`M1 style total cannot exceed M1 qty (${transferCap.toLocaleString()}). Reduce line quantities.`);
      return;
    }
    setSaving(true);
    try {
      const updated = await vendorProductionFlowService.updateFloor(flow.id, "finalChecking", {
        mode: "replace",
        transferredData: toTransferredPayloadRows(rows, styleOptions),
        m1Quantity: Math.max(0, Number(m1Quantity) || 0),
        m2Quantity: Math.max(0, Number(m2Quantity) || 0),
        m4Quantity: Math.max(0, Number(m4Quantity) || 0),
        repairStatus,
        repairRemarks: repairRemarks.trim(),
      });
      toast.success("Final quality details saved");
      onSaved(updated);
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Update failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

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

  if (!open || !flow || !finalLive) return null;

  const sec = {
    qc: "2",
    transfer: "3",
    m2: "4",
    repair: "5",
  };

  return (
    <>
      <div
        className={CRM.drawerBackdrop}
        onClick={() => {
          if (!transferLoading && !saving) onClose();
        }}
        aria-hidden
      />
      <div className={CRM.drawerShellLg} role="dialog" aria-modal="true" aria-labelledby="vendor-final-process-title">
        <div className={CRM.drawerHeaderBar}>
          <h2 id="vendor-final-process-title" className={CRM.drawerTitle}>
            Final QC — {flow.referenceCode || flow.id.slice(-6)}
          </h2>
          <button type="button" onClick={onClose} className={CRM.drawerCloseBtn} aria-label="Close" disabled={transferLoading || saving}>
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <div className={CRM.drawerBodyScroll}>
          <p className={CRM.drawerHint}>
            <strong>Final checking:</strong> M1–M4 + repair. Use style rows as <strong>M1 completed breakdown</strong> (same
            payload shape as branding). PATCH uses <code className="text-[10px]">mode: replace</code> for{" "}
            <code className="text-[10px]">transferredData</code>; backend derives <code className="text-[10px]">completed</code>{" "}
            from row sums when omitted.
          </p>

          <VendorFloorBatchSummary
            flow={flow}
            footerInfo={
              <>
                Received: <strong>{receivedQty.toLocaleString()}</strong> · Remaining:{" "}
                <strong>{remainingQty.toLocaleString()}</strong> · M1 cap:{" "}
                <strong className="text-purple-700">{transferCap.toLocaleString()}</strong> · Selected:{" "}
                <strong className={totalTransferred > transferCap ? "text-red-600" : "text-emerald-700"}>
                  {totalTransferred.toLocaleString()}
                </strong>
              </>
            }
          />

          {vendorCodeResolved && (
            <p className="px-3 text-[10px] text-gray-500">
              Style list for vendor code <span className="font-mono font-semibold">{vendorCodeResolved}</span>
              {loadingStyles ? " — loading…" : ` — ${styleOptions.length} style(s)`}
            </p>
          )}

          <div className={CRM.drawerSection}>
            <div className={CRM.drawerSectionHead}>
              {sec.qc}. Quality counts (M1 / M2 / M4)
            </div>
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={CRM.label}>M2 qty (fix)</label>
                <input
                  type="number"
                  className={`${CRM.input} border-amber-200 focus:border-amber-500`}
                  value={m2Quantity}
                  onChange={(e) => setM2Quantity(Number(e.target.value))}
                  disabled={saving || transferLoading}
                />
              </div>
              <div>
                <label className={CRM.label}>M4 qty (reject)</label>
                <input
                  type="number"
                  className={`${CRM.input} border-red-200 focus:border-red-500`}
                  value={m4Quantity}
                  onChange={(e) => setM4Quantity(Number(e.target.value))}
                  disabled={saving || transferLoading}
                />
              </div>
            </div>
            <div className="px-3 pb-3">
              <p className="text-[10px] text-gray-500">
                M1 qty auto-derived from style rows: <strong>{m1Quantity.toLocaleString()}</strong> · M1 transferred:{" "}
                {(finalLive.m1Transferred ?? 0).toLocaleString()} · Available for dispatch:{" "}
                <strong className="text-emerald-700">{m1Avail.toLocaleString()}</strong>
              </p>
            </div>
          </div>

          <FinalCheckingStyleTransferSection
            sectionIndex={sec.transfer}
            rows={rows}
            styleOptions={styleOptions}
            transferCap={transferCap}
            loadingStyles={loadingStyles}
            saving={saving}
            transferLoading={transferLoading}
            onAddRow={addRow}
            onRemoveRow={removeRow}
            onStyleSelect={onStyleSelect}
            onQtyChange={(index, value) => updateRow(index, { transferred: value })}
          />

          <div className={CRM.drawerSection}>
            <div className={CRM.drawerSectionHead}>{sec.m2}. M2 reroute (rework floor)</div>
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
                  {transferLoading ? "…" : (
                    <>
                      <i className="ri-arrow-right-up-line" /> Transfer M2
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className={CRM.drawerSection}>
            <div className={CRM.drawerSectionHead}>{sec.repair}. Repair details</div>
            <div className="p-3 space-y-3">
              <div>
                <label className={CRM.label}>Repair status</label>
                <select
                  className={CRM.select}
                  value={repairStatus}
                  onChange={(e) => setRepairStatus(e.target.value as RepairStatus)}
                  disabled={saving || transferLoading}
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
                value={repairRemarks}
                onChange={(e) => setRepairRemarks(e.target.value)}
                disabled={saving || transferLoading}
              />
            </div>
          </div>
        </div>

        <div className={CRM.drawerFooterBar}>
          <button type="button" onClick={onClose} className={CRM.btnDrawerCancel} disabled={transferLoading || saving}>
            Cancel
          </button>
          <button type="button" onClick={() => void handleSave()} className={CRM.btnPrimary} disabled={transferLoading || saving}>
            {saving ? "…" : (
              <>
                <i className="ri-save-line text-xs" /> Save only
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
