import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { BulkImportOrderRow } from '@/shared/services/whmsWarehouseOrderService';
import type { WarehouseClient } from '@/shared/services/whmsWarehouseClientService';
import { warehouseClientReferenceLabel, warehouseOrderImportHeaderKey } from './warehouseOrderBulkImport';

const TEMPLATE_FILENAME = 'store-orders-template.xlsx';
const SIMPLE_HEADERS = ['client', 'date', 'styleCode', 'addonOrderId', 'qty'] as const;
const BLANK_ROWS = 20;

const STYLE_HEADER_KEYS = new Set(['stecodenew', 'stylecode', 'stylecodenew']);
const BILL_HEADER_KEYS = new Set(['billedcode', 'billcode']);
const SAP_HEADER_KEY = 'sapcode';
const RETEK_HEADER_KEY = 'retekcode';
const TOTAL_HEADER_KEY = 'total';

export interface StorePickupParseResult {
  orders: BulkImportOrderRow[];
  errors: string[];
}

interface CellPos {
  row: number;
  col: number;
}

interface StoreColumn {
  col: number;
  bill: string;
  sap: string;
  retek: string;
  qtyByStyle: Map<string, number>;
}

type QtyParse = { kind: 'empty' } | { kind: 'invalid' } | { kind: 'qty'; qty: number };

/**
 * Coerce a pickup-sheet cell to trimmed text. Numbers stay without a decimal tail.
 * @param value - Raw cell
 */
function cellText(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : String(value).trim();
  }
  return String(value).trim();
}

/**
 * Format an Excel date cell as DD/MM/YYYY.
 * SheetJS shifts date-only cells to 23:59 the previous evening in positive timezones.
 * @param value - Date from the workbook
 */
