"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import JsBarcode from "jsbarcode";
import type { PickListOrderGroup, PickListOrderItem } from "../types";
import {
  downloadOrderExcel,
  formatClientLabel,
  printOrderPickList,
} from "./pickTableExport";
import {
  whmsWarehouseOrders,
  warehouseOrderFlowStatusLabel,
  effectiveWarehouseOrderFlowStatus,
  type WarehouseOrderFlowStatus,
} from "@/shared/services/whmsWarehouseOrderService";
import { whmsPickListFlow } from "@/shared/services/whmsFulfilmentService";

/** Primary next action for the pick/barcode/pack stages handled on this screen. */
const STAGE_ACTIONS: Record<string, { to: WarehouseOrderFlowStatus; label: string; icon: string }> = {
  "order-created": { to: "picking", label: "Start Picking", icon: "ri-walk-line" },
  picking: { to: "picking-done", label: "Picking Done", icon: "ri-check-line" },
  "picking-done": { to: "barcode-in-progress", label: "Start Barcode", icon: "ri-barcode-line" },
  "barcode-in-progress": { to: "packing-done", label: "Packing Done", icon: "ri-archive-line" },
  "packing-done": { to: "sent-to-scanning", label: "Send to Scanning", icon: "ri-qr-scan-2-line" },
};

/** Print barcode labels (CODE128 via JsBarcode) for the picked quantities of an order. */
async function printBarcodeLabels(orderId: string, orderNumber: string) {
  try {
    const payload = await whmsPickListFlow.barcodeLabels(orderId);
    if (!payload.labels.length) {
      toast.error("No picked quantities yet — save picked quantities first");
      return;
    }
    const win = window.open("", "_blank", "width=800,height=900");
    if (!win) {
      toast.error("Popup blocked — allow popups to print");
      return;
    }
    const blocks = payload.labels
      .map((label) => {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        JsBarcode(svg, label.barcode, {
          format: "CODE128",
          width: 2,
          height: 55,
          displayValue: true,
          fontSize: 13,
          margin: 8,
        });
        const one = `<div class="label">
            ${svg.outerHTML}
            <div class="meta">${label.styleCode}${label.size ? ` · ${label.size}` : ""}${label.shade ? ` · ${label.shade}` : ""}</div>
          </div>`;
        return Array.from({ length: label.quantity }, () => one).join("");
      })
      .join("");
    win.document.write(`<!doctype html><html><head><title>Barcodes — ${orderNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 12px; }
        .label { display: inline-block; border: 1px dashed #bbb; padding: 6px 10px; margin: 4px; text-align: center; page-break-inside: avoid; }
        .meta { font-size: 11px; color: #333; margin-top: 2px; }
      </style></head><body>${blocks}
      <script>window.onload = () => window.print();</script></body></html>`);
    win.document.close();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Failed to load barcode labels");
  }
}

function statusBadge(status: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", label: "Pending" },
    partial: { bg: "bg-orange-50 border-orange-200", text: "text-orange-700", label: "Partial" },
    picked: { bg: "bg-sky-50 border-sky-200", text: "text-sky-700", label: "Picked" },
    verified: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", label: "Verified" },
    skipped: { bg: "bg-red-50 border-red-200", text: "text-red-700", label: "Skipped" },
  };
  const s = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wide ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

function formatPickerLabel(pickerName?: string): string | null {
  const name = (pickerName ?? "").trim();
  if (!name) return null;
  return `Picked by: ${name}`;
}

function formatAddonOrderLabel(addonOrderId?: string): string | null {
  const id = (addonOrderId ?? "").trim();
  if (!id) return null;
  return `Addon: ${id}`;
}

/** DOM id for a pick-line quantity input (used for Enter-to-save focus chain). */
export function pickQtyInputId(itemId: string): string {
  return `pick-qty-${itemId}`;
}

/**
 * Focus and select the pickup-qty input for a pick line.
 * @param itemId - Pick list row id
 */
