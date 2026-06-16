import * as XLSX from 'xlsx';
import {
  fetchVendorDispatchTransferNoteReportRows,
  type VendorDispatchTransferNoteReportRow,
} from './vendorTransferNoteService';

/**
 * Maps vendor report rows to plain objects for Excel export.
 * @param rows - Flat report rows from API
 */
function rowsToExportRecords(rows: VendorDispatchTransferNoteReportRow[]): Record<string, string | number>[] {
  return rows.map((row) => ({
    'STN Serial': row.stnSerial,
    Date: row.stnDate ? new Date(row.stnDate).toLocaleString() : '',
    Category: row.categoryLabel ?? '',
    VPO: row.vpoNumber ?? '',
    Vendor: row.vendorName ?? '',
    'Article No': row.articleNumber ?? '',
    Brand: row.brand ?? row.sapArticleNo ?? '',
    'Article Name': row.articleName ?? '',
    'Qty (Pairs)': row.qtyInPairs ?? '',
    'STN Total Qty': row.totalQty ?? '',
    'Total Boxes': row.totalBoxes ?? '',
    Containers: row.containerBarcodes ?? '',
    'Created By': row.createdByName ?? '',
  }));
}

export interface VendorTransferNoteExcelExportParams {
  startDate?: string;
  endDate?: string;
  search?: string;
}

/**
 * Downloads vendor transfer note report as `.xlsx` for the given filters.
 * @param params - Filter params matching the history tab
 * @param fileStem - Filename without extension
 * @returns Number of rows written, or 0 if empty
 */
export async function downloadVendorDispatchTransferNoteExcel(
  params: VendorTransferNoteExcelExportParams,
  fileStem: string
): Promise<number> {
  const rows = await fetchVendorDispatchTransferNoteReportRows(params);
  if (rows.length === 0) return 0;

  const sheetData = rowsToExportRecords(rows);
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Vendor transfer notes');

  const safe = fileStem.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').slice(0, 120);
  XLSX.writeFile(workbook, `${safe || 'vendor_dispatch_transfer_notes'}.xlsx`);
  return rows.length;
}
