"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  filterSelectableStyles,
  formatStyleMeta,
  type BatchBarcodeStyleOption,
} from "./batchBarcodeStyleListUtils";

export interface BatchBarcodeStyleSelectorProps {
  /** Styles with picked qty > 0. */
  styles: BatchBarcodeStyleOption[];
  selectedStyleCode: string;
  onSelectStyleCode: (styleCode: string) => void;
}

/**
 * Compact searchable style picker for single-style barcode printing.
 */
export default function BatchBarcodeStyleSelector({
  styles,
  selectedStyleCode,
  onSelectStyleCode,
}: BatchBarcodeStyleSelectorProps) {
  const [searchInput, setSearchInput] = useState("");

  const filteredStyles = useMemo(
    () => filterSelectableStyles(styles, searchInput),
    [styles, searchInput],
  );

  const selectedStyle = useMemo(
    () => styles.find((item) => item.styleCode === selectedStyleCode),
    [selectedStyleCode, styles],
  );

  useEffect(() => {
    if (!selectedStyleCode && styles[0]) {
      onSelectStyleCode(styles[0].styleCode);
    }
  }, [selectedStyleCode, styles, onSelectStyleCode]);

  return (
    <div className="space-y-2">
      <label htmlFor="style-search" className="block text-[11px] font-bold text-gray-700 uppercase">
        Style code
      </label>

      <div className="relative">
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

      {selectedStyle && !filteredStyles.some((item) => item.styleCode === selectedStyleCode) ? (
        <p className="text-[11px] text-purple-800 bg-purple-50 border border-purple-100 rounded px-3 py-2">
          Selected: <strong>{selectedStyle.styleCode}</strong> · Picked {selectedStyle.pickedQty}
        </p>
      ) : null}

      <div
        role="listbox"
        aria-label="Style codes in pick list"
        className="rounded-lg border border-gray-200 max-h-52 overflow-y-auto divide-y divide-gray-100"
      >
        {styles.length === 0 ? (
          <p className="p-3 text-[11px] text-gray-500">No style codes with picked qty in this batch.</p>
        ) : filteredStyles.length === 0 ? (
          <p className="p-3 text-[11px] text-gray-500">
            No matches.{" "}
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="font-semibold text-purple-700 underline hover:text-purple-900"
            >
              Clear search
            </button>
          </p>
        ) : (
          filteredStyles.map((item) => {
            const isSelected = selectedStyleCode === item.styleCode;
            return (
              <button
                key={item.styleCode}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => onSelectStyleCode(item.styleCode)}
                className={`w-full flex items-start gap-3 p-3 text-left transition-colors ${
                  isSelected
                    ? "bg-purple-50 border-l-2 border-l-purple-500"
                    : "hover:bg-gray-50 border-l-2 border-l-transparent"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-gray-900 truncate" title={item.styleCode}>
                    {item.styleCode}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {formatStyleMeta(item)} · Picked{" "}
                    <strong className="text-gray-800">{item.pickedQty}</strong>
                  </span>
                </span>
                {isSelected ? (
                  <i className="ri-check-line text-purple-600 text-sm shrink-0 mt-0.5" aria-hidden />
                ) : null}
              </button>
            );
          })
        )}
      </div>

      <p className="text-[10px] text-gray-500">
        {styles.length.toLocaleString()} style{styles.length === 1 ? "" : "s"} with picked qty
      </p>
    </div>
  );
}
