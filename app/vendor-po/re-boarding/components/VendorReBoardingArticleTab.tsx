"use client";

import React, { useMemo } from "react";
import type { VendorProductionFlow } from "@/shared/services/vendorProductionFlowService";
import { formatTransferredRowLabel } from "../../utils/transferredStyleRows";
import {
  filterReBoardingFlowsForView,
  flattenFlowsToArticles,
  getFlowId,
} from "../../utils/groupVendorProductionFlows";
import { CRM } from "../../vendor-list/crmUiClasses";

/**
 * Escape a cell value for CSV export.
 * @param value - Raw cell value
 */
function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

/**
 * Trigger a CSV download in the browser (Excel-compatible).
 * @param filename - Download filename
 * @param rows - CSV rows including header
 */
function downloadCsv(filename: string, rows: (string | number)[][]): void {
  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export type VendorReBoardingArticleTabProps = {
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
 * Article-wise tab — flat branding batches with VPO context.
 */
export function VendorReBoardingArticleTab({
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
}: VendorReBoardingArticleTabProps) {
  const articleRows = useMemo(() => {
    const pool = filterReBoardingFlowsForView(flows, showAllArticles);
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

  /** Export filtered article rows as CSV (Excel-compatible). */
  const handleExportExcel = () => {
    if (articleRows.length === 0) return;
    const header = [
      "Batch Ref",
      "Product",
      "VPO",
      "Vendor",
      "Vendor Code",
      "Received",
      "Completed",
      "Remaining",
      "Transferred",
      "Style breakdown",
    ];
    const lines = articleRows.map((row) => {
      const br = row.flow.floorQuantities.reBoarding;
      const styleBreakdown = br.transferredData?.length
        ? br.transferredData.map((t) => formatTransferredRowLabel(t)).join("; ")
        : "";
      return [
        row.flow.referenceCode || "",
        row.productName,
        row.vpoNumber,
        row.vendorName,
        row.vendorCode,
        String(br.received ?? 0),
        String(br.completed ?? 0),
        String(br.remaining ?? 0),
        String(br.transferred ?? 0),
        styleBreakdown,
      ];
    });
    downloadCsv("vendor_re_boarding_articles.csv", [header, ...lines]);
  };

  if (loading) {
    return (
      <div className={CRM.loadingWrap}>
        <div className={CRM.spinner} />
        <p className={CRM.loadingLabel}>Loading articles...</p>
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
            placeholder="Search by batch, vendor or PO..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Search articles"
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
            aria-label="Articles per page"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={articleRows.length === 0}
            className={`${CRM.btnSecondary} disabled:opacity-50`}
            title="Download filtered rows as CSV"
            aria-label="Export re-boarding articles to Excel"
          >
            <i className="ri-file-excel-2-line text-xs text-emerald-600" aria-hidden="true" />
            Download Excel
          </button>
        </div>
      </div>

      <div className={CRM.tableWrap}>
        <table className={CRM.table}>
          <thead>
            <tr className={CRM.theadTr}>
              <th className={CRM.th}>Batch / Reference</th>
              <th className={CRM.th}>Vendor &amp; PO</th>
              <th className={CRM.thRight}>Received</th>
              <th className={CRM.thRight}>Completed</th>
              <th className={CRM.thRight}>Remaining</th>
              <th className={CRM.thRight}>Transferred</th>
              <th className={CRM.th}>Style breakdown</th>
              <th className={CRM.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={8} className={`${CRM.emptyWrap} py-20 text-center`}>
                  No re-boarding tasks found
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => {
                const br = row.flow.floorQuantities.reBoarding;
                return (
                  <tr key={getFlowId(row.flow)} className={CRM.tbodyTr}>
                    <td className={CRM.td}>
                      <div className="font-bold text-gray-900 text-[12px]">
                        {row.flow.referenceCode || "—"}
                      </div>
                      <div className="text-[10px] text-gray-400 uppercase font-medium leading-none">
                        {row.productName}
                      </div>
                    </td>
                    <td className={CRM.td}>
                      <div className="font-bold text-purple-600 underline decoration-purple-200 underline-offset-2">
                        {row.vendorName}
                      </div>
                      <div className="text-[10px] text-gray-500 font-bold mt-0.5">
                        VPO: {row.vpoNumber}
                      </div>
                      <div className="text-[10px] text-gray-500 font-semibold mt-0.5">
                        {row.vendorCode}
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
                          br.transferredData.map((t, i) => (
                            <span
                              key={i}
                              className="bg-gray-50 border border-gray-100 px-1 py-0.5 rounded"
                            >
                              {formatTransferredRowLabel(t)}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className={CRM.td}>
                      <div className={CRM.rowActions}>
                        <button
                          type="button"
                          onClick={() => onProcess(row.flow)}
                          className={CRM.btnPrimarySm}
                          aria-label={`Process ${row.productName}`}
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

      <div className={CRM.paginationBar}>
        <p className={CRM.paginationSummary}>
          Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
          {Math.min(currentPage * itemsPerPage, articleRows.length)} of{" "}
          {articleRows.length} batches
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
