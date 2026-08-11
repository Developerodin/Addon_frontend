import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type {
  BulkImportMultiPairItem,
  BulkImportOrderRow,
  BulkImportSinglePairItem,
} from '@/shared/services/whmsWarehouseOrderService';
import type { WarehouseClient, WarehouseClientType } from '@/shared/services/whmsWarehouseClientService';

const TEMPLATE_FILENAME = 'warehouse-orders-bulk-template.xlsx';

const CLIENT_TYPES = new Set<string>(['Store', 'Trade', 'Departmental', 'Ecom']);

/** Normalize Excel header for matching (ignore spaces, case, underscores). */
export function warehouseOrderImportHeaderKey(cell: unknown): string {
  return String(cell ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '');
}

function str(v: unknown): string {
  return String(v ?? '').trim();
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Parse bulk-import date cells (Excel serial, DD/MM/YYYY, ISO).
 * @param v - Raw cell value
 */
function parseImportDate(v: unknown): string {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const dd = String(v.getUTCDate()).padStart(2, '0');
    const mm = String(v.getUTCMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${v.getUTCFullYear()}`;
  }
  const raw = String(v ?? '').trim();
  if (!raw) return '';
  const serial = Number(raw);
  if (Number.isFinite(serial) && serial > 1000 && serial < 100000) {
    const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getUTCFullYear()}`;
  }
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(raw)) return raw.replace(/-/g, '/');
  return raw;
}

/**
 * Normalize client type from Excel (e.g. "store" → "Store").
 * @param raw - Raw type string
 */
function normalizeClientType(raw: string): string {
  const v = raw.trim();
  if (!v) return '';
  if (CLIENT_TYPES.has(v)) return v;
  const lower = v.toLowerCase();
  if (lower === 'store') return 'Store';
  if (lower === 'trade') return 'Trade';
  if (lower === 'departmental') return 'Departmental';
  if (lower === 'ecom') return 'Ecom';
  return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
}

function rowToKeyMap(row: Record<string, unknown>): Map<string, unknown> {
  const m = new Map<string, unknown>();
  Object.entries(row).forEach(([k, v]) => {
    m.set(warehouseOrderImportHeaderKey(k), v);
  });
  return m;
}

/** Human-readable client label for reference sheet / template. */
export function warehouseClientReferenceLabel(c: WarehouseClient): string {
  if (c.type === 'Store') {
    const sp = c.storeProfile;
    return (
      sp?.billCode?.trim() ||
      sp?.sapCode?.trim() ||
      sp?.retekCode?.trim() ||
      sp?.brand?.trim() ||
      'Store'
    );
  }
  return c.retailerName?.trim() || c.parentKeyCode?.trim() || 'Client';
}

/**
 * Download bulk-import template with optional client reference sheet (id + type + display name).
 * @param clients - Optional client list for ClientReference sheet
 */
