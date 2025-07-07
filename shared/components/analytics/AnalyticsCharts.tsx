import React from 'react';
import dynamic from 'next/dynamic';
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

// Generate empty chart data for when no real data is available
const getEmptyChartData = (chartTitle: string) => {
  const today = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    return date.toISOString();
  }).reverse();

  switch (chartTitle) {
    case 'Sales Trends':
      return last7Days.map(date => ({
        date,
        totalQuantity: 0,
        totalNSV: 0,
        totalGSV: 0,
        totalDiscount: 0,
        totalTax: 0,
        recordCount: 0
      }));

    case 'Monthly Sales':
      return last7Days.map(date => ({
        date,
        totalQuantity: 0,
        totalNSV: 0,
        totalGSV: 0,
        totalDiscount: 0,
        totalTax: 0,
        recordCount: 0
      }));

    case 'Product Performance (NSV)':
    case 'Product Performance (Quantity)':
      return [
        { _id: '1', productName: 'No Data Available', productCode: 'N/A', categoryName: 'N/A', totalQuantity: 0, totalNSV: 0, totalGSV: 0, totalDiscount: 0, recordCount: 0 },
        { _id: '2', productName: 'Sample Product 1', productCode: 'SAMPLE1', categoryName: 'Sample', totalQuantity: 0, totalNSV: 0, totalGSV: 0, totalDiscount: 0, recordCount: 0 },
        { _id: '3', productName: 'Sample Product 2', productCode: 'SAMPLE2', categoryName: 'Sample', totalQuantity: 0, totalNSV: 0, totalGSV: 0, totalDiscount: 0, recordCount: 0 }
      ];

    case 'Brand Performance':
      return [
        { _id: 'No Data', brandName: 'No Data Available', totalQuantity: 0, totalNSV: 0, totalGSV: 0, totalDiscount: 0, recordCount: 0 },
        { _id: 'Sample', brandName: 'Sample Brand', totalQuantity: 0, totalNSV: 0, totalGSV: 0, totalDiscount: 0, recordCount: 0 }
      ];

    case 'Store Performance (NSV)':
    case 'Store Performance (Quantity)':
      return [
        { _id: '1', storeName: 'No Data Available', storeId: 'N/A', city: 'N/A', state: 'N/A', totalQuantity: 0, totalNSV: 0, totalGSV: 0, totalDiscount: 0, totalTax: 0, recordCount: 0 },
        { _id: '2', storeName: 'Sample Store 1', storeId: 'SAMPLE1', city: 'Sample City', state: 'Sample State', totalQuantity: 0, totalNSV: 0, totalGSV: 0, totalDiscount: 0, totalTax: 0, recordCount: 0 },
        { _id: '3', storeName: 'Sample Store 2', storeId: 'SAMPLE2', city: 'Sample City', state: 'Sample State', totalQuantity: 0, totalNSV: 0, totalGSV: 0, totalDiscount: 0, totalTax: 0, recordCount: 0 }
      ];

    case 'Discount Impact Analysis':
      return last7Days.map(date => ({
        date,
        avgDiscountPercentage: 0,
        totalDiscount: 0,
        totalNSV: 0,
        totalTax: 0,
        recordCount: 0
      }));

    case 'Tax Analytics':
      return last7Days.map(date => ({
        date,
        totalTax: 0,
        avgMRP: 0,
        recordCount: 0
      }));

    case 'MRP Distribution':
      return [
        { _id: 100, count: 0, avgNSV: 0 },
        { _id: 200, count: 0, avgNSV: 0 },
        { _id: 500, count: 0, avgNSV: 0 },
        { _id: 1000, count: 0, avgNSV: 0 },
        { _id: 2000, count: 0, avgNSV: 0 },
        { _id: 'Above 5000', count: 0, avgNSV: 0 }
      ];

    default:
      return [];
  }
};

// Dynamic import for ApexCharts to avoid SSR issues
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface AnalyticsChartsProps {
  timeBasedTrends: TimeBasedTrend[];
  productPerformance: ProductPerformance[];
  storePerformance: StorePerformance[];
  brandPerformance: BrandPerformance[];
  discountImpact: DiscountImpact[];
  taxMRPData: TaxMRPData | null;
}

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
      span: 'xl:col-span-8 col-span-12',
      color: 'blue'
    },
    {
      title: 'Monthly Sales',
      subtitle: 'Monthly sales comparison',
      icon: 'ri-bar-chart-line',
      type: 'bar' as const,
      height: 350,
      data: timeBasedTrends,
      chartConfig: getMonthlySalesChart,
      span: 'xl:col-span-4 col-span-12',
      color: 'green'
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
      color: 'purple'
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
      color: 'indigo'
    },
    {
      title: 'Brand Performance',
      subtitle: 'Sales distribution by brand',
      icon: 'ri-award-line',
      type: 'donut' as const,
      height: 400,
      data: brandPerformance,
      chartConfig: getBrandPerformanceChart,
      span: 'xl:col-span-6 col-span-12',
      color: 'amber'
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
      color: 'emerald'
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
      color: 'rose'
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
      color: 'cyan'
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
      color: 'violet'
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

  // Safe chart configuration function
  const getSafeChartConfig = (chart: any) => {
    try {
      const chartData = chart.data && chart.data.length > 0 ? chart.data : getEmptyChartData(chart.title);
      
      // Ensure chartData is not null/undefined and has the expected structure
      if (!chartData || !Array.isArray(chartData)) {
        throw new Error('Invalid chart data');
      }

      const chartOptions = typeof chart.chartConfig === 'function' ? chart.chartConfig(chartData) : chart.chartConfig(chartData);
      
      // Validate chart options
      if (!chartOptions || !chartOptions.options || !chartOptions.series) {
        throw new Error('Invalid chart configuration');
      }

      return chartOptions;
    } catch (error) {
      console.error(`Error configuring chart "${chart.title}":`, error);
      // Return a safe fallback configuration
      return {
        series: [{
          name: 'No Data',
          data: [0]
        }],
        options: {
          chart: {
            type: chart.type,
            height: chart.height,
            toolbar: { show: false }
          },
          xaxis: {
            categories: ['No Data']
          },
          yaxis: {
            title: { text: 'No Data Available' }
          },
          tooltip: {
            enabled: false
          },
          dataLabels: {
            enabled: false
          }
        }
      };
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
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-xs text-gray-500">Live</span>
                  </div>
                </div>
              </div>

              {/* Chart Content */}
              <div className="p-6">
                <ReactApexChart
                  options={chartOptions.options}
                  series={chartOptions.series}
                  type={chart.type}
                  height={chart.height}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}; 