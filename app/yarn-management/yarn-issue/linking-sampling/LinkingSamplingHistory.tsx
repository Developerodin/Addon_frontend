"use client";

import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import {
  fetchFloorIssueHistoryPaged,
  type FloorIssueHistoryRow,
  type FloorIssueConeRef,
  type FloorIssueHistoryScope,
} from "@/app/yarn-management/yarn-issue/linking-sampling/linkingSamplingHistoryService";
import type { LinkingSamplingFloor } from "@/app/yarn-management/yarn-issue/linking-sampling/linkingSamplingIssueService";
import { downloadLinkingSamplingHistoryExcel } from "@/app/yarn-management/yarn-issue/linking-sampling/linkingSamplingHistoryExcelExport";

const PAGE_SIZE = 20;
const YARN_DEBOUNCE_MS = 400;

function floorLabelFromType(t: string): string {
  if (t === "yarn_issued_linking") return "Linking";
  if (t === "yarn_issued_sampling") return "Sampling";
  return t;
}

function formatConeCell(cones: Array<string | FloorIssueConeRef> | undefined): string {
  if (!cones?.length) return "—";
  const parts = cones.map((c) => {
    if (typeof c === "string") return c;
    return c?.barcode || c?._id || "—";
  });
  return parts.join(", ");
}

interface LinkingSamplingHistoryProps {
  floor: LinkingSamplingFloor;
  refreshKey?: number;
}

/**
 * Floor-issue transaction history with pagination, section filter, yarn search, and optional dates.
 */
