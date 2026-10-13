"use client";

import React from "react";
import type { AlreadyPrintedNote } from "../transferNoteService";
import {
  formatAlreadyPrintedLabel,
  formatStnPrintDate,
  formatTransferNoteLineBrand,
} from "../transferNotePrint.util";

export interface AlreadyPrintedLinesSectionProps {
  notes: AlreadyPrintedNote[];
  selectedNoteIds: ReadonlySet<string>;
  startDate: string;
  endDate: string;
  search: string;
  page: number;
  totalPages: number;
  totalResults: number;
  loading: boolean;
  onToggleNote: (transferNoteId: string) => void;
  onTogglePage: (selectAll: boolean) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
}

/**
 * Groups the current page by print date, keeping newest-first order.
 * @param notes - Notes already sorted by the API
 */
function groupNotesByDate(notes: AlreadyPrintedNote[]): Array<{ label: string; notes: AlreadyPrintedNote[] }> {
  const groups: Array<{ label: string; notes: AlreadyPrintedNote[] }> = [];
  for (const note of notes) {
    const label = formatStnPrintDate(note.stnDate);
    const current = groups[groups.length - 1];
    if (current && current.label === label) current.notes.push(note);
    else groups.push({ label, notes: [note] });
  }
  return groups;
}

/**
 * Date-bounded reprint list. Select all applies to this page only.
 */
export function AlreadyPrintedLinesSection({
  notes,
  selectedNoteIds,
  startDate,
  endDate,
  search,
  page,
  totalPages,
  totalResults,
  loading,
  onToggleNote,
  onTogglePage,
  onStartDateChange,
  onEndDateChange,
  onSearchChange,
  onPageChange,
}: AlreadyPrintedLinesSectionProps) {
  const pageIds = notes.map((note) => note.transferNoteId);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedNoteIds.has(id));
  const groups = groupNotesByDate(notes);

  return (
    <section aria-labelledby="already-printed-heading" className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 id="already-printed-heading" className="text-xs font-bold text-gray-700">
          Already printed
        </h4>
        <label className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-gray-600">
          <input
            type="checkbox"
            checked={allSelected}
            disabled={!pageIds.length || loading}
            onChange={(event) => onTogglePage(event.target.checked)}
            aria-label="Select all notes on this page"
            className="rounded border-gray-300 text-teal-600 focus:ring-teal-400"
          />
          Select this page
        </label>
      </div>
      <p className="text-[10px] text-gray-500">
        Reprint does not lock quantity again. Up to 20 notes on this page print at once.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="block text-[10px] font-semibold text-gray-600">
          From
          <input
            type="date"
            value={startDate}
            onChange={(event) => onStartDateChange(event.target.value)}
            aria-label="Already printed from date"
            className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </label>
        <label className="block text-[10px] font-semibold text-gray-600">
          To
          <input
            type="date"
            value={endDate}
            onChange={(event) => onEndDateChange(event.target.value)}
            aria-label="Already printed to date"
            className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </label>
        <label className="block text-[10px] font-semibold text-gray-600">
          Serial or article
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="F000123 or article"
            aria-label="Search already printed notes"
            className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </label>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 text-gray-500 text-xs gap-2">
          <span className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
          Loading printed notes…
        </div>
      ) : notes.length === 0 ? (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          {totalResults > 0
            ? "Notes in this window are already inwarded. Try another page or date."
            : "No already-printed quantity for these dates."}
        </p>
      ) : (
        <div className="border border-amber-200 rounded overflow-hidden max-h-72 overflow-y-auto">
          {groups.map((group) => (
            <div key={group.label}>
              <h5 className="sticky top-0 bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-900">{group.label}</h5>
              {group.notes.map((note) => {
                const checked = selectedNoteIds.has(note.transferNoteId);
                return (
                  <div key={note.transferNoteId} className="border-t border-amber-100">
                    <label className="flex items-center gap-2 px-2 py-1.5 bg-amber-50/60 text-[11px] font-semibold text-gray-800">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleNote(note.transferNoteId)}
                        aria-label={`Reprint ${note.stnSerial}`}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-400"
                      />
                      {note.stnSerial}
                    </label>
                    <table className="w-full text-[11px]">
                      <tbody>
                        {note.lines.map((row, idx) => (
                          <tr key={`${note.transferNoteId}-${row.articleNumber}-${idx}`} className="border-t border-amber-50">
                            <td className="px-2 py-1.5">
                              <div>{row.articleNumber}</div>
                              <div className="text-[10px] text-amber-800 mt-0.5">
                                {formatAlreadyPrintedLabel(note.stnSerial, note.stnDate)}
                              </div>
                            </td>
                            <td className="px-2 py-1.5">{formatTransferNoteLineBrand(row)}</td>
                            <td className="px-2 py-1.5 truncate max-w-[160px]">{row.articleName}</td>
                            <td className="px-2 py-1.5 text-right font-medium">{row.qtyInPairs}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-[10px] text-gray-600">
        <span>{totalResults} notes in this range</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={loading || page <= 1}
            className="px-2 py-1 border border-gray-300 rounded font-semibold disabled:opacity-40"
            aria-label="Previous already-printed page"
          >
            Previous
          </button>
          <span>
            Page {page} of {Math.max(totalPages, 1)}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={loading || page >= totalPages}
            className="px-2 py-1 border border-gray-300 rounded font-semibold disabled:opacity-40"
            aria-label="Next already-printed page"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
