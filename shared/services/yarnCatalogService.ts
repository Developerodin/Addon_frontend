import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

export interface YarnCatalogEmbedded {
  id: string;
  _id?: string;
  name?: string;
  brandName?: string;
  colorCode?: string;
  status: string;
  [key: string]: unknown;
}

export interface YarnCatalog {
  id: string;
  yarnName: string;
  yarnType: YarnCatalogEmbedded;
  yarnSubtype?: YarnCatalogEmbedded;
  countSize: YarnCatalogEmbedded;
  blend: YarnCatalogEmbedded;
  colorFamily?: YarnCatalogEmbedded;
  pantonShade?: string;
  pantonName?: string;
  season?: string;
  gst?: number;
  remark?: string;
  hsnCode?: string;
  minQuantity?: number;
  /** Optional catalog workflow flag */
  linking?: boolean;
  /** Optional catalog workflow flag */
  sampling?: boolean;
  status: 'active' | 'inactive' | 'suspended';
  createdAt?: string;
  updatedAt?: string;
}

export interface YarnCatalogListResponse {
  results: YarnCatalog[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface YarnCatalogQueryParams {
  yarnName?: string;
  status?: 'active' | 'inactive' | 'suspended';
  yarnType?: string;
  yarnSubtype?: string;
  countSize?: string;
  blend?: string;
  colorFamily?: string;
  sortBy?: string;
  limit?: number;
  page?: number;
}

export interface CreateYarnCatalogRequest {
  yarnName?: string;
  yarnType: string;
  yarnSubtype?: string;
  countSize: string;
  blend: string;
  colorFamily?: string;
  pantonShade?: string;
  pantonName?: string;
  season?: string;
  gst?: number;
  remark?: string;
  hsnCode?: string;
  minQuantity?: number;
  linking?: boolean;
  sampling?: boolean;
  status?: 'active' | 'inactive' | 'suspended';
}

export interface UpdateYarnCatalogRequest {
  yarnName?: string;
  yarnType?: string;
  yarnSubtype?: string;
  countSize?: string;
  blend?: string;
  colorFamily?: string;
  pantonShade?: string;
  pantonName?: string;
  season?: string;
  gst?: number;
  remark?: string;
  hsnCode?: string;
  minQuantity?: number;
  linking?: boolean;
  sampling?: boolean;
  status?: 'active' | 'inactive' | 'suspended';
}

export interface BulkImportYarnCatalogRequest {
  yarnCatalogs: Array<{
    id?: string;
    yarnType: string;
    yarnSubtype?: string;
    countSize: string;
    blend: string;
    colorFamily?: string;
    pantonShade?: string;
    pantonName?: string;
    season?: string;
    gst?: number;
    remark?: string;
    hsnCode?: string;
    minQuantity?: number;
    linking?: boolean;
    sampling?: boolean;
    status?: 'active' | 'inactive' | 'suspended';
  }>;
  batchSize?: number;
}

export interface BulkImportYarnCatalogResponse {
  message?: string;
  summary?: {
    total: number;
    created: number;
    updated: number;
    failed: number;
    successRate: string;
    processingTime: string;
  };
  details?: {
    successful: number;
    errors: Array<{
      index: number;
      yarnName?: string;
      error: string;
    }>;
  };
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

class YarnCatalogService {
  private baseURL = `${API_BASE_URL}/yarn-management/yarn-catalogs`;

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
      console.error('Yarn Catalog API Error:', error);
      throw error;
    }
  }

  async getYarnCatalogs(params: YarnCatalogQueryParams = {}): Promise<YarnCatalogListResponse> {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    const query = searchParams.toString();
    const endpoint = query ? `?${query}` : '';

    return this.makeRequest<YarnCatalogListResponse>(endpoint);
  }

  async getYarnCatalogById(catalogId: string): Promise<YarnCatalog> {
    if (!catalogId) {
      throw new Error('Yarn catalog ID is required');
    }
    return this.makeRequest<YarnCatalog>(`/${catalogId}`);
  }

  async createYarnCatalog(payload: CreateYarnCatalogRequest): Promise<YarnCatalog> {
    return this.makeRequest<YarnCatalog>('', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateYarnCatalog(catalogId: string, payload: UpdateYarnCatalogRequest): Promise<YarnCatalog> {
    if (!catalogId) {
      throw new Error('Yarn catalog ID is required');
    }

    return this.makeRequest<YarnCatalog>(`/${catalogId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteYarnCatalog(catalogId: string): Promise<void> {
    if (!catalogId) {
      throw new Error('Yarn catalog ID is required');
    }

    await this.makeRequest<void>(`/${catalogId}`, {
      method: 'DELETE',
    });
  }

  async bulkImportYarnCatalogs(payload: BulkImportYarnCatalogRequest): Promise<BulkImportYarnCatalogResponse> {
    if (!payload?.yarnCatalogs || payload.yarnCatalogs.length === 0) {
      throw new Error('At least one yarn catalog is required for bulk import');
    }

    return this.makeRequest<BulkImportYarnCatalogResponse>('/bulk-import', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

const yarnCatalogService = new YarnCatalogService();

export default yarnCatalogService;

