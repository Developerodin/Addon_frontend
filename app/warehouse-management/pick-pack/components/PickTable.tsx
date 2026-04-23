"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";
import type { Range } from "xlsx";
import { saveAs } from "file-saver";
import type { PickListOrderGroup, PickListOrderItem } from "../types";

/**
 * Build compact client label (name and/or type) for print/export.
 */
function formatClientLabel(args: { clientName?: string; clientType?: string }): string | null {
  const name = (args.clientName ?? "").trim();
  const type = (args.clientType ?? "").trim();
  if (!name && !type) return null;
  if (name && type) return `${name} • ${type}`;
  return name || type;
}

function downloadOrderExcel(group: PickListOrderGroup) {
  const clientLine = formatClientLabel({ clientName: group.clientName, clientType: group.clientType });
  const headers = ["Order No", "SKU Code", "Style Code", "Color", "Size", "Qty", "Pickup Qty"] as const;
  const dataRows = group.items.map((item) => [
    group.orderNumber,
    item.skuCode,
    item.styleCode,
    item.shade || "—",
    item.size || "—",
    item.quantity,
    item.pickupQuantity,
  ]);
  const aoa: (string | number)[][] = [[`Pick List – ${group.orderNumber}`]];
  if (clientLine) aoa.push([`Client: ${clientLine}`]);
  aoa.push([...headers]);
  aoa.push(...dataRows);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const colCount = headers.length;
  const merges: Range[] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }];
  if (clientLine) merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } });
  ws["!merges"] = merges;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Pick List");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buf], { type: "application/octet-stream" }), `${group.orderNumber}-pick-list.xlsx`);
}

