"use client";

import React, { useMemo } from "react";
import type { VendorProductionFlow } from "@/shared/services/vendorProductionFlowService";
import { formatTransferredRowLabel } from "../../utils/transferredStyleRows";
import {
  filterFinalCheckingFlowsForView,
  flattenFlowsToArticles,
  getFlowId,
} from "../../utils/groupVendorProductionFlows";

export type VendorFinalCheckingArticleTabProps = {
  flows: VendorProductionFlow[];
  loading?: boolean;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  itemsPerPage: number;
  setItemsPerPage: (v: number) => void;
  currentPage: number;
  setCurrentPage: (v: number | ((p: number) => number)) => void;
  onProcess: (flow: VendorProductionFlow) => void;
  showAllArticles?: boolean;
};

/**
 * Article-wise tab — flat final checking batches with VPO context.
 */
export function VendorFinalCheckingArticleTab({
  flows,
  loading = false,
  searchQuery,
  setSearchQuery,
  itemsPerPage,
  setItemsPerPage,
  currentPage,
  setCurrentPage,
  onProcess,
  showAllArticles = false,
}: VendorFinalCheckingArticleTabProps) {
  const articleRows = useMemo(() => {
    const pool = filterFinalCheckingFlowsForView(flows, showAllArticles);
    const rows = flattenFlowsToArticles(pool);
    const q = searchQuery.trim().toLowerCase();
    const searched = !q
      ? rows
      : rows.filter(
          (row) =>
            row.productName.toLowerCase().includes(q) ||
            row.vpoNumber.toLowerCase().includes(q) ||
            row.vendorName.toLowerCase().includes(q) ||
            row.vendorCode.toLowerCase().includes(q) ||
            (row.flow.referenceCode?.toLowerCase() || "").includes(q),
        );
    return searched;
  }, [flows, searchQuery, showAllArticles]);

  const totalPages = Math.max(1, Math.ceil(articleRows.length / itemsPerPage));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return articleRows.slice(start, start + itemsPerPage);
  }, [articleRows, currentPage, itemsPerPage]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
        <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">
          Loading articles
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="p-[10px] flex flex-wrap items-center justify-between gap-3 border-b border-gray-100">
        <div className="relative w-full sm:w-80 min-w-[200px]">
          <input
            type="search"
            className="w-full bg-white border-2 border-gray-600 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:!border-2 focus:!border-gray-600 focus:outline-none placeholder:text-gray-600 font-medium"
            placeholder="Search Batch or Vendor..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Search articles"
          />
          <i
            className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs"
            aria-hidden="true"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-medium text-[#495057] mb-0">
            Show:
          </label>
          <select
            className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-2 py-1.5 pr-7 focus:ring-0 focus:border-gray-300 appearance-none cursor-pointer w-20"
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            aria-label="Articles per page"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-50/30">
              <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                Batch Ref
              </th>
              <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                Vendor
              </th>
              <th className="px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                QC In
              </th>
              <th className="px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                Pending
              </th>
              <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                M1/M2/M3/M4
              </th>
              <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                Style breakdown
              </th>
              <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                Confirmation
              </th>
              <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-1.5 py-20 text-center text-gray-400 text-xs font-bold uppercase tracking-widest border border-gray-200"
                >
                  No QC tasks found
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => {
                const fc = row.flow.floorQuantities.finalChecking;
                return (
                  <tr
                    key={getFlowId(row.flow)}
                    className="hover:bg-gray-50/50 transition-colors group"
                  >
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <div className="font-bold text-[12px]">
                        {row.flow.referenceCode || "—"}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {row.productName}
                      </div>
                      <div className="text-[10px] text-purple-600 font-semibold">
                        VPO: {row.vpoNumber}
                      </div>
                    </td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <div className="font-bold text-purple-600 underline decoration-purple-200 underline-offset-1">
                        {row.vendorName}
                      </div>
                      <div className="text-[10px] text-gray-500 font-semibold mt-0.5">
                        {row.vendorCode}
                      </div>
                    </td>
                    <td className="px-1.5 py-2.5 text-right font-medium text-[12px] text-gray-700 border border-gray-200">
                      {fc.received.toLocaleString()}
                    </td>
                    <td className="px-1.5 py-2.5 text-right border border-gray-200">
                      {(fc.pendingFromBoxes ?? 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-50 border border-orange-200 text-[10px] font-bold text-orange-700">
                          <i className="ri-barcode-line text-[9px]" aria-hidden="true" />
                          {(fc.pendingFromBoxes ?? 0).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <div className="flex gap-1.5 flex-wrap">
                        <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 px-1 py-0.5 rounded">
                          M1: {fc.m1Quantity}
                        </span>
                        <span className="text-amber-700 font-bold text-[10px] bg-amber-50 px-1 py-0.5 rounded">
                          M2: {fc.m2Quantity}
                        </span>
                        <span className="text-violet-700 font-bold text-[10px] bg-violet-50 px-1 py-0.5 rounded">
                          M3: {fc.m3Quantity ?? 0}
                        </span>
                        <span className="text-red-700 font-bold text-[10px] bg-red-50 px-1 py-0.5 rounded">
                          M4: {fc.m4Quantity}
                        </span>
                      </div>
                    </td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <div className="text-[10px] flex flex-wrap gap-1 max-w-[220px]">
                        {fc.transferredData?.length ? (
                          fc.transferredData.map((t, i) => (
                            <span
                              key={i}
                              className="bg-gray-50 border border-gray-100 px-1 py-0.5 rounded"
                            >
                              {formatTransferredRowLabel(t)}
                            </span>
                          ))
                        ) : fc.receivedData?.length ? (
                          fc.receivedData.map((t, i) => (
                            <span
                              key={i}
                              className="bg-emerald-50/80 border border-emerald-100 px-1 py-0.5 rounded"
                              title="Inbound from container (receivedData)"
                            >
                              {formatTransferredRowLabel(t)}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <span
                        className={
                          row.flow.finalQualityConfirmed
                            ? "inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight bg-green-100 text-green-800"
                            : "inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight bg-red-100 text-red-800"
                        }
                      >
                        {row.flow.finalQualityConfirmed ? "CONFIRMED" : "PENDING"}
                      </span>
                    </td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <button
                        type="button"
                        onClick={() => onProcess(row.flow)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                        aria-label={`Process ${row.productName}`}
                      >
                        <i className="ri-edit-line" />
                        Process
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white">
        <p className="text-[11px] font-medium text-[#495057] tracking-tight">
          Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
          {Math.min(currentPage * itemsPerPage, articleRows.length)} of{" "}
          {articleRows.length} entries
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Prev
          </button>
          <span className="text-[11px] font-bold text-gray-500 px-2">
            Page {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}
