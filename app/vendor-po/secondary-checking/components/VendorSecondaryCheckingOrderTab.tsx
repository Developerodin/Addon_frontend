"use client";

import React, { useMemo, useState } from "react";
import type { VendorProductionFlow } from "@/shared/services/vendorProductionFlowService";
import {
  filterActiveScFlows,
  getFlowId,
  groupFlowsByOrder,
} from "../utils/groupVendorScFlows";
import { VendorSecondaryCheckingFlowRow } from "./VendorSecondaryCheckingQtyBadges";

export type VendorSecondaryCheckingOrderTabProps = {
  flows: VendorProductionFlow[];
  loading?: boolean;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  itemsPerPage: number;
  setItemsPerPage: (v: number) => void;
  currentPage: number;
  setCurrentPage: (v: number | ((p: number) => number)) => void;
  highlightVpoId?: string | null;
  highlightFlowId?: string | null;
  onProcess: (flow: VendorProductionFlow) => void;
};

/**
 * Order-wise tab — expandable VPO groups with nested article (product) rows.
 */
export function VendorSecondaryCheckingOrderTab({
  flows,
  loading = false,
  searchQuery,
  setSearchQuery,
  itemsPerPage,
  setItemsPerPage,
  currentPage,
  setCurrentPage,
  highlightVpoId = null,
  highlightFlowId = null,
  onProcess,
}: VendorSecondaryCheckingOrderTabProps) {
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const orderGroups = useMemo(() => {
    const active = filterActiveScFlows(flows);
    const groups = groupFlowsByOrder(active);
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
  }, [flows, searchQuery]);

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
        <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">
          Loading orders
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
            placeholder="Search by VPO, vendor, product..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Search orders"
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
            aria-label="Orders per page"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto min-h-[300px]">
        {paginatedGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              No orders found
            </p>
            <p className="text-[10px] text-gray-500 mt-1">
              Scan a box to start receiving on secondary checking
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {paginatedGroups.map((group) => {
              const isExpanded =
                expandedOrders.has(group.vpoId) ||
                highlightVpoId === group.vpoId;
              const isHighlighted = highlightVpoId === group.vpoId;

              return (
                <section
                  key={group.vpoId}
                  className={
                    isHighlighted
                      ? "bg-purple-50/60 ring-1 ring-inset ring-purple-200"
                      : ""
                  }
                >
                  <button
                    type="button"
                    className="w-full flex flex-wrap items-center justify-between gap-3 px-[10px] py-3 text-left hover:bg-gray-50/80 transition-colors"
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
                        <div className="text-[12px] font-bold text-gray-900">
                          {group.vpoNumber}
                        </div>
                        <div className="text-[10px] text-purple-600 font-semibold">
                          {group.vendorName}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-[10px] font-bold text-gray-600">
                      <span>{group.flows.length} article(s)</span>
                      <span>Recv: {group.totals.received.toLocaleString()}</span>
                      <span>Pending: {group.totals.pendingFromBoxes.toLocaleString()}</span>
                      <span>Rem: {group.totals.remaining.toLocaleString()}</span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="overflow-x-auto pb-2 px-[10px]">
                      <table className="w-full border-collapse border border-gray-200">
                        <thead>
                          <tr className="bg-gray-50/30">
                            <th className="px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase border border-gray-200">
                              Product
                            </th>
                            <th className="px-1.5 py-2 text-right text-[10px] font-bold text-[#495057] uppercase border border-gray-200">
                              Planned
                            </th>
                            <th className="px-1.5 py-2 text-right text-[10px] font-bold text-[#495057] uppercase border border-gray-200">
                              Pending Scan
                            </th>
                            <th className="px-1.5 py-2 text-right text-[10px] font-bold text-[#495057] uppercase border border-gray-200">
                              Received
                            </th>
                            <th className="px-1.5 py-2 text-right text-[10px] font-bold text-[#495057] uppercase border border-gray-200">
                              Remaining
                            </th>
                            <th className="px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase border border-gray-200">
                              M1/M2/M4
                            </th>
                            <th className="px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase border border-gray-200">
                              Status
                            </th>
                            <th className="px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase border border-gray-200">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.flows.map((flow) => (
                            <VendorSecondaryCheckingFlowRow
                              key={getFlowId(flow)}
                              flow={flow}
                              highlight={highlightFlowId === getFlowId(flow)}
                              onProcess={onProcess}
                            />
                          ))}
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

      <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100">
        <p className="text-[11px] font-medium text-[#495057]">
          Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
          {Math.min(currentPage * itemsPerPage, orderGroups.length)} of{" "}
          {orderGroups.length} orders
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
