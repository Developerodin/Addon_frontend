import type {
  CreateWarehouseClientBody,
  UpdateWarehouseClientBody,
  WarehouseClient,
  WarehouseClientStoreProfile,
  WarehouseClientType,
} from '@/shared/services/whmsWarehouseClientService';

/** Drop empty strings / null / undefined so PATCH/POST payloads stay clean. */
function pruneRoot(
  data: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  keys.forEach((k) => {
    const v = data[k];
    if (v === undefined || v === null) return;
    if (typeof v === 'string' && v.trim() === '') return;
    out[k] = typeof v === 'string' ? v.trim() : v;
  });
  return out;
}

function pruneStoreProfile(sp: WarehouseClientStoreProfile): WarehouseClientStoreProfile {
  const out: WarehouseClientStoreProfile = {};
  (Object.entries(sp) as [keyof WarehouseClientStoreProfile, string | null | undefined][]).forEach(
    ([k, v]) => {
      if (v === undefined || v === null) return;
      if (typeof v === 'string' && v.trim() === '') return;
      (out as Record<string, unknown>)[k] = typeof v === 'string' ? v.trim() : v;
    },
  );
  return out;
}

const ROOT_KEYS: (keyof WarehouseClient)[] = [
  'distributorName',
  'parentKeyCode',
  'retailerName',
  'type',
  'contactPerson',
  'mobilePhone',
  'address',
  'locality',
  'city',
  'zipCode',
  'state',
  'gstin',
  'email',
  'phone1',
  'rsm',
  'asm',
  'se',
  'dso',
  'outlet',
  'status',
  'remarks',
];

function attachSlNo(pruned: Record<string, unknown>, root: Record<string, unknown>) {
  const raw = root.slNo;
  if (raw === undefined || raw === null || raw === '') return;
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isNaN(n)) pruned.slNo = n;
}

export function buildCreatePayload(
  type: WarehouseClientType,
  root: Record<string, unknown>,
  storeProfile: WarehouseClientStoreProfile,
): CreateWarehouseClientBody {
  const pruned = pruneRoot(root, ROOT_KEYS as string[]);
  attachSlNo(pruned, root);
  pruned.type = type;
  if (type === 'Store') {
    const sp = pruneStoreProfile(storeProfile);
    if (Object.keys(sp).length > 0) {
      (pruned as CreateWarehouseClientBody).storeProfile = sp;
    }
  }
  return pruned as CreateWarehouseClientBody;
}

export function buildUpdatePayload(
  type: WarehouseClientType,
  root: Record<string, unknown>,
  storeProfile: WarehouseClientStoreProfile,
): UpdateWarehouseClientBody {
  const pruned = pruneRoot(root, ROOT_KEYS.filter((k) => k !== 'type') as string[]);
  attachSlNo(pruned, root);
  pruned.type = type;
  if (type === 'Store') {
    const sp = pruneStoreProfile(storeProfile);
    if (Object.keys(sp).length > 0) {
      (pruned as UpdateWarehouseClientBody).storeProfile = sp;
    }
  }
  return pruned as UpdateWarehouseClientBody;
}

export function clientToFormState(client: WarehouseClient): {
  root: Record<string, unknown>;
  storeProfile: WarehouseClientStoreProfile;
} {
  const root: Record<string, unknown> = {};
  ROOT_KEYS.forEach((k) => {
    if (k === 'type') {
      root.type = client.type;
      return;
    }
    const v = client[k as keyof WarehouseClient];
    root[k as string] = v ?? '';
  });
  root.slNo = client.slNo != null ? String(client.slNo) : '';
  return {
    root,
    storeProfile: { ...(client.storeProfile || {}) },
  };
}

export const WAREHOUSE_CLIENT_TYPES: WarehouseClientType[] = ['Store', 'Trade', 'Departmental', 'Ecom'];
