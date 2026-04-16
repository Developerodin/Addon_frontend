"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-hot-toast";
import { CRM } from "../../vendor-list/crmUiClasses";
import { VendorFloorBatchSummary } from "../../components/VendorFloorBatchSummary";
import vendorProductionFlowService, {
  type FinalCheckingFloorQuantity,
  type VendorProductionFlow,
  type VendorTransferItem,
} from "@/shared/services/vendorProductionFlowService";
import { getStyleCodesByVendorCode, type StyleCodeByVendorRow } from "@/shared/services/productService";
import { resolveVendorCodeForStyleLookup } from "../../branding/brandingFloorUtils";
import {
  styleOptionId,
  toVendorTransferItems,
  type TransferredStyleRowDraft,
} from "../../utils/transferredStyleRows";
import { FinalCheckingInboundReceived } from "./FinalCheckingInboundReceived";
import { FinalCheckingStyleTransferSection } from "./FinalCheckingStyleTransferSection";
import {
  allowedStyleCodeIdsFromInbound,
  initialFinalCheckingStyleRows,
} from "../finalCheckingInboundAggregates";
import {
  buildFinalCheckingTransferredDeltaDraft,
  finalCheckingTransferredBaselineDraft,
} from "../finalCheckingTransferredDelta";
import type { PendingFinalCheckingStagingPatch } from "./VendorFinalCheckingDispatchStagingModal";

function m1AvailableToTransfer(fc: FinalCheckingFloorQuantity): number {
  return Math.max(0, (fc.m1Quantity ?? 0) - (fc.m1Transferred ?? 0));
}

type Props = {
  open: boolean;
  flow: VendorProductionFlow | null;
  onClose: () => void;
  onSaved: (updated: VendorProductionFlow) => void;
  /** Close drawer and open dispatch staging modal (container scan), like branding / secondary M1. */
  onStagingRequested: (ctx: {
    flow: VendorProductionFlow;
    patch: PendingFinalCheckingStagingPatch;
    /** Resolved style codes + brands for `PATCH …/floors/finalChecking` `transferredData`. */
    transferItems: VendorTransferItem[];
  }) => void;
};

