import type { WarehouseClientStoreProfile } from '@/shared/services/whmsWarehouseClientService';

/** Normalize Excel / display header for alias lookup. */
export function warehouseClientImportHeaderKey(cell: unknown): string {
  return String(cell ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_.]+/g, '');
}

/** Excel headers that are system-managed — never sent to create/import API. */
export const WAREHOUSE_CLIENT_IMPORT_IGNORED_KEYS = new Set([
  'createdat',
  'updatedat',
  'createddate',
  'updateddate',
  'creationdate',
  'clientid',
  'id',
  '_id',
]);

/** Store profile field definitions (API key + UI label). */
export const STORE_PROFILE_FIELDS: { key: keyof WarehouseClientStoreProfile; label: string }[] = [
  { key: 'billCode', label: 'Bill code' },
  { key: 'retekCode', label: 'Retek code' },
  { key: 'sapCode', label: 'SAP code' },
  { key: 'brand', label: 'Brand' },
  { key: 'brandSub', label: 'Sub brand' },
  { key: 'classification', label: 'Classification' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'pincode', label: 'Pincode' },
  { key: 'state', label: 'State' },
  { key: 'gst', label: 'GSTIN' },
  { key: 'storeLandlineNo', label: 'Store landline' },
  { key: 'smName', label: 'Store manager name' },
  { key: 'smContact', label: 'Store manager contact' },
  { key: 'storeMailId', label: 'Store email' },
  { key: 'abmName', label: 'ABM name' },
  { key: 'abmContact', label: 'ABM contact' },
  { key: 'abmMailId', label: 'ABM email' },
];

/** Trade / Departmental / Ecom root field definitions. */
export const TRADE_ROOT_FIELDS: { key: string; label: string; wide?: boolean }[] = [
  { key: 'slNo', label: 'Sr. no.' },
  { key: 'retailerName', label: 'Party name' },
  { key: 'parentKeyCode', label: 'SAP code' },
  { key: 'contactPerson', label: 'Contact person' },
  { key: 'mobilePhone', label: 'Contact number' },
  { key: 'phone1', label: 'Contact number 1' },
  { key: 'email', label: 'E-mail' },
  { key: 'gstin', label: 'GSTIN' },
  { key: 'locality', label: 'Locality' },
  { key: 'city', label: 'City' },
  { key: 'zipCode', label: 'Pincode' },
  { key: 'state', label: 'State' },
];

/** Store export column order (Akshay Excel headers). */
export const STORE_EXPORT_COLUMNS: { header: string; key: string }[] = [
  { header: 'Sr.No.', key: 'slNo' },
  { header: 'Status', key: 'status' },
  { header: 'Opening Date', key: 'openingDate' },
  { header: 'Channel', key: 'type' },
  { header: 'Bill Code', key: 'billCode' },
  { header: 'Retek Code', key: 'retekCode' },
  { header: 'SAP Code', key: 'sapCode' },
  { header: 'Brand', key: 'brand' },
  { header: 'Sub Brand', key: 'brandSub' },
  { header: 'Classification', key: 'classification' },
  { header: 'Address', key: 'address' },
  { header: 'City', key: 'city' },
  { header: 'Pincode', key: 'pincode' },
  { header: 'State', key: 'state' },
  { header: 'GSTIN', key: 'gst' },
  { header: 'Store Landline', key: 'storeLandlineNo' },
  { header: 'Store Manager Name', key: 'smName' },
  { header: 'Store Manager Contact', key: 'smContact' },
  { header: 'Store email', key: 'storeMailId' },
  { header: 'ABM Name', key: 'abmName' },
  { header: 'ABM Contact', key: 'abmContact' },
  { header: 'ABM email', key: 'abmMailId' },
];

