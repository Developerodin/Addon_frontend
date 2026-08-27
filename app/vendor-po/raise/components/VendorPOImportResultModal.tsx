"use client";

import React from "react";

type Props = {
  open: boolean;
  title: string;
  errors: string[];
  successMessage?: string;
  onDownloadErrors?: () => void;
  onClose: () => void;
};

/**
 * Shows Excel import row errors (or a success summary) after a vendor PO import.
 */
export default function VendorPOImportResultModal({
  open,
  title,
  errors,
  successMessage,
  onDownloadErrors,
  onClose,
}: Props) {
  if (!open) return null;
  const hasErrors = errors.length > 0;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vendor-po-import-result-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col border border-gray-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 id="vendor-po-import-result-title" className="text-sm font-bold text-gray-800">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500"
            aria-label="Close import result"
          >
            <i className="ri-close-line text-base" aria-hidden="true" />
          </button>
        </div>
        <div className="px-4 py-3 overflow-y-auto text-[12px]">
          {successMessage ? (
            <p className="text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2 mb-3">
              {successMessage}
            </p>
          ) : null}
          {hasErrors ? (
            <>
              <p className="text-red-700 font-bold mb-2">
                {errors.length} issue{errors.length === 1 ? "" : "s"} — no purchase order was created.
              </p>
              <ul className="space-y-1 text-gray-700 list-disc pl-4">
                {errors.slice(0, 80).map((msg, i) => (
                  <li key={`${i}-${msg.slice(0, 24)}`}>{msg}</li>
                ))}
              </ul>
              {errors.length > 80 ? (
                <p className="mt-2 text-gray-500">Showing first 80. Download the error report for the full list.</p>
              ) : null}
            </>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-100">
          {hasErrors && onDownloadErrors ? (
            <button
              type="button"
              onClick={onDownloadErrors}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50"
            >
              <i className="ri-download-2-line text-xs" aria-hidden="true" />
              Download errors
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
