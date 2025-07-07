import { API_BASE_URL } from '@/shared/data/utilities/api';

// TypeScript interfaces for analytics data
export interface TimeBasedTrend {
  date: string;
  totalQuantity: number;
  totalNSV: number;
  totalGSV: number;
  totalDiscount: number;
  totalTax: number;
  recordCount: number;
}

export interface ProductPerformance {
  _id: string;
  productName: string;
  productCode: string;
  categoryName: string;
  totalQuantity: number;
  totalNSV: number;
  totalGSV: number;
  totalDiscount: number;
  recordCount: number;
}

export interface StorePerformance {
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
}

export interface StoreHeatmap {
  storeId: string;
  storeName: string;
  date: string;
  totalNSV: number;
  totalQuantity: number;
}

export interface BrandPerformance {
  _id: string;
  brandName: string;
  totalQuantity: number;
  totalNSV: number;
  totalGSV: number;
  totalDiscount: number;
  recordCount: number;
}

export interface DiscountImpact {
  date: string;
  avgDiscountPercentage: number;
  totalDiscount: number;
  totalNSV: number;
  totalTax: number;
  recordCount: number;
}

export interface TaxMRPData {
  dailyTaxData: {
    date: string;
    totalTax: number;
    avgMRP: number;
    recordCount: number;
  }[];
  mrpDistribution: {
    _id: number | string;
    count: number;
    avgNSV: number;
  }[];
}

export interface SummaryKPIs {
  totalQuantity: number;
  totalNSV: number;
  totalGSV: number;
  totalDiscount: number;
  totalTax: number;
  recordCount: number;
  avgDiscountPercentage: number;
  topSellingSKU: {
    _id: string;
    productName: string;
    totalQuantity: number;
    totalNSV: number;
  };
}

export interface DashboardData {
  timeBasedTrends: TimeBasedTrend[];
  productPerformance: ProductPerformance[];
  storePerformance: StorePerformance[];
  brandPerformance: BrandPerformance[];
  discountImpact: DiscountImpact[];
  taxAndMRP: TaxMRPData;
  summaryKPIs: SummaryKPIs;
}

class AnalyticsService {
  private baseURL = `${API_BASE_URL}/analytics`;

  private async makeRequest<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    try {
      const url = new URL(`${this.baseURL}${endpoint}`);
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            // Convert numbers to proper number format for API
            if (typeof value === 'number') {
              url.searchParams.append(key, value.toString());
            } else if (key === 'limit' && typeof value === 'string') {
              // Ensure limit is sent as number
              url.searchParams.append(key, parseInt(value, 10).toString());
            } else {
              url.searchParams.append(key, value.toString());
            }
          }
        });
      }

      // Debug logging
      console.log(`Making request to: ${url.toString()}`);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error for ${endpoint}:`, {
          status: response.status,
          statusText: response.statusText,
          url: url.toString(),
          error: errorText
        });
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Analytics API Error:', error);
      throw error;
    }
  }

  // Get time-based sales trends
  async getTimeBasedTrends(params?: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: 'day' | 'month';
  }): Promise<TimeBasedTrend[]> {
    return this.makeRequest<TimeBasedTrend[]>('/time-based-trends', params);
  }

  // Get product performance analysis
  async getProductPerformance(params?: {
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    sortBy?: 'quantity' | 'nsv' | 'gsv';
  }): Promise<ProductPerformance[]> {
    // Ensure limit is a number
    const cleanParams = params ? {
      ...params,
      limit: params.limit ? Number(params.limit) : undefined
    } : undefined;
    
    return this.makeRequest<ProductPerformance[]>('/product-performance', cleanParams);
  }

  // Get store performance analysis
  async getStorePerformance(params?: {
    dateFrom?: string;
    dateTo?: string;
    sortBy?: 'quantity' | 'nsv' | 'gsv' | 'discount' | 'tax';
  }): Promise<StorePerformance[]> {
    return this.makeRequest<StorePerformance[]>('/store-performance', params);
  }

  // Get store heatmap data
  async getStoreHeatmap(params?: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<StoreHeatmap[]> {
    return this.makeRequest<StoreHeatmap[]>('/store-heatmap', params);
  }

  // Get brand performance analysis
  async getBrandPerformance(params?: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<BrandPerformance[]> {
    return this.makeRequest<BrandPerformance[]>('/brand-performance', params);
  }

  // Get discount impact analysis
  async getDiscountImpact(params?: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<DiscountImpact[]> {
    return this.makeRequest<DiscountImpact[]>('/discount-impact', params);
  }

  // Get tax and MRP analytics
  async getTaxMRPAnalytics(params?: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<TaxMRPData> {
    return this.makeRequest<TaxMRPData>('/tax-mrp-analytics', params);
  }

  // Get summary KPIs
  async getSummaryKPIs(params?: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<SummaryKPIs> {
    return this.makeRequest<SummaryKPIs>('/summary-kpis', params);
  }

  // Get comprehensive dashboard data
  async getDashboardData(params?: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<DashboardData> {
    return this.makeRequest<DashboardData>('/dashboard', params);
  }
}

export const analyticsService = new AnalyticsService(); 