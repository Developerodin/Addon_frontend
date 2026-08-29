"use client";

import React, { useEffect, useRef, useState } from "react";

export interface ReportExcelExportMenuProps {
  disabled?: boolean;
  exporting?: boolean;
  pageCount: number;
  totalCount: number;
  totalPages: number;
  onExportPage: () => void;
  onExportAll: () => void;
  className?: string;
  variant?: "outline" | "success";
}

/**
 * Excel export: this page, or every row matching the current filters.
 */
export default function ReportExcelExportMenu({
  disabled = false,
  exporting = false,
  pageCount,
  totalCount,
  totalPages,
  onExportPage,
  onExportAll,
  className = "",
  variant = "outline",
}: ReportExcelExportMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isDisabled = disabled || exporting;
  const menuAlign = variant === "success" ? "right-0" : "left-0";
  const hasMultiplePages = totalPages > 1 && totalCount > pageCount;

  const buttonClass =
    variant === "success"
      ? "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      : "flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed";

  useEffect(() => {
    if (!open) return undefined;

    /**
     * Close the menu on outside click or Escape.
     * @param event Pointer or keyboard event
     */
    const onDocEvent = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") setOpen(false);
        return;
      }
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocEvent);
    document.addEventListener("keydown", onDocEvent);
    return () => {
      document.removeEventListener("mousedown", onDocEvent);
      document.removeEventListener("keydown", onDocEvent);
    };
  }, [open]);

  /**
   * Run an export action and close the menu.
   * @param action Page or full-report export
   */
  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  if (!hasMultiplePages) {
    return (
      <button
        type="button"
        className={`${buttonClass} ${className}`}
        onClick={onExportAll}
        disabled={isDisabled}
        aria-label="Export full report to Excel"
        title="Download all matching rows as Excel"
      >
        <i className={`ri-file-excel-2-line text-xs ${variant === "success" ? "" : "text-emerald-600"}`} aria-hidden="true" />
        {exporting ? "Exporting…" : "Excel"}
      </button>
    );
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        className={buttonClass}
        onClick={() => setOpen((value) => !value)}
        disabled={isDisabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Export Excel options"
        title="This page or full report"
      >
        <i className={`ri-file-excel-2-line text-xs ${variant === "success" ? "" : "text-emerald-600"}`} aria-hidden="true" />
        {exporting ? "Exporting…" : "Excel"}
        <i className="ri-arrow-down-s-line text-xs" aria-hidden="true" />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Excel export options"
          className={`absolute ${menuAlign} z-30 mt-1 min-w-[220px] rounded border border-gray-200 bg-white py-1 shadow-lg`}
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center justify-between gap-3 whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold text-[#495057] hover:bg-gray-50"
            onClick={() => run(onExportPage)}
          >
            <span>This page</span>
            <span className="font-bold text-gray-400">{pageCount.toLocaleString()} rows</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center justify-between gap-3 whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold text-[#495057] hover:bg-gray-50"
            onClick={() => run(onExportAll)}
          >
            <span>Full report</span>
            <span className="font-bold text-gray-400">{totalCount.toLocaleString()} rows</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
