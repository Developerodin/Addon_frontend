"use client";

import React, { useEffect, useMemo, useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";
import YarnReportCalcInfoPopover from "./components/YarnReportCalcInfoPopover";
import {
  yarnInventoryService,
  YarnReportRow,
  YarnReportResponse,
} from "../services/yarnInventoryService";
import PaginationControls from "../components/PaginationControls";

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 20;

const YARN_REPORT_COLUMNS: { key: keyof YarnReportRow; label: string }[] = [
  { key: "store", label: "Store" },
  { key: "hsnCode", label: "HSN Code" },
  { key: "yarnName", label: "Yarn Name" },
  { key: "brand", label: "Brand" },
  { key: "shadeNumber", label: "Shade No" },
  { key: "yarnType", label: "Yarn Type" },
  { key: "yarnSubtype", label: "Yarn Subtype" },
  { key: "count", label: "Count" },
  { key: "colorFamily", label: "Color Family" },
  { key: "pantoneColorName", label: "Pantone Color" },
  { key: "opening", label: "Opening" },
  { key: "pur", label: "PUR" },
  { key: "purRet", label: "PUR Ret" },
  { key: "yarnIssueToKnitting", label: "Issue to Knitting" },
  { key: "yarnReturnedFromKnitting", label: "Returned from Knitting" },
  { key: "balance", label: "Balance" },
  { key: "rate", label: "Rate" },
  { key: "unit", label: "Unit" },
  { key: "gstPercent", label: "GST %" },
  { key: "amount", label: "Amount" },
];

const YarnReportPage = () => {
  const { hasSubPermission } = useNavigation();
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<YarnReportResponse | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const hasPermission = hasSubPermission("/yarn-management", "Dashboard");

  const totalResults = report?.results?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize) || 1);

  const paginatedRows = useMemo(() => {
    const rows = report?.results ?? [];
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [report?.results, currentPage, pageSize]);

  /** Keeps current page in range when result count or page size changes. */
  useEffect(() => {
    if (!report) return;
    setCurrentPage((p) => (p > totalPages ? totalPages : p));
  }, [report, totalPages]);

  /**
   * Updates rows-per-page and resets to the first page so the slice stays valid.
   */
  const handlePageSizeChange = (next: number) => {
    setPageSize(next);
    setCurrentPage(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission) return;
    setSubmitError(null);
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }
    if (startDate > endDate) {
      toast.error("Start date must be before or equal to end date");
      return;
    }

    setLoading(true);
    setReport(null);
    try {
      const data = await yarnInventoryService.getYarnReport({
        start_date: startDate,
        end_date: endDate,
      });
      setReport(data);
      setCurrentPage(1);
      toast.success("Report loaded");
    } catch (err) {
      console.error("Yarn report error:", err);
      const message =
        err instanceof Error ? err.message : "Failed to load yarn report";
      setSubmitError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = () => {
    if (!report?.results?.length) {
      toast.error("No data to download");
      return;
    }

    setDownloading(true);
    try {
      const sheetData = report.results.map((row) => ({
        Store: row.store,
        "HSN Code": row.hsnCode,
        "Yarn Name": row.yarnName,
        Brand: row.brand,
        "Shade No": row.shadeNumber,
        "Yarn Type": row.yarnType,
        "Yarn Subtype": row.yarnSubtype,
        Count: row.count,
        "Color Family": row.colorFamily,
        "Pantone Color": row.pantoneColorName,
        Opening: row.opening,
        PUR: row.pur,
        "PUR Ret": row.purRet,
        "Issue to Knitting": row.yarnIssueToKnitting,
        "Returned from Knitting": row.yarnReturnedFromKnitting,
        Balance: row.balance,
        Rate: row.rate,
        Unit: row.unit,
        "GST %": row.gstPercent,
        Amount: row.amount,
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Yarn Report");
      const fileName = `yarn-report_${report.startDate}_to_${report.endDate}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.success("Downloaded");
    } catch (err) {
      console.error("Excel export error:", err);
      toast.error("Failed to download Excel");
    } finally {
      setDownloading(false);
    }
  };

  if (!hasPermission) {
    return (
      <div className="main-content !p-[10px]">
        <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 p-[10px]">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-gray-400 mb-4">
              <i className="ri-lock-line text-5xl"></i>
            </div>
            <h3 className="text-xs font-bold text-gray-400 mb-1">
              Access Restricted
            </h3>
            <p className="text-[11px] text-gray-500 mb-4">
              You don&apos;t have permission to access Yarn Report.
            </p>
            <Link
              href="/yarn-management/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
            >
              <i className="ri-arrow-left-line"></i> Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Yarn Report" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Link
                href="/yarn-management/dashboard"
                className="w-9 h-9 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
                aria-label="Back to dashboard"
              >
                <i className="ri-arrow-left-line text-lg"></i>
              </Link>
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Yarn Report</h1>
              <YarnReportCalcInfoPopover
                startDate={startDate}
                endDate={endDate}
              />
            </div>
          </div>

          {/* Date range form */}
          {submitError && (
            <div
              className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800"
              role="alert"
              aria-live="polite"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-extrabold text-red-900 mb-0.5">
                    Failed to load yarn report
                  </div>
                  <div className="break-words">{submitError}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmitError(null)}
                  className="shrink-0 w-7 h-7 inline-flex items-center justify-center rounded hover:bg-red-100 text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  aria-label="Dismiss error"
                >
                  <i className="ri-close-line text-base" aria-hidden></i>
                </button>
              </div>
            </div>
          )}
          <form
            onSubmit={handleSubmit}
            className="flex flex-wrap items-end gap-3 mb-4 p-3 bg-gray-50 rounded border border-gray-100"
          >
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs py-1.5 px-2 border border-gray-200 rounded bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs py-1.5 px-2 border border-gray-200 rounded bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <i className="ri-loader-4-line animate-spin text-xs"></i>
                  Loading
                </>
              ) : (
                <>
                  <i className="ri-file-list-3-line text-xs"></i>
                  Submit
                </>
              )}
            </button>
          </form>

          {/* Download button - shown when report loaded */}
          {report && (
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="yarn-report-page-size"
                  className="text-[10px] font-bold text-gray-500 whitespace-nowrap"
                >
                  Rows per page
                </label>
                <select
                  id="yarn-report-page-size"
                  value={pageSize}
                  onChange={(e) =>
                    handlePageSizeChange(Number(e.target.value))
                  }
                  className="text-xs py-1.5 px-2 border border-gray-200 rounded bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  aria-label="Rows per page"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleDownloadExcel}
                disabled={downloading || !report.results?.length}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {downloading ? (
                  <>
                    <i className="ri-loader-4-line animate-spin text-xs"></i>
                    Downloading
                  </>
                ) : (
                  <>
                    <i className="ri-download-2-line text-xs"></i>
                    Download Excel
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Excel-like table - read-only */}
        <div className="overflow-x-auto">
          {report ? (
            report.results?.length > 0 ? (
              <table className="min-w-full text-[11px] border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    {YARN_REPORT_COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        className="px-2 py-2 text-left font-bold text-gray-700 whitespace-nowrap border-r border-gray-200 last:border-r-0"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((row, idx) => (
                    <tr
                      key={(currentPage - 1) * pageSize + idx}
                      className="border-b border-gray-100 hover:bg-gray-50/50"
                    >
                      {YARN_REPORT_COLUMNS.map((col) => (
                        <td
                          key={col.key}
                          className="px-2 py-1.5 text-gray-800 border-r border-gray-100 last:border-r-0"
                        >
                          {typeof row[col.key] === "number"
                            ? (row[col.key] as number).toLocaleString()
                            : String(row[col.key] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <i className="ri-file-list-line text-4xl text-gray-300 mb-3"></i>
                <p className="text-xs text-gray-500">No data for selected date range</p>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <i className="ri-file-chart-line text-4xl text-gray-300 mb-3"></i>
              <p className="text-xs text-gray-500">
                Select date range and click Submit to view report
              </p>
            </div>
          )}
        </div>

        {report && report.results && report.results.length > 0 && (
          <div className="border-t border-gray-100 px-3 py-3 bg-gray-50/50">
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              totalResults={totalResults}
              pageSize={pageSize}
              loading={loading}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default YarnReportPage;
