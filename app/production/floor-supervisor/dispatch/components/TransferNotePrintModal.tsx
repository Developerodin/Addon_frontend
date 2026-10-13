"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import type { FloorOrderFilters } from "@/shared/services/productionService";
import {
  createDispatchTransferNote,
  fetchAlreadyPrintedNotes,
  fetchDispatchTransferNoteById,
  previewDispatchTransferNote,
  type AlreadyPrintedNote,
  type DispatchTransferNote,
  type DispatchTransferNoteLine,
} from "../transferNoteService";
import { formatTransferNoteLineBrand, printDispatchTransferNoteBatch } from "../transferNotePrint.util";
import { AlreadyPrintedLinesSection } from "./AlreadyPrintedLinesSection";

const REPRINT_PAGE_LIMIT = 20;

/**
 * Local calendar date for the reprint date inputs.
 */
function todayInputValue(): string {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export interface TransferNotePrintModalProps {
  open: boolean;
  onClose: () => void;
  /** Dispatch floor filters applied to pending print scope */
  printFilters: FloorOrderFilters;
  /** Called after a successful create + print */
  onCreated?: () => void;
}

/**
 * Modal to preview pending transfer lines, create an STN entry, and print.
 */
export function TransferNotePrintModal({
  open,
  onClose,
  printFilters,
  onCreated,
}: TransferNotePrintModalProps) {
  const [categoryLabel, setCategoryLabel] = useState("CORE & COLLECTION MIX");
  const [previewLines, setPreviewLines] = useState<DispatchTransferNoteLine[]>([]);
  const [previewTotalQty, setPreviewTotalQty] = useState(0);
  const [reprintNotes, setReprintNotes] = useState<AlreadyPrintedNote[]>([]);
  const [reprintStartDate, setReprintStartDate] = useState(todayInputValue);
  const [reprintEndDate, setReprintEndDate] = useState(todayInputValue);
  const [searchInput, setSearchInput] = useState("");
  const [reprintSearch, setReprintSearch] = useState("");
  const [reprintPage, setReprintPage] = useState(1);
  const [reprintTotalPages, setReprintTotalPages] = useState(1);
  const [reprintTotalResults, setReprintTotalResults] = useState(0);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(() => new Set());
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingReprint, setLoadingReprint] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadPreview = useCallback(async () => {
    setLoadingPreview(true);
    try {
      const data = await previewDispatchTransferNote(printFilters);
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

  const loadAlreadyPrinted = useCallback(async () => {
    setLoadingReprint(true);
    try {
      const data = await fetchAlreadyPrintedNotes({
        startDate: reprintStartDate,
        endDate: reprintEndDate,
        search: reprintSearch || undefined,
        page: reprintPage,
        limit: REPRINT_PAGE_LIMIT,
      });
      setReprintNotes(data.results ?? []);
      setReprintTotalPages(data.totalPages ?? 1);
      setReprintTotalResults(data.totalResults ?? 0);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to load already-printed notes");
      setReprintNotes([]);
      setReprintTotalPages(1);
      setReprintTotalResults(0);
    } finally {
      setLoadingReprint(false);
    }
  }, [reprintStartDate, reprintEndDate, reprintSearch, reprintPage]);

  useEffect(() => {
    if (!open) return;
    setCategoryLabel("CORE & COLLECTION MIX");
    void loadPreview();
  }, [open, loadPreview]);

  useEffect(() => {
    if (!open) return;
    void loadAlreadyPrinted();
  }, [open, loadAlreadyPrinted]);

  const appliedSearch = useRef(reprintSearch);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = searchInput.trim();
      if (appliedSearch.current === next) return;
      appliedSearch.current = next;
      setReprintSearch(next);
      setReprintPage(1);
      setSelectedNoteIds(new Set());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (open) return;
    const today = todayInputValue();
    appliedSearch.current = "";
    setReprintStartDate(today);
    setReprintEndDate(today);
    setSearchInput("");
    setReprintSearch("");
    setReprintPage(1);
    setSelectedNoteIds(new Set());
    setReprintNotes([]);
  }, [open]);

  /**
   * Adds or removes an original note from the reprint set.
   * @param transferNoteId - Active note to reprint
   */
  const toggleReprintNote = (transferNoteId: string) => {
    setSelectedNoteIds((current) => {
      const next = new Set(current);
      if (next.has(transferNoteId)) next.delete(transferNoteId);
      else next.add(transferNoteId);
      return next;
    });
  };

  /**
   * Selects or clears notes on the current page only.
   * @param selectAll - When true, every note on this page is included
   */
  const toggleAllReprintNotes = (selectAll: boolean) => {
    if (!selectAll) {
      setSelectedNoteIds(new Set());
      return;
    }
    setSelectedNoteIds(new Set(reprintNotes.map((note) => note.transferNoteId)));
  };

  /**
   * Changes a reprint date and returns to the first page.
   * @param value - Date input value, or empty when cleared
   * @param which - Which bound to update
   */
  const changeReprintDate = (value: string, which: "start" | "end") => {
    const next = value || todayInputValue();
    if (which === "start") setReprintStartDate(next);
    else setReprintEndDate(next);
    setReprintPage(1);
    setSelectedNoteIds(new Set());
  };

  /**
   * Moves the reprint list one page and drops the previous page's selection.
   * @param page - 1-based page number
   */
  const changeReprintPage = (page: number) => {
    setSelectedNoteIds(new Set());
    setReprintPage(page);
  };

  /**
   * Creates a note for free quantity, then reprints checked notes on this page.
   * Reprint does not allocate quantity again. At most one page is printed.
   */
  const handleConfirmPrint = async () => {
    const pageIds = new Set(reprintNotes.map((note) => note.transferNoteId));
    const reprintIds = reprintNotes
      .map((note) => note.transferNoteId)
      .filter((id) => selectedNoteIds.has(id) && pageIds.has(id))
      .slice(0, REPRINT_PAGE_LIMIT);
    const hasNewQty = previewLines.length > 0;
    if (!hasNewQty && reprintIds.length === 0) {
      toast.error("Select quantity to print");
      return;
    }
    setSubmitting(true);
    try {
      const jobs: Array<{ note: DispatchTransferNote; reprint?: boolean }> = [];
      if (hasNewQty) {
        const note = await createDispatchTransferNote(categoryLabel, printFilters);
        jobs.push({ note, reprint: false });
        toast.success(`Transfer note ${note.stnSerial} created`);
        onCreated?.();
      }
      for (const transferNoteId of reprintIds) {
        const note = await fetchDispatchTransferNoteById(transferNoteId);
        jobs.push({ note, reprint: true });
      }
      await printDispatchTransferNoteBatch(jobs);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to print transfer note");
    } finally {
      setSubmitting(false);
    }
  };

  const canPrint = previewLines.length > 0 || selectedNoteIds.size > 0;
  const printLabel = previewLines.length === 0 ? "Reprint selected" : "Create & Print";

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
        aria-labelledby="transfer-note-print-title"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50 shrink-0">
          <h3 id="transfer-note-print-title" className="text-sm font-semibold text-gray-800">
            <i className="ri-printer-line mr-1.5" aria-hidden />
            Print Stock Transfer Note
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
            <label htmlFor="stn-category-label" className="block text-xs font-semibold text-gray-600 mb-1.5">
              Category Label
            </label>
            <input
              id="stn-category-label"
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
              Creating a transfer note locks this quantity until warehouse inward.
            </p>
          </div>

          {loadingPreview ? (
            <div className="flex items-center justify-center py-8 text-gray-500 text-xs gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
              Loading preview…
            </div>
          ) : (
            <>
              <section aria-labelledby="new-qty-heading">
                <div className="flex items-center justify-between mb-2">
                  <h4 id="new-qty-heading" className="text-xs font-bold text-gray-700">
                    New quantity
                  </h4>
                  <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                    Total qty: {previewTotalQty}
                  </span>
                </div>

                {previewLines.length === 0 ? (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                    No new quantity. Reprint an existing note from the date list below.
                  </p>
                ) : (
                  <div className="border border-gray-200 rounded overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-[11px]">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left px-2 py-1.5 font-semibold text-gray-600" scope="col">Article No</th>
                          <th className="text-left px-2 py-1.5 font-semibold text-gray-600" scope="col">Brand</th>
                          <th className="text-left px-2 py-1.5 font-semibold text-gray-600" scope="col">Article Name</th>
                          <th className="text-right px-2 py-1.5 font-semibold text-gray-600" scope="col">Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewLines.map((row, idx) => (
                          <tr key={`${row.articleNumber}-${row.brand ?? row.sapArticleNo}-${idx}`} className="border-t border-gray-100">
                            <td className="px-2 py-1.5">{row.articleNumber}</td>
                            <td className="px-2 py-1.5">{formatTransferNoteLineBrand(row)}</td>
                            <td className="px-2 py-1.5 truncate max-w-[180px]">{row.articleName}</td>
                            <td className="px-2 py-1.5 text-right font-medium">{row.qtyInPairs}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <AlreadyPrintedLinesSection
                notes={reprintNotes}
                selectedNoteIds={selectedNoteIds}
                startDate={reprintStartDate}
                endDate={reprintEndDate}
                search={searchInput}
                page={reprintPage}
                totalPages={reprintTotalPages}
                totalResults={reprintTotalResults}
                loading={loadingReprint}
                onToggleNote={toggleReprintNote}
                onTogglePage={toggleAllReprintNotes}
                onStartDateChange={(value) => changeReprintDate(value, "start")}
                onEndDateChange={(value) => changeReprintDate(value, "end")}
                onSearchChange={setSearchInput}
                onPageChange={changeReprintPage}
              />
            </>
          )}
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
            disabled={submitting || loadingPreview || !canPrint}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-600 rounded hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {submitting ? (
              <span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
            ) : (
              <i className="ri-printer-line" aria-hidden />
            )}
            {printLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
