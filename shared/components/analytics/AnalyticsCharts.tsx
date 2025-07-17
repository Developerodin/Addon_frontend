import React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { TimeBasedTrend, ProductPerformance, StorePerformance, BrandPerformance, DiscountImpact, TaxMRPData } from '@/shared/services/analyticsService';
import {
  getTimeBasedTrendsChart,
  getProductPerformanceChart,
  getProductPerformanceHorizontalChart,
  getStorePerformanceChart,
  getStorePerformanceHorizontalChart,
  getBrandPerformanceChart,
  getDiscountImpactChart,
  getTaxAnalyticsChart,
  getMRPDistributionChart,
  getMonthlySalesChart
} from '@/shared/data/charts/analyticsCharts';
import { validateChartData, sanitizeChartData, validateChartConfig, createSafeChartConfig, debugChartData } from '@/shared/utils/chartUtils';
import SafeChart from '@/shared/components/SafeChart';



// Dynamic import for ApexCharts to avoid SSR issues (fallback)
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface AnalyticsChartsProps {
  timeBasedTrends: TimeBasedTrend[];
  productPerformance: ProductPerformance[];
  storePerformance: StorePerformance[];
  brandPerformance: BrandPerformance[];
  discountImpact: DiscountImpact[];
  taxMRPData: TaxMRPData | null;
}

