import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

export interface YarnTypeDetail {
  subtype: string;
  countSize?: string[];
  weight?: string;
}

export interface YarnType {
  id: string;
  name: string;
  details?: YarnTypeDetail[];
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface YarnTypeListResponse {
  results: YarnType[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface YarnTypeQueryParams {
  name?: string;
  status?: 'active' | 'inactive';
  sortBy?: string;
  limit?: number;
  page?: number;
}

export interface CreateYarnTypeRequest {
  name: string;
  status?: 'active' | 'inactive';
  details?: YarnTypeDetail[];
}

export interface UpdateYarnTypeRequest {
  name?: string;
  status?: 'active' | 'inactive';
  details?: YarnTypeDetail[];
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

class YarnTypeService {
  private baseURL = `${API_BASE_URL}/yarn-management/yarn-types`;

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
      console.error('Yarn Type API Error:', error);
      throw error;
    }
  }

  async getTypes(params: YarnTypeQueryParams = {}): Promise<YarnTypeListResponse> {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    const query = searchParams.toString();
    const endpoint = query ? `?${query}` : '';

    return this.makeRequest<YarnTypeListResponse>(endpoint);
  }

  async getTypeById(yarnTypeId: string): Promise<YarnType> {
    if (!yarnTypeId) {
      throw new Error('Yarn type ID is required');
    }

    return this.makeRequest<YarnType>(`/${yarnTypeId}`);
  }

  async createType(payload: CreateYarnTypeRequest): Promise<YarnType> {
    return this.makeRequest<YarnType>('', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateType(yarnTypeId: string, payload: UpdateYarnTypeRequest): Promise<YarnType> {
    if (!yarnTypeId) {
      throw new Error('Yarn type ID is required');
    }

    return this.makeRequest<YarnType>(`/${yarnTypeId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteType(yarnTypeId: string): Promise<void> {
    if (!yarnTypeId) {
      throw new Error('Yarn type ID is required');
    }

    await this.makeRequest<void>(`/${yarnTypeId}`, {
      method: 'DELETE',
    });
  }
}

const yarnTypeService = new YarnTypeService();

export default yarnTypeService;


