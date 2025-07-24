import React, { useState } from 'react';
import type { ReplenishmentFilters as ReplenishmentFiltersType } from '@/shared/services/replenishmentService';

interface ReplenishmentFiltersProps {
  filters: ReplenishmentFiltersType;
  onFiltersChange: (filters: Partial<ReplenishmentFiltersType>) => void;
  loading: boolean;
}

export const ReplenishmentFilters: React.FC<ReplenishmentFiltersProps> = ({
  filters,
  onFiltersChange,
  loading
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

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

  const hasActiveFilters = filters.store_id || filters.product_id || filters.month;

  return (
    <div className="box mb-6">
      <div className="box-header">
        <div className="flex items-center justify-between">
          <h3 className="box-title">Filters</h3>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                disabled={loading}
                className="ti-btn ti-btn-sm ti-btn-outline-secondary whitespace-nowrap min-w-[120px] ml-2"
              >
                <i className="ri-refresh-line"></i>
                Clear All
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="ti-btn ti-btn-sm ti-btn-outline-primary whitespace-nowrap min-w-[120px] ml-2"
            >
              <i className={`ri-arrow-${isExpanded ? 'up' : 'down'}-line`}></i>
              {isExpanded ? 'Hide' : 'Show'} Filters
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="box-body border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Store ID Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store ID</label>
              <div className="relative">
                <input
                  type="text"
                  value={filters.store_id || ''}
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
                  value={filters.product_id || ''}
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
                  value={filters.month || ''}
                  onChange={(e) => handleFilterChange('month', e.target.value || undefined)}
                  className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
                  value={filters.limit || 10}
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
              <div className="flex flex-wrap gap-2">
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
                  {filters.store_id && (
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
                  {filters.product_id && (
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
                  {filters.month && (
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
  );
}; 