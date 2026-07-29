"use client";

import React, { useCallback, useEffect } from "react";

export interface ArticleProductImageModalProps {
  /** Factory / article code shown in the planning table. */
  factoryCode: string;
  /** Product display name from catalog, if available. */
  productName?: string;
  /** S3 or catalog image URL; empty when none uploaded. */
  imageUrl?: string;
  onClose: () => void;
}

/**
 * Modal that shows the catalog product image for a planning-table article code.
 */
export default function ArticleProductImageModal({
  factoryCode,
  productName,
  imageUrl,
  onClose,
}: ArticleProductImageModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const title = productName?.trim() || factoryCode;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="article-product-image-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div>
            <h2 id="article-product-image-title" className="text-[13px] font-bold text-gray-800">
              {title}
            </h2>
            {productName?.trim() && (
              <p className="text-[10px] text-gray-500 mt-0.5">Article: {factoryCode}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
            aria-label="Close product image"
          >
            <i className="ri-close-line text-lg" aria-hidden />
          </button>
        </div>

        <div className="p-4">
          {imageUrl?.trim() ? (
            <figure className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
              <img
                src={imageUrl.trim()}
                alt={productName?.trim() ? `${productName} product image` : `${factoryCode} product image`}
                className="w-full max-h-[420px] object-contain bg-white"
              />
            </figure>
          ) : (
            <div
              className="flex flex-col items-center justify-center py-16 border border-dashed border-gray-300 rounded-lg bg-gray-50 text-center px-4"
              role="status"
              aria-label="No product image available"
            >
              <i className="ri-image-line text-3xl text-gray-300 mb-2" aria-hidden />
              <p className="text-[11px] font-semibold text-gray-500">No product image</p>
              <p className="text-[10px] text-gray-400 mt-1">
                Upload an image in Catalog → Items for article {factoryCode}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
