"use client";

import React, { useState } from "react";
import type { PickItem } from "../types";

function statusBadge(status: PickItem["status"]) {
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

function PickRow({
  item,
  index,
  onSave,
}: {
  item: PickItem;
  index: number;
  onSave: (itemId: string, pickupQty: number) => void;
}) {
  const [qty, setQty] = useState<number>(item.pickedQty);
  const [saving, setSaving] = useState(false);

  const dirty = qty !== item.pickedQty;
  const disabled = item.status === "verified" || item.status === "skipped";

  const handleSave = async () => {
    if (disabled || !dirty) return;
    setSaving(true);
    try {
      onSave(item.id, qty);
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="hover:bg-gray-50/50 transition-colors group">
      <td className="px-2 py-2 text-[11px] font-medium text-gray-500 border border-gray-200 text-center w-10">
        {index + 1}
      </td>
      <td className="px-2 py-2 text-[11px] font-bold text-purple-700 border border-gray-200 whitespace-nowrap">
        {item.orderNumber || "—"}
      </td>
      <td className="px-2 py-2 text-[12px] font-bold text-gray-900 border border-gray-200 whitespace-nowrap">
        {item.sku}
      </td>
      <td className="px-2 py-2 text-[11px] font-medium text-gray-600 border border-gray-200 whitespace-nowrap">
        {item.styleCode || item.sku}
      </td>
      <td className="px-2 py-2 text-[11px] font-medium text-gray-700 border border-gray-200 whitespace-nowrap">
        {item.shade || "—"}
      </td>
      <td className="px-2 py-2 text-[12px] font-bold text-gray-900 border border-gray-200 text-center w-20">
        {item.requiredQty}
      </td>
      <td className="px-2 py-2 border border-gray-200 w-28">
        <input
          type="number"
          min={0}
          max={item.requiredQty}
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
      <td className="px-2 py-2 border border-gray-200 text-center w-24">
        <button
          type="button"
          disabled={disabled || !dirty || saving}
          onClick={handleSave}
          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wide transition-colors shadow-sm
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
      </td>
    </tr>
  );
}

export default function PickTable({
  items,
  onSave,
}: {
  items: PickItem[];
  onSave: (itemId: string, pickupQty: number) => void;
}) {
  if (items.length === 0) {
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
              Shade
            </th>
            <th className="px-2 py-2.5 text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 text-center w-20">
              Qty
            </th>
            <th className="px-2 py-2.5 text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 text-center w-28">
              Pickup Qty
            </th>
            <th className="px-2 py-2.5 text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 text-center w-24">
              Status
            </th>
            <th className="px-2 py-2.5 text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 text-center w-24">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <PickRow key={item.id} item={item} index={idx} onSave={onSave} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
