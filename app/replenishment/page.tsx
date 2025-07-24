"use client";

import React, { useEffect } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { useReplenishment } from '@/shared/hooks/useReplenishment';
import {
  ReplenishmentSummaryCards,
  ReplenishmentFilters,
  ReplenishmentTable,
  ReplenishmentCharts,
  ReplenishmentActions,
  ReplenishmentErrorBoundary
} from '@/shared/components/replenishment';

export default function ReplenishmentPage() {
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
    <ReplenishmentErrorBoundary>
      <Seo title="Replenishment Dashboard" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Replenishment Dashboard</h1>
                <p className="text-gray-500 mt-1">
                  AI-powered demand forecasting and inventory replenishment management
                </p>
              </div>
              <div className="flex items-center gap-2">
                {healthStatus && (
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                    healthStatus.status === 'healthy' 
                      ? 'bg-success/10 text-success' 
                      : 'bg-danger/10 text-danger'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      healthStatus.status === 'healthy' ? 'bg-success' : 'bg-danger'
                    }`}></div>
                    {healthStatus.status === 'healthy' ? 'Service Online' : 'Service Offline'}
                  </div>
                )}
              </div>
            </div>
          </div>

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

          {/* Summary Cards */}
          <ReplenishmentSummaryCards
            summary={summary}
            accuracy={accuracy}
            healthStatus={healthStatus}
            loading={loading}
          />

          {/* Action Buttons */}
          <ReplenishmentActions
            onGenerateForecast={handleGenerateForecast}
            onCalculateReplenishment={handleCalculateReplenishment}
            loading={loading}
          />

          {/* Filters */}
          <ReplenishmentFilters
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
        </div>
      </div>
    </ReplenishmentErrorBoundary>
  );
} 