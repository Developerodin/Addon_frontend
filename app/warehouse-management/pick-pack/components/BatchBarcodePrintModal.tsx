"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { PickListBatchBarcodeLabel } from "@/shared/services/whmsPickListBatchService";
import BatchBarcodeStyleSelector from "./BatchBarcodeStyleSelector";

import type { BatchBarcodeStyleOption } from "./batchBarcodeStyleListUtils";

export type BarcodePrintMode = "all" | "custom";

export type { BatchBarcodeStyleOption };

type PrintScope = "single" | "all";

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
  const [printScope, setPrintScope] = useState<PrintScope>("single");
  const [selectedStyleCode, setSelectedStyleCode] = useState<string>("");

  const selectableStyles = useMemo(
    () => styleOptions.filter((item) => Number(item.pickedQty) > 0),
    [styleOptions],
  );

  const isMultiStyleMode = allowStyleSelection && !initialStyleCode;
  const isSingleStyleLocked = Boolean(initialStyleCode);

  const resolvedStyleCode = useMemo(() => {
    if (isSingleStyleLocked) return initialStyleCode;
    if (!isMultiStyleMode) return initialStyleCode;
    return printScope === "single" ? selectedStyleCode || undefined : undefined;
  }, [initialStyleCode, isMultiStyleMode, isSingleStyleLocked, printScope, selectedStyleCode]);

  const batchTotalQty = useMemo(
    () => selectableStyles.reduce((sum, item) => sum + Number(item.pickedQty || 0), 0),
    [selectableStyles],
  );

  const resolvedMaxQty = useMemo(() => {
    if (resolvedStyleCode) {
      const item = selectableStyles.find((i) => i.styleCode === resolvedStyleCode);
      return Number(item?.pickedQty || 0);
    }
    return batchTotalQty;
  }, [resolvedStyleCode, selectableStyles, batchTotalQty]);

  const selectedStyle = useMemo(
    () => (resolvedStyleCode ? selectableStyles.find((i) => i.styleCode === resolvedStyleCode) : undefined),
    [resolvedStyleCode, selectableStyles],
  );

  const canUseCustomQty = Boolean(resolvedStyleCode);

  useEffect(() => {
    if (!open) return;
    setMode("all");
    setPrintScope("single");
    setSelectedStyleCode(initialStyleCode ?? selectableStyles[0]?.styleCode ?? "");
    setCustomQty(Math.max(1, initialStyleCode
      ? Number(selectableStyles.find((i) => i.styleCode === initialStyleCode)?.pickedQty || maxQty || 1)
      : Number(selectableStyles[0]?.pickedQty || 1)));
  }, [open, initialStyleCode, maxQty, selectableStyles]);

  useEffect(() => {
    if (mode === "all") return;
    setCustomQty((prev) => Math.max(1, Math.min(prev, resolvedMaxQty || 1)));
  }, [resolvedMaxQty, mode]);

  useEffect(() => {
    if (canUseCustomQty || mode !== "custom") return;
    setMode("all");
  }, [canUseCustomQty, mode]);

  const effectiveQty = useMemo(() => {
    if (mode === "all") return resolvedMaxQty;
    return Math.max(1, Math.min(resolvedMaxQty || 1, Number(customQty) || 1));
  }, [mode, resolvedMaxQty, customQty]);

  const summaryText = useMemo(() => {
    if (resolvedStyleCode && selectedStyle) {
      return `${effectiveQty} label${effectiveQty === 1 ? "" : "s"} for ${resolvedStyleCode}`;
    }
    return `${effectiveQty} label${effectiveQty === 1 ? "" : "s"} for all ${selectableStyles.length} styles`;
  }, [effectiveQty, resolvedStyleCode, selectedStyle, selectableStyles.length]);

  if (!open) return null;

  const handleConfirm = () => {
    if (isMultiStyleMode && printScope === "single" && !selectedStyleCode) return;
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

        <div className="px-4 py-4 space-y-4 text-[12px] text-gray-600">
          <p className="text-[11px] text-gray-500">
            Batch <strong className="text-gray-800">{batchNumber}</strong>
          </p>

          {isSingleStyleLocked && initialStyleCode ? (
            <div className="rounded-lg border border-purple-200 bg-purple-50/50 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase text-purple-700 mb-0.5">Style code</p>
              <p className="font-semibold text-gray-900">{initialStyleCode}</p>
              {selectedStyle ? (
                <p className="text-[11px] text-gray-600 mt-0.5">
                  {selectedStyle.size || selectedStyle.shade
                    ? [selectedStyle.size, selectedStyle.shade].filter(Boolean).join(" · ")
                    : null}
                  {selectedStyle.size || selectedStyle.shade ? " · " : ""}
                  Picked <strong>{selectedStyle.pickedQty}</strong>
                </p>
              ) : null}
            </div>
          ) : null}

          {isMultiStyleMode ? (
            <fieldset className="space-y-2">
              <legend className="text-[11px] font-bold text-gray-700 uppercase mb-1">What to print</legend>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 has-[:checked]:border-purple-300 has-[:checked]:bg-purple-50/40">
                <input
                  type="radio"
                  name="barcode-print-scope"
                  checked={printScope === "single"}
                  onChange={() => setPrintScope("single")}
                  className="mt-0.5 text-purple-600"
                />
                <span>
                  <span className="block font-semibold text-gray-900">One style code</span>
                  <span className="text-[11px] text-gray-500">
                    Pick a style and print all or a custom number of labels for it
                  </span>
                </span>
              </label>

              {printScope === "single" ? (
                <div className="pl-1">
                  <BatchBarcodeStyleSelector
                    styles={selectableStyles}
                    selectedStyleCode={selectedStyleCode}
                    onSelectStyleCode={setSelectedStyleCode}
                  />
                </div>
              ) : null}

              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 has-[:checked]:border-purple-300 has-[:checked]:bg-purple-50/40">
                <input
                  type="radio"
                  name="barcode-print-scope"
                  checked={printScope === "all"}
                  onChange={() => setPrintScope("all")}
                  className="mt-0.5 text-purple-600"
                />
                <span>
                  <span className="block font-semibold text-gray-900">All styles in batch</span>
                  <span className="text-[11px] text-gray-500">
                    Print every picked label ({batchTotalQty} total across {selectableStyles.length}{" "}
                    style{selectableStyles.length === 1 ? "" : "s"})
                  </span>
                </span>
              </label>
            </fieldset>
          ) : null}

          {printScope === "all" && isMultiStyleMode ? (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Custom quantity is only available for a single style. Choose <strong>One style code</strong>{" "}
              above to print a specific number of labels.
            </p>
          ) : (
            <fieldset className="space-y-2">
              <legend className="text-[11px] font-bold text-gray-700 uppercase mb-1">How many labels</legend>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 has-[:checked]:border-purple-300 has-[:checked]:bg-purple-50/40">
                <input
                  type="radio"
                  name="barcode-print-mode"
                  checked={mode === "all"}
                  onChange={() => setMode("all")}
                  className="mt-0.5 text-purple-600"
                />
                <span>
                  <span className="block font-semibold text-gray-900">All picked labels</span>
                  <span className="text-[11px] text-gray-500">
                    Print {resolvedMaxQty} label{resolvedMaxQty === 1 ? "" : "s"}
                    {resolvedStyleCode ? ` for ${resolvedStyleCode}` : " for the entire batch"}
                  </span>
                </span>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-lg border border-gray-200 ${
                  canUseCustomQty ? "cursor-pointer hover:bg-gray-50 has-[:checked]:border-purple-300 has-[:checked]:bg-purple-50/40" : "opacity-50 cursor-not-allowed bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="barcode-print-mode"
                  checked={mode === "custom"}
                  onChange={() => canUseCustomQty && setMode("custom")}
                  disabled={!canUseCustomQty}
                  className="mt-0.5 text-purple-600"
                />
                <span className="flex-1">
                  <span className="block font-semibold text-gray-900">Custom quantity</span>
                  <span className="text-[11px] text-gray-500 block mb-2">
                    {canUseCustomQty
                      ? `Enter 1–${resolvedMaxQty} labels for ${resolvedStyleCode}`
                      : "Select one style code to use a custom quantity"}
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={resolvedMaxQty || 1}
                    value={customQty}
                    onChange={(e) => setCustomQty(Number(e.target.value))}
                    disabled={mode !== "custom" || !canUseCustomQty}
                    className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm disabled:opacity-40"
                    aria-label="Number of barcode labels to print"
                  />
                </span>
              </label>
            </fieldset>
          )}

          <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase text-gray-500 mb-0.5">Ready to print</p>
            <p className="font-semibold text-gray-900">{summaryText}</p>
          </div>
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
            disabled={
              busy ||
              resolvedMaxQty <= 0 ||
              (isMultiStyleMode && printScope === "single" && !selectedStyleCode)
            }
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
