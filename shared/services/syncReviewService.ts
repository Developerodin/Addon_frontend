import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

export type SyncDecision = 'KEEP_LOCAL' | 'KEEP_REMOTE' | 'MANUAL';

export interface ReviewConflict {
  id: string;
  entityType: string;
  aggregateId: string;
  aggregateVersion: number | null;
  status: string;
  reason: string;
  base: Record<string, unknown>;
  factory: Record<string, unknown>;
  cloud: Record<string, unknown>;
  factorySiteId: string | null;
  cloudSiteId: string | null;
  changedKeys: string[];
  nonOverlappingKeys: string[];
  createdAt: string;
}

export interface ReviewQueue {
  openConflicts: number;
  rebased: number;
  inboxPending: number;
  inboxProbe: number;
  inboxLive: number;
  outboxPending: number;
}

export interface ConflictResolutionMeta {
  decision: SyncDecision | null;
  note: string;
  recordedAt: string | null;
  recordedByUserId: string | null;
  recordedBySiteId: string | null;
}

export interface ConflictHistoryRow {
  id: string;
  entityType: string;
  aggregateId: string;
  aggregateVersion: number | null;
  changedKeys: string[];
  factorySiteId: string | null;
  cloudSiteId: string | null;
  createdAt: string;
  resolution: ConflictResolutionMeta;
}

export interface ListOpenConflictsResponse {
  siteId: string | null;
  conflicts: ReviewConflict[];
  queue: ReviewQueue;
}

export interface ListConflictHistoryResponse {
  siteId: string | null;
  results: ConflictHistoryRow[];
  page: number;
  limit: number;
  totalResults: number;
  totalPages: number;
}

function getAccessToken(): string | null {
  if (typeof document === 'undefined') return null;
  try {
    return Cookies.get('accessToken') || localStorage.getItem('token');
  } catch {
    return null;
  }
}

class SyncReviewService {
  private baseURL = `${API_BASE_URL}/sync-review`;

  private async makeRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = getAccessToken();
    if (!token) {
      throw new Error('No access token found. Please login again.');
    }
    const res = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body?.message || `Request failed (HTTP ${res.status})`);
    }
    return body as T;
  }

  async listOpenConflicts(limit = 50): Promise<ListOpenConflictsResponse> {
    const q = new URLSearchParams({ limit: String(limit) });
    return this.makeRequest<ListOpenConflictsResponse>(`/conflicts?${q}`);
  }

  async resolveConflict(id: string, decision: SyncDecision, note = ''): Promise<void> {
    await this.makeRequest(`/conflicts/${encodeURIComponent(id)}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ decision, note }),
    });
  }

  async listConflictHistory(params?: {
    page?: number;
    limit?: number;
    entityType?: string;
    aggregateId?: string;
  }): Promise<ListConflictHistoryResponse> {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.entityType?.trim()) q.set('entityType', params.entityType.trim());
    if (params?.aggregateId?.trim()) q.set('aggregateId', params.aggregateId.trim());
    const query = q.toString() ? `?${q}` : '';
    return this.makeRequest<ListConflictHistoryResponse>(`/conflicts/history${query}`);
  }
}

export const syncReviewService = new SyncReviewService();
