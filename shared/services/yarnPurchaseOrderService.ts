import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

export interface PurchaseOrderItem {
  id: string;
  yarnName: string;
  sizeCount: string;
  shadeCode: string;
  quantity: number;
  rate: number;
  gst: number;
  subTotal: number;
  estimatedDeliveryDate: string;
}

export interface PacklistDetails {
  trackingNumber?: string;
  courierName?: string;
  dispatchDate?: string;
  expectedArrivalDate?: string;
  notes?: string;
  packlistFile?: File;
  packlistFileName?: string;
}

export type PurchaseOrderStatus =
  | 'submitted to supplier'
  | 'in transit'
  | 'delivered'
  | 'rejected'
  | 'QC pending'
  | 'partially delivered'
  | 'stocked';

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplier: string;
  supplierId: string;
  orderDate: string;
  expectedDelivery: string;
  status: PurchaseOrderStatus;
  totalAmount: number;
  subTotal: number;
  totalGst: number;
  items: PurchaseOrderItem[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  packlistDetails?: PacklistDetails;
}

export interface PurchaseOrderListResponse {
  results: PurchaseOrder[];
  page?: number;
  limit?: number;
  totalPages?: number;
  totalResults?: number;
}

export interface PurchaseOrderQueryParams {
  start_date?: string;
  end_date?: string;
  status_code?: string;
  supplier_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PurchaseOrderItemPayload {
  yarn: string;
  yarnName: string;
  sizeCount: string;
  shadeCode?: string;
  rate: number;
  quantity: number;
  estimatedDeliveryDate: string;
  gstRate: number;
}

export interface CreatePurchaseOrderPayload {
  poNumber: string;
  supplierName: string;
  supplier: string;
  poItems: PurchaseOrderItemPayload[];
  notes?: string;
  subTotal: number;
  gst: number;
  total: number;
  currentStatus: string;
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

class YarnPurchaseOrderService {
  private baseURL = `${API_BASE_URL}/yarn-management/yarn-purchase-orders`;

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
      console.error('Yarn Purchase Order API Error:', error);
      throw error;
    }
  }

  async getPurchaseOrders(params: PurchaseOrderQueryParams = {}): Promise<PurchaseOrderListResponse> {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    const query = searchParams.toString();
    const endpoint = query ? `?${query}` : '';

    return this.makeRequest<PurchaseOrderListResponse>(endpoint);
  }

  async getPurchaseOrderById(orderId: string): Promise<PurchaseOrder> {
    if (!orderId) {
      throw new Error('Order ID is required');
    }
    return this.makeRequest<PurchaseOrder>(`/${orderId}`);
  }

  async updatePurchaseOrderStatus(
    orderId: string,
    status: PurchaseOrderStatus,
    packlistDetails?: PacklistDetails
  ): Promise<PurchaseOrder> {
    if (!orderId) {
      throw new Error('Order ID is required');
    }

    const payload: Partial<PurchaseOrder> & { status: PurchaseOrderStatus } = { status };
    if (packlistDetails) {
      payload.packlistDetails = packlistDetails;
    }

    return this.makeRequest<PurchaseOrder>(`/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async createPurchaseOrder(payload: CreatePurchaseOrderPayload): Promise<PurchaseOrder> {
    return this.makeRequest<PurchaseOrder>('', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

const yarnPurchaseOrderService = new YarnPurchaseOrderService();

export default yarnPurchaseOrderService;
