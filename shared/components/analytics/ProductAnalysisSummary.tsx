import React from 'react';

interface ProductAnalysisSummaryProps {
  productInfo: any;
  monthlySalesAnalysis: any[];
  forecastData: any;
  replenishmentData: any;
}

/**
 * Product Analysis Summary Component
 * Displays key metrics and insights for quick overview
 */
export const ProductAnalysisSummary: React.FC<ProductAnalysisSummaryProps> = ({
  productInfo,
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

  // Calculate insights
  const totalMonthlyNSV = monthlySalesAnalysis.reduce((sum, item) => sum + (item.totalNSV || 0), 0);
  const totalMonthlyQuantity = monthlySalesAnalysis.reduce((sum, item) => sum + (item.totalQuantity || 0), 0);
  const avgMonthlyNSV = totalMonthlyNSV / Math.max(monthlySalesAnalysis.length, 1);
  
  // Forecast insights
  const totalForecastedNSV = forecastData?.forecastData?.reduce((sum: number, item: any) => sum + (item.forecastedNSV || 0), 0) || 0;
  const forecastGrowth = monthlySalesAnalysis.length > 0 ? ((totalForecastedNSV - totalMonthlyNSV) / totalMonthlyNSV) * 100 : 0;
  
  // Replenishment insights
  const highPriorityStores = replenishmentData?.recommendations?.filter((item: any) => item.priority === 'High').length || 0;
  const totalStores = replenishmentData?.recommendations?.length || 0;
  const replenishmentUrgency = totalStores > 0 ? (highPriorityStores / totalStores) * 100 : 0;

  return (
    <div className="grid grid-cols-12 gap-4 mb-6">
      {/* Total Sales */}
      <div className="xl:col-span-3 lg:col-span-6 md:col-span-6 col-span-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-full">
          <div className="flex items-start justify-between h-full">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-600 mb-1">Total Monthly Sales</p>
              <p className="text-lg font-bold text-gray-900 leading-tight">{formatCurrency(totalMonthlyNSV)}</p>
              <p className="text-xs text-gray-500 mt-1">{formatNumber(totalMonthlyQuantity)} units</p>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 ml-3">
              <i className="ri-money-dollar-circle-line text-lg text-blue-600"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Average Monthly Sales */}
      <div className="xl:col-span-3 lg:col-span-6 md:col-span-6 col-span-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-full">
          <div className="flex items-start justify-between h-full">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-600 mb-1">Avg Monthly Sales</p>
              <p className="text-lg font-bold text-gray-900 leading-tight">{formatCurrency(avgMonthlyNSV)}</p>
              <p className="text-xs text-gray-500 mt-1">{monthlySalesAnalysis.length} months data</p>
            </div>
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0 ml-3">
              <i className="ri-bar-chart-line text-lg text-green-600"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Forecast Growth */}
      <div className="xl:col-span-3 lg:col-span-6 md:col-span-6 col-span-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-full">
          <div className="flex items-start justify-between h-full">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-600 mb-1">Forecast Growth</p>
              <p className={`text-lg font-bold leading-tight ${forecastGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {forecastGrowth >= 0 ? '+' : ''}{Math.round(forecastGrowth)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">vs current sales</p>
            </div>
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0 ml-3">
              <i className="ri-trending-up-line text-lg text-amber-600"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Replenishment Urgency */}
      <div className="xl:col-span-3 lg:col-span-6 md:col-span-6 col-span-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-full">
          <div className="flex items-start justify-between h-full">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-600 mb-1">Replenishment Urgency</p>
              <p className={`text-lg font-bold leading-tight ${replenishmentUrgency > 50 ? 'text-red-600' : replenishmentUrgency > 25 ? 'text-yellow-600' : 'text-green-600'}`}>
                {Math.round(replenishmentUrgency)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">{highPriorityStores} of {totalStores} stores</p>
            </div>
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0 ml-3">
              <i className="ri-alert-line text-lg text-red-600"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 