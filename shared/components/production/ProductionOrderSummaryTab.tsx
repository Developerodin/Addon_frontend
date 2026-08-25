"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  productionService,
  type OrderSummaryMetrics,
  type OrderSummaryRow,
} from "@/shared/services/productionService";
import ProductionOrderSummaryFormulaDrawer from "./ProductionOrderSummaryFormulaDrawer";
import ProductionOrderSummaryTable from "./ProductionOrderSummaryTable";
import ProductionOrderSummaryToolbar from "./ProductionOrderSummaryToolbar";
import { downloadOrderSummaryCsv } from "./productionOrderSummaryExport";
import type { OrderSummaryColumnKey } from "./productionOrderSummaryFormulas";

export interface ProductionOrderSummaryTabProps {
  /** Increment from parent header Refresh to reload this tab. */
  refreshNonce?: number;
  /** Reports in-flight state so the page header Refresh spinner can follow. */
  onLoadingChange?: (loading: boolean) => void;
}

const EMPTY_METRICS: OrderSummaryMetrics = {
  articleCount: 0,
  totalQty: 0,
  holdQty: 0,
  knitPendingWithHold: 0,
  knitPendingWithoutHold: 0,
  knitPendingQty: 0,
  knitPendingOnMachine: 0,
  knitPendingUnplanned: 0,
  closedOnMachineQty: 0,
  onHoldQty: 0,
  transferQty: 0,
  wipQty: 0,
};

/** Max page buttons rendered in the pager. */
const MAX_PAGE_BUTTONS = 7;

/**
 * Production supervisor tab: one row per order with planned qty, knitting
 * pending split into on-machine and unplanned, and the balances that are not
 * pending (short close, closed on machine, on hold).
 */
export default function ProductionOrderSummaryTab({
  refreshNonce = 0,
  onLoadingChange,
}: ProductionOrderSummaryTabProps) {
  const [rows, setRows] = useState<OrderSummaryRow[]>([]);
  const [totals, setTotals] = useState<OrderSummaryMetrics>(EMPTY_METRICS);
  const [pageTotals, setPageTotals] = useState<OrderSummaryMetrics>(EMPTY_METRICS);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [showLegacy, setShowLegacy] = useState(false);
  const [formulaColumn, setFormulaColumn] = useState<OrderSummaryColumnKey | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    onLoadingChange?.(true);
    try {
      const response = await productionService.getOrderSummaryReport({
        page,
        limit,
        sortBy: "createdAt:desc",
        ...(search.trim() && { search: search.trim() }),
        ...(status && { status }),
        ...(priority && { priority }),
      });
      if (response.success && response.data) {
        const data = response.data;
        setRows(data.results || []);
        setTotals(data.totals || EMPTY_METRICS);
        setPageTotals(data.pageTotals || EMPTY_METRICS);
        const tot = data.total ?? 0;
        const safePages = tot === 0 ? 1 : Math.max(1, data.totalPages ?? 1);
        setTotalPages(safePages);
        setTotal(tot);
        if (page > safePages) setPage(safePages);
      } else {
        toast.error(response.error?.message || "Failed to load order summary");
        setRows([]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load order summary";
      toast.error(message);
      setRows([]);
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  }, [page, limit, search, status, priority, onLoadingChange]);

  useEffect(() => {
    const t = setTimeout(() => void load(), search ? 400 : 0);
    return () => clearTimeout(t);
  }, [load, refreshNonce]);

  /**
   * Changes page and scrolls the table into view.
   * @param next Target page
   */
  const handlePageChange = (next: number) => {
    setPage(Math.max(1, Math.min(next, totalPages)));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  /** Resets to page 1 whenever a filter narrows the result set. */
  const withPageReset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div>
      <ProductionOrderSummaryToolbar
        search={search}
        onSearchChange={withPageReset(setSearch)}
        status={status}
        onStatusChange={withPageReset(setStatus)}
        priority={priority}
        onPriorityChange={withPageReset(setPriority)}
        limit={limit}
        onLimitChange={withPageReset(setLimit)}
        showLegacy={showLegacy}
        onShowLegacyChange={setShowLegacy}
        loading={loading}
        canExport={rows.length > 0}
        onRefresh={() => void load()}
        onExport={() => downloadOrderSummaryCsv(rows, totals)}
      />

      {loading && rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20" role="status" aria-live="polite">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
          <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <i className="ri-inbox-line text-xl text-gray-200" aria-hidden="true" />
          </div>
          <h3 className="text-xs font-bold text-gray-400 mb-1">NO ORDER SUMMARY DATA</h3>
        </div>
      ) : (
        <>
          <ProductionOrderSummaryTable
            rows={rows}
            pageTotals={pageTotals}
            totals={totals}
            total={total}
            showLegacy={showLegacy}
            onOpenFormula={setFormulaColumn}
          />
          <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100">
            <div className="text-[11px] font-medium text-[#495057]">
              Showing {from} to {to} of {total.toLocaleString()} orders
            </div>
            <nav className="flex items-center gap-1" aria-label="Order summary pagination">
              <button
                type="button"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30"
              >
                Prev
              </button>
              {Array.from({ length: Math.min(totalPages, MAX_PAGE_BUTTONS) }, (_, i) => {
                const pageNum =
                  totalPages <= MAX_PAGE_BUTTONS
                    ? i + 1
                    : page <= 4
                      ? i + 1
                      : page >= totalPages - 3
                        ? totalPages - 6 + i
                        : page - 3 + i;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => handlePageChange(pageNum)}
                    aria-current={page === pageNum ? "page" : undefined}
                    className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded ${
                      page === pageNum ? "bg-purple-600 text-white shadow-md" : "text-gray-400 hover:bg-gray-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30"
              >
                Next
              </button>
            </nav>
          </div>
        </>
      )}

      <ProductionOrderSummaryFormulaDrawer columnKey={formulaColumn} onClose={() => setFormulaColumn(null)} />
    </div>
  );
}
