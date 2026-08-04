"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import vendorM2M3M4ManagementService, {
  formatVendorQcFloor,
  type VendorM4LogEntry,
} from "@/shared/services/vendorM2M3M4ManagementService";
import DownloadExcelButton from "@/shared/components/production/DownloadExcelButton";
import { datedExportFilename, downloadCsv, formatTimestampForCsv } from "@/shared/utils/csvExport";
import { fetchAllPaginatedResults } from "@/shared/utils/fetchAllPaginated";

const TYPE_OPTIONS = ["", "ENTRY", "OUTWARD"] as const;

export interface LogsTabProps {
  refreshKey?: number;
}

/**
 * Paginated vendor M4 ledger logs with filters.
 */
export default function LogsTab({ refreshKey = 0 }: LogsTabProps) {
  const [logs, setLogs] = useState<VendorM4LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<(typeof TYPE_OPTIONS)[number]>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const limit = 25;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await vendorM2M3M4ManagementService.getM4Logs({
          page,
          limit,
          search: search.trim() || undefined,
          type: type || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        });
        if (cancelled) return;
        setLogs(res.results ?? []);
        setTotalPages(res.totalPages ?? 1);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [page, search, type, dateFrom, dateTo, refreshKey]);

  /** Export all filtered vendor M4 logs as CSV. */
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const rows = await fetchAllPaginatedResults<VendorM4LogEntry>((pageNum, pageLimit) =>
        vendorM2M3M4ManagementService.getM4Logs({
          page: pageNum,
          limit: pageLimit,
          search: search.trim() || undefined,
          type: type || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        })
      );

      if (rows.length === 0) {
        toast.error("No M4 logs to export");
        return;
      }

      const header = [
        "Timestamp",
        "VPO",
        "Reference",
        "Type",
        "Floor",
        "Qty",
        "User",
        "Remarks",
        "Available After",
      ];
      const lines = rows.map((log) => [
        formatTimestampForCsv(log.timestamp),
        log.vpoNumber || "",
        log.referenceCode || "",
        log.type,
        formatVendorQcFloor(log.sourceFloor),
        log.quantity,
        log.userName || log.userId || "",
        log.remarks || "",
        log.availableAfter ?? "",
      ]);

      downloadCsv(datedExportFilename("vendor-m4-logs"), [header, ...lines]);
      toast.success(`Exported ${rows.length} M4 log ${rows.length === 1 ? "row" : "rows"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export M4 logs");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-3">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search VPO, reference…"
          className="col-span-2 py-1.5 px-2 text-[11px] border border-gray-300 rounded"
          aria-label="Search M4 logs"
        />
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value as (typeof TYPE_OPTIONS)[number]);
            setPage(1);
          }}
          className="py-1.5 px-2 text-[11px] border border-gray-300 rounded"
          aria-label="Filter by log type"
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t || "all"} value={t}>{t || "All types"}</option>
          ))}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="py-1.5 px-2 text-[11px] border border-gray-300 rounded" aria-label="Date from" />
        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="py-1.5 px-2 text-[11px] border border-gray-300 rounded" aria-label="Date to" />
        <div className="col-span-2 md:col-span-4 lg:col-span-5 flex justify-end">
          <DownloadExcelButton
            onClick={() => void handleExportExcel()}
            isExporting={isExporting}
            disabled={!isLoading && logs.length === 0}
            ariaLabel="Export filtered vendor M4 logs to Excel"
          />
        </div>
      </div>

      <div className="border border-gray-300 rounded overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 text-[10px] min-w-[860px]">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-1 py-1 text-left">Timestamp</th>
              <th className="border border-gray-300 px-1 py-1 text-left">VPO</th>
              <th className="border border-gray-300 px-1 py-1 text-left">Reference</th>
              <th className="border border-gray-300 px-1 py-1 text-left">Type</th>
              <th className="border border-gray-300 px-1 py-1 text-left">Floor</th>
              <th className="border border-gray-300 px-1 py-1 text-right">Qty</th>
              <th className="border border-gray-300 px-1 py-1 text-left">User</th>
              <th className="border border-gray-300 px-1 py-1 text-left">Remarks</th>
              <th className="border border-gray-300 px-1 py-1 text-right">Avail. after</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} className="border border-gray-300 px-2 py-6 text-center text-gray-500">Loading…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={9} className="border border-gray-300 px-2 py-6 text-center text-gray-500">No logs found</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/50">
                  <td className="border border-gray-300 px-1 py-1 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="border border-gray-300 px-1 py-1">{log.vpoNumber || "—"}</td>
                  <td className="border border-gray-300 px-1 py-1 font-semibold">{log.referenceCode || "—"}</td>
                  <td className="border border-gray-300 px-1 py-1">
                    <span className={log.type === "OUTWARD" ? "text-orange-700 font-semibold" : "text-red-700 font-semibold"}>{log.type}</span>
                  </td>
                  <td className="border border-gray-300 px-1 py-1">{formatVendorQcFloor(log.sourceFloor)}</td>
                  <td className="border border-gray-300 px-1 py-1 text-right font-semibold">{log.quantity}</td>
                  <td className="border border-gray-300 px-1 py-1">{log.userName || log.userId}</td>
                  <td className="border border-gray-300 px-1 py-1 max-w-[160px]" title={log.remarks}><span className="line-clamp-2">{log.remarks || "—"}</span></td>
                  <td className="border border-gray-300 px-1 py-1 text-right">{log.availableAfter ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-2 text-[10px]">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-1">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-2 py-1 border rounded disabled:opacity-40">Prev</button>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-2 py-1 border rounded disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
