"use client";

import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import {
  fetchYarnIssueActivityLogPaged,
  getDefaultActivityLogEndDate,
  getDefaultActivityLogStartDate,
  type YarnIssueActivityLogRow,
} from "@/app/yarn-management/yarn-issue/yarnIssueActivityLogService";
import { downloadYarnIssueActivityLogExcel } from "@/app/yarn-management/yarn-issue/yarnIssueActivityLogExcelExport";

const PAGE_SIZE = 20;

/**
 * Formats an ISO timestamp as a locale date string (date portion only).
 */
function formatIsoDateOnly(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}

/**
 * Resolves yarn type label from populated catalog fields.
 */
function yarnTypeLabel(row: YarnIssueActivityLogRow): string {
  return row.yarn?.yarnType?.name || row.yarnCatalogId?.yarnType?.name || "—";
}

/**
 * Formats populated cone refs (or raw ids) for table display.
 */
function formatConeBarcodes(row: YarnIssueActivityLogRow): string {
  const cones = row.conesIdsArray;
  if (!cones?.length) return "—";
  const parts = cones.map((c) => {
    if (typeof c === "string") return c;
    return c?.barcode || c?._id || "—";
  });
  return parts.filter((p) => p !== "—").join(", ") || "—";
}

export interface YarnIssueActivityLogDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Bump after a new issue so the open drawer reloads. */
  refreshKey?: number;
}

/**
 * Right drawer for order yarn-issue activity log: last 30 days by default, pagination, Excel export.
 */
