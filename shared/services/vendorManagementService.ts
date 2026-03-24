import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

/** GET/POST/PATCH/DELETE `${API_BASE_URL}/vendor-management` — Bearer JWT. */

export interface VendorManagementHeaderInput {
  vendorCode: string;
  vendorName: string;
  status: string;
  city?: string;
  state?: string;
  notes?: string;
  address?: string;
  gstin?: string;
}

export interface VendorContactPersonInput {
  contactName: string;
  phone: string;
  email?: string;
}

export interface VendorManagementDocument {
  id: string;
  header: {
    vendorCode: string;
    vendorName: string;
    status: string;
    city?: string;
    state?: string;
    notes?: string;
    address?: string;
    gstin?: string;
  };
  contactPersons: VendorContactPersonInput[];
  products: Array<string | Record<string, unknown>>;
}

export interface CreateVendorBody {
  header: VendorManagementHeaderInput;
  contactPersons: VendorContactPersonInput[];
  products?: string[];
}

export interface ListVendorsParams {
  vendorName?: string;
  vendorCode?: string;
  status?: string;
  city?: string;
  state?: string;
  search?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
  populate?: 'products';
}

export interface ListVendorsResponse {
  results: VendorManagementDocument[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export type PatchVendorBody = {
  header?: Partial<VendorManagementHeaderInput>;
  contactPersons?: VendorContactPersonInput[];
  products?: string[];
};

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

async function parseErrorMessage(res: Response): Promise<string> {
  const errBody = await res.json().catch(() => ({}));
  return (errBody as { message?: string })?.message || `Request failed: ${res.status}`;
}

async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
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
    throw new Error(await parseErrorMessage(res));
  }
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

const baseUrl = () => `${API_BASE_URL}/vendor-management`;

/**
 * POST /v1/vendor-management — 201 Created
 */
export async function createVendor(body: CreateVendorBody): Promise<VendorManagementDocument> {
  const url = baseUrl();
  return requestJson<VendorManagementDocument>(url, {
    method: 'POST',
    body: JSON.stringify({
      ...body,
      products: body.products ?? [],
    }),
  });
}

function buildListQuery(params: ListVendorsParams): string {
  const sp = new URLSearchParams();
  if (params.vendorName) sp.set('vendorName', params.vendorName);
  if (params.vendorCode) sp.set('vendorCode', params.vendorCode);
  if (params.status) sp.set('status', params.status);
  if (params.city) sp.set('city', params.city);
  if (params.state) sp.set('state', params.state);
  if (params.search) sp.set('search', params.search);
  if (params.sortBy) sp.set('sortBy', params.sortBy);
  if (params.page != null) sp.set('page', String(params.page));
  if (params.limit != null) sp.set('limit', String(params.limit));
  if (params.populate) sp.set('populate', params.populate);
  const q = sp.toString();
  return q ? `?${q}` : '';
}

/**
 * GET /v1/vendor-management — paginated list
 */
export async function listVendors(params: ListVendorsParams = {}): Promise<ListVendorsResponse> {
  const url = `${baseUrl()}${buildListQuery(params)}`;
  return requestJson<ListVendorsResponse>(url, { method: 'GET' });
}

/**
 * GET /v1/vendor-management/:id
 */
export async function getVendor(
  vendorManagementId: string,
  options?: { populate?: 'products' }
): Promise<VendorManagementDocument> {
  const q =
    options?.populate === 'products' ? '?populate=products' : '';
  const url = `${baseUrl()}/${encodeURIComponent(vendorManagementId)}${q}`;
  return requestJson<VendorManagementDocument>(url, { method: 'GET' });
}

/**
 * PATCH /v1/vendor-management/:id
 */
export async function patchVendor(
  vendorManagementId: string,
  body: PatchVendorBody
): Promise<VendorManagementDocument> {
  const url = `${baseUrl()}/${encodeURIComponent(vendorManagementId)}`;
  return requestJson<VendorManagementDocument>(url, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/**
 * DELETE /v1/vendor-management/:id — 204 No Content
 */
export async function deleteVendor(vendorManagementId: string): Promise<void> {
  const url = `${baseUrl()}/${encodeURIComponent(vendorManagementId)}`;
  await requestJson<void>(url, { method: 'DELETE' });
}

/**
 * POST /v1/vendor-management/:id/products — merge product ids
 */
export async function addVendorProducts(
  vendorManagementId: string,
  productIds: string[]
): Promise<VendorManagementDocument> {
  const url = `${baseUrl()}/${encodeURIComponent(vendorManagementId)}/products`;
  return requestJson<VendorManagementDocument>(url, {
    method: 'POST',
    body: JSON.stringify({ productIds }),
  });
}

/**
 * DELETE /v1/vendor-management/:id/products — remove product ids
 */
export async function removeVendorProducts(
  vendorManagementId: string,
  productIds: string[]
): Promise<VendorManagementDocument> {
  const url = `${baseUrl()}/${encodeURIComponent(vendorManagementId)}/products`;
  return requestJson<VendorManagementDocument>(url, {
    method: 'DELETE',
    body: JSON.stringify({ productIds }),
  });
}

export const vendorManagementService = {
  create: createVendor,
  list: listVendors,
  get: getVendor,
  patch: patchVendor,
  delete: deleteVendor,
  addProducts: addVendorProducts,
  removeProducts: removeVendorProducts,
};

export default vendorManagementService;
