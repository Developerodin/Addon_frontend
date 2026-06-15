"use client";

import React, { useMemo } from "react";
import type { VendorProductionFlow } from "@/shared/services/vendorProductionFlowService";
import {
  filterActiveScFlows,
  flattenFlowsToArticles,
  getFlowId,
  statusBadgeClass,
} from "../utils/groupVendorScFlows";
import { resolveLotExpectedQty } from "../utils/resolveScReconciliation";
import { VendorSecondaryCheckingQtyBadges } from "./VendorSecondaryCheckingQtyBadges";

export type VendorSecondaryCheckingArticleTabProps = {
  flows: VendorProductionFlow[];
  loading?: boolean;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  itemsPerPage: number;
  setItemsPerPage: (v: number) => void;
  currentPage: number;
  setCurrentPage: (v: number | ((p: number) => number)) => void;
  highlightFlowId?: string | null;
  onProcess: (flow: VendorProductionFlow) => void;
};

/**
 * Article-wise tab — flat list of product batches with VPO context.
 */
export function VendorSecondaryCheckingArticleTab({
  flows,
  loading = false,
  searchQuery,
  setSearchQuery,
  itemsPerPage,
  setItemsPerPage,
  currentPage,
  setCurrentPage,
  highlightFlowId = null,
  onProcess,
}: VendorSecondaryCheckingArticleTabProps) {
  const articleRows = useMemo(() => {
    const active = filterActiveScFlows(flows);
    const rows = flattenFlowsToArticles(active);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter(
      (row) =>
        row.productName.toLowerCase().includes(q) ||
        row.vpoNumber.toLowerCase().includes(q) ||
        row.vendorName.toLowerCase().includes(q) ||
        row.vendorCode.toLowerCase().includes(q) ||
        (row.flow.referenceCode?.toLowerCase() || "").includes(q),
    );
  }, [flows, searchQuery]);

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
            placeholder="Search by product, VPO, vendor..."
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
          <label className="text-[11px] font-medium text-[#495057]">Show:</label>
          <select
            className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-2 py-1.5"
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
              <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase border border-gray-200">
                Product
              </th>
              <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase border border-gray-200">
                VPO
              </th>
              <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase border border-gray-200">
                Vendor
              </th>
              <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase border border-gray-200">
                Ref / Lot
              </th>
              <th className="px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase border border-gray-200">
                Batch from boxes
              </th>
              <th className="px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase border border-gray-200">
                Lot expected
              </th>
              <th className="px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase border border-gray-200">
                Boxes not scanned
              </th>
              <th className="px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase border border-gray-200">
                Scan accepted
              </th>
              <th className="px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase border border-gray-200">
                Unclassified
              </th>
              <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase border border-gray-200">
                M1/M2/M3/M4
              </th>
              <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase border border-gray-200">
                Status
              </th>
              <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase border border-gray-200">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
                  className="px-1.5 py-10 border border-gray-200 text-center text-gray-400 text-xs font-bold uppercase tracking-widest"
                >
                  No articles found
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => {
                const sc = row.flow.floorQuantities.secondaryChecking;
                const flowId = getFlowId(row.flow);
                const highlighted = highlightFlowId === flowId;
                const lotExpected = resolveLotExpectedQty(row.flow);

                return (
                  <tr
                    key={flowId}
                    className={`transition-colors ${
                      highlighted
                        ? "bg-purple-50 ring-1 ring-inset ring-purple-200"
                        : "hover:bg-gray-50/50"
                    }`}
                  >
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <div className="font-bold text-gray-900 text-[12px]">
                        {row.productName}
                      </div>
                    </td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <span className="text-[11px] font-bold text-purple-600">
                        {row.vpoNumber}
                      </span>
                    </td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <div className="text-[11px] font-medium text-gray-800">
                        {row.vendorName}
                      </div>
                      <div className="text-[10px] text-gray-500 font-semibold mt-0.5">
                        {row.vendorCode}
                      </div>
                    </td>
                    <td className="px-1.5 py-2.5 border border-gray-200 text-[10px] text-gray-500 font-medium">
                      {row.flow.referenceCode || "—"}
                    </td>
                    <td className="px-1.5 py-2.5 text-right font-bold text-gray-800 text-[12px] border border-gray-200">
                      {row.flow.plannedQuantity.toLocaleString()}
                    </td>
                    <td className="px-1.5 py-2.5 text-right font-medium text-slate-700 text-[12px] border border-gray-200">
                      {lotExpected > 0
                        ? lotExpected.toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-1.5 py-2.5 text-right border border-gray-200">
                      {(sc.pendingFromBoxes ?? 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-50 border border-orange-200 text-[10px] font-bold text-orange-700">
                          {(sc.pendingFromBoxes ?? 0).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-1.5 py-2.5 text-right font-medium text-gray-700 text-[12px] border border-gray-200">
                      {sc.received.toLocaleString()}
                    </td>
                    <td className="px-1.5 py-2.5 text-right font-bold text-amber-800 text-[12px] border border-gray-200">
                      {(sc.remaining ?? 0).toLocaleString()}
                    </td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <VendorSecondaryCheckingQtyBadges sc={sc} />
                    </td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <span className={statusBadgeClass(row.flow)}>
                        {sc.completed > 0 ? "Completed" : "Pending"}
                      </span>
                    </td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <button
                        type="button"
                        onClick={() => onProcess(row.flow)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                        aria-label={`Process ${row.productName}`}
                      >
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

      <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100">
        <p className="text-[11px] font-medium text-[#495057]">
          Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
          {Math.min(currentPage * itemsPerPage, articleRows.length)} of{" "}
          {articleRows.length} articles
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30"
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
            className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30"
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}
