import type { TransferItem } from "@/shared/services/productionService";
import { isValidHalfStepValue } from "@/shared/utils/halfStepQuantity";

export type BrandTransferLine = { transferred?: number; styleCode?: string; brand?: string };

export interface BrandOption {
  brand: string;
}

export interface BrandOptionsResult {
  options: BrandOption[];
  brandMaxQuantities: Record<string, number>;
}

/**
 * Normalizes brand for dedup / map keys (trim + lowercase).
 */
export function normalizeBrand(brand: string | undefined | null): string {
  return String(brand ?? "").trim().toLowerCase();
}

/**
 * Display key preserving original casing from first occurrence.
 */
export function brandDisplayKey(brand: string | undefined | null): string {
  return String(brand ?? "").trim();
}

/**
 * Sum transferred qty grouped by brand (ignores styleCode).
 */
export function aggregateQtyByBrand(rows: BrandTransferLine[] | undefined): Map<string, number> {
  const map = new Map<string, number>();
  const displayByKey = new Map<string, string>();

  for (const row of rows ?? []) {
    const qty = Number(row?.transferred ?? 0);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const display = brandDisplayKey(row?.brand);
    if (!display) continue;
    const key = normalizeBrand(display);
    displayByKey.set(key, displayByKey.get(key) ?? display);
    map.set(key, (map.get(key) ?? 0) + qty);
  }

  return map;
}

/**
 * Collapse rows into unique brand lines for display (aggregates legacy styleCode rows).
 */
export function collapseLinesByBrand(rows: BrandTransferLine[] | undefined): BrandTransferLine[] {
  const totals = aggregateQtyByBrand(rows);
  const displayByKey = new Map<string, string>();
  for (const row of rows ?? []) {
    const display = brandDisplayKey(row?.brand);
    if (!display) continue;
    const key = normalizeBrand(display);
    if (!displayByKey.has(key)) displayByKey.set(key, display);
  }
  return Array.from(totals.entries()).map(([key, transferred]) => ({
    transferred,
    brand: displayByKey.get(key) ?? key,
    styleCode: "",
  }));
}

/**
 * Build brand dropdown options and per-brand max from received vs transferred rows.
 */
export function buildBrandOptionsFromRows(
  receivedData: BrandTransferLine[] | undefined,
  transferredData: BrandTransferLine[] | undefined
): BrandOptionsResult {
  const receivedByBrand = aggregateQtyByBrand(receivedData);
  const transferredByBrand = aggregateQtyByBrand(transferredData);

  const displayByKey = new Map<string, string>();
  for (const row of receivedData ?? []) {
    const display = brandDisplayKey(row?.brand);
    if (!display || (row.transferred ?? 0) <= 0) continue;
    const key = normalizeBrand(display);
    if (!displayByKey.has(key)) displayByKey.set(key, display);
  }

  const brandMaxQuantities: Record<string, number> = {};
  const options: BrandOption[] = [];

  for (const [key, received] of receivedByBrand.entries()) {
    const display = displayByKey.get(key) ?? key;
    const transferred = transferredByBrand.get(key) ?? 0;
    const max = Math.max(0, received - transferred);
    if (max > 0 || received > 0) {
      brandMaxQuantities[display] = max;
      if (!options.some((o) => normalizeBrand(o.brand) === key)) {
        options.push({ brand: display });
      }
    }
  }

  return { options, brandMaxQuantities };
}

/**
 * Extract brand string from a product styleCodes entry (plain or populated StyleCode doc).
 */
export function extractBrandFromStyleCodeEntry(sc: unknown): string {
  if (sc == null || typeof sc !== "object") return "";
  const o = sc as Record<string, unknown>;
  return brandDisplayKey(typeof o.brand === "string" ? o.brand : undefined);
}

/**
 * Unique brand names from product catalog styleCodes.
 */
export function brandsFromProductStyleCodes(styleCodes: unknown[] | undefined): string[] {
  return buildBrandOptionsFromProduct(styleCodes as Array<{ styleCode?: string; brand?: string }>).map(
    (o) => o.brand
  );
}

/**
 * Unique brands from product catalog styleCodes.
 */
