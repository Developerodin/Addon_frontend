"use client";

import React from "react";

export interface ArticlePlanCellProps {
  factoryCode: string;
  onInfoClick: (factoryCode: string) => void;
}

/**
 * Renders an article / factory code with an info icon to open its catalog image.
 */
export default function ArticlePlanCell({ factoryCode, onInfoClick }: ArticlePlanCellProps) {
  if (!factoryCode || factoryCode === "-") {
    return <>{factoryCode || "-"}</>;
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span>{factoryCode}</span>
      <button
        type="button"
        onClick={() => onInfoClick(factoryCode)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-purple-600 hover:bg-purple-50 hover:text-purple-700 focus:outline-none focus:ring-1 focus:ring-purple-400"
        aria-label={`View product image for article ${factoryCode}`}
        title="View product image"
      >
        <i className="ri-information-line text-[12px] leading-none" aria-hidden />
      </button>
    </span>
  );
}
