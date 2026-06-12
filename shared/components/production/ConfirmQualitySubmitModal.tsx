"use client";

import React from "react";

export interface QualityConfirmLine {
  articleId: string;
  articleNumber: string;
  m1: number;
  m2: number;
  m3: number;
  m4: number;
}

export interface ConfirmQualitySubmitModalProps {
  orderNumber: string;
  lines: QualityConfirmLine[];
  isOpen: boolean;
  isSubmitting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation modal before QC floor quality save.
 */
export default function ConfirmQualitySubmitModal({
  orderNumber,
  lines,
  isOpen,
  isSubmitting = false,
  onConfirm,
  onCancel,
}: ConfirmQualitySubmitModalProps) {
  if (!isOpen || lines.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-quality-title"
    >
      <div className="bg-white rounded-lg border-2 border-blue-300 shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
        <header className="px-4 py-3 border-b border-gray-200 bg-blue-50">
          <h2 id="confirm-quality-title" className="text-sm font-bold text-blue-900">
            Confirm quality update — Order {orderNumber}
          </h2>
          <p className="text-[10px] text-blue-800 mt-1">
            M2 entries will appear in M2 Management. Review quantities before submit.
          </p>
        </header>
        <div className="overflow-y-auto p-4 space-y-2 flex-1">
          {lines.map((line) => (
            <div
              key={line.articleId}
              className="text-[11px] border border-gray-200 rounded p-2 bg-gray-50"
            >
              <p className="font-bold text-gray-900 mb-1">{line.articleNumber}</p>
              <p>
                M1: <strong>{line.m1}</strong> · M2: <strong>{line.m2}</strong> · M3:{" "}
                <strong>{line.m3}</strong> · M4: <strong>{line.m4}</strong>
              </p>
              {line.m2 > 0 && (
                <p className="text-[10px] text-yellow-800 mt-1">
                  +{line.m2} M2 will create a new entry in M2 Management
                </p>
              )}
            </div>
          ))}
        </div>
        <footer className="px-4 py-3 border-t border-gray-200 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 py-2 text-sm font-bold border-2 border-gray-300 rounded"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 py-2 text-sm font-bold bg-blue-600 text-white rounded border-2 border-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? "Submitting…" : "Yes, submit"}
          </button>
        </footer>
      </div>
    </div>
  );
}
