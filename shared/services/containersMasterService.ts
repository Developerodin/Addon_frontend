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
  /** Set when container was staged from vendor pipeline — used for dispatch accept `vendorReceive`. */
  vendorProductionFlowId?: string;
  vendorProductionFlow?: string | { _id?: string; id?: string };
}

/** Normalized row for PATCH / merge helpers */
export type ActiveItemPatchRow = {
  article?: string;
  vendorProductionFlow?: string;
  quantity: number;
  transferItems?: Array<{ transferred: number; styleCode?: string; brand?: string }>;
};

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
    // Vendor pipeline containers may have `activeItems` rows without an `article` payload
    // (e.g. only vendorProductionFlow + transferItems). Guard to avoid runtime crashes.
    return container.activeItems.map((item) => {
      const art = (item as unknown as { article?: string | ContainerActiveArticlePopulated }).article;
      const articleId =
        typeof art === 'string'
          ? art.trim()
          : (art?._id ?? art?.id ?? '').trim();
      return {
        articleId,
        quantity: item.quantity ?? 0,
      };
    });
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

/**
 * Normalize article ref from an activeItems row to a Mongo id string.
 * @param article - String id or populated article object
 */
export function getArticleIdFromActiveItem(
  article: string | ContainerActiveArticlePopulated | undefined | null,
): string {
  if (!article) return '';
  if (typeof article === 'string') return article.trim();
  return String(article._id ?? article.id ?? '').trim();
}

/**
 * Normalize vendor production flow ref from an activeItems row.
 * @param vpf - String id or populated object
 */
export function getVendorFlowIdFromActiveItem(
  vpf: string | { _id?: string; id?: string } | undefined | null,
): string {
  if (!vpf) return '';
  if (typeof vpf === 'string') return vpf.trim();
  return String(vpf._id ?? vpf.id ?? '').trim();
}

/**
 * Map a container activeItems row to a PATCH-friendly shape.
 * @param item - Row from container API
 */
export function toActiveItemPatchRow(item: ContainerActiveItem): ActiveItemPatchRow | null {
  const article = getArticleIdFromActiveItem(item.article);
  const vendorProductionFlow =
    getVendorFlowIdFromActiveItem(item.vendorProductionFlow) ||
    (item.vendorProductionFlowId?.trim() ?? '');
  const quantity = Number(item.quantity ?? 0);
  if (quantity < 0.0001) return null;
  if (article) return { article, quantity };
  if (vendorProductionFlow) return { vendorProductionFlow, quantity };
  return null;
}

/**
 * Merge activeItems rows by article or vendorProductionFlow id.
 * @param items - Rows to merge
 * @param mode - `sum` merges quantities; `reject-duplicate` returns null if duplicate keys found
 */
export function mergeActiveItemsByArticle(
  items: ActiveItemPatchRow[],
  mode: 'sum' | 'reject-duplicate' = 'sum',
): ActiveItemPatchRow[] | null {
  const byKey = new Map<string, ActiveItemPatchRow>();
  for (const row of items) {
    if (!row || row.quantity < 0.0001) continue;
    const key = row.article
      ? `article:${row.article}`
      : row.vendorProductionFlow
        ? `vpf:${row.vendorProductionFlow}`
        : '';
    if (!key) continue;
    if (mode === 'reject-duplicate' && byKey.has(key)) return null;
    const existing = byKey.get(key);
    if (existing) {
      existing.quantity += row.quantity;
      if (!existing.transferItems?.length && row.transferItems?.length) {
        existing.transferItems = row.transferItems;
      }
    } else {
      byKey.set(key, { ...row, quantity: row.quantity });
    }
  }
  return Array.from(byKey.values());
}

/**
 * Returns true if any new article ids already exist in the container's activeItems.
 * @param existingItems - Current container rows
 * @param newArticleIds - Article ids being staged
 */
export function hasDuplicateArticlesInContainer(
  existingItems: ContainerActiveItem[] | undefined,
  newArticleIds: string[],
): boolean {
  if (!existingItems?.length || !newArticleIds.length) return false;
  const existing = new Set(
    existingItems.map((i) => getArticleIdFromActiveItem(i.article)).filter(Boolean),
  );
  return newArticleIds.some((id) => id && existing.has(id));
}

/** Display row for scan container drawer (merged by article id). */
export type GroupedContainerArticle = {
  articleId: string;
  quantity: number;
  article?: ContainerActiveArticlePopulated | null;
};

/**
 * Group container activeItems by article for display (sums duplicate rows).
 * @param container - Container from API
 */
export function groupContainerArticlesForDisplay(
  container: ContainerMaster | null | undefined,
): GroupedContainerArticle[] {
  if (!container) return [];
  const raw = getContainerArticles(container);
  const byId = new Map<string, GroupedContainerArticle>();
  for (const { articleId, quantity } of raw) {
    if (!articleId) continue;
    const existing = byId.get(articleId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      byId.set(articleId, { articleId, quantity });
    }
  }
  if (container.activeItems?.length) {
    for (const item of container.activeItems) {
      const id = getArticleIdFromActiveItem(item.article);
      if (!id || !byId.has(id)) continue;
      const grouped = byId.get(id)!;
      if (typeof item.article === 'object' && item.article) {
        grouped.article = item.article as ContainerActiveArticlePopulated;
      }
    }
  }
  return Array.from(byId.values());
}

