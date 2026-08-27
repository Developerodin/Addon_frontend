/**
 * Resolve parsed vendor PO Excel rows against a vendor catalog (in-memory maps).
 */

import type { VendorPOArticle, VendorPOLineItem } from "../types";
import { newVendorPOLineItem } from "../components/vendorPoFormLineDefaults";
import type { ParsedVendorPoItemRow, ParsedVendorPoOrderHeader } from "./vendorPoOrderExcel";

export type VendorPoImportRowError = {
  rowNumber: number;
  message: string;
};

export type ResolvedVendorPoImport = {
  header: ParsedVendorPoOrderHeader;
  lineItems: VendorPOLineItem[];
  errors: VendorPoImportRowError[];
};

/**
 * Normalize a catalog/excel code for map lookup.
 */
export function normalizeVendorPoCode(value: string | undefined | null): string {
  return String(value ?? "").trim().toLowerCase();
}

export type VendorPoArticleMaps = {
  byVendorCode: Map<string, VendorPOArticle>;
  byFactoryCode: Map<string, VendorPOArticle>;
};

/**
 * Build O(1) lookup maps from vendor catalog articles.
 */
export function buildVendorPoArticleMaps(articles: VendorPOArticle[]): VendorPoArticleMaps {
  const byVendorCode = new Map<string, VendorPOArticle>();
  const byFactoryCode = new Map<string, VendorPOArticle>();
  for (const article of articles) {
    const vc = normalizeVendorPoCode(article.vendorCode || article.code);
    if (vc) byVendorCode.set(vc, article);
    const fc = normalizeVendorPoCode(article.factoryCode);
    if (fc) byFactoryCode.set(fc, article);
  }
  return { byVendorCode, byFactoryCode };
}

/**
 * Resolve one excel item row to a catalog article (vendor code first, factory code fallback).
 */
export function resolveVendorPoArticle(
  row: ParsedVendorPoItemRow,
  maps: VendorPoArticleMaps
): { article: VendorPOArticle | null; error?: string } {
  const vc = normalizeVendorPoCode(row.articleVendorCode);
  const fc = normalizeVendorPoCode(row.factoryCode);
  if (vc) {
    const byVc = maps.byVendorCode.get(vc);
    if (byVc) return { article: byVc };
    return {
      article: null,
      error: `Row ${row.rowNumber}: Article vendor code "${row.articleVendorCode}" is not in this vendor's catalog.`,
    };
  }
  if (fc) {
    const byFc = maps.byFactoryCode.get(fc);
    if (byFc) return { article: byFc };
    return {
      article: null,
      error: `Row ${row.rowNumber}: Factory code "${row.factoryCode}" is not in this vendor's catalog.`,
    };
  }
  return { article: null, error: `Row ${row.rowNumber}: Article Vendor Code or Factory Code is required.` };
}

/**
 * Map a resolved article + excel quantities onto a form line item.
 */
export function articleToImportedLineItem(
  article: VendorPOArticle,
  row: ParsedVendorPoItemRow
): VendorPOLineItem {
  return {
    ...newVendorPOLineItem(),
    articleId: article.id,
    articleCode: article.vendorCode?.trim() || article.code || "",
    articleName: article.name,
    type: article.type ?? "",
    color: article.color ?? "",
    pattern: article.pattern ?? "",
    orderedQty: row.quantity,
    rate: row.rate,
    gstRate: row.gstRate,
    estimatedDeliveryDate: row.estimatedDeliveryDate || "",
    imported: true,
  };
}

/**
 * Resolve all parsed item rows. Duplicate articles in the file are errors.
 * Does not create a PO — caller decides fill-form vs POST.
 */
export function resolveVendorPoOrderImport(
  header: ParsedVendorPoOrderHeader,
  items: ParsedVendorPoItemRow[],
  articles: VendorPOArticle[]
): ResolvedVendorPoImport {
  const maps = buildVendorPoArticleMaps(articles);
  const errors: VendorPoImportRowError[] = [];
  const lineItems: VendorPOLineItem[] = [];
  const seenArticleIds = new Set<string>();
  const seenKeys = new Set<string>();

  for (const row of items) {
    const key = normalizeVendorPoCode(row.articleVendorCode) || `fc:${normalizeVendorPoCode(row.factoryCode)}`;
    if (key && seenKeys.has(key)) {
      errors.push({
        rowNumber: row.rowNumber,
        message: `Row ${row.rowNumber}: Duplicate article in file (${row.articleVendorCode || row.factoryCode}).`,
      });
      continue;
    }
    if (key) seenKeys.add(key);

    const { article, error } = resolveVendorPoArticle(row, maps);
    if (error || !article) {
      errors.push({ rowNumber: row.rowNumber, message: error || `Row ${row.rowNumber}: Article not found.` });
      continue;
    }
    if (seenArticleIds.has(article.id)) {
      errors.push({
        rowNumber: row.rowNumber,
        message: `Row ${row.rowNumber}: Article "${article.name}" is already on another line.`,
      });
      continue;
    }
    seenArticleIds.add(article.id);
    lineItems.push(articleToImportedLineItem(article, row));
  }

  return { header, lineItems, errors };
}

/**
 * Flatten row errors plus parse errors for the result modal / error xlsx.
 */
export function flattenVendorPoImportErrors(
  parseErrors: string[],
  rowErrors: VendorPoImportRowError[]
): string[] {
  const fromRows = rowErrors.map((e) => e.message);
  return [...parseErrors, ...fromRows];
}
