"use client";

import React from "react";

export type InwardSourceFilter = "all" | "vendor" | "production";

type Props = {
  /** Production / all sources: warehouse floor accept scan. */
  onScanClick: () => void;
  /** Vendor source: scan staged bag → empty POST accept (dispatch → warehouse handoff). */
  onVendorBagScanClick: () => void;
  onRefresh: () => void;
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  sourceFilter: InwardSourceFilter;
  onSourceFilterChange: (value: InwardSourceFilter) => void;
  onResetPage: () => void;
  limit: number;
  onLimitChange: (value: number) => void;
  totalResults: number;
};

/**
 * Toolbar for Inward Received: scan (warehouse vs vendor bag), filters, search.
 */
export default function WhmsInwardReceivedToolbar({
  onScanClick,
  onVendorBagScanClick,
  onRefresh,
  loading,
  search,
  onSearchChange,
  sourceFilter,
  onSourceFilterChange,
  onResetPage,
  limit,
  onLimitChange,
  totalResults,
}: Props) {
  return (
    <div className="p-[10px] flex flex-wrap items-center gap-2 border-b border-gray-300 bg-white">
      {sourceFilter === "vendor" ? (
        <button
          type="button"
          onClick={onVendorBagScanClick}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
          title="Scan the warehouse bag used in dispatch → warehouse transfer, then confirm accept"
        >
          <i className="ri-barcode-line text-xs" aria-hidden />
          Scan vendor bag
        </button>
      ) : (
        <button
          type="button"
          onClick={onScanClick}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
        >
          <i className="ri-barcode-line text-xs" aria-hidden />
          Scan container
        </button>
      )}
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50"
      >
        <i className={`ri-refresh-line text-xs ${loading ? "animate-spin" : ""}`} aria-hidden />
        Refresh
      </button>
      <div className="relative flex-1 min-w-[140px] max-w-[240px]">
        <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" aria-hidden />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search article, style, brand…"
          className="bg-white border border-gray-300 pl-8 pr-3 py-1.5 text-[11px] rounded w-full placeholder:text-gray-500 focus:ring-1 focus:ring-teal-400 focus:border-teal-500"
        />
      </div>
      <select
        value={sourceFilter}
        onChange={(e) => {
          onSourceFilterChange(e.target.value as InwardSourceFilter);
          onResetPage();
        }}
        className="bg-white border border-gray-300 text-[#495057] text-[11px] font-medium rounded px-2 py-1.5"
        title="Filter by inward source"
      >
        <option value="all">All sources</option>
        <option value="vendor">Vendor dispatch</option>
        <option value="production">Production</option>
      </select>
      <select
        value={limit}
        onChange={(e) => {
          onLimitChange(Number(e.target.value));
          onResetPage();
        }}
        className="bg-white border border-gray-300 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5"
      >
        <option value={10}>10 / page</option>
        <option value={25}>25 / page</option>
        <option value={50}>50 / page</option>
        <option value={100}>100 / page</option>
      </select>
      <span className="text-[11px] font-medium text-gray-600 ml-auto">
        {totalResults} row{totalResults !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
