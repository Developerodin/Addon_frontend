"use client";

import React, { useEffect } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { useReplenishment } from '@/shared/hooks/useReplenishment';
import {
  ReplenishmentTable,
  ReplenishmentCharts,
  ReplenishmentActions,
  ReplenishmentErrorBoundary
} from '@/shared/components/replenishment';
import HelpIcon from '@/shared/components/HelpIcon';

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
              <div className="flex items-center space-x-3">
                <div>
                  <h1 className="box-title text-2xl font-semibold">Replenishment Dashboard</h1>
                  <p className="text-gray-500 mt-1">
                    AI-powered demand forecasting and inventory replenishment management
                  </p>
                </div>
                <HelpIcon
                  title="Replenishment Dashboard"
                  content={
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-lg mb-2">What is this page?</h4>
                        <p className="text-gray-700">
                          This is the Replenishment Dashboard that provides AI-powered demand forecasting and inventory replenishment management to optimize your supply chain operations.
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-lg mb-2">What can you do here?</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li><strong>Demand Forecasting:</strong> Generate AI-powered demand predictions for products</li>
                          <li><strong>Replenishment Planning:</strong> Calculate optimal replenishment quantities</li>
                          <li><strong>Forecast Management:</strong> View, update, and manage demand forecasts</li>
                          <li><strong>Accuracy Tracking:</strong> Monitor forecast accuracy and deviation metrics</li>
                          <li><strong>Trend Analysis:</strong> Analyze demand trends and patterns</li>
                          <li><strong>Health Monitoring:</strong> Track inventory health status</li>
                          <li><strong>Model Performance:</strong> View AI model information and performance metrics</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-lg mb-2">Key Features:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li><strong>AI-Powered Forecasting:</strong> Advanced algorithms for demand prediction</li>
                          <li><strong>Interactive Charts:</strong> Visual representation of forecasts and trends</li>
                          <li><strong>Real-time Updates:</strong> Live updates of forecast accuracy and metrics</li>
                          <li><strong>Bulk Operations:</strong> Generate forecasts for multiple products at once</li>
                          <li><strong>Filtering & Search:</strong> Find specific forecasts and replenishment data</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-lg mb-2">Dashboard Components:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li><strong>Forecast Table:</strong> Detailed view of all forecasts with accuracy metrics</li>
                          <li><strong>Charts & Analytics:</strong> Visual trends and performance indicators</li>
                          <li><strong>Action Panel:</strong> Quick actions for forecast generation and management</li>
                          <li><strong>Summary Metrics:</strong> Key performance indicators and statistics</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-lg mb-2">Tips:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li>Regularly update forecasts with actual sales data for better accuracy</li>
                          <li>Monitor forecast accuracy to improve AI model performance</li>
                          <li>Use the filtering options to focus on specific products or stores</li>
                          <li>Check the health status to identify potential inventory issues</li>
                        </ul>
                      </div>
                    </div>
                  }
                />
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
        </div>
      </div>
    </ReplenishmentErrorBoundary>
  );
} 