/** Final QC drawer: M1/M2/M4 counts, style `transferredData`; dispatch staging opens a container-scan modal (parent). */
export function VendorFinalCheckingProcessDrawer({
  open,
  flow,
  onClose,
  onSaved,
  onStagingRequested,
}: Props) {
  const [m2Quantity, setM2Quantity] = useState(0);
  const [m4Quantity, setM4Quantity] = useState(0);
  const [rows, setRows] = useState<TransferredStyleRowDraft[]>([{ styleCodeId: "", brand: "", transferred: 0 }]);
  const [styleOptions, setStyleOptions] = useState<StyleCodeByVendorRow[]>([]);
  const [loadingStyles, setLoadingStyles] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vendorCodeResolved, setVendorCodeResolved] = useState<string | null>(null);
  /** Render in `document.body` so parent layout/stacking cannot block footer clicks (same as branding drawer). */
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  /** Drawer-open snapshot of style/qty — PATCH must send only deltas vs this (server merges adds). */
  const transferredBaselineRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    setPortalEl(document.body);
  }, []);

  const finalLive = flow?.floorQuantities.finalChecking;
  const receivedQty = finalLive?.received ?? 0;
  const remainingQty = finalLive?.remaining ?? 0;
  const receivedData = finalLive?.receivedData ?? [];
  const allowedStyleCodeIds = useMemo(
    () => allowedStyleCodeIdsFromInbound(receivedData),
    [receivedData],
  );
  /** Pool for M1 style rows: cannot exceed QC received from containers. */
  const transferCap = Math.max(0, receivedQty);
  const totalTransferred = useMemo(
    () => rows.reduce((sum, r) => sum + Math.max(0, Number(r.transferred) || 0), 0),
    [rows],
  );
  const m1Quantity = totalTransferred;

  const m1Avail = useMemo(() => (finalLive ? m1AvailableToTransfer(finalLive) : 0), [finalLive]);

  useEffect(() => {
    if (!open || !flow) return;
    const fc = flow.floorQuantities.finalChecking;
    setM2Quantity(fc.m2Quantity ?? 0);
    setM4Quantity(fc.m4Quantity ?? 0);
    setRows(initialFinalCheckingStyleRows(fc));
    transferredBaselineRef.current = finalCheckingTransferredBaselineDraft(fc);
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

  const buildFloorPatchBody = (f: VendorProductionFlow): PendingFinalCheckingStagingPatch => {
    const fcPersist = f.floorQuantities.finalChecking;
    const delta = buildFinalCheckingTransferredDeltaDraft(rows, transferredBaselineRef.current);
    const base: PendingFinalCheckingStagingPatch = {
      m1Quantity: Math.max(0, Number(m1Quantity) || 0),
      m2Quantity: Math.max(0, Number(m2Quantity) || 0),
      m4Quantity: Math.max(0, Number(m4Quantity) || 0),
      repairStatus: fcPersist.repairStatus ?? "NOT_REQUIRED",
      repairRemarks: (fcPersist.repairRemarks ?? "").trim(),
    };
    if (delta.length) base.transferredData = delta;
    return base;
  };

  const assertNoNegativeStyleDelta = (): boolean => {
    const delta = buildFinalCheckingTransferredDeltaDraft(rows, transferredBaselineRef.current);
    if (delta.some((r) => (Number(r.transferred) || 0) < 0)) {
      toast.error(
        "Reducing a style line below the saved amount is not supported via merge-PATCH. Refresh the batch or ask ops for a data fix.",
      );
      return false;
    }
    return true;
  };

  /**
   * QC-only save: M1/M2/M4 + repair — **no** `transferredData` (sending it on the same floor PATCH can
   * auto-forward to dispatch with the new API). Style lines apply when you use **Save & stage**.
   */
  const handleSaveOnly = async () => {
    if (!flow) return;
    if (totalTransferred > transferCap) {
      toast.error(
        `M1 row total cannot exceed inbound received (${transferCap.toLocaleString()}).`,
      );
      return;
    }
    setSaving(true);
    try {
      const fcPersist = flow.floorQuantities.finalChecking;
      const updated = await vendorProductionFlowService.updateFloor(flow.id, "finalChecking", {
        m1Quantity: Math.max(0, Number(m1Quantity) || 0),
        m2Quantity: Math.max(0, Number(m2Quantity) || 0),
        m4Quantity: Math.max(0, Number(m4Quantity) || 0),
        repairStatus: fcPersist.repairStatus ?? "NOT_REQUIRED",
        repairRemarks: (fcPersist.repairRemarks ?? "").trim(),
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

  /** Validates M1 lines, then parent closes drawer and opens container scan modal. */
  const handleSaveAndStage = () => {
    if (!flow) return;
    if (!assertNoNegativeStyleDelta()) return;
    if (totalTransferred > transferCap) {
      toast.error(
        `M1 row total cannot exceed inbound received (${transferCap.toLocaleString()}).`,
      );
      return;
    }
    const items = toVendorTransferItems(rows, styleOptions);
    const sum = items.reduce((s, i) => s + i.transferred, 0);
    if (sum <= 0) {
      toast.error("Enter M1 style line quantities > 0 before staging on a container.");
      return;
    }
    onStagingRequested({
      flow,
      patch: buildFloorPatchBody(flow),
      transferItems: items,
    });
  };

  if (!open || !flow || !finalLive) return null;
  if (!portalEl) return null;

  const sec = {
    inbound: "1",
    qc: "2",
    transfer: "3",
  };

  const drawer = (
    <>
      <div
        className="fixed inset-0 bg-black/50"
        style={{ zIndex: 1400 }}
        onClick={() => {
          if (!saving) onClose();
        }}
        aria-hidden
      />
      <div
        className="fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-xl flex flex-col min-h-0 overflow-hidden animate-slide-in-right border-l-2 border-gray-300"
        style={{ zIndex: 1401 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vendor-final-process-title"
      >
        <div className={CRM.drawerHeaderBar}>
          <h2 id="vendor-final-process-title" className={CRM.drawerTitle}>
            Final QC — {flow.referenceCode || flow.id.slice(-6)}
          </h2>
          <button type="button" onClick={onClose} className={CRM.drawerCloseBtn} aria-label="Close" disabled={saving}>
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <div className={`${CRM.drawerBodyScroll} min-h-0`}>
          <p className={CRM.drawerHint}>
            <strong>Final QC:</strong> M1 rows ≤ inbound <code className="text-[10px]">receivedData</code>.{" "}
            <strong>Save</strong> updates M1/M2/M4 and repair fields only — it does <strong>not</strong> send{" "}
            <code className="text-[10px]">transferredData</code> (that path can auto-move to dispatch).{" "}
            <strong>Save &amp; stage</strong> opens the container modal: <code className="text-[10px]">PATCH …/floors/finalChecking</code> with{" "}
            <code className="text-[10px]">transferredData</code> + <code className="text-[10px]">existingContainerBarcode</code> only. Then go to{" "}
            <strong>Dispatch</strong> and run <code className="text-[10px]">POST …/containers-masters/barcode/…/accept</code> on the same barcode (dispatch data only). WHMS{" "}
            <code className="text-[10px]">promote-vendor-dispatch</code> creates inward rows. No{" "}
            <code className="text-[10px]">PATCH …/transfer</code>.
          </p>

          <VendorFloorBatchSummary
            flow={flow}
            footerInfo={
              <>
                Received: <strong>{receivedQty.toLocaleString()}</strong> · Remaining:{" "}
                <strong>{remainingQty.toLocaleString()}</strong> · M1 cap:{" "}
                <strong className="text-purple-700">{transferCap.toLocaleString()}</strong> (received) · M1 row sum:{" "}
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

          <FinalCheckingInboundReceived
            sectionIndex={sec.inbound}
            receivedData={receivedData}
            styleOptions={styleOptions}
          />

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
                  disabled={saving}
                />
              </div>
              <div>
                <label className={CRM.label}>M4 qty (reject)</label>
                <input
                  type="number"
                  className={`${CRM.input} border-red-200 focus:border-red-500`}
                  value={m4Quantity}
                  onChange={(e) => setM4Quantity(Number(e.target.value))}
                  disabled={saving}
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
            allowedStyleCodeIds={
              allowedStyleCodeIds.size > 0 ? allowedStyleCodeIds : undefined
            }
            loadingStyles={loadingStyles}
            saving={saving}
            transferLoading={false}
            onAddRow={addRow}
            onRemoveRow={removeRow}
            onStyleSelect={onStyleSelect}
            onQtyChange={(index, value) => updateRow(index, { transferred: value })}
          />
        </div>

        <div
          className={`${CRM.drawerFooterBar} flex-wrap relative z-10 shrink-0 pointer-events-auto`}
        >
          <button type="button" onClick={onClose} className={CRM.btnDrawerCancel} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void handleSaveOnly();
            }}
            className={CRM.btnSecondary}
            disabled={saving || totalTransferred > transferCap}
            title={
              totalTransferred > transferCap
                ? "M1 row total cannot exceed inbound received"
                : undefined
            }
          >
            {saving ? "…" : (
              <>
                <i className="ri-save-line text-xs" /> Save
              </>
            )}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSaveAndStage();
            }}
            className={CRM.btnPrimary}
            disabled={
              saving ||
              totalTransferred > transferCap ||
              totalTransferred <= 0
            }
            title={
              totalTransferred > transferCap
                ? "M1 row total cannot exceed inbound received"
                : totalTransferred <= 0
                  ? "Enter M1 quantities on style rows to stage"
                  : undefined
            }
          >
            <i className="ri-inbox-archive-line text-xs" /> Save &amp; stage to Dispatch
          </button>
        </div>
      </div>
    </>
  );

  return createPortal(drawer, portalEl);
}
