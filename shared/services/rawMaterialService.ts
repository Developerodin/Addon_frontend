import { API_BASE_URL } from '@/shared/data/utilities/api';

export interface RawMaterial {
  id: string;
  name: string;
  groupName: string;
  type: string;
  description: string;
  brand: string;
  countSize: string;
  material: string;
  color: string;
  shade: string;
  unit: string;
  mrp: string;
  hsnCode: string;
  gst: string;
  articleNo: string;
}

export interface RawMaterialListResponse {
  results: RawMaterial[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

/**
 * Fetch raw materials with pagination and optional search (for modal with table + pagination).
 */
export async function listRawMaterialsPaginated(options: {
  page: number;
  limit: number;
  search?: string;
}): Promise<RawMaterialListResponse> {
  const { page, limit, search } = options;
  const searchParam = search?.trim() ? `&search=${encodeURIComponent(search)}` : '';
  const response = await fetch(
    `${API_BASE_URL}/raw-materials?page=${page}&limit=${limit}${searchParam}`,
    { headers: { Accept: 'application/json' } }
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch raw materials');
  }
  const data: RawMaterialListResponse = await response.json();
  const results = Array.isArray(data.results) ? data.results : [];
  return {
    results,
    page: data.page ?? page,
    limit: data.limit ?? limit,
    totalPages: data.totalPages ?? 1,
    totalResults: data.totalResults ?? results.length,
  };
}

/** Fetch all raw materials (no pagination - for dropdowns). */
export async function listRawMaterials(options?: { search?: string }): Promise<RawMaterial[]> {
  const res = await listRawMaterialsPaginated({ page: 1, limit: 10000, search: options?.search });
  return res.results;
}

export const rawMaterialService = {
  list: listRawMaterials,
  listPaginated: listRawMaterialsPaginated,
};
