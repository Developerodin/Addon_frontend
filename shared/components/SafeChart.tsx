import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import for ApexCharts to avoid SSR issues
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

// Error boundary for individual chart components
class ChartErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chart error boundary caught error:', error, errorInfo);
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return null; // Let the parent handle the error display
    }

    return this.props.children;
  }
}

interface SafeChartProps {
  options: any;
  series: any;
  type: string;
  height?: number | string;
  width?: number | string;
  chartTitle?: string;
  fallbackMessage?: string;
}

/**
 * Safe wrapper for ApexCharts that handles undefined/null values
 */
const SafeChart: React.FC<SafeChartProps> = ({
  options,
  series,
  type,
  height = 350,
  width = '100%',
  chartTitle = 'Chart',
  fallbackMessage = 'Chart data unavailable'
}) => {
  const [hasError, setHasError] = useState(false);
  const [safeOptions, setSafeOptions] = useState<any>(null);
  const [safeSeries, setSafeSeries] = useState<any>(null);

  // Sanitize chart data to prevent ApexCharts errors
  const sanitizeData = (data: any): any => {
    if (!data) return [];
    
    if (Array.isArray(data)) {
      return data.map(item => {
        if (typeof item === 'number') {
          return isNaN(item) || !isFinite(item) ? 0 : item;
        }
        if (typeof item === 'string') {
          return item || 'Unknown';
        }
        if (typeof item === 'object' && item !== null) {
          const sanitized: any = {};
          Object.keys(item).forEach(key => {
            const value = item[key];
            if (value === undefined || value === null) {
              sanitized[key] = 0;
            } else if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
              sanitized[key] = 0;
            } else if (typeof value === 'string' && value.trim() === '') {
              sanitized[key] = 'Unknown';
            } else {
              sanitized[key] = value;
            }
          });
          return sanitized;
        }
        return item;
      });
    }
    
    return data;
  };

  // Sanitize chart options
  const sanitizeOptions = (opts: any): any => {
    if (!opts) {
      return {
        chart: {
          type,
          height,
          toolbar: { show: false }
        },
        xaxis: {
          categories: ['No Data']
        },
        yaxis: {
          title: { text: 'No Data Available' }
        },
        tooltip: { enabled: false },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2 },
        colors: ['#6b7280'],
        grid: { borderColor: '#f1f1f1', strokeDashArray: 3 }
      };
    }

    const sanitized = { ...opts };

    // Ensure required properties exist
    if (!sanitized.chart) {
      sanitized.chart = { type, height, toolbar: { show: false } };
    }

    // Don't add xaxis/yaxis for donut/pie charts
    if (type !== 'donut' && type !== 'pie') {
      if (!sanitized.xaxis) {
        sanitized.xaxis = { categories: ['No Data'] };
      }

      if (!sanitized.yaxis) {
        sanitized.yaxis = { title: { text: 'No Data Available' } };
      }
    }

    // Remove problematic properties that can cause ApexCharts errors
    if (sanitized.chart) {
      // Remove images property if it exists (causes "Cannot read properties of undefined (reading 'images')")
      if (sanitized.chart.images) {
        delete sanitized.chart.images;
      }
      
      // Ensure chart type is valid
      if (!sanitized.chart.type) {
        sanitized.chart.type = type;
      }
      
      // Ensure height is valid
      if (!sanitized.chart.height) {
        sanitized.chart.height = height;
      }
    }

    // Sanitize categories if they exist
    if (sanitized.xaxis && sanitized.xaxis.categories) {
      sanitized.xaxis.categories = sanitized.xaxis.categories.map((cat: any) => 
        cat === undefined || cat === null ? 'Unknown' : String(cat)
      );
    }

    // Sanitize labels if they exist (important for donut/pie charts)
    if (sanitized.labels) {
      sanitized.labels = sanitized.labels.map((label: any) => 
        label === undefined || label === null ? 'Unknown' : String(label)
      );
    }

    // Ensure labels exist for donut/pie charts
    if ((type === 'donut' || type === 'pie') && !sanitized.labels) {
      sanitized.labels = ['No Data'];
    }

    // Remove any undefined or null values that might cause issues
    const removeUndefinedValues = (obj: any): any => {
      if (obj && typeof obj === 'object') {
        Object.keys(obj).forEach(key => {
          if (obj[key] === undefined || obj[key] === null) {
            delete obj[key];
          } else if (typeof obj[key] === 'object') {
            removeUndefinedValues(obj[key]);
          }
        });
      }
      return obj;
    };

    return removeUndefinedValues(sanitized);
  };

  // Sanitize series data
  const sanitizeSeries = (seriesData: any): any => {
    if (!seriesData) {
      return type === 'donut' || type === 'pie' ? [0] : [{ name: 'No Data', data: [0] }];
    }

    // Handle donut/pie charts differently
    if (type === 'donut' || type === 'pie') {
      if (Array.isArray(seriesData)) {
        // For donut/pie, series should be an array of numbers
        const cleanData = seriesData.map((item: any) => {
          if (Array.isArray(item)) {
            // If it's an array of arrays, take the first array
            return sanitizeData(item);
          }
          return sanitizeData(item);
        });
        return cleanData.length > 0 ? cleanData : [0];
      }
      return [0];
    }

    // Handle other chart types (line, bar, etc.)
    if (Array.isArray(seriesData)) {
      return seriesData.map(series => {
        if (!series || typeof series !== 'object') {
          return { name: 'Unknown', data: [0] };
        }

        return {
          name: series.name || 'Unknown',
          data: sanitizeData(series.data || [0])
        };
      });
    }

    return [{ name: 'No Data', data: [0] }];
  };

  useEffect(() => {
    try {
      setHasError(false);
      
      // Sanitize the data
      const cleanSeries = sanitizeSeries(series);
      const cleanOptions = sanitizeOptions(options);
      
      setSafeSeries(cleanSeries);
      setSafeOptions(cleanOptions);
      
    } catch (error) {
      console.error(`Error sanitizing chart data for ${chartTitle}:`, error);
      setHasError(true);
    }
  }, [options, series, chartTitle]);

  // Error boundary for chart rendering
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      if (error.message && (
        error.message.includes('toString') || 
        error.message.includes('apexcharts') ||
        error.message.includes('Cannot read properties of undefined') ||
        error.message.includes('images')
      )) {
        console.error(`ApexCharts error in ${chartTitle}:`, error);
        setHasError(true);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && (
        event.reason.message?.includes('toString') ||
        event.reason.message?.includes('apexcharts') ||
        event.reason.message?.includes('Cannot read properties of undefined') ||
        event.reason.message?.includes('images')
      )) {
        console.error(`ApexCharts promise rejection in ${chartTitle}:`, event.reason);
        setHasError(true);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [chartTitle]);

  // Show error state
  if (hasError) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center">
          <i className="ri-error-warning-line text-4xl mb-2"></i>
          <p className="font-medium">{fallbackMessage}</p>
          <p className="text-sm text-gray-500">{chartTitle}</p>
          <button 
            onClick={() => {
              setHasError(false);
              // Re-sanitize data
              const cleanSeries = sanitizeSeries(series);
              const cleanOptions = sanitizeOptions(options);
              setSafeSeries(cleanSeries);
              setSafeOptions(cleanOptions);
            }}
            className="mt-2 text-xs text-blue-500 hover:text-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show loading state while sanitizing
  if (!safeOptions || !safeSeries) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
          <p>Loading chart...</p>
        </div>
      </div>
    );
  }

  // Render the chart with sanitized data
  return (
    <ChartErrorBoundary onError={(error) => {
      console.error(`Chart error boundary caught error for ${chartTitle}:`, error);
      setHasError(true);
    }}>
      <div className="chart-container">
        <ReactApexChart
          options={safeOptions}
          series={safeSeries}
          type={type}
          height={height}
          width={width}
        />
      </div>
    </ChartErrorBoundary>
  );
};

export default SafeChart; 