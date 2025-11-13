import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

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

  async createPurchaseOrder(payload: CreatePurchaseOrderPayload) {
    return this.makeRequest('', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

const yarnPurchaseOrderService = new YarnPurchaseOrderService();

export default yarnPurchaseOrderService;


