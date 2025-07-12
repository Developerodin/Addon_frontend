import { API_BASE_URL } from '@/shared/data/utilities/api';

// Dashboard API response interfaces
export interface DashboardOverview {
  overview: {
    totalSales: {
      totalNSV: number;
      totalGSV: number;
    };
    totalOrders: number;
    salesChange: number;
    period: string;
  };
  topStores: Array<{
    _id: string;
    storeName: string;
    totalNSV: number;
    totalQuantity: number;
  }>;
  monthlyTrends: Array<{
    _id: {
      year: number;
      month: number;
    };
    totalNSV: number;
    totalQuantity: number;
    totalOrders: number;
  }>;
  categoryAnalytics: {
    period: string;
    categories: Array<{
      _id: string;
      categoryName: string;
      totalNSV: number;
      totalQuantity: number;
      totalOrders: number;
      avgOrderValue: number;
    }>;
  };
  cityPerformance: Array<{
    _id: string;
    totalNSV: number;
    totalQuantity: number;
    totalOrders: number;
    storeCount: number;
    avgOrderValue: number;
  }>;
}

export interface SalesAnalytics {
  period: string;
  dateRange: {
    start: string;
    end: string;
  };
  sales: Array<{
    _id: {
      date: string;
      store: string;
    };
    totalNSV: number;
    totalQuantity: number;
    totalOrders: number;
  }>;
}

export interface StorePerformance {
  _id: string;
  storeName: string;
  storeId: string;
  city: string;
  totalNSV: number;
  totalQuantity: number;
  totalOrders: number;
  avgOrderValue: number;
}

export interface CategoryAnalytics {
  period: string;
  categories: Array<{
    _id: string;
    categoryName: string;
    totalNSV: number;
    totalQuantity: number;
    totalOrders: number;
    avgOrderValue: number;
  }>;
}

export interface CityPerformance {
  _id: string;
  totalNSV: number;
  totalQuantity: number;
  totalOrders: number;
  storeCount: number;
  avgOrderValue: number;
}

export interface DemandForecast {
  period: string;
  actualDemand: Array<{
    _id: string;
    productName: string;
    actualQuantity: number;
    actualNSV: number;
  }>;
  forecast: Array<{
    productId: string;
    productName: string;
    forecastedQuantity: number;
    forecastedNSV: number;
    confidence: number;
  }>;
}

export interface TopProducts {
  products: Array<{
    _id: string;
    productName: string;
    totalNSV: number;
    totalQuantity: number;
    totalOrders: number;
  }>;
}

export interface SalesData {
  _id: string;
  date: string;
  nsv: number;
  gsv: number;
  quantity: number;
  storeName: string;
  storeId: string;
  storeCity: string;
  productName: string;
  productCode: string;
  categoryName: string;
}

export interface AllSalesDataResponse {
  sales: SalesData[];
  totalCount: number;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

class DashboardService {
  private baseURL = `${API_BASE_URL}/dashboard`;

  private async makeRequest<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    try {
      const url = new URL(`${this.baseURL}${endpoint}`);
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, value.toString());
          }
        });
      }

      console.log(`Making dashboard request to: ${url.toString()}`);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Dashboard API Error for ${endpoint}:`, {
          status: response.status,
          statusText: response.statusText,
          url: url.toString(),
          error: errorText
        });
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.data || data; // Handle both {data: ...} and direct response formats
    } catch (error) {
      console.error('Dashboard API Error:', error);
      throw error;
    }
  }

  // Get dashboard overview
  async getDashboardOverview(params?: {
    period?: 'week' | 'month' | 'quarter';
  }): Promise<DashboardOverview> {
    return this.makeRequest<DashboardOverview>('', params);
  }

  // Get sales analytics
  async getSalesAnalytics(params?: {
    period?: 'week' | 'month' | 'quarter';
    startDate?: string;
    endDate?: string;
  }): Promise<SalesAnalytics> {
    return this.makeRequest<SalesAnalytics>('/sales-analytics', params);
  }

  // Get store performance
  async getStorePerformance(params?: {
    limit?: number;
  }): Promise<StorePerformance[]> {
    return this.makeRequest<StorePerformance[]>('/store-performance', params);
  }

  // Get category analytics
  async getCategoryAnalytics(params?: {
    period?: 'week' | 'month' | 'quarter';
  }): Promise<CategoryAnalytics> {
    return this.makeRequest<CategoryAnalytics>('/category-analytics', params);
  }

  // Get city performance
  async getCityPerformance(): Promise<CityPerformance[]> {
    return this.makeRequest<CityPerformance[]>('/city-performance');
  }

  // Get demand forecast
  async getDemandForecast(params?: {
    period?: 'week' | 'month' | 'quarter';
  }): Promise<DemandForecast> {
    return this.makeRequest<DemandForecast>('/demand-forecast', params);
  }

  // Get top products
  async getTopProducts(params?: {
    limit?: number;
    period?: 'week' | 'month' | 'quarter';
  }): Promise<TopProducts> {
    return this.makeRequest<TopProducts>('/top-products', params);
  }

  // Get all stores performance (for view all page)
  async getAllStoresPerformance(): Promise<StorePerformance[]> {
    const response = await this.makeRequest<{data: {stores: StorePerformance[]}, pagination: any}>('/all-stores-performance');
    // Handle nested structure: response.data.stores
    return response.data?.stores || response.stores || response.data || response;
  }

  // Get all cities performance (for view all page)
  async getAllCitiesPerformance(): Promise<CityPerformance[]> {
    const response = await this.makeRequest<{data: {cities: CityPerformance[]}, pagination: any}>('/all-cities-performance');
    // Handle nested structure: response.data.cities
    return response.data?.cities || response.cities || response.data || response;
  }

  // Get all sales data (for view all page)
  async getAllSalesData(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<AllSalesDataResponse> {
    const response = await this.makeRequest<{data: AllSalesDataResponse}>('/all-sales-data', params);
    // Handle nested structure: response.data
    return response.data || response;
  }
}

export const dashboardService = new DashboardService(); 