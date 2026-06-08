"use client";

import React from "react";
import Link from "next/link";
import type { PoReturnChallan } from "@/shared/services/poReturnChallanService";

type PoReturnHistoryPanelProps = {
  historyLoading: boolean;
  challanRows: PoReturnChallan[];
  onRefresh: () => void;
  onView: (row: PoReturnChallan) => void;
  onPrint: (row: PoReturnChallan) => void;
  canAccessChallanHistory: boolean;
};

/**
 * Recent return challans preview with link to full history module.
 */
export function PoReturnHistoryPanel({
  historyLoading,
  challanRows,
  onRefresh,
  onView,
  onPrint,
  canAccessChallanHistory,
}: PoReturnHistoryPanelProps) {
  const preview = challanRows.slice(0, 5);

  return (
    <div className="box border border-gray-100 shadow-sm">
      <div className="box-header border-b border-gray-100 px-4 py-3 flex flex-wrap justify-between items-center gap-2">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Recent return challans</h2>
          <p className="text-[10px] text-gray-500 mt-0.5">Last 5 challans for the selected PO filter (if any)</p>
        </div>
        <div className="flex items-center gap-3">
          {canAccessChallanHistory && (
            <Link
              href="/yarn-management/purchase-management/po-return-challan"
              className="text-xs font-semibold text-purple-700 hover:underline"
            >
              View all challans
            </Link>
          )}
          <button
            type="button"
            onClick={() => void onRefresh()}
            className="text-xs font-semibold text-purple-700 hover:underline"
          >
            Refresh
          </button>
        </div>
      </div>
      <div className="box-body px-4 py-3">
        {historyLoading ? (
          <p className="text-xs text-gray-500">Loading…</p>
        ) : preview.length === 0 ? (
          <p className="text-xs text-gray-500">No return challans yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs" aria-label="Recent PO return challans">
              <thead className="bg-gray-50 text-[10px] uppercase text-gray-600">
                <tr>
                  <th className="px-2 py-1.5">Challan</th>
                  <th className="px-2 py-1.5">Date</th>
                  <th className="px-2 py-1.5">PO</th>
                  <th className="px-2 py-1.5">Cones</th>
                  <th className="px-2 py-1.5">Net kg</th>
                  <th className="px-2 py-1.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((h) => (
                  <tr key={h.id} className="border-t border-gray-100">
                    <td className="px-2 py-1.5 font-mono font-semibold">{h.challanNumber}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      {h.challanDate ? new Date(String(h.challanDate)).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-2 py-1.5 font-mono">{h.poNumber}</td>
                    <td className="px-2 py-1.5">{String(h.totals?.coneCount ?? h.lines?.length ?? "")}</td>
                    <td className="px-2 py-1.5 tabular-nums">{String(h.totals?.totalNetWeight ?? "")}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onView(h)}
                          className="px-1.5 py-0.5 text-[10px] font-bold border border-gray-200 rounded hover:bg-gray-50"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => onPrint(h)}
                          className="px-1.5 py-0.5 text-[10px] font-bold border border-gray-200 rounded hover:bg-gray-50"
                        >
                          Print
                        </button>
                      </div>
                    </td>
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
