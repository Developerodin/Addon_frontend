import * as XLSX from 'xlsx';
import type {
  CreateWarehouseClientBody,
  WarehouseClientStoreProfile,
  WarehouseClientType,
} from '@/shared/services/whmsWarehouseClientService';
import {
  STORE_EXPORT_COLUMNS,
  TRADE_EXPORT_COLUMNS,
  WAREHOUSE_CLIENT_IMPORT_IGNORED_KEYS,
  resolveWarehouseClientImportKey,
  syncStoreProfileCombinedFields,
  warehouseClientImportHeaderKey,
} from './warehouseClientFieldConfig';
import { parseOpeningDateCell } from './warehouseClientImportDates';

const STORE_TEMPLATE = 'warehouse-clients-import-store-template.xlsx';
const TRADE_TEMPLATE = 'warehouse-clients-import-trade-dept-ecom-template.xlsx';

function str(v: unknown): string {
  return String(v ?? '').trim();
}

function parseSlNo(v: unknown): number | undefined {
  const s = str(v);
  if (s === '') return undefined;
  const n = Number(s);
  if (Number.isNaN(n)) return undefined;
  return n;
}

/**
 * Row plus the column that failed. No cell value — the user checks that cell themselves.
 */
function importColumnIssue(line: number, row: Map<string, unknown>, column: string): string {
  const bits = [`Row ${line}`];
  const sl = str(row.get('slNo'));
  if (sl) bits.push(`Sr.No. ${sl}`);
  bits.push(column);
  return bits.join(' · ');
}

/**
 * Spreadsheet location plus Sr.No. / Bill Code / party so the user can find the row.
 */
function importRowLabel(line: number, row: Map<string, unknown>): string {
  const bits = [`Row ${line}`];
  const sl = str(row.get('slNo'));
  const bill = str(row.get('billCode'));
  const party = str(row.get('retailerName'));
  if (sl) bits.push(`Sr.No. ${sl}`);
  if (bill) bits.push(`Bill Code ${bill}`);
  else if (party) bits.push(party);
  return bits.join(' · ');
}

/**
 * Read Status. Returns undefined when the cell is blank.
 * Pushes a user-facing error and returns null when the value is not active/inactive.
 */
function readImportStatus(
  row: Map<string, unknown>,
  line: number,
  errors: string[],
): 'active' | 'inactive' | undefined | null {
  if (!row.has('status')) return undefined;
  const raw = str(row.get('status'));
  if (!raw) return undefined;
  const status = raw.toLowerCase();
  if (status === 'active' || status === 'inactive') return status;
  errors.push(
    `${importRowLabel(line, row)}: Status "${raw}" is not allowed. Use active or inactive.`,
  );
  return null;
}

/**
 * Build normalized header → value map from a raw Excel row using import aliases.
 */
function rowToAliasMap(
  row: Record<string, unknown>,
  scope: 'storeRoot' | 'storeProfile' | 'tradeRoot',
  allowedDirectKeys?: Set<string>,
): Map<string, unknown> {
  const m = new Map<string, unknown>();
  Object.entries(row).forEach(([k, v]) => {
    const hk = warehouseClientImportHeaderKey(k);
    if (WAREHOUSE_CLIENT_IMPORT_IGNORED_KEYS.has(hk)) return;
    const target = resolveWarehouseClientImportKey(hk, scope);
    if (target) {
      m.set(target, v);
      return;
    }
    const trimmed = k.trim();
    if (allowedDirectKeys?.has(trimmed)) {
      m.set(trimmed, v);
    }
  });
  return m;
}

const STORE_ROOT_DIRECT = new Set(['slNo', 'status', 'remarks', 'type']);
const STORE_PROFILE_DIRECT = new Set([
  'billCode', 'sapCode', 'retekCode', 'classification', 'city', 'state', 'brand', 'brandSub',
  'openingDate', 'address', 'pincode', 'gst', 'storeLandlineNo',
  'smName', 'smContact', 'smNameAndContact', 'storeMailId',
  'abmName', 'abmContact', 'abmNameAndContact', 'abmMailId',
]);
const TRADE_ROOT_DIRECT = new Set([
  'slNo', 'status', 'remarks', 'type', 'parentKeyCode', 'retailerName', 'contactPerson',
  'mobilePhone', 'address', 'locality', 'city', 'zipCode', 'state', 'gstin', 'email', 'phone1',
]);

/**
 * Merge store root + profile alias maps into a single keyed map.
 */
