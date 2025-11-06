"use client";

import React, { useState } from 'react';
import { OrderFilters, SalesChannel, OrderStatus } from '../types';

interface OrderFiltersProps {
  filters: OrderFilters;
  onApplyFilters: (filters: OrderFilters) => void;
  onReset: () => void;
}

const OrderFiltersPanel: React.FC<OrderFiltersProps> = ({
  filters,
  onApplyFilters,
  onReset,
}) => {
  const [localFilters, setLocalFilters] = useState<OrderFilters>(filters);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleApply = () => {
    onApplyFilters(localFilters);
  };

  const handleReset = () => {
    const emptyFilters: OrderFilters = {};
    setLocalFilters(emptyFilters);
    onReset();
  };

  const updateFilter = (key: keyof OrderFilters, value: any) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="box">
      <div className="box-header">
        <div className="flex items-center justify-between gap-4">
          <h3 className="box-title">Filters</h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="ti-btn ti-btn-light flex items-center gap-2 whitespace-nowrap"
          >
            <i className={`ri-${isExpanded ? 'arrow-up' : 'arrow-down'}-s-line`}></i>
            <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="box-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date Range */}
            <div>
              <label className="form-label">Date From</label>
              <input
                type="date"
                className="form-control"
                value={localFilters.dateFrom || ''}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Date To</label>
              <input
                type="date"
                className="form-control"
                value={localFilters.dateTo || ''}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
              />
            </div>

            {/* Channel */}
            <div>
              <label className="form-label">Sales Channel</label>
              <select
                className="form-select"
                value={localFilters.channel || ''}
                onChange={(e) => updateFilter('channel', e.target.value as SalesChannel | '')}
              >
                <option value="">All Channels</option>
                <option value="online">Online</option>
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
                <option value="marketplace">Marketplace</option>
                <option value="direct">Direct</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={localFilters.status || ''}
                onChange={(e) => updateFilter('status', e.target.value as OrderStatus | '')}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In-Progress</option>
                <option value="packed">Packed</option>
                <option value="dispatched">Dispatched</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* SKU */}
            <div>
              <label className="form-label">SKU</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter SKU"
                value={localFilters.sku || ''}
                onChange={(e) => updateFilter('sku', e.target.value)}
              />
            </div>

            {/* Quantity Range */}
            <div>
              <label className="form-label">Min Quantity</label>
              <input
                type="number"
                className="form-control"
                placeholder="Min qty"
                value={localFilters.minQuantity || ''}
                onChange={(e) => updateFilter('minQuantity', e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
            <div>
              <label className="form-label">Max Quantity</label>
              <input
                type="number"
                className="form-control"
                placeholder="Max qty"
                value={localFilters.maxQuantity || ''}
                onChange={(e) => updateFilter('maxQuantity', e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>

            {/* Order Value Range */}
            <div>
              <label className="form-label">Min Order Value</label>
              <input
                type="number"
                className="form-control"
                placeholder="Min value"
                value={localFilters.minOrderValue || ''}
                onChange={(e) => updateFilter('minOrderValue', e.target.value ? parseFloat(e.target.value) : undefined)}
              />
            </div>
            <div>
              <label className="form-label">Max Order Value</label>
              <input
                type="number"
                className="form-control"
                placeholder="Max value"
                value={localFilters.maxOrderValue || ''}
                onChange={(e) => updateFilter('maxOrderValue', e.target.value ? parseFloat(e.target.value) : undefined)}
              />
            </div>

            {/* Search */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className="form-label">Search</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search by order number, customer name, or SKU"
                value={localFilters.search || ''}
                onChange={(e) => updateFilter('search', e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={handleReset}
              className="ti-btn ti-btn-secondary"
            >
              <i className="ri-close-line me-1"></i>
              Reset
            </button>
            <button
              onClick={handleApply}
              className="ti-btn ti-btn-primary"
            >
              <i className="ri-search-line me-1"></i>
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderFiltersPanel;

