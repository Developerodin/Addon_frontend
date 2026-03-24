"use client";
import React from "react";
import { CRM } from "../../vendor-list/crmUiClasses";

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
          <button type="button" onClick={onCancel} disabled={isSubmitting} className={CRM.btnSecondary}>
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className={CRM.btnPrimary}>
            {isSubmitting ? "Saving..." : submitButtonText}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-500 me-auto">Approved PO – vendor and line items are locked.</p>
          <button type="button" onClick={onCancel} className={CRM.btnSecondary}>
            Back to list
          </button>
        </>
      )}
    </div>
  );
}
