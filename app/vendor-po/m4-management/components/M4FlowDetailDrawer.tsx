"use client";

import React from "react";
import { formatVendorQcFloor, type VendorM4FlowSummary } from "@/shared/services/vendorM2M3M4ManagementService";

export interface M4FlowDetailDrawerProps {
  summary: VendorM4FlowSummary | null;
  isLoading?: boolean;
  onClose: () => void;
}

/**
 * View drawer showing vendor M4 breakdown (Final Checking) and recent ledger logs.
 */
export default function M4FlowDetailDrawer({
  summary,
  isLoading = false,
  onClose,
}: M4FlowDetailDrawerProps) {
  const snap = summary?.m4Snapshot;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} aria-hidden="true" />
      <aside
        className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right border-l-2 border-gray-300"
        role="dialog"
        aria-labelledby="vendor-m4-detail-title"
        aria-modal="true"
      >
        <header className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 id="vendor-m4-detail-title" className="text-sm font-bold text-gray-900">Vendor M4 Flow Detail</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-800 text-lg" aria-label="Close">×</button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading || !summary ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : (
            <>
              <div className="mb-4 text-[11px] space-y-1">
                <p><span className="font-semibold">VPO:</span> {summary.vpoNumber || "—"}</p>
                <p><span className="font-semibold">Reference:</span> {summary.referenceCode || "—"}</p>
              </div>

              <table className="w-full border-collapse border border-gray-300 text-[11px] mb-4">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-2 py-1 text-left">Floor</th>
                    <th className="border border-gray-300 px-2 py-1 text-right bg-red-50 text-red-800">M4</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1">Final Checking</td>
                    <td className="border border-gray-300 px-2 py-1 text-right bg-red-50/50">{snap?.byFloor.finalChecking ?? 0}</td>
                  </tr>
                  <tr className="font-bold bg-gray-50">
                    <td className="border border-gray-300 px-2 py-1">On hand</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{snap?.onHand ?? 0}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-2 py-1">Outwarded</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{snap?.outwardTotal ?? 0}</td>
                  </tr>
                  <tr className="font-bold text-red-800">
                    <td className="border border-gray-300 px-2 py-1">Available</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{snap?.availableForOutward ?? 0}</td>
                  </tr>
                </tbody>
              </table>

              <h3 className="text-[11px] font-bold uppercase text-gray-700 mb-2">Recent logs</h3>
              <div className="overflow-x-auto border border-gray-300 rounded">
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-1 py-1">Time</th>
                      <th className="border border-gray-300 px-1 py-1">Type</th>
                      <th className="border border-gray-300 px-1 py-1">Floor</th>
                      <th className="border border-gray-300 px-1 py-1">Qty</th>
                      <th className="border border-gray-300 px-1 py-1">User</th>
                      <th className="border border-gray-300 px-1 py-1">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(summary.recentLogs ?? []).length === 0 ? (
                      <tr><td colSpan={6} className="border border-gray-300 px-2 py-3 text-center text-gray-500">No logs yet</td></tr>
                    ) : (
                      summary.recentLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50/50">
                          <td className="border border-gray-300 px-1 py-1 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="border border-gray-300 px-1 py-1">
                            <span className={log.type === "OUTWARD" ? "text-orange-700 font-semibold" : "text-red-700 font-semibold"}>{log.type}</span>
                          </td>
                          <td className="border border-gray-300 px-1 py-1">{formatVendorQcFloor(log.sourceFloor)}</td>
                          <td className="border border-gray-300 px-1 py-1 text-right">{log.quantity}</td>
                          <td className="border border-gray-300 px-1 py-1">{log.userName || "—"}</td>
                          <td className="border border-gray-300 px-1 py-1 max-w-[120px] truncate" title={log.remarks}>{log.remarks || "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
