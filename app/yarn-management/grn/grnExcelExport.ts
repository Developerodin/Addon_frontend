import * as XLSX from 'xlsx';
import yarnGrnService, {
  type YarnGrn,
  type YarnGrnListParams,
} from '@/shared/services/yarnGrnService';

const EXPORT_PAGE_LIMIT = 100;
const EXPORT_MAX_ROWS = 50_000;

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
 * Sum net weight (kg) across GRN lots.
 */
const sumNetWeight = (lots: YarnGrn['lots'] = []): number =>
  lots.reduce((sum, lot) => sum + (Number(lot.netWeight) || 0), 0);

/**
 * Sum gross weight (kg) across GRN lots.
 */
const sumGrossWeight = (lots: YarnGrn['lots'] = []): number =>
  lots.reduce((sum, lot) => sum + (Number(lot.totalWeight) || 0), 0);

/**
 * Loads all GRNs matching list filters by paging until complete.
 */
async function fetchAllGrnsMatchingFilters(params: YarnGrnListParams): Promise<YarnGrn[]> {
  const all: YarnGrn[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const chunk = await yarnGrnService.listGrns({
      ...params,
      page,
      limit: EXPORT_PAGE_LIMIT,
      sortBy: 'createdAt:desc',
    });
    all.push(...(chunk.results || []));
    totalPages = chunk.totalPages || 1;
    page += 1;
    if (all.length >= EXPORT_MAX_ROWS) break;
  } while (page <= totalPages);

  return all;
}

/**
 * Maps GRN rows to flat Excel records (summary rows, not per-lot).
 */
function rowsToExportRecords(rows: YarnGrn[]): Record<string, string | number>[] {
  return rows.map((row) => {
    const lots = row.lots || [];
    const totalBoxes = lots.reduce((s, l) => s + (l.numberOfBoxes || 0), 0);
    const totalCones = lots.reduce((s, l) => s + (l.numberOfCones || 0), 0);
    const lotNumbers = lots.map((l) => l.lotNumber).filter(Boolean).join(', ');

    return {
      'GRN No': row.grnNumber ?? '',
      'GRN Date': formatDate(row.grnDate),
      'PO No': row.poNumber ?? '',
      Supplier: row.supplier?.name ?? '',
      'Supplier GST': row.supplier?.gstNo ?? '',
      Lots: lots.length,
      Boxes: totalBoxes,
      Cones: totalCones,
      'Net Wt (kg)': sumNetWeight(lots),
      'Gross Wt (kg)': sumGrossWeight(lots),
      'Basic Value': row.totals?.subTotal ?? '',
      GST: row.totals?.gst ?? '',
      'Grand Total': row.totals?.grandTotal ?? '',
      'Total Qty (kg)': row.totals?.totalQty ?? '',
      Status: row.status ?? '',
      Revision: row.revisionNo ?? 0,
      Legacy: row.isLegacy ? 'Yes' : 'No',
      'Vendor Invoice No': row.vendorInvoiceNo ?? '',
      'Vendor Invoice Date': formatDate(row.vendorInvoiceDate),
      'Lot Numbers': lotNumbers,
      Narration: row.notes ?? '',
      'Discrepancy Details': row.discrepancyDetails ?? '',
      'Created By': row.createdBy?.username ?? row.createdBy?.email ?? '',
      'GRN ID': row.id,
    };
  });
}

/**
 * Downloads GRN list as Excel for the current filters.
 *
 * @param params - active list filters (page/limit ignored; all pages fetched)
 * @param fileStem - base filename without extension
 * @returns number of rows exported
 */
export async function downloadGrnListExcel(
  params: YarnGrnListParams,
  fileStem: string
): Promise<number> {
  const rows = await fetchAllGrnsMatchingFilters(params);
  if (rows.length === 0) return 0;

  const sheetData = rowsToExportRecords(rows);
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'GRNs');

  const safe = fileStem.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').slice(0, 120);
  XLSX.writeFile(workbook, `${safe || 'yarn_grns'}.xlsx`);
  return rows.length;
}
