import {
  downloadCsvFile,
  rowsToCsv,
} from '@/app/yarn-management/dashboard/utils/csvHelpers';
import {
  fetchAllYarnReturnHistoryMatchingFilters,
  ordernoFromReturnRow,
  type FetchYarnReturnHistoryAllParams,
  type YarnReturnHistoryRow,
} from '@/app/yarn-management/yarn-return/yarnReturnHistoryService';

/**
 * Formats an ISO timestamp as a locale date string (date portion only).
 */
function formatIsoDateOnly(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}

/**
 * Resolves yarn type label from populated catalog fields.
 */
function yarnTypeLabel(row: YarnReturnHistoryRow): string {
  return row.yarn?.yarnType?.name ?? '';
}

/**
 * Maps API rows to plain objects for CSV export.
 */
function rowsToExportRecords(rows: YarnReturnHistoryRow[]): Record<string, string | number>[] {
  return rows.map((row) => ({
    'Production Order': ordernoFromReturnRow(row) || row.orderId || '',
    'Transaction Date': formatIsoDateOnly(row.transactionDate),
    'Yarn Name': row.yarnName ?? '',
    'Yarn Type': yarnTypeLabel(row),
    'Net (kg)': row.transactionNetWeight ?? '',
    'Total (kg)': row.transactionTotalWeight ?? '',
    'Tear (kg)': row.transactionTearWeight ?? '',
    Cones: row.transactionConeCount ?? '',
    'Created At': row.createdAt ? new Date(row.createdAt).toLocaleString() : '',
    'Updated At': row.updatedAt ? new Date(row.updatedAt).toLocaleString() : '',
    'Transaction ID': row._id,
  }));
}

/**
 * Downloads return history as `.csv` for the current filters (full result set, not only the visible page).
 * @param params - Yarn search and start/end dates matching the history drawer filters.
 * @param fileStem - Filename without extension (sanitized).
 * @returns Number of rows written, or 0 if there was nothing to export.
 */
export async function downloadYarnReturnHistoryCsv(
  params: FetchYarnReturnHistoryAllParams,
  fileStem: string
): Promise<number> {
  const rows = await fetchAllYarnReturnHistoryMatchingFilters(params);
  if (rows.length === 0) {
    return 0;
  }
  const sheetData = rowsToExportRecords(rows);
  const csv = '\uFEFF' + rowsToCsv(sheetData);
  const safe = fileStem.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').slice(0, 120);
  downloadCsvFile(`${safe || 'yarn_return_history'}.csv`, csv);
  return rows.length;
}
