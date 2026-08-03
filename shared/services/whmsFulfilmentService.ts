/**
 * WHMS fulfilment-flow APIs — scanning sessions, invoices, dispatch, returns,
 * pick-list print/variance and barcode label payloads.
 * Backend routes live under `/v1/whms/{scanning,invoices,returns,pick-list,warehouse-orders}`.
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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new Error('No access token found. Please login again.');
  const res = await fetch(`${WHMS_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
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
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') p.append(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : '';
}

interface Paginated<T> {
  results: T[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

// ─── Pick list: print / variance / barcode labels ──────────────────────────────

export interface PickListPrintPayload {
  order: {
    id: string;
    orderNumber?: string;
    addonOrderId?: string;
    date?: string;
    clientType?: string;
    clientName?: string;
    flowStatus?: string;
    pickerName?: string;
  };
  items: Array<{
    srNo: number;
    skuCode: string;
    styleCode: string;
    size: string;
    shade: string;
    quantity: number;
    pickupQuantity: number;
    availableStock?: number;
    status: string;
  }>;
  totals: { totalItems: number; totalQuantity: number; totalPickupQuantity: number };
  generatedAt: string;
}

export interface PickVarianceItem {
  id: string;
  skuCode: string;
  styleCode: string;
  size: string;
  shade: string;
  quantity: number;
  pickupQuantity: number;
  variance: number;
  varianceType: 'ok' | 'short' | 'excess';
  status: string;
}

export interface PickVarianceReport {
  orderId: string;
  orderNumber?: string;
  clientName?: string;
  flowStatus?: string;
  items: PickVarianceItem[];
  summary: {
    totalItems: number;
    okCount: number;
    shortCount: number;
    excessCount: number;
    totalQuantity: number;
    totalPickupQuantity: number;
  };
}

export interface BarcodeLabelsPayload {
  orderId: string;
  orderNumber?: string;
  clientName?: string;
  flowStatus?: string;
  labels: Array<{
    pickListId: string;
    barcode: string;
    skuCode: string;
    styleCode: string;
    size: string;
    shade: string;
    quantity: number;
  }>;
  totalLabels: number;
}

// ─── Scanning ───────────────────────────────────────────────────────────────

export type ScanItemStatus = 'pending' | 'short' | 'matched' | 'excess';

export type ScanItemKind = 'singlePair' | 'multiPair';

export interface ScanSessionItem {
  id?: string;
  _id?: string;
  pickListId?: string;
  skuCode?: string;
  styleCode: string;
  eanCode?: string;
  size?: string;
  shade?: string;
  itemKind?: ScanItemKind;
  pairStyleCode?: string;
  expectedQty: number;
  scannedQty: number;
  status: ScanItemStatus;
}

export interface ScanSessionSummary {
  totalItems: number;
  matched: number;
  short: number;
  excess: number;
  pending: number;
  totalExpected: number;
  totalScanned: number;
}

export interface ScanSession {
  id: string;
  orderId: string | { id?: string; orderNumber?: string };
  orderNumber?: string;
  addonOrderId?: string;
  batchId?: string | null;
  status: 'open' | 'completed' | 'cancelled';
  items: ScanSessionItem[];
  summary: ScanSessionSummary;
  startedByName?: string;
  completedByName?: string;
  completedAt?: string;
  mismatchOverride?: boolean;
  overrideRemarks?: string;
  closedWithShortQty?: boolean;
  shortCloseRemarks?: string;
  createdAt?: string;
}

// ─── Invoices ───────────────────────────────────────────────────────────────

export interface WhmsInvoiceItem {
  id?: string;
  styleCode: string;
  skuCode?: string;
  size?: string;
  shade?: string;
  quantity: number;
  rate?: number;
  amount?: number;
}

export interface WhmsInvoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  orderNumber?: string;
  addonOrderId?: string;
  clientType?: string;
  clientName?: string;
  items: WhmsInvoiceItem[];
  totalQuantity: number;
  totalAmount: number;
  status: 'draft' | 'final' | 'cancelled';
  remarks?: string;
  createdByName?: string;
  createdAt?: string;
  cancelReason?: string;
}

// ─── Returns ────────────────────────────────────────────────────────────────

export type WarehouseReturnType = 'rto' | 'rtv';
export type WarehouseReturnStatus = 'scanning' | 'pending-approval' | 'approved' | 'rejected';
export type ReturnReason = 'damage' | 'wrong-item' | 'size-issue' | 'delivery-issue' | 'courier-rto' | 'other';
export type ReturnItemCondition = 'saleable' | 'damaged' | 'repair' | '';
export type ReturnItemDecision = 'restock' | 'damaged-stock' | 'repair' | 'reject' | '';

export interface WarehouseReturnItem {
  id?: string;
  _id?: string;
  styleCode: string;
  skuCode?: string;
  size?: string;
  shade?: string;
  invoiceQty: number;
  scannedQty: number;
  verifiedQty: number;
  condition: ReturnItemCondition;
  decision: ReturnItemDecision;
  remarks?: string;
}

export interface WarehouseReturn {
  id: string;
  returnNumber: string;
  type: WarehouseReturnType;
  orderId: string;
  orderNumber?: string;
  invoiceId: string;
  invoiceNumber?: string;
  clientType?: string;
  clientName?: string;
  reason: ReturnReason;
  remarks?: string;
  status: WarehouseReturnStatus;
  items: WarehouseReturnItem[];
  createdByName?: string;
  inspectedByName?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectReason?: string;
  createdAt?: string;
}

export interface ReturnDifferenceReport {
  returnId: string;
  returnNumber: string;
  type: WarehouseReturnType;
  status: WarehouseReturnStatus;
  invoiceNumber?: string;
  orderNumber?: string;
  reason: ReturnReason;
  items: Array<{
    id: string;
    styleCode: string;
    skuCode?: string;
    size?: string;
    shade?: string;
    invoiceQty: number;
    scannedQty: number;
    verifiedQty: number;
    scanVsInvoice: number;
    condition: string;
    decision: string;
  }>;
  summary: {
    totalInvoiceQty: number;
    totalScannedQty: number;
    totalVerifiedQty: number;
    linesWithDifference: number;
  };
}

// ─── Dispatch ───────────────────────────────────────────────────────────────

export interface DispatchDetailsBody {
  courierName?: string;
  trackingNumber?: string;
  vehicleDetails?: string;
  dispatchDate?: string;
  boxCount?: number;
  shippingRemarks?: string;
}

export interface DispatchDetailsBulkImportRow {
  rowNumber?: number;
  orderNumber?: string;
  orderId?: string;
  courierName?: string;
  trackingNumber?: string;
  vehicleDetails?: string;
  boxCount?: number | string;
  shippingRemarks?: string;
}

export interface DispatchDetailsBulkImportResult {
  updated: Array<{ rowNumber: number; orderId: string; orderNumber?: string; flowStatus?: string }>;
  failed: Array<{ rowNumber: number; orderNumber?: string; message: string }>;
  summary: { total: number; success: number; failed: number };
}

export interface ShippingLabelPayload {
  orderId: string;
  orderNumber?: string;
  invoiceNumber?: string;
  clientName?: string;
  dispatch: DispatchDetailsBody & { dispatchType?: string };
  labels: Array<{
    boxNumber: number;
    boxCount: number;
    orderNumber?: string;
    clientName?: string;
    courierName?: string;
    trackingNumber?: string;
  }>;
  generatedAt: string;
}

export interface PackingListPayload {
  orderId: string;
  orderNumber?: string;
  invoiceNumber?: string;
  clientName?: string;
  dispatch: (DispatchDetailsBody & { dispatchType?: string }) | null;
  items: Array<{ srNo: number; styleCode: string; skuCode?: string; size?: string; shade?: string; quantity: number }>;
  totalQuantity: number;
  generatedAt: string;
}

// ─── API surface ─────────────────────────────────────────────────────────────

export const whmsPickListFlow = {
  printPayload: (orderId: string) => request<PickListPrintPayload>(`/pick-list/order/${orderId}/print`),
  variance: (orderId: string) => request<PickVarianceReport>(`/pick-list/order/${orderId}/variance`),
  barcodeLabels: (orderId: string) => request<BarcodeLabelsPayload>(`/warehouse-orders/${orderId}/barcodes`),
};

export const whmsScanning = {
  createSession: (orderId: string) =>
    request<ScanSession>('/scanning/sessions', { method: 'POST', body: JSON.stringify({ orderId }) }),
  listSessions: (
    params: { orderId?: string; status?: string; q?: string; page?: number; limit?: number; sortBy?: string } = {}
  ) => request<Paginated<ScanSession>>(`/scanning/sessions${qs(params)}`),
  /** Latest scan session for an order (completed or open). */
  getLatestScanSessionForOrder: async (orderId: string) => {
    const res = await request<Paginated<ScanSession>>(
      `/scanning/sessions${qs({ orderId, limit: 1, sortBy: 'createdAt:desc' })}`
    );
    return res.results?.[0] ?? null;
  },
  list: (
    params: { orderId?: string; status?: string; q?: string; page?: number; limit?: number; sortBy?: string } = {}
  ) => request<Paginated<ScanSession>>(`/scanning/sessions${qs(params)}`),
  getSession: (sessionId: string) => request<ScanSession>(`/scanning/sessions/${sessionId}`),
  scan: (sessionId: string, barcode: string, qty = 1) =>
    request<{ scannedItem: ScanSessionItem; session: ScanSession }>(`/scanning/sessions/${sessionId}/scan`, {
      method: 'POST',
      body: JSON.stringify({ barcode, qty }),
    }),
  updateItem: (sessionId: string, itemId: string, scannedQty: number) =>
    request<ScanSession>(`/scanning/sessions/${sessionId}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ scannedQty }),
    }),
  complete: (
    sessionId: string,
    opts: { force?: boolean; closeWithShortQty?: boolean; remarks?: string } = {},
  ) =>
    request<ScanSession>(`/scanning/sessions/${sessionId}/complete`, {
      method: 'POST',
      body: JSON.stringify(opts),
    }),
  cancel: (sessionId: string, remarks = '') =>
    request<ScanSession>(`/scanning/sessions/${sessionId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ remarks }),
    }),
};

