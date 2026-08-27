"use client";

import React, { RefObject } from "react";

type Props = {
  importing: boolean;
  disabled?: boolean;
  disabledReason?: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onDownloadTemplate: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  importLabel?: string;
};

/**
 * Shared Download Template + Import Excel buttons for vendor PO list and add form.
 */
export default function VendorPOExcelToolbar({
  importing,
  disabled = false,
  disabledReason,
  fileInputRef,
  onDownloadTemplate,
  onFileChange,
  importLabel = "Import Excel",
}: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={onDownloadTemplate}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 text-[11px] font-bold rounded border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
        aria-label="Download vendor PO Excel template"
      >
        <i className="ri-file-excel-2-line text-xs text-green-600" aria-hidden="true" />
        Download Template
      </button>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || importing}
        title={disabled ? disabledReason : undefined}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 text-[11px] font-bold rounded border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
        aria-label="Import vendor PO from Excel or CSV"
      >
        {importing ? (
          <>
            <span
              className="animate-spin inline-block h-3 w-3 border-2 border-gray-400 border-t-transparent rounded-full"
              aria-hidden="true"
            />
            Importing...
          </>
        ) : (
          <>
            <i className="ri-file-upload-line text-xs" aria-hidden="true" />
            {importLabel}
          </>
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={onFileChange}
      />
    </div>
  );
}
