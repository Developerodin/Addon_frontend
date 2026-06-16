"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-hot-toast";
import { CRM } from "../../vendor-list/crmUiClasses";
import { VendorFloorBatchSummary } from "../../components/VendorFloorBatchSummary";
import vendorProductionFlowService, {
  type VendorProductionFlow,
} from "@/shared/services/vendorProductionFlowService";
import {
  getStyleCodesByVendorCode,
  type StyleCodeByVendorRow,
} from "@/shared/services/productService";
import { resolveVendorCodeForStyleLookup } from "../brandingFloorUtils";
import {
  brandingDeltaTransferredRows,
  brandLabelForStyleId,
  buildBrandSelectOptions,
  isMeaningfulEditableTransferredRow,
  rowsFromTransferredApi,
  styleOptionId,
  toVendorTransferItems,
  type TransferredStyleRowDraft,
} from "../../utils/transferredStyleRows";
import type { PendingBrandingStagingPatch } from "./VendorBrandingStagingModal";
export type BrandingRowDraft = TransferredStyleRowDraft;

type Props = {
  open: boolean;
  flow: VendorProductionFlow | null;
  onClose: () => void;
  onSaved: (updated: VendorProductionFlow) => void;
  /** Opens container modal (secondary-checking style); parent closes this drawer. */
  onStagingRequested: (ctx: {
    flow: VendorProductionFlow;
    patch: PendingBrandingStagingPatch;
  }) => void;
};
/** Branding: floor PATCH + optional transfer to Final (container + transferItems). */
export function VendorBrandingProcessDrawer({
  open,
  flow,
  onClose,
  onSaved,
  onStagingRequested,
}: Props) {
  const [rows, setRows] = useState<TransferredStyleRowDraft[]>([
    { styleCodeId: "", brand: "", transferred: 0 },
  ]);
  const [styleOptions, setStyleOptions] = useState<StyleCodeByVendorRow[]>([]);
  const [loadingStyles, setLoadingStyles] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vendorCodeResolved, setVendorCodeResolved] = useState<string | null>(
    null,
  );
  /** Render drawer in `document.body` so layout `overflow` / stacking contexts cannot block clicks. */
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalEl(document.body);
  }, []);
  const receivedQty = flow?.floorQuantities.branding.received ?? 0;
  const remainingQty = flow?.floorQuantities.branding.remaining ?? 0;
  const scalarTransferredOut =
    flow?.floorQuantities.branding.transferred ?? 0;
  /** Server-derived `completed` — shown in summary only; line cap follows received (API: lineSum ≤ received). */
  const completedFromServer = flow?.floorQuantities.branding.completed ?? 0;
  const lineSumMax = useMemo(() => Math.max(0, receivedQty), [receivedQty]);
  const totalTransferred = useMemo(
    () =>
      rows.reduce((sum, r) => sum + Math.max(0, Number(r.transferred) || 0), 0),
    [rows],
  );
  /** Qty on new (editable) lines only — staging requires this > 0. */
  const newRowsTransferredTotal = useMemo(
    () =>
      rows
        .filter(
          (r) => !r.fromServer && isMeaningfulEditableTransferredRow(r),
        )
        .reduce(
          (sum, r) => sum + Math.max(0, Number(r.transferred) || 0),
          0,
        ),
    [rows],
  );

  useEffect(() => {
    if (!open || !flow) return;
    const br = flow.floorQuantities.branding;
    setRows(
      rowsFromTransferredApi(br.transferredData, { markRowsFromServer: true }),
    );
  }, [open, flow?.id]);

  const loadStyles = useCallback(async () => {
    if (!flow) return;
    setLoadingStyles(true);
    try {
      const vc = await resolveVendorCodeForStyleLookup(flow);
      setVendorCodeResolved(vc);
      if (!vc) {
        toast.error(
          "Could not resolve vendor code for this batch — add product/vendorCode on the flow or product.",
        );
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

  /** PATCH body: new rows with qty &gt; 0 only; server merges into stored breakdown. */
  const deltaTransferredPayload = useMemo(
    () => brandingDeltaTransferredRows(rows, styleOptions),
    [rows, styleOptions],
  );
  const lineSumOverReceived = totalTransferred > lineSumMax;
  const brandSelectOptions = useMemo(
    () => buildBrandSelectOptions(styleOptions),
    [styleOptions],
  );

  useEffect(() => {
    if (!open || !styleOptions.length) return;
    setRows((prev) => {
      let changed = false;
      const next = prev.map((r) => {
        if (r.fromServer) return r;
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

  const updateRow = (
    index: number,
    patch: Partial<TransferredStyleRowDraft>,
  ) => {
    setRows((prev) => {
      if (!prev[index] || prev[index].fromServer) return prev;
      const next = [...prev];
      next[index] = {
        ...next[index],
        ...patch,
        transferred: Math.max(
          0,
          Number((patch.transferred ?? next[index].transferred) || 0),
        ),
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
    setRows((prev) => [
      ...prev,
      { styleCodeId: "", brand: "", transferred: 0 },
    ]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => {
      if (!prev[index] || prev[index].fromServer) return prev;
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSave = async () => {
    if (!flow) {
      toast.error("Batch not loaded — close and open Process again.");
      return;
    }
    if (lineSumOverReceived) {
      toast.error(
        `Line total cannot exceed received (${lineSumMax.toLocaleString()}). Reduce quantities.`,
      );
      return;
    }
    if (!deltaTransferredPayload.length) {
      toast.error(
        "Add a new row with quantity > 0 — Save sends delta lines only; recorded rows are not re-posted.",
      );
      return;
    }
    setSaving(true);
    try {
      const updated = await vendorProductionFlowService.updateFloor(
        flow.id,
        "branding",
        {
          transferredData: deltaTransferredPayload,
        },
      );
      toast.success("Branding updated");
      onSaved(updated);
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Update failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  /** Close drawer and open staging modal (container scan runs there, like secondary checking M1). */
  const handleSaveAndStage = () => {
    if (!flow) {
      toast.error("Batch not loaded — close and open Process again.");
      return;
    }
    if (lineSumOverReceived) {
      toast.error(
        `Line total cannot exceed received (${lineSumMax.toLocaleString()}). Reduce quantities.`,
      );
      return;
    }
    if (!deltaTransferredPayload.length) {
      toast.error(
        "Add a new row with quantity > 0 before staging — payload is delta transferredData only.",
      );
      return;
    }
    const newEditableRows = rows.filter(
      (r) => !r.fromServer && isMeaningfulEditableTransferredRow(r),
    );
    const preItems = toVendorTransferItems(newEditableRows, styleOptions);
    const preSum = preItems.reduce((s, i) => s + i.transferred, 0);
    if (preSum <= 0) {
      toast.error(
        "Add a new row with quantity > 0 to stage — recorded lines are read-only.",
      );
      return;
    }
    const patch: PendingBrandingStagingPatch = {
      transferredData: deltaTransferredPayload,
    };
    onStagingRequested({ flow, patch });
  };

  if (!open || !flow) return null;
  if (!portalEl) return null;

  const drawer = (
    <>
      <div
        className="fixed inset-0 bg-black/50"
        style={{ zIndex: 1400 }}
        onClick={() => !saving && onClose()}
        aria-hidden
      />
      <div
        className="fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-xl flex flex-col min-h-0 overflow-hidden animate-slide-in-right border-l-2 border-gray-300"
        style={{ zIndex: 1401 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vendor-branding-drawer-title"
      >
        <div className={CRM.drawerHeaderBar}>
          <h2 id="vendor-branding-drawer-title" className={CRM.drawerTitle}>
            Branding — {flow.referenceCode || flow.id.slice(-6)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={CRM.drawerCloseBtn}
            aria-label="Close"
            disabled={saving}
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <div className={`${CRM.drawerBodyScroll} min-h-0`}>
          <p className={CRM.drawerHint}>
            <strong>Save</strong> sends <strong>delta</strong>{" "}
            <code className="text-[10px]">transferredData</code> (new rows with qty &gt; 0 only); the
            server merges by style + brand and sets{" "}
            <code className="text-[10px]">completed</code> / counters — do not send those scalars.
            Recorded lines are <strong>read-only</strong>; use <strong>Row</strong> for new qty.{" "}
            <strong>Save &amp; stage to Final FC</strong> opens the container modal: the same PATCH
            adds <code className="text-[10px]">existingContainerBarcode</code> +{" "}
            <code className="text-[10px]">autoTransferToNextFloor</code> with that delta.{" "}
            <span className="text-gray-600">
              <code className="text-[10px]">receivedData[].transferred</code> = inbound line qty, not
              floor outbound <code className="text-[10px]">transferred</code>.
            </span>
          </p>
          <VendorFloorBatchSummary
            flow={flow}
            footerInfo={
              <>
                Received: <strong>{receivedQty.toLocaleString()}</strong> · Completed:{" "}
                <strong className="text-emerald-700">
                  {completedFromServer.toLocaleString()}
                </strong>{" "}
                · Remaining:{" "}
                <strong className="text-amber-900">
                  {remainingQty.toLocaleString()}
                </strong>{" "}
                · Transferred (handoff):{" "}
                <strong className="text-purple-800">
                  {scalarTransferredOut.toLocaleString()}
                </strong>{" "}
                · Forward pool (completed − handoff):{" "}
                <strong className="text-purple-700">
                  {Math.max(
                    0,
                    completedFromServer - scalarTransferredOut,
                  ).toLocaleString()}
                </strong>{" "}
                · Breakdown line total:{" "}
                <strong
                  className={
                    lineSumOverReceived ? "text-red-600" : "text-emerald-700"
                  }
                >
                  {totalTransferred.toLocaleString()}
                </strong>{" "}
                (max line sum = received {lineSumMax.toLocaleString()})
              </>
            }
          />

          {vendorCodeResolved && (
            <p className="px-3 text-[10px] text-gray-500">
              Style list for vendor code{" "}
              <span className="font-mono font-semibold">
                {vendorCodeResolved}
              </span>
              {loadingStyles
                ? " — loading…"
                : ` — ${styleOptions.length} style(s)`}
            </p>
          )}

          <div className={CRM.drawerSection}>
            <div
              className={`${CRM.drawerSectionHead} flex flex-wrap items-center justify-between gap-2`}
            >
              <span>1. Brand breakdown (transferredData + transfer lines)</span>
              <button
                type="button"
                className={CRM.btnSecondary}
                onClick={addRow}
                disabled={saving}
              >
                <i className="ri-add-line" /> Row
              </button>
            </div>
            <div className="p-3 space-y-3">
              {rows.map((row, index) => (
                <div
                  key={index}
                  className={`grid grid-cols-1 sm:grid-cols-[1fr_minmax(0,120px)_auto] gap-2 items-end border rounded-lg p-2 ${
                    row.fromServer
                      ? "border-gray-200 bg-gray-100/90"
                      : "border-gray-100 bg-gray-50/80"
                  }`}
                >
                  <div>
                    <label className={CRM.label}>Brand</label>
                    {row.fromServer ? (
                      <p className="text-[11px] font-medium text-gray-800 py-2 px-1">
                        {brandLabelForStyleId(
                          styleOptions,
                          row.styleCodeId,
                          row.brand,
                        )}{" "}
                        <span className="text-[10px] font-normal text-gray-500">
                          (recorded)
                        </span>
                      </p>
                    ) : (
                      <select
                        className={CRM.select}
                        value={row.styleCodeId}
                        onChange={(e) => onStyleSelect(index, e.target.value)}
                        disabled={saving || loadingStyles}
                        aria-label="Select brand"
                      >
                        <option value="">Select brand…</option>
                        {brandSelectOptions.map((opt) => (
                          <option key={opt.styleCodeId} value={opt.styleCodeId}>
                            {opt.brand}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className={CRM.label}>Qty</label>
                    <input
                      type="number"
                      min={0}
                      max={lineSumMax}
                      className={CRM.input}
                      value={row.transferred}
                      onChange={(e) =>
                        updateRow(index, {
                          transferred: Number(e.target.value),
                        })
                      }
                      disabled={saving || row.fromServer}
                    />
                  </div>
                  <div className="flex justify-end sm:justify-center pb-0.5">
                    <button
                      type="button"
                      className={CRM.iconDanger}
                      onClick={() => removeRow(index)}
                      disabled={
                        saving || rows.length <= 1 || Boolean(row.fromServer)
                      }
                      title="Remove row"
                    >
                      <i className="ri-delete-bin-line" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className={`${CRM.drawerFooterBar} flex-wrap relative z-10 shrink-0 pointer-events-auto`}
        >
          <button
            type="button"
            onClick={onClose}
            className={CRM.btnDrawerCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void handleSave();
            }}
            className={CRM.btnSecondary}
            disabled={
              saving ||
              lineSumOverReceived ||
              deltaTransferredPayload.length === 0
            }
            title={
              lineSumOverReceived
                ? "Line total cannot exceed received"
                : deltaTransferredPayload.length === 0
                  ? "Add a new row with quantity > 0 (delta payload)"
                  : undefined
            }
          >
            {saving ? (
              "…"
            ) : (
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
              lineSumOverReceived ||
              newRowsTransferredTotal <= 0 ||
              deltaTransferredPayload.length === 0
            }
            title={
              lineSumOverReceived
                ? "Line total cannot exceed received"
                : newRowsTransferredTotal <= 0 ||
                    deltaTransferredPayload.length === 0
                  ? "Add a new row with quantity > 0 to stage"
                  : undefined
            }
          >
            <i className="ri-inbox-archive-line text-xs" /> Save &amp; stage to
            Final FC
          </button>
        </div>
      </div>
    </>
  );

  return createPortal(drawer, portalEl);
}
