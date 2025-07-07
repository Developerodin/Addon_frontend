"use client";

import React from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Pageheader from '@/shared/layout-components/page-header/pageheader';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { AnalyticsKPIs, AnalyticsCharts, AnalyticsTables } from '@/shared/components/analytics';

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

  // Handle date range change
  const handleDateRangeChange = (field: 'dateFrom' | 'dateTo', value: string) => {
    updateDateRange(field, value);
  };

  // Validate and sanitize data before passing to components
  const sanitizedData = React.useMemo(() => {
    if (!data) return data;
    
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
      <Pageheader currentpage="Analytics" activepage="Dashboards" mainpage="Analytics" />
      
      {/* Modern Date Range Filter */}
      <div className="mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
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
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
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
            </div>
            
            <div className="flex items-center gap-3">
              {sanitizedData?.usingMockData && (
                <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm">
                  <i className="ri-information-line"></i>
                  <span>Mock Data</span>
                </div>
              )}
              <button 
                onClick={loadAnalyticsData}
                className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors duration-200 shadow-sm"
              >
                <i className="ri-refresh-line mr-2"></i>
                Refresh Data
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