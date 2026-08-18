import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

export type VendorJobEligibleFor = 'send' | 'receive' | 'none';

export interface VendorJobPreviewBox {
  id?: string;
  boxId: string;
  barcode: string;
  poNumber: string;
  lotNumber: string;
  yarnName: string;
  yarnCatalogId?: string | null;
  shadeCode: string;
  numberOfCones: number;
  boxWeight: number;
  tearweight: number;
  netWeight: number;
  grossWeight: number;
  storageLocation: string;
  storedStatus: boolean;
  qcStatus: string;
  atVendorAt?: string | null;
  vendorShipmentId?: string | null;
  vendorSupplierId?: string | null;
  vendorName?: string;
  daysOut?: number;
  shipmentNumber?: string;
  sendingNote?: string;
  sentAt?: string | null;
}

export interface VendorJobPreview {
  barcode: string;
  eligibleFor: VendorJobEligibleFor;
  reason: string | null;
  box: VendorJobPreviewBox;
}

export interface VendorShipmentBoxLine {
  boxId: string;
  barcode: string;
  poNumber?: string;
  lotNumber?: string;
  yarnName?: string;
  shadeCode?: string;
  numberOfCones?: number;
  boxWeight?: number;
  tearweight?: number;
  netWeight?: number;
  storageLocationBefore?: string;
  qcStatus?: string;
  receivedAt?: string | null;
  receiveNumber?: string;
}

export interface VendorShipmentReceive {
  receiveNumber: string;
  receivingNote?: string;
  toStorageLocation: string;
  receivedAt: string;
  receivedBy?: { username?: string };
  boxIds?: string[];
}

export interface VendorShipment {
  id?: string;
  _id?: string;
  shipmentNumber: string;
  supplierId: string;
  supplierSnapshot?: {
    brandName?: string;
    contactPersonName?: string;
    city?: string;
    gstNo?: string;
  };
  status: 'open' | 'closed' | 'voided';
  sendingNote?: string;
  sentAt: string;
  sentBy?: { username?: string };
  boxLines: VendorShipmentBoxLine[];
  boxCount: number;
  totalNetWeight: number;
  receives: VendorShipmentReceive[];
  voidedAt?: string | null;
}

export interface VendorShipmentListResponse {
  results: VendorShipment[];
  page?: number;
  limit?: number;
  totalPages?: number;
  totalResults?: number;
}

export interface VendorReceiveResult {
  receiveNumber: string;
  toStorageLocation: string;
  boxCount: number;
  shipmentNumbers: string[];
  shipments: VendorShipment[];
}

/**
 * @returns Bearer token from cookie or localStorage
 */
const getAccessToken = (): string | null => {
  if (typeof document === 'undefined') return null;
  try {
    return Cookies.get('accessToken') || localStorage.getItem('token') || null;
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
};

class YarnVendorJobService {
  private baseURL = `${API_BASE_URL}/yarn-management/yarn-vendor-jobs`;

  /**
   * @param additional Extra headers
   */
  private buildHeaders(additional?: HeadersInit): HeadersInit {
    const token = getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...additional,
    };
  }

  /**
   * Authenticated JSON fetch against yarn-vendor-jobs.
   * @param endpoint Path after the resource root
   * @param options Fetch options
   */
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = getAccessToken();
    if (!token) {
      throw new Error('No access token found. Please login again.');
    }
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: this.buildHeaders(options.headers),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error('Authentication failed. Please login again.');
      }
      throw new Error((errorData as { message?: string }).message || `HTTP error! status: ${response.status}`);
    }
    if (response.status === 204) {
      return {} as T;
    }
    return (await response.json()) as T;
  }

  /**
   * Classify a scanned barcode for send vs receive.
   * @param barcode Box, cone, or Mongo id barcode
   */
  async preview(barcode: string): Promise<VendorJobPreview> {
    return this.makeRequest<VendorJobPreview>('/preview', {
      method: 'POST',
      body: JSON.stringify({ barcode }),
    });
  }

  /**
   * Dispatch boxes to a yarn supplier.
   */
  async send(payload: {
    barcodes: string[];
    supplierId: string;
    sendingNote?: string;
  }): Promise<VendorShipment> {
    return this.makeRequest<VendorShipment>('/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Receive boxes onto an LT rack.
   */
  async receive(payload: {
    barcodes: string[];
    toStorageLocation: string;
    receivingNote?: string;
  }): Promise<VendorReceiveResult> {
    return this.makeRequest<VendorReceiveResult>('/receive', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Void an unreceived shipment.
   * @param id Shipment Mongo id
   */
  async voidShipment(id: string): Promise<VendorShipment> {
    return this.makeRequest<VendorShipment>(`/${id}/void`, { method: 'POST' });
  }

  /**
   * Paginated send notes.
   */
  async listShipments(params: {
    status?: string;
    supplierId?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<VendorShipmentListResponse> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const query = searchParams.toString();
    return this.makeRequest<VendorShipmentListResponse>(query ? `?${query}` : '');
  }

  /**
   * Boxes currently at a processor.
   */
  async listAtVendor(supplierId?: string): Promise<VendorJobPreviewBox[]> {
    const query = supplierId ? `?supplierId=${encodeURIComponent(supplierId)}` : '';
    return this.makeRequest<VendorJobPreviewBox[]>(`/at-vendor${query}`);
  }

  /**
   * One shipment with receives.
   * @param id Shipment Mongo id
   */
  async getShipment(id: string): Promise<VendorShipment> {
    return this.makeRequest<VendorShipment>(`/${id}`);
  }
}

const yarnVendorJobService = new YarnVendorJobService();

export default yarnVendorJobService;
