"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import ArticleProductImageModal from "@/shared/components/production/ArticleProductImageModal";
import { getProductsByFactoryCodes } from "@/shared/services/productService";

interface ProductCatalogInfo {
  image?: string;
  name?: string;
}

interface ImageModalState {
  factoryCode: string;
  imageUrl?: string;
  productName?: string;
}

const CHUNK_SIZE = 500;

/**
 * Collects unique factory / article codes from production orders.
 */
export function collectArticleFactoryCodes(
  orders: Array<{ articles?: Array<{ articleNumber?: string }> }>,
): string[] {
  const codes = new Set<string>();
  for (const order of orders) {
    for (const article of order.articles ?? []) {
      const fc = (article.articleNumber ?? "").trim();
      if (fc && fc !== "—") codes.add(fc);
    }
  }
  return Array.from(codes);
}

/**
 * Loads catalog product images for factory codes and exposes a modal opener for article views.
 */
export function useArticleProductImages(factoryCodes: string[]) {
  const [productByFactoryCode, setProductByFactoryCode] = useState<Map<string, ProductCatalogInfo>>(new Map());
  const [imageModal, setImageModal] = useState<ImageModalState | null>(null);

  const normalizedCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const code of factoryCodes) {
      const fc = code?.trim();
      if (fc && fc !== "—") codes.add(fc);
    }
    return Array.from(codes);
  }, [factoryCodes]);

  const codesKey = useMemo(() => normalizedCodes.slice().sort().join("\0"), [normalizedCodes]);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      if (!normalizedCodes.length) {
        setProductByFactoryCode(new Map());
        return;
      }

      const productMap = new Map<string, ProductCatalogInfo>();
      try {
        for (let i = 0; i < normalizedCodes.length; i += CHUNK_SIZE) {
          const chunk = normalizedCodes.slice(i, i + CHUNK_SIZE);
          const products = await getProductsByFactoryCodes(chunk);
          for (const p of products) {
            const fc = (p.factoryCode ?? "").trim();
            if (!fc) continue;
            const info: ProductCatalogInfo = {
              image: typeof p.image === "string" ? p.image.trim() : undefined,
              name: typeof p.name === "string" ? p.name.trim() : undefined,
            };
            productMap.set(fc.toLowerCase(), info);
            productMap.set(fc, info);
          }
        }
      } catch {
        // catalog data optional
      }

      if (!cancelled) setProductByFactoryCode(productMap);
    }

    void loadProducts();
    return () => {
      cancelled = true;
    };
  }, [codesKey, normalizedCodes]);

  /** Opens the product image modal for a factory / article code. */
  const openProductImage = useCallback(
    (factoryCode: string) => {
      const fc = factoryCode?.trim();
      if (!fc || fc === "—") return;
      const info =
        productByFactoryCode.get(fc) ?? productByFactoryCode.get(fc.toLowerCase());
      setImageModal({
        factoryCode: fc,
        imageUrl: info?.image,
        productName: info?.name,
      });
    },
    [productByFactoryCode],
  );

  const productImageModal =
    imageModal != null ? (
      <ArticleProductImageModal
        factoryCode={imageModal.factoryCode}
        productName={imageModal.productName}
        imageUrl={imageModal.imageUrl}
        onClose={() => setImageModal(null)}
      />
    ) : null;

  return { openProductImage, productImageModal };
}
