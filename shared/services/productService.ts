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
 * GET /v1/products?page=&limit=&search=&styleCode=
 * Paginated catalog list (aligned with `app/catalog/items/page.tsx`).
 */
export async function listProducts(params: {
  page?: number;
  limit?: number;
  search?: string;
  styleCode?: string;
}): Promise<ListProductsResponse> {
  const sp = new URLSearchParams();
  sp.set('page', String(params.page ?? 1));
  sp.set('limit', String(params.limit ?? 10));
  if (params.search?.trim()) sp.set('search', params.search.trim());
  if (params.styleCode?.trim()) sp.set('styleCode', params.styleCode.trim());
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
  image?: string;
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

/** Row from GET /v1/products/style-codes-by-vendor-code — use `id` as `styleCode` in branding floor payloads. */
export interface StyleCodeByVendorRow {
  id?: string;
  /** Some API responses use Mongo `_id` instead of `id` */
  _id?: string;
  styleCode: string;
  eanCode?: string;
  brand: string;
  pack?: string;
  mrp?: number;
  status?: string;
}

export interface StyleCodesByVendorCodeResponse {
  vendorCode: string;
  productCount: number;
  styleCodes: StyleCodeByVendorRow[];
}

/**
 * GET /v1/products/style-codes-by-vendor-code?vendorCode=
 * Distinct style codes linked to products with this Product.vendorCode (case-insensitive).
 */
export async function getStyleCodesByVendorCode(
  vendorCode: string
): Promise<StyleCodesByVendorCodeResponse> {
  const q = vendorCode?.trim();
  if (!q) {
    return { vendorCode: '', productCount: 0, styleCodes: [] };
  }
  const url = `${API_BASE_URL}/products/style-codes-by-vendor-code?vendorCode=${encodeURIComponent(q)}`;
  return request<StyleCodesByVendorCodeResponse>(url, { method: 'GET' });
}

/** Full product as returned by GET /v1/products?search=... (includes attributes + styleCodes). */
export interface ProductWithAttributes {
  id?: string;
  _id?: string;
  name?: string;
  attributes?: Record<string, string>;
  styleCodes?: Array<{
    styleCodeId?: string;
    id?: string;
    _id?: string;
    styleCode?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

/**
 * Find the product/article that has a given style-code linked in its `styleCodes` array.
 * Uses `GET /v1/products?search=<styleCodeStr>&limit=100` then verifies by styleCodeId.
 */
export async function findProductByStyleCodeId(
  styleCodeId: string,
  styleCodeStr: string
): Promise<ProductWithAttributes | null> {
  console.log('[findProductByStyleCodeId] searching for styleCodeId:', styleCodeId, 'styleCodeStr:', styleCodeStr);
  if (!styleCodeId && !styleCodeStr) return null;
  try {
    const searchTerm = styleCodeStr || styleCodeId;
    const url = `${API_BASE_URL}/products?search=${encodeURIComponent(searchTerm)}&limit=100`;
    console.log('[findProductByStyleCodeId] fetching:', url);
    const data = await request<{ results: ProductWithAttributes[] }>(url, { method: 'GET' });
    const products = data.results || [];
    console.log('[findProductByStyleCodeId] products returned:', products.length, products.map(p => ({ id: p.id, name: p.name, styleCodes: p.styleCodes })));

    for (const product of products) {
      const scs = product.styleCodes || [];
      for (const sc of scs) {
        const scId =
          typeof sc === 'string'
            ? sc
            : String(sc.styleCodeId ?? sc.id ?? sc._id ?? '').trim();
        if (scId === String(styleCodeId).trim()) {
          console.log('[findProductByStyleCodeId] MATCH found — product:', product.name, 'id:', product.id, 'attributes:', product.attributes);
          return product;
        }
      }
    }
    console.log('[findProductByStyleCodeId] NO matching product found');
    return null;
  } catch (err) {
    console.error('[findProductByStyleCodeId] ERROR:', err);
    return null;
  }
}

export interface ProductAttributeCategory {
  id: string;
  name: string;
  optionValues: Array<{ _id?: string; id?: string; name: string }>;
}

/**
 * Fetch product-attribute definitions and build a reverse lookup: valueId → valueName.
 */
export async function fetchAttributeValueLookup(): Promise<Record<string, string>> {
  try {
    const url = `${API_BASE_URL}/product-attributes?page=1&limit=200`;
    const data = await request<{ results: ProductAttributeCategory[] }>(url, { method: 'GET' });
    const lookup: Record<string, string> = {};
    for (const cat of data.results || []) {
      for (const val of cat.optionValues || []) {
        const id = val._id || val.id;
        if (id) lookup[String(id)] = val.name || '';
      }
    }
    return lookup;
  } catch {
    return {};
  }
}

/**
 * Given a style-code ID/string, find the linked article and return resolved Colour + Pattern.
 * Uses WHMS catalogue-attrs API (direct Product.styleCodes lookup) with legacy search fallback.
 */
export async function resolveArticleColourPattern(
  styleCodeId: string,
  styleCodeStr: string
): Promise<{ colour: string; pattern: string }> {
  if (styleCodeId?.trim()) {
    try {
      const { whmsWarehouseOrders } = await import('@/shared/services/whmsWarehouseOrderService');
      const attrs = await whmsWarehouseOrders.getCatalogueAttrs([styleCodeId]);
      const fromWhms = attrs[styleCodeId];
      if (fromWhms?.colour || fromWhms?.pattern) {
        return { colour: fromWhms.colour || '', pattern: fromWhms.pattern || '' };
      }
    } catch {
      /* fall through to legacy lookup */
    }
  }

  console.log('[resolveArticleColourPattern] START — styleCodeId:', styleCodeId, 'styleCodeStr:', styleCodeStr);
  const product = await findProductByStyleCodeId(styleCodeId, styleCodeStr);
  if (!product?.attributes) {
    console.log('[resolveArticleColourPattern] no product or no attributes found');
    return { colour: '', pattern: '' };
  }

  const attrs = product.attributes;
  console.log('[resolveArticleColourPattern] product attributes:', attrs);
  const colourKey = Object.keys(attrs).find((k) => /^colou?r$/i.test(k));
  const patternKey = Object.keys(attrs).find((k) => /^pattern$/i.test(k));
  console.log('[resolveArticleColourPattern] colourKey:', colourKey, 'patternKey:', patternKey);
  if (!colourKey && !patternKey) {
    console.log('[resolveArticleColourPattern] no Color/Pattern attributes on this article');
    return { colour: '', pattern: '' };
  }

  const colourRaw = colourKey ? attrs[colourKey] : '';
  const patternRaw = patternKey ? attrs[patternKey] : '';
  console.log('[resolveArticleColourPattern] raw values — colour:', colourRaw, 'pattern:', patternRaw);

  const lookup = await fetchAttributeValueLookup();
  console.log('[resolveArticleColourPattern] attribute value lookup (sample):', Object.entries(lookup).slice(0, 10));

  const result = {
    colour: lookup[colourRaw] || colourRaw || '',
    pattern: lookup[patternRaw] || patternRaw || '',
  };
  console.log('[resolveArticleColourPattern] RESOLVED — colour:', result.colour, 'pattern:', result.pattern);
  return result;
}

export const productService = {
  list: listProducts,
  getById: getProductById,
  bulkExport: bulkExportProducts,
  bulkUpsert: bulkUpsertProducts,
  getByFactoryCodes: getProductsByFactoryCodes,
  getByCode: getProductByCode,
  getStyleCodesByVendorCode,
  findByStyleCodeId: findProductByStyleCodeId,
  resolveArticleColourPattern,
  fetchAttributeValueLookup,
};

export default productService;
