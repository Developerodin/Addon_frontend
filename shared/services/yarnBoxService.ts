import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

export interface QCData {
  date: string;
  remarks?: string;
  status: 'qc_approved' | 'qc_rejected';
  user: string;
  username: string;
}

export interface YarnBox {
  _id?: string;
  id?: string;
  boxId: string;
  poNumber: string;
  barcode: string;
  yarnName?: string;
  shadeCode?: string;
  /** Supplier id for tear-weight lookup (from backend generate-by-box response). */
  supplierId?: string;
  /** Display name (from API or supplier.brandName). */
  supplierName?: string;
  supplier?: { _id?: string; id?: string; brandName?: string; name?: string };
  orderQty?: number;
  lotNumber?: string;
  /** Gross weight from scale (auto-captured). */
  grossWeight?: number;
  /** Net/box weight (user-entered). */
  boxWeight?: number;
  numberOfCones?: number;
  receivedDate?: string;
  orderDate?: string;
  conesIssued?: boolean;
  tearweight?: number;
  storedStatus?: boolean;
  storageLocation?: string;
  createdAt?: string;
  updatedAt?: string;
  qcData?: QCData;
  coneData?: {
    conesIssued: boolean;
    coneIssueDate?: string;
    coneIssueBy?: {
      username: string;
      user: string;
    };
    numberOfCones: number;
  };
  /** From GET when `include_inactive=true`: false means read-only on PO receive process. */
  isActiveForProcessing?: boolean;
}

export interface UpdateYarnBoxPayload {
  yarnName?: string;
  shadeCode?: string;
  orderQty?: number;
  lotNumber?: string;
  grossWeight?: number;
  boxWeight?: number;
  numberOfCones?: number;
  storageLocation?: string;
  storedStatus?: boolean;
}

export interface UpdateQCStatusPayload {
  poNumber: string;
  status: 'qc_approved' | 'qc_rejected';
  user: string;
  username: string;
  date: string;
  remarks?: string;
  mediaUrl?: Record<string, string>;
}

export interface YarnBoxListResponse {
  results: YarnBox[];
  page?: number;
  limit?: number;
  totalPages?: number;
  totalResults?: number;
}

export interface YarnBoxQueryParams {
  po_number?: string;
  yarn_name?: string;
  cones_issued?: boolean;
  stored_status?: boolean;
  /** Backend: return all boxes for a PO; each includes `isActiveForProcessing`. */
  include_inactive?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateYarnBoxPayload {
  poNumber: string;
  receivedDate: string;
  orderDate: string;
  yarnName: string;
  shadeCode: string;
  orderQty: number;
  boxWeight: number;
  numberOfCones: number;
  numberofboxes: number;
}

export interface LotDetail {
  lotNumber: string;
  numberOfBoxes: number;
}

export interface CreateBulkYarnBoxPayload {
  poNumber: string;
  lotDetails: LotDetail[];
}

export interface TransferBoxesPayload {
  boxIds: string[];
  toStorageLocation: string;
  transferDate?: string;
}

export interface TransferBoxesResponse {
  message: string;
  transferType: 'LT_TO_ST' | 'LT_TO_LT' | 'ST_TO_ST';
  boxesTransferred: number;
  results: Array<{
    yarnName: string;
    yarnId: string;
    boxIds: string[];
    boxesTransferred: number;
    totalWeight: number;
    totalNetWeight: number;
    totalCones: number;
    fromLocations: string[];
    toStorageLocation: string;
    transactionId: string;
  }>;
}

/** Payload item for bulk match update (Excel upload). */
export interface BulkMatchUpdateItem {
  lotNumber: string;
  poNumber: string;
  yarnName: string;
  shadeCode: string;
  grossWeight?: number;
  boxWeight: number;
  numberOfCones: number;
  barcode: string;
  boxId: string;
}

export interface BulkMatchUpdatePayload {
  items: BulkMatchUpdateItem[];
}

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

class YarnBoxService {
  private baseURL = `${API_BASE_URL}/yarn-management/yarn-boxes`;

  private buildHeaders(additional?: HeadersInit): HeadersInit {
    const token = getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...additional,
    };
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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

        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      if (response.status === 204) {
        return {} as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      console.error('Yarn Box API Error:', error);
      throw error;
    }
  }

