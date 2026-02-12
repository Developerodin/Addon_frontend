import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

export interface NeedleConfiguration {
  id: string;
  needleSize?: string;
  cutoffQuantity?: number;
  name?: string;
  code?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface NeedleConfigListResponse {
  results: NeedleConfiguration[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

function getAuthHeaders(): HeadersInit {
  const token = typeof document !== 'undefined' ? Cookies.get('accessToken') : null;
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * List needle configurations with pagination and optional search.
 */
export async function listNeedleConfigurations(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<NeedleConfigListResponse> {
  const { page = 1, limit = 20, search = '' } = params;
  const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
  const url = `${API_BASE_URL}/needle-configurations?page=${page}&limit=${limit}${searchParam}`;
  const res = await fetch(url, { method: 'GET', headers: getAuthHeaders() });
  if (!res.ok) {
    if (res.status === 404) {
      return { results: [], page: 1, limit, totalPages: 1, totalResults: 0 };
    }
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Failed to fetch needle configurations');
  }
  return res.json();
}
