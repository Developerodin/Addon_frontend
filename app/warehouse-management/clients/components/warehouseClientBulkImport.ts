import * as XLSX from 'xlsx';
import type {
  CreateWarehouseClientBody,
  WarehouseClientStoreProfile,
  WarehouseClientType,
} from '@/shared/services/whmsWarehouseClientService';

const STORE_TEMPLATE = 'warehouse-clients-import-store-template.xlsx';
const TRADE_TEMPLATE = 'warehouse-clients-import-trade-dept-ecom-template.xlsx';

/** Normalize Excel header for matching (ignore spaces, case, underscores). */
export function warehouseClientImportHeaderKey(cell: unknown): string {
  return String(cell ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '');
}

const STORE_PROFILE_KEYS: (keyof WarehouseClientStoreProfile)[] = [
  'billCode',
  'sapCode',
  'retekCode',
  'classification',
  'city',
  'state',
  'brand',
  'brandSub',
  'openingDate',
  'address',
  'gst',
  'storeLandlineNo',
  'smNameAndContact',
  'storeMailId',
  'abmNameAndContact',
  'abmMailId',
];

/** Excel headers that are system-managed — never sent to the create/import API. */
const IMPORT_IGNORED_HEADER_KEYS = new Set([
  'createdat',
  'updatedat',
  'createddate',
  'updateddate',
  'clientid',
  'id',
  '_id',
]);

const TRADE_ROOT_KEYS = [
  'type',
  'slno',
  'status',
  'remarks',
  'distributorname',
  'parentkeycode',
  'retailername',
  'contactperson',
  'mobilephone',
  'address',
  'locality',
  'city',
  'zipcode',
  'state',
  'gstin',
  'email',
  'phone1',
  'rsm',
  'asm',
  'se',
  'dso',
  'outlet',
] as const;

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

function rowToKeyMap(row: Record<string, unknown>): Map<string, unknown> {
  const m = new Map<string, unknown>();
  Object.entries(row).forEach(([k, v]) => {
    const hk = warehouseClientImportHeaderKey(k);
    if (IMPORT_IGNORED_HEADER_KEYS.has(hk)) return;
    m.set(hk, v);
  });
  return m;
}

/**
 * Strip system-managed columns from a raw Excel row before sp_* nested parsing.
 * @param row - Raw sheet row
 */
function stripIgnoredImportColumns(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  Object.entries(row).forEach(([k, v]) => {
    if (IMPORT_IGNORED_HEADER_KEYS.has(warehouseClientImportHeaderKey(k))) return;
    out[k] = v;
  });
  return out;
}

/** Sample Excel for Store rows — columns map to API (store fields roll into `storeProfile`). */
export function downloadWarehouseClientStoreTemplate(): void {
  const headers: Record<string, string> = {
    type: 'Store',
    status: 'active',
    remarks: '',
    slNo: '1',
    billCode: 'BILL-01',
    sapCode: 'SAP123',
    retekCode: 'RET001',
    classification: 'A',
    city: 'Mumbai',
    state: 'MH',
    brand: 'MyBrand',
    brandSub: 'SubLine',
    address: 'Street 1',
    gst: '27AAAAA0000A1Z5',
    storeLandlineNo: '022-12345678',
    smNameAndContact: 'Name / 9876543210',
    storeMailId: 'store@example.com',
    abmNameAndContact: 'ABM Name / 9876500000',
    abmMailId: 'abm@example.com',
  };
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet([headers]);
  XLSX.utils.book_append_sheet(wb, ws, 'Clients');
  const inst = XLSX.utils.aoa_to_sheet([
    ['Warehouse clients — Store import'],
    [''],
    ['Required: type = Store. Columns type, status, remarks, slNo are optional root fields.'],
    ['All other columns map into storeProfile. Do not add extra columns (API rejects unknown keys).'],
    ['Optional storeProfile fields include smNameAndContact, storeMailId, abmNameAndContact, abmMailId.'],
    ['openingDate is optional — set via Add/Edit form only (YYYY-MM-DD). Not in this template.'],
    ['Do not add createdAt, updatedAt, or clientId — those are system-managed.'],
  ]);
  XLSX.utils.book_append_sheet(wb, inst, 'Instructions');
  XLSX.writeFile(wb, STORE_TEMPLATE);
}

/**
 * Trade / Departmental / Ecom — root columns + optional nested store profile via sp_* (e.g. sp_billCode).
 * Root city/state/address are separate from sp_city / sp_state / sp_address.
 */
