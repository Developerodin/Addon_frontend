/**
 * Hydrate vendor `products[]` (populated objects or raw ids) into VendorPOArticle rows.
 * Uses one batched POST /products/by-ids when populate returned ids only — no N+1.
 */

import { getProductsByIds } from "@/shared/services/productService";
import type { VendorPOArticle } from "../types";
import { productRecordToVendorPOArticle } from "../components/vendorPoArticleMapping";

const BY_IDS_CHUNK = 1000;

function isProductObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Split an id list into chunks of `size`.
 */
function chunkIds(ids: string[], size: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    out.push(ids.slice(i, i + size));
  }
  return out;
}

/**
 * Map vendor products to article picker rows. Objects with a name are mapped locally;
 * leftover ids are fetched in chunks via POST /products/by-ids.
 */
export async function hydrateVendorPoArticles(
  products: Array<string | Record<string, unknown>>
): Promise<VendorPOArticle[]> {
  if (!products.length) return [];

  const mapped: VendorPOArticle[] = [];
  const pendingIds: string[] = [];

  for (const product of products) {
    if (typeof product === "string") {
      const id = product.trim();
      if (id) pendingIds.push(id);
      continue;
    }
    if (!isProductObject(product)) continue;
    const article = productRecordToVendorPOArticle(product);
    if (article) {
      mapped.push(article);
      continue;
    }
    const id = String(product.id ?? product._id ?? "").trim();
    if (id) pendingIds.push(id);
  }

  if (pendingIds.length) {
    const unique = [...new Set(pendingIds)];
    const fetched: Record<string, unknown>[] = [];
    for (const group of chunkIds(unique, BY_IDS_CHUNK)) {
      const batch = await getProductsByIds(group);
      fetched.push(...batch);
    }
    for (const raw of fetched) {
      const article = productRecordToVendorPOArticle(raw);
      if (article) mapped.push(article);
    }
  }

  return mapped.filter((a) => a.id && a.name);
}