  async getYarnBoxes(params: YarnBoxQueryParams = {}): Promise<YarnBoxListResponse> {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    const query = searchParams.toString();
    const endpoint = query ? `?${query}` : '';

    return this.makeRequest<YarnBoxListResponse>(endpoint);
  }

  async createYarnBox(payload: CreateYarnBoxPayload): Promise<YarnBox> {
    return this.makeRequest<YarnBox>('', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async createYarnBoxes(payloads: CreateYarnBoxPayload[]): Promise<YarnBox[]> {
    // Create boxes for each item
    const promises = payloads.map(payload => this.createYarnBox(payload));
    return Promise.all(promises);
  }

  async createBulkYarnBoxes(payload: CreateBulkYarnBoxPayload): Promise<YarnBox[]> {
    return this.makeRequest<YarnBox[]>('/bulk', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getYarnBoxById(boxId: string): Promise<YarnBox> {
    if (!boxId) {
      throw new Error('Box ID is required');
    }
    return this.makeRequest<YarnBox>(`/${boxId}`);
  }

  /**
   * GET /barcode/:barcode — optional `includeInactive` includes boxes after full ST transfer
   * (default list API hides them via active filter on the server).
   */
  async getYarnBoxByBarcode(
    barcode: string,
    options?: { includeInactive?: boolean }
  ): Promise<YarnBox> {
    if (!barcode) {
      throw new Error('Barcode is required');
    }
    const qs =
      options?.includeInactive === true ? '?include_inactive=true' : '';
    return this.makeRequest<YarnBox>(
      `/barcode/${encodeURIComponent(barcode)}${qs}`
    );
  }

  /** GET /by-storage-location/:storageLocation - Boxes at given storage location (no limit) */
  async getBoxesByStorageLocation(storageLocation: string): Promise<YarnBox[]> {
    if (!storageLocation) throw new Error('Storage location is required');
    const data = await this.makeRequest<YarnBox[] | { results?: YarnBox[] }>(
      `/by-storage-location/${encodeURIComponent(storageLocation)}`
    );
    return Array.isArray(data) ? data : (data.results ?? []);
  }

  /**
   * GET /without-storage-location - Boxes without a storage location.
   * @param options.yarnName - Optional exact yarn name filter (case-insensitive on the server).
   */
  async getBoxesWithoutStorageLocation(options?: {
    yarnName?: string;
  }): Promise<YarnBox[]> {
    const params = new URLSearchParams();
    const yarnName = options?.yarnName?.trim();
    if (yarnName) params.append('yarn_name', yarnName);
    const qs = params.toString();
    const endpoint = `/without-storage-location${qs ? `?${qs}` : ''}`;
    const data = await this.makeRequest<YarnBox[] | { results?: YarnBox[] }>(
      endpoint
    );
    return Array.isArray(data) ? data : (data.results ?? []);
  }

  /** PATCH /set-storage-location - Set storage location for boxes */
  async setStorageLocationForBoxes(
    boxIds: string[],
    storageLocation: string
  ): Promise<{ message?: string; updatedCount?: number }> {
    return this.makeRequest('/set-storage-location', {
      method: 'PATCH',
      body: JSON.stringify({ boxIds, storageLocation }),
    });
  }

  async updateYarnBox(boxId: string, payload: UpdateYarnBoxPayload): Promise<YarnBox> {
    if (!boxId) {
      throw new Error('Box ID is required');
    }
    return this.makeRequest<YarnBox>(`/${boxId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async updateQCStatus(payload: UpdateQCStatusPayload): Promise<any> {
    return this.makeRequest<any>('/update-qc-status', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async transferBoxes(payload: TransferBoxesPayload): Promise<TransferBoxesResponse> {
    return this.makeRequest<TransferBoxesResponse>('/transfer', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /** Bulk match update from Excel data (POST /bulk-match-update). */
  async bulkMatchUpdate(payload: BulkMatchUpdatePayload): Promise<{ message?: string; updated?: number }> {
    return this.makeRequest<{ message?: string; updated?: number }>('/bulk-match-update', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

const yarnBoxService = new YarnBoxService();

export default yarnBoxService;

