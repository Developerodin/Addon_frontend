import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

export interface YarnBlend {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface YarnBlendListResponse {
  results: YarnBlend[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface YarnBlendQueryParams {
  name?: string;
  status?: 'active' | 'inactive';
  sortBy?: string;
  limit?: number;
  page?: number;
}

export interface CreateYarnBlendRequest {
  name: string;
  status?: 'active' | 'inactive';
}

export interface UpdateYarnBlendRequest {
  name?: string;
  status?: 'active' | 'inactive';
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

class YarnBlendService {
  private baseURL = `${API_BASE_URL}/yarn-management/blends`;

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
      console.error('Yarn Blend API Error:', error);
      throw error;
    }
  }

  async getBlends(params: YarnBlendQueryParams = {}): Promise<YarnBlendListResponse> {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    const query = searchParams.toString();
    const endpoint = query ? `?${query}` : '';

    return this.makeRequest<YarnBlendListResponse>(endpoint);
  }

  async getBlendById(blendId: string): Promise<YarnBlend> {
    if (!blendId) {
      throw new Error('Blend ID is required');
    }
    return this.makeRequest<YarnBlend>(`/${blendId}`);
  }

  async createBlend(payload: CreateYarnBlendRequest): Promise<YarnBlend> {
    return this.makeRequest<YarnBlend>('', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateBlend(blendId: string, payload: UpdateYarnBlendRequest): Promise<YarnBlend> {
    if (!blendId) {
      throw new Error('Blend ID is required');
    }

    return this.makeRequest<YarnBlend>(`/${blendId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteBlend(blendId: string): Promise<void> {
    if (!blendId) {
      throw new Error('Blend ID is required');
    }

    await this.makeRequest<void>(`/${blendId}`, {
      method: 'DELETE',
    });
  }
}

const yarnBlendService = new YarnBlendService();

export default yarnBlendService;

