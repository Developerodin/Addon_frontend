import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { WarehouseClient, WarehouseClientType } from '@/shared/services/whmsWarehouseClientService';
import { STORE_EXPORT_COLUMNS, TRADE_EXPORT_COLUMNS } from './warehouseClientFieldConfig';

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

function formatCreationDate(raw?: string | null): string {
  if (!raw) return '';
  try {
    return new Date(raw).toISOString().slice(0, 10);
  } catch {
    return String(raw);
  }
}

/** Flatten a Store client to Akshay Excel columns. */
function storeClientToRow(c: WarehouseClient): Record<string, string | number> {
  const sp = c.storeProfile ?? {};
  const row: Record<string, string | number> = {};
  STORE_EXPORT_COLUMNS.forEach(({ header, key }) => {
    if (key === 'slNo') row[header] = c.slNo ?? '';
    else if (key === 'status') row[header] = c.status ?? '';
    else if (key === 'type') row[header] = c.type;
    else if (key === 'openingDate') row[header] = formatOpeningDate(sp.openingDate);
    else row[header] = (sp as Record<string, unknown>)[key]?.toString() ?? '';
  });
  return row;
}

/** Flatten Trade / Departmental / Ecom client to Akshay Excel columns. */
function tradeClientToRow(c: WarehouseClient): Record<string, string | number> {
  const row: Record<string, string | number> = {};
  TRADE_EXPORT_COLUMNS.forEach(({ header, key }) => {
    if (key === 'slNo') row[header] = c.slNo ?? '';
    else if (key === 'status') row[header] = c.status ?? '';
    else if (key === 'createdAt') row[header] = formatCreationDate(c.createdAt);
    else if (key === 'type') row[header] = c.type;
    else if (key === 'clientId') row[header] = c.id;
    else row[header] = (c as Record<string, unknown>)[key]?.toString() ?? '';
  });
  return row;
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
    XLSX.utils.json_to_sheet(
      storeRows.length ? storeRows : [Object.fromEntries(STORE_EXPORT_COLUMNS.map((c) => [c.header, '']))],
    ),
    'Store',
  );

  ALL_TYPES.filter((t) => t !== 'Store').forEach((type) => {
    const rows = (byType[type] ?? []).map(tradeClientToRow);
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        rows.length ? rows : [Object.fromEntries(TRADE_EXPORT_COLUMNS.map((c) => [c.header, '']))],
      ),
      type,
    );
  });

  const inst = XLSX.utils.aoa_to_sheet([
    ['Warehouse clients export'],
    [''],
    ['Headers match Akshay Excel templates. Client ID is for reference only — ignored on import.'],
    ['Re-import: Store sheet with Import Store; Trade/Dept/Ecom sheets with Import Trade.'],
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
