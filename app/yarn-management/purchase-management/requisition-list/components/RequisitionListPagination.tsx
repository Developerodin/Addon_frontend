"use client";

import React from "react";

export interface RequisitionListPaginationProps {
  /** Current 1-based page index. */
  page: number;
  /** Total pages from API. */
  totalPages: number;
  /** Total matching rows across all pages. */
  totalResults: number;
  /** Page size. */
  limit: number;
  /** Called when page changes. */
  onPageChange: (nextPage: number) => void;
  /** Called when page size changes (resets to page 1 upstream). */
  onLimitChange: (nextLimit: number) => void;
  /** Disables controls during fetch. */
  disabled?: boolean;
}

/**
 * Compact pager for yarn critical requisitions table.
 */
export function RequisitionListPagination({
  page,
  totalPages,
  totalResults,
  limit,
  onPageChange,
  onLimitChange,
  disabled = false,
}: RequisitionListPaginationProps) {
  const start = totalResults === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, totalResults);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-[10px] py-3 border-t border-gray-100 bg-gray-50/30">
      <p className="text-[11px] text-gray-600 font-medium">
        Showing{" "}
        <span className="font-bold text-gray-800">{start}</span>–
        <span className="font-bold text-gray-800">{end}</span> of{" "}
        <span className="font-bold text-gray-800">{totalResults}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600">
          Rows
          <select
            className="bg-white border border-gray-200 rounded px-2 py-1 text-[11px] font-bold focus:ring-0 focus:border-purple-300 disabled:opacity-50"
            value={limit}
            disabled={disabled}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            aria-label="Rows per page"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 bg-white text-[11px] font-bold rounded hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
          aria-label="Previous page"
        >
          <i className="ri-arrow-left-s-line" aria-hidden />
          Prev
        </button>
        <span className="text-[11px] font-bold text-gray-700 tabular-nums px-1">
          {page} / {totalPages || 1}
        </span>
        <button
          type="button"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 bg-white text-[11px] font-bold rounded hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
          aria-label="Next page"
        >
          Next
          <i className="ri-arrow-right-s-line" aria-hidden />
        </button>
      </div>
    </div>
  );
}
