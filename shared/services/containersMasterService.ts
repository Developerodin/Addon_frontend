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

/** Single item in activeItems array (article + quantity) */
export interface ContainerActiveItem {
  article: string | ContainerActiveArticlePopulated;
  quantity: number;
}

export interface ContainerMaster {
  _id: string;
  barcode: string;
  containerName?: string;
  status: ContainerStatus;
  type?: ContainerType;
  tearWeight?: number;
  /** @deprecated Use activeItems. Kept for backward compat. */
  activeArticle?: string | ContainerActiveArticlePopulated;
  activeFloor?: string;
  /** Array of article + quantity. New schema. */
  activeItems?: ContainerActiveItem[];
  /** Virtual: sum of activeItems.quantity. From API response. */
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

/** True when container has activeItems (new schema) or legacy activeArticle */
export function hasActiveItems(container: ContainerMaster | null | undefined): boolean {
  if (!container) return false;
  if (container.activeItems && container.activeItems.length > 0) return true;
  return !!(
    container.activeFloor?.trim() ||
    isPopulatedActiveArticle(container.activeArticle as ContainerActiveArticlePopulated | undefined) ||
    (typeof container.activeArticle === 'string' && container.activeArticle.trim())
  );
}

/** Get first article from container (activeItems[0] or legacy activeArticle) for display */
export function getContainerFirstArticle(container: ContainerMaster | null | undefined): string | ContainerActiveArticlePopulated | null {
  if (!container) return null;
  const first = container.activeItems?.[0];
  if (first) return first.article;
  return (container.activeArticle as string | ContainerActiveArticlePopulated | undefined) ?? null;
}

/** Get all articles from container for accept flow */
export function getContainerArticles(container: ContainerMaster | null | undefined): Array<{ articleId: string; quantity: number }> {
  if (!container) return [];
  if (container.activeItems && container.activeItems.length > 0) {
    return container.activeItems.map((item) => ({
      articleId: typeof item.article === 'string' ? item.article : (item.article._id ?? item.article.id ?? ''),
      quantity: item.quantity ?? 0,
    }));
  }
  const legacy = container.activeArticle;
  if (typeof legacy === 'string' && legacy.trim()) {
    return [{ articleId: legacy.trim(), quantity: container.quantity ?? 0 }];
  }
  if (legacy && typeof legacy === 'object' && 'articleNumber' in legacy) {
    const id = (legacy as ContainerActiveArticlePopulated)._id ?? (legacy as ContainerActiveArticlePopulated).id ?? '';
    return id ? [{ articleId: id, quantity: container.quantity ?? 0 }] : [];
  }
  return [];
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

/** GET /by-floor/:floor/with-articles?status=ACTIVE */
export interface ContainersByFloorWithArticlesResponse {
  floor: string;
  count: number;
  containers: ContainerMaster[];
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

/** Body for PATCH /barcode/:barcode – full replace with activeItems */
export interface UpdateContainerByBarcodeBodyFull {
  activeFloor: string;
  activeItems: Array<{ article: string; quantity: number }>;
}

/** Body for PATCH /barcode/:barcode – append one item */
export interface UpdateContainerByBarcodeBodyAddItem {
  addItem: { article: string; quantity: number };
}

export type UpdateContainerByBarcodeBody =
  | UpdateContainerByBarcodeBodyFull
  | UpdateContainerByBarcodeBodyAddItem;

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

  /** GET /:containerId/with-articles – container with populated article objects (articleNumber, etc.) */
  async getWithArticles(containerId: string): Promise<ContainerMaster> {
    if (!containerId) throw new Error('containerId is required');
    return this.request<ContainerMaster>(`/${containerId}/with-articles`);
  }

  async getByBarcode(barcode: string): Promise<ContainerMaster> {
    if (!barcode) throw new Error('barcode is required');
    return this.request<ContainerMaster>(`/barcode/${encodeURIComponent(barcode)}`);
  }

  /**
   * GET /by-floor/:floor/with-articles — containers on a floor with populated articles.
   * Encode floor names with spaces/special chars (e.g. Final%20Checking).
   */
  async getByFloorWithArticles(
    floorName: string,
    params?: { status?: string }
  ): Promise<ContainersByFloorWithArticlesResponse> {
    const floor = floorName?.trim();
    if (!floor) throw new Error('floorName is required');
    const sp = new URLSearchParams();
    if (params?.status) sp.append('status', params.status);
    const q = sp.toString() ? `?${sp.toString()}` : '';
    const path = `/by-floor/${encodeURIComponent(floor)}/with-articles${q}`;
    return this.request<ContainersByFloorWithArticlesResponse>(path);
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

  /** PATCH /barcode/:barcode – update container. Use activeFloor+activeItems (full) or addItem (append). */
  async updateByBarcode(barcode: string, body: UpdateContainerByBarcodeBody): Promise<ContainerMaster> {
    if (!barcode || !barcode.trim()) throw new Error('barcode is required');
    const isFull = 'activeItems' in body;
    const isAdd = 'addItem' in body;
    if (isFull) {
      if (!body.activeFloor?.trim() || !Array.isArray(body.activeItems)) throw new Error('activeFloor and activeItems are required');
    } else if (isAdd) {
      if (!body.addItem?.article || body.addItem.quantity == null) throw new Error('addItem.article and addItem.quantity are required');
    } else {
      throw new Error('Provide either { activeFloor, activeItems } or { addItem }');
    }
    return this.request<ContainerMaster>(`/barcode/${encodeURIComponent(barcode.trim())}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  /** POST /barcode/:barcode/accept – updates received data for all articles in activeItems. */
  async acceptByBarcode(barcode: string): Promise<ContainerMaster> {
    if (!barcode || !barcode.trim()) throw new Error('barcode is required');
    return this.request<ContainerMaster>(`/barcode/${encodeURIComponent(barcode.trim())}/accept`, {
      method: 'POST',
    });
  }

  /** PATCH /barcode/:barcode/clear-active – clear active items on container. Call after Accept if needed. */
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
