import React, { useState, useEffect } from 'react';
import { ReplenishmentFilters } from '@/shared/services/replenishmentService';
import { API_BASE_URL } from '@/shared/data/utilities/api';

interface ReplenishmentFiltersProps {
  filters: ReplenishmentFilters;
  onFiltersChange: (filters: Partial<ReplenishmentFilters>) => void;
  loading?: boolean;
}

interface Store {
  _id: string;
  storeName: string;
  storeCode: string;
}

interface Product {
  _id: string;
  productName: string;
  productCode: string;
}

const ReplenishmentFiltersComponent: React.FC<ReplenishmentFiltersProps> = ({
  filters,
  onFiltersChange,
  loading = false
}) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [localFilters, setLocalFilters] = useState<ReplenishmentFilters>(filters);

  // Load stores and products for dropdowns
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        // Load stores
        const storesResponse = await fetch(`${API_BASE_URL}/stores?limit=100`);
        if (storesResponse.ok) {
          const storesData = await storesResponse.json();
          setStores(storesData.results || []);
        }

        // Load products
        const productsResponse = await fetch(`${API_BASE_URL}/products?limit=100`);
        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          setProducts(productsData.results || []);
        }
      } catch (error) {
        console.error('Failed to load dropdown data:', error);
      }
    };

    loadDropdownData();
  }, []);

  // Generate month options (last 12 months)
  const generateMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const value = date.toISOString().slice(0, 7); // YYYY-MM format
      const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      options.push({ value, label });
    }
    
    return options;
  };

  const monthOptions = generateMonthOptions();

  const handleFilterChange = (key: keyof ReplenishmentFilters, value: string) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      store: undefined,
      product: undefined,
      month: undefined,
      page: 1
    };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  return (
    <div className="box mb-6">
      <div className="box-header">
        <h3 className="box-title">Filters</h3>
      </div>
      <div className="box-body">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Store Filter */}
          <div>
            <label className="form-label">Store</label>
            <select
              className="form-select"
              value={localFilters.store || ''}
              onChange={(e) => handleFilterChange('store', e.target.value)}
              disabled={loading}
            >
              <option value="">All Stores</option>
              {stores.map((store) => (
                <option key={store._id} value={store._id}>
                  {store.storeName} ({store.storeCode})
                </option>
              ))}
            </select>
          </div>

          {/* Product Filter */}
          <div>
            <label className="form-label">Product</label>
            <select
              className="form-select"
              value={localFilters.product || ''}
              onChange={(e) => handleFilterChange('product', e.target.value)}
              disabled={loading}
            >
              <option value="">All Products</option>
              {products.map((product) => (
                <option key={product._id} value={product._id}>
                  {product.productName} ({product.productCode})
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div>
            <label className="form-label">Month</label>
            <select
              className="form-select"
              value={localFilters.month || ''}
              onChange={(e) => handleFilterChange('month', e.target.value)}
              disabled={loading}
            >
              <option value="">All Months</option>
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-end space-x-2">
            <button
              type="button"
              className="ti-btn ti-btn-primary"
              onClick={handleApplyFilters}
              disabled={loading}
            >
              <i className="ri-filter-line me-1"></i>
              Apply
            </button>
            <button
              type="button"
              className="ti-btn ti-btn-secondary"
              onClick={handleClearFilters}
              disabled={loading}
            >
              <i className="ri-refresh-line me-1"></i>
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReplenishmentFiltersComponent; 