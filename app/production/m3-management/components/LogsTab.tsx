"use client";

import React, { useEffect, useState } from "react";
import { productionService, type M3LogEntry } from "@/shared/services/productionService";

const FLOOR_OPTIONS = ["", "Checking", "Secondary Checking", "Final Checking"];
const TYPE_OPTIONS = ["", "ENTRY", "OUTWARD"] as const;

export interface LogsTabProps {
  refreshKey?: number;
}

/**
 * Paginated M3 ledger logs with filters (checking floors only).
 */
export default function LogsTab({ refreshKey = 0 }: LogsTabProps) {
  const [logs, setLogs] = useState<M3LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<(typeof TYPE_OPTIONS)[number]>("");
  const [sourceFloor, setSourceFloor] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const limit = 25;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await productionService.getM3Logs({
          page,
          limit,
          search: search.trim() || undefined,
          type: type || undefined,
          sourceFloor: sourceFloor || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        });
        if (cancelled) return;
        if (res.success && res.data) {
          setLogs(res.data.results ?? []);
          setTotalPages(res.data.totalPages ?? 1);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [page, search, type, sourceFloor, dateFrom, dateTo, refreshKey]);

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-3">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search order, article…"
          className="col-span-2 py-1.5 px-2 text-[11px] border border-gray-300 rounded"
          aria-label="Search M3 logs"
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
        <select
          value={sourceFloor}
          onChange={(e) => {
            setSourceFloor(e.target.value);
            setPage(1);
          }}
          className="py-1.5 px-2 text-[11px] border border-gray-300 rounded"
          aria-label="Filter by floor"
        >
          {FLOOR_OPTIONS.map((f) => (
            <option key={f || "all"} value={f}>{f || "All floors"}</option>
          ))}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="py-1.5 px-2 text-[11px] border border-gray-300 rounded" aria-label="Date from" />
        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="py-1.5 px-2 text-[11px] border border-gray-300 rounded" aria-label="Date to" />
      </div>

      <div className="border border-gray-300 rounded overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 text-[10px] min-w-[900px]">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-1 py-1 text-left">Timestamp</th>
              <th className="border border-gray-300 px-1 py-1 text-left">Order</th>
              <th className="border border-gray-300 px-1 py-1 text-left">Article</th>
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
                  <td className="border border-gray-300 px-1 py-1">{log.orderNumber}</td>
                  <td className="border border-gray-300 px-1 py-1 font-semibold">{log.articleNumber}</td>
                  <td className="border border-gray-300 px-1 py-1">
                    <span className={log.type === "OUTWARD" ? "text-amber-700 font-semibold" : "text-orange-700 font-semibold"}>{log.type}</span>
                  </td>
                  <td className="border border-gray-300 px-1 py-1">{log.sourceFloor || "—"}</td>
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
