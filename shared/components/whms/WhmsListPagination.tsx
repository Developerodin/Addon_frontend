"use client";

import React from "react";

export interface WhmsListPaginationProps {
  page: number;
  totalPages: number;
  totalResults: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

/**
 * Prev/Next footer for WHMS operational list pages (matches Pick&Pack styling).
 */
export default function WhmsListPagination({
  page,
  totalPages,
  totalResults,
  onPageChange,
  itemLabel = "items",
}: WhmsListPaginationProps) {
  if (totalPages <= 0) return null;

  return (
    <div
      className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white"
      aria-label="Pagination"
    >
      <div className="text-[11px] font-medium text-[#495057] tracking-tight">
        Page <span>{page}</span> of <span>{totalPages}</span>
        <span className="ml-2 opacity-50">
          ({totalResults} {totalResults === 1 ? itemLabel.replace(/s$/, "") : itemLabel})
        </span>
      </div>
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          Next
        </button>
      </div>
    </div>
  );
}
