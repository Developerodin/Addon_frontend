"use client";

import React, { useEffect } from "react";
import { LinkingSamplingHistory } from "@/app/yarn-management/yarn-issue/linking-sampling/LinkingSamplingHistory";
import type { LinkingSamplingFloor } from "@/app/yarn-management/yarn-issue/linking-sampling/linkingSamplingIssueService";

export interface LinkingSamplingHistoryDrawerProps {
  /** When true, the panel mounts visibly. */
  open: boolean;
  /** Closes the drawer (backdrop, Escape, or header control). */
  onClose: () => void;
  floor: LinkingSamplingFloor;
  /** Bump after a successful issue so history refetches while drawer is closed or open. */
  refreshKey?: number;
}

/**
 * Right-side drawer hosting floor issue history (filters, table, Excel export).
 * @param props — open state, floor context, and refresh signal
 */
export function LinkingSamplingHistoryDrawer({
  open,
  onClose,
  floor,
  refreshKey = 0,
}: LinkingSamplingHistoryDrawerProps) {
  const floorLabel = floor === "linking" ? "Linking" : "Sampling";
  const titleId = `linking-sampling-history-drawer-title-${floor}`;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-end bg-black/40 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl h-full bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-50 text-purple-600 flex-shrink-0"
              aria-hidden
            >
              <i className="ri-history-line text-sm" />
            </div>
            <div className="min-w-0">
              <h2 id={titleId} className="text-sm font-bold text-gray-900 truncate">
                Issue history
              </h2>
              <p className="text-[10px] text-gray-500 truncate">{floorLabel} floor — filters, table, and export</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            aria-label="Close issue history"
          >
            <i className="ri-close-line text-lg" aria-hidden />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4">
          <LinkingSamplingHistory floor={floor} refreshKey={refreshKey} embedInDrawer />
        </div>
      </div>
    </div>
  );
}
