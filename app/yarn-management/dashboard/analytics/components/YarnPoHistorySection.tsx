"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  yarnInventoryService,
  type PoAnalyticsResponse,
  type PoAnalyticsLineRow,
} from "../../services/yarnInventoryService";

export interface YarnPoHistorySectionProps {
  yarnCatalogId: string;
  yarnName: string;
}

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted_to_supplier: "bg-blue-100 text-blue-700",
  in_transit: "bg-indigo-100 text-indigo-700",
  goods_partially_received: "bg-amber-100 text-amber-700",
  goods_received: "bg-teal-100 text-teal-700",
  qc_pending: "bg-orange-100 text-orange-700",
  po_rejected: "bg-red-100 text-red-700",
  po_accepted: "bg-green-100 text-green-700",
  po_accepted_partially: "bg-emerald-100 text-emerald-700",
};

const safeNum = (v: unknown): number => {
  if (v === null || v === undefined || typeof v !== "number" || isNaN(v)) return 0;
  return v;
};

const PAGE_SIZE = 10;
const ALL_TIME_START = "2020-01-01";

const formatYmd = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export function YarnPoHistorySection({
  yarnCatalogId,
  yarnName,
}: YarnPoHistorySectionProps) {
  const allTimeEnd = formatYmd(new Date());
  const [summary, setSummary] = useState<PoAnalyticsResponse | null>(null);
  const [rows, setRows] = useState<PoAnalyticsLineRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    setError(null);
    try {
      const res = await yarnInventoryService.getPoAnalytics({
        start_date: ALL_TIME_START,
        end_date: allTimeEnd,
        date_mode: "created",
        yarn_catalog_id: yarnCatalogId,
        include_draft: true,
      });
      setSummary(res);
    } catch (err) {
      console.error("Yarn PO summary:", err);
      setError(err instanceof Error ? err.message : "Failed to load PO summary");
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [yarnCatalogId, allTimeEnd]);

  const fetchRows = useCallback(
    async (targetPage: number) => {
      setRowsLoading(true);
      try {
        const res = await yarnInventoryService.getPoAnalyticsLines({
          start_date: ALL_TIME_START,
          end_date: allTimeEnd,
          date_mode: "created",
          yarn_catalog_id: yarnCatalogId,
          include_draft: true,
          page: targetPage,
          limit: PAGE_SIZE,
        });
        setRows(res.results);
        setTotalPages(res.totalPages);
        setTotalResults(res.totalResults);
        setPage(res.page);
      } catch (err) {
        console.error("Yarn PO lines:", err);
        setRows([]);
      } finally {
        setRowsLoading(false);
      }
    },
    [yarnCatalogId, allTimeEnd]
  );

  useEffect(() => {
    fetchSummary();
    setPage(1);
    fetchRows(1);
  }, [fetchSummary, fetchRows]);

  const loading = summaryLoading || rowsLoading;
  const cards = summary?.cards;

  const orderedKg = safeNum(cards?.orderedKg);
  const receivedKg = safeNum(cards?.receivedAcceptedKg);
  const fulfilmentPct = orderedKg > 0 ? Math.round((receivedKg / orderedKg) * 100) : 0;

  const kpis = cards
    ? [
        {
          label: "POs with this yarn",
          value: safeNum(cards.poCount).toLocaleString(),
          icon: "ri-file-list-3-line",
          color: "text-blue-600",
          bg: "bg-blue-50",
          border: "border-blue-400",
        },
        {
          label: "Total Ordered",
          value: `${orderedKg.toLocaleString()} kg`,
          icon: "ri-shopping-cart-2-line",
          color: "text-purple-600",
          bg: "bg-purple-50",
          border: "border-purple-400",
        },
        {
          label: "Received (Accepted)",
          value: `${receivedKg.toLocaleString()} kg`,
          icon: "ri-checkbox-circle-line",
          color: "text-green-600",
          bg: "bg-green-50",
          border: "border-green-400",
        },
        {
          label: "Outstanding",
          value: `${safeNum(cards.outstandingKg).toLocaleString()} kg`,
          icon: "ri-time-line",
          color: "text-amber-600",
          bg: "bg-amber-50",
          border: "border-amber-400",
        },
        {
          label: "Fulfilment",
          value: `${fulfilmentPct}%`,
          icon: "ri-pie-chart-2-line",
          color: fulfilmentPct >= 80 ? "text-green-600" : fulfilmentPct >= 50 ? "text-amber-600" : "text-red-600",
          bg: fulfilmentPct >= 80 ? "bg-green-50" : fulfilmentPct >= 50 ? "bg-amber-50" : "bg-red-50",
          border: fulfilmentPct >= 80 ? "border-green-400" : fulfilmentPct >= 50 ? "border-amber-400" : "border-red-400",
        },
        {
          label: "Rejected",
          value: `${safeNum(cards.rejectedKg).toLocaleString()} kg`,
          icon: "ri-close-circle-line",
          color: "text-red-600",
          bg: "bg-red-50",
          border: "border-red-400",
        },
      ]
    : [];

  return (
    <section className="mb-5" role="region" aria-label="Yarn purchase order history">
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between gap-2 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600">
              <i className="ri-file-list-3-line text-sm" aria-hidden />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                Purchase Order History
              </span>
              <p className="text-[10px] text-gray-500 truncate">
                POs containing <strong>{yarnName}</strong>
              </p>
            </div>
          </div>
          {totalResults > 0 && !loading && (
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {totalResults} PO{totalResults !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="p-3">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-2 mb-3 bg-red-50 rounded-lg border border-red-100" role="alert">
              <i className="ri-error-warning-line text-red-500" aria-hidden />
              <p className="text-[11px] text-red-700 font-medium">{error}</p>
            </div>
          )}

          {/* Loading */}
          {loading && !summary && (
            <div className="flex items-center gap-2 py-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600" />
              <p className="text-[10px] text-gray-500 font-bold" role="status">
                Loading PO history…
              </p>
            </div>
          )}

          {/* KPI cards */}
          {kpis.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-3">
              {kpis.map((kpi) => (
                <div
                  key={kpi.label}
                  className={`rounded-lg border-l-[3px] border border-gray-100 ${kpi.border} ${kpi.bg} p-2 transition-shadow hover:shadow-sm`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <i className={`${kpi.icon} text-xs ${kpi.color}`} aria-hidden />
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                      {kpi.label}
                    </span>
                  </div>
                  <p className={`text-sm font-extrabold ${kpi.color} tabular-nums`}>{kpi.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Supplier breakdown */}
          {summary?.bySupplier && summary.bySupplier.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                By Supplier
              </p>
              <div className="flex flex-wrap gap-2">
                {summary.bySupplier
                  .sort((a, b) => b.orderedKg - a.orderedKg)
                  .map((s) => (
                    <div
                      key={s.supplierId || s.supplierName}
                      className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 rounded-lg border border-gray-100 text-[10px]"
                    >
                      <i className="ri-building-line text-gray-400" aria-hidden />
                      <span className="font-bold text-gray-700">{s.supplierName}</span>
                      <span className="text-purple-600 font-bold tabular-nums">
                        {s.orderedKg.toLocaleString()} kg
                      </span>
                      <span className="text-green-600 font-bold tabular-nums">
                        {s.receivedAcceptedKg.toLocaleString()} kg recv
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* PO rows */}
          {!summaryLoading && rows.length === 0 && !error && summary && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                <i className="ri-file-search-line text-lg text-gray-400" aria-hidden />
              </div>
              <p className="text-xs font-bold text-gray-400">No purchase orders found</p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                This yarn has no POs in the selected date range
              </p>
            </div>
          )}

          {rows.length > 0 && (
            <>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Purchase Orders
              </p>
              <div className="space-y-2">
                {rows.map((r) => {
                  const statusClass =
                    STATUS_BADGE[r.currentStatus] || "bg-gray-100 text-gray-700";
                  const recvDate = r.goodsReceivedDate
                    ? new Date(r.goodsReceivedDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : null;
                  const createDate = new Date(r.createDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });
                  return (
                    <div
                      key={r.purchaseOrderId}
                      className="rounded-lg border border-gray-100 bg-white p-3 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-gray-900 font-mono">
                            {r.poNumber}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${statusClass}`}
                          >
                            {r.currentStatus.replace(/_/g, " ")}
                          </span>
                        </div>
                        <Link
                          href={`/yarn-management/purchase-management/purchase/edit/${r.purchaseOrderId}`}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors flex-shrink-0"
                        >
                          <i className="ri-external-link-line" aria-hidden />
                          Open
                        </Link>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-gray-600">
                        <span>
                          <i className="ri-building-line mr-1 text-gray-400" aria-hidden />
                          {r.supplierName}
                        </span>
                        <span className="tabular-nums">
                          <i className="ri-shopping-cart-2-line mr-1 text-purple-400" aria-hidden />
                          <strong>{r.orderedKg.toLocaleString()}</strong> kg ordered
                        </span>
                        <span className="tabular-nums">
                          <i className="ri-checkbox-circle-line mr-1 text-green-400" aria-hidden />
                          <strong>{r.receivedAcceptedKg.toLocaleString()}</strong> kg received
                        </span>
                        {r.outstandingKg > 0 && (
                          <span className="tabular-nums">
                            <i className="ri-time-line mr-1 text-amber-400" aria-hidden />
                            <strong>{r.outstandingKg.toLocaleString()}</strong> kg outstanding
                          </span>
                        )}
                        {r.lotCount > 0 && (
                          <span>
                            <i className="ri-stack-line mr-1 text-blue-400" aria-hidden />
                            {r.lotCount} lots
                          </span>
                        )}
                        <span>
                          <i className="ri-calendar-line mr-1 text-gray-400" aria-hidden />
                          Created: {createDate}
                        </span>
                        {recvDate && (
                          <span>
                            <i className="ri-truck-line mr-1 text-teal-400" aria-hidden />
                            Received: {recvDate}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                  <span className="text-[10px] text-gray-500 font-medium">
                    Page {page} of {totalPages} ({totalResults} POs)
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={page <= 1 || rowsLoading}
                      onClick={() => fetchRows(page - 1)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <i className="ri-arrow-left-s-line" aria-hidden />
                      Prev
                    </button>
                    <button
                      type="button"
                      disabled={page >= totalPages || rowsLoading}
                      onClick={() => fetchRows(page + 1)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                      <i className="ri-arrow-right-s-line" aria-hidden />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
