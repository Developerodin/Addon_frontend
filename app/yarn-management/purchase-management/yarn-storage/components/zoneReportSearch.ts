import { BoxInSlot, ConeInSlot } from "@/shared/services/storageSlotService";

/** Box with rack info for report rows */
export interface BoxWithRack extends BoxInSlot {
  rackCode?: string;
  rackBarcode?: string;
}

/** Cone with rack info for report rows */
export interface ConeWithRack extends ConeInSlot {
  rackCode?: string;
  rackBarcode?: string;
}

export const REPORT_PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;

/**
 * Returns true when a report row matches the search query (case-insensitive).
 */
export function matchesReportSearch(
  query: string,
  fields: Array<string | number | null | undefined>
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((value) =>
    String(value ?? "")
      .toLowerCase()
      .includes(q)
  );
}

/**
 * Filters box rows for the zone full report table.
 */
export function filterReportBoxes(
  boxes: BoxWithRack[],
  searchQuery: string
): BoxWithRack[] {
  return boxes.filter((b) =>
    matchesReportSearch(searchQuery, [
      b.boxId,
      b.barcode,
      b.poNumber,
      b.yarnName,
      b.lotNumber,
      b.shadeCode,
      b.rackCode,
      b.rackBarcode,
      b.storageLocation,
    ])
  );
}

/**
 * Filters cone rows for the zone full report table.
 */
export function filterReportCones(
  cones: ConeWithRack[],
  searchQuery: string
): ConeWithRack[] {
  return cones.filter((c) =>
    matchesReportSearch(searchQuery, [
      c.barcode,
      c.boxId,
      c.poNumber,
      c.yarnName,
      c.shadeCode,
      c.rackCode,
      c.rackBarcode,
      c.coneStorageId,
      c.issueStatus,
      c.returnStatus,
    ])
  );
}

/**
 * Slices a list for the current report page.
 */
export function paginateReportRows<T>(
  rows: T[],
  page: number,
  pageSize: number
): T[] {
  const start = (page - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

/**
 * Computes total pages for report pagination (minimum 1).
 */
export function getReportTotalPages(totalRows: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalRows / pageSize) || 1);
}
