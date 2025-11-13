import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

export interface YarnBox {
  _id?: string;
  id?: string;
  boxId: string;
  poNumber: string;
  barcode: string;
  yarnName?: string;
  shadeCode?: string;
  orderQty?: number;
  lotNumber?: string;
  boxWeight?: number;
  numberOfCones?: number;
  receivedDate?: string;
  orderDate?: string;
  conesIssued?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateYarnBoxPayload {
  yarnName?: string;
  shadeCode?: string;
  orderQty?: number;
  lotNumber?: string;
  boxWeight?: number;
  numberOfCones?: number;
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

export interface CreateBulkYarnBoxPayload {
  poNumber: string;
  numberOfBoxes: number;
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

  async updateYarnBox(boxId: string, payload: UpdateYarnBoxPayload): Promise<YarnBox> {
    if (!boxId) {
      throw new Error('Box ID is required');
    }
    return this.makeRequest<YarnBox>(`/${boxId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }
}

const yarnBoxService = new YarnBoxService();

export default yarnBoxService;

