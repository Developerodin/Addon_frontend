"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { PickListBatchBarcodeLabel } from "@/shared/services/whmsPickListBatchService";
import BatchBarcodeStyleSelector from "./BatchBarcodeStyleSelector";

import type { BatchBarcodeStyleOption } from "./batchBarcodeStyleListUtils";

export type BarcodePrintMode = "all" | "custom";

export type { BatchBarcodeStyleOption };

export interface BatchBarcodePrintModalProps {
  open: boolean;
  batchNumber: string;
  /** When set, printing is scoped to one style code. */
  styleCode?: string;
  /** Batch items available for style selection (picked qty > 0). */
  styleOptions?: BatchBarcodeStyleOption[];
  /** Allow picking a specific style from the batch when opened without a preset style. */
  allowStyleSelection?: boolean;
  /** Total picked qty available for this print scope. */
  maxQty: number;
  busy?: boolean;
  onClose: () => void;
  /** Called with mode, optional custom count, and resolved style code (undefined = all). */
  onConfirm: (
    mode: BarcodePrintMode,
    customQty?: number,
    selectedStyleCode?: string,
  ) => void | Promise<void>;
}

/**
 * Modal to choose style scope, print-all barcodes, or a custom label count.
 */
export default function BatchBarcodePrintModal({
  open,
  batchNumber,
  styleCode: initialStyleCode,
  styleOptions = [],
  allowStyleSelection = false,
  maxQty,
  busy = false,
  onClose,
  onConfirm,
}: BatchBarcodePrintModalProps) {
  const [mode, setMode] = useState<BarcodePrintMode>("all");
  const [customQty, setCustomQty] = useState(1);
  const [selectedStyleCode, setSelectedStyleCode] = useState<string | undefined>(initialStyleCode);

  const selectableStyles = useMemo(
    () => styleOptions.filter((item) => Number(item.pickedQty) > 0),
    [styleOptions],
  );

  const resolvedStyleCode = allowStyleSelection ? selectedStyleCode : initialStyleCode;

  const resolvedMaxQty = useMemo(() => {
    if (resolvedStyleCode) {
      const item = selectableStyles.find((i) => i.styleCode === resolvedStyleCode);
      return Number(item?.pickedQty || 0);
    }
    return selectableStyles.reduce((sum, item) => sum + Number(item.pickedQty || 0), 0);
  }, [resolvedStyleCode, selectableStyles]);

  const scopeLabel = resolvedStyleCode ? `style ${resolvedStyleCode}` : "all styles";

  useEffect(() => {
    if (!open) return;
    setMode("all");
    setSelectedStyleCode(initialStyleCode);
    setCustomQty(Math.max(1, resolvedMaxQty || maxQty));
  }, [open, initialStyleCode, maxQty, resolvedMaxQty]);

  useEffect(() => {
    if (mode === "all") return;
    setCustomQty((prev) => Math.max(1, Math.min(prev, resolvedMaxQty || 1)));
  }, [resolvedMaxQty, mode]);

  const effectiveQty = useMemo(() => {
    if (mode === "all") return resolvedMaxQty;
    return Math.max(1, Math.min(9999, Number(customQty) || 1));
  }, [mode, resolvedMaxQty, customQty]);

  if (!open) return null;

  const handleConfirm = () => {
    void onConfirm(mode, mode === "custom" ? effectiveQty : undefined, resolvedStyleCode);
  };

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="barcode-print-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full border border-gray-200 max-h-[90vh] overflow-y-auto">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 id="barcode-print-title" className="text-sm font-bold text-gray-800">
            Print Barcodes
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500"
            aria-label="Close"
          >
            <i className="ri-close-line" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-3 text-[12px] text-gray-600">
          <p className="text-[11px] text-gray-500">
            Batch <strong className="text-gray-800">{batchNumber}</strong>
          </p>

          {allowStyleSelection && !initialStyleCode ? (
            <BatchBarcodeStyleSelector
              styles={selectableStyles}
              selectedStyleCode={selectedStyleCode}
              onSelectStyleCode={setSelectedStyleCode}
            />
          ) : null}

          {!allowStyleSelection && resolvedStyleCode ? (
            <p className="text-[11px] text-gray-500">
              Style <strong className="text-gray-800">{resolvedStyleCode}</strong>
            </p>
          ) : null}

          <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 has-[:checked]:border-purple-300 has-[:checked]:bg-purple-50/40">
            <input
              type="radio"
              name="barcode-print-mode"
              checked={mode === "all"}
              onChange={() => setMode("all")}
              className="mt-0.5 text-purple-600"
            />
            <span>
              <span className="block font-semibold text-gray-900">Print all barcodes</span>
              <span className="text-[11px] text-gray-500">
                Print {resolvedMaxQty} label{resolvedMaxQty === 1 ? "" : "s"} for {scopeLabel} (picked qty)
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 has-[:checked]:border-purple-300 has-[:checked]:bg-purple-50/40">
            <input
              type="radio"
              name="barcode-print-mode"
              checked={mode === "custom"}
              onChange={() => setMode("custom")}
              className="mt-0.5 text-purple-600"
            />
            <span className="flex-1">
              <span className="block font-semibold text-gray-900">Custom quantity</span>
              <span className="text-[11px] text-gray-500 block mb-2">
                Enter how many barcode labels to print
              </span>
              <input
                type="number"
                min={1}
                max={9999}
                value={customQty}
                onChange={(e) => setCustomQty(Number(e.target.value))}
                disabled={mode !== "custom"}
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm disabled:opacity-40"
                aria-label="Number of barcode labels to print"
              />
            </span>
          </label>

          <p className="text-[11px] text-gray-500 pt-1">
            Will print <strong className="text-gray-800">{effectiveQty}</strong> barcode label
            {effectiveQty === 1 ? "" : "s"}.
          </p>
        </div>

        <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-3 py-1.5 text-[11px] font-bold text-gray-600 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy || resolvedMaxQty <= 0}
            className="px-3 py-1.5 text-[11px] font-bold text-white bg-purple-600 rounded hover:bg-purple-700 disabled:opacity-40 flex items-center gap-1.5"
          >
            {busy ? (
              <>
                <i className="ri-loader-4-line animate-spin" aria-hidden /> Printing…
              </>
            ) : (
              <>
                <i className="ri-barcode-line" aria-hidden /> Print {effectiveQty} label
                {effectiveQty === 1 ? "" : "s"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Flatten label payloads into individual units, slice to count, regroup for printing.
 * @param labels - API label groups with quantities
 * @param count - Total labels to print
 */
export function buildLabelsForCount(
  labels: PickListBatchBarcodeLabel[],
  count: number,
): PickListBatchBarcodeLabel[] {
  const n = Math.max(0, Math.floor(count));
  if (!n || !labels.length) return [];

  const units: PickListBatchBarcodeLabel[] = [];
  for (const label of labels) {
    const qty = Math.max(0, Number(label.quantity || 0));
    for (let i = 0; i < qty; i += 1) units.push({ ...label, quantity: 1 });
  }
  if (!units.length) return [];

  const picked: PickListBatchBarcodeLabel[] = [];
  for (let i = 0; i < n; i += 1) {
    picked.push(units[i % units.length]);
  }

  const grouped = new Map<string, PickListBatchBarcodeLabel>();
  for (const unit of picked) {
    const key = [unit.barcode, unit.styleCode, unit.size, unit.shade].join("||");
    const existing = grouped.get(key);
    if (existing) existing.quantity += 1;
    else grouped.set(key, { ...unit, quantity: 1 });
  }
  return [...grouped.values()];
}

/**
 * Count total individual labels in a payload.
 * @param labels - Label groups with quantities
 */
export function countBarcodeLabels(labels: PickListBatchBarcodeLabel[]): number {
  return labels.reduce((sum, label) => sum + Math.max(0, Number(label.quantity || 0)), 0);
}
