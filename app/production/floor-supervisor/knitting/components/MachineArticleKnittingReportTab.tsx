"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  productionService,
  type KnittingFloorReportRow,
} from "@/shared/services/productionService";
import { fetchAllPaginatedResults } from "@/shared/utils/fetchAllPaginated";
import {
  getDefaultKnittingReportRange,
  isValidReportDateRange,
} from "../utils/knittingReportDateRange";
import { downloadKnittingFloorReportExcel } from "../utils/knittingFloorReportExport";

export interface MachineArticleKnittingReportTabProps {
  refreshTrigger?: number;
}

const PAGE_LIMIT = 500;

function fmtQty(n: number): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v % 1 === 0 ? String(v) : v.toFixed(2);
}

export default function MachineArticleKnittingReportTab({
  refreshTrigger,
}: MachineArticleKnittingReportTabProps) {
  const defaults = getDefaultKnittingReportRange();
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [appliedStart, setAppliedStart] = useState(defaults.startDate);
  const [appliedEnd, setAppliedEnd] = useState(defaults.endDate);
  const [rows, setRows] = useState<KnittingFloorReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [columnTotals, setColumnTotals] = useState({
    plannedQuantity: 0,
    knittingOutput: 0,
    m4Qty: 0,
  });
  const [search, setSearch] = useState("");

  const fetchPage = useCallback(
    async (pageNum: number) => {
      if (!isValidReportDateRange(appliedStart, appliedEnd)) {
        toast.error("End date must be on or after start date");
        return;
      }
      setIsLoading(true);
      try {
        const response = await productionService.getKnittingFloorReport({
          startDate: appliedStart,
          endDate: appliedEnd,
          page: pageNum,
          limit: PAGE_LIMIT,
          ...(search.trim() && { search: search.trim() }),
        });
        if (response.success && response.data) {
          setRows(response.data.results ?? []);
          setTotal(response.data.total ?? 0);
          const tp = response.data.totalPages ?? 1;
          setTotalPages(tp);
          setPage(response.data.page ?? pageNum);
          const t = response.data.columnTotals;
          setColumnTotals({
            plannedQuantity: t?.plannedQuantity ?? 0,
            knittingOutput: t?.knittingOutput ?? 0,
            m4Qty: t?.m4Qty ?? 0,
          });
        } else {
          toast.error(response.error?.message || "Failed to load knitting report");
          setRows([]);
          setTotal(0);
        }
      } catch {
        toast.error("Failed to load knitting report");
        setRows([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    },
    [appliedStart, appliedEnd, search]
  );

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchPage(1);
    }, search.trim() ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchPage, refreshTrigger, search]);

  const handleApply = () => {
    if (!isValidReportDateRange(startDate, endDate)) {
      toast.error("End date must be on or after start date");
      return;
    }
    setAppliedStart(startDate);
    setAppliedEnd(endDate);
  };

  const goToPage = (nextPage: number) => {
    setPage(nextPage);
    fetchPage(nextPage);
  };

  const handleExport = async () => {
    if (!isValidReportDateRange(appliedStart, appliedEnd)) {
      toast.error("Invalid date range");
      return;
    }
    setExporting(true);
    try {
      const allRows = await fetchAllPaginatedResults<KnittingFloorReportRow>(
        (p, limit) =>
          productionService.getKnittingFloorReport({
            startDate: appliedStart,
            endDate: appliedEnd,
            page: p,
            limit,
            ...(search.trim() && { search: search.trim() }),
          }),
        2000
      );
      if (!allRows.length) {
        toast.error("No data to export for this date range");
        return;
      }
      downloadKnittingFloorReportExcel(allRows, appliedStart, appliedEnd);
      toast.success(`Exported ${allRows.length} rows`);
    } catch {
      toast.error("Excel export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-[10px]">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <h3 className="text-[12px] font-bold text-gray-800">Knitting Report</h3>
        <div className="flex flex-wrap items-end gap-2">
          <div className="relative">
            <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Order, article, machine…"
              className="pl-7 pr-2 py-1.5 w-[180px] border border-gray-300 rounded text-[11px] focus:outline-none focus:ring-2 focus:ring-purple-400"
              aria-label="Search order, article, or machine"
            />
          </div>
          <label className="block text-[10px] font-semibold text-gray-600">
            From
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-[140px] px-2 py-1.5 border border-gray-300 rounded text-[11px] focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </label>
          <label className="block text-[10px] font-semibold text-gray-600">
            To
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-[140px] px-2 py-1.5 border border-gray-300 rounded text-[11px] focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </label>
          <button
            type="button"
            onClick={handleApply}
            disabled={isLoading}
            className="px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 disabled:opacity-50"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => goToPage(page)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[11px] font-bold rounded hover:bg-gray-50"
          >
            <i className={`ri-refresh-line text-xs ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || isLoading || total === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[11px] font-bold rounded hover:bg-gray-50 disabled:opacity-50"
          >
            <i className="ri-file-excel-2-line text-xs text-green-700" />
            {exporting ? "Exporting…" : "Download Excel"}
          </button>
        </div>
      </div>

      <p className="text-[10px] text-gray-500 mb-2">
        Showing knitting output and M4 recorded between {appliedStart} and {appliedEnd} (IST).{" "}
        {total > 0 ? `${total} row${total === 1 ? "" : "s"}.` : ""}
      </p>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
          <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border border-gray-300 rounded">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-2 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider border-b border-r border-gray-300">
                    Order No.
                  </th>
                  <th className="px-2 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider border-b border-r border-gray-300">
                    Article
                  </th>
                  <th className="px-2 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider border-b border-r border-gray-300">
                    M/c No.
                  </th>
                  <th className="px-2 py-2 text-right text-[10px] font-bold text-gray-700 uppercase tracking-wider border-b border-r border-gray-300">
                    Order Qty
                  </th>
                  <th className="px-2 py-2 text-right text-[10px] font-bold text-gray-700 uppercase tracking-wider border-b border-r border-gray-300">
                    Knitting Output
                  </th>
                  <th className="px-2 py-2 text-right text-[10px] font-bold text-gray-700 uppercase tracking-wider border-b border-gray-300">
                    M4
                  </th>
                </tr>
                {rows.length > 0 && (
                  <tr className="bg-purple-50/90">
                    <th className="px-2 py-1 border-b border-r border-gray-300" />
                    <th className="px-2 py-1 border-b border-r border-gray-300" />
                    <th className="px-2 py-1 border-b border-r border-gray-300" />
                    <th className="px-2 py-1.5 text-right text-[11px] font-bold text-purple-800 border-b border-r border-gray-300 tabular-nums">
                      {fmtQty(columnTotals.plannedQuantity)}
                    </th>
                    <th className="px-2 py-1.5 text-right text-[11px] font-bold text-purple-800 border-b border-r border-gray-300 tabular-nums">
                      {fmtQty(columnTotals.knittingOutput)}
                    </th>
                    <th className="px-2 py-1.5 text-right text-[11px] font-bold text-purple-800 border-b border-gray-300 tabular-nums">
                      {fmtQty(columnTotals.m4Qty)}
                    </th>
                  </tr>
                )}
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={`${row.orderId}-${row.articleId}-${row.machineId}-${idx}`} className={idx % 2 === 1 ? "bg-gray-50/50" : ""}>
                    <td className="px-2 py-2 text-[11px] text-gray-800 border-b border-r border-gray-300">
                      {row.orderNumber || "—"}
                    </td>
                    <td className="px-2 py-2 text-[11px] font-medium text-gray-800 border-b border-r border-gray-300">
                      {row.articleNumber || "—"}
                    </td>
                    <td className="px-2 py-2 text-[11px] text-gray-800 border-b border-r border-gray-300">
                      {row.machineCode || "—"}
                    </td>
                    <td className="px-2 py-2 text-[11px] text-gray-800 border-b border-r border-gray-300 text-right tabular-nums">
                      {fmtQty(row.plannedQuantity)}
                    </td>
                    <td className="px-2 py-2 text-[11px] text-gray-800 border-b border-r border-gray-300 text-right tabular-nums">
                      {fmtQty(row.knittingOutput)}
                    </td>
                    <td className="px-2 py-2 text-[11px] text-gray-800 border-b border-gray-300 text-right tabular-nums">
                      {fmtQty(row.m4Qty)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rows.length === 0 && (
            <p className="py-8 text-center text-[11px] text-gray-500">
              {search.trim()
                ? `No rows match “${search.trim()}” for this date range.`
                : "No knitting activity in this date range."}
            </p>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 mt-3">
              <button
                type="button"
                disabled={page <= 1 || isLoading}
                onClick={() => goToPage(Math.max(1, page - 1))}
                className="px-2 py-1 text-[10px] font-bold border border-gray-300 rounded disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-[10px] text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages || isLoading}
                onClick={() => goToPage(Math.min(totalPages, page + 1))}
                className="px-2 py-1 text-[10px] font-bold border border-gray-300 rounded disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}