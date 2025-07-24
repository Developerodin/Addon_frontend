import React, { useState } from 'react';
import type { ReplenishmentFilters as ReplenishmentFiltersType } from '@/shared/services/replenishmentService';

interface ReplenishmentActionsProps {
  onGenerateForecast: (data: {
    store_id: string;
    product_id: string;
    forecast_month: string;
    historical_months?: number;
  }) => Promise<any>;
  filters: ReplenishmentFiltersType;
  onFiltersChange: (filters: Partial<ReplenishmentFiltersType>) => void;
  loading: boolean;
}

export const ReplenishmentActions: React.FC<ReplenishmentActionsProps> = ({
  onGenerateForecast,
  filters,
  onFiltersChange,
  loading
}) => {
  const [showForecastModal, setShowForecastModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [forecastForm, setForecastForm] = useState({
    store_id: '',
    product_id: '',
    forecast_month: '',
    historical_months: 12
  });


  const handleForecastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Convert month format (YYYY-MM) to full datetime format (YYYY-MM-01T00:00:00)
      const forecastData = {
        ...forecastForm,
        forecast_month: forecastForm.forecast_month ? `${forecastForm.forecast_month}-01T00:00:00` : ''
      };
      
      await onGenerateForecast(forecastData);
      setShowForecastModal(false);
      setForecastForm({ store_id: '', product_id: '', forecast_month: '', historical_months: 12 });
    } catch (error) {
      console.error('Failed to generate forecast:', error);
    }
  };



  const handleFilterChange = (key: keyof ReplenishmentFiltersType, value: any) => {
    onFiltersChange({ [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      store_id: undefined,
      product_id: undefined,
      month: undefined,
      page: 1
    });
  };

  const hasActiveFilters = filters?.store_id || filters?.product_id || filters?.month;

  return (
    <>
      <div className="box mb-6">
        <div className="box-header">
          <h3 className="box-title">Quick Actions</h3>
        </div>
        <div className="box-body">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setShowForecastModal(true)}
                disabled={loading}
                className="ti-btn ti-btn-primary flex items-center gap-2 hover:scale-105 transition-transform"
              >
                <i className="ri-magic-line"></i>
                Generate Forecast
              </button>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="ti-btn ti-btn-warning flex items-center gap-2 hover:scale-105 transition-transform"
              >
                <i className={`ri-filter-${showFilters ? 'off' : 'line'} me-1`}></i>
                {showFilters ? 'Hide' : 'Show'} Filters
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  disabled={loading}
                  className="ti-btn ti-btn-sm ti-btn-outline-secondary whitespace-nowrap min-w-[100px]"
                >
                  <i className="ri-refresh-line me-1"></i>
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Filters Section */}
          {showFilters && (
            <div className="mt-6 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Store ID Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Store ID</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={filters?.store_id || ''}
                      onChange={(e) => handleFilterChange('store_id', e.target.value || undefined)}
                      placeholder="Enter store ID"
                      className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      disabled={loading}
                    />
                    <i className="ri-store-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                  </div>
                </div>

                {/* Product ID Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product ID</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={filters?.product_id || ''}
                      onChange={(e) => handleFilterChange('product_id', e.target.value || undefined)}
                      placeholder="Enter product ID"
                      className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      disabled={loading}
                    />
                    <i className="ri-box-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                  </div>
                </div>

                {/* Month Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Forecast Month</label>
                  <div className="relative">
                    <input
                      type="month"
                      value={filters?.month || ''}
                      onChange={(e) => handleFilterChange('month', e.target.value || undefined)}
                      className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-transparent"
                      disabled={loading}
                    />
                    <i className="ri-calendar-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                  </div>
                </div>

                {/* Results Per Page */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Results Per Page</label>
                  <div className="relative">
                    <select
                      value={filters?.limit || 10}
                      onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                      className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      disabled={loading}
                    >
                      <option value={10}>10 per page</option>
                      <option value={25}>25 per page</option>
                      <option value={50}>50 per page</option>
                      <option value={100}>100 per page</option>
                    </select>
                    <i className="ri-list-settings-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                  </div>
                </div>
              </div>

              {/* Quick Filter Buttons */}
              <div className="mt-6 pt-4 border-t">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-gray-600 whitespace-nowrap">Quick Filters:</span>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => handleFilterChange('month', new Date().toISOString().slice(0, 7))}
                      disabled={loading}
                      className="ti-btn ti-btn-sm ti-btn-outline-primary whitespace-nowrap min-w-[110px]"
                    >
                      Current Month
                    </button>
                    <button
                      onClick={() => {
                        const lastMonth = new Date();
                        lastMonth.setMonth(lastMonth.getMonth() - 1);
                        handleFilterChange('month', lastMonth.toISOString().slice(0, 7));
                      }}
                      disabled={loading}
                      className="ti-btn ti-btn-sm ti-btn-outline-secondary whitespace-nowrap min-w-[110px]"
                    >
                      Last Month
                    </button>
                    <button
                      onClick={() => {
                        const nextMonth = new Date();
                        nextMonth.setMonth(nextMonth.getMonth() + 1);
                        handleFilterChange('month', nextMonth.toISOString().slice(0, 7));
                      }}
                      disabled={loading}
                      className="ti-btn ti-btn-sm ti-btn-outline-warning whitespace-nowrap min-w-[110px]"
                    >
                      Next Month
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Filters Display */}
              {hasActiveFilters && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 whitespace-nowrap">Active Filters:</span>
                    <div className="flex flex-wrap gap-2">
                      {filters?.store_id && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full whitespace-nowrap">
                          Store: {filters.store_id}
                          <button
                            onClick={() => handleFilterChange('store_id', undefined)}
                            className="hover:bg-primary/20 rounded-full p-0.5"
                          >
                            <i className="ri-close-line text-xs"></i>
                          </button>
                        </span>
                      )}
                      {filters?.product_id && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-success/10 text-success text-xs rounded-full whitespace-nowrap">
                          Product: {filters.product_id}
                          <button
                            onClick={() => handleFilterChange('product_id', undefined)}
                            className="hover:bg-success/20 rounded-full p-0.5"
                          >
                            <i className="ri-close-line text-xs"></i>
                          </button>
                        </span>
                      )}
                      {filters?.month && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-warning/10 text-warning text-xs rounded-full whitespace-nowrap">
                          Month: {new Date(filters.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                          <button
                            onClick={() => handleFilterChange('month', undefined)}
                            className="hover:bg-warning/20 rounded-full p-0.5"
                          >
                            <i className="ri-close-line text-xs"></i>
                          </button>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Forecast Modal */}
      {showForecastModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Generate New Forecast</h3>
              <button
                onClick={() => setShowForecastModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            
            <form onSubmit={handleForecastSubmit} className="p-4">
            <div className="space-y-4">
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Store ID</label>
                  <input
                    type="text"
                    value={forecastForm.store_id}
                    onChange={(e) => setForecastForm(prev => ({ ...prev, store_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter store ID"
                    required
                  />
                </div>
                
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product ID</label>
                  <input
                    type="text"
                    value={forecastForm.product_id}
                    onChange={(e) => setForecastForm(prev => ({ ...prev, product_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter product ID"
                    required
                  />
                </div>
                
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Forecast Month</label>
                <input
                  type="month"
                    value={forecastForm.forecast_month}
                    onChange={(e) => setForecastForm(prev => ({ ...prev, forecast_month: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                />
              </div>
                
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Historical Months</label>
                <select
                    value={forecastForm.historical_months}
                    onChange={(e) => setForecastForm(prev => ({ ...prev, historical_months: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value={6}>6 months</option>
                    <option value={12}>12 months</option>
                    <option value={18}>18 months</option>
                    <option value={24}>24 months</option>
                </select>
              </div>
            </div>
              
              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Generate Forecast'}
                </button>
              <button
                type="button"
                onClick={() => setShowForecastModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
            </form>
          </div>
        </div>
      )}


    </>
  );
};