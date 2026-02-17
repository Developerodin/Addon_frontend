import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

/** Allowed container floor values from API */
export const CONTAINER_FLOORS = [
  'Knitting',
  'Linking',
  'Checking',
  'Washing',
  'Boarding',
  'Silicon',
  'Secondary Checking',
  'Branding',
  'Final Checking',
  'Warehouse',
  'Dispatch',
] as const;

export type ContainerFloor = (typeof CONTAINER_FLOORS)[number];
export type ContainerStatus = 'Active' | 'Inactive';

export interface ContainerMaster {
  _id: string;
  barcode: string;
  containerName?: string;
  containerFloor: ContainerFloor;
  status: ContainerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ContainersListParams {
  containerFloor?: ContainerFloor;
  status?: ContainerStatus;
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
  containerFloor: ContainerFloor;
  containerName?: string;
  status?: ContainerStatus;
}

export interface UpdateContainerBody {
  containerFloor?: ContainerFloor;
  containerName?: string;
  status?: ContainerStatus;
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
    if (params?.containerFloor) sp.append('containerFloor', params.containerFloor);
    if (params?.status) sp.append('status', params.status);
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

  async remove(containerId: string): Promise<void> {
    if (!containerId) throw new Error('containerId is required');
    await this.request<void>(`/${containerId}`, { method: 'DELETE' });
  }
}

export const containersMasterService = new ContainersMasterService();