export const whmsInvoices = {
  createFromOrder: (orderId: string, body: { rates?: Array<{ styleCode: string; rate: number }>; remarks?: string } = {}) =>
    request<WhmsInvoice>(`/invoices/from-order/${orderId}`, { method: 'POST', body: JSON.stringify(body) }),
  list: (params: { orderId?: string; invoiceNumber?: string; status?: string; q?: string; page?: number; limit?: number } = {}) =>
    request<Paginated<WhmsInvoice>>(`/invoices${qs(params)}`),
  get: (invoiceId: string) => request<WhmsInvoice>(`/invoices/${invoiceId}`),
  printPayload: (invoiceId: string) =>
    request<WhmsInvoice & { items: Array<WhmsInvoiceItem & { srNo: number }>; generatedAt: string }>(
      `/invoices/${invoiceId}/print`
    ),
  cancel: (invoiceId: string, reason = '') =>
    request<WhmsInvoice>(`/invoices/${invoiceId}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
};

export const whmsDispatch = {
  setDetails: (orderId: string, body: DispatchDetailsBody) =>
    request<unknown>(`/warehouse-orders/${orderId}/dispatch-details`, { method: 'PATCH', body: JSON.stringify(body) }),
  bulkImportDetails: (rows: DispatchDetailsBulkImportRow[]) =>
    request<DispatchDetailsBulkImportResult>(`/warehouse-orders/dispatch-details/bulk-import`, {
      method: 'POST',
      body: JSON.stringify({ rows }),
    }),
  dispatch: (orderId: string, mode: 'dispatched' | 'partial-dispatched' | 'ready-for-pickup', remarks = '') =>
    request<unknown>(`/warehouse-orders/${orderId}/dispatch`, {
      method: 'POST',
      body: JSON.stringify({ mode, ...(remarks ? { remarks } : {}) }),
    }),
  setDelivered: (orderId: string, body: { deliveredDate?: string; remarks?: string } = {}) =>
    request<unknown>(`/warehouse-orders/${orderId}/delivery-status`, { method: 'PATCH', body: JSON.stringify(body) }),
  shippingLabel: (orderId: string) => request<ShippingLabelPayload>(`/warehouse-orders/${orderId}/shipping-label`),
  packingList: (orderId: string) => request<PackingListPayload>(`/warehouse-orders/${orderId}/packing-list`),
};

export const whmsReturns = {
  create: (body: { type: WarehouseReturnType; invoiceId?: string; invoiceNumber?: string; reason: ReturnReason; remarks?: string }) =>
    request<WarehouseReturn>('/returns', { method: 'POST', body: JSON.stringify(body) }),
  list: (
    params: { type?: string; status?: string; reason?: string; orderId?: string; invoiceId?: string; q?: string; page?: number; limit?: number } = {}
  ) => request<Paginated<WarehouseReturn>>(`/returns${qs(params)}`),
  get: (returnId: string) => request<WarehouseReturn>(`/returns/${returnId}`),
  scan: (returnId: string, barcode: string, qty = 1) =>
    request<WarehouseReturn>(`/returns/${returnId}/scan`, { method: 'POST', body: JSON.stringify({ barcode, qty }) }),
  updateItem: (
    returnId: string,
    itemId: string,
    body: Partial<Pick<WarehouseReturnItem, 'scannedQty' | 'verifiedQty' | 'condition' | 'decision' | 'remarks'>>
  ) => request<WarehouseReturn>(`/returns/${returnId}/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  differenceReport: (returnId: string) => request<ReturnDifferenceReport>(`/returns/${returnId}/difference-report`),
  submit: (returnId: string) => request<WarehouseReturn>(`/returns/${returnId}/submit`, { method: 'POST', body: '{}' }),
  approve: (returnId: string) => request<WarehouseReturn>(`/returns/${returnId}/approve`, { method: 'POST', body: '{}' }),
  reject: (returnId: string, reason = '') =>
    request<WarehouseReturn>(`/returns/${returnId}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
};