export function buildBrandOptionsFromProduct(
  styleCodes: Array<{ styleCode?: string; brand?: string }> | unknown[] | undefined
): BrandOption[] {
  const seen = new Set<string>();
  const options: BrandOption[] = [];
  for (const sc of styleCodes ?? []) {
    const brand = extractBrandFromStyleCodeEntry(sc) || brandDisplayKey((sc as { brand?: string })?.brand);
    if (!brand) continue;
    const key = normalizeBrand(brand);
    if (seen.has(key)) continue;
    seen.add(key);
    options.push({ brand });
  }
  return options;
}

/**
 * Format product brand list for display (no qty).
 */
export function formatProductBrandsList(brands: string[] | undefined): string {
  if (!brands?.length) return "—";
  return brands.join("; ");
}

/**
 * Dispatch brand display: prefer received/transferred lines; fall back to catalog product brands.
 */
export function getDispatchBrandDisplay(
  receivedData: BrandTransferLine[] | undefined,
  productBrands: string[] | undefined
): { text: string; fromProduct: boolean } {
  const collapsed = collapseLinesByBrand(receivedData);
  if (collapsed.length > 0) {
    return { text: collapsed.map(formatBrandLine).join("; "), fromProduct: false };
  }
  const brands = productBrands ?? [];
  if (brands.length > 0) {
    return { text: formatProductBrandsList(brands), fromProduct: true };
  }
  return { text: "—", fromProduct: false };
}

/**
 * Format a transfer line for display: "459 · Allen Solly".
 */
export function formatBrandLine(line: BrandTransferLine): string {
  const qty = line?.transferred ?? 0;
  const brand = brandDisplayKey(line?.brand);
  if (!brand) return String(qty);
  return `${qty} · ${brand}`;
}

/**
 * Format multiple lines collapsed by brand.
 */
export function formatBrandLines(rows: BrandTransferLine[] | undefined): string {
  const collapsed = collapseLinesByBrand(rows);
  if (collapsed.length === 0) return "—";
  return collapsed.map(formatBrandLine).join("; ");
}

/**
 * Validates total and per-brand caps for transfer items.
 */
export function validateBrandTransferItems(
  items: TransferItem[],
  maxTotal: number,
  brandMaxQuantities?: Record<string, number>
): {
  valid: boolean;
  totalValid: boolean;
  brandValid: boolean;
  halfStepValid: boolean;
  total: number;
} {
  const total = items.reduce((s, i) => s + (i.transferred ?? 0), 0);
  const totalValid = total <= maxTotal;

  const halfStepValid = items.every((item) => {
    const qty = item.transferred ?? 0;
    if (qty <= 0) return true;
    return isValidHalfStepValue(qty);
  });

  const byBrand: Record<string, number> = {};
  for (const item of items) {
    const brand = brandDisplayKey(item.brand);
    if (!brand) continue;
    byBrand[brand] = (byBrand[brand] ?? 0) + (item.transferred ?? 0);
  }

  const brandValid =
    !brandMaxQuantities ||
    Object.entries(byBrand).every(([brand, sum]) => sum <= (brandMaxQuantities[brand] ?? Infinity));

  return {
    valid: totalValid && brandValid && halfStepValid,
    totalValid,
    brandValid,
    halfStepValid,
    total,
  };
}

/**
 * Maps transfer items to brand-only API payload (styleCode empty).
 */
export function toBrandOnlyTransferItems(items: TransferItem[]): TransferItem[] {
  return items
    .filter((i) => (i.transferred ?? 0) > 0 && brandDisplayKey(i.brand))
    .map((i) => ({
      transferred: i.transferred ?? 0,
      brand: brandDisplayKey(i.brand),
      styleCode: "",
    }));
}

const FINAL_CHECKING_LABEL = "Final Checking";

export type M2MergeBrandBudgetMode = "none" | "floor" | "product";

export interface M2MergeBrandContext {
  required: boolean;
  budgetMode: M2MergeBrandBudgetMode;
  multiBrand: boolean;
  autoAssignBrand: string | null;
  productBrands: string[];
  receivedData: BrandTransferLine[];
  transferredData: BrandTransferLine[];
}

/**
 * Unique display brand names from product styleCodes entries.
 */
