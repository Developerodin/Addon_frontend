"use client";

import React, { useMemo, useState } from "react";
import type { VendorProductionFlow } from "@/shared/services/vendorProductionFlowService";
import { formatTransferredRowLabel } from "../../utils/transferredStyleRows";
import {
  filterDispatchFlowsForView,
  getArticleVendorCode,
  getFlowId,
  groupFlowsByOrder,
  sumDispatchQuantities,
} from "../../utils/groupVendorProductionFlows";
import {
  dispatchStyleLinesForList,
  getDispatchTransferableRemaining,
} from "../dispatchTransferUtils";

export type VendorDispatchOrderTabProps = {
  flows: VendorProductionFlow[];
  loading?: boolean;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  itemsPerPage: number;
  setItemsPerPage: (v: number) => void;
  currentPage: number;
  setCurrentPage: (v: number | ((p: number) => number)) => void;
  onProcess: (flow: VendorProductionFlow) => void;
  showAll?: boolean;
};

/**
 * Order-wise tab — expandable VPO groups with nested dispatch article rows.
 */
export function VendorDispatchOrderTab({
  flows,
  loading = false,
  searchQuery,
  setSearchQuery,
  itemsPerPage,
  setItemsPerPage,
  currentPage,
  setCurrentPage,
  onProcess,
  showAll = false,
}: VendorDispatchOrderTabProps) {
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const orderGroups = useMemo(() => {
    const pool = filterDispatchFlowsForView(flows, showAll);
    const groups = groupFlowsByOrder(pool, sumDispatchQuantities);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;

    return groups.filter(
      (g) =>
        g.vpoNumber.toLowerCase().includes(q) ||
        g.vendorName.toLowerCase().includes(q) ||
        g.flows.some((f) => {
          const ref = f.referenceCode?.toLowerCase() || "";
          const product =
            typeof f.product === "object"
              ? f.product?.name?.toLowerCase() || ""
              : "";
          return ref.includes(q) || product.includes(q);
        }),
    );
  }, [flows, searchQuery, showAll]);

  const totalPages = Math.max(1, Math.ceil(orderGroups.length / itemsPerPage));
  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return orderGroups.slice(start, start + itemsPerPage);
  }, [orderGroups, currentPage, itemsPerPage]);

  const toggleOrder = (vpoId: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(vpoId)) next.delete(vpoId);
      else next.add(vpoId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-teal-600 border-t-transparent mb-3" />
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Loading orders…</p>
      </div>
    );
  }

  return (
    <div className="p-[10px]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="search"
            className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-teal-300 w-full placeholder:text-gray-400 font-medium"
            placeholder="Search by VPO, vendor, product…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Search orders"
          />
          <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
        </div>
        <select
          className="bg-white border border-gray-300 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5"
          value={itemsPerPage}
          onChange={(e) => {
            setItemsPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
          aria-label="Orders per page"
        >
          <option value={10}>Show 10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
      </div>

      <div className="min-h-[200px]">
        {paginatedGroups.length === 0 ? (
          <div className="py-20 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
            No dispatch orders found
          </div>
        ) : (
          <div className="divide-y divide-gray-100 border border-gray-200 rounded">
            {paginatedGroups.map((group) => {
              const isExpanded = expandedOrders.has(group.vpoId);
              return (
                <section key={group.vpoId}>
                  <button
                    type="button"
                    className="w-full flex flex-wrap items-center justify-between gap-3 px-[10px] py-3 text-left hover:bg-gray-50/80"
                    onClick={() => toggleOrder(group.vpoId)}
                    aria-expanded={isExpanded}
                    aria-label={`Toggle order ${group.vpoNumber}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <i
                        className={`ri-arrow-${isExpanded ? "down" : "right"}-s-line text-gray-400`}
                        aria-hidden="true"
                      />
                      <div>
                        <div className="text-[12px] font-bold text-gray-900">{group.vpoNumber}</div>
                        <div className="text-[10px] text-teal-600 font-semibold">{group.vendorName}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-[10px] font-bold text-gray-600">
                      <span>{group.flows.length} article(s)</span>
                      <span>FC: {group.totals.fcReceived.toLocaleString()}</span>
                      <span>Disp: {group.totals.dispReceived.toLocaleString()}</span>
                      <span>WH: {group.totals.whStaged.toLocaleString()}</span>
                      <span>Rem: {group.totals.remaining.toLocaleString()}</span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-[10px] pb-3 overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-200 text-[11px]">
                        <thead>
                          <tr className="bg-gray-50/30">
                            <th className="px-2 py-2 text-left font-bold text-[#495057] uppercase border border-gray-200">
                              Batch
                            </th>
                            <th className="px-2 py-2 text-right font-bold text-[#495057] uppercase border border-gray-200">
                              FC
                            </th>
                            <th className="px-2 py-2 text-right font-bold text-[#495057] uppercase border border-gray-200">
                              Disp
                            </th>
                            <th className="px-2 py-2 text-right font-bold text-[#495057] uppercase border border-gray-200">
                              WH
                            </th>
                            <th className="px-2 py-2 text-right font-bold text-[#495057] uppercase border border-gray-200">
                              Rem
                            </th>
                            <th className="px-2 py-2 text-left font-bold text-[#495057] uppercase border border-gray-200">
                              Brands
                            </th>
                            <th className="px-2 py-2 text-center font-bold text-[#495057] uppercase border border-gray-200">
                              QC
                            </th>
                            <th className="px-2 py-2 text-right font-bold text-[#495057] uppercase border border-gray-200">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.flows.map((flow) => {
                            const final = flow.floorQuantities.finalChecking;
                            const disp = flow.floorQuantities.dispatch;
                            const remaining = getDispatchTransferableRemaining(flow);
                            const dispRows = dispatchStyleLinesForList(flow);
                            const productName =
                              typeof flow.product === "object" ? flow.product?.name : undefined;
                            return (
                              <tr key={getFlowId(flow)} className="hover:bg-gray-50/50">
                                <td className="px-2 py-2 border border-gray-200">
                                  <div className="font-bold text-gray-900">{flow.referenceCode || "—"}</div>
                                  <div className="text-[10px] text-gray-500">{productName || "—"}</div>
                                  <div className="text-[10px] text-gray-500 font-semibold">
                                    {getArticleVendorCode(flow)}
                                  </div>
                                </td>
                                <td className="px-2 py-2 text-right border border-gray-200">
                                  {(final.received ?? 0).toLocaleString()}
                                </td>
                                <td className="px-2 py-2 text-right text-teal-600 font-medium border border-gray-200">
                                  {(disp?.received ?? 0).toLocaleString()}
                                </td>
                                <td className="px-2 py-2 text-right border border-gray-200">
                                  {(disp?.transferred ?? 0).toLocaleString()}
                                </td>
                                <td
                                  className={`px-2 py-2 text-right font-bold border border-gray-200 ${
                                    remaining <= 0 ? "text-gray-400" : "text-orange-600"
                                  }`}
                                >
                                  {remaining.toLocaleString()}
                                </td>
                                <td className="px-2 py-2 border border-gray-200">
                                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                                    {dispRows.length ? (
                                      dispRows.map((line, i) => (
                                        <span
                                          key={i}
                                          className="text-[10px] px-1 py-0.5 rounded border bg-gray-50 border-gray-100"
                                        >
                                          {formatTransferredRowLabel(line)}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-gray-400">—</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-2 py-2 text-center border border-gray-200">
                                  <span
                                    className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      flow.finalQualityConfirmed
                                        ? "bg-green-100 text-green-800"
                                        : "bg-yellow-100 text-yellow-800"
                                    }`}
                                  >
                                    {flow.finalQualityConfirmed ? "OK" : "PEND"}
                                  </span>
                                </td>
                                <td className="px-2 py-2 text-right border border-gray-200">
                                  <button
                                    type="button"
                                    onClick={() => onProcess(flow)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-teal-600 text-white rounded hover:bg-teal-700"
                                    aria-label={`Process ${productName || flow.referenceCode || "batch"}`}
                                  >
                                    <i className="ri-edit-line" aria-hidden />
                                    Process
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-[11px] text-gray-500">
        <p>
          Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
          {Math.min(currentPage * itemsPerPage, orderGroups.length)} of {orderGroups.length} orders
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="px-3 py-1.5 border border-gray-300 rounded text-[11px] font-bold hover:bg-gray-50 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="px-3 py-1.5 border border-gray-300 rounded text-[11px] font-bold hover:bg-gray-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
