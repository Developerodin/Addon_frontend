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
  YarnReportSnapshotBoundsResponse,
} from "../services/yarnInventoryService";
import PaginationControls from "../components/PaginationControls";

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 20;

/** Local calendar YYYY-MM-DD (avoid UTC drift from `toISOString()` on date inputs). */
const formatLocalYmd = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const minYmd = (a: string, b: string) => (a <= b ? a : b);
const maxYmd = (a: string, b: string) => (a >= b ? a : b);

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
  const now = new Date();
  const todayStr = formatLocalYmd(now);
  const firstOfMonthStr = formatLocalYmd(
    new Date(now.getFullYear(), now.getMonth(), 1)
  );

  const [startDate, setStartDate] = useState(() =>
    firstOfMonthStr > todayStr ? todayStr : firstOfMonthStr
  );
  const [endDate, setEndDate] = useState(todayStr);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<YarnReportResponse | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [snapshotBounds, setSnapshotBounds] =
    useState<YarnReportSnapshotBoundsResponse | null>(null);
  const [boundsLoading, setBoundsLoading] = useState(false);
  const [boundsError, setBoundsError] = useState<string | null>(null);

  const hasPermission = hasSubPermission("/yarn-management", "Analytics & reports");

  const endMaxUi = useMemo(() => {
    if (!snapshotBounds?.datePicker.endMax) return todayStr;
    return minYmd(todayStr, snapshotBounds.datePicker.endMax);
  }, [snapshotBounds, todayStr]);

  const startMinUi = snapshotBounds?.datePicker.startMin ?? "2020-01-01";

  const endMinUi = useMemo(() => {
    if (!snapshotBounds?.datePicker.endMin) return startDate;
    return maxYmd(startDate, snapshotBounds.datePicker.endMin);
  }, [snapshotBounds, startDate]);

  const startMaxUi = useMemo(() => {
    if (!snapshotBounds?.datePicker.startMax) return endDate;
    return minYmd(endDate, snapshotBounds.datePicker.startMax);
  }, [snapshotBounds, endDate]);

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

  /** Load snapshot coverage for date picker hints and limits. */
  useEffect(() => {
    if (!hasPermission) return;
    let cancelled = false;
    setBoundsLoading(true);
    setBoundsError(null);
    yarnInventoryService
      .getYarnReportSnapshotBounds()
      .then((data) => {
        if (cancelled) return;
        setSnapshotBounds(data);
        if (data.widestValidReportRange) {
          setStartDate(data.widestValidReportRange.start_date);
          setEndDate(data.widestValidReportRange.end_date);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Yarn snapshot bounds:", err);
        setBoundsError(
          err instanceof Error ? err.message : "Could not load snapshot coverage"
        );
      })
      .finally(() => {
        if (!cancelled) setBoundsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasPermission]);

  /**
   * Updates rows-per-page and resets to the first page so the slice stays valid.
   */
  const handlePageSizeChange = (next: number) => {
    setPageSize(next);
    setCurrentPage(1);
  };

  /**
   * Start date cannot exceed end date or fall before earliest allowed opening chain.
   */
  const handleStartDateChange = (value: string) => {
    let next = value;
    if (next && next < startMinUi) {
      next = startMinUi;
    }
    if (next && next > startMaxUi) {
      next = startMaxUi;
    }
    setStartDate(next);
    if (next && endDate < next) {
      setEndDate(next);
    }
  };

  /**
   * End date cannot be before start, after today, or after latest closing snapshot.
   */
  const handleEndDateChange = (value: string) => {
    let capped = value > endMaxUi ? endMaxUi : value;
    if (capped < endMinUi) {
      capped = endMinUi;
    }
    setEndDate(capped);
    if (capped && startDate > capped) {
      setStartDate(capped);
    }
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

    const blankExcelRow = (): Record<string, string | number> => ({
      Store: "",
      "HSN Code": "",
      "Yarn Name": "",
      Brand: "",
      "Shade No": "",
      "Yarn Type": "",
      "Yarn Subtype": "",
      Count: "",
      "Color Family": "",
      "Pantone Color": "",
      Opening: "",
      PUR: "",
      "PUR Ret": "",
      "Issue to Knitting": "",
      "Returned from Knitting": "",
      Balance: "",
      Rate: "",
      Unit: "",
      "GST %": "",
      Amount: "",
    });

    setDownloading(true);
    try {
      const sheetData: Record<string, string | number>[] = report.results.map(
        (row) => ({
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
        })
      );

      const summary = report.meta?.summary;
      if (summary) {
        sheetData.push(blankExcelRow());
        sheetData.push({
          ...blankExcelRow(),
          Store:
            "— meta.summary totals (do not sum Balance column above) —",
        });
        sheetData.push({
          ...blankExcelRow(),
          Store: "uniqueYarnOpeningKgSum (dedup)",
          Opening: summary.uniqueYarnOpeningKgSum,
        });
        sheetData.push({
          ...blankExcelRow(),
          Store: "sumDisplayedOpeningAcrossRowsKg (Σ table)",
          Opening: summary.sumDisplayedOpeningAcrossRowsKg,
        });
        sheetData.push({
          ...blankExcelRow(),
          Store: "uniqueYarnClosingKgSum (dedup)",
          Balance: summary.uniqueYarnClosingKgSum,
        });
        sheetData.push({
          ...blankExcelRow(),
          Store: "sumDisplayedBalanceAcrossRowsKg (Σ table)",
          Balance: summary.sumDisplayedBalanceAcrossRowsKg,
        });
        sheetData.push({
          ...blankExcelRow(),
          Store: "snapshot yarns / report rows",
          Balance: `${summary.snapshotClosingYarnCatalogCount} / ${summary.reportRowCount}`,
        });
      }

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
                startDate={report?.startDate ?? startDate}
                endDate={report?.endDate ?? endDate}
                totalsSummary={report?.meta?.summary ?? null}
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
            <div className="w-full basis-full space-y-1.5">
              {boundsLoading && (
                <p className="text-[10px] text-gray-500" role="status">
                  Loading snapshot coverage…
                </p>
              )}
              {boundsError && (
                <p
                  className="text-[10px] text-amber-800 bg-amber-50 border border-amber-100 rounded px-2 py-1.5"
                  role="status"
                >
                  {boundsError} — date limits fall back to calendar only.
                </p>
              )}
              {snapshotBounds &&
                !boundsLoading &&
                snapshotBounds.earliestSnapshotDate &&
                snapshotBounds.latestSnapshotDate && (
                  <p
                    className="text-[11px] leading-snug text-emerald-900 bg-emerald-50 border border-emerald-100 rounded px-2.5 py-2"
                    role="note"
                  >
                    <span className="font-bold text-emerald-950">
                      Closing snapshot dates on file:{" "}
                    </span>
                    <span className="font-mono font-semibold">
                      {snapshotBounds.earliestSnapshotDate}
                    </span>
                    {" → "}
                    <span className="font-mono font-semibold">
                      {snapshotBounds.latestSnapshotDate}
                    </span>
                    <span className="text-emerald-800">
                      {" "}
                      ({snapshotBounds.distinctSnapshotDates} day
                      {snapshotBounds.distinctSnapshotDates === 1 ? "" : "s"},{" "}
                      {snapshotBounds.totalSnapshotRows.toLocaleString()} rows).{" "}
                    </span>
                    {snapshotBounds.widestValidReportRange ? (
                      <span className="text-emerald-800">
                        Widest valid range:{" "}
                        <span className="font-mono font-semibold">
                          {snapshotBounds.widestValidReportRange.start_date}
                        </span>
                        {" — "}
                        <span className="font-mono font-semibold">
                          {snapshotBounds.widestValidReportRange.end_date}
                        </span>
                        .{" "}
                      </span>
                    ) : null}
                    <span className="text-emerald-800/95">
                      {snapshotBounds.yarnReportHelp}
                    </span>
                  </p>
                )}
              {snapshotBounds &&
                !boundsLoading &&
                !snapshotBounds.earliestSnapshotDate && (
                  <p
                    className="text-[11px] text-amber-900 bg-amber-50 border border-amber-100 rounded px-2.5 py-2"
                    role="note"
                  >
                    No yarn daily closing snapshots yet — run the nightly snapshot job or
                    backfill before this report can load.
                  </p>
                )}
            </div>
            <div>
              <label
                htmlFor="yarn-report-start-date"
                className="block text-[10px] font-bold text-gray-500 mb-1"
              >
                Start Date
              </label>
              <input
                id="yarn-report-start-date"
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                max={startMaxUi}
                min={startMinUi}
                className="text-xs py-1.5 px-2 border border-gray-200 rounded bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                required
                aria-label="Report start date"
              />
            </div>
            <div>
              <label
                htmlFor="yarn-report-end-date"
                className="block text-[10px] font-bold text-gray-500 mb-1"
              >
                End Date
              </label>
              <input
                id="yarn-report-end-date"
                type="date"
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                min={endMinUi}
                max={endMaxUi}
                className="text-xs py-1.5 px-2 border border-gray-200 rounded bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                required
                aria-label="Report end date"
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

          {report?.meta?.summary ? (
            <div
              className="mx-[10px] mb-4 rounded border border-blue-100 bg-blue-50/90 px-3 py-2.5"
              role="region"
              aria-label="Dedup yarn snapshot totals"
            >
              <div className="text-[10px] font-extrabold text-blue-950 mb-1.5">
                Snapshot totals (compare to inventory — not Σ Balance column)
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-blue-950">
                <div className="flex flex-wrap gap-1 justify-between gap-x-2">
                  <dt className="text-blue-900/90">Opening snapshot date</dt>
                  <dd className="font-mono font-semibold">
                    {report.meta.openingSnapshotDate}
                  </dd>
                </div>
                <div className="flex flex-wrap gap-1 justify-between gap-x-2">
                  <dt className="text-blue-900/90">Closing snapshot date</dt>
                  <dd className="font-mono font-semibold">
                    {report.meta.closingSnapshotDate}
                  </dd>
                </div>
                <div className="flex flex-wrap gap-1 justify-between gap-x-2 sm:col-span-2">
                  <dt className="text-blue-900/90">uniqueYarnClosingKgSum (dedup kg)</dt>
                  <dd className="font-mono font-bold">
                    {report.meta.summary.uniqueYarnClosingKgSum.toLocaleString()} kg
                  </dd>
                </div>
                <div className="flex flex-wrap gap-1 justify-between gap-x-2 sm:col-span-2">
                  <dt className="text-blue-900/90">Σ Balance across table rows</dt>
                  <dd className="font-mono font-semibold">
                    {report.meta.summary.sumDisplayedBalanceAcrossRowsKg.toLocaleString()} kg
                    <span className="font-sans font-normal text-blue-900/80 ml-1">
                      (inflates when one yarn spans multiple rows)
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}

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
