"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  fetchDispatchTransferNotes,
  fetchDispatchTransferNoteById,
  type DispatchTransferNote,
} from "../transferNoteService";
import { printDispatchTransferNote, formatTransferNoteLineBrand } from "../transferNotePrint.util";
import { downloadDispatchTransferNoteExcel } from "../transferNoteExcelExport";

const PAGE_SIZE = 20;

/**
 * Summarizes container barcodes across all lines on a transfer note.
 * @param note - Transfer note document
 */
function summarizeContainerBarcodes(note: DispatchTransferNote): string {
  const set = new Set<string>();
  for (const line of note.lines ?? []) {
    for (const bc of line.containerBarcodes ?? []) {
      if (bc) set.add(bc);
    }
  }
  if (!set.size) return "—";
  const arr = [...set];
  if (arr.length <= 2) return arr.join(", ");
  return `${arr.slice(0, 2).join(", ")} +${arr.length - 2}`;
}

/**
 * Resolves created-by display name from populated or string ref.
 * @param note - Transfer note document
 */
function createdByLabel(note: DispatchTransferNote): string {
  const cb = note.createdBy;
  if (!cb) return "—";
  if (typeof cb === "string") return cb;
  return cb.name || cb.email || "—";
}

export interface TransferNoteHistoryTabProps {
  refreshKey?: number;
}

/**
 * Date-wise transfer note history with re-print and Excel report export.
 */
export function TransferNoteHistoryTab({ refreshKey = 0 }: TransferNoteHistoryTabProps) {
  const [rows, setRows] = useState<DispatchTransferNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [reprintingId, setReprintingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDispatchTransferNotes({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: search.trim() || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setRows(data.results ?? []);
      setTotalResults(data.totalResults ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to load transfer notes");
      setRows([]);
      setTotalResults(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, search, page, refreshKey]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    setPage(1);
  }, [startDate, endDate, search, refreshKey]);

  const handleReprint = async (noteId: string) => {
    setReprintingId(noteId);
    try {
      const note = await fetchDispatchTransferNoteById(noteId);
      await printDispatchTransferNote(note);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to re-print");
    } finally {
      setReprintingId(null);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const count = await downloadDispatchTransferNoteExcel(
        {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          search: search.trim() || undefined,
        },
        `dispatch_transfer_notes_${startDate || "all"}_${endDate || "all"}`
      );
      if (count === 0) {
        toast.error("No rows to export for current filters");
      } else {
        toast.success(`Exported ${count} row(s)`);
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-[10px] space-y-4">
      <div className="flex flex-wrap items-end gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <div>
          <label htmlFor="stn-history-start" className="block text-[10px] font-semibold text-gray-600 mb-1">
            From date
          </label>
          <input
            id="stn-history-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-200 rounded px-2 py-1 text-[11px]"
          />
        </div>
        <div>
          <label htmlFor="stn-history-end" className="block text-[10px] font-semibold text-gray-600 mb-1">
            To date
          </label>
          <input
            id="stn-history-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-200 rounded px-2 py-1 text-[11px]"
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label htmlFor="stn-history-search" className="block text-[10px] font-semibold text-gray-600 mb-1">
            Search
          </label>
          <input
            id="stn-history-search"
            type="search"
            placeholder="STN serial, category, article…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded px-2 py-1 text-[11px]"
            aria-label="Search transfer notes"
          />
        </div>
        <button
          type="button"
          onClick={() => void handleExportExcel()}
          disabled={exporting}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[11px] font-bold rounded hover:bg-gray-50 disabled:opacity-50"
          aria-label="Download transfer note report as Excel"
        >
          {exporting ? (
            <span className="animate-spin rounded-full h-3 w-3 border-2 border-gray-400 border-t-transparent" />
          ) : (
            <i className="ri-file-excel-2-line text-sm text-green-700" aria-hidden />
          )}
          Download Report
        </button>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-white border-b border-gray-100 flex items-center justify-between">
          <span className="text-[11px] font-bold text-gray-700">Transfer note history</span>
          <span className="text-[10px] text-gray-500">{totalResults} record(s)</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500 text-xs gap-2">
            <span className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-10">No transfer notes found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">STN Serial</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Date</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Category</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600">Total Qty</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600">Boxes</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Containers</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Created By</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((note) => {
                  const noteId = note.id || note._id || "";
                  const isExpanded = expandedId === noteId;
                  return (
                    <React.Fragment key={noteId}>
                      <tr className="border-t border-gray-100 hover:bg-gray-50/50">
                        <td className="px-3 py-2 font-mono font-semibold">{note.stnSerial}</td>
                        <td className="px-3 py-2">
                          {note.stnDate
                            ? new Date(note.stnDate).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </td>
                        <td className="px-3 py-2 max-w-[140px] truncate">{note.categoryLabel || "—"}</td>
                        <td className="px-3 py-2 text-right font-medium">{note.totalQty}</td>
                        <td className="px-3 py-2 text-right">{note.totalBoxes ?? 0}</td>
                        <td className="px-3 py-2 max-w-[120px] truncate" title={summarizeContainerBarcodes(note)}>
                          {summarizeContainerBarcodes(note)}
                        </td>
                        <td className="px-3 py-2">{createdByLabel(note)}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : noteId)}
                            className="text-teal-600 hover:text-teal-800 font-semibold mr-2"
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? "Hide" : "Lines"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleReprint(noteId)}
                            disabled={reprintingId === noteId}
                            className="text-blue-600 hover:text-blue-800 font-semibold disabled:opacity-50"
                            aria-label={`Re-print transfer note ${note.stnSerial}`}
                          >
                            {reprintingId === noteId ? "…" : "Re-print"}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-50/80">
                          <td colSpan={8} className="px-4 py-2">
                            <table className="w-full text-[10px]">
                              <thead>
                                <tr>
                                  <th className="text-left py-1 font-semibold text-gray-500">Article No</th>
                                  <th className="text-left py-1 font-semibold text-gray-500">Brand</th>
                                  <th className="text-left py-1 font-semibold text-gray-500">Article Name</th>
                                  <th className="text-right py-1 font-semibold text-gray-500">Qty</th>
                                  <th className="text-left py-1 font-semibold text-gray-500">Containers</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(note.lines ?? []).map((line, idx) => (
                                  <tr key={idx}>
                                    <td className="py-0.5">{line.articleNumber}</td>
                                    <td className="py-0.5">{formatTransferNoteLineBrand(line)}</td>
                                    <td className="py-0.5">{line.articleName}</td>
                                    <td className="py-0.5 text-right">{line.qtyInPairs}</td>
                                    <td className="py-0.5">
                                      {(line.containerBarcodes ?? []).join(", ") || "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-white">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="text-[11px] font-semibold text-teal-600 disabled:text-gray-300"
            >
              Previous
            </button>
            <span className="text-[10px] text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="text-[11px] font-semibold text-teal-600 disabled:text-gray-300"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
