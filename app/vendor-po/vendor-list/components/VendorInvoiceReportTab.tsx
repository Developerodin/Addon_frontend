"use client";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  listVendorInvoiceReport,
  type VendorInvoiceReportRow,
} from "@/shared/services/vendorInvoiceReportService";
import { CRM } from "../crmUiClasses";
import { downloadVendorInvoiceReportExcel } from "../vendorInvoiceReportColumns";
import VendorInvoiceReportTable from "./VendorInvoiceReportTable";

const PAGE_SIZE = 50;
const EXPORT_LIMIT = 10000;

/**
 * Invoice / lot reconciliation report.
 */
const VendorInvoiceReportTab = () => {
  const [rows, setRows] = useState<VendorInvoiceReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  const hasFilters = searchQuery.trim() !== "" || fromDate !== "" || toDate !== "";

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listVendorInvoiceReport({
        page,
        limit: PAGE_SIZE,
        search: searchQuery.trim() || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      setRows(res.results || []);
      setTotalPages(Math.max(1, res.totalPages));
      setTotalResults(res.totalResults);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load invoice report";
      toast.error(msg);
      setRows([]);
      setTotalResults(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, fromDate, toDate]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  /**
   * Clear search and PO date filters.
   */
  const clearFilters = () => {
    setSearchQuery("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  /**
   * Export all rows matching current filters (not just the current page).
   */
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await listVendorInvoiceReport({
        page: 1,
        limit: EXPORT_LIMIT,
        search: searchQuery.trim() || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      downloadVendorInvoiceReportExcel(res.results || []);
      toast.success("Excel downloaded");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <div className="p-[10px]">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className={CRM.titleAccent} />
            <h1 className={CRM.pageTitle}>Invoice Report</h1>
            <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
              {totalResults}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600">
              From
              <input
                type="date"
                className="border border-gray-200 rounded px-2 py-1.5 text-[11px] text-gray-700 bg-white focus:outline-none focus:ring-0 focus:border-gray-300"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                aria-label="PO date from"
              />
            </label>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600">
              To
              <input
                type="date"
                className="border border-gray-200 rounded px-2 py-1.5 text-[11px] text-gray-700 bg-white focus:outline-none focus:ring-0 focus:border-gray-300"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                aria-label="PO date to"
              />
            </label>
            <div className="relative w-full sm:w-64 min-w-[180px]">
              <input
                type="text"
                className="w-full bg-white border-2 border-gray-600 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:!border-2 focus:!border-gray-600 focus:outline-none placeholder:text-gray-600 transition-all font-medium"
                placeholder="Vendor, PO, invoice no..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                aria-label="Search invoice report"
              />
              <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
            </div>
            {hasFilters && (
              <button type="button" className={CRM.btnSecondary} onClick={clearFilters}>
                <i className="ri-close-line text-xs" />
                Clear
              </button>
            )}
            <button
              type="button"
              className={CRM.btnSuccess}
              disabled={exporting || loading}
              onClick={handleExport}
              aria-label="Export invoice report to Excel"
            >
              {exporting ? (
                <>
                  <i className="ri-loader-4-line text-xs animate-spin" />
                  Exporting…
                </>
              ) : (
                <>
                  <i className="ri-file-excel-2-line text-xs" />
                  Excel
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <VendorInvoiceReportTable loading={loading} rows={rows} hasFilters={hasFilters} />

      {!loading && totalResults > 0 && (
        <div className={CRM.paginationBar}>
          <p className={CRM.paginationSummary}>
            Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, totalResults)} of{" "}
            {totalResults} entries
          </p>
          <div className="flex items-center">
            <button
              type="button"
              className={CRM.pageNavBtn}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <span className="text-[11px] font-bold text-gray-500 px-2">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              className={CRM.pageNavBtn}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default VendorInvoiceReportTab;
