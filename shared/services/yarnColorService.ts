import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

export interface YarnColor {
  id: string;
  name: string;
  colorCode: string;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface YarnColorListResponse {
  results: YarnColor[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface YarnColorQueryParams {
  name?: string;
  status?: 'active' | 'inactive';
  sortBy?: string;
  limit?: number;
  page?: number;
}

export interface CreateYarnColorRequest {
  name: string;
  colorCode: string;
  status?: 'active' | 'inactive';
}

export interface UpdateYarnColorRequest {
  name?: string;
  colorCode?: string;
  status?: 'active' | 'inactive';
}

export interface BulkImportColorRequest {
  colors: Array<{
    id?: string;
    name: string;
    colorCode: string;
    status?: 'active' | 'inactive';
  }>;
  batchSize?: number;
}

export interface BulkImportColorResponse {
  message?: string;
  insertedCount?: number;
  updatedCount?: number;
  [key: string]: unknown;
}

const getAccessToken = (): string | null => {
  if (typeof document === 'undefined') return null;

  try {
    const tokenFromCookie = Cookies.get('accessToken');
    if (tokenFromCookie) {
      return tokenFromCookie;
    }

    const tokenFromStorage = localStorage.getItem('token');
    if (tokenFromStorage) {
      return tokenFromStorage;
    }

    return null;
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
};

class YarnColorService {
  private baseURL = `${API_BASE_URL}/yarn-management/colors`;

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
      console.error('Yarn Color API Error:', error);
      throw error;
    }
  }

  async getColors(params: YarnColorQueryParams = {}): Promise<YarnColorListResponse> {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    const query = searchParams.toString();
    const endpoint = query ? `?${query}` : '';

    return this.makeRequest<YarnColorListResponse>(endpoint);
  }

  async getColorById(colorId: string): Promise<YarnColor> {
    if (!colorId) {
      throw new Error('Color ID is required');
    }
    return this.makeRequest<YarnColor>(`/${colorId}`);
  }

  async createColor(payload: CreateYarnColorRequest): Promise<YarnColor> {
    return this.makeRequest<YarnColor>('', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateColor(colorId: string, payload: UpdateYarnColorRequest): Promise<YarnColor> {
    if (!colorId) {
      throw new Error('Color ID is required');
    }

    return this.makeRequest<YarnColor>(`/${colorId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteColor(colorId: string): Promise<void> {
    if (!colorId) {
      throw new Error('Color ID is required');
    }

    await this.makeRequest<void>(`/${colorId}`, {
      method: 'DELETE',
    });
  }

  async bulkImportColors(payload: BulkImportColorRequest): Promise<BulkImportColorResponse> {
    if (!payload?.colors || payload.colors.length === 0) {
      throw new Error('At least one color is required for bulk import');
    }

    return this.makeRequest<BulkImportColorResponse>('/bulk-import', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

const yarnColorService = new YarnColorService();

export default yarnColorService;

