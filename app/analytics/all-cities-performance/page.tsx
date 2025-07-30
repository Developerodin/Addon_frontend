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

interface CityPerformance {
  _id: string;
  totalNSV: number;
  totalQuantity: number;
  totalOrders: number;
  storeCount: number;
  stores: string[];
  avgOrderValue: number;
}

interface Filters {
  minNSV: string;
  maxNSV: string;
  minOrders: string;
  maxOrders: string;
  minStores: string;
  maxStores: string;
  sortBy: 'totalNSV' | 'totalOrders' | 'avgOrderValue' | 'storeCount' | '_id';
  sortOrder: 'asc' | 'desc';
}

const AllCitiesPerformance = () => {
  const [cities, setCities] = useState<CityPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    minNSV: '',
    maxNSV: '',
    minOrders: '',
    maxOrders: '',
    minStores: '',
    maxStores: '',
    sortBy: 'totalNSV',
    sortOrder: 'desc'
  });

  // Fetch all cities performance data
  const fetchAllCitiesPerformance = async () => {
    try {
      setLoading(true);
      setError(null);

      const citiesData = await dashboardService.getAllCitiesPerformance();
      // Ensure citiesData is an array
      const citiesArray = Array.isArray(citiesData) ? citiesData : [];
      setCities(citiesArray);
      setTotalRecords(citiesArray.length);
      setTotalPages(Math.ceil(citiesArray.length / pageSize));
    } catch (err) {
      console.error('Error fetching cities performance:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch cities data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllCitiesPerformance();
  }, []);

  // Filter and sort cities
  const filteredAndSortedCities = useMemo(() => {
    if (!Array.isArray(cities)) return [];
    let filtered = cities.filter(city => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        city._id.toLowerCase().includes(searchTerm.toLowerCase());

      // NSV range filter
      const matchesNSV = (!filters.minNSV || city.totalNSV >= parseFloat(filters.minNSV)) &&
                        (!filters.maxNSV || city.totalNSV <= parseFloat(filters.maxNSV));

      // Orders range filter
      const matchesOrders = (!filters.minOrders || city.totalOrders >= parseInt(filters.minOrders)) &&
                           (!filters.maxOrders || city.totalOrders <= parseInt(filters.maxOrders));

      // Store count range filter
      const matchesStores = (!filters.minStores || city.storeCount >= parseInt(filters.minStores)) &&
                           (!filters.maxStores || city.storeCount <= parseInt(filters.maxStores));

      return matchesSearch && matchesNSV && matchesOrders && matchesStores;
    });

    // Sort cities
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
  }, [cities, searchTerm, filters, pageSize]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!Array.isArray(filteredAndSortedCities) || filteredAndSortedCities.length === 0) return null;

    const totalNSV = filteredAndSortedCities.reduce((sum, city) => sum + city.totalNSV, 0);
    const totalQuantity = filteredAndSortedCities.reduce((sum, city) => sum + city.totalQuantity, 0);
    const totalOrders = filteredAndSortedCities.reduce((sum, city) => sum + city.totalOrders, 0);
    const totalStores = filteredAndSortedCities.reduce((sum, city) => sum + city.storeCount, 0);
    const avgOrderValue = totalOrders > 0 ? totalNSV / totalOrders : 0;

    return {
      totalCities: filteredAndSortedCities.length,
      totalNSV,
      totalQuantity,
      totalOrders,
      totalStores,
      avgOrderValue
    };
  }, [filteredAndSortedCities]);

  // Get paginated cities
  const paginatedCities = useMemo(() => {
    if (!Array.isArray(filteredAndSortedCities)) return [];
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedCities.slice(startIndex, endIndex);
  }, [filteredAndSortedCities, currentPage, pageSize]);

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
      minNSV: '',
      maxNSV: '',
      minOrders: '',
      maxOrders: '',
      minStores: '',
      maxStores: '',
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
      setSelectedCities([]);
    } else {
      setSelectedCities(Array.isArray(paginatedCities) ? paginatedCities.map(city => city._id) : []);
    }
    setSelectAll(!selectAll);
  };

  const handleCitySelect = (cityId: string) => {
    if (selectedCities.includes(cityId)) {
      setSelectedCities(selectedCities.filter(id => id !== cityId));
    } else {
      setSelectedCities([...selectedCities, cityId]);
    }
  };

  const exportSelectedCities = () => {
    if (selectedCities.length === 0) {
      alert('Please select cities to export');
      return;
    }

    const selectedCitiesData = Array.isArray(paginatedCities) ? paginatedCities.filter(city => 
      selectedCities.includes(city._id)
    ) : [];

    const headers = ['City', 'Total NSV', 'Total Quantity', 'Total Orders', 'Store Count', 'Avg Order Value'];
    const csvContent = [
      headers.join(','),
      ...selectedCitiesData.map(city => [
        `"${city._id}"`,
        city.totalNSV,
        city.totalQuantity,
        city.totalOrders,
        city.storeCount,
        city.avgOrderValue.toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selected-cities-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    const headers = ['City', 'Total NSV', 'Total Quantity', 'Total Orders', 'Store Count', 'Avg Order Value'];
    const csvContent = [
      headers.join(','),
      ...(Array.isArray(filteredAndSortedCities) ? filteredAndSortedCities.map(city => [
        `"${city._id}"`,
        city.totalNSV,
        city.totalQuantity,
        city.totalOrders,
        city.storeCount,
        city.avgOrderValue.toFixed(2)
      ].join(',')) : [])
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cities-performance.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <>
        <Seo title="All Cities Performance" />
        <Pageheader
          currentpage="All Cities Performance"
          activepage="Analytics"
          mainpage="Cities Performance"
        />
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            <p className="text-gray-600 animate-pulse">Loading cities data...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Seo title="All Cities Performance" />
        <Pageheader
          currentpage="All Cities Performance"
          activepage="Analytics"
          mainpage="Cities Performance"
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="text-red-500 p-4 bg-red-50 rounded-lg border border-red-200">
              <i className="ri-error-warning-line text-2xl mb-2 block"></i>
              <p className="mb-4">{error}</p>
            </div>
            <button
              onClick={fetchAllCitiesPerformance}
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
      <Seo title="All Cities Performance" />
      <Pageheader
        currentpage="All Cities Performance"
        activepage="Analytics"
        mainpage="Cities Performance"
      />

      <div className="grid grid-cols-12 gap-6">
        {/* Summary Cards */}
        {summaryStats && (
          <div className="col-span-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="box bg-primary/10 border-primary/20">
                <div className="box-body text-center">
                  <div className="text-2xl font-bold text-primary">{summaryStats.totalCities}</div>
                  <div className="text-sm text-gray-600">Total Cities</div>
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
                  <div className="text-2xl font-bold text-secondary">{formatNumber(summaryStats.totalStores)}</div>
                  <div className="text-sm text-gray-600">Total Stores</div>
                </div>
              </div>
              <div className="box bg-danger/10 border-danger/20">
                <div className="box-body text-center">
                  <div className="text-2xl font-bold text-danger">{formatCurrency(summaryStats.avgOrderValue)}</div>
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
                <h1 className="box-title text-2xl font-semibold">All Cities Performance</h1>
                <HelpIcon
                  title="All Cities Performance"
                  content={
                    <div>
                      <p className="mb-4">
                        This page provides comprehensive analytics on city-wise performance, showing how different cities are performing in terms of sales, orders, and store distribution.
                      </p>
                      
                      <h4 className="font-semibold mb-2">What you can do:</h4>
                      <ul className="list-disc list-inside mb-4 space-y-1">
                        <li><strong>View City Performance:</strong> See performance metrics for each city including NSV, orders, and store count</li>
                        <li><strong>Analyze Trends:</strong> Compare performance across different cities</li>
                        <li><strong>Advanced Filtering:</strong> Filter cities by NSV range, order count, and store count</li>
                        <li><strong>Sort Data:</strong> Sort by various metrics like total NSV, orders, average order value, or store count</li>
                        <li><strong>Search Cities:</strong> Find specific cities using the search functionality</li>
                        <li><strong>Export Data:</strong> Export all cities data or selected cities to CSV</li>
                        <li><strong>Bulk Selection:</strong> Select multiple cities for bulk operations</li>
                        <li><strong>Pagination:</strong> Navigate through large lists of cities efficiently</li>
                      </ul>

                      <h4 className="font-semibold mb-2">Performance Metrics:</h4>
                      <ul className="list-disc list-inside mb-4 space-y-1">
                        <li><strong>Total NSV:</strong> Net Sales Value for each city</li>
                        <li><strong>Total Quantity:</strong> Total quantity of products sold</li>
                        <li><strong>Total Orders:</strong> Number of orders placed</li>
                        <li><strong>Store Count:</strong> Number of stores in each city</li>
                        <li><strong>Average Order Value:</strong> Average value per order</li>
                        <li><strong>Stores List:</strong> List of stores operating in each city</li>
                      </ul>

                      <h4 className="font-semibold mb-2">Summary Statistics:</h4>
                      <ul className="list-disc list-inside mb-4 space-y-1">
                        <li><strong>Total Cities:</strong> Overall count of cities</li>
                        <li><strong>Total NSV:</strong> Combined NSV across all cities</li>
                        <li><strong>Total Quantity:</strong> Combined quantity across all cities</li>
                        <li><strong>Total Orders:</strong> Combined orders across all cities</li>
                        <li><strong>Total Stores:</strong> Combined store count across all cities</li>
                        <li><strong>Average Order Value:</strong> Overall average order value</li>
                      </ul>

                      <h4 className="font-semibold mb-2">Tips:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Use advanced filters to focus on specific performance ranges</li>
                        <li>Sort by different metrics to identify top and bottom performers</li>
                        <li>Export data for external analysis and reporting</li>
                        <li>Use the search function to quickly find specific cities</li>
                        <li>Compare cities with similar store counts for fair performance analysis</li>
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

                  {/* Store Count Range */}
                  <div className="space-y-2">
                    <label className="form-label text-sm font-medium text-gray-700">
                      <i className="ri-store-line mr-1 text-info"></i>
                      Store Count Range
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <input
                          type="number"
                          className="form-control form-control-sm border-gray-300 focus:border-info focus:ring-info"
                          placeholder="Min Stores"
                          value={filters.minStores}
                          onChange={(e) => handleFilterChange('minStores', e.target.value)}
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="number"
                          className="form-control form-control-sm border-gray-300 focus:border-info focus:ring-info"
                          placeholder="Max Stores"
                          value={filters.maxStores}
                          onChange={(e) => handleFilterChange('maxStores', e.target.value)}
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

        {/* Cities Table */}
        <div className="col-span-12">
          <div className="box">
            <div className="box-header">
              <h5 className="box-title">
                All Cities Performance ({totalRecords} cities)
              </h5>
              {selectedCities.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {selectedCities.length} city(ies) selected
                  </span>
                  <button
                    onClick={exportSelectedCities}
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
                {/* Search */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search Bar */}
                  <div className="relative flex-1 min-w-[250px]">
                    <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                      <i className="ri-search-line text-gray-400"></i>
                    </div>
                    <input
                      type="text"
                      className="form-control ps-10 py-2 text-sm border-gray-300 focus:border-primary focus:ring-primary"
                      placeholder="Search cities..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
                    />
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
                      <option value="_id">City</option>
                      <option value="totalNSV">NSV</option>
                      <option value="totalOrders">Orders</option>
                      <option value="avgOrderValue">Avg Value</option>
                      <option value="storeCount">Stores</option>
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
                  <p className="mt-2">Loading cities data...</p>
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
                        <th scope="col" className="text-start">City</th>
                        <th scope="col" className="text-start">Total NSV</th>
                        <th scope="col" className="text-start">Total Quantity</th>
                        <th scope="col" className="text-start">Total Orders</th>
                        <th scope="col" className="text-start">Store Count</th>
                        <th scope="col" className="text-start">Avg Order Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!paginatedCities || paginatedCities.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-gray-500">
                            No cities found matching your criteria
                          </td>
                        </tr>
                      ) : (
                        paginatedCities.map((city) => (
                          <tr key={city._id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td>
                              <input 
                                type="checkbox" 
                                className="form-check-input" 
                                checked={selectedCities.includes(city._id)}
                                onChange={() => handleCitySelect(city._id)}
                              />
                            </td>
                            <td>
                              <div className="flex items-center">
                                <span className="avatar avatar-rounded avatar-sm p-1 bg-light me-2">
                                  <i className="ri-map-pin-line text-xs text-warning"></i>
                                </span>
                                <span className="font-medium">{city._id}</span>
                              </div>
                            </td>
                            <td className="text-right">
                              <span className="text-success font-semibold">
                                {formatCurrency(city.totalNSV)}
                              </span>
                            </td>
                            <td className="text-right">
                              <span className="text-info font-semibold">
                                {formatNumber(city.totalQuantity)}
                              </span>
                            </td>
                            <td className="text-right">
                              <span className="text-warning font-semibold">
                                {formatNumber(city.totalOrders)}
                              </span>
                            </td>
                            <td className="text-right">
                              <span className="text-secondary font-semibold">
                                {formatNumber(city.storeCount)}
                              </span>
                            </td>
                            <td className="text-right">
                              <span className="text-danger font-semibold">
                                {formatCurrency(city.avgOrderValue)}
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

export default AllCitiesPerformance; 