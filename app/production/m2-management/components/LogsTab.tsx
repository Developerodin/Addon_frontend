"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { productionService, type M2EntryRow, type M2LogType } from "@/shared/services/productionService";
import DownloadExcelButton from "@/shared/components/production/DownloadExcelButton";
import { datedExportFilename, downloadCsv, formatTimestampForCsv } from "@/shared/utils/csvExport";
import { fetchAllPaginatedResults } from "@/shared/utils/fetchAllPaginated";
import M2FilterBar, { type M2FloorFilter } from "./M2FilterBar";
import M2Pagination from "./M2Pagination";

const TYPE_OPTIONS = ["", "ENTRY", "MERGE_TO_M1", "TRANSFER_TO_M3", "TRANSFER_TO_M4"] as const;

export interface LogsTabProps {
  refreshKey: number;
}

const PAGE_LIMIT = 25;

/**
 * Paginated M2 ledger logs with order/article search, floor, type, and date filters.
 */
export default function LogsTab({ refreshKey }: LogsTabProps) {
  const [logs, setLogs] = useState<M2EntryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sourceFloor, setSourceFloor] = useState<M2FloorFilter>("");
  const [type, setType] = useState<(typeof TYPE_OPTIONS)[number]>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await productionService.getM2Logs({
          page,
          limit: PAGE_LIMIT,
          search: debouncedSearch || undefined,
          sourceFloor: sourceFloor || undefined,
          type: (type || undefined) as M2LogType | undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        });
        if (cancelled) return;
        if (res.success && res.data) {
          setLogs(res.data.results ?? []);
          setTotalPages(res.data.totalPages ?? 1);
          setTotalResults(res.data.totalResults ?? 0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, sourceFloor, type, dateFrom, dateTo, refreshKey]);

  const resetPage = () => setPage(1);

  /** Export all filtered M2 logs (not just the current page) as CSV. */
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const rows = await fetchAllPaginatedResults<M2EntryRow>((pageNum, limit) =>
        productionService.getM2Logs({
          page: pageNum,
          limit,
          search: debouncedSearch || undefined,
          sourceFloor: sourceFloor || undefined,
          type: (type || undefined) as M2LogType | undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        })
      );

      if (rows.length === 0) {
        toast.error("No M2 logs to export");
        return;
      }

      const header = ["Type", "Order", "Article", "Floor", "Qty", "Remarks", "When", "User"];
      const lines = rows.map((log) => [
        log.type,
        log.orderNumber,
        log.articleNumber,
        log.sourceFloor ?? "",
        log.quantity,
        log.remarks || "",
        formatTimestampForCsv(log.timestamp),
        log.userEmail || log.userName || log.userId || "",
      ]);

      downloadCsv(datedExportFilename("m2-logs"), [header, ...lines]);
      toast.success(`Exported ${rows.length} M2 log ${rows.length === 1 ? "row" : "rows"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export M2 logs");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end gap-2 mb-3">
        <div className="flex-1 min-w-[240px]">
          <M2FilterBar
            search={search}
            onSearchChange={(v) => {
              setSearch(v);
              resetPage();
            }}
            sourceFloor={sourceFloor}
            onSourceFloorChange={(v) => {
              setSourceFloor(v);
              resetPage();
            }}
            searchPlaceholder="Search order, article, remarks…"
            showTypeFilter
            type={type}
            typeOptions={TYPE_OPTIONS}
            onTypeChange={(v) => {
              setType(v as (typeof TYPE_OPTIONS)[number]);
              resetPage();
            }}
            showDateFilters
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={(v) => {
              setDateFrom(v);
              resetPage();
            }}
            onDateToChange={(v) => {
              setDateTo(v);
              resetPage();
            }}
          />
        </div>
        <DownloadExcelButton
          onClick={() => void handleExportExcel()}
          isExporting={isExporting}
          disabled={!loading && logs.length === 0}
          ariaLabel="Export filtered M2 logs to Excel"
          className="mb-3 shrink-0"
        />
      </div>

      <div className="overflow-x-auto border-2 border-gray-200 rounded max-h-[520px] overflow-y-auto">
        <table className="w-full text-[10px] min-w-[800px]">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th className="text-left p-2 font-bold">Type</th>
              <th className="text-left p-2 font-bold">Order</th>
              <th className="text-left p-2 font-bold">Article</th>
              <th className="text-left p-2 font-bold">Floor</th>
              <th className="text-right p-2 font-bold">Qty</th>
              <th className="text-left p-2 font-bold">Remarks</th>
              <th className="text-left p-2 font-bold">When</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500">
                  Loading logs…
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500">
                  No logs match your filters.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="p-2 font-bold text-yellow-900">{log.type}</td>
                  <td className="p-2">{log.orderNumber}</td>
                  <td className="p-2 font-medium">{log.articleNumber}</td>
                  <td className="p-2">{log.sourceFloor ?? "—"}</td>
                  <td className="p-2 text-right font-semibold">{log.quantity}</td>
                  <td className="p-2 max-w-[220px] truncate" title={log.remarks}>
                    {log.remarks || "—"}
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <M2Pagination
        page={page}
        totalPages={totalPages}
        totalResults={totalResults}
        onPageChange={setPage}
      />
    </div>
  );
}
