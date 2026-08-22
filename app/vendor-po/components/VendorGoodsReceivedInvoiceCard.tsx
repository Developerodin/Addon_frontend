"use client";

import React from "react";
import type { VendorPackListEntry, VendorPurchaseOrderItem } from "@/shared/services/vendorPurchaseOrderService";
import { getPoLineItemId, vendorCodeFromPoLineItem, dashOr } from "./vendorPacklistHelpers";
import {
  type VendorLotDraft,
  packlistLabel,
  totalBoxesForDraft,
  visiblePoItemsForDraft,
} from "./vendorGoodsReceivedModalHelpers";

const lotInputCls =
  "mt-0.5 w-full px-2 py-1.5 text-xs border border-gray-500 rounded bg-white text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-600";
const lotQtyInputCls =
  "w-full px-1.5 py-1 text-right text-xs border border-gray-500 rounded bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-600";

export interface VendorGoodsReceivedInvoiceCardProps {
  lot: VendorLotDraft;
  lotIndex: number;
  lotsCount: number;
  poItems: VendorPurchaseOrderItem[];
  packlists: VendorPackListEntry[];
  orderedMap: Record<string, number>;
  onLotNumberChange: (value: string) => void;
  onRemove: () => void;
  onLineQty: (lineId: string, value: number) => void;
  onLineBoxes: (lineId: string, value: number) => void;
  onPacklistChange: (packlistIndex: number) => void;
}

/**
 * One goods-received invoice: packlist-scoped article rows, qty, and boxes.
 */
export function VendorGoodsReceivedInvoiceCard({
  lot,
  lotIndex,
  lotsCount,
  poItems,
  packlists,
  orderedMap,
  onLotNumberChange,
  onRemove,
  onLineQty,
  onLineBoxes,
  onPacklistChange,
}: VendorGoodsReceivedInvoiceCardProps) {
  const isReadOnly = !!lot.isExisting;
  const visibleItems = visiblePoItemsForDraft(lot, poItems, packlists);
  const packlist =
    lot.packlistIndex != null ? packlists[lot.packlistIndex] : undefined;
  const showPacklistSelect = !isReadOnly && packlists.length > 1;

  return (
    <div
      className={`border rounded-lg p-3 space-y-3 shadow-sm ${
        isReadOnly ? "border-gray-300 bg-gray-50/60" : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-gray-800">Invoice {lotIndex + 1}</span>
          {isReadOnly && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-green-100 text-green-700 border border-green-200">
              <i className="ri-lock-line text-[9px]" /> Saved
            </span>
          )}
          {lot.packlistIndex != null && !showPacklistSelect && (
            <span className="text-[10px] text-gray-500">
              Packlist: {packlistLabel(packlist, lot.packlistIndex)}
            </span>
          )}
        </div>
        {lotsCount > 1 && !isReadOnly && (
          <button
            type="button"
            onClick={onRemove}
            className="text-[10px] font-bold text-red-600 hover:underline"
          >
            Remove
          </button>
        )}
      </div>

      {showPacklistSelect && (
        <div>
          <label htmlFor={`gr-packlist-${lotIndex}`} className="text-[10px] font-medium text-gray-600">
            Packlist
          </label>
          <select
            id={`gr-packlist-${lotIndex}`}
            aria-label="Packlist for this invoice"
            className={lotInputCls}
            value={lot.packlistIndex ?? 0}
            onChange={(e) => onPacklistChange(Number(e.target.value))}
          >
            {packlists.map((p, i) => (
              <option key={i} value={i}>
                {packlistLabel(p, i)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-medium text-gray-600">
            Invoice number {isReadOnly ? "" : "*"}
          </label>
          {isReadOnly ? (
            <div className="mt-0.5 px-2 py-1.5 text-xs text-gray-700 bg-gray-100 border border-gray-200 rounded">
              {lot.lotNumber || "—"}
            </div>
          ) : (
            <input
              className={lotInputCls}
              value={lot.lotNumber}
              onChange={(e) => onLotNumberChange(e.target.value)}
              placeholder="e.g. INV-001"
              aria-label={`Invoice ${lotIndex + 1} number`}
            />
          )}
        </div>
        <div>
          <label className="text-[10px] font-medium text-gray-600">Total boxes (auto)</label>
          <div className="mt-0.5 px-2 py-1.5 text-xs text-gray-700 bg-gray-100 border border-gray-200 rounded text-right">
            {totalBoxesForDraft(lot)}
          </div>
          <p className="text-[9px] text-gray-400 mt-0.5">Sum of per-article boxes below</p>
        </div>
      </div>

      <div className="border border-gray-100 rounded overflow-hidden">
        <table className="min-w-full text-[10px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2 text-left font-bold text-gray-600">Article</th>
              <th className="px-2 py-2 text-left font-bold text-gray-600">Vendor code</th>
              <th className="px-2 py-2 text-left font-bold text-gray-600">Type</th>
              <th className="px-2 py-2 text-left font-bold text-gray-600">Color</th>
              <th className="px-2 py-2 text-left font-bold text-gray-600">Pattern</th>
              {!isReadOnly && <th className="px-2 py-2 text-right">Ordered</th>}
              <th className="px-2 py-2 text-right w-[88px]">Qty</th>
              <th className="px-2 py-2 text-right w-[88px]">Boxes</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((it) => {
              const id = getPoLineItemId(it);
              if (!id) return null;
              const ordered = orderedMap[id] ?? 0;
              const v = lot.lineQty[id] ?? 0;
              const boxV = lot.lineBoxes[id] ?? 0;
              const overReceived = v > ordered;
              return (
                <tr key={`${lotIndex}-${id}`} className="border-t border-gray-100">
                  <td className="px-2 py-2 text-gray-900">{it.productName || "—"}</td>
                  <td className="px-2 py-2 text-gray-700">{vendorCodeFromPoLineItem(it) || "no vendor code"}</td>
                  <td className="px-2 py-2 text-gray-700">{dashOr(it.type)}</td>
                  <td className="px-2 py-2 text-gray-700">{dashOr(it.color)}</td>
                  <td className="px-2 py-2 text-gray-700">{dashOr(it.pattern)}</td>
                  {!isReadOnly && <td className="px-2 py-2 text-right text-gray-500">{ordered}</td>}
                  <td className="px-2 py-2">
                    {isReadOnly ? (
                      <div className="text-right text-xs text-gray-700">{v || "—"}</div>
                    ) : (
                      <input
                        type="number"
                        min={0}
                        className={`${lotQtyInputCls} ${overReceived ? "border-amber-400 bg-amber-50 text-amber-800" : ""}`}
                        value={v === 0 ? "" : v}
                        title={overReceived ? `Over-received: ${v} vs ordered ${ordered}` : undefined}
                        aria-label={`Received qty for ${it.productName || id}`}
                        onChange={(e) => {
                          const raw = e.target.value;
                          onLineQty(id, raw === "" ? 0 : Number(raw));
                        }}
                      />
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {/* Boxes stay editable even on saved invoices so per-article
                        counts can be corrected, then re-synced on the process page. */}
                    <input
                      type="number"
                      min={0}
                      className={lotQtyInputCls}
                      value={boxV === 0 ? "" : boxV}
                      aria-label={`Boxes for ${it.productName || id}`}
                      onChange={(e) => {
                        const raw = e.target.value;
                        onLineBoxes(id, raw === "" ? 0 : Number(raw));
                      }}
                    />
                    {isReadOnly && v > 0 && boxV < 1 && (
                      <p className="text-[9px] text-amber-600 mt-0.5 text-right">set boxes</p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
