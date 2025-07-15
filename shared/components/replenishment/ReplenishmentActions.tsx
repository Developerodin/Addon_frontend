import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/shared/data/utilities/api';

interface ReplenishmentActionsProps {
  onGenerateForecast: (data: {
    storeId: string;
    productId: string;
    month: string;
    method: 'moving_average' | 'weighted_average';
  }) => Promise<void>;
  onCalculateReplenishment: (data: {
    storeId: string;
    productId: string;
    month: string;
    currentStock: number;
    variability: 'standard' | 'high' | 'seasonal';
  }) => Promise<void>;
  loading: boolean;
}

interface Store {
  id: string;
  storeId: string;
  storeName: string;
  storeNumber: string;
  city: string;
  contactPerson: string;
  isActive: boolean;
}

interface Product {
  id: string;
  name: string;
  softwareCode: string;
  styleCode: string;
  category: string;
  description: string;
}

interface PaginatedResponse<T> {
  results: T[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const ReplenishmentActions: React.FC<ReplenishmentActionsProps> = ({
  onGenerateForecast,
  onCalculateReplenishment,
  loading
}) => {
  const [showForecastModal, setShowForecastModal] = useState(false);
  const [showReplenishmentModal, setShowReplenishmentModal] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [modalType, setModalType] = useState<'forecast' | 'replenishment'>('forecast');
  
  // Store and Product data
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [storesPagination, setStoresPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalResults: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [productsPagination, setProductsPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalResults: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [storeSearchQuery, setStoreSearchQuery] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');

  const [forecastForm, setForecastForm] = useState({
    storeId: '',
    productId: '',
    month: '',
    method: 'moving_average' as 'moving_average' | 'weighted_average'
  });
  const [replenishmentForm, setReplenishmentForm] = useState({
    storeId: '',
    productId: '',
    month: '',
    currentStock: '',
    variability: 'standard' as 'standard' | 'high' | 'seasonal'
  });
  
  // Track selected names for display
  const [forecastStoreName, setForecastStoreName] = useState('');
  const [forecastProductName, setForecastProductName] = useState('');
  const [replenishmentStoreName, setReplenishmentStoreName] = useState('');
  const [replenishmentProductName, setReplenishmentProductName] = useState('');

  // Fetch stores
  const fetchStores = async (page: number = 1, search: string = '') => {
    console.log('Fetching stores - Page:', page, 'Search:', search);
    setStoresLoading(true);
    try {
      const params = new URLSearchParams();
      
      // Add pagination parameters
      params.append('page', page.toString());
      params.append('limit', '10');
      
      // Add search parameter if provided
      if (search.trim()) {
        params.append('storeName', search.trim());
      }
      
      const url = `${API_BASE_URL}/stores?${params}`;
      console.log('Stores API URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const data: PaginatedResponse<Store> = await response.json();
      console.log('Stores API response:', data);
      
      setStores(data.results || []);
      const newPagination = {
        page: data.page || 1,
        limit: data.limit || 10,
        totalPages: data.totalPages || 1,
        totalResults: data.totalResults || 0,
        hasNextPage: (data.page || 1) < (data.totalPages || 1),
        hasPrevPage: (data.page || 1) > 1
      };
      console.log('Setting stores pagination:', newPagination);
      setStoresPagination(newPagination);
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setStoresLoading(false);
    }
  };

  // Fetch products
  const fetchProducts = async (page: number = 1, search: string = '') => {
    console.log('Fetching products - Page:', page, 'Search:', search);
    setProductsLoading(true);
    try {
      const params = new URLSearchParams();
      
      // Add pagination parameters
      params.append('page', page.toString());
      params.append('limit', '10');
      
      // Add search parameter if provided
      if (search.trim()) {
        params.append('search', search.trim());
      }
      
      const url = `${API_BASE_URL}/products?${params}`;
      console.log('Products API URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const data: PaginatedResponse<Product> = await response.json();
      console.log('Products API response:', data);
      
      setProducts(data.results || []);
      const newPagination = {
        page: data.page || 1,
        limit: data.limit || 10,
        totalPages: data.totalPages || 1,
        totalResults: data.totalResults || 0,
        hasNextPage: (data.page || 1) < (data.totalPages || 1),
        hasPrevPage: (data.page || 1) > 1
      };
      console.log('Setting products pagination:', newPagination);
      setProductsPagination(newPagination);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  // Handle store selection
  const handleStoreSelect = (store: Store) => {
    if (modalType === 'forecast') {
      setForecastForm(prev => ({ ...prev, storeId: store.id }));
      setForecastStoreName(store.storeName);
    } else {
      setReplenishmentForm(prev => ({ ...prev, storeId: store.id }));
      setReplenishmentStoreName(store.storeName);
    }
    setShowStoreModal(false);
  };

  // Handle product selection
  const handleProductSelect = (product: Product) => {
    if (modalType === 'forecast') {
      setForecastForm(prev => ({ ...prev, productId: product.id }));
      setForecastProductName(product.name);
    } else {
      setReplenishmentForm(prev => ({ ...prev, productId: product.id }));
      setReplenishmentProductName(product.name);
    }
    setShowProductModal(false);
  };

  // Handle store search
  const handleStoreSearch = () => {
    fetchStores(1, storeSearchQuery);
  };

  // Handle product search
  const handleProductSearch = () => {
    fetchProducts(1, productSearchQuery);
  };

  // Handle store pagination
  const handleStorePageChange = (newPage: number) => {
    console.log('Store pagination clicked:', newPage, 'Current search:', storeSearchQuery);
    if (newPage >= 1 && newPage <= storesPagination.totalPages) {
      fetchStores(newPage, storeSearchQuery);
    }
  };

  // Handle product pagination
  const handleProductPageChange = (newPage: number) => {
    console.log('Product pagination clicked:', newPage, 'Current search:', productSearchQuery);
    if (newPage >= 1 && newPage <= productsPagination.totalPages) {
      fetchProducts(newPage, productSearchQuery);
    }
  };

  // Open store modal
  const openStoreModal = (type: 'forecast' | 'replenishment') => {
    setModalType(type);
    setShowStoreModal(true);
    setStoreSearchQuery('');
    fetchStores(1, '');
  };

  // Open product modal
  const openProductModal = (type: 'forecast' | 'replenishment') => {
    setModalType(type);
    setShowProductModal(true);
    setProductSearchQuery('');
    fetchProducts(1, '');
  };

  const handleGenerateForecast = async () => {
    if (!forecastForm.storeId || !forecastForm.productId || !forecastForm.month) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await onGenerateForecast({
        storeId: forecastForm.storeId,
        productId: forecastForm.productId,
        month: forecastForm.month,
        method: forecastForm.method
      });
      setShowForecastModal(false);
      setForecastForm({ storeId: '', productId: '', month: '', method: 'moving_average' });
      setForecastStoreName('');
      setForecastProductName('');
    } catch (error) {
      console.error('Failed to generate forecast:', error);
    }
  };

  const handleCalculateReplenishment = async () => {
    if (!replenishmentForm.storeId || !replenishmentForm.productId || !replenishmentForm.month || !replenishmentForm.currentStock) {
      alert('Please fill in all required fields');
      return;
    }

    const currentStock = parseInt(replenishmentForm.currentStock);
    if (isNaN(currentStock) || currentStock < 0) {
      alert('Please enter a valid current stock quantity');
      return;
    }

    try {
      await onCalculateReplenishment({
        storeId: replenishmentForm.storeId,
        productId: replenishmentForm.productId,
        month: replenishmentForm.month,
        currentStock,
        variability: replenishmentForm.variability
      });
      setShowReplenishmentModal(false);
      setReplenishmentForm({ storeId: '', productId: '', month: '', currentStock: '', variability: 'standard' });
      setReplenishmentStoreName('');
      setReplenishmentProductName('');
    } catch (error) {
      console.error('Failed to calculate replenishment:', error);
    }
  };

  return (
    <>
      {/* Action Buttons */}
      <div className="flex items-center space-x-3 mb-6">
        <button
          type="button"
          className="ti-btn ti-btn-primary"
          onClick={() => setShowForecastModal(true)}
          disabled={loading}
        >
          <i className="ri-line-chart-line me-2"></i>
          Generate Forecast
        </button>
        <button
          type="button"
          className="ti-btn ti-btn-warning"
          onClick={() => setShowReplenishmentModal(true)}
          disabled={loading}
        >
          <i className="ri-refresh-line me-2"></i>
          Calculate Replenishment
        </button>
      </div>

      {/* Generate Forecast Modal */}
      {showForecastModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Generate Forecast</h3>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setShowForecastModal(false)}
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="form-label">Store</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    className="form-control flex-1"
                    value={forecastStoreName || forecastForm.storeId}
                    placeholder="Select a store"
                    readOnly
                  />
                  <button
                    type="button"
                    className="ti-btn ti-btn-outline-primary"
                    onClick={() => openStoreModal('forecast')}
                  >
                    <i className="ri-search-line"></i>
                  </button>
                </div>
              </div>
              <div>
                <label className="form-label">Product</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    className="form-control flex-1"
                    value={forecastProductName || forecastForm.productId}
                    placeholder="Select a product"
                    readOnly
                  />
                  <button
                    type="button"
                    className="ti-btn ti-btn-outline-primary"
                    onClick={() => openProductModal('forecast')}
                  >
                    <i className="ri-search-line"></i>
                  </button>
                </div>
              </div>
              <div>
                <label className="form-label">Month</label>
                <input
                  type="month"
                  className="form-control"
                  value={forecastForm.month}
                  onChange={(e) => setForecastForm(prev => ({ ...prev, month: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">Method</label>
                <select
                  className="form-select"
                  value={forecastForm.method}
                  onChange={(e) => setForecastForm(prev => ({ ...prev, method: e.target.value as 'moving_average' | 'weighted_average' }))}
                >
                  <option value="moving_average">Moving Average</option>
                  <option value="weighted_average">Weighted Average</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                type="button"
                className="ti-btn ti-btn-secondary"
                onClick={() => setShowForecastModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-primary"
                onClick={handleGenerateForecast}
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calculate Replenishment Modal */}
      {showReplenishmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Calculate Replenishment</h3>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setShowReplenishmentModal(false)}
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="form-label">Store</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    className="form-control flex-1"
                    value={replenishmentStoreName || replenishmentForm.storeId}
                    placeholder="Select a store"
                    readOnly
                  />
                  <button
                    type="button"
                    className="ti-btn ti-btn-outline-primary"
                    onClick={() => openStoreModal('replenishment')}
                  >
                    <i className="ri-search-line"></i>
                  </button>
                </div>
              </div>
              <div>
                <label className="form-label">Product</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    className="form-control flex-1"
                    value={replenishmentProductName || replenishmentForm.productId}
                    placeholder="Select a product"
                    readOnly
                  />
                  <button
                    type="button"
                    className="ti-btn ti-btn-outline-primary"
                    onClick={() => openProductModal('replenishment')}
                  >
                    <i className="ri-search-line"></i>
                  </button>
                </div>
              </div>
              <div>
                <label className="form-label">Month</label>
                <input
                  type="month"
                  className="form-control"
                  value={replenishmentForm.month}
                  onChange={(e) => setReplenishmentForm(prev => ({ ...prev, month: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">Current Stock</label>
                <input
                  type="number"
                  className="form-control"
                  value={replenishmentForm.currentStock}
                  onChange={(e) => setReplenishmentForm(prev => ({ ...prev, currentStock: e.target.value }))}
                  placeholder="Enter current stock"
                  min="0"
                />
              </div>
              <div>
                <label className="form-label">Variability</label>
                <select
                  className="form-select"
                  value={replenishmentForm.variability}
                  onChange={(e) => setReplenishmentForm(prev => ({ ...prev, variability: e.target.value as 'standard' | 'high' | 'seasonal' }))}
                >
                  <option value="standard">Standard</option>
                  <option value="high">High</option>
                  <option value="seasonal">Seasonal</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                type="button"
                className="ti-btn ti-btn-secondary"
                onClick={() => setShowReplenishmentModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-warning"
                onClick={handleCalculateReplenishment}
                disabled={loading}
              >
                {loading ? 'Calculating...' : 'Calculate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Store Selection Modal */}
      {showStoreModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Select Store</h3>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setShowStoreModal(false)}
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            
            {/* Search Bar */}
            <div className="mb-4">
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    className="form-control pl-10 pr-4 w-full"
                    placeholder="Search stores by name..."
                    value={storeSearchQuery}
                    onChange={(e) => setStoreSearchQuery(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleStoreSearch();
                      }
                    }}
                  />
                  <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                </div>
                <button
                  type="button"
                  className="ti-btn ti-btn-primary px-6 whitespace-nowrap"
                  onClick={handleStoreSearch}
                >
                  Search
                </button>
              </div>
            </div>

            {/* Stores Table */}
            <div className="overflow-y-auto max-h-96">
              {storesLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading stores...</p>
                </div>
              ) : stores.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No stores found</p>
                </div>
              ) : (
                <table className="table w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-3 w-1/4">Store Name</th>
                      <th className="text-left p-3 w-1/6">Store ID</th>
                      <th className="text-left p-3 w-1/6">City</th>
                      <th className="text-left p-3 w-1/6">Contact</th>
                      <th className="text-left p-3 w-1/6">Status</th>
                      <th className="text-left p-3 w-1/6">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stores.map((store) => (
                      <tr key={store.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="font-medium truncate">{store.storeName}</div>
                          <div className="text-sm text-gray-500 truncate">{store.storeNumber}</div>
                        </td>
                        <td className="p-3 text-sm truncate">{store.storeId}</td>
                        <td className="p-3 text-sm truncate">{store.city}</td>
                        <td className="p-3 text-sm truncate">{store.contactPerson}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            store.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {store.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            type="button"
                            className="ti-btn ti-btn-primary px-3 py-1 text-sm whitespace-nowrap"
                            onClick={() => handleStoreSelect(store)}
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {!storesLoading && stores.length > 0 && (
              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <div className="text-sm text-gray-500">
                  Showing {((storesPagination.page - 1) * storesPagination.limit) + 1} to {Math.min(storesPagination.page * storesPagination.limit, storesPagination.totalResults)} of {storesPagination.totalResults} stores
                  <br />
                  <span className="text-xs text-gray-400">
                    Page {storesPagination.page} of {storesPagination.totalPages} | 
                    hasPrev: {storesPagination.hasPrevPage ? 'true' : 'false'} | 
                    hasNext: {storesPagination.hasNextPage ? 'true' : 'false'}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    className="ti-btn ti-btn-outline-secondary px-4 py-2 whitespace-nowrap"
                    onClick={() => {
                      console.log('Previous button clicked, current page:', storesPagination.page, 'hasPrevPage:', storesPagination.hasPrevPage);
                      handleStorePageChange(storesPagination.page - 1);
                    }}
                    disabled={!storesPagination.hasPrevPage}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="ti-btn ti-btn-outline-secondary px-4 py-2 whitespace-nowrap"
                    onClick={() => {
                      console.log('Next button clicked, current page:', storesPagination.page, 'hasNextPage:', storesPagination.hasNextPage);
                      handleStorePageChange(storesPagination.page + 1);
                    }}
                    disabled={!storesPagination.hasNextPage}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Selection Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Select Product</h3>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setShowProductModal(false)}
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            
            {/* Search Bar */}
            <div className="mb-4">
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    className="form-control pl-10 pr-4 w-full"
                    placeholder="Search products by name, style code, or category..."
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleProductSearch();
                      }
                    }}
                  />
                  <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                </div>
                <button
                  type="button"
                  className="ti-btn ti-btn-primary px-6 whitespace-nowrap"
                  onClick={handleProductSearch}
                >
                  Search
                </button>
              </div>
            </div>

            {/* Products Table */}
            <div className="overflow-y-auto max-h-96">
              {productsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading products...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No products found</p>
                </div>
              ) : (
                <table className="table w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-3 w-1/4">Product Name</th>
                      <th className="text-left p-3 w-1/6">Style Code</th>
                      <th className="text-left p-3 w-1/6">Software Code</th>
                      <th className="text-left p-3 w-1/6">Category</th>
                      <th className="text-left p-3 w-1/6">Description</th>
                      <th className="text-left p-3 w-1/6">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="font-medium truncate">{product.name}</div>
                        </td>
                        <td className="p-3 text-sm truncate">{product.styleCode}</td>
                        <td className="p-3 text-sm truncate">{product.softwareCode}</td>
                        <td className="p-3 text-sm truncate">{product.category}</td>
                        <td className="p-3 text-sm text-gray-500 truncate">
                          {product.description}
                        </td>
                        <td className="p-3">
                          <button
                            type="button"
                            className="ti-btn ti-btn-primary px-3 py-1 text-sm whitespace-nowrap"
                            onClick={() => handleProductSelect(product)}
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {!productsLoading && products.length > 0 && (
              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <div className="text-sm text-gray-500">
                  Showing {((productsPagination.page - 1) * productsPagination.limit) + 1} to {Math.min(productsPagination.page * productsPagination.limit, productsPagination.totalResults)} of {productsPagination.totalResults} products
                  <br />
                  <span className="text-xs text-gray-400">
                    Page {productsPagination.page} of {productsPagination.totalPages} | 
                    hasPrev: {productsPagination.hasPrevPage ? 'true' : 'false'} | 
                    hasNext: {productsPagination.hasNextPage ? 'true' : 'false'}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    className="ti-btn ti-btn-outline-secondary px-4 py-2 whitespace-nowrap"
                    onClick={() => {
                      console.log('Product Previous button clicked, current page:', productsPagination.page, 'hasPrevPage:', productsPagination.hasPrevPage);
                      handleProductPageChange(productsPagination.page - 1);
                    }}
                    disabled={!productsPagination.hasPrevPage}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="ti-btn ti-btn-outline-secondary px-4 py-2 whitespace-nowrap"
                    onClick={() => {
                      console.log('Product Next button clicked, current page:', productsPagination.page, 'hasNextPage:', productsPagination.hasNextPage);
                      handleProductPageChange(productsPagination.page + 1);
                    }}
                    disabled={!productsPagination.hasNextPage}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ReplenishmentActions; 