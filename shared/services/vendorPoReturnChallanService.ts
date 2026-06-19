import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';
import type {
  VendorPoReturnChallanSnapshot,
  VendorPoReturnChallanSnapshotLine,
  VendorPoReturnChallanSnapshotTransport,
} from '@/shared/utils/vendorPoReturnChallanPrint';

export type VendorPoReturnChallanStatus = 'active';

export interface VendorPoReturnChallanBoxItem {
  vendorProductionFlowId?: string | null;
  productId?: string | null;
  productName: string;
  vendorCode: string;
  quantity: number;
}

export interface VendorPoReturnChallanBox {
  boxNumber: number;
  boxWeight: number;
  items: VendorPoReturnChallanBoxItem[];
}

export interface VendorPoReturnChallan extends VendorPoReturnChallanSnapshot {
  id: string;
  status: VendorPoReturnChallanStatus;
  vendorReturnId: string;
  vendorPurchaseOrder: string;
  lines: VendorPoReturnChallanSnapshotLine[];
  /** Operator-defined box packing for article-wise returns (serial, weight, packed articles). */
  returnBoxes?: VendorPoReturnChallanBox[];
  transport?: VendorPoReturnChallanSnapshotTransport;
  completedAt?: string;
  createdBy?: { user?: string | null; username?: string; email?: string };
  createdAt?: string;
  updatedAt?: string;
}

export interface VendorPoReturnChallanListResponse {
  results: VendorPoReturnChallan[];
  page?: number;
  limit?: number;
  totalPages?: number;
  totalResults?: number;
}

export interface VendorPoReturnChallanListParams {
  challanNumber?: string;
  vpoNumber?: string;
  vendorPurchaseOrder?: string;
  vendorName?: string;
  from?: string;
  to?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}

/**
 * ISO date string YYYY-MM-DD for date inputs (default start: 30 days ago).
 */
export function getDefaultVendorChallanListStartDate(): string {
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
export function getDefaultVendorChallanListEndDate(): string {
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

class VendorPoReturnChallanService {
  private baseURL = `${API_BASE_URL}/vendor-management/vendor-po-return-challans`;

  /**
   * Authenticated request to vendor PO return challan API.
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
      throw new Error((data as { message?: string })?.message || `Challan API error: ${response.status}`);
    }

    if (response.status === 204) return {} as T;
    return (await response.json()) as T;
  }

  /**
   * Paginated challan list with optional filters.
   */
  async listChallans(params: VendorPoReturnChallanListParams = {}): Promise<VendorPoReturnChallanListResponse> {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      search.append(key, String(value));
    });
    const query = search.toString();
    return this.request<VendorPoReturnChallanListResponse>(query ? `?${query}` : '');
  }

  /**
   * Fetch a single challan by id.
   */
  async getChallanById(challanId: string): Promise<VendorPoReturnChallan> {
    if (!challanId) throw new Error('Challan id is required');
    return this.request<VendorPoReturnChallan>(`/${challanId}`);
  }

  /**
   * Lookup challan by human-readable number.
   */
  async getChallanByNumber(challanNumber: string): Promise<VendorPoReturnChallan> {
    if (!challanNumber) throw new Error('Challan number is required');
    return this.request<VendorPoReturnChallan>(`/by-number/${encodeURIComponent(challanNumber)}`);
  }

  /**
   * All challans for a vendor purchase order.
   */
  async getChallansByVpo(vpoId: string): Promise<{ results: VendorPoReturnChallan[] }> {
    if (!vpoId) throw new Error('VPO id is required');
    return this.request<{ results: VendorPoReturnChallan[] }>(`/by-vpo/${vpoId}`);
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
  ): Promise<VendorPoReturnChallan> {
    if (!challanId) throw new Error('Challan id is required');
    return this.request<VendorPoReturnChallan>(`/${challanId}/transport`, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    });
  }

  /**
   * Save the box packing (serial / weight / packed articles + qty) for an article-wise return challan.
   */
  async patchChallanBoxes(
    challanId: string,
    boxes: VendorPoReturnChallanBox[]
  ): Promise<VendorPoReturnChallan> {
    if (!challanId) throw new Error('Challan id is required');
    return this.request<VendorPoReturnChallan>(`/${challanId}/boxes`, {
      method: 'PATCH',
      body: JSON.stringify({ boxes }),
    });
  }
}

const vendorPoReturnChallanService = new VendorPoReturnChallanService();
export default vendorPoReturnChallanService;