export function YarnIssueActivityLogDrawer({
  open,
  onClose,
  refreshKey = 0,
}: YarnIssueActivityLogDrawerProps) {
  const [startDate, setStartDate] = useState(getDefaultActivityLogStartDate());
  const [endDate, setEndDate] = useState(getDefaultActivityLogEndDate());
  const [rows, setRows] = useState<YarnIssueActivityLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const prevRefreshKeyRef = useRef(refreshKey);
  const lastRequestKeyRef = useRef<string | null>(null);
  const datesInitializedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      datesInitializedRef.current = false;
      return;
    }
    if (!datesInitializedRef.current) {
      setStartDate(getDefaultActivityLogStartDate());
      setEndDate(getDefaultActivityLogEndDate());
      setPage(1);
      datesInitializedRef.current = true;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const parentRefresh = prevRefreshKeyRef.current !== refreshKey;
    prevRefreshKeyRef.current = refreshKey;
    const effectivePage = parentRefresh ? 1 : page;
    if (parentRefresh) {
      setPage(1);
    }

    const requestKey = JSON.stringify({
      startDate,
      endDate,
      page: effectivePage,
      refreshKey,
      reloadTick,
    });
    if (lastRequestKeyRef.current === requestKey) {
      return;
    }
    lastRequestKeyRef.current = requestKey;

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchYarnIssueActivityLogPaged({
          page: effectivePage,
          limit: PAGE_SIZE,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
        if (!cancelled) {
          setRows(data.results);
          setTotalResults(data.totalResults);
          setTotalPages(data.totalPages);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Failed to load activity log");
          setRows([]);
          setTotalResults(0);
          setTotalPages(1);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      lastRequestKeyRef.current = null;
    };
  }, [open, startDate, endDate, page, refreshKey, reloadTick]);

  /**
   * Resets date filters to the default last-30-days window.
   */
  const resetToDefaultDates = () => {
    setStartDate(getDefaultActivityLogStartDate());
    setEndDate(getDefaultActivityLogEndDate());
    setPage(1);
  };

  const handleDownloadExcel = async () => {
    if (totalResults === 0) {
      toast.error("No rows to export for the selected date range.");
      return;
    }
    setExportingExcel(true);
    try {
      const stub = `yarn-issue-activity-log_${startDate}_${endDate}`;
      const n = await downloadYarnIssueActivityLogExcel(
        {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
        stub
      );
      if (n === 0) {
        toast.error("No rows to export for the selected date range.");
      } else {
        toast.success(`Downloaded ${n} row(s) to Excel.`);
      }
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Excel export failed.");
    } finally {
      setExportingExcel(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed top-0 right-0 h-full w-full max-w-6xl bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col"
        aria-label="Issue activity log"
      >
        <div className="box h-full flex flex-col min-h-0">
          <header className="box-header border-b border-gray-200 flex-shrink-0 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 w-full">
              <div className="flex flex-wrap items-center gap-3 min-w-0">
                <h3 className="box-title text-lg mb-0 leading-tight shrink-0">Issue Activity Log</h3>
                <p className="text-[10px] text-gray-500 shrink-0">Last 30 days by default · {PAGE_SIZE} per page</p>
                <div className="grid grid-cols-2 gap-2 w-[200px] sm:w-[220px] shrink-0">
                  <div className="min-w-0">
                    <label
                      htmlFor="activity-log-start"
                      className="block text-[10px] font-semibold text-gray-600 mb-0.5 leading-tight"
                    >
                      Start Date
                    </label>
                    <input
                      id="activity-log-start"
                      type="date"
                      className="form-control w-full py-1 px-2 text-[11px] leading-tight h-8 min-h-0"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setPage(1);
                      }}
                      aria-label="Activity log start date"
                    />
                  </div>
                  <div className="min-w-0">
                    <label
                      htmlFor="activity-log-end"
                      className="block text-[10px] font-semibold text-gray-600 mb-0.5 leading-tight"
                    >
                      End Date
                    </label>
                    <input
                      id="activity-log-end"
                      type="date"
                      className="form-control w-full py-1 px-2 text-[11px] leading-tight h-8 min-h-0"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setPage(1);
                      }}
                      min={startDate || undefined}
                      aria-label="Activity log end date"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => void handleDownloadExcel()}
                  disabled={loading || exportingExcel || totalResults === 0}
                  className="inline-flex items-center gap-1 px-2 py-1.5 border border-gray-200 text-[11px] font-bold text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
                  aria-label="Download activity log as Excel for selected date range"
                  title="Exports all rows in the date range (not only this page)"
                >
                  <i
                    className={`ri-file-excel-2-line text-emerald-600 ${exportingExcel ? "animate-pulse" : ""}`}
                    aria-hidden
                  />
                  {exportingExcel ? "Exporting…" : "Download Excel"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    lastRequestKeyRef.current = null;
                    setReloadTick((t) => t + 1);
                  }}
                  disabled={loading}
                  className="inline-flex items-center gap-1 px-2 py-1.5 border border-gray-200 text-[11px] font-bold text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
                  aria-label="Refresh activity log"
                >
                  <i className={`ri-refresh-line ${loading ? "animate-spin" : ""}`} aria-hidden />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-800 hover:text-gray-950 hover:bg-gray-100 transition-colors"
                  aria-label="Close panel"
                >
                  <i className="ri-close-line text-xl leading-none" />
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={resetToDefaultDates}
                className="ti-btn ti-btn-outline text-xs py-1.5"
              >
                <i className="ri-calendar-line me-1" aria-hidden />
                Last 30 days
              </button>
              {totalResults > 0 && (
                <p className="text-xs text-gray-500">
                  {totalResults} transaction{totalResults !== 1 ? "s" : ""} in range
                </p>
              )}
            </div>
          </header>

          <div className="box-body flex-1 min-h-0 overflow-auto px-4 pb-4">
            {loading && rows.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                <p>Loading transactions…</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-500">
                <i className="ri-timeline-line text-4xl text-gray-300 mb-2" aria-hidden />
                <p>No transactions found for {startDate} to {endDate}.</p>
                <button
                  type="button"
                  onClick={resetToDefaultDates}
                  className="ti-btn ti-btn-outline mt-3 text-xs"
                >
                  Reset to last 30 days
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto border border-gray-300 bg-white">
                  <table
                    className="w-full min-w-[1380px] border-collapse text-[11px]"
                    aria-label="Yarn issue activity log"
                  >
                    <thead className="sticky top-0 z-10 shadow-sm">
                      <tr className="bg-[#f2f2f2] border-b border-gray-300">
                        <th className="border border-gray-300 px-2 py-2 text-left font-bold text-gray-800 whitespace-nowrap bg-[#f2f2f2]">
                          #
                        </th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-bold text-gray-800 bg-[#f2f2f2] min-w-[280px]">
                          Yarn
                        </th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-bold text-gray-800 whitespace-nowrap bg-[#f2f2f2]">
                          Order
                        </th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-bold text-gray-800 whitespace-nowrap bg-[#f2f2f2]">
                          Type
                        </th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-bold text-gray-800 whitespace-nowrap bg-[#f2f2f2]">
                          Txn date
                        </th>
                        <th className="border border-gray-300 px-2 py-2 text-right font-bold text-gray-800 whitespace-nowrap bg-[#f2f2f2]">
                          Cones
                        </th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-mono font-bold text-gray-800 min-w-[180px] bg-[#f2f2f2]">
                          Cone barcode
                        </th>
                        <th className="border border-gray-300 px-2 py-2 text-right font-bold text-gray-800 whitespace-nowrap bg-[#f2f2f2]">
                          Net (kg)
                        </th>
                        <th className="border border-gray-300 px-2 py-2 text-right font-bold text-gray-800 whitespace-nowrap bg-[#f2f2f2]">
                          Total (kg)
                        </th>
                        <th className="border border-gray-300 px-2 py-2 text-right font-bold text-gray-800 whitespace-nowrap bg-[#f2f2f2]">
                          Tear (kg)
                        </th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-bold text-gray-800 whitespace-nowrap bg-[#f2f2f2]">
                          Created
                        </th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-bold text-gray-800 whitespace-nowrap bg-[#f2f2f2]">
                          Updated
                        </th>
                        <th className="border border-gray-300 px-2 py-2 text-left font-mono font-bold text-gray-800 min-w-[200px] bg-[#f2f2f2]">
                          Transaction ID
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((transaction, index) => (
                        <tr
                          key={transaction._id}
                          className="hover:bg-[#f9f9f9] border-b border-gray-300 bg-white even:bg-[#fafafa]"
                        >
                          <td className="border border-gray-300 px-2 py-1.5 text-gray-600 tabular-nums">
                            {(page - 1) * PAGE_SIZE + index + 1}
                          </td>
                          <td className="border border-gray-300 px-2 py-1.5 align-top min-w-[280px]">
                            <div className="font-semibold text-gray-900 whitespace-normal break-words">
                              {transaction.yarnName}
                            </div>
                            <div className="text-[10px] text-gray-500 whitespace-normal break-words mt-0.5">
                              {yarnTypeLabel(transaction)}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-2 py-1.5 text-gray-900 whitespace-nowrap">
                            {transaction.orderno}
                          </td>
                          <td className="border border-gray-300 px-2 py-1.5 text-gray-800">
                            {transaction.transactionType}
                          </td>
                          <td className="border border-gray-300 px-2 py-1.5 text-gray-800 whitespace-nowrap">
                            {formatIsoDateOnly(transaction.transactionDate)}
                          </td>
                          <td className="border border-gray-300 px-2 py-1.5 text-right tabular-nums text-gray-900">
                            {transaction.transactionConeCount}
                          </td>
                          <td className="border border-gray-300 px-2 py-1.5 font-mono text-[10px] text-gray-800 break-all align-top">
                            {formatConeBarcodes(transaction)}
                          </td>
                          <td className="border border-gray-300 px-2 py-1.5 text-right tabular-nums font-semibold text-blue-700">
                            {transaction.transactionNetWeight}
                          </td>
                          <td className="border border-gray-300 px-2 py-1.5 text-right tabular-nums text-gray-900">
                            {transaction.transactionTotalWeight}
                          </td>
                          <td className="border border-gray-300 px-2 py-1.5 text-right tabular-nums text-gray-900">
                            {transaction.transactionTearWeight}
                          </td>
                          <td className="border border-gray-300 px-2 py-1.5 text-gray-700 whitespace-nowrap">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </td>
                          <td className="border border-gray-300 px-2 py-1.5 text-gray-700 whitespace-nowrap">
                            {new Date(transaction.updatedAt).toLocaleDateString()}
                          </td>
                          <td className="border border-gray-300 px-2 py-1.5 font-mono text-[10px] text-gray-800 break-all align-top">
                            {transaction._id}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <nav
                  className="flex flex-wrap items-center justify-between gap-2 mt-3 text-[11px] text-gray-700"
                  aria-label="Activity log pagination"
                >
                  <p className="tabular-nums">
                    Page <span className="font-semibold">{page}</span> of{" "}
                    <span className="font-semibold">{totalPages}</span>
                    <span className="text-gray-500"> · {totalResults} total</span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={loading || page <= 1}
                      className="px-2 py-1 border border-gray-200 rounded font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Previous page"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={loading || page >= totalPages}
                      className="px-2 py-1 border border-gray-200 rounded font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Next page"
                    >
                      Next
                    </button>
                  </div>
                </nav>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
