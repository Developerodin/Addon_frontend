import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

export interface CountSize {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface CountSizeListResponse {
  results: CountSize[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface CountSizeQueryParams {
  name?: string;
  status?: 'active' | 'inactive';
  sortBy?: string;
  limit?: number;
  page?: number;
}

export interface CreateCountSizeRequest {
  name: string;
  status?: 'active' | 'inactive';
}

export interface UpdateCountSizeRequest {
  name?: string;
  status?: 'active' | 'inactive';
}

export interface BulkImportCountSizeRequest {
  countSizes: Array<{
    id?: string;
    name: string;
    status?: 'active' | 'inactive';
  }>;
  batchSize?: number;
}

export interface BulkImportCountSizeResponse {
  message?: string;
  insertedCount?: number;
  updatedCount?: number;
  [key: string]: unknown;
}

const getAccessToken = (): string | null => {
  if (typeof document === 'undefined') return null;

  try {
    const tokenFromJsCookie = Cookies.get('accessToken');
    if (tokenFromJsCookie) {
      return tokenFromJsCookie;
    }

    const tokenFromLocalStorage = localStorage.getItem('token');
    if (tokenFromLocalStorage) {
      return tokenFromLocalStorage;
    }

    return null;
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
};

class YarnCountSizeService {
  private baseURL = `${API_BASE_URL}/yarn-management/count-sizes`;

  private buildHeaders(additional?: HeadersInit): HeadersInit {
    const token = getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...additional,
    };
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = getAccessToken();

    if (!token) {
      throw new Error('No access token found. Please login again.');
    }

    const config: RequestInit = {
      ...options,
      headers: this.buildHeaders(options.headers),
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 401) {
          throw new Error('Authentication failed. Please login again.');
        }

        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      if (response.status === 204) {
        return {} as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      console.error('Yarn Count Size API Error:', error);
      throw error;
    }
  }

  async getCountSizes(params: CountSizeQueryParams = {}): Promise<CountSizeListResponse> {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    const query = searchParams.toString();
    const endpoint = query ? `?${query}` : '';

    return this.makeRequest<CountSizeListResponse>(endpoint);
  }

  async getCountSizeById(countSizeId: string): Promise<CountSize> {
    if (!countSizeId) {
      throw new Error('Count size ID is required');
    }
    return this.makeRequest<CountSize>(`/${countSizeId}`);
  }

  async createCountSize(payload: CreateCountSizeRequest): Promise<CountSize> {
    return this.makeRequest<CountSize>('', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateCountSize(countSizeId: string, payload: UpdateCountSizeRequest): Promise<CountSize> {
    if (!countSizeId) {
      throw new Error('Count size ID is required');
    }

    return this.makeRequest<CountSize>(`/${countSizeId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteCountSize(countSizeId: string): Promise<void> {
    if (!countSizeId) {
      throw new Error('Count size ID is required');
    }

    await this.makeRequest<void>(`/${countSizeId}`, {
      method: 'DELETE',
    });
  }

  async bulkImportCountSizes(payload: BulkImportCountSizeRequest): Promise<BulkImportCountSizeResponse> {
    if (!payload?.countSizes || payload.countSizes.length === 0) {
      throw new Error('At least one count size is required for bulk import');
    }

    return this.makeRequest<BulkImportCountSizeResponse>('/bulk-import', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

const yarnCountSizeService = new YarnCountSizeService();

export default yarnCountSizeService;