/**
 * True when container already holds the same article ids and quantities being staged.
 * @param existingItems - Current container activeItems
 * @param newRows - Rows about to be staged
 */
export function isContainerAlreadyStagedForArticles(
  existingItems: ContainerActiveItem[] | undefined,
  newRows: ActiveItemPatchRow[],
): boolean {
  if (!existingItems?.length || !newRows.length) return false;
  const existing = existingItems
    .map((item) => toActiveItemPatchRow(item))
    .filter((row): row is ActiveItemPatchRow => row != null && !!row.article);
  if (existing.length !== newRows.length) return false;
  const existingMap = new Map(existing.map((r) => [r.article!, r.quantity]));
  return newRows.every((r) => r.article && existingMap.get(r.article) === r.quantity);
}

/**
 * Build deduped activeItems for container PATCH; rejects staging an article already in the container.
 * @param existingItems - Current container activeItems from API
 * @param newRows - New rows to stage
 * @param options.replace - Replace all rows (recovery / empty container) instead of merge-append
 */
export function buildStagedActiveItemsPayload(
  existingItems: ContainerActiveItem[] | undefined,
  newRows: ActiveItemPatchRow[],
  options?: { replace?: boolean },
): { ok: true; activeItems: ActiveItemPatchRow[] } | { ok: false; reason: 'duplicate-article' | 'invalid' } {
  if (!newRows.length) return { ok: false, reason: 'invalid' };

  const existing = (existingItems ?? [])
    .map((item) => toActiveItemPatchRow(item))
    .filter((row): row is ActiveItemPatchRow => row != null && !!row.article);

  if (options?.replace || existing.length === 0) {
    const merged = mergeActiveItemsByArticle(newRows, 'sum');
    if (!merged?.length) return { ok: false, reason: 'invalid' };
    return { ok: true, activeItems: merged };
  }

  const newArticleIds = newRows.map((r) => r.article).filter((id): id is string => !!id);
  if (hasDuplicateArticlesInContainer(existingItems, newArticleIds)) {
    return { ok: false, reason: 'duplicate-article' };
  }
  const merged = mergeActiveItemsByArticle([...existing, ...newRows], 'sum');
  if (!merged?.length) return { ok: false, reason: 'invalid' };
  return { ok: true, activeItems: merged };
}

const MONGO_OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

/**
 * Collects vendor production flow ids from container `activeItems` or populated article fields.
 */
export function collectVendorProductionFlowIdsFromContainer(
  container: ContainerMaster | null | undefined,
): string[] {
  if (!container) return [];
  const ids = new Set<string>();
  for (const item of container.activeItems ?? []) {
    const raw = item.vendorProductionFlowId?.trim();
    if (raw && MONGO_OBJECT_ID_RE.test(raw)) ids.add(raw);
  }
  const firstArt = getContainerFirstArticle(container);
  if (firstArt && typeof firstArt === 'object') {
    const rec = firstArt as Record<string, unknown>;
    for (const key of ['vendorProductionFlowId', 'vendorProductionFlow'] as const) {
      const v = rec[key];
      if (typeof v === 'string' && MONGO_OBJECT_ID_RE.test(v.trim())) ids.add(v.trim());
    }
  }
  return Array.from(ids);
}

/** One line for `vendorReceive.transferItems` on POST …/barcode/:barcode/accept (vendor floors). */
export type VendorReceiveTransferItemLine = {
  transferred: number;
  styleCode: string;
  brand: string;
};

/** Body fragment for vendor dispatch / FC / branding accept when backend expects `vendorReceive`. */
export type VendorReceiveAcceptPayload = {
  vendorProductionFlow?: string;
  quantity?: number;
  transferItems?: VendorReceiveTransferItemLine[];
};

export type PostContainerAcceptBody = {
  vendorReceive?: VendorReceiveAcceptPayload;
};

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

  /** GET /barcode/:barcode/with-articles — fuller payload (activeFloor, activeItems) per vendor API notes. */
  async getByBarcodeWithArticles(barcode: string): Promise<ContainerMaster> {
    if (!barcode || !barcode.trim()) throw new Error('barcode is required');
    return this.request<ContainerMaster>(
      `/barcode/${encodeURIComponent(barcode.trim())}/with-articles`,
    );
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

  /**
   * POST /barcode/:barcode/accept — updates received data for active items.
   * Optional body: e.g. `{ vendorReceive: { quantity, transferItems?, vendorProductionFlow? } }` on vendor floors.
   */
  async acceptByBarcode(barcode: string, body?: PostContainerAcceptBody): Promise<ContainerMaster> {
    if (!barcode || !barcode.trim()) throw new Error('barcode is required');
    return this.request<ContainerMaster>(`/barcode/${encodeURIComponent(barcode.trim())}/accept`, {
      method: 'POST',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
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
