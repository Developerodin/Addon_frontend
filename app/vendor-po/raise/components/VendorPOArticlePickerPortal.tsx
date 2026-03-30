"use client";
import React, { RefObject } from "react";
import { createPortal } from "react-dom";
import { VendorPOArticle } from "../types";

type Position = { top: number; left: number; width: number } | null;

type Props = {
  articleOpen: string | null;
  dropdownPosition: Position;
  articleDropdownRef: RefObject<HTMLDivElement | null>;
  filteredArticles: VendorPOArticle[];
  onSelect: (article: VendorPOArticle) => void;
};

/**
 * Fixed-position article dropdown so it is not clipped by table overflow.
 */
export default function VendorPOArticlePickerPortal({
  articleOpen,
  dropdownPosition,
  articleDropdownRef,
  filteredArticles,
  onSelect,
}: Props) {
  if (!articleOpen || !dropdownPosition || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={articleDropdownRef}
      className="mt-1 max-h-48 overflow-auto bg-white border border-gray-300 rounded shadow-lg z-[9999]"
      style={{
        position: "fixed",
        top: dropdownPosition.top + 4,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        minWidth: 200,
      }}
    >
      {filteredArticles.length === 0 ? (
        <div className="px-3 py-2 text-sm text-gray-500">No articles found</div>
      ) : (
        filteredArticles.map((a) => {
          const codeUi = a.vendorCode?.trim() ? a.vendorCode.trim() : "no vendor code";
          return (
            <button
              key={a.id}
              type="button"
              className="block w-full text-left px-3 py-2 hover:bg-gray-100"
              onClick={() => onSelect(a)}
            >
              <span
                className={`block text-sm font-medium ${a.vendorCode?.trim() ? "text-gray-800" : "text-amber-600 italic"}`}
              >
                {codeUi}
              </span>
              <span className="block text-xs text-gray-600 mt-0.5 leading-snug">{a.name}</span>
            </button>
          );
        })
      )}
    </div>,
    document.body
  );
}
