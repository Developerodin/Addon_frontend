import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

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

// API Response Types
export interface YarnCatalogInfo {
  _id: string;
  yarnName: string;
  yarnType: string;
  status: string;
}

export interface StorageInfo {
  totalWeight: number;
  netWeight: number;
  numberOfCones: number;
}

export interface YarnInventoryResponse {
  _id?: string;
  yarn: YarnCatalogInfo;
  yarnId: string;
  yarnName: string;
  longTermStorage: StorageInfo;
  shortTermStorage: StorageInfo;
  inventoryStatus: 'in_stock' | 'low_stock' | 'soon_to_be_low';
  overbooked: boolean;
}

export interface YarnInventoryListResponse {
  results: YarnInventoryResponse[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface YarnInventoryQueryParams {
  yarn_id?: string;
  yarn_name?: string;
  inventory_status?: 'in_stock' | 'low_stock' | 'soon_to_be_low';
  overbooked?: boolean;
  sortBy?: string;
  limit?: number;
  page?: number;
}

export interface YarnRequisitionResponse {
  _id: string;
  yarnName: string;
  yarn: YarnCatalogInfo;
  minQty: number;
  availableQty: number;
  blockedQty: number;
  alertStatus: 'below_minimum' | 'overbooked' | null;
  poSent: boolean;
  created: string;
  lastUpdated: string;
}

export interface UpdateRequisitionStatusRequest {
  poSent: boolean;
}

class YarnInventoryService {
  private baseURL = `${API_BASE_URL}/yarn-management`;

  private buildHeaders(additional?: HeadersInit): HeadersInit {
    const token = getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...additional,
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
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

        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      if (response.status === 204) {
        return {} as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      console.error('Yarn Inventory API Error:', error);
      throw error;
    }
  }

  // Yarn Inventory APIs
  async getYarnInventories(
    params: YarnInventoryQueryParams = {}
  ): Promise<YarnInventoryListResponse> {
    const queryParams = new URLSearchParams();

    if (params.yarn_id) queryParams.append('yarn_id', params.yarn_id);
    if (params.yarn_name) queryParams.append('yarn_name', params.yarn_name);
    if (params.inventory_status)
      queryParams.append('inventory_status', params.inventory_status);
    if (params.overbooked !== undefined)
      queryParams.append('overbooked', params.overbooked.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.page) queryParams.append('page', params.page.toString());

    const queryString = queryParams.toString();
    const endpoint = `/yarn-inventories${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest<YarnInventoryListResponse>(endpoint);
  }

  async getYarnInventoryById(
    inventoryId: string
  ): Promise<YarnInventoryResponse> {
    return this.makeRequest<YarnInventoryResponse>(
      `/yarn-inventories/${inventoryId}`
    );
  }

  async getYarnInventoryByYarnId(
    yarnId: string
  ): Promise<YarnInventoryResponse> {
    return this.makeRequest<YarnInventoryResponse>(
      `/yarn-inventories/yarn/${yarnId}`
    );
  }

  // Yarn Requisition APIs
  async getYarnRequisitions(params: {
    startDate: string;
    endDate: string;
    poSent?: boolean;
  }): Promise<YarnRequisitionResponse[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('startDate', params.startDate);
    queryParams.append('endDate', params.endDate);
    if (params.poSent !== undefined)
      queryParams.append('poSent', params.poSent.toString());

    return this.makeRequest<YarnRequisitionResponse[]>(
      `/yarn-requisitions?${queryParams.toString()}`
    );
  }

  async updateRequisitionStatus(
    requisitionId: string,
    data: UpdateRequisitionStatusRequest
  ): Promise<YarnRequisitionResponse> {
    return this.makeRequest<YarnRequisitionResponse>(
      `/yarn-requisitions/${requisitionId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  }
}

export const yarnInventoryService = new YarnInventoryService();

