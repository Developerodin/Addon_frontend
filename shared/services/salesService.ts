import { API_BASE_URL } from '@/shared/data/utilities/api';

export interface Plant {
  _id?: string;
  id?: string;
  storeId: string;
  storeName: string;
  addressLine2?: string;
  creditRating: string;
  isActive: boolean;
}

export interface MaterialCode {
  _id?: string;
  id?: string;
  styleCode: string;
  name: string;
  attributes?: Record<string, any>;
}

export interface SalesRecord {
  _id?: string;
  id?: string;
  date: string;
  plant: string | Plant;
  materialCode: string | MaterialCode;
  quantity: number;
  mrp: number;
  gsv: number;
  nsv: number;
  discount?: number;
  totalTax?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Helper function to get the ID from a sales record
export const getSaleId = (sale: SalesRecord): string => {
  return sale.id || sale._id || '';
};

export interface SalesFilters {
  date?: string;
  plant?: string;
  materialCode?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SalesResponse {
  results: SalesRecord[];
  total: number;
  totalResults: number;
  page: number;
  limit: number;
  totalPages: number;
}

class SalesService {
  private baseUrl = `${API_BASE_URL}/sales`;

  // Create a new sales record
  async createSale(saleData: Omit<SalesRecord, '_id' | 'createdAt' | 'updatedAt'>): Promise<SalesRecord> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(saleData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create sale: ${response.statusText}`);
    }

    return response.json();
  }

  // Get sales with filtering and pagination
  async getSales(filters: SalesFilters = {}): Promise<SalesResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const url = `${this.baseUrl}?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch sales: ${response.statusText}`);
    }

    return response.json();
  }

  // Get a specific sales record by ID
  async getSaleById(salesId: string): Promise<SalesRecord> {
    const response = await fetch(`${this.baseUrl}/${salesId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch sale: ${response.statusText}`);
    }

    return response.json();
  }

  // Update a sales record
  async updateSale(salesId: string, saleData: Partial<SalesRecord>): Promise<SalesRecord> {
    const response = await fetch(`${this.baseUrl}/${salesId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(saleData),
    });

    if (!response.ok) {
      throw new Error(`Failed to update sale: ${response.statusText}`);
    }

    return response.json();
  }

  // Delete a sales record
  async deleteSale(salesId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${salesId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete sale: ${response.statusText}`);
    }
  }

  // Bulk import sales records
  async bulkImportSales(salesData: Omit<SalesRecord, '_id' | 'createdAt' | 'updatedAt'>[]): Promise<{ success: number; failed: number; errors?: string[] }> {
    const response = await fetch(`${this.baseUrl}/bulk-import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sales: salesData }),
    });

    if (!response.ok) {
      throw new Error(`Failed to bulk import sales: ${response.statusText}`);
    }

    return response.json();
  }
}

export const salesService = new SalesService(); 