/** Trade export column order (Akshay Excel headers). */
export const TRADE_EXPORT_COLUMNS: { header: string; key: string }[] = [
  { header: 'Sr.No.', key: 'slNo' },
  { header: 'Status', key: 'status' },
  { header: 'Creation Date', key: 'createdAt' },
  { header: 'Channel', key: 'type' },
  { header: 'Client ID', key: 'clientId' },
  { header: 'SAP Code', key: 'parentKeyCode' },
  { header: 'Party Name', key: 'retailerName' },
  { header: 'Address', key: 'address' },
  { header: 'Locality', key: 'locality' },
  { header: 'City', key: 'city' },
  { header: 'Pincode', key: 'zipCode' },
  { header: 'State', key: 'state' },
  { header: 'GSTIN', key: 'gstin' },
  { header: 'Contact Person', key: 'contactPerson' },
  { header: 'Contact Number', key: 'mobilePhone' },
  { header: 'Contact Number 1', key: 'phone1' },
  { header: 'E-mail', key: 'email' },
];

/**
 * Import alias map: normalized header → target field key.
 * `scope` limits where the alias applies.
 */
type ImportAliasScope = 'storeRoot' | 'storeProfile' | 'tradeRoot';

const IMPORT_ALIASES: { aliases: string[]; target: string; scope: ImportAliasScope }[] = [
  { aliases: ['srno', 'slno'], target: 'slNo', scope: 'storeRoot' },
  { aliases: ['status'], target: 'status', scope: 'storeRoot' },
  { aliases: ['remarks'], target: 'remarks', scope: 'storeRoot' },
  { aliases: ['openingdate'], target: 'openingDate', scope: 'storeProfile' },
  { aliases: ['channel', 'type'], target: 'type', scope: 'storeRoot' },
  { aliases: ['billcode'], target: 'billCode', scope: 'storeProfile' },
  { aliases: ['retekcode'], target: 'retekCode', scope: 'storeProfile' },
  { aliases: ['sapcode'], target: 'sapCode', scope: 'storeProfile' },
  { aliases: ['brand'], target: 'brand', scope: 'storeProfile' },
  { aliases: ['subbrand', 'brandsub'], target: 'brandSub', scope: 'storeProfile' },
  { aliases: ['classification'], target: 'classification', scope: 'storeProfile' },
  { aliases: ['address', 'addess'], target: 'address', scope: 'storeProfile' },
  { aliases: ['city'], target: 'city', scope: 'storeProfile' },
  { aliases: ['pincode', 'zipcode'], target: 'pincode', scope: 'storeProfile' },
  { aliases: ['state'], target: 'state', scope: 'storeProfile' },
  { aliases: ['gstin', 'gst'], target: 'gst', scope: 'storeProfile' },
  { aliases: ['storelandline', 'storelandlineno'], target: 'storeLandlineNo', scope: 'storeProfile' },
  { aliases: ['storemanagername', 'smname'], target: 'smName', scope: 'storeProfile' },
  { aliases: ['storemanagercontact', 'smcontact'], target: 'smContact', scope: 'storeProfile' },
  { aliases: ['smnameandcontact'], target: 'smNameAndContact', scope: 'storeProfile' },
  { aliases: ['storeemail', 'storemailid', 'storemail'], target: 'storeMailId', scope: 'storeProfile' },
  { aliases: ['abmname'], target: 'abmName', scope: 'storeProfile' },
  { aliases: ['abmcontact'], target: 'abmContact', scope: 'storeProfile' },
  { aliases: ['abmnameandcontact'], target: 'abmNameAndContact', scope: 'storeProfile' },
  { aliases: ['abmemail', 'abmmailid', 'abmmail'], target: 'abmMailId', scope: 'storeProfile' },
  // Trade root
  { aliases: ['srno', 'slno'], target: 'slNo', scope: 'tradeRoot' },
  { aliases: ['status'], target: 'status', scope: 'tradeRoot' },
  { aliases: ['channel', 'type'], target: 'type', scope: 'tradeRoot' },
  { aliases: ['sapcode', 'parentkeycode'], target: 'parentKeyCode', scope: 'tradeRoot' },
  { aliases: ['partyname', 'retailername'], target: 'retailerName', scope: 'tradeRoot' },
  { aliases: ['address'], target: 'address', scope: 'tradeRoot' },
  { aliases: ['locality'], target: 'locality', scope: 'tradeRoot' },
  { aliases: ['city'], target: 'city', scope: 'tradeRoot' },
  { aliases: ['pincode', 'zipcode'], target: 'zipCode', scope: 'tradeRoot' },
  { aliases: ['state'], target: 'state', scope: 'tradeRoot' },
  { aliases: ['gstin'], target: 'gstin', scope: 'tradeRoot' },
  { aliases: ['contactperson'], target: 'contactPerson', scope: 'tradeRoot' },
  { aliases: ['contactnumber', 'mobilephone'], target: 'mobilePhone', scope: 'tradeRoot' },
  { aliases: ['contactnumber1', 'phone1', 'mobilephone1'], target: 'phone1', scope: 'tradeRoot' },
  { aliases: ['email', 'e-mail'], target: 'email', scope: 'tradeRoot' },
  { aliases: ['remarks'], target: 'remarks', scope: 'tradeRoot' },
];

