"use client";

import React from "react";

export interface DownloadExcelButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isExporting?: boolean;
  label?: string;
  ariaLabel?: string;
  className?: string;
}

/**
 * Shared Download Excel button for production management tables.
 */
export default function DownloadExcelButton({
  onClick,
  disabled = false,
  isExporting = false,
  label = "Download Excel",
  ariaLabel = "Download table data as Excel-compatible CSV",
  className = "",
}: DownloadExcelButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isExporting}
      className={`flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      title="Download filtered table rows as Excel-compatible CSV"
      aria-label={ariaLabel}
    >
      <i className="ri-file-excel-2-line text-xs text-emerald-600" aria-hidden="true" />
      {isExporting ? "Exporting…" : label}
    </button>
  );
}
