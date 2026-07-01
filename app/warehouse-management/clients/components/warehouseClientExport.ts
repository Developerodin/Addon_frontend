import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { WarehouseClient, WarehouseClientType } from '@/shared/services/whmsWarehouseClientService';

const EXPORT_FILENAME = 'warehouse-clients-export.xlsx';

const ALL_TYPES: WarehouseClientType[] = ['Store', 'Trade', 'Departmental', 'Ecom'];

function formatOpeningDate(raw?: string | null): string {
  if (!raw) return '';
  try {
    return new Date(raw).toISOString().slice(0, 10);
  } catch {
    return String(raw);
  }
}

/** Flatten a Store client to import-compatible columns + id. */
function storeClientToRow(c: WarehouseClient): Record<string, string | number> {
  const sp = c.storeProfile ?? {};
  return {
    clientId: c.id,
    type: c.type,
    slNo: c.slNo ?? '',
    status: c.status ?? '',
    remarks: c.remarks ?? '',
    billCode: sp.billCode ?? '',
    sapCode: sp.sapCode ?? '',
    retekCode: sp.retekCode ?? '',
    classification: sp.classification ?? '',
    city: sp.city ?? '',
    state: sp.state ?? '',
    brand: sp.brand ?? '',
    brandSub: sp.brandSub ?? '',
    openingDate: formatOpeningDate(sp.openingDate),
    address: sp.address ?? '',
    gst: sp.gst ?? '',
    storeLandlineNo: sp.storeLandlineNo ?? '',
    smNameAndContact: sp.smNameAndContact ?? '',
    storeMailId: sp.storeMailId ?? '',
  };
}

/** Flatten Trade / Departmental / Ecom client to import-compatible columns + id. */
function tradeClientToRow(c: WarehouseClient): Record<string, string | number> {
  const sp = c.storeProfile ?? {};
  return {
    clientId: c.id,
    type: c.type,
    slNo: c.slNo ?? '',
    status: c.status ?? '',
    remarks: c.remarks ?? '',
    distributorName: c.distributorName ?? '',
    parentKeyCode: c.parentKeyCode ?? '',
    retailerName: c.retailerName ?? '',
    contactPerson: c.contactPerson ?? '',
    mobilePhone: c.mobilePhone ?? '',
    address: c.address ?? '',
    locality: c.locality ?? '',
    city: c.city ?? '',
    zipCode: c.zipCode ?? '',
    state: c.state ?? '',
    gstin: c.gstin ?? '',
    email: c.email ?? '',
    phone1: c.phone1 ?? '',
    rsm: c.rsm ?? '',
    asm: c.asm ?? '',
    se: c.se ?? '',
    dso: c.dso ?? '',
    outlet: c.outlet ?? '',
    sp_billCode: sp.billCode ?? '',
    sp_sapCode: sp.sapCode ?? '',
    sp_city: sp.city ?? '',
    sp_state: sp.state ?? '',
  };
}

/**
 * Build Excel workbook with one sheet per client type (Store, Trade, Departmental, Ecom).
 * @param byType - Clients grouped by type
 */
export function buildWarehouseClientsExportWorkbook(
  byType: Record<WarehouseClientType, WarehouseClient[]>,
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  const storeRows = (byType.Store ?? []).map(storeClientToRow);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(storeRows.length ? storeRows : [{ clientId: '', type: 'Store' }]),
    'Store',
  );

  ALL_TYPES.filter((t) => t !== 'Store').forEach((type) => {
    const rows = (byType[type] ?? []).map(tradeClientToRow);
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(rows.length ? rows : [{ clientId: '', type }]),
      type,
    );
  });

  const inst = XLSX.utils.aoa_to_sheet([
    ['Warehouse clients export'],
    [''],
    ['clientId is the MongoDB id — use it in order bulk-import when names collide.'],
    ['Re-import: use Store sheet format with Import Store; Trade/Dept/Ecom sheets with Import Trade.'],
  ]);
  XLSX.utils.book_append_sheet(wb, inst, 'Instructions');

  return wb;
}

/**
 * Download all warehouse clients to Excel (all types, separate sheets).
 * @param fetchPage - Paginated fetch for a single client type
 */
export async function exportAllWarehouseClients(
  fetchPage: (
    type: WarehouseClientType,
    params: { page: number; limit: number; sortBy: string },
  ) => Promise<{ results: WarehouseClient[]; totalPages: number }>,
): Promise<number> {
  const byType = {} as Record<WarehouseClientType, WarehouseClient[]>;
  let total = 0;

  for (const type of ALL_TYPES) {
    const rows: WarehouseClient[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const res = await fetchPage(type, { page, limit: 500, sortBy: 'createdAt:desc' });
      rows.push(...(res.results || []));
      totalPages = res.totalPages || 1;
      page += 1;
    } while (page <= totalPages);
    byType[type] = rows;
    total += rows.length;
  }

  const wb = buildWarehouseClientsExportWorkbook(byType);
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([wbout], { type: 'application/octet-stream' }), EXPORT_FILENAME);
  return total;
}
