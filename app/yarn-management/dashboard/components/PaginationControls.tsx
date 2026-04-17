"use client";

import React from "react";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalResults: number;
  pageSize: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
}

/**
 * Reusable pagination nav with first/prev/page-numbers/next/last buttons.
 */
const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  totalResults,
  pageSize,
  loading = false,
  onPageChange,
}) => {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalResults);

  /** Generate visible page numbers with ellipsis */
  const getPageNumbers = (): (number | "...")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "...")[] = [1];
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    if (start > 2) pages.push("...");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  const handleChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    onPageChange(page);
  };

  const btnBase =
    "px-2 py-1.5 text-xs font-medium rounded border transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
      <div className="text-sm text-gray-600">
        {totalResults > 0
          ? `Showing ${startItem}–${endItem} of ${totalResults} items`
          : "No items"}
      </div>

      {totalPages > 1 && (
        <nav className="flex items-center gap-1" aria-label="Pagination">
          <button
            type="button"
            onClick={() => handleChange(1)}
            disabled={currentPage === 1 || loading}
            className={`${btnBase} border-gray-300 text-gray-600 hover:bg-gray-50`}
            aria-label="First page"
          >
            <i className="ri-skip-back-mini-line"></i>
          </button>
          <button
            type="button"
            onClick={() => handleChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className={`${btnBase} border-gray-300 text-gray-600 hover:bg-gray-50`}
            aria-label="Previous page"
          >
            <i className="ri-arrow-left-s-line"></i>
          </button>

          {getPageNumbers().map((pg, idx) =>
            pg === "..." ? (
              <span
                key={`ellipsis-${idx}`}
                className="px-1.5 py-1.5 text-xs text-gray-400"
              >
                ...
              </span>
            ) : (
              <button
                key={pg}
                type="button"
                onClick={() => handleChange(pg)}
                disabled={loading}
                className={`min-w-[32px] ${btnBase} ${
                  pg === currentPage
                    ? "bg-purple-600 text-white border-purple-600"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {pg}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => handleChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            className={`${btnBase} border-gray-300 text-gray-600 hover:bg-gray-50`}
            aria-label="Next page"
          >
            <i className="ri-arrow-right-s-line"></i>
          </button>
          <button
            type="button"
            onClick={() => handleChange(totalPages)}
            disabled={currentPage === totalPages || loading}
            className={`${btnBase} border-gray-300 text-gray-600 hover:bg-gray-50`}
            aria-label="Last page"
          >
            <i className="ri-skip-forward-mini-line"></i>
          </button>
        </nav>
      )}
    </div>
  );
};

export default PaginationControls;