export function extractBrandsFromProductStyleCodes(
  styleCodes: Array<{ brand?: string }> | undefined | null
): string[] {
  const seen = new Set<string>();
  const brands: string[] = [];
  for (const sc of styleCodes ?? []) {
    const brand = brandDisplayKey(sc?.brand);
    if (!brand) continue;
    const key = normalizeBrand(brand);
    if (seen.has(key)) continue;
    seen.add(key);
    brands.push(brand);
  }
  return brands;
}

/**
 * Whether Final Checking receivedData has brand breakdown rows.
 */
export function finalCheckingHasBrandReceivedData(
  article: { floorQuantities?: { finalChecking?: { receivedData?: BrandTransferLine[] } } } | null | undefined
): boolean {
  const receivedData = article?.floorQuantities?.finalChecking?.receivedData;
  if (!Array.isArray(receivedData)) return false;
  return receivedData.some((r) => (Number(r?.transferred ?? 0) > 0) && brandDisplayKey(r?.brand));
}

/**
 * Whether process list includes Branding or Re-Boarding.
 */
export function articleHasBrandingInProcessNames(processNames: string[]): boolean {
  return processNames.some((name) => {
    const n = String(name ?? "").trim().toLowerCase();
    return n.includes("brand") || n.includes("re-board") || n.includes("reboard");
  });
}

/**
 * Resolve M2→M1 merge brand requirements (floor budget vs product catalog fallback).
 */
export function resolveM2MergeBrandContext(
  article: { floorQuantities?: { finalChecking?: { receivedData?: BrandTransferLine[]; transferredData?: BrandTransferLine[] } } } | null | undefined,
  cascadeFloors: string[],
  processNames: string[],
  productStyleCodes: Array<{ brand?: string }> | undefined | null
): M2MergeBrandContext {
  const empty: M2MergeBrandContext = {
    required: false,
    budgetMode: "none",
    multiBrand: false,
    autoAssignBrand: null,
    productBrands: [],
    receivedData: [],
    transferredData: [],
  };

  if (!cascadeFloors.includes(FINAL_CHECKING_LABEL)) return empty;
  if (!articleHasBrandingInProcessNames(processNames)) return empty;

  const productBrands = extractBrandsFromProductStyleCodes(productStyleCodes);
  if (productBrands.length === 0) return empty;

  const fc = article?.floorQuantities?.finalChecking;
  const receivedData = (fc?.receivedData as BrandTransferLine[]) ?? [];
  const transferredData = (fc?.transferredData as BrandTransferLine[]) ?? [];
  const hasFloorBrandData = finalCheckingHasBrandReceivedData(article);

  return {
    required: true,
    budgetMode: hasFloorBrandData ? "floor" : "product",
    multiBrand: productBrands.length > 1,
    autoAssignBrand: productBrands.length === 1 ? productBrands[0] : null,
    productBrands,
    receivedData,
    transferredData,
  };
}

/**
 * Build brand options and per-brand caps for M2 merge drawer.
 */
export function buildM2MergeBrandOptions(
  brandContext: M2MergeBrandContext,
  mergeQuantity: number
): BrandOptionsResult {
  if (brandContext.budgetMode === "floor") {
    return buildBrandOptionsFromRows(brandContext.receivedData, brandContext.transferredData);
  }

  if (brandContext.budgetMode === "product") {
    const brandMaxQuantities: Record<string, number> = {};
    const options: BrandOption[] = brandContext.productBrands.map((brand) => {
      brandMaxQuantities[brand] = mergeQuantity;
      return { brand };
    });
    return { options, brandMaxQuantities };
  }

  return { options: [], brandMaxQuantities: {} };
}

/**
 * Whether M2→M1 merge requires brand allocation for this article and cascade path.
 */
export function articleRequiresM2MergeBrand(
  article: { floorQuantities?: { finalChecking?: { receivedData?: BrandTransferLine[] } } } | null | undefined,
  cascadeFloors: string[],
  processNames: string[],
  productStyleCodes?: Array<{ brand?: string }> | null
): boolean {
  return resolveM2MergeBrandContext(article, cascadeFloors, processNames, productStyleCodes).required;
}

/**
 * Whether operator must manually split merge qty across multiple brands.
 */
export function m2MergeRequiresManualBrandSplit(brandContext: M2MergeBrandContext): boolean {
  return brandContext.required && brandContext.multiBrand;
}