// Error boundary component for individual charts
const ChartErrorBoundary: React.FC<{ children: React.ReactNode; chartTitle: string }> = ({ children, chartTitle }) => {
  const [hasError, setHasError] = React.useState(false);
  const [errorCount, setErrorCount] = React.useState(0);

  React.useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      // Check if this is an ApexCharts-related error
      if (error.message && (
        error.message.includes('toString') || 
        error.message.includes('apexcharts') ||
        error.message.includes('Cannot read properties of undefined')
      )) {
        console.error(`ApexCharts error in ${chartTitle}:`, error);
        setErrorCount(prev => prev + 1);
        
        // Only set error state after multiple failures to avoid false positives
        if (errorCount >= 2) {
          setHasError(true);
        }
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && (
        event.reason.message?.includes('toString') ||
        event.reason.message?.includes('apexcharts') ||
        event.reason.message?.includes('Cannot read properties of undefined')
      )) {
        console.error(`ApexCharts promise rejection in ${chartTitle}:`, event.reason);
        setErrorCount(prev => prev + 1);
        
        if (errorCount >= 2) {
          setHasError(true);
        }
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [chartTitle, errorCount]);

  // Reset error state when chart title changes
  React.useEffect(() => {
    setHasError(false);
    setErrorCount(0);
  }, [chartTitle]);

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <i className="ri-error-warning-line text-4xl mb-2"></i>
          <p>Chart failed to load</p>
          <p className="text-sm">{chartTitle}</p>
          <button 
            onClick={() => {
              setHasError(false);
              setErrorCount(0);
            }}
            className="mt-2 text-xs text-blue-500 hover:text-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Safe wrapper for ReactApexChart with additional error handling
const SafeApexChart: React.FC<any> = (props) => {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    // Reset error state when props change
    setHasError(false);
  }, [props.options, props.series, props.type]);

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <i className="ri-error-warning-line text-2xl mb-2"></i>
          <p>Chart rendering failed</p>
          <button 
            onClick={() => setHasError(false)}
            className="mt-2 text-xs text-blue-500 hover:text-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  try {
    return <ReactApexChart {...props} />;
  } catch (error) {
    console.error('Error rendering ApexChart:', error);
    setHasError(true);
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <i className="ri-error-warning-line text-2xl mb-2"></i>
          <p>Chart rendering failed</p>
          <button 
            onClick={() => setHasError(false)}
            className="mt-2 text-xs text-blue-500 hover:text-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
};

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  timeBasedTrends,
  productPerformance,
  storePerformance,
  brandPerformance,
  discountImpact,
  taxMRPData
}) => {
  const charts = [
    {
      title: 'Sales Trends',
      subtitle: 'Daily sales performance over time',
      icon: 'ri-line-chart-line',
      type: 'line' as const,
      height: 350,
      data: timeBasedTrends,
      chartConfig: getTimeBasedTrendsChart,
      span: 'xl:col-span-12 col-span-12',
      color: 'blue',
      exploreLink: '/analytics/sales-trends'
    },
    {
      title: 'Monthly Sales',
      subtitle: 'Monthly sales comparison',
      icon: 'ri-bar-chart-line',
      type: 'bar' as const,
      height: 400,
      data: timeBasedTrends,
      chartConfig: getMonthlySalesChart,
      span: 'xl:col-span-6 col-span-12',
      color: 'green',
      exploreLink: '/analytics/monthly-sales'
    },
    {
      title: 'Product Performance (NSV)',
      subtitle: 'Top products by net sales value',
      icon: 'ri-shopping-bag-line',
      type: 'bar' as const,
      height: 400,
      data: productPerformance,
      chartConfig: (data: any[]) => getProductPerformanceHorizontalChart(data, 'nsv'),
      span: 'xl:col-span-6 col-span-12',
      color: 'purple',
      exploreLink: '/analytics/product-performance'
    },
    {
      title: 'Product Performance (Quantity)',
      subtitle: 'Top products by quantity sold',
      icon: 'ri-shopping-cart-line',
      type: 'bar' as const,
      height: 400,
      data: productPerformance,
      chartConfig: (data: any[]) => getProductPerformanceHorizontalChart(data, 'quantity'),
      span: 'xl:col-span-6 col-span-12',
      color: 'indigo',
      exploreLink: '/analytics/product-performance'
    },
    {
      title: 'Brand Performance',
      subtitle: 'Sales distribution by brand',
      icon: 'ri-award-line',
      type: 'bar' as const,
      height: 400,
      data: brandPerformance,
      chartConfig: getBrandPerformanceChart,
      span: 'xl:col-span-6 col-span-12',
      color: 'amber',
      exploreLink: '/analytics/brand-performance'
    },
    {
      title: 'Store Performance (NSV)',
      subtitle: 'Top performing stores',
      icon: 'ri-store-line',
      type: 'bar' as const,
      height: 350,
      data: storePerformance,
      chartConfig: (data: any[]) => getStorePerformanceHorizontalChart(data, 'nsv'),
      span: 'xl:col-span-6 col-span-12',
      color: 'emerald',
      exploreLink: '/analytics/store-performance'
    },
    {
      title: 'Discount Impact Analysis',
      subtitle: 'Discount vs sales correlation',
      icon: 'ri-percent-line',
      type: 'scatter' as const,
      height: 350,
      data: discountImpact,
      chartConfig: getDiscountImpactChart,
      span: 'xl:col-span-6 col-span-12',
      color: 'rose',
      exploreLink: '/analytics/discount-impact'
    },
    {
      title: 'Tax Analytics',
      subtitle: 'Daily tax collection trends',
      icon: 'ri-bank-card-line',
      type: 'line' as const,
      height: 350,
      data: taxMRPData?.dailyTaxData || [],
      chartConfig: getTaxAnalyticsChart,
      span: 'xl:col-span-6 col-span-12',
      color: 'cyan',
      exploreLink: '/analytics/tax-analytics'
    },
    {
      title: 'MRP Distribution',
      subtitle: 'Product price range analysis',
      icon: 'ri-price-tag-3-line',
      type: 'bar' as const,
      height: 350,
      data: taxMRPData?.mrpDistribution || [],
      chartConfig: getMRPDistributionChart,
      span: 'xl:col-span-6 col-span-12',
      color: 'violet',
      exploreLink: '/analytics/mrp-distribution'
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap: { [key: string]: { bg: string; icon: string; border: string } } = {
      blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' },
      green: { bg: 'bg-green-50', icon: 'text-green-600', border: 'border-green-200' },
      purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-200' },
      indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'border-indigo-200' },
      amber: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-200' },
      emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-200' },
      rose: { bg: 'bg-rose-50', icon: 'text-rose-600', border: 'border-rose-200' },
      cyan: { bg: 'bg-cyan-50', icon: 'text-cyan-600', border: 'border-cyan-200' },
      violet: { bg: 'bg-violet-50', icon: 'text-violet-600', border: 'border-violet-200' }
    };
    return colorMap[color] || colorMap.blue;
  };

  // Enhanced safe chart configuration function with comprehensive data validation
  const getSafeChartConfig = (chart: any) => {
    try {
      console.log(`Configuring chart: ${chart.title}`, {
        dataLength: chart.data?.length,
        dataType: typeof chart.data,
        isArray: Array.isArray(chart.data)
      });

      // Use utility functions for validation and sanitization
      const chartData = chart.data && chart.data.length > 0 ? chart.data : getEmptyChartData(chart.title);
      
      // Validate the data first
      const validation = validateChartData(chartData, chart.title);
      if (!validation.isValid) {
        console.error(`Chart data validation failed for ${chart.title}:`, validation.errors);
        throw new Error(`Data validation failed: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        console.warn(`Chart data warnings for ${chart.title}:`, validation.warnings);
      }

      // Debug the data if needed
      debugChartData(chartData, chart.title);

      // Sanitize the data
      const sanitizedData = sanitizeChartData(chartData, chart.title);

      console.log(`Sanitized chart data for ${chart.title}:`, sanitizedData.slice(0, 2)); // Log first 2 items

      const chartOptions = typeof chart.chartConfig === 'function' ? chart.chartConfig(sanitizedData) : chart.chartConfig(sanitizedData);
      
      // Validate the chart configuration
      const configValidation = validateChartConfig(chartOptions, chart.title);
      if (!configValidation.isValid) {
        console.error(`Chart configuration validation failed for ${chart.title}:`, configValidation.errors);
        throw new Error(`Configuration validation failed: ${configValidation.errors.join(', ')}`);
      }

      if (configValidation.warnings.length > 0) {
        console.warn(`Chart configuration warnings for ${chart.title}:`, configValidation.warnings);
      }

      console.log(`Chart configuration successful for ${chart.title}`);
      return chartOptions;
    } catch (error) {
      console.error(`Error configuring chart "${chart.title}":`, error);
      // Return a safe fallback configuration using utility function
      return createSafeChartConfig(chart.type, chart.height);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 mb-8">
      {charts.map((chart, index) => {
        const colorClasses = getColorClasses(chart.color);
        const chartOptions = getSafeChartConfig(chart);
        
        return (
          <div key={index} className={chart.span}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300">
              {/* Chart Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${colorClasses.bg} flex items-center justify-center`}>
                      <i className={`${chart.icon} text-lg ${colorClasses.icon}`}></i>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{chart.title}</h3>
                      <p className="text-sm text-gray-500">{chart.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={chart.exploreLink}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors duration-200"
                    >
                      <i className="ri-external-link-line mr-1"></i>
                      Explore
                    </Link>
                  </div>
                </div>
              </div>

              {/* Chart Content */}
              <div className="p-6">
                <ChartErrorBoundary chartTitle={chart.title}>
                  <SafeChart
                    options={chartOptions.options}
                    series={chartOptions.series}
                    type={chart.type}
                    height={chart.height}
                    chartTitle={chart.title}
                    fallbackMessage={`Unable to load ${chart.title}`}
                  />
                </ChartErrorBoundary>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}; 