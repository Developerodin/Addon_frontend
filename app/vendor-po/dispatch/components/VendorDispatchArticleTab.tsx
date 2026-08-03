"use client";

import React, { useMemo } from "react";
import type { VendorProductionFlow } from "@/shared/services/vendorProductionFlowService";
import ArticleProductImageButton from "@/shared/components/production/ArticleProductImageButton";
import {
  collectFactoryCodesFromProductFactoryCodes,
  useArticleProductImages,
} from "@/shared/hooks/useArticleProductImages";
import { formatTransferredRowLabel } from "../../utils/transferredStyleRows";
import {
  filterDispatchFlowsForView,
  flattenFlowsToArticles,
  getFlowId,
} from "../../utils/groupVendorProductionFlows";
import {
  dispatchStyleLinesForList,
  getDispatchTransferableRemaining,
} from "../dispatchTransferUtils";
import { collapseLinesByBrand, formatBrandLine } from "@/shared/utils/brandTransfer.util";

export type VendorDispatchArticleTabProps = {
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
  onScanContainerClick?: () => void;
};

/**
 * Article-wise tab — flat dispatch batches with production-floor table styling.
 */
export function VendorDispatchArticleTab({
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
  onScanContainerClick,
}: VendorDispatchArticleTabProps) {
  const articleRows = useMemo(() => {
    const pool = filterDispatchFlowsForView(flows, showAllArticles);
    const rows = flattenFlowsToArticles(pool);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter(
      (row) =>
        row.productName.toLowerCase().includes(q) ||
        row.factoryCode.toLowerCase().includes(q) ||
        row.vpoNumber.toLowerCase().includes(q) ||
        row.vendorName.toLowerCase().includes(q) ||
        row.vendorCode.toLowerCase().includes(q) ||
        (row.flow.referenceCode?.toLowerCase() || "").includes(q),
    );
  }, [flows, searchQuery, showAllArticles]);

  const factoryCodes = useMemo(
    () => collectFactoryCodesFromProductFactoryCodes(articleRows),
    [articleRows],
  );
  const { openProductImage, productImageModal } = useArticleProductImages(factoryCodes);

  const totalPages = Math.max(1, Math.ceil(articleRows.length / itemsPerPage));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return articleRows.slice(start, start + itemsPerPage);
  }, [articleRows, currentPage, itemsPerPage]);

  const handleExportExcel = () => {
    if (articleRows.length === 0) return;
    const header = [
      "Batch",
      "Product",
      "VPO",
      "Vendor",
      "FC Received",
      "Dispatch Received",
      "WH Staged",
      "Remaining",
      "Final QC",
    ];
    const lines = articleRows.map((row) => {
      const final = row.flow.floorQuantities.finalChecking;
      const disp = row.flow.floorQuantities.dispatch;
      return [
        row.flow.referenceCode || "",
        row.productName,
        row.vpoNumber,
        row.vendorName,
        String(final.received ?? 0),
        String(disp?.received ?? 0),
        String(disp?.transferred ?? 0),
        String(getDispatchTransferableRemaining(row.flow)),
        row.flow.finalQualityConfirmed ? "CONFIRMED" : "PENDING",
      ];
    });
    const csv = [header, ...lines]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vendor_dispatch_articles.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-teal-600 border-t-transparent mb-3" />
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Loading articles…</p>
      </div>
    );
  }

  return (
    <div className="p-[10px]">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {onScanContainerClick ? (
          <button
            type="button"
            onClick={onScanContainerClick}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
          >
            <i className="ri-qr-scan-2-line text-xs" aria-hidden />
            Scan container
          </button>
        ) : null}
        <div className="relative flex-1 min-w-[140px] max-w-[240px]">
          <input
            type="search"
            className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-teal-300 w-full placeholder:text-gray-400 font-medium"
            placeholder="Search batch, vendor, PO…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Search articles"
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
          aria-label="Articles per page"
        >
          <option value={10}>Show 10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
        <span className="text-[11px] font-medium text-[#495057]">
          {articleRows.length} batch{articleRows.length !== 1 ? "es" : ""}
        </span>
        <button
          type="button"
          onClick={handleExportExcel}
          disabled={articleRows.length === 0}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 disabled:opacity-50"
          title="Download current table rows as CSV"
        >
          <i className="ri-file-excel-2-line text-xs text-emerald-600" aria-hidden />
          Download Excel
        </button>
      </div>

      {paginatedRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <i className="ri-file-list-line text-xl text-gray-200" aria-hidden />
          </div>
          <h3 className="text-xs font-bold text-gray-400 mb-1">NO BATCHES</h3>
          <p className="text-[10px] text-gray-500">No dispatch batches match your filters</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50/30">
                <th className="pl-[10px] pr-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Batch / Product
                </th>
                <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Vendor &amp; PO
                </th>
                <th className="px-1.5 py-2.5 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  FC Rcv
                </th>
                <th className="px-1.5 py-2.5 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Disp Rcv
                </th>
                <th className="px-1.5 py-2.5 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  WH Stg
                </th>
                <th className="px-1.5 py-2.5 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Rem
                </th>
                <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Received (Brand)
                </th>
                <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Staged (Brand)
                </th>
                <th className="px-1.5 py-2.5 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Final QC
                </th>
                <th className="px-1.5 py-2.5 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((row) => {
                const final = row.flow.floorQuantities.finalChecking;
                const disp = row.flow.floorQuantities.dispatch;
                const remaining = getDispatchTransferableRemaining(row.flow);
                const receivedRows = dispatchStyleLinesForList(row.flow);
                const stagedRows = disp?.transferredData ?? [];
                return (
                  <tr key={getFlowId(row.flow)} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="pl-[10px] pr-1.5 py-2.5 border border-gray-200">
                      <div className="text-[12px] font-bold text-gray-900">
                        {row.flow.referenceCode || "—"}
                      </div>
                      <div className="text-[10px] text-gray-500">{row.productName}</div>
                      {row.factoryCode ? (
                        <div className="text-[10px] font-semibold text-purple-700">
                          {row.factoryCode}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <div className="text-[12px] font-bold text-teal-700">{row.vendorName}</div>
                      <div className="text-[10px] text-gray-500 font-semibold">VPO: {row.vpoNumber}</div>
                      <div className="text-[10px] text-gray-500 font-semibold mt-0.5">{row.vendorCode}</div>
                    </td>
                    <td className="px-1.5 py-2.5 text-center text-[12px] text-gray-700 border border-gray-200">
                      {(final.received ?? 0).toLocaleString()}
                    </td>
                    <td className="px-1.5 py-2.5 text-center text-[12px] text-teal-600 font-medium border border-gray-200">
                      {(disp?.received ?? 0).toLocaleString()}
                    </td>
                    <td className="px-1.5 py-2.5 text-center text-[12px] text-green-600 font-medium border border-gray-200">
                      {(disp?.transferred ?? 0).toLocaleString()}
                    </td>
                    <td
                      className={`px-1.5 py-2.5 text-center text-[12px] font-medium border border-gray-200 ${
                        remaining <= 0 ? "text-gray-400" : "text-orange-600"
                      }`}
                    >
                      {remaining.toLocaleString()}
                    </td>
                    <td className="px-1.5 py-2.5 border border-gray-200 text-[10px] text-gray-600 max-w-[140px]">
                      {receivedRows.length ? (
                        <div className="space-y-0.5">
                          {collapseLinesByBrand(receivedRows as { brand?: string; transferred?: number }[])
                            .slice(0, 3)
                            .map((line, i) => (
                              <div key={i} className="truncate font-medium">
                                {formatBrandLine(line)}
                              </div>
                            ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-1.5 py-2.5 border border-gray-200 text-[10px] text-gray-600 max-w-[140px]">
                      {stagedRows.length ? (
                        <div className="space-y-0.5">
                          {collapseLinesByBrand(stagedRows as { brand?: string; transferred?: number }[])
                            .slice(0, 3)
                            .map((line, i) => (
                              <div key={i} className="truncate font-medium">
                                {formatBrandLine(line)}
                              </div>
                            ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-1.5 py-2.5 text-center border border-gray-200">
                      <span
                        className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          row.flow.finalQualityConfirmed
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {row.flow.finalQualityConfirmed ? "CONFIRMED" : "PENDING"}
                      </span>
                    </td>
                    <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                      <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 flex-wrap">
                        <ArticleProductImageButton
                          factoryCode={row.factoryCode}
                          onClick={openProductImage}
                        />
                        <button
                          type="button"
                          onClick={() => onProcess(row.flow)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors"
                          aria-label={`Process ${row.productName}`}
                        >
                          <i className="ri-edit-line" aria-hidden />
                          Process
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-[11px] text-gray-500">
        <p>
          Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
          {Math.min(currentPage * itemsPerPage, articleRows.length)} of {articleRows.length}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="px-3 py-1.5 border border-gray-300 rounded text-[11px] font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="px-3 py-1.5 border border-gray-300 rounded text-[11px] font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
      {productImageModal}
    </div>
  );
}
