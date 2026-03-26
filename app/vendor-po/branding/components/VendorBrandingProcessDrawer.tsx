"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { CRM } from "../../vendor-list/crmUiClasses";
import { VendorFloorBatchSummary } from "../../components/VendorFloorBatchSummary";
import vendorProductionFlowService, { type VendorProductionFlow } from "@/shared/services/vendorProductionFlowService";
import { getStyleCodesByVendorCode, type StyleCodeByVendorRow } from "@/shared/services/productService";
import { resolveVendorCodeForStyleLookup } from "../brandingFloorUtils";
import {
  rowsFromTransferredApi,
  styleOptionId,
  toTransferredPayloadRows,
  type TransferredStyleRowDraft,
} from "../../utils/transferredStyleRows";

export type BrandingRowDraft = TransferredStyleRowDraft;

type Props = {
  open: boolean;
  flow: VendorProductionFlow | null;
  onClose: () => void;
  onSaved: (updated: VendorProductionFlow) => void;
};

/**
 * Branding floor drawer: transferredData lines with style (from catalog) and quantity.
 */
export function VendorBrandingProcessDrawer({ open, flow, onClose, onSaved }: Props) {
  const [rows, setRows] = useState<TransferredStyleRowDraft[]>([{ styleCodeId: "", brand: "", transferred: 0 }]);
  const [styleOptions, setStyleOptions] = useState<StyleCodeByVendorRow[]>([]);
  const [loadingStyles, setLoadingStyles] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vendorCodeResolved, setVendorCodeResolved] = useState<string | null>(null);
  const receivedQty = flow?.floorQuantities.branding.received ?? 0;
  const remainingQty = flow?.floorQuantities.branding.remaining ?? 0;
  const transferCap = Math.max(0, Math.min(receivedQty, remainingQty));
  const totalTransferred = useMemo(
    () => rows.reduce((sum, r) => sum + Math.max(0, Number(r.transferred) || 0), 0),
    [rows]
  );

  useEffect(() => {
    if (!open || !flow) return;
    const br = flow.floorQuantities.branding;
    setRows(rowsFromTransferredApi(br.transferredData));
  }, [open, flow?.id]);

  const loadStyles = useCallback(async () => {
    if (!flow) return;
    setLoadingStyles(true);
    try {
      const vc = await resolveVendorCodeForStyleLookup(flow);
      setVendorCodeResolved(vc);
      if (!vc) {
        toast.error("Could not resolve vendor code for this batch — add product/vendorCode on the flow or product.");
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

  const handleSave = async () => {
    if (!flow) return;
    if (totalTransferred > transferCap) {
      toast.error(
        `Transfer qty cannot exceed available (${transferCap.toLocaleString()}). Reduce line quantities.`
      );
      return;
    }
    setSaving(true);
    try {
      const updated = await vendorProductionFlowService.updateFloor(flow.id, "branding", {
        mode: "replace",
        transferredData: toTransferredPayloadRows(rows, styleOptions),
      });
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

  if (!open || !flow) return null;

  return (
    <>
      <div className={CRM.drawerBackdrop} onClick={() => !saving && onClose()} aria-hidden />
      <div className={CRM.drawerShellLg} role="dialog" aria-modal="true" aria-labelledby="vendor-branding-drawer-title">
        <div className={CRM.drawerHeaderBar}>
          <h2 id="vendor-branding-drawer-title" className={CRM.drawerTitle}>
            Branding — {flow.referenceCode || flow.id.slice(-6)}
          </h2>
          <button type="button" onClick={onClose} className={CRM.drawerCloseBtn} aria-label="Close" disabled={saving}>
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <div className={CRM.drawerBodyScroll}>
          <p className={CRM.drawerHint}>
            <strong>Branding:</strong> set <strong>style / brand</strong> and <strong>quantity</strong> per line (transfer
            breakdown). Sent as <code className="text-[10px]">mode: replace</code> + <code className="text-[10px]">transferredData</code>{" "}
            only — server returns the source of truth.
          </p>
          <VendorFloorBatchSummary
            flow={flow}
            footerInfo={
              <>
                Received: <strong>{receivedQty.toLocaleString()}</strong> · Remaining:{" "}
                <strong>{remainingQty.toLocaleString()}</strong> · Max transferable:{" "}
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
            <div className={`${CRM.drawerSectionHead} flex flex-wrap items-center justify-between gap-2`}>
              <span>2. Transfer breakdown (style &amp; qty)</span>
              <button type="button" className={CRM.btnSecondary} onClick={addRow} disabled={saving}>
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
                      <p className="text-[10px] text-gray-500 mt-0.5">Brand sent: {row.brand}</p>
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
                      onChange={(e) => updateRow(index, { transferred: Number(e.target.value) })}
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
        </div>

        <div className={CRM.drawerFooterBar}>
          <button type="button" onClick={onClose} className={CRM.btnDrawerCancel} disabled={saving}>
            Cancel
          </button>
          <button type="button" onClick={() => void handleSave()} className={CRM.btnPrimary} disabled={saving}>
            {saving ? "…" : (
              <>
                <i className="ri-save-line text-xs" /> Save
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
