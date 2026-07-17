"use client";

import React, { useMemo } from "react";
import { format } from "date-fns";
import type {
  BarcodePrintHistoryEntry,
  BarcodePrintHistorySummary,
} from "@/shared/services/whmsPickListBatchService";

export interface BarcodePrintHistoryProps {
  history?: BarcodePrintHistoryEntry[];
  summary?: BarcodePrintHistorySummary[];
}

/**
 * Format a print timestamp for display in the history panel.
 * @param value - ISO date string
 */
function formatPrintTime(value?: string): string {
  if (!value) return "—";
  try {
    return format(new Date(value), "dd MMM yyyy, h:mm a");
  } catch {
    return value;
  }
}

/**
 * Ordinal label for print sequence (1st, 2nd, 3rd, …).
 * @param n - Print number (1-based)
 */
function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const mod10 = n % 10;
  if (mod10 === 1) return `${n}st`;
  if (mod10 === 2) return `${n}nd`;
  if (mod10 === 3) return `${n}rd`;
  return `${n}th`;
}

/**
 * Build per-scope print sequence numbers from chronological history.
 * @param history - All print events oldest-first
 */
function buildPrintSequenceMap(history: BarcodePrintHistoryEntry[]): Map<string, number> {
  const counts = new Map<string, number>();
  const sequence = new Map<string, number>();
  const sorted = [...history].sort(
    (a, b) => new Date(a.printedAt).getTime() - new Date(b.printedAt).getTime(),
  );
  for (const entry of sorted) {
    const key = entry.id;
    const scope = entry.styleCode || "__all__";
    const next = (counts.get(scope) || 0) + 1;
    counts.set(scope, next);
    sequence.set(key, next);
  }
  return sequence;
}

/**
 * Show barcode print history with per-style totals and event timeline.
 */
export default function BarcodePrintHistory({ history = [], summary = [] }: BarcodePrintHistoryProps) {
  const sequenceMap = useMemo(() => buildPrintSequenceMap(history), [history]);

  const sortedEvents = useMemo(
    () =>
      [...history].sort(
        (a, b) => new Date(b.printedAt).getTime() - new Date(a.printedAt).getTime(),
      ),
    [history],
  );

  if (!history.length) {
    return (
      <section
        className="border border-gray-200 rounded-lg p-4 bg-gray-50/50"
        aria-label="Barcode print history"
      >
        <h2 className="text-sm font-bold text-gray-800 mb-1">Barcode print history</h2>
        <p className="text-[12px] text-gray-500">No barcodes printed yet for this pick list.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4" aria-label="Barcode print history">
      <div>
        <h2 className="text-sm font-bold text-gray-800">Barcode print history</h2>
        <p className="text-[11px] text-gray-500 mt-0.5">
          Track how many labels were printed each time, by style or for all styles.
        </p>
      </div>

      {summary.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {summary.map((row) => (
            <div
              key={row.styleCode || "__all__"}
              className="border border-purple-100 bg-purple-50/40 rounded-lg px-3 py-2.5"
            >
              <p className="text-[10px] font-bold uppercase text-purple-700 tracking-wide">
                {row.scopeLabel}
              </p>
              <p className="text-lg font-bold text-gray-900 mt-1">{row.totalPrinted}</p>
              <p className="text-[11px] text-gray-600">
                total labels · {row.printCount} print{row.printCount === 1 ? "" : "s"}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full min-w-[720px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-600 uppercase">
                When
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-600 uppercase">
                Scope
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-600 uppercase">
                Print #
              </th>
              <th className="px-3 py-2 text-right text-[11px] font-bold text-gray-600 uppercase">
                Labels
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-600 uppercase">
                Mode
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-600 uppercase">
                By
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-600 uppercase">
                Breakdown
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedEvents.map((entry) => {
              const seq = sequenceMap.get(entry.id) || 1;
              const breakdown = (entry.labels || [])
                .map((l) => `${l.styleCode || "—"} × ${l.quantity}`)
                .join(", ");
              return (
                <tr key={entry.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                  <td className="px-3 py-2.5 text-[12px] text-gray-700 whitespace-nowrap">
                    {formatPrintTime(entry.printedAt)}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] font-semibold text-gray-900">
                    {entry.styleCode || "All styles"}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold uppercase">
                      {ordinal(seq)} print
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-gray-900">
                    {entry.quantity}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-gray-600 capitalize">{entry.mode}</td>
                  <td className="px-3 py-2.5 text-[12px] text-gray-600">
                    {entry.printedByName || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-[11px] text-gray-500 max-w-[240px] truncate" title={breakdown}>
                    {breakdown || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
