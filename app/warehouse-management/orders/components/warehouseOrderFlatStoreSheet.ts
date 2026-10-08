import * as XLSX from 'xlsx';
import type { BulkImportOrderRow } from '@/shared/services/whmsWarehouseOrderService';
import { warehouseOrderImportHeaderKey } from './warehouseOrderBulkImport';
import {
  cellText,
  parseQty,
  readDateCell,
  readPairType,
  type StorePickupParseResult,
} from './warehouseOrderStoreTemplate';

/**
 * True when the first row is the flat store sheet (client, style code, qty).
 * @param row - First sheet row
 */
function isSimpleStoreHeader(row: Record<string, unknown> | undefined): boolean {
  const keys = new Set(Object.keys(row || {}).map((key) => warehouseOrderImportHeaderKey(key)));
  const hasStyle = keys.has('stylecode') || keys.has('stecodenew');
  const hasQty = keys.has('qty') || keys.has('quantity');
  return keys.has('client') && hasStyle && hasQty;
}

/**
 * Group flat store rows into one pending order per client + addon order id, or client + date when the id is blank.
 * @param rows - Sheet objects
 */
function ordersFromSimpleRows(rows: Record<string, unknown>[]): StorePickupParseResult {
  const errors: string[] = [];
  const grouped = new Map<string, BulkImportOrderRow>();

  rows.forEach((row, index) => {
    const line = index + 2;
    const mapped = new Map<string, unknown>();
    Object.entries(row).forEach(([key, value]) => mapped.set(warehouseOrderImportHeaderKey(key), value));

    const client = cellText(mapped.get('client'));
    const date = readDateCell(mapped.get('date'));
    const pairType = readPairType(cellText(mapped.get('pairtype')));
    const styleCode = cellText(mapped.get('stylecode') ?? mapped.get('stecodenew'));
    const addonOrderId = cellText(mapped.get('addonorderid'));
    const qtyCell = mapped.get('qty') ?? mapped.get('quantity');
    if (!client && !date && !styleCode && !addonOrderId && !cellText(mapped.get('pairtype')) && cellText(qtyCell) === '') {
      return;
    }
    if (!client) {
      errors.push(`Row ${line}: client is required`);
      return;
    }
    if (!styleCode) return;
    if (pairType === 'invalid') {
      errors.push(`Row ${line}: pairType must be single or multi`);
      return;
    }

    const parsed = parseQty(qtyCell);
    if (parsed.kind !== 'qty') {
      errors.push(`Row ${line}: qty for style ${styleCode} must be a whole number of at least 1`);
      return;
    }

    const key = addonOrderId
      ? `${client.toLowerCase()}\0${addonOrderId.toLowerCase()}`
      : `${client.toLowerCase()}\0\0${date}`;
    const current = grouped.get(key) ?? {
      clientType: 'Store',
      clientName: client,
      date,
      status: 'pending',
      ...(addonOrderId ? { addonOrderId } : {}),
      styleCodeSinglePair: [],
      styleCodeMultiPair: [],
    };
    if (date && !current.date) current.date = date;
    const lineItem = { styleCode, quantity: parsed.qty };
    if (pairType === 'multi') {
      current.styleCodeMultiPair = [...(current.styleCodeMultiPair || []), lineItem];
    } else {
      current.styleCodeSinglePair = [...(current.styleCodeSinglePair || []), lineItem];
    }
    grouped.set(key, current);
  });

  return { orders: [...grouped.values()], errors };
}

/**
 * Parse a flat store workbook. Returns null when the sheet is the pickup grid.
 * @param buf - File array buffer
 */
export function parseSimpleStoreOrderSheet(buf: ArrayBuffer): StorePickupParseResult | null {
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const named = wb.SheetNames.find((name) => warehouseOrderImportHeaderKey(name) === 'orders');
  const sheet = wb.Sheets[named ?? wb.SheetNames[0] ?? ''];
  if (!sheet) return null;

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: true });
  if (!isSimpleStoreHeader(rows[0])) return null;
  return ordersFromSimpleRows(rows);
}
