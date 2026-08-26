"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  productionService,
  type CoreReportMetrics,
  type CoreReportRow,
} from "@/shared/services/productionService";
import CoreReportFormulaDrawer from "./CoreReportFormulaDrawer";
import CoreReportTable from "./CoreReportTable";
import CoreReportToolbar from "./CoreReportToolbar";
import { downloadCoreReportCsv } from "./coreReportExport";
import type { CoreReportColumnKey } from "./coreReportFormulas";

export interface CoreReportTabProps {
  /** Increment from parent header Refresh to reload this tab. */
  refreshNonce?: number;
  /** Reports in-flight state so the page header Refresh spinner can follow. */
  onLoadingChange?: (loading: boolean) => void;
}

const EMPTY_METRICS: CoreReportMetrics = {
  sapStock: 0,
  inwardPending: 0,
  inTransit: 0,
  wip: 0,
  runningOnMachine: 0,
  productionPlanning: 0,
  totalInhand: 0,
  vendorPending: {},
};

/** Max page buttons rendered in the pager. */
const MAX_PAGE_BUTTONS = 7;

/**
 * Production supervisor tab: warehouse + vendor + factory position per factory code.
 */
export default function CoreReportTab({ refreshNonce = 0, onLoadingChange }: CoreReportTabProps) {
  const [rows, setRows] = useState<CoreReportRow[]>([]);
  const [totals, setTotals] = useState<CoreReportMetrics>(EMPTY_METRICS);
  const [pageTotals, setPageTotals] = useState<CoreReportMetrics>(EMPTY_METRICS);
  const [vendorColumns, setVendorColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [formulaColumn, setFormulaColumn] = useState<CoreReportColumnKey | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    onLoadingChange?.(true);
    try {
      const response = await productionService.getCoreReport({
        page,
        limit,
        sortBy: "factoryCode:asc",
        ...(search.trim() && { search: search.trim() }),
      });
      if (response.success && response.data) {
        const data = response.data;
        setRows(data.results || []);
        setTotals(data.totals || EMPTY_METRICS);
        setPageTotals(data.pageTotals || EMPTY_METRICS);
        setVendorColumns(data.vendorColumns || []);
        const tot = data.total ?? 0;
        const safePages = tot === 0 ? 1 : Math.max(1, data.totalPages ?? 1);
        setTotalPages(safePages);
        setTotal(tot);
        setCatalogTotal(data.catalogTotal ?? tot);
        if (page > safePages) setPage(safePages);
      } else {
        toast.error(response.error?.message || "Failed to load Core Report");
        setRows([]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load Core Report";
      toast.error(message);
      setRows([]);
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  }, [page, limit, search, onLoadingChange]);

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
      <CoreReportToolbar
        search={search}
        onSearchChange={withPageReset(setSearch)}
        limit={limit}
        onLimitChange={withPageReset(setLimit)}
        loading={loading}
        canExport={rows.length > 0}
        onRefresh={() => void load()}
        onExport={() => downloadCoreReportCsv(rows, totals, vendorColumns)}
        matchCount={total}
        catalogTotal={catalogTotal}
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
          <h3 className="text-xs font-bold text-gray-400 mb-1">NO CORE REPORT DATA</h3>
          {search.trim() ? (
            <p className="text-[11px] text-gray-400">
              Nothing matches “{search.trim()}”. Clear search to see {catalogTotal.toLocaleString() || "all"} catalog
              items.
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <CoreReportTable
            rows={rows}
            pageTotals={pageTotals}
            totals={totals}
            total={total}
            vendorColumns={vendorColumns}
            onOpenFormula={setFormulaColumn}
          />
          <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100">
            <div className="text-[11px] font-medium text-[#495057]">
              Showing {from} to {to} of {total.toLocaleString()} items
            </div>
            <nav className="flex items-center gap-1" aria-label="Core Report pagination">
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

      <CoreReportFormulaDrawer columnKey={formulaColumn} onClose={() => setFormulaColumn(null)} />
    </div>
  );
}
