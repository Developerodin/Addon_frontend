"use client";
import React from "react";

type Props = {
  locked: boolean;
  isSubmitting: boolean;
  submitButtonText: string;
  onCancel: () => void;
};

/** Bottom Cancel / Submit row (yarn PO pattern: border-t, right-aligned). */
export default function VendorPOFormActions({ locked, isSubmitting, submitButtonText, onCancel }: Props) {
  return (
    <div className="flex justify-end gap-2 pt-4 border-t">
      {!locked ? (
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
          >
            {isSubmitting ? (
              <>
                <i className="ri-loader-4-line animate-spin text-xs" />
                Submitting...
              </>
            ) : (
              <>
                <i className="ri-save-line text-xs" />
                {submitButtonText}
              </>
            )}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-500 me-auto">Approved PO – vendor and line items are locked.</p>
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
          >
            Back to list
          </button>
        </>
      )}
    </div>
  );
}
