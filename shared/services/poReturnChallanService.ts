import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';
import type {
  ChallanSnapshot,
  ChallanSnapshotLine,
  ChallanSnapshotTransport,
} from '@/shared/utils/poReturnChallanPrint';

export type PoReturnChallanStatus = 'active';

export interface PoReturnChallan extends ChallanSnapshot {
  id: string;
  status: PoReturnChallanStatus;
  vendorReturnId: string;
  purchaseOrder: string;
  lines: ChallanSnapshotLine[];
  transport?: ChallanSnapshotTransport;
  completedAt?: string;
  isLegacy?: boolean;
  createdBy?: { user?: string | null; username?: string; email?: string };
  createdAt?: string;
  updatedAt?: string;
}

export interface PoReturnChallanListResponse {
  results: PoReturnChallan[];
  page?: number;
  limit?: number;
  totalPages?: number;
  totalResults?: number;
}

export interface PoReturnChallanListParams {
  challanNumber?: string;
  poNumber?: string;
  purchaseOrder?: string;
  supplierName?: string;
  from?: string;
  to?: string;
  status?: PoReturnChallanStatus;
  sortBy?: string;
  page?: number;
  limit?: number;
}

/**
 * ISO date string YYYY-MM-DD for date inputs.
 */
export function getDefaultChallanListStartDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Today's date as YYYY-MM-DD.
 */
export function getDefaultChallanListEndDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return (
      Cookies.get('accessToken') ||
      Cookies.get('token') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('token')
    );
  } catch {
    return null;
  }
};

class PoReturnChallanService {
  private baseURL = `${API_BASE_URL}/yarn-management/po-return-challans`;

  /**
   * Authenticated request to PO return challan API.
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
      throw new Error(data?.message || `Challan API error: ${response.status}`);
    }

    if (response.status === 204) return {} as T;
    return (await response.json()) as T;
  }

  /**
   * Paginated challan list with optional filters.
   */
  async listChallans(params: PoReturnChallanListParams = {}): Promise<PoReturnChallanListResponse> {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      search.append(key, String(value));
    });
    const query = search.toString();
    return this.request<PoReturnChallanListResponse>(query ? `?${query}` : '');
  }

  /**
   * Fetch a single challan by id.
   */
  async getChallanById(challanId: string): Promise<PoReturnChallan> {
    if (!challanId) throw new Error('Challan id is required');
    return this.request<PoReturnChallan>(`/${challanId}`);
  }

  /**
   * Lookup challan by human-readable number.
   */
  async getChallanByNumber(challanNumber: string): Promise<PoReturnChallan> {
    if (!challanNumber) throw new Error('Challan number is required');
    return this.request<PoReturnChallan>(`/by-number/${encodeURIComponent(challanNumber)}`);
  }

  /**
   * All challans for a purchase order.
   */
  async getChallansByPO(purchaseOrderId: string): Promise<{ results: PoReturnChallan[] }> {
    if (!purchaseOrderId) throw new Error('Purchase order id is required');
    return this.request<{ results: PoReturnChallan[] }>(`/by-po/${purchaseOrderId}`);
  }

  /**
   * Patch transport metadata on an issued challan.
   */
  async patchChallanTransport(
    challanId: string,
    fields: {
      vehicleNo?: string;
      driverName?: string;
      dispatchDate?: string;
      transportNotes?: string;
    }
  ): Promise<PoReturnChallan> {
    if (!challanId) throw new Error('Challan id is required');
    return this.request<PoReturnChallan>(`/${challanId}/transport`, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    });
  }
}

const poReturnChallanService = new PoReturnChallanService();
export default poReturnChallanService;
