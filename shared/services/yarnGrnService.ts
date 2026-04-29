import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';
import type { GrnSnapshot, GrnSnapshotItem, GrnSnapshotLot } from '@/shared/utils/grnPrint';

/**
 * Domain types matching the backend YarnGrn model. Re-exporting GrnSnapshot
 * pieces here keeps `grnPrint.ts` independent of the API client.
 */
export type GrnStatus = 'active' | 'superseded' | 'voided';

export interface GrnRevisionDiffEntry {
  field: string;
  before: unknown;
  after: unknown;
}

export interface YarnGrn extends GrnSnapshot {
  id: string;
  status: GrnStatus;
  baseGrnNumber: string;
  revisionOf?: string | null;
  revisionNo: number;
  revisionReason?: string;
  revisionDiff?: GrnRevisionDiffEntry[];
  supersededAt?: string | null;
  supersededByGrn?: string | null;
  purchaseOrder: string;
  isLegacy?: boolean;
  createdBy?: { user?: string | null; username?: string; email?: string };
  createdAt?: string;
  updatedAt?: string;
  lots: GrnSnapshotLot[];
  items: GrnSnapshotItem[];
  parent?: { id?: string; grnNumber?: string; revisionNo?: number; status?: GrnStatus } | null;
}

export interface YarnGrnListResponse {
  results: YarnGrn[];
  page?: number;
  limit?: number;
  totalPages?: number;
  totalResults?: number;
}

export interface YarnGrnListParams {
  grnNumber?: string;
  poNumber?: string;
  purchaseOrder?: string;
  lotNumber?: string;
  supplierName?: string;
  createdBy?: string;
  from?: string;
  to?: string;
  status?: GrnStatus;
  includeSuperseded?: boolean;
  isLegacy?: boolean;
  sortBy?: string;
  page?: number;
  limit?: number;
}

/**
 * Read the JWT issued by the login flow. Mirrors the convention used by every
 * other service in the codebase (storageSlotService, yarnConeService, etc.).
 *
 * The cookie is named `accessToken` (set by /api/auth/set-cookie, NOT httpOnly
 * so JS can read it). Falls back to legacy storage keys for resilience across
 * old sessions, but the canonical source is the cookie.
 */
const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const fromCookie =
      Cookies.get('accessToken') ||
      Cookies.get('token'); // legacy key — kept for old sessions
    if (fromCookie) return fromCookie;
    return (
      localStorage.getItem('accessToken') ||
      localStorage.getItem('token') ||
      null
    );
  } catch (err) {
    console.error('Error getting access token:', err);
    return null;
  }
};

class YarnGrnService {
  private baseURL = `${API_BASE_URL}/yarn-management/yarn-grns`;

