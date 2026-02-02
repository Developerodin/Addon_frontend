import React from 'react';
import { SummaryKPIs } from '@/shared/services/analyticsService';

interface AnalyticsKPIsProps {
  summaryKPIs: SummaryKPIs | null;
}

export const AnalyticsKPIs: React.FC<AnalyticsKPIsProps> = ({ summaryKPIs }) => {
  // Helper function to safely format numbers with rounding
  const safeNumberFormat = (value: any, prefix = '', suffix = '') => {
    if (value === null || value === undefined || isNaN(value)) {
      return `${prefix}0${suffix}`;
    }
    try {
      // Round to nearest whole number
      const roundedValue = Math.round(Number(value));
      return `${prefix}${roundedValue.toLocaleString()}${suffix}`;
    } catch (error) {
      return `${prefix}0${suffix}`;
    }
  };

  // Helper function to safely format percentages with rounding
  const safePercentageFormat = (value: any) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0%';
    }
    try {
      // Round to nearest whole number
      const roundedValue = Math.round(Number(value));
      return `${roundedValue}%`;
    } catch (error) {
      return '0%';
    }
  };

  const kpiCards = [
    { title: 'Total Quantity', value: safeNumberFormat(summaryKPIs?.totalQuantity), icon: 'ri-shopping-bag-3-line', bgColor: 'bg-blue-50', iconColor: 'text-blue-600', borderLeft: 'border-blue-200', trend: '+12.5%', trendColor: 'text-green-600' },
    { title: 'Total NSV', value: safeNumberFormat(summaryKPIs?.totalNSV, '₹'), icon: 'ri-money-dollar-circle-line', bgColor: 'bg-green-50', iconColor: 'text-green-600', borderLeft: 'border-green-200', trend: '+8.2%', trendColor: 'text-green-600' },
    { title: 'Avg Discount', value: safePercentageFormat(summaryKPIs?.avgDiscountPercentage), icon: 'ri-percent-line', bgColor: 'bg-amber-50', iconColor: 'text-amber-600', borderLeft: 'border-amber-200', trend: '-2.1%', trendColor: 'text-red-600' },
    { title: 'Top SKU', value: summaryKPIs?.topSellingSKU?.productName || 'N/A', icon: 'ri-award-line', bgColor: 'bg-purple-50', iconColor: 'text-purple-600', borderLeft: 'border-purple-200', trend: '+15.3%', trendColor: 'text-green-600' },
    { title: 'Total Tax', value: safeNumberFormat(summaryKPIs?.totalTax, '₹'), icon: 'ri-bank-card-line', bgColor: 'bg-red-50', iconColor: 'text-red-600', borderLeft: 'border-red-200', trend: '+5.7%', trendColor: 'text-green-600' },
    { title: 'Records', value: safeNumberFormat(summaryKPIs?.recordCount), icon: 'ri-file-list-3-line', bgColor: 'bg-indigo-50', iconColor: 'text-indigo-600', borderLeft: 'border-indigo-200', trend: '+3.4%', trendColor: 'text-green-600' }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
      {kpiCards.map((kpi, index) => (
        <div key={index} className={`flex items-center justify-between p-3 rounded border-l-4 border border-gray-100 ${kpi.borderLeft} ${kpi.bgColor}`}>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">{kpi.title}</p>
            <p className={`text-sm font-bold truncate ${kpi.iconColor}`}>{kpi.value}</p>
            <p className={`text-[10px] font-medium ${kpi.trendColor}`}>{kpi.trend} vs last month</p>
          </div>
          <div className={`w-9 h-9 rounded flex items-center justify-center flex-shrink-0 ${kpi.bgColor} ${kpi.iconColor}`}>
            <i className={`${kpi.icon} text-lg`}></i>
          </div>
        </div>
      ))}
    </div>
  );
}; 