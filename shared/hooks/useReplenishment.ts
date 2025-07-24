import { useState, useEffect, useCallback } from 'react';
import { 
  replenishmentService, 
  Forecast, 
  Replenishment, 
  ForecastAccuracy, 
  ForecastTrends, 
  ReplenishmentSummary,
  ReplenishmentFilters,
  PaginatedResponse,
  HealthStatus,
  ModelInfo
} from '@/shared/services/replenishmentService';

interface ReplenishmentState {
  forecasts: Forecast[];
  replenishments: Replenishment[];
  accuracy: ForecastAccuracy | null;
  trends: ForecastTrends | null;
  summary: ReplenishmentSummary | null;
  healthStatus: HealthStatus | null;
  modelInfo: ModelInfo | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export const useReplenishment = (initialFilters?: ReplenishmentFilters) => {
  const [state, setState] = useState<ReplenishmentState>({
    forecasts: [],
    replenishments: [],
    accuracy: null,
    trends: null,
    summary: null,
    healthStatus: null,
    modelInfo: null,
    loading: false,
    error: null,
    pagination: {
      page: 1,
      limit: 10,
      totalPages: 1,
      totalResults: 0,
      hasNextPage: false,
      hasPrevPage: false
    }
  });

  const [filters, setFilters] = useState<ReplenishmentFilters>(initialFilters || {});

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Load health status
  const loadHealthStatus = useCallback(async () => {
    try {
      const healthData = await replenishmentService.getHealthStatus();
      setState(prev => ({ ...prev, healthStatus: healthData }));
    } catch (error) {
      console.error('Failed to load health status:', error);
    }
  }, []);

  // Load model info
  const loadModelInfo = useCallback(async () => {
    try {
      const modelData = await replenishmentService.getModelInfo();
      setState(prev => ({ ...prev, modelInfo: modelData }));
    } catch (error) {
      console.error('Failed to load model info:', error);
    }
  }, []);

  // Load forecasts
  const loadForecasts = useCallback(async (newFilters?: ReplenishmentFilters) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const data: PaginatedResponse<Forecast> = await replenishmentService.getForecasts(newFilters || filters);
      setState(prev => ({ 
        ...prev, 
        forecasts: data.results,
        pagination: {
          page: data.page,
          limit: data.limit,
          totalPages: data.total_pages,
          totalResults: data.total_results,
          hasNextPage: data.has_next_page,
          hasPrevPage: data.has_prev_page
        },
        loading: false 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to load forecasts',
        loading: false 
      }));
    }
  }, [filters]);

  // Load replenishments
  const loadReplenishments = useCallback(async (newFilters?: ReplenishmentFilters) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const data: PaginatedResponse<Replenishment> = await replenishmentService.getReplenishments(newFilters || filters);
      setState(prev => ({ 
        ...prev, 
        replenishments: data.results,
        pagination: {
          page: data.page,
          limit: data.limit,
          totalPages: data.total_pages,
          totalResults: data.total_results,
          hasNextPage: data.has_next_page,
          hasPrevPage: data.has_prev_page
        },
        loading: false 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to load replenishments',
        loading: false 
      }));
    }
  }, [filters]);

  // Load analytics data
  const loadAnalytics = useCallback(async () => {
    try {
      const [accuracyData, trendsData, summaryData] = await Promise.allSettled([
        replenishmentService.getForecastAccuracy(),
        replenishmentService.getForecastTrends(),
        replenishmentService.getReplenishmentSummary()
      ]);

      setState(prev => ({
        ...prev,
        accuracy: accuracyData.status === 'fulfilled' ? accuracyData.value : null,
        trends: trendsData.status === 'fulfilled' ? trendsData.value : null,
        summary: summaryData.status === 'fulfilled' ? summaryData.value : null
      }));
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  }, []);

  // Generate forecast
  const generateForecast = useCallback(async (data: {
    store_id: string;
    product_id: string;
    forecast_month: string;
    historical_months?: number;
  }) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const result = await replenishmentService.generateForecast(data);
      await loadForecasts(); // Refresh the list
      return result;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to generate forecast',
        loading: false 
      }));
      throw error;
    }
  }, [loadForecasts]);

  // Calculate replenishment
  const calculateReplenishment = useCallback(async (data: {
    store_id: string;
    product_id: string;
    forecast_month: string;
    current_stock: number;
    safety_stock: number;
  }) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      // For now, this is a placeholder as the API doesn't have replenishment endpoints
      await loadReplenishments(); // Refresh the list
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to calculate replenishment',
        loading: false 
      }));
      throw error;
    }
  }, [loadReplenishments]);

  // Update forecast with actual sales
  const updateForecast = useCallback(async (forecastId: string, actualQty: number) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      await replenishmentService.updatePrediction(forecastId, { actual_quantity: actualQty });
      await loadForecasts(); // Refresh the list
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to update forecast',
        loading: false 
      }));
      throw error;
    }
  }, [loadForecasts]);

  // Delete forecast
  const deleteForecast = useCallback(async (forecastId: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      await replenishmentService.deletePrediction(forecastId);
      await loadForecasts(); // Refresh the list
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to delete forecast',
        loading: false 
      }));
      throw error;
    }
  }, [loadForecasts]);

  // Get predictions by store
  const getPredictionsByStore = useCallback(async (storeId: string, limit: number = 100) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const predictions = await replenishmentService.getPredictionsByStore(storeId, limit);
      setState(prev => ({ 
        ...prev, 
        forecasts: predictions,
        loading: false 
      }));
      return predictions;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to load store predictions',
        loading: false 
      }));
      throw error;
    }
  }, []);

  // Get predictions by product
  const getPredictionsByProduct = useCallback(async (productId: string, limit: number = 100) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const predictions = await replenishmentService.getPredictionsByProduct(productId, limit);
      setState(prev => ({ 
        ...prev, 
        forecasts: predictions,
        loading: false 
      }));
      return predictions;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to load product predictions',
        loading: false 
      }));
      throw error;
    }
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<ReplenishmentFilters>) => {
    const updatedFilters = { ...filters, ...newFilters, page: 1 }; // Reset to first page
    setFilters(updatedFilters);
  }, [filters]);

  // Load all data
  const loadAllData = useCallback(async () => {
    await Promise.all([
      loadHealthStatus(),
      loadModelInfo(),
      loadForecasts(),
      loadReplenishments(),
      loadAnalytics()
    ]);
  }, [loadHealthStatus, loadModelInfo, loadForecasts, loadReplenishments, loadAnalytics]);

  // Initial load
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Reload when filters change
  useEffect(() => {
    loadForecasts();
    loadReplenishments();
  }, [filters, loadForecasts, loadReplenishments]);

  return {
    // State
    ...state,
    filters,
    
    // Actions
    loadForecasts,
    loadReplenishments,
    loadAnalytics,
    loadHealthStatus,
    loadModelInfo,
    generateForecast,
    calculateReplenishment,
    updateForecast,
    deleteForecast,
    getPredictionsByStore,
    getPredictionsByProduct,
    updateFilters,
    loadAllData,
    clearError,
    
    // Utility functions from service
    calculateDeviation: replenishmentService.calculateDeviation,
    getAccuracyColor: replenishmentService.getAccuracyColor,
    getDeviationColor: replenishmentService.getDeviationColor,
    formatMonth: replenishmentService.formatMonth
  };
}; 