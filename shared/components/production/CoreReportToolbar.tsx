"use client";

import React from "react";

export interface CoreReportToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  limit: number;
  onLimitChange: (value: number) => void;
  loading: boolean;
  canExport: boolean;
  onRefresh: () => void;
  onExport: () => void;
  /** Rows matching the current search. */
  matchCount: number;
  /** Catalog items with a factory code (search ignored). */
  catalogTotal: number;
}

const PAGE_SIZES = [10, 25, 50, 100] as const;

const SELECT_CLASS =
  "bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-2 py-1.5 focus:ring-0 focus:border-purple-300";

/**
 * Search, page size, refresh and CSV export for the Core Report.
 */
export default function CoreReportToolbar({
  search,
  onSearchChange,
  limit,
  onLimitChange,
  loading,
  canExport,
  onRefresh,
  onExport,
  matchCount,
  catalogTotal,
}: CoreReportToolbarProps) {
  const filtered = Boolean(search.trim()) && matchCount !== catalogTotal;

  return (
    <div className="p-[10px] mb-2 space-y-2">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <label className="relative flex items-center">
        <span className="sr-only">Search Core Report</span>
        <i
          className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          className="bg-white border border-gray-200 pl-8 pr-8 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-64 placeholder:text-gray-400 font-medium"
          placeholder="Search factory, vendor, design, brand..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search by factory code, vendor code, design or brand"
        />
        {search ? (
          <button
            type="button"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
          >
            <i className="ri-close-line text-sm" aria-hidden="true" />
          </button>
        ) : null}
      </label>

      <div className="flex items-center gap-1.5">
        <label htmlFor="core-report-page-size" className="text-[11px] font-medium text-gray-600 whitespace-nowrap">
          Rows / page
        </label>
        <select
          id="core-report-page-size"
          className={SELECT_CLASS}
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          aria-label="How many rows to show per page"
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 disabled:opacity-50"
        onClick={onRefresh}
        disabled={loading}
        aria-label="Refresh Core Report"
      >
        <i className={`ri-refresh-line text-xs ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
        Refresh
      </button>

      <button
        type="button"
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 disabled:opacity-50"
        onClick={onExport}
        disabled={loading || !canExport}
        aria-label="Export current page as CSV"
      >
        <i className="ri-download-2-line text-xs" aria-hidden="true" />
        Export
      </button>
    </div>
      <p className="text-[11px] text-gray-500" role="status">
        {filtered ? (
          <>
            Search matches <span className="font-bold text-[#495057]">{matchCount.toLocaleString()}</span> of{" "}
            <span className="font-bold text-[#495057]">{catalogTotal.toLocaleString()}</span> catalog items. Clear
            search to see all. Warehouse stock is one row per style — SAP Stock sums those onto the factory code.
          </>
        ) : (
          <>
            <span className="font-bold text-[#495057]">{catalogTotal.toLocaleString()}</span> catalog items (same as
            Items master with a factory code). Warehouse inventory is per style code; this report is one row per
            factory code with SAP Stock rolled up.
          </>
        )}
      </p>
    </div>
  );
}
