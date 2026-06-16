"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  createVendorDispatchTransferNote,
  previewVendorDispatchTransferNote,
  type VendorDispatchTransferNoteLine,
  type VendorTransferNotePrintFilters,
} from "../vendorTransferNoteService";
import {
  printDispatchTransferNote,
  formatTransferNoteLineBrand,
} from "@/app/production/floor-supervisor/dispatch/transferNotePrint.util";

export interface VendorTransferNotePrintModalProps {
  open: boolean;
  onClose: () => void;
  printFilters: VendorTransferNotePrintFilters;
  onCreated?: () => void;
}

/**
 * Modal to preview pending vendor dispatch transfer lines, create an STN, and print.
 */
export function VendorTransferNotePrintModal({
  open,
  onClose,
  printFilters,
  onCreated,
}: VendorTransferNotePrintModalProps) {
  const [categoryLabel, setCategoryLabel] = useState("CORE & COLLECTION MIX");
  const [previewLines, setPreviewLines] = useState<VendorDispatchTransferNoteLine[]>([]);
  const [previewTotalQty, setPreviewTotalQty] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadPreview = useCallback(async () => {
    setLoadingPreview(true);
    try {
      const data = await previewVendorDispatchTransferNote(printFilters);
      setPreviewLines(data.lines ?? []);
      setPreviewTotalQty(data.totalQty ?? 0);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to load preview");
      setPreviewLines([]);
      setPreviewTotalQty(0);
    } finally {
      setLoadingPreview(false);
    }
  }, [printFilters]);

  useEffect(() => {
    if (!open) return;
    setCategoryLabel("CORE & COLLECTION MIX");
    void loadPreview();
  }, [open, loadPreview]);

  const handleConfirmPrint = async () => {
    if (previewLines.length === 0) {
      toast.error("No pending quantity to print");
      return;
    }
    setSubmitting(true);
    try {
      const note = await createVendorDispatchTransferNote(categoryLabel, printFilters);
      await printDispatchTransferNote(note);
      toast.success(`Transfer note ${note.stnSerial} created`);
      onCreated?.();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to create transfer note");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vendor-transfer-note-print-title"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50 shrink-0">
          <h3 id="vendor-transfer-note-print-title" className="text-sm font-semibold text-gray-800">
            <i className="ri-printer-line mr-1.5" aria-hidden />
            Print Vendor Stock Transfer Note
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close print modal"
          >
            <i className="ri-close-line text-lg" aria-hidden />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          <div>
            <label htmlFor="vendor-stn-category-label" className="block text-xs font-semibold text-gray-600 mb-1.5">
              Category Label
            </label>
            <input
              id="vendor-stn-category-label"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
              placeholder="e.g. CORE, COLLECTION MIX, CORE & COLLECTION MIX"
              value={categoryLabel}
              onChange={(e) => setCategoryLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !submitting) void handleConfirmPrint();
              }}
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Creating a transfer note locks this quantity until warehouse inward accept.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-gray-700">Pending lines preview</h4>
              <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                Total qty: {previewTotalQty}
              </span>
            </div>

            {loadingPreview ? (
              <div className="flex items-center justify-center py-8 text-gray-500 text-xs gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
                Loading preview…
              </div>
            ) : previewLines.length === 0 ? (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                No print-eligible pending quantity. Stage goods to warehouse first, or prior STNs may have
                allocated all pending qty.
              </p>
            ) : (
              <div className="border border-gray-200 rounded overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-[11px]">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1.5 font-semibold text-gray-600">VPO</th>
                      <th className="text-left px-2 py-1.5 font-semibold text-gray-600">Article No</th>
                      <th className="text-left px-2 py-1.5 font-semibold text-gray-600">Brand</th>
                      <th className="text-left px-2 py-1.5 font-semibold text-gray-600">Article Name</th>
                      <th className="text-right px-2 py-1.5 font-semibold text-gray-600">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewLines.map((row, idx) => (
                      <tr
                        key={`${row.articleNumber}-${row.brand ?? row.sapArticleNo}-${idx}`}
                        className="border-t border-gray-100"
                      >
                        <td className="px-2 py-1.5">{row.vpoNumber || "—"}</td>
                        <td className="px-2 py-1.5">{row.articleNumber}</td>
                        <td className="px-2 py-1.5">{formatTransferNoteLineBrand(row)}</td>
                        <td className="px-2 py-1.5 truncate max-w-[140px]">{row.articleName}</td>
                        <td className="px-2 py-1.5 text-right font-medium">{row.qtyInPairs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t bg-gray-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-1.5 text-xs font-semibold text-gray-600 border border-gray-300 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirmPrint()}
            disabled={submitting || loadingPreview || previewLines.length === 0}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-600 rounded hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {submitting ? (
              <span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
            ) : (
              <i className="ri-printer-line" aria-hidden />
            )}
            Create &amp; Print
          </button>
        </div>
      </div>
    </div>
  );
}