export function downloadWarehouseOrdersBulkTemplate(clients: WarehouseClient[] = []): void {
  const orderRows = [
    {
      clientId: clients[0]?.id ?? 'PASTE_MONGO_CLIENT_ID',
      clientType: 'Store',
      clientName: clients[0] ? warehouseClientReferenceLabel(clients[0]) : 'My Store Brand',
      date: '17/02/2026',
      status: 'pending',
      addonOrderId: 'ADDON-1001',
      pairType: 'single',
      styleCode: 'SC-001',
      quantity: 10,
    },
    {
      clientId: '',
      clientType: '',
      clientName: '',
      date: '',
      status: '',
      addonOrderId: '',
      pairType: 'single',
      styleCode: 'SC-002',
      quantity: 5,
    },
    {
      clientId: '',
      clientType: '',
      clientName: '',
      date: '',
      status: '',
      addonOrderId: '',
      pairType: 'multi',
      styleCode: 'MP-001',
      quantity: 20,
    },
  ];

  const instructions = [
    { Field: 'clientId', Description: 'MongoDB client id (preferred). Use when multiple clients share the same name.' },
    { Field: 'clientType', Description: 'Store, Trade, Departmental, or Ecom — required on order header rows' },
    { Field: 'clientName', Description: 'Optional fallback when clientId is empty; must be unique per type' },
    { Field: 'date', Description: 'DD/MM/YYYY or DD-MM-YYYY' },
    { Field: 'status', Description: 'pending, in-progress, packed, dispatched, cancelled' },
    { Field: 'addonOrderId', Description: 'Optional external reference; header rows only' },
    { Field: 'pairType', Description: "'single' or 'multi'" },
    { Field: 'styleCode', Description: 'Style code string (backend resolves ID)' },
    { Field: 'quantity', Description: 'Numeric quantity (min 1)' },
    {
      Field: 'type / colour / pattern / eanCode',
      Description:
        'Optional — auto-filled from catalogue (style-code brand, EAN, and linked article attributes). Include only to override.',
    },
    { Field: 'GROUPING', Description: 'Rows with clientType filled start a new order. Following rows without clientType are line items.' },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orderRows), 'Orders');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(instructions), 'Instructions');

  if (clients.length) {
    const refRows = clients.map((c) => ({
      clientId: c.id,
      clientType: c.type,
      clientName: warehouseClientReferenceLabel(c),
      city: c.type === 'Store' ? c.storeProfile?.city ?? '' : c.city ?? '',
      state: c.type === 'Store' ? c.storeProfile?.state ?? '' : c.state ?? '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(refRows), 'ClientReference');
  }

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([wbout], { type: 'application/octet-stream' }), TEMPLATE_FILENAME);
}

/**
 * Parse uploaded Excel into bulk-import order payloads.
 * @param buf - File array buffer
 */
export function parseWarehouseOrdersBulkImportFile(buf: ArrayBuffer): {
  orders: BulkImportOrderRow[];
  errors: string[];
} {
  const errors: string[] = [];
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const sheetName =
    wb.SheetNames.find((n) => warehouseOrderImportHeaderKey(n) === 'orders') ?? wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) {
    return { orders: [], errors: ['No sheet found'] };
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
  if (!rawRows.length) {
    return { orders: [], errors: ['No rows found in Orders sheet'] };
  }

  const orders: BulkImportOrderRow[] = [];
  let current: BulkImportOrderRow | null = null;

  rawRows.forEach((row, idx) => {
    const line = idx + 2;
    const m = rowToKeyMap(row);

    const clientId = str(m.get('clientid'));
    const ctRaw = str(m.get('clienttype'));
    const cn = str(m.get('clientname'));
    const dt = parseImportDate(m.get('date'));
    const st = str(m.get('status'));
    const sc = str(m.get('stylecode'));
    const colour = str(m.get('colour') ?? m.get('color'));
    const pattern = str(m.get('pattern'));
    const qty = num(m.get('quantity') ?? m.get('qty'));
    const type = str(m.get('type'));
    const pt = str(m.get('pairtype')).toLowerCase();
    const addonOrderId = str(m.get('addonorderid'));

    const isHeaderRow = Boolean(ctRaw || clientId);
    if (isHeaderRow) {
      const ct = normalizeClientType(ctRaw);
      if (!ct || !CLIENT_TYPES.has(ct)) {
        errors.push(`Row ${line}: invalid clientType "${ctRaw}"`);
        current = null;
        return;
      }
      if (!clientId && !cn) {
        errors.push(`Row ${line}: clientId or clientName is required on order header rows`);
        current = null;
        return;
      }

      current = {
        clientType: ct,
        clientName: cn,
        date: dt,
        status: st || 'pending',
        ...(clientId ? { clientId } : {}),
        ...(addonOrderId ? { addonOrderId } : {}),
      };
      orders.push(current);
    }

    if (!current || !sc) return;

    if (qty < 1) {
      errors.push(`Row ${line}: quantity must be at least 1 for styleCode "${sc}"`);
      return;
    }

    if (pt === 'multi' || pt === 'multipair' || pt === 'multi-pair') {
      const item: BulkImportMultiPairItem = {
        styleCode: sc,
        quantity: qty,
        ...(type ? { type } : {}),
        ...(colour ? { colour } : {}),
        ...(pattern ? { pattern } : {}),
      };
      current.styleCodeMultiPair = [...(current.styleCodeMultiPair || []), item];
    } else {
      const item: BulkImportSinglePairItem = {
        styleCode: sc,
        quantity: qty,
        ...(colour ? { colour } : {}),
        ...(pattern ? { pattern } : {}),
      };
      current.styleCodeSinglePair = [...(current.styleCodeSinglePair || []), item];
    }
  });

  orders.forEach((o, i) => {
    const single = o.styleCodeSinglePair?.length ?? 0;
    const multi = o.styleCodeMultiPair?.length ?? 0;
    if (single + multi === 0) {
      errors.push(`Order ${i + 1}: no line items — add styleCode rows after the header`);
    }
  });

  return { orders, errors };
}

/** Fetch all clients for template reference (paginated). */
export async function fetchAllWarehouseClientsForReference(
  listByType: (
    type: WarehouseClientType,
    params: { page: number; limit: number; sortBy: string },
  ) => Promise<{ results: WarehouseClient[]; totalPages: number }>,
): Promise<WarehouseClient[]> {
  const types: WarehouseClientType[] = ['Store', 'Trade', 'Departmental', 'Ecom'];
  const all: WarehouseClient[] = [];

  for (const type of types) {
    let page = 1;
    let totalPages = 1;
    do {
      const res = await listByType(type, { page, limit: 500, sortBy: 'createdAt:desc' });
      all.push(...(res.results || []));
      totalPages = res.totalPages || 1;
      page += 1;
    } while (page <= totalPages);
  }

  return all;
}
