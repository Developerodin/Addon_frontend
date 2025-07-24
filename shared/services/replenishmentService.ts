import { RService_BASE_URL } from '@/shared/data/utilities/api';

// TypeScript interfaces for replenishment data
export interface Forecast {
  id: string;
  store_id: string;
  product_id: string;
  forecast_month: string;
  predicted_quantity: number;
  actual_quantity?: number | null;
  accuracy?: number | null;
  confidence_score?: number;
  created_at: string;
  updated_at: string;
  store?: {
    id: string;
    storeName: string;
    storeId: string;
    city: string;
    contactPerson: string;
    isActive: boolean;
  };
  product?: {
    id: string;
    name: string;
    styleCode: string;
    softwareCode: string;
    description: string;
    category: string;
  };
}

export interface Replenishment {
  id: string;
  store_id: string;
  product_id: string;
  forecast_month: string;
  current_stock: number;
  safety_stock: number;
  reorder_point: number;
  suggested_order_quantity: number;
  lead_time_days: number;
  created_at: string;
  updated_at: string;
  store?: {
    id: string;
    storeName: string;
    storeId: string;
    city: string;
    contactPerson: string;
    isActive: boolean;
  };
  product?: {
    id: string;
    name: string;
    styleCode: string;
    softwareCode: string;
    description: string;
    category: string;
  };
}

export interface ForecastAccuracy {
  overall_accuracy: number;
  total_predictions: number;
  accurate_predictions: number;
  accuracy_by_store: Array<{
    store_id: string;
    store_name: string;
    accuracy: number;
    total_predictions: number;
  }>;
  accuracy_by_product: Array<{
    product_id: string;
    product_name: string;
    accuracy: number;
    total_predictions: number;
  }>;
}

export interface ForecastTrends {
  monthly_trends: Array<{
    month: string;
    avg_predicted_quantity: number;
    avg_actual_quantity: number;
    accuracy: number;
    total_predictions: number;
  }>;
  top_performing_stores: Array<{
    store_id: string;
    store_name: string;
    accuracy: number;
    total_predictions: number;
  }>;
  top_performing_products: Array<{
    product_id: string;
    product_name: string;
    accuracy: number;
    total_predictions: number;
  }>;
}

export interface ReplenishmentSummary {
  total_predictions: number;
  total_replenishments: number;
  avg_accuracy: number;
  total_stores: number;
  total_products: number;
  recent_activity: Array<{
    id: string;
    type: 'forecast' | 'replenishment';
    store_id: string;
    product_id: string;
    created_at: string;
  }>;
}

export interface PaginatedResponse<T> {
  results: T[];
  page: number;
  limit: number;
  total_pages: number;
  total_results: number;
  has_next_page: boolean;
  has_prev_page: boolean;
}

export interface ReplenishmentFilters {
  store_id?: string;
  product_id?: string;
  month?: string;
  page?: number;
  limit?: number;
}

export interface HealthStatus {
  status: string;
  database_connected: boolean;
  model_loaded: boolean;
  last_model_update: string;
  service_uptime: string;
}

export interface ModelInfo {
  model_version: string;
  training_date: string;
  features_count: number;
  training_samples: number;
  metrics: {
    mae: number;
    mape: number;
    rmse: number;
    r2_score: number;
    training_date: string;
    model_version: string;
  };
  feature_importance: Array<{
    feature_name: string;
    importance_score: number;
    rank: number;
  }>;
}

class ReplenishmentService {
  private baseURL = RService_BASE_URL;

  private async makeRequest<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
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

  // Health & Status APIs
  async getHealthStatus(): Promise<HealthStatus> {
    return this.makeRequest<HealthStatus>('/health');
  }

  async getModelInfo(): Promise<ModelInfo> {
    return this.makeRequest<ModelInfo>('/model/info');
  }

  // Prediction APIs
  async generateForecast(data: {
    store_id: string;
    product_id: string;
    forecast_month: string;
    historical_months?: number;
  }): Promise<{ prediction_id: string; message: string }> {
    return this.makeRequest<{ prediction_id: string; message: string }>('/predict-forecast', 'POST', data);
  }

  async getPredictionById(predictionId: string): Promise<Forecast> {
    return this.makeRequest<Forecast>(`/predictions/${predictionId}`);
  }

  async getPredictionsByStore(storeId: string, limit: number = 100): Promise<Forecast[]> {
    return this.makeRequest<Forecast[]>(`/predictions/store/${storeId}`, 'GET', undefined, { limit });
  }

  async getPredictionsByProduct(productId: string, limit: number = 100): Promise<Forecast[]> {
    return this.makeRequest<Forecast[]>(`/predictions/product/${productId}`, 'GET', undefined, { limit });
  }

