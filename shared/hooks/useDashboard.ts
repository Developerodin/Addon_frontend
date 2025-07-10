import { useState, useEffect } from 'react';
import { dashboardService, DashboardOverview, SalesAnalytics, StorePerformance, CategoryAnalytics, CityPerformance, DemandForecast, TopProducts } from '@/shared/services/dashboardService';

interface DashboardState {
  overview: DashboardOverview | null;
  salesAnalytics: SalesAnalytics | null;
  storePerformance: StorePerformance[];
  categoryAnalytics: CategoryAnalytics | null;
  cityPerformance: CityPerformance[];
  demandForecast: DemandForecast | null;
  topProducts: TopProducts | null;
  usingMockData: boolean;
}

export const useDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('week');

  const [data, setData] = useState<DashboardState>({
    overview: null,
    salesAnalytics: null,
    storePerformance: [],
    categoryAnalytics: null,
    cityPerformance: [],
    demandForecast: null,
    topProducts: null,
    usingMockData: false
  });

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all dashboard data in parallel with individual error handling
      const results = await Promise.allSettled([
        dashboardService.getDashboardOverview({ period }),
        dashboardService.getSalesAnalytics({ period }),
        dashboardService.getStorePerformance({ limit: 5 }),
        dashboardService.getCategoryAnalytics({ period }),
        dashboardService.getCityPerformance(),
        dashboardService.getDemandForecast({ period }),
        dashboardService.getTopProducts({ limit: 5, period })
      ]);

      // Extract results and handle individual failures
      const [overviewResult, salesResult, storeResult, categoryResult, cityResult, forecastResult, topProductsResult] = results;

      // Check if any requests failed
      const failedRequests = results.filter(result => result.status === 'rejected');
      const usingMockData = failedRequests.length > 0;
      
      if (failedRequests.length > 0) {
        console.warn('Some dashboard data failed to load:', failedRequests);
        if (failedRequests.length === results.length) {
          console.warn('All dashboard requests failed, using default values');
        } else {
          console.warn(`${failedRequests.length} out of ${results.length} dashboard requests failed`);
        }
      }

      // Set data with fallbacks for failed requests
      setData({
        overview: overviewResult.status === 'fulfilled' ? overviewResult.value : {
          overview: {
            totalSales: { totalNSV: 0, totalGSV: 0 },
            totalOrders: 0,
            salesChange: 0,
            period
          },
          topStores: [],
          monthlyTrends: [],
          categoryAnalytics: { period, categories: [] },
          cityPerformance: []
        },
        salesAnalytics: salesResult.status === 'fulfilled' ? salesResult.value : {
          period,
          dateRange: { start: '', end: '' },
          sales: []
        },
        storePerformance: storeResult.status === 'fulfilled' ? storeResult.value : [],
        categoryAnalytics: categoryResult.status === 'fulfilled' ? categoryResult.value : {
          period,
          categories: []
        },
        cityPerformance: cityResult.status === 'fulfilled' ? cityResult.value : [],
        demandForecast: forecastResult.status === 'fulfilled' ? forecastResult.value : {
          period,
          actualDemand: [],
          forecast: []
        },
        topProducts: topProductsResult.status === 'fulfilled' ? topProductsResult.value : {
          products: []
        },
        usingMockData
      });
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updatePeriod = (newPeriod: 'week' | 'month' | 'quarter') => {
    setPeriod(newPeriod);
  };

  useEffect(() => {
    loadDashboardData();
  }, [period]);

  return {
    loading,
    error,
    period,
    data,
    loadDashboardData,
    updatePeriod
  };
}; 