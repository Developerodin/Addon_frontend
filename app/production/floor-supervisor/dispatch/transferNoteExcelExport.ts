import * as XLSX from 'xlsx';
import {
  fetchDispatchTransferNoteReportRows,
  type DispatchTransferNoteReportRow,
} from './transferNoteService';

/**
 * Maps report rows to plain objects for Excel export.
 * @param rows - Flat report rows from API
 */
function rowsToExportRecords(rows: DispatchTransferNoteReportRow[]): Record<string, string | number>[] {
  return rows.map((row) => ({
    'STN Serial': row.stnSerial,
    Date: row.stnDate ? new Date(row.stnDate).toLocaleString() : '',
    Category: row.categoryLabel ?? '',
    'Article No': row.articleNumber ?? '',
    Brand: row.brand ?? row.sapArticleNo ?? '',
    'Article Name': row.articleName ?? '',
    Brand: row.brand ?? '',
    'Qty (Pairs)': row.qtyInPairs ?? '',
    'STN Total Qty': row.totalQty ?? '',
    'Total Boxes': row.totalBoxes ?? '',
    Containers: row.containerBarcodes ?? '',
    'Created By': row.createdByName ?? '',
  }));
}

export interface TransferNoteExcelExportParams {
  startDate?: string;
  endDate?: string;
  search?: string;
}

/**
 * Downloads transfer note report as `.xlsx` for the given filters.
 * @param params - Filter params matching the history tab
 * @param fileStem - Filename without extension
 * @returns Number of rows written, or 0 if empty
 */
export async function downloadDispatchTransferNoteExcel(
  params: TransferNoteExcelExportParams,
  fileStem: string
): Promise<number> {
  const rows = await fetchDispatchTransferNoteReportRows(params);
  if (rows.length === 0) return 0;

  const sheetData = rowsToExportRecords(rows);
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transfer notes');

  const safe = fileStem.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').slice(0, 120);
  XLSX.writeFile(workbook, `${safe || 'dispatch_transfer_notes'}.xlsx`);
  return rows.length;
}
