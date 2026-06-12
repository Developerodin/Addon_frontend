"use client";

import React from "react";

export interface M2PaginationProps {
  page: number;
  totalPages: number;
  totalResults: number;
  onPageChange: (page: number) => void;
}

/**
 * Simple prev/next pagination for M2 Management tables.
 */
export default function M2Pagination({ page, totalPages, totalResults, onPageChange }: M2PaginationProps) {
  if (totalPages <= 1 && totalResults <= 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-[10px] text-gray-600">
      <span>
        {totalResults > 0
          ? `Page ${page} of ${totalPages} · ${totalResults} result${totalResults === 1 ? "" : "s"}`
          : "No results"}
      </span>
      {totalPages > 1 ? (
        <div className="flex gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-40"
            aria-label="Previous page"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-40"
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