function formatSheetDate(value: Date): string {
  const snapped = new Date(value.getTime());
  if (snapped.getHours() >= 23) snapped.setDate(snapped.getDate() + 1);
  const dd = String(snapped.getDate()).padStart(2, '0');
  const mm = String(snapped.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${snapped.getFullYear()}`;
}

/**
 * True when the cell is a calendar date or a DD/MM/YYYY string.
 * @param value - Raw cell
 */
function readDateCell(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return formatSheetDate(value);
  const raw = typeof value === 'string' ? value.trim() : '';
  if (/^\d{1,2}[/\-]\d{1,2}[/\-]\d{4}$/.test(raw)) return raw.replace(/-/g, '/');
  return '';
}

/**
 * Parse a refill cell. Blank and 0 are empty. Negatives and fractions are invalid.
 * @param value - Raw cell
 */
function parseQty(value: unknown): QtyParse {
  if (value == null) return { kind: 'empty' };
  if (typeof value === 'string' && !value.trim()) return { kind: 'empty' };
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    if (typeof value === 'string' && !value.trim()) return { kind: 'empty' };
    if (value === '') return { kind: 'empty' };
    return { kind: 'invalid' };
  }
  if (n === 0) return { kind: 'empty' };
  return { kind: 'qty', qty: n };
}

/**
 * Find the first cell whose normalized text is in `keys`.
 * @param rows - Sheet matrix
 * @param keys - Normalized header keys
 */
function findCell(rows: unknown[][], keys: Set<string>): CellPos | null {
  for (let row = 0; row < rows.length; row += 1) {
    const line = rows[row] || [];
    for (let col = 0; col < line.length; col += 1) {
      if (keys.has(warehouseOrderImportHeaderKey(line[col]))) return { row, col };
    }
  }
  return null;
}

/**
 * Find the first cell in a column whose normalized text equals `key`.
 * @param rows - Sheet matrix
 * @param col - Column index
 * @param key - Normalized header
 */
function findInColumn(rows: unknown[][], col: number, key: string): number | null {
  for (let row = 0; row < rows.length; row += 1) {
    if (warehouseOrderImportHeaderKey(rows[row]?.[col]) === key) return row;
  }
  return null;
}

/**
 * Read order date and optional pickup ref from the block above the style header.
 * The style column holds the title, then the date, then the batch ref (same as the SC pickup sheet).
 * @param rows - Sheet matrix
 * @param header - Style-code header position
 * @param labelCol - Column that holds BILLED CODE
 */
function readSheetContext(
  rows: unknown[][],
  header: CellPos,
  labelCol: number,
): { date: string; storePickupRef: string } {
  let date = '';
  const lastCol = Math.max(labelCol, header.col);
  for (let row = 0; row < header.row && !date; row += 1) {
    for (let col = 0; col <= lastCol; col += 1) {
      const found = readDateCell(rows[row]?.[col]);
      if (found) {
        date = found;
        break;
      }
    }
  }

  const texts: string[] = [];
  for (let row = 0; row < header.row; row += 1) {
    const value = rows[row]?.[header.col];
    if (value instanceof Date) continue;
    const text = cellText(value);
    if (!text || readDateCell(text)) continue;
    texts.push(text);
  }

  let storePickupRef = '';
  if (texts.length >= 2) storePickupRef = texts[texts.length - 1];
  else if (texts.length === 1 && texts[0].includes('/')) storePickupRef = texts[0];

  return { date, storePickupRef };
}

/**
 * Store columns sit to the right of the code labels and stop at TOTAL.
 * @param rows - Sheet matrix
 * @param headerRow - Style header row index
 * @param labelCol - Billed-code label column
 * @param billRow - Billed-code row
 * @param sapRow - SAP-code row, when present
 * @param retekRow - Retek-code row, when present
 * @param errors - Parse errors to append
 */
function collectStoreColumns(
  rows: unknown[][],
  headerRow: number,
  labelCol: number,
  billRow: number,
  sapRow: number | null,
  retekRow: number | null,
  errors: string[],
): StoreColumn[] {
  const width = rows.reduce((max, row) => Math.max(max, row?.length || 0), 0);
  const stores: StoreColumn[] = [];

  for (let col = labelCol + 1; col < width; col += 1) {
    const headerKey = warehouseOrderImportHeaderKey(rows[headerRow]?.[col]);
    if (headerKey === TOTAL_HEADER_KEY) break;

    const bill = cellText(rows[billRow]?.[col]);
    const sap = sapRow == null ? '' : cellText(rows[sapRow]?.[col]);
    const retek = retekRow == null ? '' : cellText(rows[retekRow]?.[col]);
    if (!bill && !sap && !retek) {
      if (columnHasQty(rows, headerRow, col)) {
        errors.push(`Column ${col + 1}: refill quantity but no bill, SAP, or retek code`);
      }
      continue;
    }

    stores.push({ col, bill, sap, retek, qtyByStyle: new Map() });
  }

  return stores;
}

/**
 * True when any data cell in the column has a non-empty quantity.
 * @param rows - Sheet matrix
 * @param headerRow - Style header row index
 * @param col - Column index
 */
function columnHasQty(rows: unknown[][], headerRow: number, col: number): boolean {
  for (let row = headerRow + 1; row < rows.length; row += 1) {
    if (parseQty(rows[row]?.[col]).kind !== 'empty') return true;
  }
  return false;
}

/**
 * Fill per-store style quantities from data rows under the style header.
 * @param rows - Sheet matrix
 * @param header - Style-code header position
 * @param stores - Store columns
 * @param errors - Parse errors to append
 */
function fillStoreQuantities(
  rows: unknown[][],
  header: CellPos,
  stores: StoreColumn[],
  errors: string[],
): void {
  for (let row = header.row + 1; row < rows.length; row += 1) {
    const style = cellText(rows[row]?.[header.col]);
    if (STYLE_HEADER_KEYS.has(warehouseOrderImportHeaderKey(style))) continue;

    if (!style) {
      const stray = stores.some((store) => parseQty(rows[row]?.[store.col]).kind !== 'empty');
      if (stray) errors.push(`Row ${row + 1}: quantity without style code`);
      continue;
    }

    stores.forEach((store) => {
      const parsed = parseQty(rows[row]?.[store.col]);
      if (parsed.kind === 'empty') return;
      const label = store.bill || store.sap || store.retek;
      if (parsed.kind === 'invalid') {
        errors.push(`Row ${row + 1}: quantity for store ${label} must be a whole number of at least 0`);
        return;
      }
      store.qtyByStyle.set(style, (store.qtyByStyle.get(style) || 0) + parsed.qty);
    });
  }
}

/**
 * One pending store order per column that has at least one refill quantity.
 * @param stores - Store columns with quantities
 * @param date - Sheet date (DD/MM/YYYY)
 * @param storePickupRef - Optional batch reference
 */
function ordersFromStores(stores: StoreColumn[], date: string, storePickupRef: string): BulkImportOrderRow[] {
  return stores
    .filter((store) => store.qtyByStyle.size > 0)
    .map((store) => {
      const clientName = store.bill || store.sap || store.retek;
      return {
        clientType: 'Store',
        clientName,
        date,
        status: 'pending',
        ...(store.bill ? { storeBillCode: store.bill } : {}),
        ...(store.sap ? { storeSapCode: store.sap } : {}),
        ...(store.retek ? { storeRetekCode: store.retek } : {}),
        styleCodeSinglePair: [...store.qtyByStyle.entries()].map(([styleCode, quantity]) => ({
          styleCode,
          quantity,
        })),
        meta: {
          source: 'store-pickup-sheet',
          ...(storePickupRef ? { storePickupRef } : {}),
        },
      };
    });
}

/**
 * Sort store clients by bill code so template columns follow the pickup sheet.
 * @param stores - Store clients
 */
function sortStores(stores: WarehouseClient[]): WarehouseClient[] {
  return [...stores].sort((a, b) => {
    const left = a.storeProfile?.billCode?.trim() || '';
    const right = b.storeProfile?.billCode?.trim() || '';
    return left.localeCompare(right, undefined, { numeric: true });
  });
}

/**
 * True when the first row is the flat store template (client, style code, qty).
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
 * Blank client rows (prefilled stores with no style) are skipped.
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
    const styleCode = cellText(mapped.get('stylecode') ?? mapped.get('stecodenew'));
    const addonOrderId = cellText(mapped.get('addonorderid'));
    const qtyCell = mapped.get('qty') ?? mapped.get('quantity');
    if (!client && !date && !styleCode && !addonOrderId && cellText(qtyCell) === '') return;
    if (!client) {
      errors.push(`Row ${line}: client is required`);
      return;
    }
    if (!styleCode) return;

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
    };
    if (date && !current.date) current.date = date;
    current.styleCodeSinglePair = [...(current.styleCodeSinglePair || []), { styleCode, quantity: parsed.qty }];
    grouped.set(key, current);
  });

  return { orders: [...grouped.values()], errors };
}

/**
 * Parse the flat store template. Returns null when the sheet is not that layout.
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

/**
 * One empty store-template row. Client can be prefilled from an active store.
 * @param client - Bill code, SAP, retek, or brand
 */
function blankStoreRow(client = ''): Record<(typeof SIMPLE_HEADERS)[number], string> {
  return { client, date: '', styleCode: '', addonOrderId: '', qty: '' };
}

/**
 * Download the store order template. Columns: client, date, style code, addon order id, qty.
 * Active stores are prefilled in the client column. Pack, EAN, and shade come from the catalogue on import.
 * @param stores - Active store clients to prefill
 */
export function downloadStoreOrderTemplate(stores: WarehouseClient[]): void {
  const prefilled = sortStores(stores).map((store) => blankStoreRow(warehouseClientReferenceLabel(store)));
  const blanks = Array.from({ length: BLANK_ROWS }, () => blankStoreRow());

  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet([...prefilled, ...blanks], { header: [...SIMPLE_HEADERS] });
  sheet['!cols'] = SIMPLE_HEADERS.map((name) => ({ wch: Math.max(name.length + 4, 18) }));
  XLSX.utils.book_append_sheet(wb, sheet, 'Orders');

  const instructions = [
    { Field: 'client', Description: 'Required. Store bill code, SAP code, retek code, or brand.' },
    { Field: 'date', Description: 'Optional. DD/MM/YYYY. Blank uses today. Same client + date (when addonOrderId is blank) becomes one order.' },
    { Field: 'styleCode', Description: 'Required on each line. Pack, EAN, shade, and brand come from the style catalogue.' },
    { Field: 'addonOrderId', Description: 'Optional. Unique per order. When set, lines with that id are one order.' },
    { Field: 'qty', Description: 'Required. Whole number of at least 1. Rows with no style code are skipped.' },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(instructions), 'Instructions');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([wbout], { type: 'application/octet-stream' }), TEMPLATE_FILENAME);
}

/**
 * Read the first pickup sheet, or the first sheet when none is named that way.
 * @param wb - Workbook
 */
function pickupWorksheet(wb: XLSX.WorkBook): XLSX.WorkSheet | null {
  const named = wb.SheetNames.find((name) => warehouseOrderImportHeaderKey(name).includes('pickup'));
  const sheetName = named ?? wb.SheetNames[0];
  if (!sheetName) return null;
  return wb.Sheets[sheetName] ?? null;
}

/**
 * Parse a store pickup workbook into bulk-import orders.
 * Returns null when the sheet is not the store grid (caller should use the generic parser).
 * @param buf - File array buffer
 */
export function parseStorePickupSheet(buf: ArrayBuffer): StorePickupParseResult | null {
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const sheet = pickupWorksheet(wb);
  if (!sheet) return null;

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: true });
  const header = findCell(rows, STYLE_HEADER_KEYS);
  const bill = findCell(rows, BILL_HEADER_KEYS);
  if (!header || !bill) return null;

  const errors: string[] = [];
  const sapRow = findInColumn(rows, bill.col, SAP_HEADER_KEY);
  const retekRow = findInColumn(rows, bill.col, RETEK_HEADER_KEY);
  const { date, storePickupRef } = readSheetContext(rows, header, bill.col);
  const stores = collectStoreColumns(rows, header.row, bill.col, bill.row, sapRow, retekRow, errors);
  fillStoreQuantities(rows, header, stores, errors);

  return {
    orders: ordersFromStores(stores, date, storePickupRef),
    errors,
  };
}
