import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

const getAccessToken = (): string | null => {
  if (typeof document === 'undefined') return null;
  try {
    return Cookies.get('accessToken') || localStorage.getItem('token') || null;
  } catch {
    return null;
  }
};

export interface YarnReceivingProcessPayload {
  items: Array<{
    poNumber: string;
    packing?: Record<string, unknown>;
    lots: Array<{
      lotNumber: string;
      numberOfCones: number;
      totalWeight: number;
      numberOfBoxes: number;
      poItems: Array<{ poItem: string; receivedQuantity: number }>;
      boxUpdates?: Array<{
        yarnName: string;
        shadeCode: string;
        boxWeight: number;
        numberOfCones: number;
      }>;
    }>;
    notes?: string;
  }>;
  notes?: string;
}

class YarnReceivingService {
  private baseURL = `${API_BASE_URL}/yarn-management/yarn-receiving`;

  private buildHeaders(): HeadersInit {
    const token = getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async process(payload: YarnReceivingProcessPayload): Promise<unknown> {
    const token = getAccessToken();
    console.log('[yarnReceivingService] process called', {
      baseURL: this.baseURL,
      fullUrl: `${this.baseURL}/process`,
      hasToken: !!token,
      itemsCount: payload?.items?.length,
    });

    if (!token) {
      throw new Error('No access token found. Please login again.');
    }

    const response = await fetch(`${this.baseURL}/process`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(payload),
    });

    console.log('[yarnReceivingService] Response', { status: response.status, ok: response.ok });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json().catch(() => ({}));
    console.log('[yarnReceivingService] Success', result);
    return result;
  }
}

const yarnReceivingService = new YarnReceivingService();
export default yarnReceivingService;
