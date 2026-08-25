"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  productionService,
  type OrderSummaryMetrics,
  type OrderSummaryRow,
} from "@/shared/services/productionService";
import ProductionOrderSummaryFormulaDrawer from "./ProductionOrderSummaryFormulaDrawer";
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
  transferQty: 0,
  wipQty: 0,
};

/**
 * Formats a qty for the summary table; negatives keep their sign (WIP not clamped).
 * @param n Quantity
 */
function fmtQty(n: number): string {
  return (n ?? 0).toLocaleString();
}

/**
 * Tailwind badge classes for order priority.
 * @param priority Priority label
 */
function priorityBadge(priority: string): string {
  const map: Record<string, string> = {
    Urgent: "bg-red-100 text-red-800",
    High: "bg-orange-100 text-orange-800",
    Medium: "bg-yellow-100 text-yellow-800",
    Low: "bg-green-100 text-green-800",
  };
  return map[priority] || "bg-gray-100 text-gray-800";
}

/**
 * Header cell with a formula info button that opens the side drawer.
 */
function FormulaHeader({
  label,
  columnKey,
  align = "right",
  rowSpan,
  onOpen,
}: {
  label: string;
  columnKey: OrderSummaryColumnKey;
  align?: "left" | "right";
  rowSpan?: number;
  onOpen: (key: OrderSummaryColumnKey) => void;
}) {
  return (
    <th
      rowSpan={rowSpan}
      className={`px-1.5 py-2 text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300 align-bottom ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      <span className={`inline-flex items-center gap-0.5 ${align === "right" ? "justify-end w-full" : ""}`}>
        {label}
        <button
          type="button"
          className="p-0.5 rounded text-gray-400 hover:text-purple-600 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
          aria-label={`How ${label} is calculated`}
          title={`How ${label} is calculated`}
          onClick={() => onOpen(columnKey)}
        >
          <i className="ri-information-line text-xs" aria-hidden="true" />
        </button>
      </span>
    </th>
  );
}

/**
 * Production supervisor tab: one row per order with planned / hold / knit pending / WIP / transfer.
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
        const tp = data.totalPages ?? 1;
        const tot = data.total ?? 0;
        const safePages = tot === 0 ? 1 : Math.max(1, tp);
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

  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div>
      <div className="p-[10px] mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <label className="relative flex items-center">
          <span className="sr-only">Search orders</span>
          <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" aria-hidden="true" />
          <input
            type="text"
            className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-52 placeholder:text-gray-400 font-medium"
            placeholder="Search order number or name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            aria-label="Search by order number or order name"
          />
        </label>
        <select
          className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-2 py-1.5"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by order status"
        >
          <option value="">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="On Hold">On Hold</option>
          <option value="Short Close">Short Close</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <select
          className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-2 py-1.5"
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by priority"
        >
          <option value="">All priorities</option>
          <option value="Urgent">Urgent</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <div className="flex items-center gap-1.5">
          <label htmlFor="order-summary-page-size" className="text-[11px] font-medium text-gray-600 whitespace-nowrap">
            Orders / page
          </label>
          <select
            id="order-summary-page-size"
            className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5"
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            aria-label="How many orders to show per page"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 disabled:opacity-50"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Refresh production order summary"
        >
          <i className={`ri-refresh-line text-xs ${loading ? "animate-spin" : ""}`} aria-hidden="true" /> Refresh
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 disabled:opacity-50"
          onClick={() => downloadOrderSummaryCsv(rows, totals)}
          disabled={loading || rows.length === 0}
          aria-label="Export current page as CSV"
        >
          <i className="ri-download-2-line text-xs" aria-hidden="true" /> Export
        </button>
      </div>

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
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 [border-spacing:0]" aria-label="Production order summary">
              <thead>
                <tr className="bg-gray-50/80">
                  <th
                    rowSpan={2}
                    className="pl-[10px] pr-1 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300 align-bottom"
                  >
                    <span className="inline-flex items-center gap-0.5">
                      Order
                      <button
                        type="button"
                        className="p-0.5 rounded text-gray-400 hover:text-purple-600 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        aria-label="How Order is calculated"
                        title="How Order is calculated"
                        onClick={() => setFormulaColumn("order")}
                      >
                        <i className="ri-information-line text-xs" aria-hidden="true" />
                      </button>
                    </span>
                  </th>
                  <th
                    colSpan={3}
                    className="px-1.5 py-1.5 text-center text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300 bg-purple-50/60"
                  >
                    Qty
                  </th>
                  <FormulaHeader
                    label="Knit pending (no hold)"
                    columnKey="knitPendingWithoutHold"
                    rowSpan={2}
                    onOpen={setFormulaColumn}
                  />
                  <FormulaHeader label="WIP" columnKey="wipQty" rowSpan={2} onOpen={setFormulaColumn} />
                  <FormulaHeader label="Transfer" columnKey="transferQty" rowSpan={2} onOpen={setFormulaColumn} />
                </tr>
                <tr className="bg-gray-50/80">
                  <FormulaHeader label="Total" columnKey="totalQty" onOpen={setFormulaColumn} />
                  <FormulaHeader label="Hold" columnKey="holdQty" onOpen={setFormulaColumn} />
                  <FormulaHeader label="Pending + hold" columnKey="knitPendingWithHold" onOpen={setFormulaColumn} />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.orderId} className="hover:bg-gray-50/50">
                    <td className="pl-[10px] pr-1 py-2.5 border border-gray-300">
                      <div className="text-[12px] font-bold text-gray-900">{row.orderNumber || row.orderId}</div>
                      {row.orderNote ? (
                        <div className="text-[11px] text-gray-600 font-medium truncate max-w-[220px]" title={row.orderNote}>
                          {row.orderNote}
                        </div>
                      ) : null}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${priorityBadge(row.priority)}`}>
                          {row.priority || "—"}
                        </span>
                        <span className="text-[10px] text-gray-500">{row.articleCount} article{row.articleCount !== 1 ? "s" : ""}</span>
                      </div>
                    </td>
                    <td className="px-1.5 py-2.5 text-right text-[12px] font-medium text-gray-800 border border-gray-300 tabular-nums">
                      {fmtQty(row.totalQty)}
                    </td>
                    <td className="px-1.5 py-2.5 text-right text-[12px] font-medium text-orange-700 border border-gray-300 tabular-nums">
                      {fmtQty(row.holdQty)}
                    </td>
                    <td className="px-1.5 py-2.5 text-right text-[12px] font-medium text-gray-800 border border-gray-300 tabular-nums">
                      {fmtQty(row.knitPendingWithHold)}
                    </td>
                    <td className="px-1.5 py-2.5 text-right text-[12px] font-medium text-amber-700 border border-gray-300 tabular-nums">
                      {fmtQty(row.knitPendingWithoutHold)}
                    </td>
                    <td
                      className={`px-1.5 py-2.5 text-right text-[12px] font-semibold border border-gray-300 tabular-nums ${
                        row.wipQty < 0 ? "text-red-700" : "text-blue-800"
                      }`}
                    >
                      {fmtQty(row.wipQty)}
                    </td>
                    <td className="px-1.5 py-2.5 text-right text-[12px] font-medium text-emerald-800 border border-gray-300 tabular-nums">
                      {fmtQty(row.transferQty)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold">
                  <td className="pl-[10px] pr-1 py-2.5 text-[11px] text-gray-700 border border-gray-300">
                    Page ({rows.length} order{rows.length !== 1 ? "s" : ""})
                  </td>
                  <td className="px-1.5 py-2.5 text-right text-[12px] border border-gray-300 tabular-nums">{fmtQty(pageTotals.totalQty)}</td>
                  <td className="px-1.5 py-2.5 text-right text-[12px] text-orange-700 border border-gray-300 tabular-nums">{fmtQty(pageTotals.holdQty)}</td>
                  <td className="px-1.5 py-2.5 text-right text-[12px] border border-gray-300 tabular-nums">{fmtQty(pageTotals.knitPendingWithHold)}</td>
                  <td className="px-1.5 py-2.5 text-right text-[12px] text-amber-700 border border-gray-300 tabular-nums">{fmtQty(pageTotals.knitPendingWithoutHold)}</td>
                  <td className="px-1.5 py-2.5 text-right text-[12px] text-blue-800 border border-gray-300 tabular-nums">{fmtQty(pageTotals.wipQty)}</td>
                  <td className="px-1.5 py-2.5 text-right text-[12px] text-emerald-800 border border-gray-300 tabular-nums">{fmtQty(pageTotals.transferQty)}</td>
                </tr>
                <tr className="bg-purple-50 font-bold">
                  <td className="pl-[10px] pr-1 py-2.5 text-[11px] text-purple-900 border border-gray-300">
                    All matching ({total.toLocaleString()} order{total !== 1 ? "s" : ""} · {fmtQty(totals.articleCount)} articles)
                  </td>
                  <td className="px-1.5 py-2.5 text-right text-[12px] text-purple-900 border border-gray-300 tabular-nums">{fmtQty(totals.totalQty)}</td>
                  <td className="px-1.5 py-2.5 text-right text-[12px] text-orange-800 border border-gray-300 tabular-nums">{fmtQty(totals.holdQty)}</td>
                  <td className="px-1.5 py-2.5 text-right text-[12px] text-purple-900 border border-gray-300 tabular-nums">{fmtQty(totals.knitPendingWithHold)}</td>
                  <td className="px-1.5 py-2.5 text-right text-[12px] text-amber-800 border border-gray-300 tabular-nums">{fmtQty(totals.knitPendingWithoutHold)}</td>
                  <td className="px-1.5 py-2.5 text-right text-[12px] text-blue-900 border border-gray-300 tabular-nums">{fmtQty(totals.wipQty)}</td>
                  <td className="px-1.5 py-2.5 text-right text-[12px] text-emerald-900 border border-gray-300 tabular-nums">{fmtQty(totals.transferQty)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100">
            <div className="text-[11px] font-medium text-[#495057]">
              Showing {from} to {to} of {total.toLocaleString()} orders
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30"
              >
                Prev
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const pageNum =
                  totalPages <= 7
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
            </div>
          </div>
        </>
      )}

      <ProductionOrderSummaryFormulaDrawer columnKey={formulaColumn} onClose={() => setFormulaColumn(null)} />
    </div>
  );
}
