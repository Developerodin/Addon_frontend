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

function parseOpeningDate(v: unknown): string | null | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString();
  }
  const s = str(v);
  if (!s) return undefined;
  const serial = Number(s);
  if (Number.isFinite(serial) && serial > 1000 && serial < 600000) {
    const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  return s;
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
      errors.push(`Row ${line}: Channel must be Store or empty (got "${typeCell}")`);
      return;
    }

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
        const parsed = parseOpeningDate(val);
        if (parsed !== undefined) storeProfile.openingDate = parsed;
        return;
      }
      const s = str(val);
      if (s === '') return;
      (storeProfile as Record<string, unknown>)[key] = s;
    });

    const body: CreateWarehouseClientBody = {
      type: 'Store',
      storeProfile: syncStoreProfileCombinedFields(
        Object.keys(storeProfile).length ? storeProfile : {},
      ),
    };

    const st = str(m.get('status'));
    if (st === 'active' || st === 'inactive') body.status = st;

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
      errors.push(`Row ${line}: Channel must be Trade, Departmental, or Ecom`);
      return;
    }

    const body: CreateWarehouseClientBody = { type: typeCell };

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
      if (key === 'status') {
        const st = str(val);
        if (st === 'active' || st === 'inactive') body.status = st;
        return;
      }
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