function printOrderPickList(group: PickListOrderGroup) {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const clientLine = formatClientLabel({ clientName: group.clientName, clientType: group.clientType });
  const clientBlock = clientLine
    ? `<div class="client">Client: ${esc(clientLine)}</div>`
    : "";
  const tableRows = group.items
    .map(
      (item) =>
        `<tr>
          <td>${esc(item.skuCode)}</td>
          <td>${esc(item.styleCode)}</td>
          <td>${esc(item.shade || "—")}</td>
          <td>${esc(item.size || "—")}</td>
          <td style="text-align:center">${item.quantity}</td>
          <td style="text-align:center" class="pickup-qty-cell"></td>
        </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html><head><title>Pick List – ${group.orderNumber}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;padding:24px;color:#1a1a1a}
  h2{font-size:16px;margin-bottom:4px}
  .client{font-size:13px;font-weight:600;color:#374151;margin-bottom:8px}
  .meta{font-size:12px;color:#666;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{border:1px solid #d1d5db;padding:6px 10px;text-align:left}
  th{background:#f3f4f6;font-weight:700;text-transform:uppercase;font-size:11px;letter-spacing:.5px}
  tr:nth-child(even){background:#fafafa}
  td.pickup-qty-cell{min-height:1.5em}
  .summary{margin-top:12px;font-size:11px;color:#555}
  @media print{body{padding:12px}button{display:none!important}}
</style>
</head><body>
  <h2>Pick List – ${group.orderNumber}</h2>
  ${clientBlock}
  <div class="meta">${group.totalItems} items &middot; Total Qty: ${group.totalQuantity} &middot; Picked: ${group.totalPickupQuantity}</div>
  <table>
    <thead><tr><th>SKU Code</th><th>Style Code</th><th>Color</th><th>Size</th><th style="text-align:center">Qty</th><th style="text-align:center">Pickup Qty</th></tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  <div class="summary">Printed on ${new Date().toLocaleString()}</div>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
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

function ItemRow({
  item,
  index,
  orderNumber,
  onSave,
  onDeleteItem,
}: {
  item: PickListOrderItem;
  index: number;
  orderNumber: string;
  onSave: (itemId: string, pickupQty: number) => void;
  onDeleteItem?: (itemId: string) => Promise<void>;
}) {
  const [qty, setQty] = useState<number>(item.pickupQuantity);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dirty = qty !== item.pickupQuantity;
  const disabled = item.status === "picked";

  const handleSave = async () => {
    if (disabled || !dirty) return;
    setSaving(true);
    try {
      onSave(item.id, qty);
    } finally {
      setSaving(false);
    }
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
    <tr className="hover:bg-gray-50/50 transition-colors group">
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
        <span className="text-[12px] font-bold text-gray-900">
          {typeof item.availableStock === "number" ? item.availableStock : "—"}
        </span>
      </td>
      <td className="px-2 py-2 border border-gray-200 w-28">
        <input
          type="number"
          min={0}
          max={item.quantity}
          value={qty}
          disabled={disabled}
          onChange={(e) => setQty(Math.max(0, Number(e.target.value)))}
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
            onClick={handleSave}
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
  );
}

function OrderGroupRow({
  group,
  index,
  onSave,
  onSetPickerName,
  onDeleteItem,
  onDeleteOrder,
}: {
  group: PickListOrderGroup;
  index: number;
  onSave: (itemId: string, pickupQty: number) => void;
  onSetPickerName?: (orderId: string, pickerName: string) => Promise<void>;
  onDeleteItem?: (itemId: string) => Promise<void>;
  onDeleteOrder?: (orderId: string, orderNumber: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerNameDraft, setPickerNameDraft] = useState(group.pickerName ?? "");
  const [pickerSaving, setPickerSaving] = useState(false);

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
        onClick={() => setExpanded(!expanded)}
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
        </td>
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
        <td className="px-2 py-2.5 border border-gray-200 text-center w-20">
          <span className="text-[11px] font-bold text-gray-800">{group.totalQuantity}</span>
        </td>
        <td className="px-2 py-2.5 border border-gray-200 text-center w-24">
          <span className="text-[11px] font-bold text-gray-400">—</span>
        </td>
        <td className="px-2 py-2.5 border border-gray-200 text-center w-28">
          <span className="text-[11px] font-bold text-gray-800">{group.totalPickupQuantity}</span>
        </td>
        <td className="px-2 py-2.5 border border-gray-200 text-center w-24">
          {statusBadge(group.overallStatus)}
        </td>
        <td className="px-2 py-2.5 border border-gray-200 text-center min-w-[7.5rem]">
          <div className="flex items-center justify-center gap-1 flex-wrap">
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
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
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
        </td>
      </tr>

      {expanded && group.items.map((item, idx) => (
        <ItemRow
          key={item.id}
          item={item}
          index={idx}
          orderNumber={group.orderNumber}
          onSave={onSave}
          onDeleteItem={onDeleteItem}
        />
      ))}
    </>
  );
}

export default function PickTable({
  orderGroups,
  onSave,
  onSetPickerName,
  onDeleteItem,
  onDeleteOrder,
}: {
  orderGroups: PickListOrderGroup[];
  onSave: (itemId: string, pickupQty: number) => void;
  onSetPickerName?: (orderId: string, pickerName: string) => Promise<void>;
  onDeleteItem?: (itemId: string) => Promise<void>;
  onDeleteOrder?: (orderId: string, orderNumber: string) => Promise<void>;
}) {
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
      <table className="w-full border-collapse border border-gray-200 min-w-[820px]">
        <thead>
          <tr className="bg-gray-50/30">
            <th className="px-2 py-2.5 text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 text-center w-10">
              #
            </th>
            <th className="px-2 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
              Order No
            </th>
            <th className="px-2 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
              SKU Code
            </th>
            <th className="px-2 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
              Style Code
            </th>
            <th className="px-2 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
              Color
            </th>
            <th className="px-2 py-2.5 text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 text-center w-20">
              Qty
            </th>
            <th className="px-2 py-2.5 text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 text-center w-24">
              Stock
            </th>
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
              onSave={onSave}
              onSetPickerName={onSetPickerName}
              onDeleteItem={onDeleteItem}
              onDeleteOrder={onDeleteOrder}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
