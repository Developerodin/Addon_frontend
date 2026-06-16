"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-hot-toast";
import { CRM } from "../../vendor-list/crmUiClasses";
import { VendorFloorBatchSummary } from "../../components/VendorFloorBatchSummary";
import vendorProductionFlowService, {
  type VendorProductionFlow,
  type VendorTransferItem,
  type TransferredDataRow,
} from "@/shared/services/vendorProductionFlowService";
import { getStyleCodesByVendorCode, type StyleCodeByVendorRow } from "@/shared/services/productService";
import { resolveVendorCodeForStyleLookup } from "../../branding/brandingFloorUtils";
import { allowedStyleCodeIdsFromInbound } from "../../final-checking/finalCheckingInboundAggregates";
import {
  brandLabelForStyleId,
  buildBrandSelectOptions,
  styleOptionId,
  toVendorTransferItems,
  type TransferredStyleRowDraft,
} from "../../utils/transferredStyleRows";
import {
  dispatchStyleInboundReceivedData,
  getDispatchTransferableRemaining,
} from "../dispatchTransferUtils";
import type { PendingDispatchStagingPatch } from "./VendorDispatchWarehouseStagingModal";

type Props = {
  open: boolean;
  flow: VendorProductionFlow | null;
  onClose: () => void;
  onSaved: (updated: VendorProductionFlow) => void;
  /** Close drawer and open warehouse container staging modal. */
  onStagingRequested: (ctx: {
    flow: VendorProductionFlow;
    patch: PendingDispatchStagingPatch;
    transferItems: VendorTransferItem[];
  }) => void;
};

/**
 * Dispatch process drawer: enter quantity per style code, then Save (counters only)
 * or Save & stage (opens container scan modal to stage for warehouse transfer).
 */
