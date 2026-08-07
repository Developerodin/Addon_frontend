"use client";

import React, { useRef } from "react";
import Link from "next/link";
import type {
  PickListBatchDetail,
  PickListBatchItem,
} from "@/shared/services/whmsPickListBatchService";
import { getMaxPickableByStock } from "./batchPickStockUtils";

function itemStatusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    partial: "bg-orange-50 text-orange-700 border-orange-200",
    picked: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  const cls = map[status] || map.pending;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded border text-[9px] font-bold uppercase ${cls}`}>
      {status}
    </span>
  );
}

export interface BatchPickListPanelProps {
  batch: PickListBatchDetail;
  isEditable: boolean;
  draftPicks: Record<string, number>;
  pickErrors: Record<string, string>;
  expandedKey: string | null;
  setExpandedKey: (key: string | null) => void;
  printedQtyByStyle: Map<string, number>;
  busy: boolean;
  savingPicks: boolean;
  totalPicked: number;
  hasUnsavedPicks: boolean;
  canPrintPickList: boolean;
  pickerName: string;
  hasUnsavedPickerName: boolean;
  onPickChange: (itemKey: string, rawValue: string, maxStock: number, styleCode: string) => void;
  onSavePicks: () => void;
  onSavePicker: () => void;
  onPickerNameChange: (value: string) => void;
  onSendToScanning: () => void;
  onOpenBarcodeModal: (styleCode?: string) => void;
  onPrintPickList: () => void;
}

/**
 * Pick list table and batch actions for the picking tab.
 */
export default function BatchPickListPanel({
  batch,
  isEditable,
  draftPicks,
  pickErrors,
  expandedKey,
  setExpandedKey,
  printedQtyByStyle,
  busy,
  savingPicks,
  totalPicked,
  hasUnsavedPicks,
  canPrintPickList,
  pickerName,
  hasUnsavedPickerName,
  onPickChange,
  onSavePicks,
  onSavePicker,
  onPickerNameChange,
  onSendToScanning,
  onOpenBarcodeModal,
  onPrintPickList,
}: BatchPickListPanelProps) {
  const pickInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  /**
   * Focus the next editable picked-quantity input after Enter.
   */
  const focusNextPickInput = (currentIndex: number) => {
    for (let i = currentIndex + 1; i < pickInputRefs.current.length; i++) {
      const nextInput = pickInputRefs.current[i];
      if (nextInput && !nextInput.disabled) {
        nextInput.focus();
        nextInput.select();
        return;
      }
    }
  };

  const renderAllocationBreakdown = (item: PickListBatchItem) => (
    <ul className="text-[11px] text-gray-600 space-y-0.5 mt-2 pl-2 border-l-2 border-purple-100">
      {(item.allocations || []).map((a) => (
        <li key={`${a.orderId}-${a.pickListId}`}>
          <span className="font-semibold text-gray-800">{a.orderNumber || a.orderId}</span>: req{" "}
          {a.requiredQty}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-4">
      {isEditable && (
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-gray-100">
          <button
            type="button"
            onClick={() => void onSavePicks()}
            disabled={busy || !hasUnsavedPicks || savingPicks}
            className="px-4 py-2 bg-emerald-600 text-white text-[11px] font-bold rounded hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5 min-w-[100px] justify-center"
          >
            {savingPicks ? (
              <>
                <i className="ri-loader-4-line animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              "Save Picks"
            )}
          </button>
          <button
            type="button"
            onClick={() => onOpenBarcodeModal()}
            disabled={busy || totalPicked <= 0 || hasUnsavedPicks}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-800 text-[11px] font-bold rounded hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1.5"
            title={hasUnsavedPicks ? "Save picks first" : undefined}
          >
            <i className="ri-barcode-line" aria-hidden />
            Print Barcodes
          </button>
          <button
            type="button"
            onClick={onPrintPickList}
            disabled={busy || !canPrintPickList}
            title={!canPrintPickList ? "Save picker name first" : undefined}
            className="px-4 py-2 bg-purple-50 border border-purple-200 text-purple-700 text-[11px] font-bold rounded hover:bg-purple-100 disabled:opacity-40 flex items-center gap-1.5"
            aria-label="Print pick list for warehouse"
          >
            <i className="ri-printer-line" aria-hidden />
            Print Pick List
          </button>
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <label htmlFor="picker-name" className="sr-only">
              Picker name
            </label>
            <input
              id="picker-name"
              type="text"
              value={pickerName}
              onChange={(e) => onPickerNameChange(e.target.value)}
              placeholder="Picker name"
              className="border border-gray-200 rounded px-3 py-1.5 text-sm min-w-[140px] h-[34px]"
            />
            <button
              type="button"
              onClick={() => void onSavePicker()}
              disabled={busy || !pickerName.trim() || !hasUnsavedPickerName}
              className="px-3 py-1.5 text-[11px] font-bold border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 h-[34px]"
            >
              Save picker
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full min-w-[800px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-600 uppercase">Style code</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-600 uppercase">Size / Shade</th>
              <th className="px-3 py-2 text-right text-[11px] font-bold text-gray-600 uppercase">Required</th>
              <th className="px-3 py-2 text-right text-[11px] font-bold text-gray-600 uppercase">Stock</th>
              <th className="px-3 py-2 text-right text-[11px] font-bold text-gray-600 uppercase">Picked</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-600 uppercase">Status</th>
              {isEditable && (
                <th className="px-3 py-2 text-right text-[11px] font-bold text-gray-600 uppercase">Print</th>
              )}
            </tr>
          </thead>
          <tbody>
            {(batch.items || []).map((item, itemIndex) => {
              const picked = draftPicks[item.itemKey] ?? item.pickedQty;
              const isExpanded = expandedKey === item.itemKey;
              const maxPickable = getMaxPickableByStock(item, batch.items || [], draftPicks);
              const noStock = maxPickable <= 0;
              const status =
                picked <= 0 ? "pending" : picked < item.requiredQty ? "partial" : "picked";
              return (
                <React.Fragment key={item.itemKey}>
                  <tr
                    className="border-t border-gray-100 hover:bg-gray-50/50 cursor-pointer"
                    onClick={() => setExpandedKey(isExpanded ? null : item.itemKey)}
                  >
                    <td className="px-3 py-2.5 font-semibold text-gray-900">
                      <div className="flex flex-col gap-0.5">
                        <span>{item.styleCode}</span>
                        {printedQtyByStyle.get(item.styleCode) ? (
                          <span className="text-[10px] font-semibold text-indigo-600">
                            {printedQtyByStyle.get(item.styleCode)} barcode
                            {printedQtyByStyle.get(item.styleCode) === 1 ? "" : "s"} printed
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-gray-600">
                      {[item.size, item.shade].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium">{item.requiredQty}</td>
                    <td className="px-3 py-2.5 text-right text-gray-500">
                      <span
                        className={noStock ? "font-semibold text-red-600" : undefined}
                        title={noStock ? "No warehouse stock for this style code" : undefined}
                      >
                        {item.availableStock ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      {isEditable ? (
                        <div className="inline-flex flex-col items-end gap-0.5">
                          <input
                            ref={(el) => {
                              pickInputRefs.current[itemIndex] = el;
                            }}
                            type="number"
                            min={0}
                            max={maxPickable}
                            step={1}
                            value={picked}
                            disabled={noStock}
                            onChange={(e) =>
                              onPickChange(item.itemKey, e.target.value, maxPickable, item.styleCode)
                            }
                            onBlur={(e) =>
                              onPickChange(item.itemKey, e.target.value, maxPickable, item.styleCode)
                            }
                            onKeyDown={(e) => {
                              if (e.key !== "Enter") return;
                              e.preventDefault();
                              onPickChange(
                                item.itemKey,
                                e.currentTarget.value,
                                maxPickable,
                                item.styleCode,
                              );
                              focusNextPickInput(itemIndex);
                            }}
                            className={`w-20 border rounded px-2 py-1 text-right text-sm ${
                              noStock
                                ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
                                : pickErrors[item.itemKey]
                                  ? "border-red-400 bg-red-50 focus:ring-red-300"
                                  : "border-gray-200"
                            }`}
                            aria-label={`Picked quantity for ${item.styleCode}`}
                            aria-invalid={Boolean(pickErrors[item.itemKey])}
                            aria-describedby={
                              pickErrors[item.itemKey]
                                ? `pick-error-${item.itemKey}`
                                : noStock
                                  ? `pick-no-stock-${item.itemKey}`
                                  : undefined
                            }
                          />
                          {noStock ? (
                            <span
                              id={`pick-no-stock-${item.itemKey}`}
                              className="text-[10px] font-semibold text-red-600 max-w-[120px] text-right"
                            >
                              No stock
                            </span>
                          ) : pickErrors[item.itemKey] ? (
                            <span
                              id={`pick-error-${item.itemKey}`}
                              className="text-[10px] font-semibold text-red-600 max-w-[120px] text-right"
                            >
                              {pickErrors[item.itemKey]}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400">Max {maxPickable}</span>
                          )}
                        </div>
                      ) : (
                        <span className="font-medium">{item.pickedQty}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">{itemStatusBadge(status)}</td>
                    {isEditable && (
                      <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          disabled={noStock || picked <= 0 || busy || hasUnsavedPicks}
                          onClick={() => onOpenBarcodeModal(item.styleCode)}
                          className="text-[11px] font-bold text-purple-600 hover:text-purple-800 disabled:opacity-40"
                          title={hasUnsavedPicks ? "Save picks first" : undefined}
                        >
                          Print
                        </button>
                      </td>
                    )}
                  </tr>
                  {isExpanded && batch.type === "combined" && (
                    <tr className="bg-purple-50/30">
                      <td colSpan={isEditable ? 7 : 6} className="px-3 py-2">
                        {renderAllocationBreakdown(item)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {!isEditable && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onPrintPickList}
            className="px-4 py-2 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 flex items-center gap-1.5"
            aria-label="Reprint pick list"
          >
            <i className="ri-printer-line" aria-hidden />
            Print Pick List
          </button>
        </div>
      )}

      {batch.status === "sent-to-scanning" && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 text-sm text-indigo-900">
          This pick list has been sent to scanning.{" "}
          <Link href="/warehouse-management/scanning" className="font-bold underline">
            Open scanning queue
          </Link>
        </div>
      )}
    </div>
  );
}