export function focusPickQtyInput(itemId: string): void {
  requestAnimationFrame(() => {
    const el = document.getElementById(pickQtyInputId(itemId)) as HTMLInputElement | null;
    if (!el || el.disabled) return;
    el.focus();
    el.select();
  });
}

/**
 * Next pick line after the current one that still accepts quantity entry.
 * Uses list order (not live status) so focus advances immediately after save.
 * @param items - Order pick lines in display order
 * @param currentItemId - Line just saved or skipped
 */
export function findNextEditablePickItem(
  items: PickListOrderItem[],
  currentItemId: string,
): PickListOrderItem | undefined {
  const idx = items.findIndex((i) => i.id === currentItemId);
  if (idx < 0) return undefined;
  const candidates = [...items.slice(idx + 1), ...items.slice(0, idx)];
  return candidates.find((row) => row.status !== "picked");
}

function ItemRow({
  item,
  index,
  orderNumber,
  saveError,
  onSave,
  onAdvanceFocus,
  onDeleteItem,
}: {
  item: PickListOrderItem;
  index: number;
  orderNumber: string;
  saveError?: string;
  onSave: (itemId: string, pickupQty: number) => Promise<void>;
  onAdvanceFocus?: (itemId: string) => void;
  onDeleteItem?: (itemId: string) => Promise<void>;
}) {
  const [qty, setQty] = useState<number>(item.pickupQuantity);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dirty = qty !== item.pickupQuantity;
  const disabled = item.status === "picked";
  const noStock =
    typeof item.availableStock !== "number" || item.availableStock <= 0;

  useEffect(() => {
    setQty(item.pickupQuantity);
  }, [item.pickupQuantity]);

  const handleSave = async (): Promise<boolean> => {
    if (disabled || !dirty || saving) return false;
    setSaving(true);
    try {
      await onSave(item.id, qty);
      return true;
    } catch {
      setQty(item.pickupQuantity);
      return false;
    } finally {
      setSaving(false);
    }
  };

  /** Save on Enter when changed; always advance focus to the next editable row. */
  const handleQtyKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    e.stopPropagation();
    if (dirty && !disabled) {
      const ok = await handleSave();
      if (ok) onAdvanceFocus?.(item.id);
      return;
    }
    onAdvanceFocus?.(item.id);
  };

  const handleDeleteLine = async () => {
    if (!onDeleteItem || deleting) return;
    if (!confirm("Remove this pick line?")) return;
    setDeleting(true);
    try {
      await onDeleteItem(item.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
    <tr className={`hover:bg-gray-50/50 transition-colors group ${saveError ? "bg-red-50/40" : ""}`}>
      <td className="px-2 py-2 text-[11px] font-medium text-gray-500 border border-gray-200 text-center w-10">
        {index + 1}
      </td>
      <td className="px-2 py-2 text-[11px] font-bold text-purple-700 border border-gray-200 whitespace-nowrap">
        {orderNumber}
      </td>
      <td className="px-2 py-2 text-[12px] font-bold text-gray-900 border border-gray-200 whitespace-nowrap">
        {item.skuCode}
      </td>
      <td className="px-2 py-2 text-[11px] font-medium text-gray-600 border border-gray-200 whitespace-nowrap">
        {item.styleCode || item.skuCode}
      </td>
      <td className="px-2 py-2 text-[11px] font-medium text-gray-700 border border-gray-200 whitespace-nowrap">
        {item.shade || "—"}
      </td>
      <td className="px-2 py-2 text-[12px] font-bold text-gray-900 border border-gray-200 text-center w-20">
        {item.quantity}
      </td>
      <td className="px-2 py-2 border border-gray-200 text-center w-24">
        <span
          className={`text-[12px] font-bold ${noStock ? "text-red-600 uppercase" : "text-gray-900"}`}
          title={noStock ? "No warehouse stock for this style code" : undefined}
        >
          {typeof item.availableStock === "number" ? item.availableStock : "NO STOCK"}
        </span>
      </td>
      <td className="px-2 py-2 border border-gray-200 w-28" onClick={(e) => e.stopPropagation()}>
        <input
          id={pickQtyInputId(item.id)}
          type="number"
          min={0}
          max={item.quantity}
          value={qty}
          disabled={disabled}
          aria-label={`Pickup quantity for ${item.styleCode || item.skuCode}`}
          onChange={(e) => setQty(Math.max(0, Number(e.target.value)))}
          onKeyDown={(e) => void handleQtyKeyDown(e)}
          onClick={(e) => e.stopPropagation()}
          className={`w-full bg-white border rounded px-2 py-1 text-[12px] font-bold text-center outline-none transition-colors
            ${disabled ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed" : ""}
            ${dirty && !disabled ? "border-purple-400 ring-1 ring-purple-200 text-purple-700" : "border-gray-200 text-gray-800"}
            focus:border-purple-400 focus:ring-1 focus:ring-purple-200`}
        />
      </td>
      <td className="px-2 py-2 border border-gray-200 text-center w-24">
        {statusBadge(item.status)}
      </td>
      <td className="px-2 py-2 border border-gray-200 text-center min-w-[7.5rem]">
        <div className="flex items-center justify-center gap-1 flex-wrap">
          <button
            type="button"
            disabled={disabled || !dirty || saving}
            onClick={(e) => {
              e.stopPropagation();
              void handleSave().then((ok) => {
                if (ok) onAdvanceFocus?.(item.id);
              });
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-bold uppercase tracking-wide transition-colors shadow-sm
              ${disabled || !dirty
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-purple-600 text-white hover:bg-purple-700 cursor-pointer"
              }`}
          >
            {saving ? (
              <i className="ri-loader-4-line animate-spin text-xs"></i>
            ) : (
              <i className="ri-save-line text-xs"></i>
            )}
            Save
          </button>
          {onDeleteItem ? (
            <button
              type="button"
              title="Remove pick line"
              disabled={deleting}
              onClick={handleDeleteLine}
              className={`inline-flex items-center justify-center w-8 h-8 rounded text-[11px] transition-colors shadow-sm border
                ${deleting
                  ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                  : "bg-red-50 text-red-600 border-red-100 hover:bg-red-100 cursor-pointer"
                }`}
            >
              {deleting ? (
                <i className="ri-loader-4-line animate-spin text-sm"></i>
              ) : (
                <i className="ri-delete-bin-line text-sm"></i>
              )}
            </button>
          ) : null}
        </div>
      </td>
    </tr>
    {saveError ? (
      <tr className="bg-red-50/60">
        <td colSpan={10} className="px-3 py-2 border border-red-200">
          <p role="alert" aria-live="polite" className="text-[10px] font-semibold text-red-800 leading-snug">
            <i className="ri-error-warning-fill mr-1" aria-hidden />
            {saveError}
          </p>
        </td>
      </tr>
    ) : null}
    </>
  );
}

function OrderProgressSummary({
  group,
  progressPct,
}: {
  group: PickListOrderGroup;
  progressPct: number;
}) {
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-[80px]">
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${
                progressPct >= 100 ? "bg-emerald-500" : progressPct > 0 ? "bg-orange-400" : "bg-gray-300"
              }`}
              style={{ width: `${Math.min(progressPct, 100)}%` }}
            />
          </div>
        </div>
        <span className="text-[10px] font-bold text-gray-500 whitespace-nowrap">
          {group.totalPickupQuantity}/{group.totalQuantity}
        </span>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
        {group.pendingCount > 0 && (
          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
            {group.pendingCount} pending
          </span>
        )}
        {group.partialCount > 0 && (
          <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
            {group.partialCount} partial
          </span>
        )}
        {group.pickedCount > 0 && (
          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
            {group.pickedCount} picked
          </span>
        )}
      </div>
    </>
  );
}

function OrderGroupRow({
  group,
  index,
  expanded,
  showDetailColumns,
  onToggleExpand,
  onSave,
  onSetPickerName,
  onDeleteItem,
  onDeleteOrder,
  onRefresh,
  onAlert,
  pickItemErrors,
}: {
  group: PickListOrderGroup;
  index: number;
  expanded: boolean;
  showDetailColumns: boolean;
  onToggleExpand: () => void;
  onSave: (itemId: string, pickupQty: number) => Promise<void>;
  onSetPickerName?: (orderId: string, pickerName: string) => Promise<void>;
  onDeleteItem?: (itemId: string) => Promise<void>;
  onDeleteOrder?: (orderId: string, orderNumber: string) => Promise<void>;
  onRefresh?: () => void;
  onAlert?: (message: string) => void;
  pickItemErrors?: Record<string, string>;
}) {
  const [deletingOrder, setDeletingOrder] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerNameDraft, setPickerNameDraft] = useState(group.pickerName ?? "");
  const [pickerSaving, setPickerSaving] = useState(false);
  const [stageBusy, setStageBusy] = useState(false);
  const [stageError, setStageError] = useState<string | null>(null);
  const wasExpandedRef = useRef(expanded);

  const advancePickFocus = useCallback(
    (currentItemId: string) => {
      const next = findNextEditablePickItem(group.items, currentItemId);
      if (next) focusPickQtyInput(next.id);
    },
    [group.items],
  );

  useEffect(() => {
    if (expanded && !wasExpandedRef.current) {
      const first = group.items.find((row) => row.status !== "picked");
      if (first) focusPickQtyInput(first.id);
    }
    wasExpandedRef.current = expanded;
  }, [expanded, group.items]);

  const flowStatus = effectiveWarehouseOrderFlowStatus({
    flowStatus:
      (group as { flowStatus?: string }).flowStatus ??
      (group.order as { flowStatus?: string } | undefined)?.flowStatus,
    status: (group.order as { status?: string } | undefined)?.status,
  });
  const stageAction = STAGE_ACTIONS[flowStatus];

  const reportStageError = (message: string) => {
    setStageError(message);
    toast.error(message, { duration: 8000 });
    onAlert?.(message);
  };

  const handleStageAdvance = async () => {
    if (!stageAction || stageBusy) return;
    if (!confirm(`${stageAction.label} for order ${group.orderNumber}?`)) return;
    setStageBusy(true);
    setStageError(null);
    try {
      await whmsWarehouseOrders.transitionFlowStatus(group.orderId, stageAction.to);
      toast.success(`Order ${group.orderNumber}: ${warehouseOrderFlowStatusLabel(stageAction.to)}`);
      onRefresh?.();
    } catch (err) {
      reportStageError(err instanceof Error ? err.message : "Stage change failed");
    } finally {
      setStageBusy(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!onDeleteOrder || deletingOrder) return;
    if (!confirm(`Remove all pick lines for order ${group.orderNumber}?`)) return;
    setDeletingOrder(true);
    try {
      await onDeleteOrder(group.orderId, group.orderNumber);
    } finally {
      setDeletingOrder(false);
    }
  };

  const progressPct = group.totalQuantity > 0
    ? Math.round((group.totalPickupQuantity / group.totalQuantity) * 100)
    : 0;

  const openPickerModal = () => {
    setPickerNameDraft(group.pickerName ?? "");
    setPickerOpen(true);
  };

  const closePickerModal = () => {
    if (pickerSaving) return;
    setPickerOpen(false);
  };

  const savePickerName = async () => {
    if (!onSetPickerName || pickerSaving) return;
    const name = pickerNameDraft.trim();
    if (!name) return;
    setPickerSaving(true);
    try {
      await onSetPickerName(group.orderId, name);
      setPickerOpen(false);
    } finally {
      setPickerSaving(false);
    }
  };

  return (
    <>
      {pickerOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Set picker name"
          onClick={closePickerModal}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />
          <div
            className="relative w-full max-w-sm rounded-lg bg-white shadow-xl border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[12px] font-bold text-gray-900 truncate">Picker name</div>
                <div className="text-[11px] font-semibold text-gray-500 truncate">{group.orderNumber}</div>
              </div>
              <button
                type="button"
                onClick={closePickerModal}
                disabled={pickerSaving}
                className="inline-flex items-center justify-center w-8 h-8 rounded bg-gray-50 text-gray-500 hover:bg-gray-100 disabled:opacity-60"
                aria-label="Close"
              >
                <i className="ri-close-line text-base" />
              </button>
            </div>
            <div className="px-4 py-4">
              <label className="block text-[11px] font-bold text-gray-700 mb-1" htmlFor={`picker-${group.orderId}`}>
                Name
              </label>
              <input
                id={`picker-${group.orderId}`}
                value={pickerNameDraft}
                onChange={(e) => setPickerNameDraft(e.target.value)}
                autoFocus
                className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-[12px] font-semibold text-gray-900 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200"
                placeholder="e.g. Raj"
              />
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closePickerModal}
                  disabled={pickerSaving}
                  className="px-3 py-2 rounded text-[11px] font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void savePickerName()}
                  disabled={!pickerNameDraft.trim() || pickerSaving || !onSetPickerName}
                  className="px-3 py-2 rounded text-[11px] font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60"
                >
                  {pickerSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <tr
        className="bg-gray-50/60 hover:bg-gray-100/80 cursor-pointer transition-colors border-t-2 border-gray-200"
        onClick={onToggleExpand}
      >
        <td className="px-2 py-2.5 text-[11px] font-medium text-gray-500 border border-gray-200 text-center w-10">
          {index + 1}
        </td>
        <td className="px-2 py-2.5 border border-gray-200 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <i className={`ri-arrow-${expanded ? "down" : "right"}-s-line text-sm text-gray-400 transition-transform`} />
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] font-bold text-purple-700 leading-4">{group.orderNumber}</span>
              {formatClientLabel({ clientName: group.clientName, clientType: group.clientType }) ? (
                <span className="text-[10px] font-semibold text-gray-600 leading-4 truncate">
                  {formatClientLabel({ clientName: group.clientName, clientType: group.clientType })}
                </span>
              ) : null}
              {formatAddonOrderLabel(group.addonOrderId) ? (
                <span className="text-[10px] font-semibold text-gray-500 leading-4 truncate">
                  {formatAddonOrderLabel(group.addonOrderId)}
                </span>
              ) : null}
              {formatPickerLabel(group.pickerName) ? (
                <span className="text-[10px] font-semibold text-gray-500 leading-4 truncate">
                  {formatPickerLabel(group.pickerName)}
                </span>
              ) : null}
            </div>
            <span className="bg-purple-50 text-purple-600 text-[9px] font-bold px-1.5 py-0.5 rounded">
              {group.totalItems} {group.totalItems === 1 ? "item" : "items"}
            </span>
          </div>
          {!showDetailColumns ? (
            <div className="mt-2 pl-5">
              <OrderProgressSummary group={group} progressPct={progressPct} />
            </div>
          ) : null}
        </td>
        {showDetailColumns ? (
          <>
            <td className="px-2 py-2.5 border border-gray-200" colSpan={2}>
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-[80px]">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        progressPct >= 100 ? "bg-emerald-500" : progressPct > 0 ? "bg-orange-400" : "bg-gray-300"
                      }`}
                      style={{ width: `${Math.min(progressPct, 100)}%` }}
                    />
                  </div>
                </div>
                <span className="text-[10px] font-bold text-gray-500 whitespace-nowrap">
                  {group.totalPickupQuantity}/{group.totalQuantity}
                </span>
              </div>
            </td>
            <td className="px-2 py-2.5 border border-gray-200">
              <div className="flex items-center gap-1.5 flex-wrap">
                {group.pendingCount > 0 && (
                  <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                    {group.pendingCount} pending
                  </span>
                )}
                {group.partialCount > 0 && (
                  <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                    {group.partialCount} partial
                  </span>
                )}
                {group.pickedCount > 0 && (
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                    {group.pickedCount} picked
                  </span>
                )}
              </div>
            </td>
          </>
        ) : null}
        <td className="px-2 py-2.5 border border-gray-200 text-center w-20">
          <span className="text-[11px] font-bold text-gray-800">{group.totalQuantity}</span>
        </td>
        {showDetailColumns ? (
          <td className="px-2 py-2.5 border border-gray-200 text-center w-24">
            <span className="text-[11px] font-bold text-gray-400">—</span>
          </td>
        ) : null}
        <td className="px-2 py-2.5 border border-gray-200 text-center w-28">
          <span className="text-[11px] font-bold text-gray-800">{group.totalPickupQuantity}</span>
        </td>
        <td className="px-2 py-2.5 border border-gray-200 text-center w-24">
          {statusBadge(group.overallStatus)}
        </td>
        <td className="px-2 py-2.5 border border-gray-200 text-center min-w-[7.5rem]">
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="flex items-center justify-center gap-1 flex-wrap">
              {stageAction ? (
                <button
                  type="button"
                  title={`${stageAction.label} (stage: ${warehouseOrderFlowStatusLabel(flowStatus)})`}
                  disabled={stageBusy}
                  onClick={(e) => { e.stopPropagation(); void handleStageAdvance(); }}
                  className="inline-flex items-center gap-1 px-2 h-7 rounded text-[10px] font-bold bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors shadow-sm whitespace-nowrap disabled:opacity-60"
                >
                  {stageBusy ? <i className="ri-loader-4-line animate-spin"></i> : <i className={stageAction.icon}></i>}
                  {stageAction.label}
                </button>
              ) : (
                <span
                  className="inline-flex items-center px-2 h-7 rounded text-[9px] font-bold bg-gray-100 text-gray-600 whitespace-nowrap"
                  title={`Current stage: ${warehouseOrderFlowStatusLabel(flowStatus)}`}
                >
                  {warehouseOrderFlowStatusLabel(flowStatus)}
                </span>
              )}
            <button
              type="button"
              title="Print barcode labels (picked quantities)"
              onClick={(e) => { e.stopPropagation(); void printBarcodeLabels(group.orderId, group.orderNumber); }}
              className="inline-flex items-center justify-center w-7 h-7 rounded text-[11px] bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors shadow-sm"
            >
              <i className="ri-barcode-line"></i>
            </button>
            <button
              type="button"
              title="Set picker name"
              onClick={(e) => { e.stopPropagation(); openPickerModal(); }}
              className="inline-flex items-center justify-center w-7 h-7 rounded text-[11px] bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors shadow-sm"
              aria-label="Set picker name"
            >
              <i className="ri-user-3-line"></i>
            </button>
            <button
              type="button"
              title="Download Excel"
              onClick={(e) => { e.stopPropagation(); downloadOrderExcel(group); }}
              className="inline-flex items-center justify-center w-7 h-7 rounded text-[11px] bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors shadow-sm"
            >
              <i className="ri-download-2-line"></i>
            </button>
            <button
              type="button"
              title="Print"
              onClick={(e) => { e.stopPropagation(); printOrderPickList(group); }}
              className="inline-flex items-center justify-center w-7 h-7 rounded text-[11px] bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors shadow-sm"
            >
              <i className="ri-printer-line"></i>
            </button>
            <button
              type="button"
              title={expanded ? "Collapse" : "Expand"}
              onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
              className="inline-flex items-center justify-center w-7 h-7 rounded text-[11px] bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors shadow-sm"
            >
              <i className={`ri-arrow-${expanded ? "up" : "down"}-s-line`}></i>
            </button>
            {onDeleteOrder ? (
              <button
                type="button"
                title="Remove all pick lines for this order"
                disabled={deletingOrder}
                onClick={(e) => { e.stopPropagation(); void handleDeleteOrder(); }}
                className={`inline-flex items-center justify-center w-7 h-7 rounded text-[11px] transition-colors shadow-sm
                  ${deletingOrder
                    ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                    : "bg-red-50 text-red-600 hover:bg-red-100"
                  }`}
              >
                {deletingOrder ? (
                  <i className="ri-loader-4-line animate-spin text-xs"></i>
                ) : (
                  <i className="ri-delete-bin-line"></i>
                )}
              </button>
            ) : null}
            </div>
            {stageError ? (
              <p
                role="alert"
                aria-live="polite"
                className="text-[9px] font-medium text-red-600 max-w-[14rem] leading-snug text-center"
              >
                {stageError}
              </p>
            ) : null}
          </div>
        </td>
      </tr>

      {expanded && group.items.map((item, idx) => (
        <ItemRow
          key={item.id}
          item={item}
          index={idx}
          orderNumber={group.orderNumber}
          saveError={pickItemErrors?.[item.id]}
          onSave={onSave}
          onAdvanceFocus={advancePickFocus}
          onDeleteItem={onDeleteItem}
        />
      ))}
    </>
  );
}

export default function PickTable({
  orderGroups,
  pickItemErrors,
  onSave,
  onSetPickerName,
  onDeleteItem,
  onDeleteOrder,
  onRefresh,
  onAlert,
}: {
  orderGroups: PickListOrderGroup[];
  pickItemErrors?: Record<string, string>;
  onSave: (itemId: string, pickupQty: number) => Promise<void>;
  onSetPickerName?: (orderId: string, pickerName: string) => Promise<void>;
  onDeleteItem?: (itemId: string) => Promise<void>;
  onDeleteOrder?: (orderId: string, orderNumber: string) => Promise<void>;
  onRefresh?: () => void;
  onAlert?: (message: string) => void;
}) {
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());
  const showDetailColumns = expandedOrderIds.size > 0;

  /**
   * Toggle expanded state for an order row and sync detail-column visibility.
   */
  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  if (orderGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <i className="ri-inbox-line text-xl text-gray-200"></i>
        </div>
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">No Pick Items</h3>
        <p className="text-[11px] text-gray-400">No entries match your current filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className={`w-full border-collapse border border-gray-200 ${showDetailColumns ? "min-w-[820px]" : "min-w-[560px]"}`}>
        <thead>
          <tr className="bg-gray-50/30">
            <th className="px-2 py-2.5 text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 text-center w-10">
              #
            </th>
            <th className="px-2 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
              Order No
            </th>
            {showDetailColumns ? (
              <>
                <th className="px-2 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  SKU Code
                </th>
                <th className="px-2 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Style Code
                </th>
                <th className="px-2 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Color
                </th>
              </>
            ) : null}
            <th className="px-2 py-2.5 text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 text-center w-20">
              Qty
            </th>
            {showDetailColumns ? (
              <th className="px-2 py-2.5 text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 text-center w-24">
                Stock
              </th>
            ) : null}
            <th className="px-2 py-2.5 text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 text-center w-28">
              Pickup Qty
            </th>
            <th className="px-2 py-2.5 text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 text-center w-24">
              Status
            </th>
            <th className="px-2 py-2.5 text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 text-center min-w-[7.5rem]">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {orderGroups.map((group, idx) => (
            <OrderGroupRow
              key={group.orderId}
              group={group}
              index={idx}
              expanded={expandedOrderIds.has(group.orderId)}
              showDetailColumns={showDetailColumns}
              onToggleExpand={() => toggleOrderExpand(group.orderId)}
              onSave={onSave}
              onSetPickerName={onSetPickerName}
              onDeleteItem={onDeleteItem}
              onDeleteOrder={onDeleteOrder}
              onRefresh={onRefresh}
              onAlert={onAlert}
              pickItemErrors={pickItemErrors}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
