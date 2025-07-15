import React from 'react';
import { ReplenishmentSummary, ForecastAccuracy } from '@/shared/services/replenishmentService';

interface ReplenishmentSummaryCardsProps {
  summary: ReplenishmentSummary | null;
  accuracy: ForecastAccuracy | null;
  loading: boolean;
}

const ReplenishmentSummaryCards: React.FC<ReplenishmentSummaryCardsProps> = ({
  summary,
  accuracy,
  loading
}) => {
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
      {/* Total Forecasts */}
      <div className="box">
        <div className="box-body">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Forecasts</p>
              <h3 className="text-2xl font-bold text-gray-800">
                {summary?.totalForecasts || 0}
              </h3>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <i className="ri-line-chart-line text-xl text-primary"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Average Accuracy */}
      <div className="box">
        <div className="box-body">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Avg. Accuracy</p>
              <h3 className="text-2xl font-bold text-gray-800">
                {summary?.avgAccuracy ? `${summary.avgAccuracy.toFixed(1)}%` : '0%'}
              </h3>
            </div>
            <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
              <i className="ri-target-line text-xl text-success"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Total Replenishments */}
      <div className="box">
        <div className="box-body">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Replenishments</p>
              <h3 className="text-2xl font-bold text-gray-800">
                {summary?.totalReplenishment || 0}
              </h3>
            </div>
            <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center">
              <i className="ri-refresh-line text-xl text-warning"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Current Accuracy */}
      <div className="box">
        <div className="box-body">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Current Accuracy</p>
              <h3 className="text-2xl font-bold text-gray-800">
                {accuracy?.accuracy ? `${accuracy.accuracy.toFixed(1)}%` : '0%'}
              </h3>
            </div>
            <div className="w-12 h-12 bg-info/10 rounded-full flex items-center justify-center">
              <i className="ri-pie-chart-line text-xl text-info"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReplenishmentSummaryCards; 