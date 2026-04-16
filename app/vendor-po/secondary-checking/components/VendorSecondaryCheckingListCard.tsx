"use client";

import React, { useMemo } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import HelpIcon from "@/shared/components/HelpIcon";
import type { VendorProductionFlow } from "@/shared/services/vendorProductionFlowService";

type Props = {
  loading: boolean;
  flows: VendorProductionFlow[];
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  itemsPerPage: number;
  setItemsPerPage: (v: number) => void;
  currentPage: number;
  setCurrentPage: (v: number | ((p: number) => number)) => void;
  onRefresh: () => void;
  onOpenCreate: () => void;
  onOpenProcess: (flow: VendorProductionFlow) => void;
};

function statusBadgeClass(flow: VendorProductionFlow): string {
  const isCompleted =
    (flow.floorQuantities.secondaryChecking.completed ?? 0) > 0;
  if (isCompleted)
    return "inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight bg-green-100 text-green-800";
  return "inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight bg-red-100 text-red-800";
}

export function VendorSecondaryCheckingListCard({
  loading,
  flows,
  searchQuery,
  setSearchQuery,
  itemsPerPage,
  setItemsPerPage,
  currentPage,
  setCurrentPage,
  onRefresh,
  onOpenCreate,
  onOpenProcess,
}: Props) {
  const filteredFlows = useMemo(() => {
    return flows.filter((f) => {
      const q = searchQuery.trim().toLowerCase();
      const refCode = f.referenceCode?.toLowerCase() || "";
      const vendorName =
        typeof f.vendor === "object"
          ? f.vendor?.header?.vendorName?.toLowerCase() || ""
          : "";
      const poNumber =
        typeof f.vendorPurchaseOrder === "object"
          ? f.vendorPurchaseOrder?.vpoNumber?.toLowerCase() || ""
          : "";
      return (
        !q ||
        refCode.includes(q) ||
        vendorName.includes(q) ||
        poNumber.includes(q)
      );
    });
  }, [flows, searchQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredFlows.length / itemsPerPage),
  );
  const paginatedFlows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredFlows.slice(start, start + itemsPerPage);
  }, [filteredFlows, currentPage, itemsPerPage]);

  if (loading) {
    return (
      <div className="main-content !p-[10px]">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
          <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">
            Loading Data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Secondary Checking" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
              <h1 className="text-sm font-bold text-gray-800">
                Secondary Checking Floor
              </h1>
              <HelpIcon
                title="Secondary Checking"
                content="Monitor and record quality status for vendor production batches. This is the first quality gate in the vendor flow."
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onOpenCreate}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              >
                <i className="ri-add-line text-xs" />
                Add New Batch
              </button>
              <button
                onClick={onRefresh}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
              >
                <i className="ri-refresh-line text-xs" />
                Refresh
              </button>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:w-80 min-w-[200px]">
              <input
                type="text"
                className="w-full bg-white border-2 border-gray-600 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:!border-2 focus:!border-gray-600 focus:outline-none placeholder:text-gray-600 transition-all font-medium"
                placeholder="Search by Batch, Vendor or PO..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[11px] font-medium text-[#495057] mb-0">
                Show:
              </label>
              <select
                className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-2 py-1.5 pr-7 focus:ring-0 focus:border-gray-300 appearance-none cursor-pointer w-20"
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50/30">
                <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Batch / Reference
                </th>
                <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Vendor &amp; PO
                </th>
                <th className="px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Planned
                </th>
                <th className="px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Pending Scan
                </th>
                <th className="px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Received
                </th>
                <th className="px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Remaining
                </th>
                <th className="px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Transferred
                </th>
                <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  M1/M2/M4 Counts
                </th>
                <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Status
                </th>
                <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedFlows.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-1.5 py-10 border border-gray-200 text-center text-gray-400 text-xs font-bold tracking-widest uppercase"
                  >
                    No batches found
                  </td>
                </tr>
              ) : (
                paginatedFlows.map((flow) => {
                  const sc = flow.floorQuantities.secondaryChecking;
                  const vendorName =
                    typeof flow.vendor === "object"
                      ? flow.vendor?.header?.vendorName
                      : "Unknown";
                  const poNumber =
                    typeof flow.vendorPurchaseOrder === "object"
                      ? flow.vendorPurchaseOrder?.vpoNumber
                      : "N/A";
                  return (
                    <tr
                      key={flow.id}
                      className="hover:bg-gray-50/50 transition-colors group"
                    >
                      <td className="px-1.5 py-2.5 border border-gray-200">
                        <div className="font-bold text-gray-900 text-[12px]">
                          {flow.referenceCode || "—"}
                        </div>
                        <div className="text-[10px] text-gray-400 font-medium tracking-tight uppercase leading-none">
                          ID: {flow.id.slice(-6)}
                        </div>
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-200">
                        <div className="font-bold text-purple-600 underline underline-offset-2 decoration-purple-200">
                          {vendorName}
                        </div>
                        <div className="text-[10px] text-gray-500 font-bold mt-0.5">
                          VPO: {poNumber}
                        </div>
                      </td>
                      <td className="px-1.5 py-2.5 text-right font-bold text-gray-800 text-[12px] border border-gray-200">
                        {flow.plannedQuantity.toLocaleString()}
                      </td>
                      <td className="px-1.5 py-2.5 text-right border border-gray-200">
                        {(sc.pendingFromBoxes ?? 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-50 border border-orange-200 text-[10px] font-bold text-orange-700">
                            <i className="ri-barcode-line text-[9px]" />
                            {(sc.pendingFromBoxes ?? 0).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400 font-medium">
                            0
                          </span>
                        )}
                      </td>
                      <td className="px-1.5 py-2.5 text-right font-medium text-gray-700 text-[12px] border border-gray-200">
                        {sc.received.toLocaleString()}
                      </td>
                      <td className="px-1.5 py-2.5 text-right font-bold text-amber-800 text-[12px] border border-gray-200">
                        {(sc.remaining ?? 0).toLocaleString()}
                      </td>
                      <td className="px-1.5 py-2.5 text-right font-medium text-gray-600 text-[12px] border border-gray-200">
                        {(sc.transferred ?? 0).toLocaleString()}
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-200">
                        <div className="flex gap-2">
                          <div className="bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                            <span className="text-emerald-700 font-bold text-[10px]">
                              M1: {sc.m1Quantity ?? 0}
                            </span>
                          </div>
                          <div className="bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                            <span className="text-amber-700 font-bold text-[10px]">
                              M2: {sc.m2Quantity ?? 0}
                            </span>
                          </div>
                          <div className="bg-red-50 border border-red-100 px-1.5 py-0.5 rounded">
                            <span className="text-red-700 font-bold text-[10px]">
                              M4: {sc.m4Quantity ?? 0}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-200">
                        <span className={statusBadgeClass(flow)}>
                          {sc.completed > 0 ? "Completed" : "Pending"}
                        </span>
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-200">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onOpenProcess(flow)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                          >
                            Process
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

        <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white">
          <p className="text-[11px] font-medium text-[#495057] tracking-tight">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, filteredFlows.length)} of{" "}
            {filteredFlows.length} entries
          </p>
          <div className="flex items-center gap-1">
            <button
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
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