export function LinkingSamplingHistory({ floor, refreshKey = 0 }: LinkingSamplingHistoryProps) {
  const [rows, setRows] = useState<FloorIssueHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<FloorIssueHistoryScope>("tab");
  const [yarnInput, setYarnInput] = useState("");
  const [yarnFilter, setYarnFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [reloadTick, setReloadTick] = useState(0);
  const [exportingExcel, setExportingExcel] = useState(false);
  const prevRefreshKeyRef = useRef(refreshKey);
  const lastRequestKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = yarnInput.trim();
      setYarnFilter(next);
      setPage(1);
    }, YARN_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [yarnInput]);

  useEffect(() => {
    setPage(1);
  }, [floor]);

  useEffect(() => {
    const parentHistoryRefresh = prevRefreshKeyRef.current !== refreshKey;
    prevRefreshKeyRef.current = refreshKey;

    const effectivePage = parentHistoryRefresh ? 1 : page;
    if (parentHistoryRefresh) {
      setPage(1);
    }

    const requestKey = JSON.stringify({
      floor,
      scope,
      yarnFilter,
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
        const data = await fetchFloorIssueHistoryPaged({
          floor,
          scope,
          yarnName: yarnFilter || undefined,
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
          toast.error(e instanceof Error ? e.message : "Could not load issue history.");
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
  }, [floor, scope, yarnFilter, page, startDate, endDate, refreshKey, reloadTick]);

  const tabTitle = floor === "linking" ? "Linking" : "Sampling";

  const handleDownloadExcel = async () => {
    if (totalResults === 0) {
      toast.error("No rows to export for the current filters.");
      return;
    }
    setExportingExcel(true);
    try {
      const stub = `floor-issue-history_${tabTitle}_${scope}_${new Date().toISOString().slice(0, 10)}`;
      const n = await downloadLinkingSamplingHistoryExcel(
        {
          floor,
          scope,
          yarnName: yarnFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
        stub
      );
      if (n === 0) {
        toast.error("No rows to export for the current filters.");
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

  const scopeLabelId = `history-scope-${floor}`;
  const yarnSearchId = `history-yarn-${floor}`;

  return (
    <section className="mt-8 border-t border-gray-200 pt-4" aria-labelledby={`floor-history-${floor}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h2 id={`floor-history-${floor}`} className="text-[11px] font-bold text-gray-800 uppercase tracking-wider">
          {tabTitle} — issue history
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleDownloadExcel()}
            disabled={loading || exportingExcel || totalResults === 0}
            className="inline-flex items-center gap-1 px-2 py-1 border border-gray-200 text-[10px] font-bold text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
            aria-label="Download full issue history as Excel for current filters"
            title="Exports all rows matching section, yarn search, and dates (not only this page)"
          >
            <i className={`ri-file-excel-2-line text-emerald-600 ${exportingExcel ? "animate-pulse" : ""}`} aria-hidden />
            {exportingExcel ? "Exporting…" : "Download Excel"}
          </button>
          <button
            type="button"
            onClick={() => {
              lastRequestKeyRef.current = null;
              setReloadTick((t) => t + 1);
            }}
            disabled={loading}
            className="inline-flex items-center gap-1 px-2 py-1 border border-gray-200 text-[10px] font-bold text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
            aria-label="Refresh history"
          >
            <i className={`ri-refresh-line ${loading ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex flex-col gap-0.5 min-w-[200px]">
          <label htmlFor={scopeLabelId} className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">
            Section
          </label>
          <select
            id={scopeLabelId}
            value={scope}
            onChange={(e) => {
              setScope(e.target.value as FloorIssueHistoryScope);
              setPage(1);
            }}
            className="text-[11px] border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-900"
            aria-describedby={`${scopeLabelId}-hint`}
          >
            <option value="tab">{tabTitle} only</option>
            <option value="all">Linking + sampling</option>
          </select>
          <span id={`${scopeLabelId}-hint`} className="sr-only">
            Filter transactions to this floor type or show both linking and sampling issues.
          </span>
        </div>
        <div className="flex flex-col gap-0.5 flex-1 min-w-[160px] max-w-sm">
          <label htmlFor={yarnSearchId} className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">
            Yarn name contains
          </label>
          <input
            id={yarnSearchId}
            type="search"
            value={yarnInput}
            onChange={(e) => setYarnInput(e.target.value)}
            placeholder="Search yarn name…"
            className="text-[11px] border border-gray-200 rounded px-2 py-1.5 text-gray-900 placeholder:text-gray-400"
            autoComplete="off"
            aria-label="Filter history by yarn name"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex flex-col gap-0.5">
            <label htmlFor={`history-from-${floor}`} className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">
              From
            </label>
            <input
              id={`history-from-${floor}`}
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="text-[11px] border border-gray-200 rounded px-2 py-1.5 text-gray-900"
              aria-label="Start date filter"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label htmlFor={`history-to-${floor}`} className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">
              To
            </label>
            <input
              id={`history-to-${floor}`}
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="text-[11px] border border-gray-200 rounded px-2 py-1.5 text-gray-900"
              aria-label="End date filter"
            />
          </div>
        </div>
      </div>

      <p className="text-[10px] text-gray-500 mb-2">
        Paginated list ({PAGE_SIZE} per page). Use section and yarn search to narrow results; dates filter by transaction
        day. Download Excel includes every matching row up to 50k records.
      </p>

      {loading && rows.length === 0 ? (
        <div className="flex items-center gap-2 py-6 text-[11px] text-gray-500">
          <div className="h-5 w-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          Loading history…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-[11px] text-gray-500 py-4">No issues match the current filters.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded border border-gray-200 bg-white">
            <table className="min-w-full text-[11px]" aria-label={`${tabTitle} issue history`}>
              <thead>
                <tr className="bg-[#f2f2f2] border-b border-gray-300">
                  <th className="text-left font-bold text-gray-800 px-2 py-1.5 border-r border-gray-200 whitespace-nowrap">
                    Date
                  </th>
                  <th className="text-left font-bold text-gray-800 px-2 py-1.5 border-r border-gray-200 whitespace-nowrap">
                    Floor
                  </th>
                  <th className="text-left font-bold text-gray-800 px-2 py-1.5 border-r border-gray-200 min-w-[140px]">
                    Yarn
                  </th>
                  <th className="text-left font-bold text-gray-800 px-2 py-1.5 border-r border-gray-200 min-w-[120px]">
                    Cone barcode
                  </th>
                  <th className="text-right font-bold text-gray-800 px-2 py-1.5 border-r border-gray-200 whitespace-nowrap">
                    Net (kg)
                  </th>
                  <th className="text-right font-bold text-gray-800 px-2 py-1.5 border-r border-gray-200 whitespace-nowrap">
                    Total (kg)
                  </th>
                  <th className="text-right font-bold text-gray-800 px-2 py-1.5 border-r border-gray-200 whitespace-nowrap">
                    Tear (kg)
                  </th>
                  <th className="text-left font-mono font-bold text-gray-800 px-2 py-1.5 min-w-[180px]">
                    Transaction ID
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id} className="border-b border-gray-200 odd:bg-white even:bg-[#fafafa] hover:bg-[#f9f9f9]">
                    <td className="px-2 py-1.5 text-gray-700 whitespace-nowrap border-r border-gray-100">
                      {row.transactionDate
                        ? new Date(row.transactionDate).toLocaleString()
                        : row.createdAt
                          ? new Date(row.createdAt).toLocaleString()
                          : "—"}
                    </td>
                    <td className="px-2 py-1.5 text-gray-800 font-semibold border-r border-gray-100 whitespace-nowrap">
                      {floorLabelFromType(row.transactionType)}
                    </td>
                    <td className="px-2 py-1.5 text-gray-900 border-r border-gray-100 break-words max-w-[220px]">
                      {row.yarnName || "—"}
                    </td>
                    <td className="px-2 py-1.5 text-gray-800 font-mono text-[10px] border-r border-gray-100 break-all">
                      {formatConeCell(row.conesIdsArray)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-blue-700 border-r border-gray-100">
                      {row.transactionNetWeight ?? "—"}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums border-r border-gray-100">
                      {row.transactionTotalWeight ?? "—"}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums border-r border-gray-100">
                      {row.transactionTearWeight ?? "—"}
                    </td>
                    <td className="px-2 py-1.5 font-mono text-[10px] text-gray-700 break-all">{row._id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav
            className="flex flex-wrap items-center justify-between gap-2 mt-3 text-[11px] text-gray-700"
            aria-label="History pagination"
          >
            <p className="tabular-nums">
              Page <span className="font-semibold">{page}</span> of <span className="font-semibold">{totalPages}</span>
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
    </section>
  );
}
