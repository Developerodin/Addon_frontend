import { useState, useEffect, useCallback } from 'react';
import { 
  replenishmentService, 
  Forecast, 
  Replenishment, 
  ForecastAccuracy, 
  ForecastTrends, 
  ReplenishmentSummary,
  ReplenishmentFilters,
  PaginatedResponse
} from '@/shared/services/replenishmentService';

interface ReplenishmentState {
  forecasts: Forecast[];
  replenishments: Replenishment[];
  accuracy: ForecastAccuracy | null;
  trends: ForecastTrends | null;
  summary: ReplenishmentSummary | null;
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
          totalPages: data.totalPages,
          totalResults: data.totalResults,
          hasNextPage: data.hasNextPage,
          hasPrevPage: data.hasPrevPage
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
          totalPages: data.totalPages,
          totalResults: data.totalResults,
          hasNextPage: data.hasNextPage,
          hasPrevPage: data.hasPrevPage
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
    storeId: string;
    productId: string;
    month: string;
    method: 'moving_average' | 'weighted_average';
  }) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      await replenishmentService.generateForecast(data);
      await loadForecasts(); // Refresh the list
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
    storeId: string;
    productId: string;
    month: string;
    currentStock: number;
    variability: 'standard' | 'high' | 'seasonal';
  }) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      await replenishmentService.calculateReplenishment(data);
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
      await replenishmentService.updateForecast(forecastId, { actualQty });
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

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<ReplenishmentFilters>) => {
    const updatedFilters = { ...filters, ...newFilters, page: 1 }; // Reset to first page
    setFilters(updatedFilters);
  }, [filters]);

  // Load all data
  const loadAllData = useCallback(async () => {
    await Promise.all([
      loadForecasts(),
      loadReplenishments(),
      loadAnalytics()
    ]);
  }, [loadForecasts, loadReplenishments, loadAnalytics]);

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
    generateForecast,
    calculateReplenishment,
    updateForecast,
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