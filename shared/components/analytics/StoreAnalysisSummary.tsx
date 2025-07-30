import React from 'react';

interface StoreInfo {
  storeId: string;
  storeName: string;
  address: string;
  contactPerson: string;
  grossLTV: number;
  currentMonthTrend: number;
  norms: number;
  totalOrders: number;
  totalQuantity: number;
}

interface StoreAnalysisSummaryProps {
  storeInfo: StoreInfo;
  monthlySalesAnalysis: any[];
  forecastData: any;
  replenishmentData: any;
}

/**
 * Store Analysis Summary Component
 * Displays key performance metrics and insights for store analysis
 */
export const StoreAnalysisSummary: React.FC<StoreAnalysisSummaryProps> = ({
  storeInfo,
  monthlySalesAnalysis,
  forecastData,
  replenishmentData
}) => {
  
  // Format currency using Indian number system
  const formatCurrency = (value: number) => {
    if (value === 0) return '₹0';
    const absValue = Math.abs(value);
    if (absValue >= 10000000) {
      const crores = absValue / 10000000;
      const formatted = crores >= 10 ? Math.round(crores) : Math.round(crores * 10) / 10;
      return `₹${formatted}Cr`;
    } else if (absValue >= 100000) {
      const lakhs = absValue / 100000;
      const formatted = lakhs >= 10 ? Math.round(lakhs) : Math.round(lakhs * 10) / 10;
      return `₹${formatted}L`;
    } else if (absValue >= 1000) {
      const thousands = absValue / 1000;
      const formatted = thousands >= 10 ? Math.round(thousands) : Math.round(thousands * 10) / 10;
      return `₹${formatted}k`;
    } else {
      return `₹${Math.round(value).toLocaleString()}`;
    }
  };

  // Format number using Indian number system
  const formatNumber = (value: number) => {
    if (value === 0) return '0';
    const absValue = Math.abs(value);
    if (absValue >= 10000000) {
      const crores = absValue / 10000000;
      const formatted = crores >= 10 ? Math.round(crores) : Math.round(crores * 10) / 10;
      return `${value < 0 ? '-' : ''}${formatted}Cr`;
    } else if (absValue >= 100000) {
      const lakhs = absValue / 100000;
      const formatted = lakhs >= 10 ? Math.round(lakhs) : Math.round(lakhs * 10) / 10;
      return `${value < 0 ? '-' : ''}${formatted}L`;
    } else if (absValue >= 1000) {
      const thousands = absValue / 1000;
      const formatted = thousands >= 10 ? Math.round(thousands) : Math.round(thousands * 10) / 10;
      return `${value < 0 ? '-' : ''}${formatted}k`;
    } else {
      return Math.round(value).toLocaleString();
    }
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`;
  };

  // Calculate additional metrics
  const calculateMetrics = () => {
    // Average monthly sales
    const totalMonthlyNSV = monthlySalesAnalysis.reduce((sum, item) => sum + (item.totalNSV || 0), 0);
    const avgMonthlyNSV = monthlySalesAnalysis.length > 0 ? totalMonthlyNSV / monthlySalesAnalysis.length : 0;

    // Average monthly quantity
    const totalMonthlyQuantity = monthlySalesAnalysis.reduce((sum, item) => sum + (item.totalQuantity || 0), 0);
    const avgMonthlyQuantity = monthlySalesAnalysis.length > 0 ? totalMonthlyQuantity / monthlySalesAnalysis.length : 0;

    // Average monthly orders
    const totalMonthlyOrders = monthlySalesAnalysis.reduce((sum, item) => sum + (item.totalOrders || 0), 0);
    const avgMonthlyOrders = monthlySalesAnalysis.length > 0 ? totalMonthlyOrders / monthlySalesAnalysis.length : 0;

    // Forecast insights
    let totalForecastedNSV = 0;
    let totalForecastedQuantity = 0;
    if (forecastData?.forecastData) {
      totalForecastedNSV = forecastData.forecastData.reduce((sum: number, item: any) => sum + (item.forecastedNSV || 0), 0);
      totalForecastedQuantity = forecastData.forecastData.reduce((sum: number, item: any) => sum + (item.forecastedQuantity || 0), 0);
    }

    // Replenishment insights
    let highPriorityItems = 0;
    let mediumPriorityItems = 0;
    let lowPriorityItems = 0;
    if (replenishmentData?.recommendations) {
      highPriorityItems = replenishmentData.recommendations.filter((item: any) => item.priority === 'High').length;
      mediumPriorityItems = replenishmentData.recommendations.filter((item: any) => item.priority === 'Medium').length;
      lowPriorityItems = replenishmentData.recommendations.filter((item: any) => item.priority === 'Low').length;
    }

    return {
      avgMonthlyNSV,
      avgMonthlyQuantity,
      avgMonthlyOrders,
      totalForecastedNSV,
      totalForecastedQuantity,
      highPriorityItems,
      mediumPriorityItems,
      lowPriorityItems
    };
  };

  const metrics = calculateMetrics();

  return (
    <div className="space-y-6">
      {/* Key Performance Metrics */}
      <div className="grid grid-cols-12 gap-4">
        <div className="xl:col-span-3 lg:col-span-6 md:col-span-6 col-span-12">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Average Monthly Sales</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(metrics.avgMonthlyNSV)}</p>
                <p className="text-blue-100 text-xs mt-1">Based on {monthlySalesAnalysis.length} months</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <i className="ri-money-dollar-circle-line text-xl"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-3 lg:col-span-6 md:col-span-6 col-span-12">
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Average Monthly Quantity</p>
                <p className="text-2xl font-bold mt-1">{formatNumber(metrics.avgMonthlyQuantity)}</p>
                <p className="text-green-100 text-xs mt-1">Units per month</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <i className="ri-shopping-bag-3-line text-xl"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-3 lg:col-span-6 md:col-span-6 col-span-12">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Average Monthly Orders</p>
                <p className="text-2xl font-bold mt-1">{formatNumber(metrics.avgMonthlyOrders)}</p>
                <p className="text-purple-100 text-xs mt-1">Transactions per month</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <i className="ri-shopping-cart-line text-xl"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-3 lg:col-span-6 md:col-span-6 col-span-12">
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium">Current Month Trend</p>
                <p className={`text-2xl font-bold mt-1 ${storeInfo.currentMonthTrend >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                  {formatPercentage(storeInfo.currentMonthTrend)}
                </p>
                <p className="text-amber-100 text-xs mt-1">vs previous month</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <i className={`text-xl ${storeInfo.currentMonthTrend >= 0 ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}`}></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forecast and Replenishment Insights */}
      <div className="grid grid-cols-12 gap-4">
        <div className="xl:col-span-4 lg:col-span-6 md:col-span-6 col-span-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Forecast Insights</h3>
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <i className="ri-line-chart-line text-blue-600"></i>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Total Forecasted Sales</span>
                <span className="text-sm font-semibold text-blue-600">{formatCurrency(metrics.totalForecastedNSV)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Total Forecasted Quantity</span>
                <span className="text-sm font-semibold text-green-600">{formatNumber(metrics.totalForecastedQuantity)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Forecast Period</span>
                <span className="text-sm font-semibold text-purple-600">6 months</span>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 lg:col-span-6 md:col-span-6 col-span-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Replenishment Priority</h3>
              <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                <i className="ri-alert-line text-red-600"></i>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">High Priority Items</span>
                <span className="text-sm font-semibold text-red-600">{metrics.highPriorityItems}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Medium Priority Items</span>
                <span className="text-sm font-semibold text-yellow-600">{metrics.mediumPriorityItems}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Low Priority Items</span>
                <span className="text-sm font-semibold text-green-600">{metrics.lowPriorityItems}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 lg:col-span-6 md:col-span-6 col-span-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Store Performance</h3>
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                <i className="ri-store-line text-indigo-600"></i>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Gross LTV</span>
                <span className="text-sm font-semibold text-indigo-600">{formatCurrency(storeInfo.grossLTV)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-cyan-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Store Norms</span>
                <span className="text-sm font-semibold text-cyan-600">{formatNumber(storeInfo.norms)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Total Orders</span>
                <span className="text-sm font-semibold text-orange-600">{formatNumber(storeInfo.totalOrders)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}; 