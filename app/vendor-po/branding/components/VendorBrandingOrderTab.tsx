"use client";

import React, { useMemo, useState } from "react";
import type { VendorProductionFlow } from "@/shared/services/vendorProductionFlowService";
import { formatTransferredRowLabel } from "../../utils/transferredStyleRows";
import {
  filterBrandingFlowsForView,
  getArticleVendorCode,
  getFlowId,
  groupFlowsByOrder,
  sumBrandingQuantities,
} from "../../utils/groupVendorProductionFlows";
import { CRM } from "../../vendor-list/crmUiClasses";

export type VendorBrandingOrderTabProps = {
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
 * Order-wise tab — expandable VPO groups with nested branding article rows.
 */
export function VendorBrandingOrderTab({
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
}: VendorBrandingOrderTabProps) {
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const orderGroups = useMemo(() => {
    const pool = filterBrandingFlowsForView(flows, showAll);
    const groups = groupFlowsByOrder(pool, sumBrandingQuantities);
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
      <div className={CRM.loadingWrap}>
        <div className={CRM.spinner} />
        <p className={CRM.loadingLabel}>Loading orders...</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-[10px] pt-[10px]">
        <div className="relative w-full sm:w-80">
          <input
            type="search"
            className={CRM.inputSearch}
            placeholder="Search by VPO, vendor, product..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Search orders"
          />
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
        </div>
        <div className="flex items-center gap-2">
          <label className={`${CRM.label} mb-0`}>Show:</label>
          <select
            className={`${CRM.select} w-20`}
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

      <div className="min-h-[300px]">
        {paginatedGroups.length === 0 ? (
          <div className={`${CRM.emptyWrap} py-20 text-center`}>
            No branding orders found
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
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
                      <span>Comp: {group.totals.completed.toLocaleString()}</span>
                      <span>Rem: {group.totals.remaining.toLocaleString()}</span>
                      <span>Xfer: {group.totals.transferred.toLocaleString()}</span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className={`${CRM.tableWrap} px-[10px] pb-3`}>
                      <table className={CRM.table}>
                        <thead>
                          <tr className={CRM.theadTr}>
                            <th className={CRM.th}>Batch / Reference</th>
                            <th className={CRM.thRight}>Received</th>
                            <th className={CRM.thRight}>Completed</th>
                            <th className={CRM.thRight}>Remaining</th>
                            <th className={CRM.thRight}>Transferred</th>
                            <th className={CRM.th}>Style breakdown</th>
                            <th className={CRM.th}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.flows.map((flow) => {
                            const br = flow.floorQuantities.branding;
                            const productName =
                              typeof flow.product === "object"
                                ? flow.product?.name
                                : undefined;
                            return (
                              <tr key={getFlowId(flow)} className={CRM.tbodyTr}>
                                <td className={CRM.td}>
                                  <div className="font-bold text-gray-900 text-[12px]">
                                    {flow.referenceCode || "—"}
                                  </div>
                                  <div className="text-[10px] text-gray-400">
                                    {productName || "—"}
                                  </div>
                                  <div className="text-[10px] text-gray-500 font-semibold">
                                    {getArticleVendorCode(flow)}
                                  </div>
                                </td>
                                <td className={`${CRM.td} text-right font-medium`}>
                                  {(br.received ?? 0).toLocaleString()}
                                </td>
                                <td className={`${CRM.td} text-right font-bold text-emerald-600`}>
                                  {(br.completed ?? 0).toLocaleString()}
                                </td>
                                <td className={`${CRM.td} text-right font-medium text-amber-900`}>
                                  {(br.remaining ?? 0).toLocaleString()}
                                </td>
                                <td className={`${CRM.td} text-right font-medium text-purple-800`}>
                                  {(br.transferred ?? 0).toLocaleString()}
                                </td>
                                <td className={CRM.td}>
                                  <div className="text-[10px] flex flex-wrap gap-1">
                                    {br.transferredData?.length ? (
                                      br.transferredData.map((row, i) => (
                                        <span
                                          key={i}
                                          className="bg-gray-50 border border-gray-100 px-1 py-0.5 rounded"
                                        >
                                          {formatTransferredRowLabel(row)}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-gray-400">—</span>
                                    )}
                                  </div>
                                </td>
                                <td className={CRM.td}>
                                  <button
                                    type="button"
                                    onClick={() => onProcess(flow)}
                                    className={CRM.btnPrimarySm}
                                    aria-label={`Process ${productName || flow.referenceCode || "batch"}`}
                                  >
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

      <div className={CRM.paginationBar}>
        <p className={CRM.paginationSummary}>
          Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
          {Math.min(currentPage * itemsPerPage, orderGroups.length)} of{" "}
          {orderGroups.length} orders
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className={CRM.pageNavBtn}
          >
            Previous
          </button>
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className={CRM.pageNavBtn}
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}
