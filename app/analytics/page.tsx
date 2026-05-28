"use client";

import React from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { AnalyticsKPIs, AnalyticsCharts, AnalyticsTables } from '@/shared/components/analytics';
import { useGlobalErrorHandler } from '@/shared/utils/errorBoundary';
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
        <div className="main-content !p-[10px]">
          <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 p-[10px]">
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-red-400 mb-4">
                <i className="ri-error-warning-line text-5xl"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">Analytics Error</h3>
              <p className="text-[11px] text-gray-500 mb-4">{errorInfo}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700"
              >
                <i className="ri-refresh-line"></i> Reload Page
              </button>
            </div>
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

  // Set initial date range: from Jan 1, 2025 to today
  React.useEffect(() => {
    const dateFrom = '2025-01-01';
    const dateTo = new Date().toISOString().split('T')[0];

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

  // Loading: compact skeleton
  if (loading) {
    return (
      <>
        <Seo title="Analytics" />
        <div className="main-content !p-[10px]">
          <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 p-[10px]">
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50"></div>
              <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading Analytics</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Error: compact card
  if (error) {
    return (
      <>
        <Seo title="Analytics" />
        <div className="main-content !p-[10px]">
          <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 p-[10px]">
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-red-400 mb-4">
                <i className="ri-error-warning-line text-5xl"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">Unable to Load Analytics</h3>
              <p className="text-[11px] text-gray-500 mb-4">{error}</p>
              <button
                type="button"
                onClick={loadAnalyticsData}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700"
              >
                <i className="ri-refresh-line"></i> Try Again
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <AnalyticsErrorBoundary>
      <Seo title="Analytics" />
      <div className="main-content !p-[10px]">
        <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
          {/* Compact header */}
          <div className="p-[10px] border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Analytics</h1>
              <HelpIcon
                title="Analytics Dashboard"
                content={
                  <div>
                    <p className="mb-4">
                      This page provides comprehensive analytics and insights into your business performance, sales trends, and key metrics.
                    </p>
                    <h4 className="font-semibold mb-2">What you can do:</h4>
                    <ul className="list-disc list-inside mb-4 space-y-1">
                      <li><strong>View KPIs:</strong> Monitor key performance indicators</li>
                      <li><strong>Analyze Trends:</strong> Time-based trends and patterns</li>
                      <li><strong>Product / Store / Brand:</strong> Performance analysis</li>
                      <li><strong>Discount & Tax:</strong> Impact and MRP analysis</li>
                      <li><strong>Date Filtering:</strong> Filter by date range</li>
                    </ul>
                    <h4 className="font-semibold mb-2">Tips:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Use date filters for specific time periods</li>
                      <li>Use refresh to get the latest data</li>
                    </ul>
                  </div>
                }
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium text-gray-600 whitespace-nowrap">From</span>
              <input
                type="date"
                className="px-2.5 py-1.5 border border-gray-200 rounded text-[11px] focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                value={dateRange.dateFrom}
                onChange={(e) => handleDateRangeChange('dateFrom', e.target.value)}
              />
              <span className="text-[11px] font-medium text-gray-600">To</span>
              <input
                type="date"
                className="px-2.5 py-1.5 border border-gray-200 rounded text-[11px] focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                value={dateRange.dateTo}
                onChange={(e) => handleDateRangeChange('dateTo', e.target.value)}
              />
              <button
                type="button"
                onClick={loadAnalyticsData}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-purple-200 text-purple-700 text-[11px] font-bold rounded hover:bg-purple-50 transition-colors"
              >
                <i className="ri-refresh-line text-sm"></i> Refresh
              </button>
            </div>
          </div>

          <div className="p-[10px] pt-0">
            <AnalyticsKPIs summaryKPIs={sanitizedData?.summaryKPIs} />
            <AnalyticsCharts
              timeBasedTrends={sanitizedData?.timeBasedTrends || []}
              productPerformance={sanitizedData?.productPerformance || []}
              storePerformance={sanitizedData?.storePerformance || []}
              brandPerformance={sanitizedData?.brandPerformance || []}
              discountImpact={sanitizedData?.discountImpact || []}
              taxMRPData={sanitizedData?.taxMRPData}
            />
            <AnalyticsTables
              productPerformance={sanitizedData?.productPerformance || []}
              storePerformance={sanitizedData?.storePerformance || []}
            />
          </div>
        </div>
      </div>
    </AnalyticsErrorBoundary>
  );
} 