export function VendorDispatchProcessDrawer({
  open,
  flow,
  onClose,
  onSaved,
  onStagingRequested,
}: Props) {
  const [rows, setRows] = useState<TransferredStyleRowDraft[]>([{ styleCodeId: "", brand: "", transferred: 0 }]);
  const [styleOptions, setStyleOptions] = useState<StyleCodeByVendorRow[]>([]);
  const [loadingStyles, setLoadingStyles] = useState(false);
  const [saving, setSaving] = useState(false);
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  const [vendorCodeResolved, setVendorCodeResolved] = useState<string | null>(null);
  const transferredBaselineRef = useRef<Map<string, number>>(new Map());
  const [lockedCount, setLockedCount] = useState(0);
  const [flowLive, setFlowLive] = useState<VendorProductionFlow | null>(null);
  const [loadingFlow, setLoadingFlow] = useState(false);

  useEffect(() => {
    setPortalEl(document.body);
  }, []);

  const selectedId = flow?.id?.trim() ?? "";

  useEffect(() => {
    if (!open || !selectedId) {
      setFlowLive(null);
      return;
    }
    let cancelled = false;
    setLoadingFlow(true);
    void vendorProductionFlowService
      .getById(selectedId)
      .then((f) => { if (!cancelled) setFlowLive(f); })
      .catch(() => { if (!cancelled) setFlowLive(null); })
      .finally(() => { if (!cancelled) setLoadingFlow(false); });
    return () => { cancelled = true; };
  }, [open, selectedId]);

  const effectiveFlow = flowLive ?? flow;
  const dispFloor = effectiveFlow?.floorQuantities?.dispatch;
  const receivedQty = dispFloor?.received ?? 0;
  const remaining = useMemo(() => getDispatchTransferableRemaining(effectiveFlow), [effectiveFlow]);

  const inboundForStyles = useMemo(
    () => dispatchStyleInboundReceivedData(effectiveFlow),
    [effectiveFlow],
  );

  const allowedStyleCodeIds = useMemo(
    () => allowedStyleCodeIdsFromInbound(inboundForStyles),
    [inboundForStyles],
  );

  const lockedTotal = useMemo(
    () => rows.slice(0, lockedCount).reduce((sum, r) => sum + Math.max(0, Number(r.transferred) || 0), 0),
    [rows, lockedCount],
  );

  const newRowsTotal = useMemo(
    () => rows.slice(lockedCount).reduce((sum, r) => sum + Math.max(0, Number(r.transferred) || 0), 0),
    [rows, lockedCount],
  );

  const totalTransferred = lockedTotal + newRowsTotal;

  /**
   * Initializes rows from existing dispatch transferredData.
   * Existing rows are locked (read-only). A fresh empty row is appended for new entries.
   */
  const initializeRows = useCallback(() => {
    const existing = dispFloor?.transferredData;
    if (existing?.length) {
      const locked: TransferredStyleRowDraft[] = existing.map((r) => ({
        styleCodeId: r.styleCode ?? "",
        brand: r.brand ?? "",
        transferred: r.transferred ?? 0,
      }));
      setLockedCount(locked.length);
      setRows([...locked, { styleCodeId: "", brand: "", transferred: 0 }]);

      const baseline = new Map<string, number>();
      existing.forEach((r) => {
        const key = `${(r.styleCode ?? "").trim()}||${(r.brand ?? "").trim()}`;
        baseline.set(key, (baseline.get(key) ?? 0) + (r.transferred ?? 0));
      });
      transferredBaselineRef.current = baseline;
    } else {
      setLockedCount(0);
      setRows([{ styleCodeId: "", brand: "", transferred: 0 }]);
      transferredBaselineRef.current = new Map();
    }
  }, [dispFloor]);

  useEffect(() => {
    if (!open || !effectiveFlow) return;
    initializeRows();
  }, [open, effectiveFlow?.id, loadingFlow]);

  const loadStyles = useCallback(async () => {
    if (!effectiveFlow) return;
    setLoadingStyles(true);
    try {
      const vc = await resolveVendorCodeForStyleLookup(effectiveFlow);
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
  }, [effectiveFlow]);

  useEffect(() => {
    if (open && effectiveFlow) void loadStyles();
  }, [open, effectiveFlow?.id, loadStyles]);

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

  const filteredStyleOptions = useMemo(() => {
    if (!allowedStyleCodeIds.size) return styleOptions;
    return styleOptions.filter((s) => {
      const sid = styleOptionId(s);
      return sid && allowedStyleCodeIds.has(sid);
    });
  }, [styleOptions, allowedStyleCodeIds]);

  const brandSelectOptions = useMemo(
    () =>
      buildBrandSelectOptions(
        styleOptions,
        allowedStyleCodeIds.size ? allowedStyleCodeIds : undefined,
      ),
    [styleOptions, allowedStyleCodeIds],
  );

  const updateRow = (index: number, patch: Partial<TransferredStyleRowDraft>) => {
    if (index < lockedCount) return;
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
    if (index < lockedCount) return;
    if (!styleId) {
      updateRow(index, { styleCodeId: "", brand: "" });
      return;
    }
    const list = filteredStyleOptions.length ? filteredStyleOptions : styleOptions;
    const opt = list.find((o) => styleOptionId(o) === styleId);
    updateRow(index, {
      styleCodeId: styleId,
      brand: (opt?.brand ?? "").trim(),
    });
  };

  const addRow = () => {
    setRows((prev) => [...prev, { styleCodeId: "", brand: "", transferred: 0 }]);
  };

  const removeRow = (index: number) => {
    if (index < lockedCount) return;
    const editableCount = rows.length - lockedCount;
    if (editableCount <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * Builds transferredData from new (non-locked) rows only.
   * Locked rows are already persisted — only new entries are sent to the API.
   */
  const buildTransferredDelta = (): TransferredDataRow[] => {
    const newRows = rows.slice(lockedCount);
    const delta: TransferredDataRow[] = [];

    for (const row of newRows) {
      const sc = (row.styleCodeId ?? "").trim();
      const br = (row.brand ?? "").trim();
      const qty = Math.max(0, Number(row.transferred) || 0);
      if (qty <= 0 || !sc) continue;
      delta.push({ transferred: qty, styleCode: sc, brand: br });
    }

    return delta;
  };

  /**
   * Save only: updates dispatch floor counters without transferredData.
   */
  const handleSaveOnly = async () => {
    if (!effectiveFlow) return;
    if (totalTransferred > receivedQty) {
      toast.error(`Total cannot exceed received (${receivedQty.toLocaleString()}).`);
      return;
    }
    setSaving(true);
    try {
      const updated = await vendorProductionFlowService.updateFloor(effectiveFlow.id, "dispatch", {
        completed: totalTransferred,
      });
      toast.success("Dispatch details saved");
      onSaved(updated);
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  /**
   * Save & stage: validates new style lines only, then opens the container scan modal via parent.
   */
  const handleSaveAndStage = () => {
    if (!effectiveFlow) return;
    if (totalTransferred > receivedQty) {
      toast.error(`Total cannot exceed received (${receivedQty.toLocaleString()}).`);
      return;
    }
    const newRows = rows.slice(lockedCount);
    const list = filteredStyleOptions.length ? filteredStyleOptions : styleOptions;
    const items = toVendorTransferItems(newRows, list);
    const sum = items.reduce((s, i) => s + i.transferred, 0);
    if (sum <= 0) {
      toast.error("Enter new style line quantities > 0 before staging on a container.");
      return;
    }
    if (sum > remaining) {
      toast.error(`Only ${remaining} unit(s) available for warehouse transfer.`);
      return;
    }

    const delta = buildTransferredDelta();

    onStagingRequested({
      flow: effectiveFlow,
      patch: {
        quantity: sum,
        transferredData: delta.length > 0 ? delta : undefined,
      },
      transferItems: items,
    });
  };

  if (!open || !effectiveFlow || !portalEl) return null;
  if (loadingFlow) {
    return createPortal(
      <>
        <div className="fixed inset-0 bg-black/50" style={{ zIndex: 1400 }} onClick={onClose} aria-hidden />
        <div
          className="fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-xl flex flex-col overflow-hidden animate-slide-in-right border-l-2 border-gray-300"
          style={{ zIndex: 1401 }}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex-1 flex items-center justify-center p-6">
            <p className="text-[11px] text-gray-500">Loading dispatch data…</p>
          </div>
        </div>
      </>,
      portalEl,
    );
  }
  if (!dispFloor) {
    return createPortal(
      <>
        <div className="fixed inset-0 bg-black/50" style={{ zIndex: 1400 }} onClick={onClose} aria-hidden />
        <div
          className="fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-xl flex flex-col overflow-hidden animate-slide-in-right border-l-2 border-gray-300"
          style={{ zIndex: 1401 }}
          role="dialog"
          aria-modal="true"
        >
          <div className={CRM.drawerHeaderBar}>
            <h2 className={CRM.drawerTitle}>Dispatch — {effectiveFlow.referenceCode || effectiveFlow.id.slice(-6)}</h2>
            <button type="button" onClick={onClose} className={CRM.drawerCloseBtn} aria-label="Close">
              <i className="ri-close-line text-lg" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-6">
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-4">
              No dispatch floor data on this batch yet. Scan a container on the dispatch floor first.
            </p>
          </div>
        </div>
      </>,
      portalEl,
    );
  }

  const drawer = (
    <>
      <div
        className="fixed inset-0 bg-black/50"
        style={{ zIndex: 1400 }}
        onClick={() => { if (!saving) onClose(); }}
        aria-hidden
      />
      <div
        className="fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-xl flex flex-col min-h-0 overflow-hidden animate-slide-in-right border-l-2 border-gray-300"
        style={{ zIndex: 1401 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vendor-dispatch-process-title"
      >
        <div className={CRM.drawerHeaderBar}>
          <h2 id="vendor-dispatch-process-title" className={CRM.drawerTitle}>
            Dispatch — {effectiveFlow.referenceCode || effectiveFlow.id.slice(-6)}
          </h2>
          <button type="button" onClick={onClose} className={CRM.drawerCloseBtn} aria-label="Close" disabled={saving}>
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <div className={`${CRM.drawerBodyScroll} min-h-0`}>
          <p className={CRM.drawerHint}>
            <strong>Dispatch:</strong> Enter quantity per style code.{" "}
            <strong>Save</strong> updates dispatch counters only.{" "}
            <strong>Save &amp; stage</strong> opens container scan — stages goods into a warehouse container.{" "}
            Warehouse then scans the same barcode to complete inward.
          </p>

          <VendorFloorBatchSummary
            flow={effectiveFlow}
            footerInfo={
              <>
                Received: <strong>{receivedQty.toLocaleString()}</strong> · Transferred:{" "}
                <strong>{(dispFloor.transferred ?? 0).toLocaleString()}</strong> · Remaining:{" "}
                <strong className={remaining <= 0 ? "text-gray-400" : "text-emerald-700"}>
                  {remaining.toLocaleString()}
                </strong> · Style row sum:{" "}
                <strong className={totalTransferred > receivedQty ? "text-red-600" : "text-emerald-700"}>
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

          {inboundForStyles.length > 0 && (
            <div className={CRM.drawerSection}>
              <div className={CRM.drawerSectionHead}>1. Inbound received (from FC / container)</div>
              <div className="p-3">
                <div className="flex flex-wrap gap-1">
                  {inboundForStyles.map((row, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-1.5 py-0.5 rounded border bg-emerald-50/80 border-emerald-100"
                    >
                      {brandLabelForStyleId(
                        styleOptions,
                        String(row.styleCode ?? "").trim(),
                        row.brand,
                      )}: {row.transferred ?? 0}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {lockedCount > 0 && (
            <div className={CRM.drawerSection}>
              <div className={CRM.drawerSectionHead}>2. Previously saved (read-only)</div>
              <div className="p-3 space-y-2">
                {rows.slice(0, lockedCount).map((row, index) => {
                  const label = brandLabelForStyleId(
                    styleOptions,
                    row.styleCodeId,
                    row.brand,
                  );
                  return (
                  <div
                    key={`locked-${index}`}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_88px_auto] gap-2 items-end border border-gray-200 rounded p-2 bg-gray-100/70 opacity-75"
                  >
                    <div>
                      <label className="block text-[10px] font-medium text-gray-400 mb-0.5">Brand</label>
                      <div className="w-full border border-gray-200 rounded px-2 py-1 text-[11px] bg-gray-100 text-gray-600 cursor-not-allowed">
                        {label}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-400 mb-0.5">Qty</label>
                      <div className="w-full border border-gray-200 rounded px-2 py-1 text-[11px] text-right tabular-nums bg-gray-100 text-gray-600 cursor-not-allowed">
                        {(row.transferred ?? 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      <i className="ri-lock-line text-gray-400 text-sm" title="Saved — read only" />
                    </div>
                  </div>
                  );
                })}
                <p className="text-[10px] text-gray-500">
                  Saved total: <strong>{lockedTotal.toLocaleString()}</strong>
                </p>
              </div>
            </div>
          )}

          <div className={CRM.drawerSection}>
            <div className={CRM.drawerSectionHead}>{lockedCount > 0 ? "3" : "2"}. New quantity per brand (for warehouse)</div>
            <div className="p-3 space-y-2">
              {rows.slice(lockedCount).map((row, idx) => {
                const index = lockedCount + idx;
                return (
                  <div
                    key={`new-${idx}`}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_88px_auto] gap-2 items-end border border-gray-100 rounded p-2 bg-gray-50/80"
                  >
                    <div>
                      <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Brand</label>
                      <select
                        value={row.styleCodeId}
                        onChange={(e) => onStyleSelect(index, e.target.value)}
                        disabled={saving || loadingStyles}
                        className="w-full border border-gray-200 rounded px-2 py-1 text-[11px]"
                        aria-label={`Brand line ${idx + 1}`}
                      >
                        <option value="">Select brand…</option>
                        {brandSelectOptions.map((opt) => (
                          <option key={opt.styleCodeId} value={opt.styleCodeId}>
                            {opt.brand}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Qty</label>
                      <input
                        type="number"
                        min={0}
                        value={row.transferred || ""}
                        onChange={(e) => updateRow(index, { transferred: Math.max(0, Number(e.target.value) || 0) })}
                        disabled={saving || loadingStyles}
                        className="w-full border border-gray-200 rounded px-2 py-1 text-[11px] text-right tabular-nums"
                        aria-label={`Quantity line ${idx + 1}`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      disabled={(rows.length - lockedCount) <= 1 || saving}
                      className="text-[10px] font-bold text-gray-600 px-2 py-1 border border-gray-200 rounded bg-white disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={addRow}
                disabled={saving || loadingStyles}
                className="text-[10px] font-bold text-purple-700 hover:text-purple-900"
              >
                + Add line
              </button>
              <p className="text-[10px] text-gray-600">
                New line total: <strong>{newRowsTotal.toLocaleString()}</strong>
                {lockedCount > 0 && <> · Previously saved: <strong>{lockedTotal.toLocaleString()}</strong></>}
                {" "}· Grand total: <strong>{totalTransferred.toLocaleString()}</strong>
                {" "}· must be ≤ received ({receivedQty.toLocaleString()}) and remaining for transfer ({remaining.toLocaleString()}).
              </p>
            </div>
          </div>
        </div>

        <div className={`${CRM.drawerFooterBar} flex-wrap relative z-10 shrink-0 pointer-events-auto`}>
          <button type="button" onClick={onClose} className={CRM.btnDrawerCancel} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); void handleSaveOnly(); }}
            className={CRM.btnSecondary}
            disabled={saving || totalTransferred > receivedQty}
            title={totalTransferred > receivedQty ? "Total cannot exceed received" : undefined}
          >
            {saving ? "…" : (
              <>
                <i className="ri-save-line text-xs" /> Save
              </>
            )}
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSaveAndStage(); }}
            className={CRM.btnPrimary}
            disabled={saving || totalTransferred > receivedQty || newRowsTotal <= 0 || remaining <= 0}
            title={
              remaining <= 0
                ? "Nothing left to transfer"
                : newRowsTotal <= 0
                  ? "Enter new style row quantities to stage"
                  : undefined
            }
          >
            <i className="ri-inbox-archive-line text-xs" /> Save &amp; stage to Warehouse
          </button>
        </div>
      </div>
    </>
  );

  return createPortal(drawer, portalEl);
}
