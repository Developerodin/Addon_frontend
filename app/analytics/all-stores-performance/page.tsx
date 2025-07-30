"use client";
import React, { useState, useEffect, useMemo } from 'react';
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import { dashboardService } from '@/shared/services/dashboardService';
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
} from "@/shared/utils/dashboardUtils";
import HelpIcon from '@/shared/components/HelpIcon';

interface StorePerformance {
  _id: string;
  storeName: string;
  storeId: string;
  city: string;
  totalNSV: number;
  totalQuantity: number;
  totalOrders: number;
  avgOrderValue: number;
}

interface Filters {
  city: string;
  minNSV: string;
  maxNSV: string;
  minOrders: string;
  maxOrders: string;
  sortBy: 'storeName' | 'totalNSV' | 'totalOrders' | 'avgOrderValue' | 'city';
  sortOrder: 'asc' | 'desc';
}

const AllStoresPerformance = () => {
  const [stores, setStores] = useState<StorePerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    city: '',
    minNSV: '',
    maxNSV: '',
    minOrders: '',
    maxOrders: '',
    sortBy: 'totalNSV',
    sortOrder: 'desc'
  });

  // Fetch all stores performance data
  const fetchAllStoresPerformance = async () => {
    try {
      setLoading(true);
      setError(null);

      const storesData = await dashboardService.getAllStoresPerformance();
      // Ensure storesData is an array
      const storesArray = Array.isArray(storesData) ? storesData : [];
      setStores(storesArray);
      setTotalRecords(storesArray.length);
      setTotalPages(Math.ceil(storesArray.length / pageSize));
    } catch (err) {
      console.error('Error fetching stores performance:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch stores data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllStoresPerformance();
  }, []);

  // Get unique cities for filter dropdown
  const uniqueCities = useMemo(() => {
    if (!Array.isArray(stores)) return [];
    const cities = [...new Set(stores.map(store => store.city))];
    return cities.sort();
  }, [stores]);

  // Filter and sort stores
  const filteredAndSortedStores = useMemo(() => {
    if (!Array.isArray(stores)) return [];
    let filtered = stores.filter(store => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        store.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.storeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.city.toLowerCase().includes(searchTerm.toLowerCase());

      // City filter
      const matchesCity = filters.city === '' || store.city === filters.city;

      // NSV range filter
      const matchesNSV = (!filters.minNSV || store.totalNSV >= parseFloat(filters.minNSV)) &&
                        (!filters.maxNSV || store.totalNSV <= parseFloat(filters.maxNSV));

      // Orders range filter
      const matchesOrders = (!filters.minOrders || store.totalOrders >= parseInt(filters.minOrders)) &&
                           (!filters.maxOrders || store.totalOrders <= parseInt(filters.maxOrders));

      return matchesSearch && matchesCity && matchesNSV && matchesOrders;
    });

    // Sort stores
    filtered.sort((a, b) => {
      let aValue: any = a[filters.sortBy];
      let bValue: any = b[filters.sortBy];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Update total records and pages for filtered results
    setTotalRecords(filtered.length);
    setTotalPages(Math.ceil(filtered.length / pageSize));

    return filtered;
  }, [stores, searchTerm, filters, pageSize]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!Array.isArray(filteredAndSortedStores) || filteredAndSortedStores.length === 0) return null;

    const totalNSV = filteredAndSortedStores.reduce((sum, store) => sum + store.totalNSV, 0);
    const totalQuantity = filteredAndSortedStores.reduce((sum, store) => sum + store.totalQuantity, 0);
    const totalOrders = filteredAndSortedStores.reduce((sum, store) => sum + store.totalOrders, 0);
    const avgOrderValue = totalOrders > 0 ? totalNSV / totalOrders : 0;

    return {
      totalStores: filteredAndSortedStores.length,
      totalNSV,
      totalQuantity,
      totalOrders,
      avgOrderValue
    };
  }, [filteredAndSortedStores]);

  // Get paginated stores
  const paginatedStores = useMemo(() => {
    if (!Array.isArray(filteredAndSortedStores)) return [];
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedStores.slice(startIndex, endIndex);
  }, [filteredAndSortedStores, currentPage, pageSize]);

  // Calculate pagination range
  const getPaginationRange = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const handleFilterChange = (field: keyof Filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setCurrentPage(1);
  };

  const handleSort = (field: Filters['sortBy']) => {
    setFilters(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      city: '',
      minNSV: '',
      maxNSV: '',
      minOrders: '',
      maxOrders: '',
      sortBy: 'totalNSV',
      sortOrder: 'desc'
    });
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedStores([]);
    } else {
      setSelectedStores(Array.isArray(paginatedStores) ? paginatedStores.map(store => store._id) : []);
    }
    setSelectAll(!selectAll);
  };

  const handleStoreSelect = (storeId: string) => {
    if (selectedStores.includes(storeId)) {
      setSelectedStores(selectedStores.filter(id => id !== storeId));
    } else {
      setSelectedStores([...selectedStores, storeId]);
    }
  };

  const exportSelectedStores = () => {
    if (selectedStores.length === 0) {
      alert('Please select stores to export');
      return;
    }

    const selectedStoresData = Array.isArray(paginatedStores) ? paginatedStores.filter(store => 
      selectedStores.includes(store._id)
    ) : [];

    const headers = ['Store Name', 'Store ID', 'City', 'Total NSV', 'Total Quantity', 'Total Orders', 'Avg Order Value'];
    const csvContent = [
      headers.join(','),
      ...selectedStoresData.map(store => [
        `"${store.storeName}"`,
        store.storeId,
        `"${store.city}"`,
        store.totalNSV,
        store.totalQuantity,
        store.totalOrders,
        store.avgOrderValue.toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selected-stores-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    const headers = ['Store Name', 'Store ID', 'City', 'Total NSV', 'Total Quantity', 'Total Orders', 'Avg Order Value'];
    const csvContent = [
      headers.join(','),
      ...(Array.isArray(filteredAndSortedStores) ? filteredAndSortedStores.map(store => [
        `"${store.storeName}"`,
        store.storeId,
        `"${store.city}"`,
        store.totalNSV,
        store.totalQuantity,
        store.totalOrders,
        store.avgOrderValue.toFixed(2)
      ].join(',')) : [])
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stores-performance.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <>
        <Seo title="All Stores Performance" />
        <Pageheader
          currentpage="All Stores Performance"
          activepage="Analytics"
          mainpage="Stores Performance"
        />
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            <p className="text-gray-600 animate-pulse">Loading stores data...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Seo title="All Stores Performance" />
        <Pageheader
          currentpage="All Stores Performance"
          activepage="Analytics"
          mainpage="Stores Performance"
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="text-red-500 p-4 bg-red-50 rounded-lg border border-red-200">
              <i className="ri-error-warning-line text-2xl mb-2 block"></i>
              <p className="mb-4">{error}</p>
            </div>
            <button
              onClick={fetchAllStoresPerformance}
              className="ti-btn ti-btn-primary transition-all duration-200 hover:scale-105"
            >
              <i className="ri-refresh-line mr-2"></i>
              Retry
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="All Stores Performance" />
      <Pageheader
        currentpage="All Stores Performance"
        activepage="Analytics"
        mainpage="Stores Performance"
      />

      <div className="grid grid-cols-12 gap-6">
        {/* Summary Cards */}
        {summaryStats && (
          <div className="col-span-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="box bg-primary/10 border-primary/20">
                <div className="box-body text-center">
                  <div className="text-2xl font-bold text-primary">{summaryStats.totalStores}</div>
                  <div className="text-sm text-gray-600">Total Stores</div>
                </div>
              </div>
              <div className="box bg-success/10 border-success/20">
                <div className="box-body text-center">
                  <div className="text-2xl font-bold text-success">{formatCurrency(summaryStats.totalNSV)}</div>
                  <div className="text-sm text-gray-600">Total NSV</div>
                </div>
              </div>
              <div className="box bg-warning/10 border-warning/20">
                <div className="box-body text-center">
                  <div className="text-2xl font-bold text-warning">{formatNumber(summaryStats.totalQuantity)}</div>
                  <div className="text-sm text-gray-600">Total Quantity</div>
                </div>
              </div>
              <div className="box bg-info/10 border-info/20">
                <div className="box-body text-center">
                  <div className="text-2xl font-bold text-info">{formatNumber(summaryStats.totalOrders)}</div>
                  <div className="text-sm text-gray-600">Total Orders</div>
                </div>
              </div>
              <div className="box bg-secondary/10 border-secondary/20">
                <div className="box-body text-center">
                  <div className="text-2xl font-bold text-secondary">{formatCurrency(summaryStats.avgOrderValue)}</div>
                  <div className="text-sm text-gray-600">Avg Order Value</div>
                </div>
              </div>
            </div>
          </div>
        )}

                {/* Top Action Bar */}
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h1 className="box-title text-2xl font-semibold">All Stores Performance</h1>
                <HelpIcon
                  title="All Stores Performance"
                  content={
                    <div>
                      <p className="mb-4">
                        This page provides comprehensive analytics on store-wise performance, showing how individual stores are performing in terms of sales, orders, and revenue.
                      </p>
                      
                      <h4 className="font-semibold mb-2">What you can do:</h4>
                      <ul className="list-disc list-inside mb-4 space-y-1">
                        <li><strong>View Store Performance:</strong> See performance metrics for each store including NSV, orders, and average order value</li>
                        <li><strong>Compare Stores:</strong> Compare performance across different stores and cities</li>
                        <li><strong>Advanced Filtering:</strong> Filter stores by city, NSV range, and order count</li>
                        <li><strong>Sort Data:</strong> Sort by various metrics like store name, total NSV, orders, or average order value</li>
                        <li><strong>Search Stores:</strong> Find specific stores using the search functionality</li>
                        <li><strong>Export Data:</strong> Export all stores data or selected stores to CSV</li>
                        <li><strong>Bulk Selection:</strong> Select multiple stores for bulk operations</li>
                        <li><strong>Pagination:</strong> Navigate through large lists of stores efficiently</li>
                      </ul>

                      <h4 className="font-semibold mb-2">Performance Metrics:</h4>
                      <ul className="list-disc list-inside mb-4 space-y-1">
                        <li><strong>Store Name:</strong> Name of the store</li>
                        <li><strong>Store ID:</strong> Unique identifier for the store</li>
                        <li><strong>City:</strong> City where the store is located</li>
                        <li><strong>Total NSV:</strong> Net Sales Value for the store</li>
                        <li><strong>Total Quantity:</strong> Total quantity of products sold</li>
                        <li><strong>Total Orders:</strong> Number of orders placed</li>
                        <li><strong>Average Order Value:</strong> Average value per order</li>
                      </ul>

                      <h4 className="font-semibold mb-2">Summary Statistics:</h4>
                      <ul className="list-disc list-inside mb-4 space-y-1">
                        <li><strong>Total Stores:</strong> Overall count of stores</li>
                        <li><strong>Total NSV:</strong> Combined NSV across all stores</li>
                        <li><strong>Total Quantity:</strong> Combined quantity across all stores</li>
                        <li><strong>Total Orders:</strong> Combined orders across all stores</li>
                        <li><strong>Average Order Value:</strong> Overall average order value</li>
                      </ul>

                      <h4 className="font-semibold mb-2">Tips:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Use city filters to focus on specific geographic areas</li>
                        <li>Sort by different metrics to identify top and bottom performers</li>
                        <li>Export data for external analysis and reporting</li>
                        <li>Use the search function to quickly find specific stores</li>
                        <li>Compare stores within the same city for fair performance analysis</li>
                      </ul>
                    </div>
                  }
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    showAdvancedFilters 
                      ? 'bg-primary text-white hover:bg-primary-dark' 
                      : 'bg-white text-primary border border-primary hover:bg-primary hover:text-white'
                  }`}
                >
                  <i className="ri-filter-3-line mr-1"></i>
                  {showAdvancedFilters ? 'Hide' : 'Advanced'} Filters
                </button>
                
                <button
                  onClick={exportToCSV}
                  className="px-3 py-2 text-sm font-medium bg-success text-white rounded-md hover:bg-success-dark transition-colors"
                >
                  <i className="ri-download-line mr-1"></i>
                  Export All
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Filters Section */}
        {showAdvancedFilters && (
          <div className="col-span-12">
            <div className="box">
              <div className="box-body">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* NSV Range */}
                  <div className="space-y-2">
                    <label className="form-label text-sm font-medium text-gray-700">
                      <i className="ri-money-dollar-circle-line mr-1 text-success"></i>
                      NSV Range
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <input
                          type="number"
                          className="form-control form-control-sm border-gray-300 focus:border-success focus:ring-success"
                          placeholder="Min NSV"
                          value={filters.minNSV}
                          onChange={(e) => handleFilterChange('minNSV', e.target.value)}
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="number"
                          className="form-control form-control-sm border-gray-300 focus:border-success focus:ring-success"
                          placeholder="Max NSV"
                          value={filters.maxNSV}
                          onChange={(e) => handleFilterChange('maxNSV', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Orders Range */}
                  <div className="space-y-2">
                    <label className="form-label text-sm font-medium text-gray-700">
                      <i className="ri-shopping-cart-line mr-1 text-warning"></i>
                      Orders Range
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <input
                          type="number"
                          className="form-control form-control-sm border-gray-300 focus:border-warning focus:ring-warning"
                          placeholder="Min Orders"
                          value={filters.minOrders}
                          onChange={(e) => handleFilterChange('minOrders', e.target.value)}
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="number"
                          className="form-control form-control-sm border-gray-300 focus:border-warning focus:ring-warning"
                          placeholder="Max Orders"
                          value={filters.maxOrders}
                          onChange={(e) => handleFilterChange('maxOrders', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Clear Filters */}
                  <div className="flex items-end">
                    <button
                      onClick={clearFilters}
                      className="w-full px-4 py-2 text-sm font-medium bg-white text-danger border border-danger rounded-md hover:bg-danger hover:text-white transition-colors"
                    >
                      <i className="ri-refresh-line mr-1"></i>
                      Clear All Filters
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stores Table */}
        <div className="col-span-12">
          <div className="box">
            <div className="box-header">
              <h5 className="box-title">
                All Stores Performance ({totalRecords} stores)
              </h5>
              {selectedStores.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {selectedStores.length} store(s) selected
                  </span>
                  <button
                    onClick={exportSelectedStores}
                    className="px-3 py-1.5 text-sm font-medium bg-warning text-white rounded-md hover:bg-warning-dark transition-colors"
                  >
                    <i className="ri-download-line mr-1"></i>
                    Export Selected
                  </button>
                </div>
              )}
            </div>
            <div className="box-body">
              {/* Table Controls */}
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-4">
                {/* Search and City Filter */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search Bar */}
                  <div className="relative flex-1 min-w-[250px]">
                    <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                      <i className="ri-search-line text-gray-400"></i>
                    </div>
                    <input
                      type="text"
                      className="form-control ps-10 py-2 text-sm border-gray-300 focus:border-primary focus:ring-primary"
                      placeholder="Search stores..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
                    />
                  </div>
                  
                  {/* City Filter */}
                  <div className="relative min-w-[180px]">
                    <select
                      className="form-select py-2 text-sm border-gray-300 focus:border-primary focus:ring-primary appearance-none"
                      value={filters.city}
                      onChange={(e) => handleFilterChange('city', e.target.value)}
                    >
                      <option value="">🌍 All Cities</option>
                      {uniqueCities.map(city => (
                        <option key={city} value={city}>📍 {city}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 end-0 flex items-center pe-3 pointer-events-none">
                      <i className="ri-arrow-down-s-line text-gray-400"></i>
                    </div>
                  </div>
                </div>

                {/* Sort and Page Size Controls */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  {/* Sort Controls */}
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                    <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Sort:</label>
                    <select
                      className="w-24 text-sm bg-transparent border-0 focus:ring-0 focus:outline-none"
                      value={filters.sortBy}
                      onChange={(e) => handleSort(e.target.value as Filters['sortBy'])}
                    >
                      <option value="storeName">Name</option>
                      <option value="totalNSV">NSV</option>
                      <option value="totalOrders">Orders</option>
                      <option value="avgOrderValue">Avg Value</option>
                      <option value="city">City</option>
                    </select>
                    
                    <button
                      onClick={() => {
                        setFilters(prev => ({ 
                          ...prev, 
                          sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' 
                        }));
                        setCurrentPage(1);
                      }}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title={`Sort ${filters.sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                    >
                      <i className={`ri-arrow-${filters.sortOrder === 'asc' ? 'up' : 'down'}-line text-sm`}></i>
                    </button>
                  </div>

                  {/* Page Size */}
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                    <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Show:</label>
                    <select
                      className="w-24 text-sm bg-transparent border-0 focus:ring-0 focus:outline-none cursor-pointer font-medium"
                      value={pageSize}
                      onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span className="text-xs text-gray-500">entries</span>
                  </div>
                </div>
              </div>
              {loading ? (
                <div className="text-center py-8">
                  <i className="ri-loader-4-line animate-spin text-2xl"></i>
                  <p className="mt-2">Loading stores data...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table whitespace-nowrap table-bordered min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th scope="col" className="text-start">
                          <input 
                            type="checkbox" 
                            className="form-check-input" 
                            checked={selectAll}
                            onChange={handleSelectAll}
                          />
                        </th>
                        <th scope="col" className="text-start">Store Name</th>
                        <th scope="col" className="text-start">Store ID</th>
                        <th scope="col" className="text-start">City</th>
                        <th scope="col" className="text-start">Total NSV</th>
                        <th scope="col" className="text-start">Total Quantity</th>
                        <th scope="col" className="text-start">Total Orders</th>
                        <th scope="col" className="text-start">Avg Order Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!paginatedStores || paginatedStores.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-8 text-gray-500">
                            No stores found matching your criteria
                          </td>
                        </tr>
                      ) : (
                        paginatedStores.map((store) => (
                          <tr key={store._id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td>
                              <input 
                                type="checkbox" 
                                className="form-check-input" 
                                checked={selectedStores.includes(store._id)}
                                onChange={() => handleStoreSelect(store._id)}
                              />
                            </td>
                            <td>
                              <div className="flex items-center">
                                <span className="avatar avatar-rounded avatar-sm p-1 bg-light me-2">
                                  <i className="ri-store-line text-xs text-primary"></i>
                                </span>
                                <div className="font-medium">{store.storeName}</div>
                              </div>
                            </td>
                            <td>
                              <span className="badge bg-light text-default">{store.storeId}</span>
                            </td>
                            <td>
                              <div className="flex items-center">
                                <span className="avatar avatar-rounded avatar-sm p-1 bg-light me-2">
                                  <i className="ri-map-pin-line text-xs text-warning"></i>
                                </span>
                                <span>{store.city}</span>
                              </div>
                            </td>
                            <td className="text-right">
                              <span className="text-success font-semibold">
                                {formatCurrency(store.totalNSV)}
                              </span>
                            </td>
                            <td className="text-right">
                              <span className="text-info font-semibold">
                                {formatNumber(store.totalQuantity)}
                              </span>
                            </td>
                            <td className="text-right">
                              <span className="text-warning font-semibold">
                                {formatNumber(store.totalOrders)}
                              </span>
                            </td>
                            <td className="text-right">
                              <span className="text-secondary font-semibold">
                                {formatCurrency(store.avgOrderValue)}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination and Results Info */}
              <div className="flex flex-col lg:flex-row justify-between items-center mt-4">
                {/* Results Info */}
                <div className="text-sm text-gray-500 mb-2 lg:mb-0">
                  {totalRecords > 0 ? (
                    `Showing ${((currentPage - 1) * pageSize) + 1} to ${Math.min(currentPage * pageSize, totalRecords)} of ${totalRecords} entries`
                  ) : (
                    'No entries to show'
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 0 && (
                  <nav aria-label="Page navigation">
                    <ul className="flex flex-wrap items-center">
                      <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button
                          className="page-link py-2 px-3 ml-0 leading-tight text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </button>
                      </li>
                      
                      {getPaginationRange().map((page, index) => (
                        <li key={index} className="page-item">
                          {page === '...' ? (
                            <span className="page-link py-2 px-3 leading-tight border border-gray-300 bg-white text-gray-500">
                              ...
                            </span>
                          ) : (
                            <button
                              className={`page-link py-2 px-3 leading-tight border border-gray-300 ${
                                currentPage === page 
                                ? 'bg-primary text-white hover:bg-primary-dark' 
                                : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                              }`}
                              onClick={() => setCurrentPage(page as number)}
                            >
                              {page}
                            </button>
                          )}
                        </li>
                      ))}
                      
                      <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                        <button
                          className="page-link py-2 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </nav>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AllStoresPerformance; 