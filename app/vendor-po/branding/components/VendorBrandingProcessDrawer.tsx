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
  rowsFromTransferredApi,
  styleOptionId,
  toTransferredPayloadRows,
  toVendorTransferItems,
  type TransferredStyleRowDraft,
} from "../../utils/transferredStyleRows";
export type BrandingRowDraft = TransferredStyleRowDraft;

type Props = {
  open: boolean;
  flow: VendorProductionFlow | null;
  onClose: () => void;
  onSaved: (updated: VendorProductionFlow) => void;
};
/** Branding: floor PATCH + optional transfer to Final (container + transferItems). */
export function VendorBrandingProcessDrawer({
  open,
  flow,
  onClose,
  onSaved,
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
  /** If set, after floor save we call `PATCH …/transfer` with `transferItems` + this barcode. */
  const [stagingContainerBarcode, setStagingContainerBarcode] = useState("");
  /** Render drawer in `document.body` so layout `overflow` / stacking contexts cannot block clicks. */
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalEl(document.body);
  }, []);
  const receivedQty = flow?.floorQuantities.branding.received ?? 0;
  const remainingQty = flow?.floorQuantities.branding.remaining ?? 0;
  /** Server-derived `completed`; used for line caps only (not sent on PATCH). */
  const completedFromServer = flow?.floorQuantities.branding.completed ?? 0;
  const transferCap = useMemo(() => {
    const r = Math.max(0, receivedQty);
    const c = Math.max(0, Math.floor(completedFromServer));
    if (c === 0) return r;
    return Math.min(r, c);
  }, [receivedQty, completedFromServer]);
  const totalTransferred = useMemo(
    () =>
      rows.reduce((sum, r) => sum + Math.max(0, Number(r.transferred) || 0), 0),
    [rows],
  );

  useEffect(() => {
    if (!open || !flow) return;
    const br = flow.floorQuantities.branding;
    setRows(rowsFromTransferredApi(br.transferredData));
    setStagingContainerBarcode("");
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

  const updateRow = (
    index: number,
    patch: Partial<TransferredStyleRowDraft>,
  ) => {
    setRows((prev) => {
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
    setRows((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index),
    );
  };

  const handleSave = async () => {
    if (!flow) {
      toast.error("Batch not loaded — close and open Process again.");
      return;
    }
    if (totalTransferred > transferCap) {
      toast.error(
        `Transfer qty cannot exceed available (${transferCap.toLocaleString()}). Reduce line quantities.`,
      );
      return;
    }
    const bar = stagingContainerBarcode.trim();
    if (bar) {
      const preItems = toVendorTransferItems(rows, styleOptions);
      const preSum = preItems.reduce((s, i) => s + i.transferred, 0);
      if (preSum <= 0) {
        toast.error(
          "Enter style line quantities > 0 before staging on a container.",
        );
        return;
      }
    }
    setSaving(true);
    try {
      /** Backend auto-transfer (branding→final) requires container on this PATCH, not only on `/transfer`. */
      const patchPayload: Parameters<
        typeof vendorProductionFlowService.updateFloor
      >[2] = {
        mode: "replace",
        transferredData: toTransferredPayloadRows(rows, styleOptions),
      };
      if (bar) {
        patchPayload.existingContainerBarcode = bar;
        patchPayload.autoTransferToNextFloor = true;
      }
      const updated = await vendorProductionFlowService.updateFloor(
        flow.id,
        "branding",
        patchPayload,
      );
      if (!bar) {
        toast.success("Branding updated");
      } else {
        toast.success(
          "Saved + staged on container — scan on Final Checking to receive.",
        );
      }
      onSaved(updated);
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Update failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
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
            <strong>Save</strong> sends <code className="text-[10px]">transferredData</code>;{" "}
            <code className="text-[10px]">completed</code> is server-side. If you enter a container below, the same{" "}
            <code className="text-[10px]">PATCH …/floors/branding</code> also sends{" "}
            <code className="text-[10px]">existingContainerBarcode</code> +{" "}
            <code className="text-[10px]">autoTransferToNextFloor</code> (required to stage to Final Checking).{" "}
            <span className="text-gray-600">
              <code className="text-[10px]">receivedData[].transferred</code> = inbound line
              qty, not floor outbound <code className="text-[10px]">transferred</code>.
            </span>
          </p>
          <VendorFloorBatchSummary
            flow={flow}
            footerInfo={
              <>
                Received: <strong>{receivedQty.toLocaleString()}</strong> · Remaining (derived):{" "}
                <strong>{remainingQty.toLocaleString()}</strong> · Forward pool
                (completed − transferred):{" "}
                <strong className="text-purple-700">
                  {Math.max(
                    0,
                    (flow.floorQuantities.branding.completed ?? 0) -
                      (flow.floorQuantities.branding.transferred ?? 0),
                  ).toLocaleString()}
                </strong>{" "}
                · Breakdown line total:{" "}
                <strong
                  className={
                    totalTransferred > transferCap
                      ? "text-red-600"
                      : "text-emerald-700"
                  }
                >
                  {totalTransferred.toLocaleString()}
                </strong>{" "}
                (line cap: received
                {completedFromServer > 0 ? ", min with server completed" : ""})
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
              <span>1. Style breakdown (transferredData + transfer lines)</span>
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
                  className="grid grid-cols-1 sm:grid-cols-[1fr_minmax(0,120px)_auto] gap-2 items-end border border-gray-100 rounded-lg p-2 bg-gray-50/80"
                >
                  <div>
                    <label className={CRM.label}>Style / brand</label>
                    <select
                      className={CRM.select}
                      value={row.styleCodeId}
                      onChange={(e) => onStyleSelect(index, e.target.value)}
                      disabled={saving || loadingStyles}
                    >
                      <option value="">Unspecified</option>
                      {styleOptions.map((s) => {
                        const sid = styleOptionId(s);
                        if (!sid) return null;
                        return (
                          <option key={sid} value={sid}>
                            {s.styleCode} — {s.brand}
                          </option>
                        );
                      })}
                    </select>
                    {row.styleCodeId && row.brand && (
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        Brand sent: {row.brand}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={CRM.label}>Qty</label>
                    <input
                      type="number"
                      min={0}
                      max={transferCap}
                      className={CRM.input}
                      value={row.transferred}
                      onChange={(e) =>
                        updateRow(index, {
                          transferred: Number(e.target.value),
                        })
                      }
                      disabled={saving}
                    />
                  </div>
                  <div className="flex justify-end sm:justify-center pb-0.5">
                    <button
                      type="button"
                      className={CRM.iconDanger}
                      onClick={() => removeRow(index)}
                      disabled={saving || rows.length <= 1}
                      title="Remove row"
                    >
                      <i className="ri-delete-bin-line" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={CRM.drawerSection}>
            <div className={CRM.drawerSectionHead}>
              2. Container for Final Checking (optional)
            </div>
            <div className="p-3 space-y-2">
              <p className="text-[10px] text-gray-600 leading-snug">
                If you fill this, <strong>Save</strong> includes it on the branding PATCH (with{" "}
                <code className="text-[10px]">autoTransferToNextFloor</code>) so the backend can stage
                the same style lines on this bag for Final Checking. Leave empty to update{" "}
                <code className="text-[10px]">transferredData</code> only (no staging).
              </p>
              <label className={CRM.label}>Existing container barcode / id</label>
              <input
                type="text"
                className={`${CRM.input} font-mono border-purple-200 focus:border-purple-500`}
                placeholder="Scan or paste — only if staging to Final FC now"
                value={stagingContainerBarcode}
                onChange={(e) => setStagingContainerBarcode(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>
        </div>

        <div
          className={`${CRM.drawerFooterBar} relative z-10 shrink-0 pointer-events-auto`}
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
            className={CRM.btnPrimary}
            disabled={saving || totalTransferred > transferCap}
            title={
              totalTransferred > transferCap
                ? "Reduce line totals to the allowed cap first"
                : undefined
            }
          >
            {saving ? (
              "…"
            ) : (
              <>
                <i className="ri-save-line text-xs" />{" "}
                {stagingContainerBarcode.trim() ? "Save & stage to Final FC" : "Save"}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );

  return createPortal(drawer, portalEl);
}
