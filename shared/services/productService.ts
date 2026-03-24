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

/** Row from GET /v1/products (catalog list — same as Catalog → Items). */
export interface ProductListItem {
  id: string;
  name: string;
  factoryCode?: string;
  vendorCode?: string;
  softwareCode?: string;
  internalCode?: string;
  status?: string;
  category?: string | { id?: string; name?: string };
}

export interface ListProductsResponse {
  results: ProductListItem[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

/**
 * GET /v1/products?page=&limit=&search=
 * Paginated catalog list (aligned with `app/catalog/items/page.tsx`).
 */
export async function listProducts(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<ListProductsResponse> {
  const sp = new URLSearchParams();
  sp.set('page', String(params.page ?? 1));
  sp.set('limit', String(params.limit ?? 10));
  if (params.search?.trim()) sp.set('search', params.search.trim());
  const url = `${API_BASE_URL}/products?${sp.toString()}`;
  return request<ListProductsResponse>(url, { method: 'GET' });
}

/** Full product from GET /v1/products/:id (same shape as catalog item detail). */
export interface ProductById {
  id?: string;
  _id?: string;
  name?: string;
  factoryCode?: string;
  vendorCode?: string;
  softwareCode?: string;
  internalCode?: string;
  [key: string]: unknown;
}

/**
 * GET /v1/products/:id — used to fill factory/vendor codes when vendor populate omits them.
 */
export async function getProductById(productId: string): Promise<ProductById | null> {
  if (!productId?.trim()) return null;
  try {
    const url = `${API_BASE_URL}/products/${encodeURIComponent(productId.trim())}`;
    return await request<ProductById>(url, { method: 'GET' });
  } catch {
    return null;
  }
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

/** Product from POST /v1/products/by-factory-codes (attributes: Type, Season, etc.) */
export interface ProductByFactoryCode {
  _id?: string;
  factoryCode?: string;
  name?: string;
  attributes?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * POST /v1/products/by-factory-codes
 * Body: { factoryCodes: string[] } (max 500)
 * Returns array of products with attributes (Type, Season, etc.)
 */
export async function getProductsByFactoryCodes(
  factoryCodes: string[]
): Promise<ProductByFactoryCode[]> {
  if (!factoryCodes.length) return [];
  const url = `${API_BASE_URL}/products/by-factory-codes`;
  return request<ProductByFactoryCode[]>(url, {
    method: 'POST',
    body: JSON.stringify({ factoryCodes }),
  });
}

/** Product from GET /v1/products/by-code?factoryCode=... */
export interface ProductByCode {
  id?: string;
  _id?: string;
  name?: string;
  factoryCode?: string;
  styleCodes?: Array<{ id?: string; styleCode?: string; brand?: string }>;
  category?: { name?: string };
  processes?: unknown[];
  [key: string]: unknown;
}

/**
 * GET /v1/products/by-code?factoryCode=A004
 * Returns product with styleCodes array for Branding transfer
 */
export async function getProductByCode(
  factoryCode: string
): Promise<ProductByCode | null> {
  if (!factoryCode?.trim()) return null;
  try {
    const url = `${API_BASE_URL}/products/by-code?factoryCode=${encodeURIComponent(factoryCode.trim())}`;
    return await request<ProductByCode>(url, { method: 'GET' });
  } catch {
    return null;
  }
}

export const productService = {
  list: listProducts,
  getById: getProductById,
  bulkExport: bulkExportProducts,
  bulkUpsert: bulkUpsertProducts,
  getByFactoryCodes: getProductsByFactoryCodes,
  getByCode: getProductByCode,
};

export default productService;
