import * as XLSX from 'xlsx';
import {
  fetchAllYarnIssueActivityLogMatchingFilters,
  type FetchYarnIssueActivityLogAllParams,
  type YarnIssueActivityLogRow,
} from '@/app/yarn-management/yarn-issue/yarnIssueActivityLogService';

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
function yarnTypeLabel(row: YarnIssueActivityLogRow): string {
  return (
    row.yarn?.yarnType?.name ||
    row.yarnCatalogId?.yarnType?.name ||
    ''
  );
}

/**
 * Maps API rows to plain objects for `json_to_sheet`.
 */
function rowsToExportRecords(rows: YarnIssueActivityLogRow[]): Record<string, string | number>[] {
  return rows.map((row) => ({
    'Txn date': formatIsoDateOnly(row.transactionDate),
    Yarn: row.yarnName ?? '',
    'Yarn type': yarnTypeLabel(row),
    Order: row.orderno ?? '',
    Type: row.transactionType ?? '',
    Cones: row.transactionConeCount ?? '',
    'Net (kg)': row.transactionNetWeight ?? '',
    'Total (kg)': row.transactionTotalWeight ?? '',
    'Tear (kg)': row.transactionTearWeight ?? '',
    Created: row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '',
    Updated: row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : '',
    'Transaction ID': row._id,
  }));
}

/**
 * Downloads issue activity log as `.xlsx` for the current date range (full result set, not only the visible page).
 * @param params - Start/end dates matching the drawer filters.
 * @param fileStem - Filename without extension (sanitized).
 * @returns Number of rows written, or 0 if there was nothing to export.
 */
export async function downloadYarnIssueActivityLogExcel(
  params: FetchYarnIssueActivityLogAllParams,
  fileStem: string
): Promise<number> {
  const rows = await fetchAllYarnIssueActivityLogMatchingFilters(params);
  if (rows.length === 0) {
    return 0;
  }
  const sheetData = rowsToExportRecords(rows);
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Issue activity log');
  const safe = fileStem.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').slice(0, 120);
  XLSX.writeFile(workbook, `${safe || 'yarn_issue_activity_log'}.xlsx`);
  return rows.length;
}
