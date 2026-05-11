import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

export interface SupplierYarnReference {
  id: string;
  name?: string;
  status?: string;
}

export interface SupplierYarnDetail {
  id?: string;
  _id?: string;
  yarn?: string;
  yarnName?: string;
  yarnCatalogId?: string;
  yarnCatalog?: {
    id?: string;
    _id?: string;
    [key: string]: unknown;
  } | string;
  yarnType?: string | SupplierYarnReference;
  yarnsubtype?: string | SupplierYarnReference;
  color: string | SupplierYarnReference;
  /** Display name of the color (e.g. "Blue") */
  colorName?: string;
  /** Pantone name for the color (e.g. "BLUE") */
  pantoneName?: string;
  shadeNumber?: string;
  tearweight?: string;
}

export interface Supplier {
  id: string;
  brandName: string;
  contactPersonName: string;
  contactNumber: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  gstNo?: string;
  yarnDetails?: SupplierYarnDetail[];
  status: 'active' | 'inactive' | 'suspended';
  createdAt?: string;
  updatedAt?: string;
}

export interface SupplierListResponse {
  results: Supplier[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface SupplierQueryParams {
  brandName?: string;
  email?: string;
  status?: 'active' | 'inactive' | 'suspended';
  /** Partial match on yarn carried by the supplier (yarnDetails.yarnName) */
  yarnName?: string;
  sortBy?: string;
  limit?: number;
  page?: number;
}

export interface CreateSupplierRequest {
  brandName: string;
  contactPersonName: string;
  contactNumber: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  gstNo?: string;
  yarnDetails?: SupplierYarnDetail[];
  status?: 'active' | 'inactive' | 'suspended';
}

export interface UpdateSupplierRequest {
  brandName?: string;
  contactPersonName?: string;
  contactNumber?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  gstNo?: string;
  yarnDetails?: SupplierYarnDetail[];
  status?: 'active' | 'inactive' | 'suspended';
}

export interface BulkImportSupplierPayload extends CreateSupplierRequest {
  id?: string;
}

export interface BulkImportSuppliersRequest {
  suppliers: BulkImportSupplierPayload[];
  batchSize?: number;
}

export interface BulkImportSuppliersResponse {
  success?: boolean;
  message?: string;
  createdCount?: number;
  updatedCount?: number;
  failedCount?: number;
  summary?: {
    total: number;
    created: number;
    updated: number;
    failed: number;
    successRate: string;
    processingTime: string;
  };
  details?: {
    successful: number;
    errors: Array<{
      index: number;
      brandName?: string;
      email?: string;
      error: string;
      id?: string;
    }>;
  };
  errors?: Array<{
    index: number;
    message: string;
    brandName?: string;
    id?: string;
  }>;
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

class SupplierService {
  private baseURL = `${API_BASE_URL}/yarn-management/suppliers`;

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
      console.error('Supplier API Error:', error);
      throw error;
    }
  }

  async getSuppliers(params: SupplierQueryParams = {}): Promise<SupplierListResponse> {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    const query = searchParams.toString();
    const endpoint = query ? `?${query}` : '';

    return this.makeRequest<SupplierListResponse>(endpoint);
  }

  async getSupplierById(supplierId: string): Promise<Supplier> {
    if (!supplierId) {
      throw new Error('Supplier ID is required');
    }

    return this.makeRequest<Supplier>(`/${supplierId}`);
  }

  /**
   * Syncs yarn catalog with supplier. PATCH /yarn-management/suppliers/sync-yarn-catalog
   */
  async syncYarnCatalog(): Promise<{ message?: string }> {
    return this.makeRequest<{ message?: string }>('/sync-yarn-catalog', {
      method: 'PATCH',
    });
  }

  /**
   * Fetches tear weight for a yarn from a supplier (for auto-fill on cone process page).
   * GET /suppliers/:supplierId/yarn-tearweight?yarnName=...
   * Response: { supplierId, yarnTearweights: [{ yarnName, tearweight }], notFound: [] }
   */
  async getYarnTearWeight(
    supplierId: string,
    yarnName: string
  ): Promise<number | undefined> {
    if (!supplierId || !yarnName?.trim()) {
      return undefined;
    }
    const query = new URLSearchParams({ yarnName: yarnName.trim() }).toString();
    const res = await this.makeRequest<{
      supplierId: string;
      yarnTearweights: Array<{ yarnName: string; tearweight: number }>;
      notFound: string[];
    }>(`/${supplierId}/yarn-tearweight?${query}`);
    // Single yarnName query returns one entry in yarnTearweights
    return res?.yarnTearweights?.[0]?.tearweight;
  }

  async createSupplier(payload: CreateSupplierRequest): Promise<Supplier> {
    return this.makeRequest<Supplier>('', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateSupplier(supplierId: string, payload: UpdateSupplierRequest): Promise<Supplier> {
    if (!supplierId) {
      throw new Error('Supplier ID is required');
    }

    return this.makeRequest<Supplier>(`/${supplierId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteSupplier(supplierId: string): Promise<void> {
    if (!supplierId) {
      throw new Error('Supplier ID is required');
    }

    await this.makeRequest<void>(`/${supplierId}`, {
      method: 'DELETE',
    });
  }

  async bulkImportSuppliers(
    payload: BulkImportSuppliersRequest,
  ): Promise<BulkImportSuppliersResponse> {
    if (!payload?.suppliers || payload.suppliers.length === 0) {
      throw new Error('At least one supplier is required for bulk import');
    }

    const url = `${this.baseURL}/bulk-import`;
    const token = getAccessToken();

    if (!token) {
      throw new Error('No access token found. Please login again.');
    }

    const config: RequestInit = {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(payload),
    };

    try {
      const response = await fetch(url, config);
      const responseData = await response.json().catch(() => ({}));

      // Handle 400 responses that contain structured error data (common for bulk imports)
      // Backend may return 400 with valid error details in the response body
      if (response.status === 400 && (responseData.details?.errors || responseData.summary)) {
        // Return the response data even though status is 400
        // This allows the UI to display the errors properly
        return responseData as BulkImportSuppliersResponse;
      }

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please login again.');
        }
        throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
      }

      if (response.status === 204) {
        return {} as BulkImportSuppliersResponse;
      }

      return responseData as BulkImportSuppliersResponse;
    } catch (error) {
      console.error('Supplier API Error:', error);
      throw error;
    }
  }
}

const supplierService = new SupplierService();

export default supplierService;


