"use client";

import React from "react";

export interface ArticleProductImageButtonProps {
  factoryCode: string;
  onClick: (factoryCode: string) => void;
  /** When true, matches compact action-row sizing (w-7 h-7). Default true. */
  compact?: boolean;
}

/**
 * Action button that opens the catalog product image for an article / factory code.
 */
export default function ArticleProductImageButton({
  factoryCode,
  onClick,
  compact = true,
}: ArticleProductImageButtonProps) {
  const fc = factoryCode?.trim();
  if (!fc || fc === "—") return null;

  if (compact) {
    return (
      <button
        type="button"
        className="w-7 h-7 flex items-center justify-center bg-purple-50 text-purple-600 border border-purple-100 rounded hover:bg-purple-100"
        onClick={() => onClick(fc)}
        title="View product image"
        aria-label={`View product image for article ${fc}`}
      >
        <i className="ri-image-line text-xs" aria-hidden />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onClick(fc)}
      className="inline-flex items-center justify-center w-4 h-4 rounded-full text-purple-600 hover:bg-purple-50 hover:text-purple-700 focus:outline-none focus:ring-1 focus:ring-purple-400"
      aria-label={`View product image for article ${fc}`}
      title="View product image"
    >
      <i className="ri-information-line text-[12px] leading-none" aria-hidden />
    </button>
  );
}
