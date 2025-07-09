import { useState, useEffect } from 'react';
import { analyticsService, SummaryKPIs, TimeBasedTrend, ProductPerformance, StorePerformance, BrandPerformance, DiscountImpact, TaxMRPData } from '@/shared/services/analyticsService';
import {
  generateMockTimeBasedTrends,
  generateMockProductPerformance,
  generateMockStorePerformance,
  generateMockBrandPerformance,
  generateMockDiscountImpact,
  generateMockTaxMRPData,
  generateSafeMockSummaryKPIs
} from '@/shared/utils/mockAnalyticsData';

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
  usingMockData: boolean;
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
    taxMRPData: null,
    usingMockData: false
  });

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        dateFrom: dateRange.dateFrom,
        dateTo: dateRange.dateTo
      };

      // Load all data in parallel with individual error handling
      const results = await Promise.allSettled([
        analyticsService.getSummaryKPIs(params),
        analyticsService.getTimeBasedTrends(params),
        analyticsService.getProductPerformance({ ...params, limit: 10 as number, sortBy: 'nsv' }),
        analyticsService.getStorePerformance(params),
        analyticsService.getBrandPerformance(params),
        analyticsService.getDiscountImpact(params),
        analyticsService.getTaxMRPAnalytics(params)
      ]);

      // Extract results and handle individual failures
      const [kpisResult, trendsResult, productResult, storeResult, brandResult, discountResult, taxResult] = results;

      // Debug logging for brand performance
      console.log('=== BRAND PERFORMANCE HOOK DEBUG ===');
      console.log('Brand result status:', brandResult.status);
      if (brandResult.status === 'fulfilled') {
        console.log('Brand performance API data:', brandResult.value);
        console.log('Brand performance data length:', brandResult.value?.length);
      } else {
        console.log('Brand performance API failed:', brandResult.reason);
      }
      console.log('=== END BRAND PERFORMANCE HOOK DEBUG ===');

      // Check if any requests failed and show partial error message
      const failedRequests = results.filter(result => result.status === 'rejected');
      const usingMockData = failedRequests.length > 0;
      
      if (failedRequests.length > 0) {
        console.warn('Some analytics data failed to load:', failedRequests);
        if (failedRequests.length === results.length) {
          // All requests failed - show warning but continue with mock data
          console.warn('All analytics requests failed, using mock data for development');
        } else {
          // Some requests failed - show warning but don't block the UI
          console.warn(`${failedRequests.length} out of ${results.length} analytics requests failed, using mock data for failed endpoints`);
        }
      }

      // Set data with fallbacks for failed requests - use mock data when API fails
      setData({
        summaryKPIs: kpisResult.status === 'fulfilled' ? kpisResult.value : generateSafeMockSummaryKPIs(),
        timeBasedTrends: trendsResult.status === 'fulfilled' ? trendsResult.value : generateMockTimeBasedTrends(dateRange.dateFrom, dateRange.dateTo),
        productPerformance: productResult.status === 'fulfilled' ? productResult.value : generateMockProductPerformance(),
        storePerformance: storeResult.status === 'fulfilled' ? storeResult.value : generateMockStorePerformance(),
        brandPerformance: brandResult.status === 'fulfilled' ? brandResult.value : generateMockBrandPerformance(),
        discountImpact: discountResult.status === 'fulfilled' ? discountResult.value : generateMockDiscountImpact(dateRange.dateFrom, dateRange.dateTo),
        taxMRPData: taxResult.status === 'fulfilled' ? taxResult.value : generateMockTaxMRPData(dateRange.dateFrom, dateRange.dateTo),
        usingMockData
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