/** One pick-list row available for barcode printing. */
export interface BatchBarcodeStyleOption {
  styleCode: string;
  size?: string;
  shade?: string;
  pickedQty: number;
}

/** Page-size choices for the style-code picker list. */
export const STYLE_LIST_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export type StyleListPageSize = (typeof STYLE_LIST_PAGE_SIZE_OPTIONS)[number];

/**
 * Builds a lowercase search string from style metadata fields.
 * @param item - Style row with code, size, and shade
 */
export function buildStyleSearchHaystack(item: BatchBarcodeStyleOption): string {
  return [item.styleCode, item.size, item.shade].filter(Boolean).join(" ").toLowerCase();
}

/**
 * Filters style rows by a case-insensitive search term across code, size, and shade.
 * @param styles - Styles with picked qty > 0
 * @param searchTerm - Raw search input
 */
export function filterSelectableStyles(
  styles: BatchBarcodeStyleOption[],
  searchTerm: string,
): BatchBarcodeStyleOption[] {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return styles;
  return styles.filter((item) => buildStyleSearchHaystack(item).includes(term));
}

/**
 * Returns one page of style rows for client-side pagination.
 * @param rows - Full filtered list
 * @param page - 1-based page index
 * @param pageSize - Rows per page
 */
export function paginateStyleRows<T>(rows: T[], page: number, pageSize: number): T[] {
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

/**
 * Computes total pages for a style list (minimum 1).
 * @param totalRows - Number of filtered rows
 * @param pageSize - Rows per page
 */
export function getStyleListTotalPages(totalRows: number, pageSize: number): number {
  if (totalRows <= 0) return 1;
  return Math.max(1, Math.ceil(totalRows / pageSize));
}

/**
 * Finds the 1-based page that contains a style code in the filtered list.
 * @param styles - Filtered style rows
 * @param styleCode - Selected style code
 * @param pageSize - Rows per page
 */
export function findStyleListPage(
  styles: BatchBarcodeStyleOption[],
  styleCode: string,
  pageSize: number,
): number {
  const index = styles.findIndex((item) => item.styleCode === styleCode);
  if (index < 0) return 1;
  return Math.floor(index / pageSize) + 1;
}

/**
 * Formats style metadata for compact list subtitles.
 * @param item - Style row
 */
export function formatStyleMeta(item: BatchBarcodeStyleOption): string {
  const meta = [item.size, item.shade].filter(Boolean).join(" · ");
  return meta || "—";
}
