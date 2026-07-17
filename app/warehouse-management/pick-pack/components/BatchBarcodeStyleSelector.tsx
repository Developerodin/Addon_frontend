"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  STYLE_LIST_PAGE_SIZE_OPTIONS,
  filterSelectableStyles,
  findStyleListPage,
  formatStyleMeta,
  getStyleListTotalPages,
  paginateStyleRows,
  type BatchBarcodeStyleOption,
  type StyleListPageSize,
} from "./batchBarcodeStyleListUtils";

export interface BatchBarcodeStyleSelectorProps {
  /** Styles with picked qty > 0. */
  styles: BatchBarcodeStyleOption[];
  /** Undefined means "all styles". */
  selectedStyleCode?: string;
  onSelectStyleCode: (styleCode: string | undefined) => void;
  /** When true, jump list to the page containing the selected style. */
  focusSelectedOnMount?: boolean;
}

/**
 * Searchable, paginated style-code picker for batch barcode printing.
 * Renders only one page of rows at a time so large batches stay responsive.
 */
export default function BatchBarcodeStyleSelector({
  styles,
  selectedStyleCode,
  onSelectStyleCode,
  focusSelectedOnMount = false,
}: BatchBarcodeStyleSelectorProps) {
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<StyleListPageSize>(25);

  const filteredStyles = useMemo(
    () => filterSelectableStyles(styles, searchTerm),
    [styles, searchTerm],
  );

  const totalPages = useMemo(
    () => getStyleListTotalPages(filteredStyles.length, pageSize),
    [filteredStyles.length, pageSize],
  );

  const visibleStyles = useMemo(
    () => paginateStyleRows(filteredStyles, page, pageSize),
    [filteredStyles, page, pageSize],
  );

  const selectedStyle = useMemo(
    () => (selectedStyleCode ? styles.find((item) => item.styleCode === selectedStyleCode) : undefined),
    [selectedStyleCode, styles],
  );

  const selectedVisibleOnPage = useMemo(
    () => Boolean(selectedStyleCode && visibleStyles.some((item) => item.styleCode === selectedStyleCode)),
    [selectedStyleCode, visibleStyles],
  );

  const pageStart = filteredStyles.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(page * pageSize, filteredStyles.length);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (!focusSelectedOnMount || !selectedStyleCode) return;
    setPage(findStyleListPage(filteredStyles, selectedStyleCode, pageSize));
  }, [focusSelectedOnMount, selectedStyleCode, filteredStyles, pageSize]);

  const resultSummary =
    searchTerm.trim().length > 0
      ? `${filteredStyles.length.toLocaleString()} matching · ${styles.length.toLocaleString()} total`
      : `${styles.length.toLocaleString()} style${styles.length === 1 ? "" : "s"} with picked qty`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <label htmlFor="style-search" className="block text-[11px] font-bold text-gray-700 uppercase">
          Select style code
        </label>
        <p className="text-[10px] text-gray-500" aria-live="polite">
          {resultSummary}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <i
            className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"
            aria-hidden
          />
          <input
            id="style-search"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search style code, size, or shade…"
            className="w-full border border-gray-200 rounded pl-9 pr-3 py-2 text-sm focus:border-purple-300 focus:outline-none"
            aria-label="Search style codes in this pick list"
            autoComplete="off"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="style-page-size" className="text-[10px] font-bold text-gray-600 uppercase whitespace-nowrap">
            Per page
          </label>
          <select
            id="style-page-size"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value) as StyleListPageSize);
              setPage(1);
            }}
            className="border border-gray-200 rounded px-2 py-1.5 text-[12px] w-[4.5rem] bg-white"
            aria-label="Style codes per page"
          >
            {STYLE_LIST_PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedStyle && !selectedVisibleOnPage ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-purple-200 bg-purple-50/60 px-3 py-2 text-[11px] text-purple-900">
          <span>
            Selected: <strong>{selectedStyle.styleCode}</strong>
            <span className="text-purple-700/80"> · Picked {selectedStyle.pickedQty}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setPage(findStyleListPage(filteredStyles, selectedStyle.styleCode, pageSize));
            }}
            className="ml-auto text-[10px] font-bold uppercase text-purple-700 hover:text-purple-900 underline"
          >
            Show in list
          </button>
        </div>
      ) : null}

      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <label className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50 has-[:checked]:bg-purple-50/40 border-b border-gray-100">
          <input
            type="radio"
            name="barcode-style-scope"
            checked={!selectedStyleCode}
            onChange={() => onSelectStyleCode(undefined)}
            className="mt-0.5 text-purple-600"
          />
          <span>
            <span className="block font-semibold text-gray-900">All styles</span>
            <span className="text-[11px] text-gray-500">
              Print barcodes for every picked style in this batch ({styles.length.toLocaleString()})
            </span>
          </span>
        </label>

        <div role="listbox" aria-label="Style codes in pick list" className="divide-y divide-gray-100">
          {styles.length === 0 ? (
            <p className="p-3 text-[11px] text-gray-500">No style codes with picked qty in this batch.</p>
          ) : filteredStyles.length === 0 ? (
            <p className="p-3 text-[11px] text-gray-500">
              No matching style codes. Try a different search or{" "}
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="font-semibold text-purple-700 underline hover:text-purple-900"
              >
                clear search
              </button>
              .
            </p>
          ) : (
            visibleStyles.map((item) => (
              <label
                key={item.styleCode}
                className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50 has-[:checked]:bg-purple-50/40"
              >
                <input
                  type="radio"
                  name="barcode-style-scope"
                  checked={selectedStyleCode === item.styleCode}
                  onChange={() => onSelectStyleCode(item.styleCode)}
                  className="mt-0.5 text-purple-600"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-gray-900 truncate" title={item.styleCode}>
                    {item.styleCode}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {formatStyleMeta(item)} · Picked{" "}
                    <strong className="text-gray-800">{item.pickedQty}</strong>
                  </span>
                </span>
              </label>
            ))
          )}
        </div>

        {filteredStyles.length > 0 ? (
          <div
            className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-gray-50/60 px-3 py-2 text-[10px] text-gray-600"
            role="navigation"
            aria-label="Style code list pagination"
          >
            <span aria-live="polite">
              {filteredStyles.length <= pageSize
                ? `Showing all ${filteredStyles.length.toLocaleString()}`
                : `Showing ${pageStart.toLocaleString()}–${pageEnd.toLocaleString()} of ${filteredStyles.length.toLocaleString()}`}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="px-2 py-1 rounded border border-gray-200 bg-white font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Previous style page"
              >
                Prev
              </button>
              <span className="px-1 tabular-nums">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
                className="px-2 py-1 rounded border border-gray-200 bg-white font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Next style page"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
