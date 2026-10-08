import * as XLSX from 'xlsx';
import type { BulkImportOrderRow } from '@/shared/services/whmsWarehouseOrderService';
import { warehouseOrderImportHeaderKey } from './warehouseOrderBulkImport';

export { downloadStoreOrderTemplate } from './warehouseOrderStoreTemplateDownload';

const STYLE_HEADER_KEYS = new Set(['stecodenew', 'stylecode', 'stylecodenew']);
const BILL_HEADER_KEYS = new Set(['billedcode', 'billcode']);
const SAP_HEADER_KEY = 'sapcode';
const RETEK_HEADER_KEY = 'retekcode';
const TOTAL_HEADER_KEY = 'total';
const PAIR_HEADER_KEY = 'pairtype';
const TYPE_HEADER_KEY = 'type';
const ADDON_HEADER_KEY = 'addonorderid';

export interface StorePickupParseResult {
  orders: BulkImportOrderRow[];
  errors: string[];
}

interface CellPos {
  row: number;
  col: number;
}

interface StyleQty {
  styleCode: string;
  pairType: 'single' | 'multi';
  type: string;
  qty: number;
}

interface StoreColumn {
  col: number;
  bill: string;
  sap: string;
  retek: string;
  addonOrderId: string;
  qtyByStyle: Map<string, StyleQty>;
}

type QtyParse = { kind: 'empty' } | { kind: 'invalid' } | { kind: 'qty'; qty: number };

/**
 * Coerce a pickup-sheet cell to trimmed text. Numbers stay without a decimal tail.
 * @param value - Raw cell
 */
export function cellText(value: unknown): string {
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
export function readDateCell(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return formatSheetDate(value);
  const raw = typeof value === 'string' ? value.trim() : '';
  if (/^\d{1,2}[/\-]\d{1,2}[/\-]\d{4}$/.test(raw)) return raw.replace(/-/g, '/');
  return '';
}

/**
 * Parse a refill cell. Blank and 0 are empty. Negatives and fractions are invalid.
 * @param value - Raw cell
 */
export function parseQty(value: unknown): QtyParse {
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
  const addonRow = findInColumn(rows, labelCol, ADDON_HEADER_KEY);

  for (let col = labelCol + 1; col < width; col += 1) {
    const headerKey = warehouseOrderImportHeaderKey(rows[headerRow]?.[col]);
    if (headerKey === TOTAL_HEADER_KEY) break;

    const bill = cellText(rows[billRow]?.[col]);
    const sap = sapRow == null ? '' : cellText(rows[sapRow]?.[col]);
    const retek = retekRow == null ? '' : cellText(rows[retekRow]?.[col]);
    const addonOrderId = addonRow == null ? '' : cellText(rows[addonRow]?.[col]);
    if (!bill && !sap && !retek) {
      if (columnHasQty(rows, headerRow, col)) {
        errors.push(`Column ${col + 1}: refill quantity but no bill, SAP, or retek code`);
      }
      continue;
    }

    stores.push({ col, bill, sap, retek, addonOrderId, qtyByStyle: new Map() });
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
 * @param pairCol - PAIR TYPE column, when the sheet has one
 * @param typeCol - TYPE column, when the sheet has one
 * @param stores - Store columns
 * @param errors - Parse errors to append
 */
function fillStoreQuantities(
  rows: unknown[][],
  header: CellPos,
  pairCol: number | null,
  typeCol: number | null,
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

    const pairType = readPairType(pairCol == null ? '' : cellText(rows[row]?.[pairCol]));
    if (pairType === 'invalid') {
      errors.push(`Row ${row + 1}: pair type must be single or multi`);
      continue;
    }

    const type = typeCol == null ? '' : cellText(rows[row]?.[typeCol]);
    stores.forEach((store) => {
      const parsed = parseQty(rows[row]?.[store.col]);
      if (parsed.kind === 'empty') return;
      const label = store.bill || store.sap || store.retek;
      if (parsed.kind === 'invalid') {
        errors.push(`Row ${row + 1}: quantity for store ${label} must be a whole number of at least 0`);
        return;
      }
      const key = `${pairType}\0${style}\0${type}`;
      const prev = store.qtyByStyle.get(key);
      store.qtyByStyle.set(key, {
        styleCode: style,
        pairType,
        type,
        qty: (prev?.qty || 0) + parsed.qty,
      });
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
        ...(store.addonOrderId ? { addonOrderId: store.addonOrderId } : {}),
        styleCodeSinglePair: [...store.qtyByStyle.values()]
          .filter((item) => item.pairType === 'single')
          .map((item) => ({
            styleCode: item.styleCode,
            quantity: item.qty,
            ...(item.type ? { type: item.type } : {}),
          })),
        styleCodeMultiPair: [...store.qtyByStyle.values()]
          .filter((item) => item.pairType === 'multi')
          .map((item) => ({
            styleCode: item.styleCode,
            quantity: item.qty,
            ...(item.type ? { type: item.type } : {}),
          })),
        meta: {
          source: 'store-pickup-sheet',
          ...(storePickupRef ? { storePickupRef } : {}),
        },
      };
    });
}

/**
 * Map a pairType cell to single or multi. Blank is single.
 * @param raw - Cell text
 */
export function readPairType(raw: string): 'single' | 'multi' | 'invalid' {
  const value = raw.toLowerCase().replace(/[\s_-]+/g, '');
  if (!value || value === 'single' || value === 'singlepair') return 'single';
  if (value === 'multi' || value === 'multipair') return 'multi';
  return 'invalid';
}

/**
 * Find a header cell on the style header row.
 * @param rows - Sheet matrix
 * @param headerRow - Style header row index
 * @param key - Normalized header
 */
function findHeaderCol(rows: unknown[][], headerRow: number, key: string): number | null {
  const col = (rows[headerRow] || []).findIndex((cell) => warehouseOrderImportHeaderKey(cell) === key);
  return col >= 0 ? col : null;
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
  fillStoreQuantities(
    rows,
    header,
    findHeaderCol(rows, header.row, PAIR_HEADER_KEY),
    findHeaderCol(rows, header.row, TYPE_HEADER_KEY),
    stores,
    errors,
  );

  return {
    orders: ordersFromStores(stores, date, storePickupRef),
    errors,
  };
}
