/**
 * WHMS API client — calls your existing Node.js WHMS endpoints.
 * Base path: /v1/whms (uses API_BASE_URL from app config).
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
  const url = path.startsWith('http') ? path : `${WHMS_BASE}${path}`;
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

// --- Types (align with your API) ---
export interface WhmsPaginated<T> {
  results: T[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

// --- 1. Orders ---
export interface WhmsOrderItem {
  sku: string;
  name: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
  productId?: string;
  stockAvailable?: boolean | null;
  stockQuantity?: number | null;
  image?: string;
}

export interface WhmsOrder {
  id: string;
  orderNumber: string;
  date: string;
  status: string;
  channel: string;
  customer: { name: string; phone?: string; email?: string; address?: Record<string, string> };
  items: WhmsOrderItem[];
  packingInstructions?: Record<string, unknown>;
  dispatchMode?: string;
  totalValue?: number;
  totalQuantity?: number;
  priority?: string;
  estimatedDispatchDate?: string | null;
  actualDispatchDate?: string | null;
  stockBlockStatus?: string | null;
  lifecycleStatus?: string | null;
  tracking?: {
    courierName: string;
    trackingNumber: string;
    dispatchDate: string;
    vehicleAwb: string;
    remarks: string;
  } | null;
  source?: string | null;
  payment?: Record<string, unknown> | null;
  logistics?: Record<string, unknown> | null;
  meta?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface WhmsOrderCreateBody {
  orderNumber?: string;
  channel?: string;
  customer: { name: string; phone?: string; email?: string; address?: Record<string, string> };
  items: Array<{ sku: string; name: string; quantity: number; unitPrice?: number; totalPrice?: number; productId?: string }>;
  packingInstructions?: Record<string, unknown>;
  dispatchMode?: string;
  totalValue?: number;
  totalQuantity?: number;
  priority?: string;
  estimatedDispatchDate?: string;
}

export interface WhmsTrackingBody {
  courierName?: string;
  trackingNumber?: string;
  dispatchDate?: string;
  vehicleAwb?: string;
  remarks?: string;
}

export const whmsOrders = {
  list: (params?: Record<string, string | number | undefined>) =>
    request<WhmsPaginated<WhmsOrder>>(`/orders${qs(params || {})}`),
  get: (orderId: string) => request<WhmsOrder>(`/orders/${orderId}`),
  create: (body: WhmsOrderCreateBody) =>
    request<WhmsOrder>('/orders', { method: 'POST', body: JSON.stringify(body) }),
  update: (orderId: string, body: Partial<WhmsOrderCreateBody>) =>
    request<WhmsOrder>(`/orders/${orderId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (orderId: string) =>
    request<void>(`/orders/${orderId}`, { method: 'DELETE' }),
  saveTracking: (orderId: string, body: WhmsTrackingBody) =>
    request<WhmsOrder>(`/orders/${orderId}/tracking`, { method: 'POST', body: JSON.stringify(body) }),
};

// --- 2. Inward (GRN) ---
export interface WhmsInwardItem {
  _id?: string;
  sku: string;
  name?: string;
  productId?: string;
  orderedQty: number;
  receivedQty?: number;
  acceptedQty?: number;
  rejectedQty?: number;
  unit?: string;
}

export interface WhmsInwardRecord {
  id: string;
  grnNumber: string;
  reference?: string;
  date: string;
  supplier?: string;
  status: string;
  items: WhmsInwardItem[];
  totalItems?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const whmsInward = {
  list: (params?: Record<string, string | number | undefined>) =>
    request<WhmsPaginated<WhmsInwardRecord>>(`/inward${qs(params || {})}`),
  get: (id: string) => request<WhmsInwardRecord>(`/inward/${id}`),
  create: (body: Partial<WhmsInwardRecord> & { items: WhmsInwardItem[] }) =>
    request<WhmsInwardRecord>('/inward', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<WhmsInwardRecord>) =>
    request<WhmsInwardRecord>(`/inward/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
};

// --- 2b. Inward receive (production → WHMS line rows, Bearer + getOrders) ---
export const InwardReceiveStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  ON_HOLD: 'onhold',
} as const;

export type InwardReceiveStatus = (typeof InwardReceiveStatus)[keyof typeof InwardReceiveStatus];

export interface WhmsInwardReceivePopulatedArticle {
  id?: string;
  _id?: string;
  articleNumber?: string;
  status?: string;
  plannedQuantity?: number;
}

export interface WhmsInwardReceivePopulatedOrder {
  id?: string;
  _id?: string;
  orderNumber?: string;
  status?: string;
  currentFloor?: string;
  priority?: string;
}

/** One row from GET /whms/inward-receive */
export interface WhmsInwardReceiveRow {
  id: string;
  articleId: WhmsInwardReceivePopulatedArticle | string;
  orderId: WhmsInwardReceivePopulatedOrder | string;
  articleNumber: string;
  QuantityFromFactory: number;
  receivedQuantity: number;
  styleCode: string;
  brand: string;
  status: InwardReceiveStatus | string;
  orderData?: Record<string, unknown>;
  receivedAt: string;
  receivedInContainerId?: string | null;
  warehouseReceivedLineId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type WhmsInwardReceivePatchBody = {
  receivedQuantity?: number;
  status?: InwardReceiveStatus;
};

export const whmsInwardReceive = {
  list: (params?: Record<string, string | number | undefined>) =>
    request<WhmsPaginated<WhmsInwardReceiveRow>>(`/inward-receive${qs(params || {})}`),
  get: (id: string) => request<WhmsInwardReceiveRow>(`/inward-receive/${id}`),
  patch: (id: string, body: WhmsInwardReceivePatchBody) =>
    request<WhmsInwardReceiveRow>(`/inward-receive/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
};

// --- 2c. Warehouse inventory (GET list/detail/logs; POST/PATCH/DELETE manageOrders) ---
export interface WhmsWarehouseInventoryProduct {
  id: string;
  name?: string;
  factoryCode?: string;
}

export interface WhmsWarehouseInventoryStyleMaster {
  id: string;
  styleCode?: string;
  eanCode?: string;
  mrp?: number;
  brand?: string;
  pack?: string;
  status?: string;
}

export interface WhmsWarehouseInventoryQuantities {
  total: number;
  blocked: number;
  available: number;
}

/** List row may omit logsSummary; detail includes it. */
export interface WhmsWarehouseInventoryDTO {
  id: string;
  product?: WhmsWarehouseInventoryProduct;
  styleCodeMaster?: WhmsWarehouseInventoryStyleMaster;
  styleCode?: string;
  itemData?: Record<string, unknown>;
  styleCodeData?: Record<string, unknown>;
  quantities?: WhmsWarehouseInventoryQuantities;
  logsSummary?: { total: number };
  createdAt?: string;
  updatedAt?: string;
}

export interface WhmsWarehouseInventoryLog {
  id: string;
  warehouseInventoryId: string;
  styleCodeId?: string;
  styleCode?: string;
  action?: string;
  message?: string;
  quantityDelta?: number;
  blockedDelta?: number;
  totalQuantityAfter?: number;
  blockedQuantityAfter?: number;
  availableQuantityAfter?: number;
  userId?: string | null;
  meta?: Record<string, unknown>;
  createdAt?: string;
}

export interface WhmsWarehouseInventoryCreateBody {
  itemId: string;
  styleCodeId: string;
  styleCode: string;
  itemData?: Record<string, unknown>;
  styleCodeData?: Record<string, unknown>;
  totalQuantity?: number;
  blockedQuantity?: number;
}

export interface WhmsWarehouseInventoryPatchBody {
  itemData?: Record<string, unknown>;
  styleCodeData?: Record<string, unknown>;
  totalQuantity?: number;
  blockedQuantity?: number;
  adjustReason?: string;
}

export const whmsWarehouseInventory = {
  list: (params?: Record<string, string | number | undefined>) =>
    request<WhmsPaginated<WhmsWarehouseInventoryDTO>>(`/warehouse-inventory${qs(params || {})}`),
  get: (inventoryId: string) => request<WhmsWarehouseInventoryDTO>(`/warehouse-inventory/${inventoryId}`),
  getByStyleCode: (styleCode: string) =>
    request<WhmsWarehouseInventoryDTO>(`/warehouse-inventory/by-style-code${qs({ styleCode })}`),
  logs: (inventoryId: string, params?: Record<string, string | number | undefined>) =>
    request<WhmsPaginated<WhmsWarehouseInventoryLog>>(`/warehouse-inventory/${inventoryId}/logs${qs(params || {})}`),
  create: (body: WhmsWarehouseInventoryCreateBody) =>
    request<WhmsWarehouseInventoryDTO>('/warehouse-inventory', { method: 'POST', body: JSON.stringify(body) }),
  update: (inventoryId: string, body: WhmsWarehouseInventoryPatchBody) =>
    request<WhmsWarehouseInventoryDTO>(`/warehouse-inventory/${inventoryId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  delete: (inventoryId: string) =>
    request<void>(`/warehouse-inventory/${inventoryId}`, { method: 'DELETE' }),
};

// --- 3. Approvals ---
export interface WhmsVarianceApproval {
  id: string;
  reference: string;
  type: 'order' | 'grn';
  variance: string;
  requestedBy: string;
  date: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WhmsDispatchApproval {
  id: string;
  orderId: string;
  channel: string;
  requestedBy: string;
  pendingApprover: 'sales' | 'accounts' | 'both';
  status: string;
  requestedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export const whmsApprovals = {
  variance: {
    list: (params?: Record<string, string | number | undefined>) =>
      request<WhmsPaginated<WhmsVarianceApproval>>(`/approvals/variance${qs(params || {})}`),
    create: (body: { reference: string; type: 'order' | 'grn'; variance?: string; requestedBy?: string }) =>
      request<WhmsVarianceApproval>('/approvals/variance', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: { status: 'approved' | 'rejected' }) =>
      request<WhmsVarianceApproval>(`/approvals/variance/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  },
  dispatch: {
    list: (params?: Record<string, string | number | undefined>) =>
      request<WhmsPaginated<WhmsDispatchApproval>>(`/approvals/dispatch${qs(params || {})}`),
    create: (body: { orderId: string; channel?: string; requestedBy?: string; pendingApprover?: 'sales' | 'accounts' | 'both' }) =>
      request<WhmsDispatchApproval>('/approvals/dispatch', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: { status: 'approved' | 'rejected' }) =>
      request<WhmsDispatchApproval>(`/approvals/dispatch/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  },
};

// --- 4. Consolidation ---
export interface WhmsConsolidationBatch {
  id: string;
  batchCode: string;
  orderIds: string[];
  orderCount?: number;
  totalItems?: number;
  status: 'draft' | 'ready' | 'dispatched';
  createdAt?: string;
  updatedAt?: string;
}

export const whmsConsolidation = {
  list: (params?: Record<string, string | number | undefined>) =>
    request<WhmsPaginated<WhmsConsolidationBatch>>(`/consolidation${qs(params || {})}`),
  get: (id: string) => request<WhmsConsolidationBatch>(`/consolidation/${id}`),
  create: (body: { batchCode?: string; orderIds: string[] }) =>
    request<WhmsConsolidationBatch>('/consolidation', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: { orderIds?: string[]; status?: string }) =>
    request<WhmsConsolidationBatch>(`/consolidation/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  setStatus: (id: string, status: 'ready' | 'dispatched') =>
    request<WhmsConsolidationBatch>(`/consolidation/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};

// --- 5. Gap report ---
export interface WhmsGapReportRow {
  styleCode: string;
  itemName: string;
  currentStock: number;
  ordersQty: number;
  requiredQty: number;
  shortage: number;
  factoryDispatchDate: string | null;
}

export const whmsGapReport = {
  get: (params?: Record<string, string>) =>
    request<WhmsGapReportRow[]>(`/gap-report${qs(params || {})}`),
  sendRequirement: (body: { styleCode: string; itemName?: string; shortage: number; requestedQty?: number } | Array<{ styleCode: string; itemName?: string; shortage: number; requestedQty?: number }>) =>
    request<unknown>('/gap-report/send-requirement', { method: 'POST', body: JSON.stringify(body) }),
};

// --- 6. Pick List (dedicated /pick-list endpoints) ---
export interface WhmsPickListEntryOrder {
  id: string;
  status?: string;
  clientType?: string;
  clientId?: string;
  date?: string;
  orderNumber?: string;
  clientName?: string;
  styleCodeSinglePair?: Array<{
    styleCodeId?: string;
    styleCode?: string;
    pack?: string;
    colour?: string;
    type?: string;
    pattern?: string;
    quantity?: number;
  }>;
  styleCodeMultiPair?: unknown[];
}

export interface WhmsPickListEntry {
  id: string;
  _id?: string;
  orderId?: string | WhmsPickListEntryOrder;
  orderNumber?: string;
  skuCode?: string;
  styleCode?: string;
  steCodeNew?: string;
  name?: string;
  description?: string;
  pickupQuantity?: number;
  requiredQuantity?: number;
  quantity?: number;
  size?: string;
  shade?: string;
  nih?: number;
  asst?: string;
  sapStock?: number;
  status?: string;
  rackLocation?: WhmsRackLocation;
  zone?: string;
  row?: string;
  column?: string;
  bin?: string;
  unit?: string;
  batchId?: string;
  pathIndex?: number;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WhmsPickListEntryPatchBody {
  pickupQuantity?: number;
  steCodeNew?: string;
  nih?: number;
  asst?: string;
  sapStock?: number;
  status?: string;
}

export interface WhmsPickListOrderWiseItem {
  id: string;
  skuCode: string;
  styleCode: string;
  shade: string;
  size: string;
  quantity: number;
  pickupQuantity: number;
  status: string;
}

export interface WhmsPickListOrderGroup {
  orderId: string;
  orderNumber: string;
  order?: Record<string, unknown>;
  items: WhmsPickListOrderWiseItem[];
  totalQuantity: number;
  totalPickupQuantity: number;
  totalItems: number;
  pendingCount: number;
  partialCount: number;
  pickedCount: number;
  overallStatus: string;
}

export interface WhmsPickListOrderWiseSummary {
  total: number;
  pending: number;
  partial: number;
  picked: number;
}

export interface WhmsPickListOrderWiseResponse {
  results: WhmsPickListOrderGroup[];
  summary: WhmsPickListOrderWiseSummary;
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export const whmsPickListApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    request<WhmsPaginated<WhmsPickListEntry>>(`/pick-list${qs(params || {})}`),
  orderWise: (params?: Record<string, string | number | undefined>) =>
    request<WhmsPickListOrderWiseResponse>(`/pick-list/order-wise${qs(params || {})}`),
  getByOrder: (orderId: string) =>
    request<WhmsPickListEntry[]>(`/pick-list/order/${encodeURIComponent(orderId)}`),
  deleteByOrder: (orderId: string) =>
    request<void>(`/pick-list/order/${encodeURIComponent(orderId)}`, { method: 'DELETE' }),
  get: (pickListId: string) =>
    request<WhmsPickListEntry>(`/pick-list/${pickListId}`),
  update: (pickListId: string, body: WhmsPickListEntryPatchBody) =>
    request<WhmsPickListEntry>(`/pick-list/${pickListId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (pickListId: string) =>
    request<void>(`/pick-list/${pickListId}`, { method: 'DELETE' }),
};

// --- 7. Pick & Pack ---
export interface WhmsRackLocation {
  zone: string;
  row: string;
  column: string;
  bin: string;
}

export interface WhmsPickItem {
  id: string;
  sku: string;
  name: string;
  imageUrl?: string;
  pathIndex: number;
  rackLocation: WhmsRackLocation;
  requiredQty: number;
  pickedQty: number;
  unit: string;
  status: string;
  linkedOrderIds: string[];
  batchId?: string;
}

export interface WhmsPickList {
  id: string;
  pickBatchId: string;
  status: string;
  items: WhmsPickItem[];
  assignedTo?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface WhmsPackItem {
  id: string;
  sku: string;
  name: string;
  pickedQty: number;
  packedQty: number;
  status: string;
  itemBarcode?: string;
}

export interface WhmsPackOrder {
  orderId: string;
  orderNumber: string;
  customerName: string;
  status: string;
  priority: string;
  items: WhmsPackItem[];
}

export interface WhmsPackCarton {
  id: string;
  cartonBarcode?: string;
  createdAt: string;
}

export interface WhmsPackBatch {
  id: string;
  orderIds: string[];
  status: string;
  orders: WhmsPackOrder[];
  cartons: WhmsPackCarton[];
  createdAt: string;
}

export const whmsPickPack = {
  pickList: {
    get: (params?: { batchId?: string }) =>
      request<WhmsPickList>(`/pick-pack/pick-list${qs(params || {})}`),
    generate: (body: { orderIds: string[]; batchId?: string }) =>
      request<WhmsPickList>('/pick-pack/pick-list', { method: 'POST', body: JSON.stringify(body) }),
    updateItem: (listId: string, itemId: string, body: { pickedQty?: number; status?: string }) =>
      request<WhmsPickList>(`/pick-pack/pick-list/${listId}/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    confirmPick: (body: { itemId: string; pickedQty?: number }) =>
      request<WhmsPickList>('/pick-pack/pick-list/confirm-pick', { method: 'PATCH', body: JSON.stringify(body) }),
    skip: (body: { itemId: string }) =>
      request<WhmsPickList>('/pick-pack/pick-list/skip', { method: 'POST', body: JSON.stringify(body) }),
    scan: (body: { skuOrBarcode: string; rackLocation?: WhmsRackLocation }) =>
      request<{ match: boolean; item?: WhmsPickItem; message?: string }>('/pick-pack/scan/pick', { method: 'POST', body: JSON.stringify(body) }),
  },
  packList: {
    get: (params?: { batchId?: string }) =>
      request<{ batches: WhmsPackBatch[] } | WhmsPackBatch>(`/pick-pack/pack-list${qs(params || {})}`),
    createBatch: (body: { orderIds: string[] }) =>
      request<WhmsPackBatch>('/pick-pack/pack-list/batches', { method: 'POST', body: JSON.stringify(body) }),
    getBatch: (batchId: string) =>
      request<WhmsPackBatch>(`/pick-pack/pack-list/batches/${batchId}`),
    updatePackedQty: (batchId: string, orderId: string, itemId: string, body: { packedQty: number }) =>
      request<WhmsPackBatch>(`/pick-pack/pack-list/batches/${batchId}/orders/${orderId}/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    addCarton: (batchId: string) =>
      request<WhmsPackBatch>(`/pick-pack/pack-list/batches/${batchId}/cartons`, { method: 'POST' }),
    updateCarton: (batchId: string, cartonId: string, body: { cartonBarcode?: string }) =>
      request<WhmsPackBatch>(`/pick-pack/pack-list/batches/${batchId}/cartons/${cartonId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    completeBatch: (batchId: string) =>
      request<WhmsPackBatch>(`/pick-pack/pack-list/batches/${batchId}/complete`, { method: 'POST' }),
  },
  barcode: {
    generate: (body: { batchId: string; orderId?: string; itemIds?: string[]; types?: string[]; quantity?: number }) =>
      request<{ generated: Array<{ type: string; id: string; barcode: string }> }>('/pick-pack/barcode/generate', { method: 'POST', body: JSON.stringify(body) }),
  },
  reports: {
    damageMissing: {
      create: (body: { orderId: string; orderNumber?: string; sku: string; itemName?: string; type: 'damage' | 'missing'; quantity: number; reason?: string; notes?: string }) =>
        request<unknown>('/pick-pack/reports/damage-missing', { method: 'POST', body: JSON.stringify(body) }),
      list: (params?: Record<string, string | number>) =>
        request<WhmsPaginated<unknown>>(`/pick-pack/reports/damage-missing${qs(params || {})}`),
    },
  },
  scan: {
    pack: (body: { barcode: string; batchId: string; orderId?: string }) =>
      request<{ match: boolean; item?: WhmsPackItem }>('/pick-pack/scan/pack', { method: 'POST', body: JSON.stringify(body) }),
  },
};

export default {
  orders: whmsOrders,
  inward: whmsInward,
  inwardReceive: whmsInwardReceive,
  warehouseInventory: whmsWarehouseInventory,
  approvals: whmsApprovals,
  consolidation: whmsConsolidation,
  gapReport: whmsGapReport,
  pickPack: whmsPickPack,
  pickList: whmsPickListApi,
};
