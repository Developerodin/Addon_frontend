import * as XLSX from 'xlsx';
import {
  fetchAllFloorIssueHistoryMatchingFilters,
  type FetchFloorIssueHistoryAllParams,
  type FloorIssueHistoryRow,
} from '@/app/yarn-management/yarn-issue/linking-sampling/linkingSamplingHistoryService';

function floorLabelFromType(t: string): string {
  if (t === 'yarn_issued_linking') return 'Linking';
  if (t === 'yarn_issued_sampling') return 'Sampling';
  return t;
}

function formatConeBarcodes(cones: FloorIssueHistoryRow['conesIdsArray']): string {
  if (!cones?.length) return '';
  return cones
    .map((c) => {
      if (typeof c === 'string') return c;
      return c?.barcode || c?._id || '';
    })
    .filter(Boolean)
    .join(', ');
}

/**
 * Maps API rows to plain objects for `json_to_sheet` (stable column names).
 */
function rowsToExportRecords(rows: FloorIssueHistoryRow[]): Record<string, string | number>[] {
  return rows.map((row) => {
    const dateStr = row.transactionDate
      ? new Date(row.transactionDate).toLocaleString()
      : row.createdAt
        ? new Date(row.createdAt).toLocaleString()
        : '';
    return {
      Date: dateStr,
      Floor: floorLabelFromType(row.transactionType),
      Yarn: row.yarnName ?? '',
      'Cone barcodes': formatConeBarcodes(row.conesIdsArray),
      Batch: row.issueBatchId?.trim() ?? '',
      'Net (kg)': row.transactionNetWeight ?? '',
      'Total (kg)': row.transactionTotalWeight ?? '',
      'Tear (kg)': row.transactionTearWeight ?? '',
      Cones: row.transactionConeCount ?? '',
      'Issued by': row.issuedByEmail?.trim() ?? '',
      'Transaction ID': row._id,
    };
  });
}

/**
 * Downloads issue history as `.xlsx` using current filters (full result set, not only the visible page).
 * @param params - Same filters as the history table.
 * @param fileStem - Filename without extension (sanitized).
 * @returns Number of rows written, or 0 if there was nothing to export.
 */
export async function downloadLinkingSamplingHistoryExcel(
  params: FetchFloorIssueHistoryAllParams,
  fileStem: string
): Promise<number> {
  const rows = await fetchAllFloorIssueHistoryMatchingFilters(params);
  if (rows.length === 0) {
    return 0;
  }
  const sheetData = rowsToExportRecords(rows);
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Issue history');
  const safe = fileStem.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').slice(0, 120);
  XLSX.writeFile(workbook, `${safe || 'floor_issue_history'}.xlsx`);
  return rows.length;
}
