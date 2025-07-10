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
  dateFrom?: string;
  dateTo?: string;
  plant?: string;
  materialCode?: string;
  division?: string;
  materialGroup?: string;
  city?: string;
  category?: string;
  minQuantity?: number;
  maxQuantity?: number;
  minMrp?: number;
  maxMrp?: number;
  minGsv?: number;
  maxGsv?: number;
  minNsv?: number;
  maxNsv?: number;
  minDiscount?: number;
  maxDiscount?: number;
  minTax?: number;
  maxTax?: number;
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

  // Export sales data
  async exportSales(filters: SalesFilters = {}, format: 'csv' | 'excel' = 'csv'): Promise<Blob> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    params.append('format', format);

    const url = `${this.baseUrl}/export?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to export sales: ${response.statusText}`);
    }

    return response.blob();
  }

  // Generate CSV from sales data (client-side fallback)
  generateCSV(salesData: SalesRecord[]): string {
    const headers = [
      'Date',
      'Plant ID',
      'Plant Name',
      'Material Code',
      'Material Name',
      'Quantity',
      'MRP',
      'Discount',
      'GSV',
      'NSV',
      'Total Tax',
      'Created At'
    ];

    const rows = salesData.map(sale => [
      new Date(sale.date).toLocaleDateString(),
      typeof sale.plant === 'string' ? sale.plant : sale.plant.storeId,
      typeof sale.plant === 'string' ? '-' : sale.plant.storeName,
      typeof sale.materialCode === 'string' ? sale.materialCode : sale.materialCode.styleCode,
      typeof sale.materialCode === 'string' ? '-' : sale.materialCode.name,
      sale.quantity,
      sale.mrp.toFixed(2),
      (sale.discount || 0).toFixed(2),
      sale.gsv.toFixed(2),
      sale.nsv.toFixed(2),
      (sale.totalTax || 0).toFixed(2),
      sale.createdAt ? new Date(sale.createdAt).toLocaleString() : '-'
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  }

  // Download CSV file
  downloadCSV(salesData: SalesRecord[], filename: string = 'sales_export.csv'): void {
    const csvContent = this.generateCSV(salesData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }
}

export const salesService = new SalesService(); 