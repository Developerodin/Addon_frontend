import * as XLSX from 'xlsx';
import poReturnChallanService, {
  type PoReturnChallan,
  type PoReturnChallanListParams,
} from '@/shared/services/poReturnChallanService';

const EXPORT_PAGE_LIMIT = 100;
const EXPORT_MAX_ROWS = 50_000;

/**
 * Loads all challans matching list filters by paging until complete.
 */
async function fetchAllChallansMatchingFilters(
  params: PoReturnChallanListParams
): Promise<PoReturnChallan[]> {
  const all: PoReturnChallan[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const chunk = await poReturnChallanService.listChallans({
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
 * Maps challan rows to Excel records (summary rows, not per-cone).
 */
function rowsToExportRecords(rows: PoReturnChallan[]): Record<string, string | number>[] {
  return rows.map((row) => ({
    'Challan No': row.challanNumber ?? '',
    Date: row.challanDate ? new Date(row.challanDate).toLocaleDateString() : '',
    'PO No': row.poNumber ?? '',
    Vendor: row.consignee?.name ?? row.supplier?.name ?? '',
    Cones: row.totals?.coneCount ?? row.lines?.length ?? '',
    'Net (kg)': row.totals?.totalNetWeight ?? '',
    'Gross (kg)': row.totals?.totalGrossWeight ?? '',
    Intent: row.cancellationIntent ?? '',
    Remark: row.remark ?? '',
    'Vehicle No': row.transport?.vehicleNo ?? '',
    'Driver Name': row.transport?.driverName ?? '',
    'Prepared by': row.createdBy?.username ?? row.createdBy?.email ?? '',
    'Challan ID': row.id,
  }));
}

/**
 * Downloads challan list as Excel for current filters.
 */
export async function downloadPoReturnChallanListExcel(
  params: PoReturnChallanListParams,
  fileStem: string
): Promise<number> {
  const rows = await fetchAllChallansMatchingFilters(params);
  if (rows.length === 0) return 0;
  const sheetData = rowsToExportRecords(rows);
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Return challans');
  const safe = fileStem.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').slice(0, 120);
  XLSX.writeFile(workbook, `${safe || 'po_return_challans'}.xlsx`);
  return rows.length;
}
