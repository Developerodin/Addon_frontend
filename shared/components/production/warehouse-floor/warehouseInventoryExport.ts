import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import type { WhmsWarehouseInventoryDTO } from "@/shared/services/whmsService";

/** Resolve catalog category label for export rows. */
function inventoryCategoryLabel(row: WhmsWarehouseInventoryDTO): string {
  const fromProduct = row.product?.category?.trim();
  if (fromProduct) return fromProduct;
  const fromItemData = row.itemData?.category;
  if (typeof fromItemData === "string" && fromItemData.trim()) return fromItemData.trim();
  return "";
}

/**
 * Map warehouse inventory rows to Excel-friendly objects.
 * @param rows - Inventory list rows
 * @returns Spreadsheet row objects
 */
export function buildWarehouseInventoryExportRows(
  rows: WhmsWarehouseInventoryDTO[],
): Record<string, string | number>[] {
  return rows.map((row) => ({
    styleCode: row.styleCode ?? row.styleCodeMaster?.styleCode ?? "",
    productName: row.product?.name ?? "",
    vendorCode: row.product?.vendorCode ?? row.product?.factoryCode ?? "",
    brand: row.styleCodeMaster?.brand ?? "",
    category: inventoryCategoryLabel(row),
    totalQuantity: row.quantities?.total ?? 0,
    blockedQuantity: row.quantities?.blocked ?? 0,
    availableQuantity: row.quantities?.available ?? 0,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : "",
  }));
}

/**
 * Download warehouse inventory rows as an Excel workbook.
 * @param rows - Rows to export
 * @param filenamePrefix - Optional filename prefix
 */
export function downloadWarehouseInventoryExport(
  rows: WhmsWarehouseInventoryDTO[],
  filenamePrefix = "warehouse-inventory-export",
): void {
  const ws = XLSX.utils.json_to_sheet(buildWarehouseInventoryExportRows(rows));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventory");
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/octet-stream" });
  const dateStamp = new Date().toISOString().slice(0, 10);
  saveAs(blob, `${filenamePrefix}-${dateStamp}.xlsx`);
}
