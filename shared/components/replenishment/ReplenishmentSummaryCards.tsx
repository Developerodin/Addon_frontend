import React from 'react';
import { ReplenishmentSummary, ForecastAccuracy, HealthStatus } from '@/shared/services/replenishmentService';

interface ReplenishmentSummaryCardsProps {
  summary: ReplenishmentSummary | null;
  accuracy: ForecastAccuracy | null;
  healthStatus: HealthStatus | null;
  loading: boolean;
}

export const ReplenishmentSummaryCards: React.FC<ReplenishmentSummaryCardsProps> = ({
  summary,
  accuracy,
  healthStatus,
  loading
}) => {
  const cards = [
    {
      title: 'Total Predictions',
      value: summary?.total_predictions || 0,
      icon: 'ri-bar-chart-line',
      color: 'bg-primary/10 text-primary border-primary/20',
      trend: summary?.total_predictions > 0 ? '+12.5%' : '0%',
      trendColor: summary?.total_predictions > 0 ? 'text-success' : 'text-gray-500'
    },
    {
      title: 'Average Accuracy',
      value: `${(accuracy?.overall_accuracy || 0).toFixed(1)}%`,
      icon: 'ri-target-line',
      color: 'bg-success/10 text-success border-success/20',
      trend: accuracy?.overall_accuracy > 0 ? '+2.3%' : '0%',
      trendColor: accuracy?.overall_accuracy > 0 ? 'text-success' : 'text-gray-500'
    },
    {
      title: 'Active Stores',
      value: summary?.total_stores || 0,
      icon: 'ri-store-line',
      color: 'bg-warning/10 text-warning border-warning/20',
      trend: summary?.total_stores > 0 ? `with predictions` : 'No predictions',
      trendColor: summary?.total_stores > 0 ? 'text-success' : 'text-gray-500'
    },
    {
      title: 'Total Products',
      value: summary?.total_products || 0,
      icon: 'ri-box-line',
      color: 'bg-info/10 text-info border-info/20',
      trend: summary?.total_products > 0 ? `with predictions` : 'No predictions',
      trendColor: summary?.total_products > 0 ? 'text-success' : 'text-gray-500'
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="box animate-pulse">
            <div className="box-body">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {cards.map((card, index) => (
        <div 
          key={index} 
          className={`box border ${card.color} hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1`}
        >
          <div className="box-body">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-600 mb-1">{card.title}</h3>
                <div className="flex items-baseline">
                  <span className="text-2xl font-bold">{card.value}</span>
                  <span className={`text-sm ml-2 ${card.trendColor}`}>
                    {card.trend}
                  </span>
                </div>
              </div>
              <div className={`w-12 h-12 rounded-full ${card.color} flex items-center justify-center`}>
                <i className={`${card.icon} text-xl`}></i>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}; 