import { API_BASE_URL } from '@/shared/data/utilities/api';

// TypeScript interfaces for complete analytics data
export interface CompleteTimeBasedTrend {
  date: string;
  totalQuantity: number;
  totalNSV: number;
  totalGSV: number;
  totalDiscount: number;
  totalTax: number;
  recordCount: number;
  allRecords: any[];
}

export interface CompleteProductPerformance {
  _id: string;
  productName: string;
  productCode: string;
  categoryName: string;
  totalQuantity: number;
  totalNSV: number;
  totalGSV: number;
  totalDiscount: number;
  recordCount: number;
  allRecords: any[];
}

export interface CompleteStorePerformance {
  _id: string;
  storeName: string;
  storeId: string;
  city: string;
  state: string;
  totalQuantity: number;
  totalNSV: number;
  totalGSV: number;
  totalDiscount: number;
  totalTax: number;
  recordCount: number;
  allRecords: any[];
}

export interface CompleteBrandPerformance {
  _id: string;
  brandName: string;
  totalQuantity: number;
  totalNSV: number;
  totalGSV: number;
  totalDiscount: number;
  totalTax: number;
  recordCount: number;
  allRecords: any[];
}

export interface CompleteDiscountImpact {
  _id: {
    productId: string;
    storeId: string;
  };
  productName: string;
  productCode: string;
  storeName: string;
  storeId: string;
  totalQuantity: number;
  totalNSV: number;
  totalGSV: number;
  totalDiscount: number;
  discountPercentage: number;
  recordCount: number;
  allRecords: any[];
}

export interface CompleteTaxMRPData {
  _id: {
    productId: string;
    storeId: string;
  };
  productName: string;
  productCode: string;
  mrp: number;
  storeName: string;
  storeId: string;
  totalQuantity: number;
  totalNSV: number;
  totalGSV: number;
  totalTax: number;
  totalMRP: number;
  taxPercentage: number;
  recordCount: number;
  allRecords: any[];
}

export interface CompleteSummaryKPIs {
  totalQuantity: number;
  totalNSV: number;
  totalGSV: number;
  totalDiscount: number;
  totalTax: number;
  recordCount: number;
  uniqueProductCount: number;
  uniqueStoreCount: number;
  averageOrderValue: number;
  discountPercentage: number;
  taxPercentage: number;
  allRecords: any[];
}

export interface PaginatedResponse<T> {
  results: T[];
  totalResults: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

class AnalyticsCompleteService {
  private baseURL = `${API_BASE_URL}/analytics`;

  private async makeRequest<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    try {
      const url = new URL(`${this.baseURL}${endpoint}/complete`);
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, value.toString());
          }
        });
      }

      console.log(`Making complete data request to: ${url.toString()}`);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Complete API Error for ${endpoint}:`, {
          status: response.status,
          statusText: response.statusText,
          url: url.toString(),
          error: errorText
        });
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Handle the case where API returns an array directly (not paginated)
      if (Array.isArray(data)) {
        const page = params?.page || 1;
        const limit = params?.limit || 25;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedData = data.slice(startIndex, endIndex);
        
        return {
          results: paginatedData,
          totalResults: data.length,
          totalPages: Math.ceil(data.length / limit),
          currentPage: page,
          pageSize: limit,
          hasNextPage: endIndex < data.length,
          hasPrevPage: page > 1
        } as T;
      }
      
      return data;
    } catch (error) {
      console.error('Analytics Complete API Error:', error);
      throw error;
    }
  }

  // Get complete time-based trends with pagination
  async getCompleteTimeBasedTrends(params?: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: 'day' | 'month';
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<CompleteTimeBasedTrend>> {
    return this.makeRequest<PaginatedResponse<CompleteTimeBasedTrend>>('/time-based-trends', params);
  }

  // Get complete product performance with pagination
  async getCompleteProductPerformance(params?: {
    dateFrom?: string;
    dateTo?: string;
    sortBy?: 'quantity' | 'nsv' | 'gsv';
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<CompleteProductPerformance>> {
    return this.makeRequest<PaginatedResponse<CompleteProductPerformance>>('/product-performance', params);
  }

  // Get complete store performance with pagination
  async getCompleteStorePerformance(params?: {
    dateFrom?: string;
    dateTo?: string;
    sortBy?: 'nsv' | 'quantity' | 'gsv';
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<CompleteStorePerformance>> {
    return this.makeRequest<PaginatedResponse<CompleteStorePerformance>>('/store-performance', params);
  }

  // Get complete brand performance with pagination
  async getCompleteBrandPerformance(params?: {
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<CompleteBrandPerformance>> {
    return this.makeRequest<PaginatedResponse<CompleteBrandPerformance>>('/brand-performance', params);
  }

  // Get complete discount impact with pagination
  async getCompleteDiscountImpact(params?: {
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<CompleteDiscountImpact>> {
    return this.makeRequest<PaginatedResponse<CompleteDiscountImpact>>('/discount-impact', params);
  }

  // Get complete tax and MRP analytics with pagination
  async getCompleteTaxMRPAnalytics(params?: {
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<CompleteTaxMRPData>> {
    return this.makeRequest<PaginatedResponse<CompleteTaxMRPData>>('/tax-mrp-analytics', params);
  }

  // Get complete summary KPIs
  async getCompleteSummaryKPIs(params?: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<CompleteSummaryKPIs> {
    return this.makeRequest<CompleteSummaryKPIs>('/summary-kpis', params);
  }

  // Get complete store analysis for specific store
  async getCompleteStoreAnalysis(storeId: string, params?: {
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<any>> {
    return this.makeRequest<PaginatedResponse<any>>(`/store-analysis/${storeId}`, params);
  }

  // Get complete product analysis for specific product
  async getCompleteProductAnalysis(productId: string, params?: {
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<any>> {
    return this.makeRequest<PaginatedResponse<any>>(`/product-analysis/${productId}`, params);
  }

  // Get complete store demand forecasting
  async getCompleteStoreForecasting(params?: {
    storeId?: string;
    months?: number;
    page?: number;
    limit?: number;
  }): Promise<any> {
    return this.makeRequest<any>('/store-forecasting', params);
  }

  // Get complete product demand forecasting
  async getCompleteProductForecasting(params?: {
    productId?: string;
    months?: number;
    page?: number;
    limit?: number;
  }): Promise<any> {
    return this.makeRequest<any>('/product-forecasting', params);
  }

  // Get complete store replenishment data
  async getCompleteStoreReplenishment(params?: {
    storeId?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    return this.makeRequest<any>('/store-replenishment', params);
  }

  // Get complete product replenishment data
  async getCompleteProductReplenishment(params?: {
    productId?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    return this.makeRequest<any>('/product-replenishment', params);
  }

  // Export data to CSV
  downloadCSV(data: any[], filename: string) {
    if (data.length === 0) {
      console.warn('No data to export');
      return;
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle nested objects and arrays
          if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value);
          }
          // Handle strings with commas
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export const analyticsCompleteService = new AnalyticsCompleteService(); 