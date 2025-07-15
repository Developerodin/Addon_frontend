import { API_BASE_URL } from '@/shared/data/utilities/api';

// TypeScript interfaces for replenishment data
export interface Forecast {
  id: string;
  store: {
    id: string;
    storeName: string;
    storeId: string;
    city: string;
    contactPerson: string;
    isActive: boolean;
  };
  product: {
    id: string;
    name: string;
    styleCode: string;
    softwareCode: string;
    description: string;
    category: string;
  };
  month: string;
  forecastQty: number;
  actualQty?: number | null;
  accuracy?: number | null;
  method: 'moving_average' | 'weighted_average';
  createdAt?: string;
  updatedAt?: string;
}

export interface Replenishment {
  id: string;
  store: {
    id: string;
    storeName: string;
    storeId: string;
    city: string;
    contactPerson: string;
    isActive: boolean;
  };
  product: {
    id: string;
    name: string;
    styleCode: string;
    softwareCode: string;
    description: string;
    category: string;
  };
  month: string;
  forecastQty: number;
  currentStock: number;
  safetyBuffer: number;
  replenishmentQty: number;
  method: 'moving_average' | 'weighted_average';
  createdAt?: string;
  updatedAt?: string;
}

export interface ForecastAccuracy {
  accuracy: number;
  details: Array<{
    month: string;
    accuracy: number;
    forecastQty: number;
    actualQty: number;
  }>;
}

export interface ForecastTrends {
  trends: Array<{
    month: string;
    avgForecastQty: number;
    avgActualQty: number;
    accuracy: number;
  }>;
}

export interface ReplenishmentSummary {
  totalForecasts: number;
  avgAccuracy: number;
  totalReplenishment: number;
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

export interface ReplenishmentFilters {
  store?: string;
  product?: string;
  month?: string;
  page?: number;
  limit?: number;
}

class ReplenishmentService {
  private baseURL = `${API_BASE_URL}`;

  private async makeRequest<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' = 'GET',
    body?: any,
    params?: Record<string, any>
  ): Promise<T> {
    try {
      const url = new URL(`${this.baseURL}${endpoint}`);
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, value.toString());
          }
        });
      }

      const requestOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      };

      if (body && method !== 'GET') {
        requestOptions.body = JSON.stringify(body);
      }

      console.log(`Making ${method} request to: ${url.toString()}`);

      const response = await fetch(url.toString(), requestOptions);

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
      console.error('Replenishment API Error:', error);
      throw error;
    }
  }

  // Forecasting APIs
  async getForecasts(filters?: ReplenishmentFilters): Promise<PaginatedResponse<Forecast>> {
    return this.makeRequest<PaginatedResponse<Forecast>>('/forecasts', 'GET', undefined, filters);
  }

  async generateForecast(data: {
    storeId: string;
    productId: string;
    month: string;
    method: 'moving_average' | 'weighted_average';
  }): Promise<Forecast> {
    return this.makeRequest<Forecast>('/forecasts/generate', 'POST', data);
  }

  async getForecastByStoreProductMonth(
    storeId: string, 
    productId: string, 
    month: string
  ): Promise<Forecast> {
    return this.makeRequest<Forecast>(`/forecasts/${storeId}/${productId}/${month}`);
  }

  async updateForecast(forecastId: string, data: { actualQty: number }): Promise<Forecast> {
    return this.makeRequest<Forecast>(`/forecasts/${forecastId}`, 'PUT', data);
  }

  // Replenishment APIs
  async getReplenishments(filters?: ReplenishmentFilters): Promise<PaginatedResponse<Replenishment>> {
    return this.makeRequest<PaginatedResponse<Replenishment>>('/replenishment', 'GET', undefined, filters);
  }

  async calculateReplenishment(data: {
    storeId: string;
    productId: string;
    month: string;
    currentStock: number;
    variability: 'standard' | 'high' | 'seasonal';
  }): Promise<Replenishment> {
    return this.makeRequest<Replenishment>('/replenishment/calculate', 'POST', data);
  }

  async getReplenishmentByStoreProductMonth(
    storeId: string, 
    productId: string, 
    month: string
  ): Promise<Replenishment> {
    return this.makeRequest<Replenishment>(`/replenishment/${storeId}/${productId}/${month}`);
  }

  // Analytics APIs
  async getForecastAccuracy(): Promise<ForecastAccuracy> {
    return this.makeRequest<ForecastAccuracy>('/analytics/accuracy');
  }

  async getForecastTrends(): Promise<ForecastTrends> {
    return this.makeRequest<ForecastTrends>('/analytics/trends');
  }

  async getReplenishmentSummary(): Promise<ReplenishmentSummary> {
    return this.makeRequest<ReplenishmentSummary>('/analytics/summary');
  }

  // Enhanced Analytics APIs
  async getEnhancedTrends(params?: {
    startMonth?: string;
    endMonth?: string;
    store?: string;
    product?: string;
  }): Promise<any> {
    return this.makeRequest<any>('/analytics/trends', 'GET', undefined, params);
  }

  async getAccuracyDistribution(params?: {
    store?: string;
    product?: string;
    month?: string;
  }): Promise<any> {
    return this.makeRequest<any>('/analytics/accuracy-distribution', 'GET', undefined, params);
  }

  async getPerformanceAnalytics(params?: {
    type?: 'store' | 'product';
    limit?: number;
    month?: string;
  }): Promise<any> {
    return this.makeRequest<any>('/analytics/performance', 'GET', undefined, params);
  }

  async getReplenishmentAnalytics(params?: {
    store?: string;
    product?: string;
    month?: string;
  }): Promise<any> {
    return this.makeRequest<any>('/analytics/replenishment', 'GET', undefined, params);
  }

  // Utility methods
  calculateDeviation(forecastQty: number, actualQty?: number): number | null {
    if (actualQty === undefined || actualQty === null) return null;
    if (forecastQty === 0) {
      // If forecast is 0 and actual is 0, deviation is 0%
      if (actualQty === 0) return 0;
      // If forecast is 0 but actual > 0, deviation is 100% (or a large number)
      return actualQty > 0 ? 100 : 0;
    }
    return ((actualQty - forecastQty) / forecastQty) * 100;
  }

  getAccuracyColor(accuracy: number): string {
    if (accuracy >= 90) return 'text-success';
    if (accuracy >= 80) return 'text-warning';
    return 'text-danger';
  }

  getDeviationColor(deviation: number): string {
    // Handle edge case where deviation is 100% (forecast was 0, actual > 0)
    if (deviation === 100) return 'text-warning';
    if (Math.abs(deviation) <= 5) return 'text-success';
    if (Math.abs(deviation) <= 15) return 'text-warning';
    return 'text-danger';
  }

  formatMonth(month: string): string {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  }
}

export const replenishmentService = new ReplenishmentService(); 