function mergeStoreRowMaps(row: Record<string, unknown>): Map<string, unknown> {
  const root = rowToAliasMap(row, 'storeRoot', STORE_ROOT_DIRECT);
  const profile = rowToAliasMap(row, 'storeProfile', STORE_PROFILE_DIRECT);
  const merged = new Map<string, unknown>();
  root.forEach((v, k) => merged.set(k, v));
  profile.forEach((v, k) => merged.set(k, v));
  return merged;
}

/** Sample Excel for Store rows — Akshay Excel headers. */
export function downloadWarehouseClientStoreTemplate(): void {
  const sample: Record<string, string> = {};
  STORE_EXPORT_COLUMNS.forEach(({ header, key }) => {
    if (key === 'slNo') sample[header] = '1';
    else if (key === 'status') sample[header] = 'active';
    else if (key === 'type') sample[header] = 'Store';
    else if (key === 'clientId') sample[header] = 'REFERENCE_ONLY_ON_EXPORT';
    else if (key === 'openingDate') sample[header] = '2026-04-02';
    else if (key === 'billCode') sample[header] = 'BILL-01';
    else if (key === 'sapCode') sample[header] = 'SAP123';
    else if (key === 'retekCode') sample[header] = 'RET001';
    else if (key === 'brand') sample[header] = 'MyBrand';
    else if (key === 'brandSub') sample[header] = 'SubLine';
    else if (key === 'city') sample[header] = 'Mumbai';
    else if (key === 'pincode') sample[header] = '400001';
    else if (key === 'state') sample[header] = 'MH';
    else if (key === 'gst') sample[header] = '27AAAAA0000A1Z5';
    else if (key === 'smName') sample[header] = 'John Doe';
    else if (key === 'smContact') sample[header] = '9876543210';
    else if (key === 'storeMailId') sample[header] = 'store@example.com';
    else sample[header] = '';
  });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet([sample]);
  XLSX.utils.book_append_sheet(wb, ws, 'Store');
  const inst = XLSX.utils.aoa_to_sheet([
    ['Warehouse clients — Store import'],
    [''],
    ['Headers match Store for Akshay.xlsx. Channel = Store.'],
    ['Client ID is included on export for reference — ignored on import.'],
    ['Do not add createdAt or updatedAt — system-managed.'],
  ]);
  XLSX.utils.book_append_sheet(wb, inst, 'Instructions');
  XLSX.writeFile(wb, STORE_TEMPLATE);
}

/** Trade / Departmental / Ecom — Akshay Excel headers. */
export function downloadWarehouseClientTradeTemplate(): void {
  const sample: Record<string, string> = {};
  TRADE_EXPORT_COLUMNS.forEach(({ header, key }) => {
    if (key === 'slNo') sample[header] = '1';
    else if (key === 'status') sample[header] = 'active';
    else if (key === 'type') sample[header] = 'Trade';
    else if (key === 'parentKeyCode') sample[header] = 'PK-100';
    else if (key === 'retailerName') sample[header] = 'Party Name';
    else if (key === 'city') sample[header] = 'Bangalore';
    else if (key === 'zipCode') sample[header] = '560001';
    else if (key === 'state') sample[header] = 'KA';
    else if (key === 'mobilePhone') sample[header] = '9876543210';
    else sample[header] = '';
  });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet([sample]);
  XLSX.utils.book_append_sheet(wb, ws, 'Clients');
  const inst = XLSX.utils.aoa_to_sheet([
    ['Warehouse clients — Trade / Departmental / Ecom import'],
    [''],
    ['Headers match Trade, Department, Ecom for Akshay.xlsx.'],
    ['Channel = Trade | Departmental | Ecom. Client ID and Creation Date are ignored on import.'],
  ]);
  XLSX.utils.book_append_sheet(wb, inst, 'Instructions');
  XLSX.writeFile(wb, TRADE_TEMPLATE);
}

function isStoreMappingRow(m: Map<string, unknown>): boolean {
  return (
    str(m.get('billCode')) === 'billCode' ||
    str(m.get('slNo')) === 'slNo' ||
    str(m.get('type')) === 'type'
  );
}

function isTradeMappingRow(m: Map<string, unknown>): boolean {
  return str(m.get('type')) === 'type' || str(m.get('slNo')) === 'slNo';
}

export { warehouseClientImportHeaderKey };

