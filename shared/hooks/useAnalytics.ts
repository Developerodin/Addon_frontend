import { useState, useEffect } from 'react';
import { analyticsService, SummaryKPIs, TimeBasedTrend, ProductPerformance, StorePerformance, BrandPerformance, DiscountImpact, TaxMRPData } from '@/shared/services/analyticsService';

interface DateRange {
  dateFrom: string;
  dateTo: string;
}

interface AnalyticsState {
  summaryKPIs: SummaryKPIs | null;
  timeBasedTrends: TimeBasedTrend[];
  productPerformance: ProductPerformance[];
  storePerformance: StorePerformance[];
  brandPerformance: BrandPerformance[];
  discountImpact: DiscountImpact[];
  taxMRPData: TaxMRPData | null;
}

export const useAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
    dateTo: new Date().toISOString().split('T')[0]
  });

  const [data, setData] = useState<AnalyticsState>({
    summaryKPIs: null,
    timeBasedTrends: [],
    productPerformance: [],
    storePerformance: [],
    brandPerformance: [],
    discountImpact: [],
    taxMRPData: null
  });

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        dateFrom: dateRange.dateFrom,
        dateTo: dateRange.dateTo
      };

      // Load all data in parallel
      const [summaryKPIs, timeBasedTrends, productPerformance, storePerformance, brandPerformance, discountImpact, taxMRPData] = await Promise.all([
        analyticsService.getSummaryKPIs(params),
        analyticsService.getTimeBasedTrends(params),
        analyticsService.getProductPerformance({ ...params, limit: 10 as number, sortBy: 'nsv' }),
        analyticsService.getStorePerformance(params),
        analyticsService.getBrandPerformance(params),
        analyticsService.getDiscountImpact(params),
        analyticsService.getTaxMRPAnalytics(params)
      ]);

      setData({
        summaryKPIs,
        timeBasedTrends,
        productPerformance,
        storePerformance,
        brandPerformance,
        discountImpact,
        taxMRPData
      });
    } catch (err) {
      console.error('Error loading analytics data:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateDateRange = (field: keyof DateRange, value: string) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [dateRange]);

  return {
    loading,
    error,
    dateRange,
    data,
    loadAnalyticsData,
    updateDateRange
  };
}; 