export function downloadWarehouseClientTradeTemplate(): void {
  const headers: Record<string, string> = {
    type: 'Trade',
    slNo: '10',
    status: 'active',
    remarks: 'Notes',
    distributorName: 'Dist Co',
    parentKeyCode: 'PK-100',
    retailerName: 'Dept Store Name',
    contactPerson: 'John Doe',
    mobilePhone: '9876543210',
    address: 'Plot 5',
    locality: 'Area',
    city: 'Bangalore',
    zipCode: '560001',
    state: 'KA',
    gstin: '29AAAAA0000A1Z5',
    email: 'contact@retailer.com',
    phone1: '080-11112222',
    rsm: 'RSM Name',
    asm: 'ASM Name',
    se: 'SE Name',
    dso: 'DSO Name',
    outlet: 'OUT-77',
    sp_billCode: '',
    sp_sapCode: '',
    sp_city: '',
    sp_state: '',
  };
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet([headers]);
  XLSX.utils.book_append_sheet(wb, ws, 'Clients');
  const inst = XLSX.utils.aoa_to_sheet([
    ['Warehouse clients — Trade / Departmental / Ecom import'],
    [''],
    ['type: Trade | Departmental | Ecom (required per row).'],
    ['Optional nested store profile: columns prefixed sp_ map to storeProfile (e.g. sp_billCode, sp_city).'],
    ['Root city, state, address are separate from sp_city, sp_state, sp_address.'],
    ['Do not add createdAt, updatedAt, created date, or clientId — timestamps and ids are set by the system.'],
  ]);
  XLSX.utils.book_append_sheet(wb, inst, 'Instructions');
  XLSX.writeFile(wb, TRADE_TEMPLATE);
}

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
    const m = rowToKeyMap(row);
    const typeCell = str(m.get('type'));
    if (typeCell && typeCell !== 'Store') {
      errors.push(`Row ${line}: type must be Store or empty (got "${typeCell}")`);
      return;
    }

    const storeProfile: WarehouseClientStoreProfile = {};
    STORE_PROFILE_KEYS.forEach((key) => {
      const hk = warehouseClientImportHeaderKey(key);
      if (!m.has(hk)) return;
      const val = m.get(hk);
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
      storeProfile: Object.keys(storeProfile).length ? storeProfile : {},
    };

    const st = str(m.get('status'));
    if (st === 'active' || st === 'inactive') body.status = st;

    const rm = str(m.get('remarks'));
    if (rm !== '') body.remarks = rm;

    const sl = parseSlNo(m.get('slno'));
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
    const m = rowToKeyMap(row);
    const typeCell = str(m.get('type')) as WarehouseClientType;
    if (!typeCell || !TRADE_TYPES.has(typeCell)) {
      errors.push(`Row ${line}: type must be Trade, Departmental, or Ecom`);
      return;
    }

    const body: CreateWarehouseClientBody = { type: typeCell };

    TRADE_ROOT_KEYS.forEach((hk) => {
      if (hk === 'type') return;
      const val = m.get(hk);
      if (val === undefined || val === '') return;
      if (hk === 'slno') {
        const sl = parseSlNo(val);
        if (sl !== undefined) body.slNo = sl;
        return;
      }
      if (hk === 'status') {
        const st = str(val);
        if (st === 'active' || st === 'inactive') body.status = st;
        return;
      }
      if (hk === 'remarks') {
        body.remarks = str(val);
        return;
      }
      const fieldMap: Record<string, keyof CreateWarehouseClientBody> = {
        distributorname: 'distributorName',
        parentkeycode: 'parentKeyCode',
        retailername: 'retailerName',
        contactperson: 'contactPerson',
        mobilephone: 'mobilePhone',
        address: 'address',
        locality: 'locality',
        city: 'city',
        zipcode: 'zipCode',
        state: 'state',
        gstin: 'gstin',
        email: 'email',
        phone1: 'phone1',
        rsm: 'rsm',
        asm: 'asm',
        se: 'se',
        dso: 'dso',
        outlet: 'outlet',
      };
      const fk = fieldMap[hk];
      if (fk) (body as Record<string, unknown>)[fk] = str(val);
    });

    const storeProfile: WarehouseClientStoreProfile = {};
    Object.keys(stripIgnoredImportColumns(row)).forEach((rawCol) => {
      const trimmed = String(rawCol).trim();
      if (!/^sp_/i.test(trimmed)) return;
      const inner = trimmed.replace(/^sp_/i, '');
      const match = STORE_PROFILE_KEYS.find(
        (k) => warehouseClientImportHeaderKey(k) === warehouseClientImportHeaderKey(inner),
      );
      if (!match) return;
      const val = row[rawCol];
      if (match === 'openingDate') {
        const parsed = parseOpeningDate(val);
        if (parsed !== undefined) storeProfile.openingDate = parsed;
        return;
      }
      const s = str(val);
      if (s === '') return;
      (storeProfile as Record<string, unknown>)[match] = s;
    });

    if (Object.keys(storeProfile).length) {
      body.storeProfile = storeProfile;
    }

    items.push(body);
  });

  return { items, errors };
}