const aliasLookupCache = new Map<ImportAliasScope, Map<string, string>>();

/**
 * Resolve a normalized import header to an API field key for the given scope.
 */
export function resolveWarehouseClientImportKey(
  normalizedHeader: string,
  scope: ImportAliasScope,
): string | null {
  if (!aliasLookupCache.has(scope)) {
    const map = new Map<string, string>();
    IMPORT_ALIASES.filter((a) => a.scope === scope).forEach(({ aliases, target }) => {
      aliases.forEach((alias) => map.set(alias, target));
    });
    aliasLookupCache.set(scope, map);
  }
  return aliasLookupCache.get(scope)!.get(normalizedHeader) ?? null;
}

/**
 * Parse legacy combined name/contact into split fields.
 */
export function parseLegacyNameContact(combined?: string | null): { name: string; contact: string } {
  const raw = String(combined ?? '').trim();
  if (!raw) return { name: '', contact: '' };
  const slash = raw.split(/\s*\/\s*/);
  if (slash.length >= 2) {
    return { name: slash[0].trim(), contact: slash.slice(1).join(' / ').trim() };
  }
  const comma = raw.split(/\s*,\s*/);
  if (comma.length >= 2) {
    return { name: comma[0].trim(), contact: comma.slice(1).join(', ').trim() };
  }
  return { name: raw, contact: '' };
}

/**
 * Build combined legacy field from split name + contact.
 */
export function buildCombinedNameContact(name?: string | null, contact?: string | null): string {
  const n = String(name ?? '').trim();
  const c = String(contact ?? '').trim();
  if (n && c) return `${n} / ${c}`;
  return n || c;
}

/**
 * Sync split SM/ABM fields into legacy combined fields on a store profile payload.
 */
export function syncStoreProfileCombinedFields(
  profile: WarehouseClientStoreProfile,
): WarehouseClientStoreProfile {
  const out = { ...profile };
  const sm = buildCombinedNameContact(out.smName, out.smContact);
  if (sm) out.smNameAndContact = sm;
  const abm = buildCombinedNameContact(out.abmName, out.abmContact);
  if (abm) out.abmNameAndContact = abm;
  return out;
}

/**
 * Expand legacy combined fields into split fields when split is empty.
 */
export function expandStoreProfileSplitFields(
  profile: WarehouseClientStoreProfile,
): WarehouseClientStoreProfile {
  const out = { ...profile };
  if (!out.smName?.trim() && !out.smContact?.trim() && out.smNameAndContact?.trim()) {
    const parsed = parseLegacyNameContact(out.smNameAndContact);
    out.smName = parsed.name;
    out.smContact = parsed.contact;
  }
  if (!out.abmName?.trim() && !out.abmContact?.trim() && out.abmNameAndContact?.trim()) {
    const parsed = parseLegacyNameContact(out.abmNameAndContact);
    out.abmName = parsed.name;
    out.abmContact = parsed.contact;
  }
  return out;
}
