import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

export type VendorGrnStatus = 'active' | 'superseded' | 'voided';

export interface VendorGrnItem {
  poItem?: string;
  productId?: string;
  productName?: string;
  vendorCode?: string;
  expectedQty: number;
  scanAcceptedQty: number;
  verifiedQty: number;
  m1: number;
  m2: number;
  m3: number;
  m4: number;
  varianceQty: number;
  vendorProductionFlowId?: string;
  boxIds?: string[];
}

export interface VendorGrnLot {
  lotNumber: string;
  numberOfBoxes: number;
  totalUnits: number;
  items: VendorGrnItem[];
}

export interface VendorGrnTotals {
  expected: number;
  verified: number;
  variance: number;
  m1: number;
  m2: number;
  m3: number;
  m4: number;
}

export interface VendorGrn {
  id: string;
  grnNumber: string;
  grnDate: string;
  status: VendorGrnStatus;
  baseGrnNumber: string;
  revisionOf?: string | null;
  revisionNo: number;
  revisionReason?: string;
  vendorPurchaseOrder: string;
  vpoNumber: string;
  vpoDate?: string;
  vendor?: {
    vendorId?: string;
    vendorName?: string;
    vendorCode?: string;
    gstin?: string;
  };
  lots: VendorGrnLot[];
  totals: VendorGrnTotals;
  secondaryCheckingCompletedAt?: string | null;
  incompleteClassification?: boolean;
  discrepancyDetails?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VendorGrnListResponse {
  results: VendorGrn[];
  page?: number;
  limit?: number;
  totalPages?: number;
  totalResults?: number;
}

export interface VendorGrnListParams {
  grnNumber?: string;
  vpoNumber?: string;
  vendorPurchaseOrder?: string;
  lotNumber?: string;
  vendorName?: string;
  from?: string;
  to?: string;
  status?: VendorGrnStatus;
  includeSuperseded?: boolean;
  sortBy?: string;
  page?: number;
  limit?: number;
}

/**
 * Read JWT from cookie/localStorage (same convention as other services).
 */
const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return (
      Cookies.get('accessToken') ||
      Cookies.get('token') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('token') ||
      null
    );
  } catch {
    return null;
  }
};

class VendorGrnService {
  private baseURL = `${API_BASE_URL}/vendor-management/vendor-grns`;

  /**
   * Authenticated fetch wrapper for vendor GRN API.
   * @param endpoint - path suffix
   * @param options - fetch init
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = getAccessToken();
    if (!token) throw new Error('No access token found. Please login again.');

    const res = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Request failed (${res.status})`);
    }
    return res.json() as Promise<T>;
  }

  /**
   * List vendor GRNs with optional filters.
   * @param params - query filters
   */
  async list(params: VendorGrnListParams = {}): Promise<VendorGrnListResponse> {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    });
    const q = qs.toString();
    return this.request<VendorGrnListResponse>(q ? `?${q}` : '');
  }

  /**
   * Fetch a single GRN by Mongo id.
   * @param id - GRN document id
   */
  async getById(id: string): Promise<VendorGrn> {
    return this.request<VendorGrn>(`/${id}`);
  }

  /**
   * Fetch GRN by human-readable number.
   * @param grnNumber - e.g. VGRN-2026-0001
   */
  async getByNumber(grnNumber: string): Promise<VendorGrn> {
    return this.request<VendorGrn>(`/by-number/${encodeURIComponent(grnNumber)}`);
  }

  /**
   * Active GRN linked to a production flow (if any).
   * @param flowId - vendor production flow id
   */
  async getActiveForFlow(flowId: string): Promise<VendorGrn | null> {
    const data = await this.request<{ grn: VendorGrn | null }>(
      `/by-flow/${flowId}/active`,
    );
    return data.grn;
  }

  /**
   * Manually issue (or revise) GRN from secondary checking flow.
   * @param flowId - vendor production flow id
   * @param body - issue options
   */
  async issueFromFlow(
    flowId: string,
    body: {
      allowIncomplete?: boolean;
      discrepancyDetails?: string;
      notes?: string;
    } = {},
  ): Promise<VendorGrn> {
    return this.request<VendorGrn>(`/by-flow/${flowId}/issue`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * GRNs for a vendor purchase order.
   * @param vpoId - VPO id
   */
  async getByVpo(vpoId: string): Promise<VendorGrn[]> {
    const data = await this.request<{ results: VendorGrn[] }>(`/by-po/${vpoId}`);
    return data.results;
  }
}

const vendorGrnService = new VendorGrnService();
export default vendorGrnService;
