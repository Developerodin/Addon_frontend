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
    throw new Error(parseWhmsApiErrorMessage(err, res.status));
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

/** Granular fulfilment pipeline stages (API values, kebab-case). */
export const WAREHOUSE_ORDER_FLOW_STATUSES = [
  'order-created',
  'picking',
  'picking-done',
  'barcode-in-progress',
  'packing-done',
  'sent-to-scanning',
  'scanning-in-progress',
  'scanning-done',
  'sent-to-billing',
  'billed',
  'ready-to-dispatch',
  'dispatched',
  'partial-dispatched',
  'ready-for-pickup',
  'delivered',
  'cancelled',
] as const;

export type WarehouseOrderFlowStatus = (typeof WAREHOUSE_ORDER_FLOW_STATUSES)[number];

export const WAREHOUSE_ORDER_FLOW_STATUS_LABELS: Record<WarehouseOrderFlowStatus, string> = {
  'order-created': 'Order Created',
  picking: 'Picking',
  'picking-done': 'Picking Done',
  'barcode-in-progress': 'Barcode & Qty Update',
  'packing-done': 'Packing Done',
  'sent-to-scanning': 'Sent to Scanning',
  'scanning-in-progress': 'Scanning In Progress',
  'scanning-done': 'Scanning Done',
  'sent-to-billing': 'Sent to Billing',
  billed: 'Billed',
  'ready-to-dispatch': 'Ready to Dispatch',
  dispatched: 'Dispatched',
  'partial-dispatched': 'Partial Dispatch',
  'ready-for-pickup': 'Ready for Pickup',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export function warehouseOrderFlowStatusLabel(raw?: string | null): string {
  const v = String(raw ?? '').trim().toLowerCase();
  if ((WAREHOUSE_ORDER_FLOW_STATUSES as readonly string[]).includes(v)) {
    return WAREHOUSE_ORDER_FLOW_STATUS_LABELS[v as WarehouseOrderFlowStatus];
  }
  return raw ? String(raw).trim() : WAREHOUSE_ORDER_FLOW_STATUS_LABELS['order-created'];
}

/**
 * Map legacy coarse warehouse order status to a flow stage (mirrors backend
 * `flowStatusForCoarseStatus` for pre-migration docs missing `flowStatus`).
 */
export function flowStatusFromCoarseStatus(raw?: string | null): WarehouseOrderFlowStatus {
  const v = String(raw ?? 'draft')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
  switch (v) {
    case 'draft':
      return 'order-created';
    case 'pending':
    case 'in-progress':
      return 'picking';
    case 'packed':
      return 'packing-done';
    case 'dispatched':
      return 'dispatched';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'order-created';
  }
}

/**
 * Resolve the effective flow stage from `flowStatus` or legacy coarse `status`.
 */
export function effectiveWarehouseOrderFlowStatus(
  order?: { flowStatus?: string | null; status?: string | null } | null,
): WarehouseOrderFlowStatus {
  const direct = String(order?.flowStatus ?? '')
    .trim()
    .toLowerCase();
  if ((WAREHOUSE_ORDER_FLOW_STATUSES as readonly string[]).includes(direct)) {
    return direct as WarehouseOrderFlowStatus;
  }
  return flowStatusFromCoarseStatus(order?.status);
}

/**
 * Extract a user-facing message from a WHMS API error response body.
 */
export function parseWhmsApiErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message.trim();
  }
  return `Request failed (${status})`;
}

export interface WarehouseOrderFlowHistoryEntry {
  from?: string;
  to: string;
  byUserId?: string | null;
  byName?: string;
  remarks?: string;
  at?: string;
}

export interface WarehouseOrderDispatchDetails {
  courierName?: string;
  trackingNumber?: string;
  vehicleDetails?: string;
  dispatchDate?: string;
  boxCount?: number;
  shippingRemarks?: string;
  dispatchType?: string;
  deliveredDate?: string;
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
  /** Optional external / customer reference (e.g. Addon order number). */
  addonOrderId?: string;
  clientType: WarehouseClientType;
  clientId: string;
  clientName?: string;
  date?: string;
  /** API value: kebab-case; may include legacy values normalized in UI. */
  status?: WarehouseOrderStatus | string;
  /** Granular pipeline stage; source of truth for the fulfilment flow. */
  flowStatus?: WarehouseOrderFlowStatus | string;
  flowHistory?: WarehouseOrderFlowHistoryEntry[];
  dispatch?: WarehouseOrderDispatchDetails;
  invoiceId?: string | null;
  styleCodeSinglePair?: WarehouseOrderStyleCodeSinglePairRow[];
  styleCodeMultiPair?: WarehouseOrderStyleCodeMultiPairRow[];
  meta?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export type CreateWarehouseOrderBody = {
  clientType: WarehouseClientType;
  clientId: string;
  /** Optional external / customer reference (e.g. Addon order number). */
  addonOrderId?: string;
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
  /** Prefix match filter (optional). */
  addonOrderId?: string;
  status?: WarehouseOrderStatus;
  flowStatus?: WarehouseOrderFlowStatus;
  flowStatusIn?: string;
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
  /** MongoDB client id — preferred when names collide. */
  clientId?: string;
  /** Fallback lookup when clientId is omitted; must be unique per type. */
  clientName: string;
  date: string;
  status: string;
  /** Optional external / customer reference (e.g. Addon order number). */
  addonOrderId?: string;
  styleCodeSinglePair?: BulkImportSinglePairItem[];
  styleCodeMultiPair?: BulkImportMultiPairItem[];
}

export interface BulkImportPayload {
  orders: BulkImportOrderRow[];
}

export interface BulkImportSummary {
  created: number;
  failed: number;
  errors: Array<{ row?: number; index?: number; reason?: string; error?: string; clientId?: string; clientName?: string }>;
  processingTime?: number;
}

/** Catalogue colour/pattern and row diagnostics resolved from styleCodeId. */
export interface CatalogueAttrsEntry {
  colour: string;
  pattern: string;
  styleCode?: string;
  styleCodeExists?: boolean;
  hasLinkedProduct?: boolean;
  availableStock?: number;
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
  /** Batch-resolve colour/pattern from product catalogue by styleCodeId. */
  getCatalogueAttrs: (styleCodeIds: string[]) => {
    const ids = styleCodeIds.map((id) => id.trim()).filter(Boolean);
    if (!ids.length) return Promise.resolve({} as Record<string, CatalogueAttrsEntry>);
    return request<{ attrs: Record<string, CatalogueAttrsEntry> }>(
      `/warehouse-orders/catalogue-attrs?styleCodeIds=${encodeURIComponent(ids.join(','))}`,
    ).then((res) => res.attrs ?? {});
  },
  transitionFlowStatus: (orderId: string, flowStatus: WarehouseOrderFlowStatus, remarks?: string) =>
    request<{ order: WarehouseOrder; allowedNext: WarehouseOrderFlowStatus[] }>(
      `/warehouse-orders/${orderId}/flow-status`,
      { method: 'PATCH', body: JSON.stringify({ flowStatus, ...(remarks ? { remarks } : {}) }) }
    ),
  getFlowHistory: (orderId: string) =>
    request<{
      orderId: string;
      orderNumber?: string;
      flowStatus: string;
      status?: string;
      history: WarehouseOrderFlowHistoryEntry[];
    }>(`/warehouse-orders/${orderId}/flow-history`),
};

