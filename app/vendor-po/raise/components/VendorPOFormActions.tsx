"use client";
import React from "react";

type Props = {
  showSaveDraft: boolean;
  showSubmitToVendor: boolean;
  isSubmitting: boolean;
  saveDraftLabel?: string;
  submitLabel?: string;
  onCancel: () => void;
  onSaveDraft?: () => void;
  workflowLocked?: boolean;
};

/** Bottom Cancel / Save draft / Submit row. */
export default function VendorPOFormActions({
  showSaveDraft,
  showSubmitToVendor,
  isSubmitting,
  saveDraftLabel = "Save Draft",
  submitLabel = "Submit to Supplier",
  onCancel,
  onSaveDraft,
  workflowLocked = false,
}: Props) {
  if (workflowLocked) {
    return (
      <div className="flex justify-end gap-2 pt-4 border-t">
        <p className="text-sm text-gray-500 me-auto">This PO can no longer be edited in this workflow stage.</p>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
        >
          Back to list
        </button>
      </div>
    );
  }

  return (
    <div className="flex justify-end gap-2 pt-4 border-t">
      <button
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
      >
        Cancel
      </button>
      {showSaveDraft && onSaveDraft ? (
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isSubmitting}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-purple-700 text-[11px] font-bold rounded border border-purple-200 hover:bg-purple-50 transition-colors shadow-sm disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <i className="ri-loader-4-line animate-spin text-xs" />
              Saving...
            </>
          ) : (
            <>
              <i className="ri-draft-line text-xs" />
              {saveDraftLabel}
            </>
          )}
        </button>
      ) : null}
      {showSubmitToVendor ? (
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <i className="ri-loader-4-line animate-spin text-xs" />
              Submitting...
            </>
          ) : (
            <>
              <i className="ri-send-plane-line text-xs" />
              {submitLabel}
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}
