"use client";

import React from "react";

/** Compare article ids from QR vs table row. */
export function articleIdsMatch(a: unknown, b: unknown): boolean {
  const left = String(a ?? "").trim();
  const right = String(b ?? "").trim();
  return Boolean(left && right && left === right);
}

export interface ArticleQrScanPinBannerProps {
  pinned: boolean;
  onClear: () => void;
}

/**
 * Banner when article view is filtered to a single QR scan result.
 */
export function ArticleQrScanPinBanner({ pinned, onClear }: ArticleQrScanPinBannerProps) {
  if (!pinned || !onClear) return null;
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2">
      <p className="text-[11px] text-purple-900 font-medium">
        Showing article from label QR scan only.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="text-[11px] font-bold text-purple-700 hover:text-purple-900 underline"
        aria-label="Show all articles in list"
      >
        Show all articles
      </button>
    </div>
  );
}

export interface ArticleScanToolbarButtonsProps {
  onScanContainerClick?: () => void;
  onScanLabelQrClick?: () => void;
}

/**
 * Scan Container + Scan Label QR buttons for article view toolbars.
 */
export function ArticleScanToolbarButtons({
  onScanContainerClick,
  onScanLabelQrClick,
}: ArticleScanToolbarButtonsProps) {
  return (
    <>
      {onScanContainerClick ? (
        <button
          type="button"
          onClick={onScanContainerClick}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm"
        >
          <i className="ri-barcode-line text-xs" aria-hidden />
          Scan Container
        </button>
      ) : null}
      {onScanLabelQrClick ? (
        <button
          type="button"
          onClick={onScanLabelQrClick}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border border-purple-300 text-purple-700 bg-white hover:bg-purple-50 shadow-sm"
        >
          <i className="ri-qr-scan-2-line text-xs" aria-hidden />
          Scan Label QR
        </button>
      ) : null}
    </>
  );
}
