"use client";

import React from "react";
import type { HistoryRow } from "./poReturnHelpers";

type PoReturnHistoryPanelProps = {
  historyLoading: boolean;
  historyRows: HistoryRow[];
  onRefresh: () => void;
};

/**
 * Table of completed vendor returns (newest from API).
 */
export function PoReturnHistoryPanel({ historyLoading, historyRows, onRefresh }: PoReturnHistoryPanelProps) {
  return (
    <div className="box border border-gray-100 shadow-sm">
      <div className="box-header border-b border-gray-100 px-4 py-3 flex justify-between items-center">
        <h2 className="text-sm font-bold text-gray-900">Completed returns</h2>
        <button
          type="button"
          onClick={() => void onRefresh()}
          className="text-xs font-semibold text-purple-700 hover:underline"
        >
          Refresh
        </button>
      </div>
      <div className="box-body px-4 py-3">
        {historyLoading ? (
          <p className="text-xs text-gray-500">Loading…</p>
        ) : historyRows.length === 0 ? (
          <p className="text-xs text-gray-500">No completed vendor returns yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-gray-50 text-[10px] uppercase text-gray-600">
                <tr>
                  <th className="px-2 py-1.5">Date</th>
                  <th className="px-2 py-1.5">PO</th>
                  <th className="px-2 py-1.5">Cones</th>
                  <th className="px-2 py-1.5">Net kg</th>
                  <th className="px-2 py-1.5">Intent</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.map((h, i) => (
                  <tr key={String(h._id ?? h.id ?? i)} className="border-t border-gray-100">
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      {h.completedAt ? new Date(String(h.completedAt)).toLocaleString() : "—"}
                    </td>
                    <td className="px-2 py-1.5 font-mono">{String(h.poNumber ?? "")}</td>
                    <td className="px-2 py-1.5">{String(h.coneCount ?? "")}</td>
                    <td className="px-2 py-1.5 tabular-nums">{String(h.totalNetWeight ?? "")}</td>
                    <td className="px-2 py-1.5">{String(h.cancellationIntent ?? "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
