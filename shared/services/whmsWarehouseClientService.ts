/**
 * WHMS warehouse clients API — GET/POST/PATCH/DELETE `/v1/whms/warehouse-clients`.
 */
import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

const WHMS_BASE = `${API_BASE_URL}/whms`;

function getAccessToken(): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const t = Cookies.get('accessToken');
    if (t) return t;
    return localStorage.getItem('token');
  } catch {
    return null;
  }
}

function getHeaders(): HeadersInit {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${WHMS_BASE}${path}`;
  const token = getAccessToken();
  if (!token) throw new Error('No access token found. Please login again.');
  const res = await fetch(url, {
    ...options,
    headers: getHeaders(),
  });
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || `Request failed: ${res.status}`);
  }
  return res.json();
}

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.append(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : '';
}

export type WarehouseClientType = 'Store' | 'Trade' | 'Departmental' | 'Ecom';

export interface WarehouseClientStoreProfile {
  billCode?: string;
  sapCode?: string;
  retekCode?: string;
  classification?: string;
  city?: string;
  state?: string;
  brand?: string;
  brandSub?: string;
  openingDate?: string | null;
  address?: string;
  gst?: string;
  storeLandlineNo?: string;
  smNameAndContact?: string;
  storeMailId?: string;
}

export interface WarehouseClient {
  id: string;
  slNo?: number | null;
  distributorName?: string;
  parentKeyCode?: string;
  retailerName?: string;
  type: WarehouseClientType;
  contactPerson?: string;
  mobilePhone?: string;
  address?: string;
  locality?: string;
  city?: string;
  zipCode?: string;
  state?: string;
  gstin?: string;
  email?: string;
  phone1?: string;
  rsm?: string;
  asm?: string;
  se?: string;
  dso?: string;
  outlet?: string;
  status?: 'active' | 'inactive';
  remarks?: string;
  storeProfile?: WarehouseClientStoreProfile;
  createdAt?: string;
  updatedAt?: string;
}

export type CreateWarehouseClientBody = Partial<Omit<WarehouseClient, 'id' | 'createdAt' | 'updatedAt'>> & {
  type: WarehouseClientType;
};

/** POST `/warehouse-clients/bulk-import` — same item shapes as single create. */
export type WarehouseClientsBulkImportBody = {
  items: CreateWarehouseClientBody[];
};

export type UpdateWarehouseClientBody = Partial<Omit<WarehouseClient, 'id' | 'createdAt' | 'updatedAt'>>;

export interface PaginatedWarehouseClients {
  results: WarehouseClient[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export const whmsWarehouseClients = {
  list: (params?: Record<string, string | number | undefined>) =>
    request<PaginatedWarehouseClients>(`/warehouse-clients${qs(params || {})}`),
  /** GET /whms/warehouse-clients/by-type/:type — e.g. by-type/Store?search=&city=&page=&limit= */
  listByType: (type: WarehouseClientType, params?: Record<string, string | number | undefined>) =>
    request<PaginatedWarehouseClients>(
      `/warehouse-clients/by-type/${encodeURIComponent(type)}${qs(params || {})}`,
    ),
  get: (clientId: string) => request<WarehouseClient>(`/warehouse-clients/${clientId}`),
  create: (body: CreateWarehouseClientBody) =>
    request<WarehouseClient>('/warehouse-clients', { method: 'POST', body: JSON.stringify(body) }),
  update: (clientId: string, body: UpdateWarehouseClientBody) =>
    request<WarehouseClient>(`/warehouse-clients/${clientId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (clientId: string) =>
    request<void>(`/warehouse-clients/${clientId}`, { method: 'DELETE' }),
  bulkImport: (body: WarehouseClientsBulkImportBody) =>
    request<unknown>('/warehouse-clients/bulk-import', { method: 'POST', body: JSON.stringify(body) }),
};
