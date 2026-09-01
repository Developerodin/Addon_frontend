import * as XLSX from 'xlsx';
import yarnGrnService, {
  type YarnGrnMonthlySummaryParams,
  type YarnGrnMonthlySummaryRow,
  type YarnGrnMonthlySummaryTotals,
} from '@/shared/services/yarnGrnService';

const EXPORT_PAGE_LIMIT = 200;
const EXPORT_MAX_ROWS = 50_000;

const EMPTY_TOTALS: YarnGrnMonthlySummaryTotals = {
  grnCount: 0,
  lineCount: 0,
  boxes: 0,
  qty: 0,
  amount: 0,
  gst: 0,
  grandTotal: 0,
};

/**
 * @param value - date-ish input
 * @returns DD-MM-YYYY or empty string
 */
const formatDate = (value?: string | Date | null): string => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Blank GRN-level cells on follow-on yarn lines so Excel sums stay unique-GRN.
 * @param value - number or null
 */
const headerCell = (value: number | null): number | string =>
  value === null || value === undefined ? '' : value;

/**
 * Maps flattened summary rows to Excel records.
 * @param rows - monthly summary lines
 */
function rowsToExportRecords(rows: YarnGrnMonthlySummaryRow[]): Record<string, string | number>[] {
  return rows.map((row) => ({
    'GRN No': row.grnNumber ?? '',
    'GRN Date': formatDate(row.grnDate),
    'PO Number': row.poNumber ?? '',
    Supplier: row.supplier ?? '',
    'No of Box': headerCell(row.numberOfBoxes),
    'Yarn Name': row.yarnName ?? '',
    'Shade Code': row.shadeCode ?? '',
    Qty: row.qty ?? 0,
    Rate: row.rate ?? 0,
    Amount: row.amount ?? 0,
    GST: headerCell(row.gst),
    'Grand Total': headerCell(row.grandTotal),
  }));
}

/**
 * Appends a totals row using unique-GRN footer figures from the API.
 * @param totals - month-true totals
 */
function totalsRecord(totals: YarnGrnMonthlySummaryTotals): Record<string, string | number> {
  return {
    'GRN No': `${totals.grnCount} GRN(s)`,
    'GRN Date': '',
    'PO Number': '',
    Supplier: `${totals.lineCount} line(s)`,
    'No of Box': totals.boxes,
    'Yarn Name': '',
    'Shade Code': '',
    Qty: totals.qty,
    Rate: '',
    Amount: totals.amount,
    GST: totals.gst,
    'Grand Total': totals.grandTotal,
  };
}

/**
 * Loads every monthly-summary page until complete.
 * @param params - year/month/supplier (page ignored)
 */
async function fetchAllSummaryRows(
  params: YarnGrnMonthlySummaryParams
): Promise<{ rows: YarnGrnMonthlySummaryRow[]; totals: YarnGrnMonthlySummaryTotals }> {
  const all: YarnGrnMonthlySummaryRow[] = [];
  let page = 1;
  let totalPages = 1;
  let totals = EMPTY_TOTALS;

  do {
    const chunk = await yarnGrnService.getMonthlySummary({
      ...params,
      page,
      limit: EXPORT_PAGE_LIMIT,
    });
    all.push(...(chunk.results || []));
    totals = chunk.totals || totals;
    totalPages = chunk.totalPages || 1;
    page += 1;
    if (all.length >= EXPORT_MAX_ROWS) break;
  } while (page <= totalPages);

  return { rows: all, totals };
}

/**
 * Downloads the monthly yarn-line register as Excel.
 *
 * @param params - year, month, optional supplierName
 * @param fileStem - base filename without extension
 * @returns number of yarn-line rows exported
 */
export async function downloadGrnMonthlySummaryExcel(
  params: YarnGrnMonthlySummaryParams,
  fileStem: string
): Promise<number> {
  const { rows, totals } = await fetchAllSummaryRows(params);
  if (rows.length === 0) return 0;

  const sheetData = [...rowsToExportRecords(rows), totalsRecord(totals)];
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Summary');

  const safe = fileStem.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').slice(0, 120);
  XLSX.writeFile(workbook, `${safe || 'yarn_grn_summary'}.xlsx`);
  return rows.length;
}
