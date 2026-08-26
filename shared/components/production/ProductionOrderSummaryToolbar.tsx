"use client";

import React from "react";

export interface ProductionOrderSummaryToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  priority: string;
  onPriorityChange: (value: string) => void;
  limit: number;
  onLimitChange: (value: number) => void;
  showLegacy: boolean;
  onShowLegacyChange: (value: boolean) => void;
  includeZeroPending: boolean;
  onIncludeZeroPendingChange: (value: boolean) => void;
  loading: boolean;
  canExport: boolean;
  onRefresh: () => void;
  onExport: () => void;
}

const STATUS_OPTIONS = [
  "Pending",
  "In Progress",
  "Completed",
  "On Hold",
  "Short Close",
  "Cancelled",
] as const;

const PRIORITY_OPTIONS = ["Urgent", "High", "Medium", "Low"] as const;

const PAGE_SIZES = [10, 25, 50, 100] as const;

const SELECT_CLASS =
  "bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-2 py-1.5 focus:ring-0 focus:border-purple-300";

/**
 * Filter, paging and export controls for the production order summary report.
 */
export default function ProductionOrderSummaryToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  limit,
  onLimitChange,
  showLegacy,
  onShowLegacyChange,
  includeZeroPending,
  onIncludeZeroPendingChange,
  loading,
  canExport,
  onRefresh,
  onExport,
}: ProductionOrderSummaryToolbarProps) {
  return (
    <div className="p-[10px] mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
      <label className="relative flex items-center">
        <span className="sr-only">Search orders</span>
        <i
          className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-52 placeholder:text-gray-400 font-medium"
          placeholder="Search order number or name..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search by order number or order name"
        />
      </label>

      <select
        className={SELECT_CLASS}
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        aria-label="Filter by order status"
      >
        <option value="">All statuses</option>
        {STATUS_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <select
        className={SELECT_CLASS}
        value={priority}
        onChange={(e) => onPriorityChange(e.target.value)}
        aria-label="Filter by priority"
      >
        <option value="">All priorities</option>
        {PRIORITY_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1.5">
        <label
          htmlFor="order-summary-page-size"
          className="text-[11px] font-medium text-gray-600 whitespace-nowrap"
        >
          Orders / page
        </label>
        <select
          id="order-summary-page-size"
          className={SELECT_CLASS}
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          aria-label="How many orders to show per page"
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={showLegacy}
          onChange={(e) => onShowLegacyChange(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          aria-describedby="order-summary-legacy-hint"
        />
        <span className="text-[11px] font-medium text-gray-600 whitespace-nowrap">Legacy pending</span>
      </label>
      <span id="order-summary-legacy-hint" className="sr-only">
        Shows the pending figure as it was calculated before balances closed on a machine were separated
        out, so the change can be compared.
      </span>

      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={includeZeroPending}
          onChange={(e) => onIncludeZeroPendingChange(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          aria-describedby="order-summary-zero-pending-hint"
        />
        <span className="text-[11px] font-medium text-gray-600 whitespace-nowrap">Show all orders</span>
      </label>
      <span id="order-summary-zero-pending-hint" className="sr-only">
        When off, orders whose knitting pending is 0 are hidden. Turn on to see every matching order.
      </span>

      <button
        type="button"
        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 disabled:opacity-50"
        onClick={onRefresh}
        disabled={loading}
        aria-label="Refresh production order summary"
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
  );
}
