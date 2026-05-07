"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  yarnInventoryService,
  type PoAnalyticsLineRow,
} from "../../services/yarnInventoryService";

export interface PoDrillDownDrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  loadParams: {
    start_date: string;
    end_date: string;
    date_mode: "created" | "received";
    supplier_id?: string;
    yarn_catalog_id?: string;
    status?: string;
    include_draft?: boolean;
    group_by?: "supplier" | "status" | "yarn";
    group_id?: string;
  } | null;
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

export function PoDrillDownDrawer({
  open,
  title,
  onClose,
  loadParams,
}: PoDrillDownDrawerProps) {
  const [rows, setRows] = useState<PoAnalyticsLineRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (targetPage: number) => {
      if (!loadParams) return;
      setLoading(true);
      setError(null);
      try {
        const res = await yarnInventoryService.getPoAnalyticsLines({
          ...loadParams,
          page: targetPage,
          limit: 15,
        });
        setRows(res.results);
        setTotalPages(res.totalPages);
        setTotalResults(res.totalResults);
        setPage(res.page);
      } catch (err) {
        console.error("PO analytics lines:", err);
        setError(err instanceof Error ? err.message : "Failed to load POs");
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [loadParams]
  );

  useEffect(() => {
    if (open && loadParams) {
      setPage(1);
      fetchPage(1);
    }
  }, [open, loadParams, fetchPage]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-end bg-black/40 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right"
        role="dialog"
        aria-modal="true"
        aria-labelledby="po-drill-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-50 text-purple-600 flex-shrink-0">
              <i className="ri-file-list-3-line text-sm" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 id="po-drill-title" className="text-sm font-bold text-gray-900 truncate">
                {title}
              </h2>
              {totalResults > 0 && (
                <p className="text-[10px] text-gray-500">{totalResults} purchase orders</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            aria-label="Close panel"
          >
            <i className="ri-close-line text-lg" aria-hidden />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4">
          {error && (
            <div className="flex items-center gap-2 p-3 mb-3 bg-red-50 rounded-lg border border-red-100" role="alert">
              <i className="ri-error-warning-line text-red-500" aria-hidden />
              <p className="text-[11px] text-red-700 font-medium">{error}</p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mb-3" />
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider" role="status">
                Loading purchase orders
              </p>
            </div>
          )}

          {!loading && !error && rows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <i className="ri-file-search-line text-2xl text-gray-400" aria-hidden />
              </div>
              <p className="text-sm font-bold text-gray-400">No purchase orders</p>
              <p className="text-[11px] text-gray-400 mt-1">Try adjusting the filters</p>
            </div>
          )}

          {rows.length > 0 && !loading && (
            <div className="space-y-2">
              {rows.map((r) => {
                const statusClass = STATUS_BADGE[r.currentStatus] || "bg-gray-100 text-gray-700";
                return (
                  <div
                    key={r.purchaseOrderId}
                    className="rounded-lg border border-gray-100 bg-white p-3 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
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
                        className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                      >
                        <i className="ri-external-link-line" aria-hidden />
                        Open
                      </Link>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-[10px] text-gray-600">
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
                      {r.lotCount > 0 && (
                        <span>
                          <i className="ri-stack-line mr-1 text-blue-400" aria-hidden />
                          {r.lotCount} lots
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-200 px-4 py-2.5 flex items-center justify-between shrink-0 bg-gray-50/50">
            <span className="text-[10px] text-gray-500 font-medium">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => fetchPage(page - 1)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <i className="ri-arrow-left-s-line" aria-hidden />
                Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => fetchPage(page + 1)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <i className="ri-arrow-right-s-line" aria-hidden />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
