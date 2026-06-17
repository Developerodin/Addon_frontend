"use client";

import React, { useMemo, useState } from "react";
import type { VendorM3FlowRow } from "@/shared/services/vendorM2M3M4ManagementService";
import { getVendorFlowRowId } from "@/app/vendor-po/utils/getVendorFlowRowId";

export interface FlowViewTabProps {
  rows: VendorM3FlowRow[];
  isLoading?: boolean;
  itemsPerPage: number;
  onItemsPerPageChange: (n: number) => void;
  onView: (row: VendorM3FlowRow) => void;
  onOutward: (row: VendorM3FlowRow) => void;
}

/**
 * Flow-wise vendor M3 table with combined totals (SC + FC).
 */
export default function FlowViewTab({
  rows,
  isLoading = false,
  itemsPerPage,
  onItemsPerPageChange,
  onView,
  onOutward,
}: FlowViewTabProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.referenceCode.toLowerCase().includes(q) ||
        r.vpoNumber.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paged = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search VPO, reference…"
          className="flex-1 min-w-[160px] py-1.5 px-2 text-[11px] border border-gray-300 rounded"
          aria-label="Search vendor M3 flows"
        />
        <label className="text-[10px] text-gray-600 flex items-center gap-1">
          Per page
          <select
            value={itemsPerPage}
            onChange={(e) => {
              onItemsPerPageChange(Number(e.target.value));
              setPage(1);
            }}
            className="border border-gray-300 rounded py-1 px-1 text-[10px]"
            aria-label="Items per page"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="border border-gray-300 rounded overflow-hidden overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 text-[10px] table-fixed min-w-[640px]">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-1 py-1 text-left w-[120px]">VPO</th>
              <th className="border border-gray-300 px-1 py-1 text-left w-[120px]">Reference</th>
              <th className="border border-gray-300 px-1 py-1 text-right bg-orange-50 text-orange-800 w-[90px]">
                Combined M3
              </th>
              <th className="border border-gray-300 px-1 py-1 text-right w-[80px]">Outward</th>
              <th className="border border-gray-300 px-1 py-1 text-right w-[80px]">Available</th>
              <th className="border border-gray-300 px-1 py-1 text-center w-[100px]">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="border border-gray-300 px-2 py-6 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={6} className="border border-gray-300 px-2 py-6 text-center text-gray-500">
                  No flows with M3 activity
                </td>
              </tr>
            ) : (
              paged.map((row) => {
                const s = row.m3Snapshot;
                const rowId = getVendorFlowRowId(row);
                return (
                  <tr key={rowId} className="hover:bg-gray-50/50">
                    <td className="border border-gray-300 px-1 py-1 font-medium">{row.vpoNumber || "—"}</td>
                    <td className="border border-gray-300 px-1 py-1 font-semibold">{row.referenceCode || "—"}</td>
                    <td className="border border-gray-300 px-1 py-1 text-right bg-orange-50/50 font-bold text-orange-900">
                      {s.onHand}
                    </td>
                    <td className="border border-gray-300 px-1 py-1 text-right text-orange-700">{s.outwardTotal}</td>
                    <td className="border border-gray-300 px-1 py-1 text-right text-orange-800 font-bold">{s.availableForOutward}</td>
                    <td className="border border-gray-300 px-1 py-1 text-center">
                      <div className="flex justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onView(row)}
                          className="px-1.5 py-0.5 text-[9px] font-bold border border-gray-300 rounded hover:bg-gray-100"
                          aria-label={`View M3 detail for ${row.referenceCode}`}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          disabled={s.availableForOutward <= 0}
                          onClick={() => onOutward(row)}
                          className="px-1.5 py-0.5 text-[9px] font-bold border border-orange-300 text-orange-800 rounded hover:bg-orange-50 disabled:opacity-40"
                          aria-label={`Mark outward for ${row.referenceCode}`}
                        >
                          Outward
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-2 text-[10px]">
          <span className="text-gray-600">
            Page {page} of {totalPages} ({filtered.length} rows)
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-2 py-1 border border-gray-300 rounded disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-2 py-1 border border-gray-300 rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <p className="text-[10px] text-gray-500 mt-2">
        Combined M3 = sum across Secondary Checking and Final Checking. Use VPO tab for per-floor breakdown.
      </p>
    </div>
  );
}