  async getPredictionsByStoreAndProduct(storeId: string, productId: string, limit: number = 100): Promise<Forecast[]> {
    return this.makeRequest<Forecast[]>(`/predictions/store/${storeId}/product/${productId}`, 'GET', undefined, { limit });
  }

  async getRecentPredictions(limit: number = 50): Promise<Forecast[]> {
    return this.makeRequest<Forecast[]>(`/predictions/recent`, 'GET', undefined, { limit });
  }

  // Prediction Management APIs
  async updatePrediction(predictionId: string, data: { actual_quantity: number; accuracy?: number }): Promise<Forecast> {
    return this.makeRequest<Forecast>(`/predictions/${predictionId}`, 'PUT', data);
  }

  async deletePrediction(predictionId: string): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>(`/predictions/${predictionId}`, 'DELETE');
  }

  // Analytics & Statistics APIs
  async getAccuracyStatistics(storeId?: string): Promise<{
    overall_accuracy: number;
    total_predictions: number;
    accurate_predictions: number;
    accuracy_by_month: Array<{
      month: string;
      accuracy: number;
      total_predictions: number;
    }>;
  }> {
    return this.makeRequest<any>('/stats/accuracy', 'GET', undefined, storeId ? { store_id: storeId } : undefined);
  }

  // Legacy compatibility methods
  async getForecasts(filters?: ReplenishmentFilters): Promise<PaginatedResponse<Forecast>> {
    const predictions = await this.getRecentPredictions(filters?.limit || 100);
    return {
      results: predictions,
      page: filters?.page || 1,
      limit: filters?.limit || 100,
      total_pages: Math.ceil(predictions.length / (filters?.limit || 100)),
      total_results: predictions.length,
      has_next_page: false,
      has_prev_page: false
    };
  }

  async getReplenishments(filters?: ReplenishmentFilters): Promise<PaginatedResponse<Replenishment>> {
    // For now, return empty replenishments as the API doesn't have dedicated replenishment endpoints
    return {
      results: [],
      page: filters?.page || 1,
      limit: filters?.limit || 100,
      total_pages: 1,
      total_results: 0,
      has_next_page: false,
      has_prev_page: false
    };
  }

  async getForecastAccuracy(): Promise<ForecastAccuracy> {
    const stats = await this.getAccuracyStatistics();
    return {
      overall_accuracy: stats.overall_accuracy,
      total_predictions: stats.total_predictions,
      accurate_predictions: stats.accurate_predictions,
      accuracy_by_store: [],
      accuracy_by_product: []
    };
  }

  async getForecastTrends(): Promise<ForecastTrends> {
    const stats = await this.getAccuracyStatistics();
    return {
      monthly_trends: stats.accuracy_by_month.map(item => ({
        month: item.month,
        avg_predicted_quantity: 0,
        avg_actual_quantity: 0,
        accuracy: item.accuracy,
        total_predictions: item.total_predictions
      })),
      top_performing_stores: [],
      top_performing_products: []
    };
  }

  async getReplenishmentSummary(): Promise<ReplenishmentSummary> {
    const stats = await this.getAccuracyStatistics();
    
    // Get recent predictions to calculate unique stores and products
    const predictions = await this.getRecentPredictions(1000); // Get more predictions for accurate counting
    
    // Calculate unique stores and products
    const uniqueStores = new Set(predictions.map(p => p.store_id));
    const uniqueProducts = new Set(predictions.map(p => p.product_id));
    
    // Get recent activity (last 10 predictions)
    const recentActivity = predictions.slice(0, 10).map(p => ({
      id: p.id,
      type: 'forecast' as const,
      store_id: p.store_id,
      product_id: p.product_id,
      created_at: p.created_at
    }));
    
    return {
      total_predictions: stats.total_predictions,
      total_replenishments: 0,
      avg_accuracy: stats.overall_accuracy,
      total_stores: uniqueStores.size,
      total_products: uniqueProducts.size,
      recent_activity
    };
  }

  // Utility methods
  calculateDeviation(predictedQty: number, actualQty?: number): number | null {
    if (actualQty === undefined || actualQty === null) return null;
    if (predictedQty === 0) {
      if (actualQty === 0) return 0;
      return actualQty > 0 ? 100 : 0;
    }
    return ((actualQty - predictedQty) / predictedQty) * 100;
  }

  getAccuracyColor(accuracy: number): string {
    if (accuracy >= 90) return 'text-success';
    if (accuracy >= 80) return 'text-warning';
    return 'text-danger';
  }

  getDeviationColor(deviation: number): string {
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