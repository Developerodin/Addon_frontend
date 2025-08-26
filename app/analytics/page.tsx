"use client";

import React from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Pageheader from '@/shared/layout-components/page-header/pageheader';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { AnalyticsKPIs, AnalyticsCharts, AnalyticsTables } from '@/shared/components/analytics';
import { useGlobalErrorHandler } from '@/shared/utils/errorBoundary';
import Link from 'next/link';
import HelpIcon from '@/shared/components/HelpIcon';

// Error boundary for the entire analytics page
const AnalyticsErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasError, setHasError] = React.useState(false);
  const [errorInfo, setErrorInfo] = React.useState<string>('');

  React.useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      // Check if this is an ApexCharts-related error
      if (error.message && (
        error.message.includes('toString') || 
        error.message.includes('apexcharts') ||
        error.message.includes('Cannot read properties of undefined')
      )) {
        console.error('ApexCharts error in analytics page:', error);
        // Don't set error state for ApexCharts errors, let individual charts handle them
        return;
      }
      
      console.error('Analytics page error:', error);
      setErrorInfo(error.message || 'Unknown error occurred');
      setHasError(true);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Check if this is an ApexCharts-related promise rejection
      if (event.reason && (
        event.reason.message?.includes('toString') ||
        event.reason.message?.includes('apexcharts') ||
        event.reason.message?.includes('Cannot read properties of undefined')
      )) {
        console.error('ApexCharts promise rejection in analytics page:', event.reason);
        // Don't set error state for ApexCharts errors, let individual charts handle them
        return;
      }
      
      console.error('Unhandled promise rejection:', event.reason);
      setErrorInfo(event.reason?.message || 'Promise rejection occurred');
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (hasError) {
    return (
      <>
        <Seo title="Analytics" />
        <Pageheader currentpage="Analytics" activepage="Dashboards" mainpage="Analytics" />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md mx-auto">
            <div className="bg-red-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <i className="ri-error-warning-line text-2xl text-red-500"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics Error</h3>
            <p className="text-gray-600 mb-4">{errorInfo}</p>
            <button 
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors duration-200"
            >
              <i className="ri-refresh-line mr-2"></i>
              Reload Page
            </button>
          </div>
        </div>
      </>
    );
  }

  return <>{children}</>;
};

