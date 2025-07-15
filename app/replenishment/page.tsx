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
    loading,
    error,
    pagination,
    filters,
    generateForecast,
    calculateReplenishment,
    updateForecast,
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
    storeId: string;
    productId: string;
    month: string;
    method: 'moving_average' | 'weighted_average';
  }) => {
    try {
      await generateForecast(data);
    } catch (error) {
      console.error('Failed to generate forecast:', error);
    }
  };

  // Handle replenishment calculation
  const handleCalculateReplenishment = async (data: {
    storeId: string;
    productId: string;
    month: string;
    currentStock: number;
    variability: 'standard' | 'high' | 'seasonal';
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
                  Manage demand forecasting and inventory replenishment
                </p>
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
            loading={loading}
          />

          {/* Data Table */}
          <ReplenishmentTable
            forecasts={forecasts}
            replenishments={replenishments}
            loading={loading}
            pagination={pagination}
            onPageChange={handlePageChange}
            onUpdateForecast={handleUpdateForecast}
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