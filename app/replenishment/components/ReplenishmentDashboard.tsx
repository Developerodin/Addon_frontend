"use client";

import React from 'react';
import { useReplenishment } from '@/shared/hooks/useReplenishment';
import {
  ReplenishmentTable,
  ReplenishmentCharts,
  ReplenishmentActions,
  ReplenishmentErrorBoundary
} from '@/shared/components/replenishment';

const ReplenishmentDashboard: React.FC = () => {
  const {
    forecasts,
    replenishments,
    accuracy,
    trends,
    summary,
    healthStatus,
    modelInfo,
    loading,
    error,
    pagination,
    filters,
    generateForecast,
    calculateReplenishment,
    updateForecast,
    deleteForecast,
    updateFilters,
    clearError,
    calculateDeviation,
    getAccuracyColor,
    getDeviationColor,
    formatMonth
  } = useReplenishment();

  // Handle page changes
  const handlePageChange = (page: number) => {
    updateFilters({ page });
  };

  // Handle forecast updates
  const handleUpdateForecast = async (forecastId: string, actualQty: number) => {
    try {
      await updateForecast(forecastId, actualQty);
    } catch (error) {
      console.error('Failed to update forecast:', error);
    }
  };

  // Handle forecast generation
  const handleGenerateForecast = async (data: {
    store_id: string;
    product_id: string;
    forecast_month: string;
    historical_months?: number;
  }) => {
    try {
      const result = await generateForecast(data);
      console.log('Forecast generated:', result);
    } catch (error) {
      console.error('Failed to generate forecast:', error);
    }
  };

  // Handle replenishment calculation
  const handleCalculateReplenishment = async (data: {
    store_id: string;
    product_id: string;
    forecast_month: string;
    current_stock: number;
    safety_stock: number;
  }) => {
    try {
      await calculateReplenishment(data);
    } catch (error) {
      console.error('Failed to calculate replenishment:', error);
    }
  };

  // Handle filter changes
  const handleFiltersChange = (newFilters: any) => {
    updateFilters(newFilters);
  };

  return (
    <>
      {/* Error Alert */}
      {error && (
        <div className="box border-danger/20 bg-danger/5 mb-6">
          <div className="box-body">
            <div className="flex items-center">
              <i className="ri-error-warning-line text-danger text-xl me-3"></i>
              <div className="flex-1">
                <h4 className="font-medium text-danger">Error</h4>
                <p className="text-danger/80">{error}</p>
              </div>
              <button
                type="button"
                className="ti-btn ti-btn-sm ti-btn-outline-danger"
                onClick={clearError}
              >
                <i className="ri-close-line"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <ReplenishmentActions
        onGenerateForecast={handleGenerateForecast}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        loading={loading}
      />

      {/* Charts */}
      <ReplenishmentCharts
        trends={trends}
        accuracy={accuracy}
        modelInfo={modelInfo}
        loading={loading}
        forecasts={forecasts}
      />

      {/* Data Table */}
      <ReplenishmentTable
        forecasts={forecasts}
        replenishments={replenishments}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onUpdateForecast={handleUpdateForecast}
        onDeleteForecast={deleteForecast}
        formatMonth={formatMonth}
        calculateDeviation={calculateDeviation}
        getAccuracyColor={getAccuracyColor}
        getDeviationColor={getDeviationColor}
      />
    </>
  );
};

export default ReplenishmentDashboard;
