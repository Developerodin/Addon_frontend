import { API_BASE_URL } from '@/shared/data/utilities/api';

export interface Store {
  id: string;
  storeId: string;
  storeName: string;
  bpCode?: string;
  oldStoreCode?: string;
  bpName?: string;
  street?: string;
  block?: string;
  city: string;
  addressLine1: string;
  addressLine2?: string;
  zipCode?: string;
  state?: string;
  country?: string;
  storeNumber: string;
  pincode: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  telephone?: string;
  internalSapCode?: string;
  internalSoftwareCode?: string;
  brandGrouping?: string;
  brand?: string;
  hankyNorms: number;
  socksNorms: number;
  towelNorms: number;
  totalNorms: number;
  creditRating: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoreFilters {
  limit?: number;
  page?: number;
  sortBy?: string;
  storeId?: string;
  storeName?: string;
  city?: string;
  contactPerson?: string;
  contactEmail?: string;
  creditRating?: string;
  isActive?: boolean;
}

export interface PaginatedResponse<T> {
  results: T[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface CreateStoreData {
  storeId: string;
  storeName: string;
  bpCode?: string;
  oldStoreCode?: string;
  bpName?: string;
  street?: string;
  block?: string;
  city: string;
  addressLine1: string;
  addressLine2?: string;
  zipCode?: string;
  state?: string;
  country?: string;
  storeNumber: string;
  pincode: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  telephone?: string;
  internalSapCode?: string;
  internalSoftwareCode?: string;
  brandGrouping?: string;
  brand?: string;
  hankyNorms: number;
  socksNorms: number;
  towelNorms: number;
  totalNorms: number;
  creditRating: Store['creditRating'];
  isActive?: boolean;
}

export interface UpdateStoreData extends Partial<CreateStoreData> {}

export interface BulkImportData {
  stores: CreateStoreData[];
  batchSize?: number;
}

class StoreService {
  private baseURL: string;
  private headers: HeadersInit;

  constructor() {
    this.baseURL = `${API_BASE_URL}/stores`;
    this.headers = {
      'Content-Type': 'application/json',
      // Add authorization header when auth is implemented
      // 'Authorization': `Bearer ${token}`
    };
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      headers: this.headers,
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      console.error('Store API Error:', error);
      throw error;
    }
  }

  // Get all stores with optional filters
  async getStores(filters: StoreFilters = {}): Promise<PaginatedResponse<Store>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const endpoint = queryString ? `?${queryString}` : '';
    
    return this.makeRequest<PaginatedResponse<Store>>(endpoint);
  }

  // Get store by ID
  async getStore(storeId: string): Promise<Store> {
    return this.makeRequest<Store>(`/${storeId}`);
  }

  // Create new store
  async createStore(storeData: CreateStoreData): Promise<Store> {
    return this.makeRequest<Store>('', {
      method: 'POST',
      body: JSON.stringify(storeData)
    });
  }

  // Update store
  async updateStore(storeId: string, updateData: UpdateStoreData): Promise<Store> {
    return this.makeRequest<Store>(`/${storeId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData)
    });
  }

  // Delete store
  async deleteStore(storeId: string): Promise<boolean> {
    await this.makeRequest(`/${storeId}`, {
      method: 'DELETE'
    });
    return true;
  }

  // Bulk import stores
  async bulkImportStores(bulkData: BulkImportData): Promise<any> {
    return this.makeRequest('/bulk-import', {
      method: 'POST',
      body: JSON.stringify(bulkData)
    });
  }

  // Debug query (for testing)
  async debugQuery(params: Record<string, string> = {}): Promise<any> {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/debug${queryString ? `?${queryString}` : ''}`;
    return this.makeRequest(endpoint);
  }
}

// Export singleton instance
export const storeService = new StoreService(); 