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
    {
      title: 'Total Quantity',
      value: safeNumberFormat(summaryKPIs?.totalQuantity),
      icon: 'ri-shopping-bag-3-line',
      gradient: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      trend: '+12.5%',
      trendColor: 'text-green-600'
    },
    {
      title: 'Total NSV',
      value: safeNumberFormat(summaryKPIs?.totalNSV, '₹'),
      icon: 'ri-money-dollar-circle-line',
      gradient: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      trend: '+8.2%',
      trendColor: 'text-green-600'
    },
    {
      title: 'Avg Discount',
      value: safePercentageFormat(summaryKPIs?.avgDiscountPercentage),
      icon: 'ri-percent-line',
      gradient: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
      trend: '-2.1%',
      trendColor: 'text-red-600'
    },
    {
      title: 'Top SKU',
      value: summaryKPIs?.topSellingSKU?.productName || 'N/A',
      icon: 'ri-award-line',
      gradient: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      trend: '+15.3%',
      trendColor: 'text-green-600'
    },
    {
      title: 'Total Tax',
      value: safeNumberFormat(summaryKPIs?.totalTax, '₹'),
      icon: 'ri-bank-card-line',
      gradient: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
      trend: '+5.7%',
      trendColor: 'text-green-600'
    },
    {
      title: 'Records',
      value: safeNumberFormat(summaryKPIs?.recordCount),
      icon: 'ri-file-list-3-line',
      gradient: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      trend: '+3.4%',
      trendColor: 'text-green-600'
    }
  ];

  return (
    <div className="grid grid-cols-12 gap-6 mb-8">
      {kpiCards.map((kpi, index) => (
        <div key={index} className="xl:col-span-2 lg:col-span-3 md:col-span-6 col-span-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300 group">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl ${kpi.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                <i className={`${kpi.icon} text-xl ${kpi.iconColor}`}></i>
              </div>
              <div className="text-right">
                <span className={`text-xs font-medium ${kpi.trendColor}`}>
                  {kpi.trend}
                </span>
                <div className="text-xs text-gray-500 mt-1">vs last month</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-600">{kpi.title}</h3>
              <p className={`text-2xl font-bold ${kpi.title === 'Top SKU' ? 'text-sm truncate' : ''}`}>
                {kpi.value}
              </p>
            </div>

            {/* Gradient accent line */}
            <div className={`h-1 bg-gradient-to-r ${kpi.gradient} rounded-full mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
          </div>
        </div>
      ))}
    </div>
  );
}; 