export default function AnalyticsPage() {
  const { loading, error, dateRange, data, loadAnalyticsData, updateDateRange } = useAnalytics();
  
  // Use global error handler for ApexCharts errors
  useGlobalErrorHandler();

  // Set initial date range to last 8 months
  React.useEffect(() => {
    const today = new Date();
    const eightMonthsAgo = new Date();
    eightMonthsAgo.setMonth(today.getMonth() - 8);
    
    // Format dates as YYYY-MM-DD
    const dateFrom = eightMonthsAgo.toISOString().split('T')[0];
    const dateTo = today.toISOString().split('T')[0];
    
    // Only update if the current date range is different
    if (dateRange.dateFrom !== dateFrom || dateRange.dateTo !== dateTo) {
      updateDateRange('dateFrom', dateFrom);
      updateDateRange('dateTo', dateTo);
    }
  }, []); // Run only once on component mount

  // Handle date range change
  const handleDateRangeChange = (field: 'dateFrom' | 'dateTo', value: string) => {
    updateDateRange(field, value);
  };

  // Validate and sanitize data before passing to components
  const sanitizedData = React.useMemo(() => {
    if (!data) return data;
    
    // Debug logging for brand performance data
    console.log('=== ANALYTICS PAGE BRAND PERFORMANCE DEBUG ===');
    console.log('Raw brand performance data:', data.brandPerformance);
    console.log('Brand performance type:', typeof data.brandPerformance);
    console.log('Brand performance is array:', Array.isArray(data.brandPerformance));
    console.log('Brand performance length:', data.brandPerformance?.length);
    if (data.brandPerformance && Array.isArray(data.brandPerformance) && data.brandPerformance.length > 0) {
      console.log('First brand performance item:', data.brandPerformance[0]);
    }
    console.log('=== END ANALYTICS PAGE BRAND PERFORMANCE DEBUG ===');
    
    return {
      ...data,
      timeBasedTrends: Array.isArray(data.timeBasedTrends) ? data.timeBasedTrends : [],
      productPerformance: Array.isArray(data.productPerformance) ? data.productPerformance : [],
      storePerformance: Array.isArray(data.storePerformance) ? data.storePerformance : [],
      brandPerformance: Array.isArray(data.brandPerformance) ? data.brandPerformance : [],
      discountImpact: Array.isArray(data.discountImpact) ? data.discountImpact : [],
      taxMRPData: data.taxMRPData ? {
        ...data.taxMRPData,
        dailyTaxData: Array.isArray(data.taxMRPData.dailyTaxData) ? data.taxMRPData.dailyTaxData : [],
        mrpDistribution: Array.isArray(data.taxMRPData.mrpDistribution) ? data.taxMRPData.mrpDistribution : []
      } : null,
      summaryKPIs: data.summaryKPIs || null
    };
  }, [data]);

  // Loading component with modern skeleton
  if (loading) {
    return (
      <>
        <Seo title="Analytics" />
        <Pageheader currentpage="Analytics" activepage="Dashboards" mainpage="Analytics" />
        
        {/* Skeleton Loading */}
        <div className="space-y-6">
          {/* KPI Skeleton */}
          <div className="grid grid-cols-12 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="xl:col-span-2 lg:col-span-3 md:col-span-6 col-span-12">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="animate-pulse">
                    <div className="h-8 w-8 bg-gray-200 rounded-lg mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Chart Skeletons */}
          <div className="grid grid-cols-12 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="xl:col-span-6 col-span-12">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="animate-pulse">
                    <div className="h-5 bg-gray-200 rounded mb-4 w-1/2"></div>
                    <div className="h-64 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  // Error component with modern design
  if (error) {
    return (
      <>
        <Seo title="Analytics" />
        <Pageheader currentpage="Analytics" activepage="Dashboards" mainpage="Analytics" />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md mx-auto">
            <div className="bg-red-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <i className="ri-error-warning-line text-2xl text-red-500"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Analytics</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button 
              onClick={loadAnalyticsData}
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors duration-200"
            >
              <i className="ri-refresh-line mr-2"></i>
              Try Again
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <AnalyticsErrorBoundary>
      <Seo title="Analytics" />
      
      {/* Custom Page Header with Date Filters */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
                {loading && (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
                    <span className="text-sm text-primary font-medium">Loading...</span>
                  </div>
                )}
              </div>
              <p className="text-gray-600 mt-1">Comprehensive sales and performance insights</p>
            </div>
            <HelpIcon
              title="Analytics Dashboard"
              content={
                <div>
                  <p className="mb-4">
                    This page provides comprehensive analytics and insights into your business performance, sales trends, and key metrics.
                  </p>
                  
                  <h4 className="font-semibold mb-2">What you can do:</h4>
                  <ul className="list-disc list-inside mb-4 space-y-1">
                    <li><strong>View KPIs:</strong> Monitor key performance indicators like total sales, revenue, and growth metrics</li>
                    <li><strong>Analyze Trends:</strong> View time-based trends and patterns in your sales data</li>
                    <li><strong>Product Performance:</strong> Track how individual products are performing</li>
                    <li><strong>Store Performance:</strong> Compare performance across different stores</li>
                    <li><strong>Brand Analysis:</strong> Analyze performance by brand categories</li>
                    <li><strong>Discount Impact:</strong> Understand the impact of discounts on sales</li>
                    <li><strong>Tax & MRP Analysis:</strong> View tax distribution and MRP analysis</li>
                    <li><strong>Date Filtering:</strong> Filter data by specific date ranges</li>
                    <li><strong>Export Data:</strong> Export analytics data for further analysis</li>
                  </ul>

                  <h4 className="font-semibold mb-2">Available Metrics:</h4>
                  <ul className="list-disc list-inside mb-4 space-y-1">
                    <li><strong>Sales KPIs:</strong> Total sales, revenue, growth percentage</li>
                    <li><strong>Product Metrics:</strong> Top-performing products, sales by category</li>
                    <li><strong>Store Metrics:</strong> Store-wise performance, location analysis</li>
                    <li><strong>Brand Metrics:</strong> Brand performance, market share</li>
                    <li><strong>Financial Metrics:</strong> Tax analysis, MRP distribution, profit margins</li>
                    <li><strong>Trend Analysis:</strong> Time-based trends, seasonal patterns</li>
                  </ul>

                  <h4 className="font-semibold mb-2">Tips:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Use date filters to analyze specific time periods</li>
                    <li>Click on charts for detailed information</li>
                    <li>Export data for external analysis</li>
                    <li>Compare different time periods to identify trends</li>
                    <li>Use the refresh button to get the latest data</li>
                  </ul>
                </div>
              }
            />
          </div>
          
          {/* Date Range Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                  value={dateRange.dateFrom}
                  onChange={(e) => handleDateRangeChange('dateFrom', e.target.value)}
                />
                <i className="ri-calendar-line absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              </div>
            </div>
            <div className="flex items-center justify-center px-2">
              <span className="text-sm font-medium text-gray-600">To</span>
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                  value={dateRange.dateTo}
                  onChange={(e) => handleDateRangeChange('dateTo', e.target.value)}
                />
                <i className="ri-calendar-line absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              </div>
            </div>
            
            <div className="flex items-end gap-3">
              <button 
                onClick={loadAnalyticsData}
                className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors duration-200 shadow-sm"
              >
                <i className="ri-refresh-line mr-2"></i>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPIs */}
      <AnalyticsKPIs summaryKPIs={sanitizedData?.summaryKPIs} />

      {/* Charts Grid */}
      <AnalyticsCharts
        timeBasedTrends={sanitizedData?.timeBasedTrends || []}
        productPerformance={sanitizedData?.productPerformance || []}
        storePerformance={sanitizedData?.storePerformance || []}
        brandPerformance={sanitizedData?.brandPerformance || []}
        discountImpact={sanitizedData?.discountImpact || []}
        taxMRPData={sanitizedData?.taxMRPData}
      />

      {/* Data Tables */}
      <AnalyticsTables
        productPerformance={sanitizedData?.productPerformance || []}
        storePerformance={sanitizedData?.storePerformance || []}
      />
    </AnalyticsErrorBoundary>
  );
} 