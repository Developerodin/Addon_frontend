/**
 * WHMS pick-list batch API — `/v1/whms/pick-list-batches`.
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

export type PickListBatchType = 'single' | 'combined';
export type PickListBatchStatus = 'picking' | 'sent-to-scanning' | 'cancelled';

export interface PickListBatchAllocation {
  orderId: string;
  pickListId: string;
  orderNumber?: string;
  requiredQty: number;
}

export interface PickListBatchItem {
  itemKey: string;
  styleCode: string;
  skuCode: string;
  styleCodeId?: string | null;
  size?: string;
  shade?: string;
  requiredQty: number;
  pickedQty: number;
  status: 'pending' | 'partial' | 'picked';
  allocations: PickListBatchAllocation[];
  availableStock?: number;
}

export interface PickListBatchSummary {
  itemCount: number;
  orderCount: number;
  totalRequired: number;
  totalPicked: number;
  pickedProgressPct: number;
}

export interface PickListBatch {
  id: string;
  batchNumber: string;
  type: PickListBatchType;
  orderIds: string[];
  orderNumbers: string[];
  status: PickListBatchStatus;
  pickerName?: string;
  items: PickListBatchItem[];
  summary?: PickListBatchSummary;
  createdByName?: string;
  sentToScanningAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PickListBatchDetail extends PickListBatch {
  orders?: Array<{
    id: string;
    orderNumber?: string;
    addonOrderId?: string;
    clientName?: string;
    flowStatus?: string;
  }>;
}

export interface PickListBatchBarcodeLabel {
  styleCode: string;
  skuCode: string;
  size?: string;
  shade?: string;
  barcode: string;
  quantity: number;
}

export interface Paginated<T> {
  results: T[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface OrderBatchInfo {
  id: string;
  batchNumber: string;
  type: PickListBatchType;
  status: PickListBatchStatus;
  orderNumbers: string[];
  siblings: Array<{ id: string; orderNumber?: string; flowStatus?: string }>;
}

export const whmsPickListBatches = {
  create(orderIds: string[]): Promise<PickListBatch> {
    return request('/pick-list-batches', {
      method: 'POST',
      body: JSON.stringify({ orderIds }),
    });
  },

  list(params: {
    status?: PickListBatchStatus;
    type?: PickListBatchType;
    q?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<Paginated<PickListBatch>> {
    return request(`/pick-list-batches${qs(params)}`);
  },

  get(batchId: string): Promise<PickListBatchDetail> {
    return request(`/pick-list-batches/${batchId}`);
  },

  savePicks(batchId: string, picks: Array<{ itemKey: string; pickedQty: number }>): Promise<PickListBatchDetail> {
    return request(`/pick-list-batches/${batchId}/picks`, {
      method: 'PATCH',
      body: JSON.stringify({ picks }),
    });
  },

  setPicker(batchId: string, pickerName: string): Promise<PickListBatch> {
    return request(`/pick-list-batches/${batchId}/picker`, {
      method: 'PATCH',
      body: JSON.stringify({ pickerName }),
    });
  },

  barcodes(batchId: string, params?: { styleCode?: string; extraQty?: number }): Promise<{
    batchId: string;
    batchNumber: string;
    type: PickListBatchType;
    orderNumbers: string[];
    labels: PickListBatchBarcodeLabel[];
  }> {
    return request(`/pick-list-batches/${batchId}/barcodes${qs(params || {})}`);
  },

  sendToScanning(batchId: string): Promise<PickListBatch> {
    return request(`/pick-list-batches/${batchId}/send-to-scanning`, { method: 'POST' });
  },

  cancel(batchId: string): Promise<PickListBatch> {
    return request(`/pick-list-batches/${batchId}`, { method: 'DELETE' });
  },

  forOrder(orderId: string): Promise<OrderBatchInfo | null> {
    return request(`/pick-list-batches/order/${orderId}`);
  },
};