export function parseWarehouseClientStoreImportFile(buf: ArrayBuffer): {
  items: CreateWarehouseClientBody[];
  errors: string[];
} {
  const errors: string[] = [];
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) {
    return { items: [], errors: ['No sheet found'] };
  }
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
  if (!rawRows.length) {
    return { items: [], errors: ['No rows found'] };
  }

  const items: CreateWarehouseClientBody[] = [];
  rawRows.forEach((row, idx) => {
    const line = idx + 2;
    const m = mergeStoreRowMaps(row);
    if (isStoreMappingRow(m)) return;

    const typeCell = str(m.get('type'));
    if (typeCell && typeCell !== 'Store') {
      const where = importRowLabel(line, m);
      const hint =
        typeCell === 'Trade' || typeCell === 'Departmental' || typeCell === 'Ecom'
          ? ` Use Import Trade / Dept / Ecom for Channel "${typeCell}".`
          : ` Channel must be Store.`;
      errors.push(`${where}: Channel is "${typeCell}".${hint}`);
      return;
    }

    let rowFailed = false;
    const storeProfile: WarehouseClientStoreProfile = {};
    const profileKeys: (keyof WarehouseClientStoreProfile)[] = [
      'billCode', 'sapCode', 'retekCode', 'classification', 'city', 'state', 'brand', 'brandSub',
      'openingDate', 'address', 'pincode', 'gst', 'storeLandlineNo',
      'smName', 'smContact', 'smNameAndContact', 'storeMailId',
      'abmName', 'abmContact', 'abmNameAndContact', 'abmMailId',
    ];

    profileKeys.forEach((key) => {
      if (!m.has(key)) return;
      const val = m.get(key);
      if (key === 'openingDate') {
        const parsed = parseOpeningDateCell(val);
        if (!parsed.ok) {
          errors.push(importColumnIssue(line, m, 'Opening Date'));
          rowFailed = true;
          return;
        }
        if (parsed.iso) storeProfile.openingDate = parsed.iso;
        return;
      }
      const s = str(val);
      if (s === '') return;
      (storeProfile as Record<string, unknown>)[key] = s;
    });

    if (rowFailed) return;

    const body: CreateWarehouseClientBody = {
      type: 'Store',
      storeProfile: syncStoreProfileCombinedFields(
        Object.keys(storeProfile).length ? storeProfile : {},
      ),
    };

    const st = readImportStatus(m, line, errors);
    if (st === null) return;
    if (st) body.status = st;

    const rm = str(m.get('remarks'));
    if (rm !== '') body.remarks = rm;

    const sl = parseSlNo(m.get('slNo'));
    if (sl !== undefined) body.slNo = sl;

    items.push(body);
  });

  return { items, errors };
}

const TRADE_TYPES = new Set<string>(['Trade', 'Departmental', 'Ecom']);

export function parseWarehouseClientTradeImportFile(buf: ArrayBuffer): {
  items: CreateWarehouseClientBody[];
  errors: string[];
} {
  const errors: string[] = [];
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) {
    return { items: [], errors: ['No sheet found'] };
  }
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
  if (!rawRows.length) {
    return { items: [], errors: ['No rows found'] };
  }

  const items: CreateWarehouseClientBody[] = [];
  rawRows.forEach((row, idx) => {
    const line = idx + 2;
    const m = rowToAliasMap(row, 'tradeRoot', TRADE_ROOT_DIRECT);
    if (isTradeMappingRow(m)) return;

    const typeCell = str(m.get('type')) as WarehouseClientType;
    if (!typeCell || !TRADE_TYPES.has(typeCell)) {
      const where = importRowLabel(line, m);
      const shown = typeCell || 'blank';
      const hint =
        typeCell === 'Store'
          ? ' This is a Store row. Use the Import Store button.'
          : ' Channel must be Trade, Departmental, or Ecom.';
      errors.push(`${where}: Channel is "${shown}".${hint}`);
      return;
    }

    const status = readImportStatus(m, line, errors);
    if (status === null) return;

    const body: CreateWarehouseClientBody = { type: typeCell };
    if (status) body.status = status;

    const tradeKeys = [
      'slNo', 'status', 'remarks', 'parentKeyCode', 'retailerName', 'contactPerson',
      'mobilePhone', 'address', 'locality', 'city', 'zipCode', 'state', 'gstin', 'email', 'phone1',
    ] as const;

    tradeKeys.forEach((key) => {
      if (!m.has(key)) return;
      const val = m.get(key);
      if (key === 'slNo') {
        const sl = parseSlNo(val);
        if (sl !== undefined) body.slNo = sl;
        return;
      }
      if (key === 'status') return;
      if (key === 'remarks') {
        body.remarks = str(val);
        return;
      }
      const s = str(val);
      if (s === '') return;
      (body as Record<string, unknown>)[key] = s;
    });

    items.push(body);
  });

  return { items, errors };
}
