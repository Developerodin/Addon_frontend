"use client";

import React from "react";

type Props = {
  historyLoading: boolean;
  historyRows: Record<string, unknown>[];
};

/**
 * Table of completed vendor returns (read-only).
 */
export function PoVendorReturnHistoryTable({ historyLoading, historyRows }: Props) {
  return (
    <div className="rounded-lg border border-gray-100 overflow-x-auto">
      <table className="min-w-full text-left text-xs" aria-label="Vendor return history">
        <thead className="bg-gray-50 text-[10px] uppercase text-gray-600">
          <tr>
            <th className="px-3 py-2">PO</th>
            <th className="px-3 py-2">Completed</th>
            <th className="px-3 py-2">Scope</th>
            <th className="px-3 py-2">Intent</th>
            <th className="px-3 py-2">LT included</th>
            <th className="px-3 py-2 text-right">Cones Δ</th>
            <th className="px-3 py-2 text-right">Boxes Δ</th>
          </tr>
        </thead>
        <tbody>
          {historyLoading ? (
            <tr>
              <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                Loading…
              </td>
            </tr>
          ) : historyRows.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                No history yet.
              </td>
            </tr>
          ) : (
            historyRows.map((row) => {
              const snap = row.snapshot as Record<string, unknown> | undefined;
              return (
                <tr key={String(row._id)} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">{String(row.poNumber)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {row.completedAt
                      ? new Date(String(row.completedAt)).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-3 py-2">{String(row.scope)}</td>
                  <td className="px-3 py-2">{String(row.cancellationIntent)}</td>
                  <td className="px-3 py-2">{row.includeLongTermBoxes ? "Yes" : "No"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {snap?.stEligibleConeCount != null ? String(snap.stEligibleConeCount) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {(snap?.stBoxCount != null ? Number(snap.stBoxCount) : 0) +
                      (snap?.ltBoxCount != null ? Number(snap.ltBoxCount) : 0) +
                      (snap?.unallocatedBoxCount != null ? Number(snap.unallocatedBoxCount) : 0)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