  /**
   * Issue an authenticated request to the GRN API. Centralised so all callers
   * surface the same error messages and 401 handling.
   * @param endpoint - path appended to baseURL (must start with `/` or be empty)
   * @param options - fetch options
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = getAccessToken();
    if (!token) throw new Error('No access token found. Please login again.');

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) throw new Error('Authentication failed. Please login again.');
      throw new Error(data?.message || `GRN API error: ${response.status}`);
    }

    if (response.status === 204) return {} as T;
    return (await response.json()) as T;
  }

  /**
   * Fetch a paginated list of GRNs filtered by the supplied params.
   * Empty/null/undefined params are dropped.
   * @param params
   */
  async listGrns(params: YarnGrnListParams = {}): Promise<YarnGrnListResponse> {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      search.append(key, String(value));
    });
    const query = search.toString();
    return this.request<YarnGrnListResponse>(query ? `?${query}` : '');
  }

  /** Fetch a single GRN (with parent metadata if it's a revision). */
  async getGrnById(grnId: string): Promise<YarnGrn> {
    if (!grnId) throw new Error('GRN id is required');
    return this.request<YarnGrn>(`/${grnId}`);
  }

  /** Lookup a GRN by its human-friendly number (`GRN-2026-0042` or `…-R1`). */
  async getGrnByNumber(grnNumber: string): Promise<YarnGrn> {
    if (!grnNumber) throw new Error('GRN number is required');
    return this.request<YarnGrn>(`/by-number/${encodeURIComponent(grnNumber)}`);
  }

  /** Full revision chain (oldest → newest) for any GRN id within the chain. */
  async getRevisions(grnId: string): Promise<{ results: YarnGrn[] }> {
    if (!grnId) throw new Error('GRN id is required');
    return this.request<{ results: YarnGrn[] }>(`/${grnId}/revisions`);
  }

  /** All GRNs (latest active by default) issued for a Yarn PO. */
  async getGrnsByPO(
    purchaseOrderId: string,
    opts: { includeSuperseded?: boolean } = {}
  ): Promise<{ results: YarnGrn[] }> {
    if (!purchaseOrderId) throw new Error('Purchase order id is required');
    const qs = opts.includeSuperseded ? '?includeSuperseded=true' : '';
    return this.request<{ results: YarnGrn[] }>(`/by-po/${purchaseOrderId}${qs}`);
  }

  /** All GRNs that contain a given lot number. */
  async getGrnsByLot(
    lotNumber: string,
    opts: { includeSuperseded?: boolean } = {}
  ): Promise<{ results: YarnGrn[] }> {
    if (!lotNumber) throw new Error('Lot number is required');
    const qs = opts.includeSuperseded ? '?includeSuperseded=true' : '';
    return this.request<{ results: YarnGrn[] }>(`/by-lot/${encodeURIComponent(lotNumber)}${qs}`);
  }

  /**
   * Patch header-only metadata on an existing GRN (vendor invoice no/date,
   * discrepancy notes, narration). Does not mint a revision — these fields
   * are post-issuance metadata, not part of the materially-immutable lot
   * snapshot.
   */
  async updateGrnHeader(
    grnId: string,
    fields: {
      vendorInvoiceNo?: string;
      vendorInvoiceDate?: string;
      discrepancyDetails?: string;
      notes?: string;
    }
  ): Promise<YarnGrn> {
    if (!grnId) throw new Error('GRN id is required');
    const cleaned = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined)
    );
    if (Object.keys(cleaned).length === 0) {
      throw new Error('At least one header field is required');
    }
    return this.request<YarnGrn>(`/${grnId}/header`, {
      method: 'PATCH',
      body: JSON.stringify(cleaned),
    });
  }

  /**
   * Idempotent guard for the Print Summary flow. Returns the latest active GRN
   * for the PO; if any received lots are not yet on a GRN, issues a fresh GRN
   * for them first. Safe to call repeatedly — won't duplicate.
   *
   * Use this BEFORE printing so the user never sees a blank GRN no/date.
   * @param purchaseOrderId
   * @param extras - optional vendor invoice / discrepancy fields baked into the
   *                 new GRN if one is created
   */
  async ensureGrnForPo(
    purchaseOrderId: string,
    extras: {
      vendorInvoiceNo?: string;
      vendorInvoiceDate?: string;
      discrepancyDetails?: string;
      notes?: string;
    } = {}
  ): Promise<{
    createdGrn: YarnGrn | null;
    latestGrn: YarnGrn | null;
    allGrns: YarnGrn[];
    message: string;
  }> {
    if (!purchaseOrderId) throw new Error('Purchase order id is required');
    const cleanExtras = Object.fromEntries(
      Object.entries(extras).filter(([, v]) => v !== undefined && v !== null && v !== '')
    );
    return this.request<{
      createdGrn: YarnGrn | null;
      latestGrn: YarnGrn | null;
      allGrns: YarnGrn[];
      message: string;
    }>(`/by-po/${purchaseOrderId}/ensure`, {
      method: 'POST',
      body: JSON.stringify(cleanExtras),
    });
  }
}

const yarnGrnService = new YarnGrnService();
export default yarnGrnService;
