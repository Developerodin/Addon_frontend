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
    topProducts: null
  });

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all dashboard data in parallel
      const [overview, salesAnalytics, storePerformance, categoryAnalytics, cityPerformance, demandForecast, topProducts] = await Promise.all([
        dashboardService.getDashboardOverview({ period }),
        dashboardService.getSalesAnalytics({ period }),
        dashboardService.getStorePerformance({ limit: 5 }),
        dashboardService.getCategoryAnalytics({ period }),
        dashboardService.getCityPerformance(),
        dashboardService.getDemandForecast({ period }),
        dashboardService.getTopProducts({ limit: 5, period })
      ]);

      setData({
        overview,
        salesAnalytics,
        storePerformance,
        categoryAnalytics,
        cityPerformance,
        demandForecast,
        topProducts
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