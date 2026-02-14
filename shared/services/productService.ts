import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

/** Product row as returned by GET /v1/products/bulk-export and sent in POST /v1/products/bulk-upsert (same shape as PATCH edit) */
export interface ProductBulkRow {
  id?: string;
  name: string;
  knittingCode?: string;
  factoryCode?: string;
  attributes?: { Needles?: string };
  styleCodeId1?: string;
  styleCodeId2?: string;
  styleCodeId3?: string;
  styleCodeId4?: string;
  styleCodeId5?: string;
  styleCodeId6?: string;
  styleCodeId7?: string;
  styleCodeId8?: string;
  styleCodeId9?: string;
  styleCodeId10?: string;
}

export interface BulkExportResponse {
  products: ProductBulkRow[];
}

export interface BulkUpsertPayload {
  products: ProductBulkRow[];
  batchSize?: number;
}

export interface BulkUpsertResult {
  message?: string;
  results: {
    successful: number;
    failed: number;
    created?: number;
    updated?: number;
    errors?: Array<{ productName?: string; error?: string }>;
  };
}

function getAccessToken(): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const tokenFromJsCookie = Cookies.get('accessToken');
    if (tokenFromJsCookie) return tokenFromJsCookie;
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'accessToken') return decodeURIComponent(value);
    }
    return null;
  } catch (error) {
    console.error('Error reading access token from cookies:', error);
    return null;
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('No access token found. Please login again.');
  }
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error((errBody as any)?.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

/**
 * GET /v1/products/bulk-export
 * Returns products in bulk format: id, name, knittingCode, factoryCode, Needles, styleCodeId1…styleCodeId10
 */
export async function bulkExportProducts(): Promise<ProductBulkRow[]> {
  const url = `${API_BASE_URL}/products/bulk-export`;
  const data = await request<BulkExportResponse>(url, { method: 'GET' });
  return (data as BulkExportResponse).products ?? [];
}

/**
 * POST /v1/products/bulk-upsert
 * Payload: { products: ProductBulkRow[], batchSize?: number }
 */
export async function bulkUpsertProducts(
  products: ProductBulkRow[],
  batchSize: number = 50
): Promise<BulkUpsertResult> {
  const url = `${API_BASE_URL}/products/bulk-upsert`;
  return request<BulkUpsertResult>(url, {
    method: 'POST',
    body: JSON.stringify({ products, batchSize }),
  });
}

export const productService = {
  bulkExport: bulkExportProducts,
  bulkUpsert: bulkUpsertProducts,
};

export default productService;
