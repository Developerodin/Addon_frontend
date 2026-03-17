import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

export type ContainerStatus = 'Active' | 'Inactive';

export type ContainerType = 'bag' | 'bigContainer' | 'container';

/** Populated article when GET /barcode/:barcode returns activeArticle as object */
export interface ContainerActiveArticlePopulated {
  _id: string;
  id?: string;
  articleNumber: string;
  orderId?: string;
  plannedQuantity?: number;
  floorQuantities?: Record<string, { received?: number; completed?: number; remaining?: number; transferred?: number }>;
  [key: string]: unknown;
}

export interface ContainerMaster {
  _id: string;
  barcode: string;
  containerName?: string;
  status: ContainerStatus;
  type?: ContainerType;
  tearWeight?: number;
  activeArticle?: string | ContainerActiveArticlePopulated;
  activeFloor?: string;
  /** Quantity from container barcode API response */
  quantity?: number;
  createdAt: string;
  updatedAt: string;
}

/** True when activeArticle is the populated object from API */
export function isPopulatedActiveArticle(
  activeArticle: string | ContainerActiveArticlePopulated | undefined
): activeArticle is ContainerActiveArticlePopulated {
  return Boolean(activeArticle && typeof activeArticle === 'object' && 'articleNumber' in activeArticle);
}

export interface ContainersListParams {
  status?: ContainerStatus;
  type?: ContainerType;
  search?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedContainers {
  results: ContainerMaster[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface CreateContainerBody {
  containerName?: string;
  status?: ContainerStatus;
  type?: ContainerType;
  tearWeight?: number;
}

export interface UpdateContainerBody {
  containerName?: string;
  status?: ContainerStatus;
  type?: ContainerType;
  tearWeight?: number;
}

/** Body for PATCH /barcode/:barcode – set active article, floor and optional quantity on container */
export interface UpdateContainerByBarcodeBody {
  activeArticle: string; // MongoDB ObjectId
  activeFloor: string;   // non-empty floor name
  quantity?: number;    // optional quantity (e.g. for knitting transfer)
}

const getAccessToken = (): string | null => {
  if (typeof document === 'undefined') return null;
  try {
    const t = Cookies.get('accessToken');
    if (t) return t;
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'accessToken') return decodeURIComponent(value);
    }
    return null;
  } catch {
    return null;
  }
};

class ContainersMasterService {
  private baseUrl = `${API_BASE_URL}/containers-masters`;

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = getAccessToken();
    if (!token) throw new Error('No access token found. Please login again.');
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    if (res.status === 204) return {} as T;
    return (await res.json()) as T;
  }

  async list(params?: ContainersListParams): Promise<PaginatedContainers> {
    const sp = new URLSearchParams();
    if (params?.status) sp.append('status', params.status);
    if (params?.type) sp.append('type', params.type);
    if (params?.search) sp.append('search', params.search);
    if (params?.sortBy) sp.append('sortBy', params.sortBy);
    if (params?.page != null) sp.append('page', String(params.page));
    if (params?.limit != null) sp.append('limit', String(params.limit));
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return this.request<PaginatedContainers>(q);
  }

  async getById(containerId: string): Promise<ContainerMaster> {
    if (!containerId) throw new Error('containerId is required');
    return this.request<ContainerMaster>(`/${containerId}`);
  }

  async getByBarcode(barcode: string): Promise<ContainerMaster> {
    if (!barcode) throw new Error('barcode is required');
    return this.request<ContainerMaster>(`/barcode/${encodeURIComponent(barcode)}`);
  }

  async create(body: CreateContainerBody): Promise<ContainerMaster> {
    return this.request<ContainerMaster>('', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async update(containerId: string, body: UpdateContainerBody): Promise<ContainerMaster> {
    if (!containerId) throw new Error('containerId is required');
    return this.request<ContainerMaster>(`/${containerId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  /** PATCH /barcode/:barcode – update container's activeArticle and activeFloor. Returns 404 if barcode not found, 400 if validation fails. */
  async updateByBarcode(barcode: string, body: UpdateContainerByBarcodeBody): Promise<ContainerMaster> {
    if (!barcode || !barcode.trim()) throw new Error('barcode is required');
    if (!body.activeArticle || !body.activeFloor?.trim()) throw new Error('activeArticle and activeFloor are required');
    return this.request<ContainerMaster>(`/barcode/${encodeURIComponent(barcode.trim())}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  /** PATCH /barcode/:barcode/clear-active – clear active article/floor on container. Call after Accept Article Quantity. */
  async clearActiveByBarcode(barcode: string): Promise<void> {
    if (!barcode || !barcode.trim()) throw new Error('barcode is required');
    await this.request<void>(`/barcode/${encodeURIComponent(barcode.trim())}/clear-active`, {
      method: 'PATCH',
    });
  }

  async remove(containerId: string): Promise<void> {
    if (!containerId) throw new Error('containerId is required');
    await this.request<void>(`/${containerId}`, { method: 'DELETE' });
  }

  /** POST /reset-active – reset active state for all containers. */
  async resetActive(): Promise<void> {
    await this.request<void>('/reset-active', { method: 'POST' });
  }
}

export const containersMasterService = new ContainersMasterService();
