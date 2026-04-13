/**
 * WHMS warehouse orders API — GET/POST/PATCH/DELETE `/v1/whms/warehouse-orders`.
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

function qs(params: Record<string, unknown>): string {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (typeof v === 'string' && v.trim() === '') return;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      p.append(k, String(v));
      return;
    }
    // ignore non-primitive values (objects/arrays)
  });
  const s = p.toString();
  return s ? `?${s}` : '';
}

export type WarehouseClientType = 'Store' | 'Trade' | 'Departmental' | 'Ecom';

/** API stores lowercase / kebab-case. */
export const WAREHOUSE_ORDER_STATUSES = [
  'draft',
  'pending',
  'in-progress',
  'packed',
  'dispatched',
  'cancelled',
] as const;

export type WarehouseOrderStatus = (typeof WAREHOUSE_ORDER_STATUSES)[number];

export const WAREHOUSE_ORDER_STATUS_LABELS: Record<WarehouseOrderStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  'in-progress': 'In-Progress',
  packed: 'Packed',
  dispatched: 'Dispatched',
  cancelled: 'Cancelled',
};

/** Map API/legacy strings to a known status for forms and filters. */
export function normalizeWarehouseOrderStatus(raw?: string | null): WarehouseOrderStatus {
  const v = String(raw ?? 'draft')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
  if (v === 'submitted') return 'pending';
  const set = new Set<string>(WAREHOUSE_ORDER_STATUSES);
  if (set.has(v)) return v as WarehouseOrderStatus;
  return 'draft';
}

export function warehouseOrderStatusLabel(raw?: string | null): string {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
  if (v === 'submitted') return WAREHOUSE_ORDER_STATUS_LABELS.pending;
  const set = new Set<string>(WAREHOUSE_ORDER_STATUSES);
  if (set.has(v)) return WAREHOUSE_ORDER_STATUS_LABELS[v as WarehouseOrderStatus];
  if (v) return String(raw).trim();
  return WAREHOUSE_ORDER_STATUS_LABELS.draft;
}

export interface WarehouseOrderStyleCodeSinglePairRow {
  styleCodeId: string;
  styleCode?: string;
  pack?: string;
  colour?: string;
  type?: string;
  pattern?: string;
  quantity: number;
}

export interface WarehouseOrderStyleCodeMultiPairRow {
  styleCodeMultiPairId: string;
  styleCode?: string;
  pack?: string;
  colour?: string;
  type?: string;
  pattern?: string;
  quantity: number;
}

export interface WarehouseOrder {
  id: string;
  orderNumber?: string;
  clientType: WarehouseClientType;
  clientId: string;
  clientName?: string;
  date?: string;
  /** API value: kebab-case; may include legacy values normalized in UI. */
  status?: WarehouseOrderStatus | string;
  styleCodeSinglePair?: WarehouseOrderStyleCodeSinglePairRow[];
  styleCodeMultiPair?: WarehouseOrderStyleCodeMultiPairRow[];
  meta?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export type CreateWarehouseOrderBody = {
  clientType: WarehouseClientType;
  clientId: string;
  date?: string;
  styleCodeSinglePair?: WarehouseOrderStyleCodeSinglePairRow[];
  styleCodeMultiPair?: WarehouseOrderStyleCodeMultiPairRow[];
  status?: WarehouseOrderStatus;
  meta?: Record<string, unknown>;
};

export type UpdateWarehouseOrderBody = Partial<
  Omit<CreateWarehouseOrderBody, 'clientType' | 'clientId'>
> & {
  status?: WarehouseOrderStatus;
};

export interface PaginatedWarehouseOrders {
  results: WarehouseOrder[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export type WarehouseOrdersListParams = {
  q?: string;
  orderNumber?: string;
  status?: WarehouseOrderStatus;
  clientType?: WarehouseClientType;
  clientId?: string;
  styleCodeId?: string;
  styleCodeMultiPairId?: string;
  dateFrom?: string;
  dateTo?: string;
  createdFrom?: string;
  createdTo?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
};

export interface BulkImportSinglePairItem {
  styleCode: string;
  colour: string;
  pattern: string;
  quantity: number;
}

export interface BulkImportMultiPairItem {
  styleCode: string;
  type: string;
  colour: string;
  pattern: string;
  quantity: number;
}

export interface BulkImportOrderRow {
  clientType: string;
  clientName: string;
  date: string;
  status: string;
  styleCodeSinglePair?: BulkImportSinglePairItem[];
  styleCodeMultiPair?: BulkImportMultiPairItem[];
}

export interface BulkImportPayload {
  orders: BulkImportOrderRow[];
}

export interface BulkImportSummary {
  created: number;
  failed: number;
  errors: Array<{ row?: number; reason: string }>;
  processingTime?: number;
}

export const whmsWarehouseOrders = {
  list: (params: WarehouseOrdersListParams = {}) =>
    request<PaginatedWarehouseOrders>(`/warehouse-orders${qs(params as Record<string, unknown>)}`),
  get: (orderId: string) => request<WarehouseOrder>(`/warehouse-orders/${orderId}`),
  create: (body: CreateWarehouseOrderBody) =>
    request<WarehouseOrder>('/warehouse-orders', { method: 'POST', body: JSON.stringify(body) }),
  update: (orderId: string, body: UpdateWarehouseOrderBody) =>
    request<WarehouseOrder>(`/warehouse-orders/${orderId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (orderId: string) => request<void>(`/warehouse-orders/${orderId}`, { method: 'DELETE' }),
  bulkImport: (payload: BulkImportPayload) =>
    request<BulkImportSummary>('/warehouse-orders/bulk-import', { method: 'POST', body: JSON.stringify(payload) }),
};

