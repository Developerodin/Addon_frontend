"use client";

import React, { useState, useEffect, Suspense, useRef } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { salesService, SalesRecord, SalesFilters, Plant, MaterialCode, getSaleId } from '@/shared/services/salesService';
import { toast, Toaster } from 'react-hot-toast';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import HelpIcon from '@/shared/components/HelpIcon';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: SalesFilters;
  onApplyFilters: (filters: SalesFilters) => void;
}

const FilterModal: React.FC<FilterModalProps> = ({ isOpen, onClose, filters, onApplyFilters }) => {
  const [localFilters, setLocalFilters] = useState<SalesFilters>(filters);

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleReset = () => {
    setLocalFilters({});
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Advanced Filters</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Date Range */}
          <div>
            <label className="form-label">Date From</label>
            <input
              type="date"
              className="form-control"
              value={localFilters.dateFrom || ''}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
            />
          </div>
          <div>
            <label className="form-label">Date To</label>
            <input
              type="date"
              className="form-control"
              value={localFilters.dateTo || ''}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, dateTo: e.target.value }))}
            />
          </div>

          {/* Plant/Store */}
          <div>
            <label className="form-label">Plant/Store ID</label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter store ID"
              value={localFilters.plant || ''}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, plant: e.target.value }))}
            />
          </div>

          {/* Material Code */}
          <div>
            <label className="form-label">Material/Style Code</label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter style code"
              value={localFilters.materialCode || ''}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, materialCode: e.target.value }))}
            />
          </div>

          {/* Division */}
          <div>
            <label className="form-label">Division</label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter division"
              value={localFilters.division || ''}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, division: e.target.value }))}
            />
          </div>

          {/* Material Group */}
          <div>
            <label className="form-label">Material Group</label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter material group"
              value={localFilters.materialGroup || ''}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, materialGroup: e.target.value }))}
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
              onChange={(e) => setLocalFilters(prev => ({ ...prev, minQuantity: e.target.value ? parseInt(e.target.value) : undefined }))}
            />
          </div>
          <div>
            <label className="form-label">Max Quantity</label>
            <input
              type="number"
              className="form-control"
              placeholder="Max qty"
              value={localFilters.maxQuantity || ''}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, maxQuantity: e.target.value ? parseInt(e.target.value) : undefined }))}
            />
          </div>

          {/* MRP Range */}
          <div>
            <label className="form-label">Min MRP</label>
            <input
              type="number"
              className="form-control"
              placeholder="Min MRP"
              value={localFilters.minMrp || ''}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, minMrp: e.target.value ? parseFloat(e.target.value) : undefined }))}
            />
          </div>
          <div>
            <label className="form-label">Max MRP</label>
            <input
              type="number"
              className="form-control"
              placeholder="Max MRP"
              value={localFilters.maxMrp || ''}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, maxMrp: e.target.value ? parseFloat(e.target.value) : undefined }))}
            />
          </div>

          {/* GSV Range */}
          <div>
            <label className="form-label">Min GSV</label>
            <input
              type="number"
              className="form-control"
              placeholder="Min GSV"
              value={localFilters.minGsv || ''}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, minGsv: e.target.value ? parseFloat(e.target.value) : undefined }))}
            />
          </div>
          <div>
            <label className="form-label">Max GSV</label>
            <input
              type="number"
              className="form-control"
              placeholder="Max GSV"
              value={localFilters.maxGsv || ''}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, maxGsv: e.target.value ? parseFloat(e.target.value) : undefined }))}
            />
          </div>

          {/* NSV Range */}
          <div>
            <label className="form-label">Min NSV</label>
            <input
              type="number"
              className="form-control"
              placeholder="Min NSV"
              value={localFilters.minNsv || ''}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, minNsv: e.target.value ? parseFloat(e.target.value) : undefined }))}
            />
          </div>
          <div>
            <label className="form-label">Max NSV</label>
            <input
              type="number"
              className="form-control"
              placeholder="Max NSV"
              value={localFilters.maxNsv || ''}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, maxNsv: e.target.value ? parseFloat(e.target.value) : undefined }))}
            />
          </div>

          {/* Discount Range */}
          <div>
            <label className="form-label">Min Discount</label>
            <input
              type="number"
              className="form-control"
              placeholder="Min discount"
              value={localFilters.minDiscount || ''}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, minDiscount: e.target.value ? parseFloat(e.target.value) : undefined }))}
            />
          </div>
          <div>
            <label className="form-label">Max Discount</label>
            <input
              type="number"
              className="form-control"
              placeholder="Max discount"
              value={localFilters.maxDiscount || ''}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, maxDiscount: e.target.value ? parseFloat(e.target.value) : undefined }))}
            />
          </div>

          {/* Tax Range */}
          <div>
            <label className="form-label">Min Tax</label>
            <input
              type="number"
              className="form-control"
              placeholder="Min tax"
              value={localFilters.minTax || ''}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, minTax: e.target.value ? parseFloat(e.target.value) : undefined }))}
            />
          </div>
          <div>
            <label className="form-label">Max Tax</label>
            <input
              type="number"
              className="form-control"
              placeholder="Max tax"
              value={localFilters.maxTax || ''}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, maxTax: e.target.value ? parseFloat(e.target.value) : undefined }))}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
          <button onClick={handleReset} className="ti-btn ti-btn-secondary">
            Reset Filters
          </button>
          <button onClick={onClose} className="ti-btn ti-btn-secondary">
            Cancel
          </button>
          <button onClick={handleApply} className="ti-btn ti-btn-primary">
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper function to safely extract material code display value
const getMaterialCodeDisplay = (materialCode: string | MaterialCode | any): string => {
  if (!materialCode) return '-';
  
  // If it's a string, return it
  if (typeof materialCode === 'string') {
    return materialCode;
  }
  
  // If it's a number, convert to string
  if (typeof materialCode === 'number') {
    return String(materialCode);
  }
  
  // If it's an object, try to extract a display value
  if (typeof materialCode === 'object') {
    // Try styleCode (singular) first - handle if it's an object too
    if (materialCode.styleCode) {
      if (typeof materialCode.styleCode === 'string') {
        return materialCode.styleCode;
      }
      if (typeof materialCode.styleCode === 'number') {
        return String(materialCode.styleCode);
      }
      // If styleCode is an object, try to extract from it
      if (typeof materialCode.styleCode === 'object') {
        if (materialCode.styleCode.value && typeof materialCode.styleCode.value === 'string') {
          return materialCode.styleCode.value;
        }
        if (materialCode.styleCode.code && typeof materialCode.styleCode.code === 'string') {
          return materialCode.styleCode.code;
        }
      }
    }
    
    // Try styleCodes (plural) - take first if array
    if (materialCode.styleCodes) {
      if (Array.isArray(materialCode.styleCodes) && materialCode.styleCodes.length > 0) {
        const first = materialCode.styleCodes[0];
        if (typeof first === 'string') return first;
        if (typeof first === 'number') return String(first);
      }
      if (typeof materialCode.styleCodes === 'string') {
        return materialCode.styleCodes;
      }
    }
    
    // Try eanCode (from error message)
    if (materialCode.eanCode && typeof materialCode.eanCode === 'string') {
      return materialCode.eanCode;
    }
    
    // Try other code fields
    if (materialCode.internalCode && typeof materialCode.internalCode === 'string') {
      return materialCode.internalCode;
    }
    if (materialCode.vendorCode && typeof materialCode.vendorCode === 'string') {
      return materialCode.vendorCode;
    }
    if (materialCode.factoryCode && typeof materialCode.factoryCode === 'string') {
      return materialCode.factoryCode;
    }
    if (materialCode.softwareCode && typeof materialCode.softwareCode === 'string') {
      return materialCode.softwareCode;
    }
    
    // Try name as fallback
    if (materialCode.name && typeof materialCode.name === 'string') {
      return materialCode.name;
    }
    
    // Last resort: try to stringify the object (but this shouldn't happen)
    // If we get here, something is wrong with the data structure
    console.warn('Unable to extract display value from materialCode:', materialCode);
  }
  
  return '-';
};

// Helper function to get material code ID for links
const getMaterialCodeId = (materialCode: string | MaterialCode | any): string | null => {
  if (!materialCode || typeof materialCode !== 'object') return null;
  return materialCode.id || materialCode._id || null;
};

// Helper function to safely extract plant display value
const getPlantDisplay = (plant: string | Plant | any): string => {
  if (!plant) return '-';
  
  // If it's a string, return it
  if (typeof plant === 'string') {
    return plant;
  }
  
  // If it's an object, try to extract storeId
  if (typeof plant === 'object') {
    if (plant.storeId && typeof plant.storeId === 'string') {
      return plant.storeId;
    }
    if (plant.storeName && typeof plant.storeName === 'string') {
      return plant.storeName;
    }
  }
  
  return '-';
};

// Helper function to get plant ID for links
const getPlantId = (plant: string | Plant | any): string | null => {
  if (!plant || typeof plant !== 'object') return null;
  return plant.id || plant._id || null;
};

// Helper function to safely extract numeric value (handles objects, strings, numbers)
const getNumericValue = (value: any, defaultValue: number = 0): number => {
  if (value === null || value === undefined) return defaultValue;
  
  // If it's already a number, return it
  if (typeof value === 'number') {
    return isNaN(value) ? defaultValue : value;
  }
  
  // If it's a string, try to parse it
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  
  // If it's an object, try to find a numeric property
  if (typeof value === 'object') {
    // Try common numeric property names (ensure they're actually numbers, not objects)
    if (value.value !== undefined && typeof value.value === 'number' && !isNaN(value.value)) {
      return value.value;
    }
    if (value.amount !== undefined && typeof value.amount === 'number' && !isNaN(value.amount)) {
      return value.amount;
    }
    if (value.price !== undefined && typeof value.price === 'number' && !isNaN(value.price)) {
      return value.price;
    }
    // Check mrp property - but ensure it's a number, not an object
    if (value.mrp !== undefined) {
      if (typeof value.mrp === 'number' && !isNaN(value.mrp)) {
        return value.mrp;
      }
      // If mrp is a string, try to parse it
      if (typeof value.mrp === 'string') {
        const parsed = parseFloat(value.mrp);
        if (!isNaN(parsed)) return parsed;
      }
    }
    
    // Don't try to stringify objects - that's dangerous
    // Just return default if we can't find a numeric value
  }
  
  return defaultValue;
};

// Group sales records by date
const groupSalesByDate = (salesData: SalesRecord[]) => {
  const grouped: { [key: string]: SalesRecord[] } = {};
  
  salesData.forEach(sale => {
    const dateKey = new Date(sale.date).toLocaleDateString();
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(sale);
  });
  
  return grouped;
};

const SalesContent = () => {
  const searchParams = useSearchParams();
  const [selectedSales, setSelectedSales] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [salesData, setSalesData] = useState<SalesRecord[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<SalesFilters>({});
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for dropdown data
  const [cities, setCities] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  // Fetch dropdown data
  const fetchDropdownData = async () => {
    try {
      // Fetch cities and categories from API
      const [citiesResponse, categoriesResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/stores/cities`),
        fetch(`${API_BASE_URL}/catalog/categories`)
      ]);

      if (citiesResponse.ok) {
        const citiesData = await citiesResponse.json();
        setCities(citiesData.map((city: any) => city.name || city));
      }

      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(['All', ...categoriesData.map((cat: any) => cat.name || cat)]);
      }
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
      // Set default values if API fails
      setCities(['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad']);
      setCategories(['All', 'Socks', 'Towel', 'Hanky']);
    }
  };

  // Fetch sales data
  const fetchSales = async (filters: SalesFilters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await salesService.getSales({
        ...filters,
        page: currentPage,
        limit: pageSize,
        sortBy: sortBy,
        sortOrder: sortOrder,
      });
      
      setSalesData(response.results || []);
      setTotalPages(response.totalPages || 0);
      setTotalRecords(response.totalResults || response.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sales');
      setSalesData([]);
      setTotalPages(0);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  // Load sales on component mount and when filters change
  useEffect(() => {
    const filters: SalesFilters = { ...activeFilters };
    if (searchQuery) {
      filters.materialCode = searchQuery;
    }
    if (selectedCity) {
      filters.city = selectedCity;
    }
    if (selectedCategory && selectedCategory !== 'All') {
      filters.category = selectedCategory;
    }
    fetchSales(filters);
  }, [currentPage, pageSize, searchQuery, activeFilters, selectedCity, selectedCategory, sortBy, sortOrder]);

  // Load dropdown data on component mount
  useEffect(() => {
    fetchDropdownData();
  }, []);

  // Check for success message from URL params
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setSuccess('Sale saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    }
  }, [searchParams]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedSales([]);
    } else {
      setSelectedSales(salesData?.filter(sale => getSaleId(sale)).map(sale => getSaleId(sale)) || []);
    }
    setSelectAll(!selectAll);
  };

  const handleSaleSelect = (saleId: string) => {
    if (selectedSales.includes(saleId)) {
      setSelectedSales(selectedSales.filter(id => id !== saleId));
    } else {
      setSelectedSales([...selectedSales, saleId]);
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    if (window.confirm('Are you sure you want to delete this sale?')) {
      try {
        await salesService.deleteSale(saleId);
        fetchSales(activeFilters);
        toast.success('Sale deleted successfully');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete sale');
        toast.error('Failed to delete sale');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSales.length === 0) {
      toast.error('No sales selected for deletion');
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${selectedSales.length} selected sale${selectedSales.length > 1 ? 's' : ''}? This action cannot be undone.`;
    
    if (window.confirm(confirmMessage)) {
      try {
        setLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/sales/bulk-delete`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            salesIds: selectedSales
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete selected sales');
        }

        const result = await response.json();
        
        setSelectedSales([]);
        setSelectAll(false);
        fetchSales(activeFilters);
        toast.success(`Successfully deleted ${selectedSales.length} sale${selectedSales.length > 1 ? 's' : ''}`);
        
      } catch (err) {
        console.error('Bulk delete error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete selected sales';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handleApplyFilters = (filters: SalesFilters) => {
    setActiveFilters(filters);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      
      const filters: SalesFilters = { ...activeFilters };
      if (searchQuery) {
        filters.materialCode = searchQuery;
      }
      if (selectedCity) {
        filters.city = selectedCity;
      }
      if (selectedCategory && selectedCategory !== 'All') {
        filters.category = selectedCategory;
      }
      
      delete filters.page;
      delete filters.limit;
      
      const response = await salesService.getSales(filters);
      const allSalesData = response.results || [];
      
      if (allSalesData.length === 0) {
        toast.error('No data to export');
        return;
      }
      
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const filename = `sales_export_${dateStr}.csv`;
      
      salesService.downloadCSV(allSalesData, filename);
      toast.success(`Exported ${allSalesData.length} sales records`);
      
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export sales data');
    } finally {
      setLoading(false);
    }
  };

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

  const hasActiveFilters = Object.keys(activeFilters).length > 0 || selectedCity || (selectedCategory && selectedCategory !== 'All');
  const groupedSales = groupSalesByDate(salesData);

  return (
    <>
    <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
      <div className="p-[10px]">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
            <h1 className="text-sm font-bold text-gray-800">Sales Records</h1>
            <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
              {totalRecords}
            </span>
            <HelpIcon
                title="Sales Records Management"
                content={
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-lg mb-2">What is this page?</h4>
                      <p className="text-gray-700">
                        This is the Sales Records Management page where you can view, manage, and analyze all your sales transactions, track performance, and export sales data for reporting.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-lg mb-2">What can you do here?</h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        <li><strong>View Sales Records:</strong> Browse all sales transactions with pagination and search functionality</li>
                        <li><strong>Add New Sale:</strong> Click "Add New Sale" to create a new sales record</li>
                        <li><strong>Edit Sales:</strong> Click the edit icon next to any sale to modify its details</li>
                        <li><strong>Delete Sales:</strong> Remove individual sales or bulk delete selected ones</li>
                        <li><strong>Search & Filter:</strong> Use the search bar and advanced filters to find specific sales</li>
                        <li><strong>Export Data:</strong> Export all sales or filtered sales to CSV format</li>
                        <li><strong>Bulk Operations:</strong> Select multiple sales for bulk deletion</li>
                        <li><strong>Date Grouping:</strong> Sales are automatically grouped by date for better organization</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Filter Options:</h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        <li><strong>Date Range:</strong> Filter sales by specific date periods</li>
                        <li><strong>Plant/Store ID:</strong> Filter by specific store or plant</li>
                        <li><strong>Material/Style Code:</strong> Filter by product style code</li>
                        <li><strong>Division:</strong> Filter by business division</li>
                        <li><strong>Material Group:</strong> Filter by product category</li>
                        <li><strong>City:</strong> Filter by store location city</li>
                        <li><strong>Category:</strong> Filter by product category</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Data Organization:</h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        <li><strong>Date Grouping:</strong> Sales are automatically grouped by date for easy viewing</li>
                        <li><strong>Sorting:</strong> Click column headers to sort data</li>
                        <li><strong>Pagination:</strong> Navigate through large datasets efficiently</li>
                        <li><strong>Record Counts:</strong> See how many records are in each date group</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Tips:</h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        <li>Use the search bar to quickly find sales by style code</li>
                        <li>Use advanced filters for complex queries</li>
                        <li>Export data for external analysis and reporting</li>
                        <li>Check the date grouping to understand sales patterns</li>
                      </ul>
                    </div>
                  </div>
                }
              />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedSales.length > 0 && (
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-[11px] font-bold rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                onClick={handleBulkDelete}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></div>
                    Deleting
                  </>
                ) : (
                  <>
                    <i className="ri-delete-bin-line"></i> Delete ({selectedSales.length})
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border transition-colors ${hasActiveFilters ? 'bg-amber-100 text-amber-800 border-amber-200' : 'border-gray-200 hover:bg-gray-50'}`}
              onClick={() => setShowFilters(true)}
            >
              <i className="ri-filter-3-line"></i> Filters {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>}
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
              onClick={handleExport}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></div>
                  Exporting
                </>
              ) : (
                <>
                  <i className="ri-file-excel-2-line"></i> Export
                </>
              )}
            </button>
            <Link href="/sales/add" className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm">
              <i className="ri-add-line"></i> Add
            </Link>
          </div>
        </div>

        {/* Search and Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="text"
                className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-44 min-w-[120px] placeholder:text-gray-400 font-medium"
                placeholder="Style code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            </div>
            <select
              className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 w-28"
              value={selectedCity}
              onChange={(e) => { setSelectedCity(e.target.value); setCurrentPage(1); }}
            >
              <option value="">All Cities</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <select
              className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 w-28"
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </form>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[11px] font-medium text-gray-600">Sort:</label>
            <select
              className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 w-20"
              value={sortBy}
              onChange={(e) => handleSort(e.target.value)}
            >
              <option value="date">Date</option>
              <option value="quantity">Qty</option>
              <option value="mrp">MRP</option>
              <option value="nsv">NSV</option>
            </select>
            <select
              className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 w-16"
              value={sortOrder}
              onChange={(e) => { setSortOrder(e.target.value as 'asc' | 'desc'); setCurrentPage(1); }}
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
            <label className="text-[11px] font-medium text-gray-600">Rows:</label>
            <select
              className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 w-16"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded border border-red-200 bg-red-50 text-red-700 text-[11px] font-medium flex items-center gap-2">
            <i className="ri-error-warning-line text-sm"></i>{error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-2.5 rounded border border-green-200 bg-green-50 text-green-700 text-[11px] font-medium flex items-center gap-2">
            <i className="ri-check-line text-sm"></i>{success}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 min-h-[300px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50"></div>
          </div>
        ) : (
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50/30">
                  <th className="pl-[10px] pr-1 py-3 text-left w-10 border border-gray-200">
                    <input type="checkbox" className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" checked={selectAll} onChange={handleSelectAll} />
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Date</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Plant ID</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Material Code</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Qty</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">MRP</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Discount</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">GSV</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">NSV</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Tax</th>
                  <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Action</th>
                </tr>
              </thead>
              <tbody>
                {!salesData || salesData.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-12 text-[12px] text-gray-500 border border-gray-200">
                      No sales records found
                    </td>
                  </tr>
                ) : (
                  Object.entries(groupedSales).map(([dateKey, salesForDate], groupIndex) => (
                    <React.Fragment key={dateKey}>
                      <tr className="bg-gray-100">
                        <td colSpan={11} className="px-3 py-1.5 text-[11px] font-bold text-gray-700 border border-gray-200">
                          <i className="ri-calendar-line mr-1.5"></i>
                          {dateKey} ({salesForDate.length})
                        </td>
                      </tr>
                      {salesForDate.map((sale, index) => (
                        <tr key={getSaleId(sale) || `sale-${groupIndex}-${index}`} className="hover:bg-gray-50/50 transition-colors">
                          <td className="pl-[10px] pr-1 py-2.5 border border-gray-200">
                            {getSaleId(sale) ? (
                              <input type="checkbox" className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" checked={selectedSales.includes(getSaleId(sale))} onChange={() => handleSaleSelect(getSaleId(sale))} />
                            ) : (
                              <input type="checkbox" className="rounded border-gray-200 opacity-50 h-3.5 w-3.5" disabled title="No ID" />
                            )}
                          </td>
                          <td className="px-1.5 py-2.5 text-[12px] text-gray-800 border border-gray-200">{new Date(sale.date).toLocaleDateString()}</td>
                          <td className="px-1.5 py-2.5 text-[12px] border border-gray-200">
                            {(() => {
                              try {
                                const plantId = getPlantId(sale.plant);
                                let displayValue = getPlantDisplay(sale.plant);
                                if (typeof displayValue !== 'string') displayValue = String(displayValue || '-');
                                if (plantId) return <Link href={`/analytics/store-analysis/${plantId}`} className="text-purple-600 hover:text-purple-800 font-medium">{displayValue}</Link>;
                                return <span>{displayValue}</span>;
                              } catch { return <span>-</span>; }
                            })()}
                          </td>
                          <td className="px-1.5 py-2.5 text-[12px] border border-gray-200">
                            {(() => {
                              try {
                                const materialCodeId = getMaterialCodeId(sale.materialCode);
                                let displayValue = getMaterialCodeDisplay(sale.materialCode);
                                if (typeof displayValue !== 'string') displayValue = String(displayValue || '-');
                                if (materialCodeId) return <Link href={`/analytics/product-analysis/${materialCodeId}`} className="text-purple-600 hover:text-purple-800 font-medium">{displayValue}</Link>;
                                return <span>{displayValue}</span>;
                              } catch { return <span>-</span>; }
                            })()}
                          </td>
                          <td className="px-1.5 py-2.5 text-[12px] text-right border border-gray-200">{getNumericValue(sale.quantity, 0)}</td>
                          <td className="px-1.5 py-2.5 text-[12px] text-right border border-gray-200">{getNumericValue(sale.mrp, 0).toFixed(2)}</td>
                          <td className="px-1.5 py-2.5 text-[12px] text-right border border-gray-200">{getNumericValue(sale.discount, 0).toFixed(2)}</td>
                          <td className="px-1.5 py-2.5 text-[12px] text-right border border-gray-200">{getNumericValue(sale.gsv, 0).toFixed(2)}</td>
                          <td className="px-1.5 py-2.5 text-[12px] text-right border border-gray-200">{getNumericValue(sale.nsv, 0).toFixed(2)}</td>
                          <td className="px-1.5 py-2.5 text-[12px] text-right border border-gray-200">{getNumericValue(sale.totalTax, 0).toFixed(2)}</td>
                          <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                            <div className="flex items-center justify-end gap-1">
                              {getSaleId(sale) ? (
                                <Link href={`/sales/edit/${getSaleId(sale)}`} className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100 rounded hover:bg-blue-100 transition-colors">
                                  <i className="ri-edit-line text-sm"></i>
                                </Link>
                              ) : (
                                <span className="w-7 h-7 flex items-center justify-center bg-gray-100 text-gray-400 rounded cursor-not-allowed" title="No ID"><i className="ri-edit-line text-sm"></i></span>
                              )}
                              {getSaleId(sale) ? (
                                <button type="button" className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-600 border border-red-100 rounded hover:bg-red-100 transition-colors" onClick={() => handleDeleteSale(getSaleId(sale))}>
                                  <i className="ri-delete-bin-line text-sm"></i>
                                </button>
                              ) : (
                                <span className="w-7 h-7 flex items-center justify-center bg-gray-100 text-gray-400 rounded cursor-not-allowed" title="No ID"><i className="ri-delete-bin-line text-sm"></i></span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white">
          <div className="text-[11px] font-medium text-[#495057] tracking-tight">
            {totalRecords > 0 ? `Showing ${((currentPage - 1) * pageSize) + 1} to ${Math.min(currentPage * pageSize, totalRecords)} of ${totalRecords}` : 'No entries'}
          </div>
          {totalPages > 0 && (
            <nav className="flex items-center gap-1">
              <button type="button" className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Previous</button>
              {getPaginationRange().map((page, index) =>
                page === '...' ? (
                  <span key={index} className="px-2 text-[11px] text-gray-400">...</span>
                ) : (
                  <button key={index} type="button" className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded transition-all ${currentPage === page ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`} onClick={() => setCurrentPage(page as number)}>{page}</button>
                )
              )}
              <button type="button" className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Next</button>
            </nav>
          )}
        </div>
      </div>
    </div>

    <FilterModal
      isOpen={showFilters}
      onClose={() => setShowFilters(false)}
      filters={activeFilters}
      onApplyFilters={handleApplyFilters}
    />
    </>
  );
};

// Main component with Suspense boundary
const SalesPage = () => {
  return (
    <div className="main-content !p-[10px]">
      <Seo title="Sales Records"/>
      <Suspense fallback={
        <div className="flex items-center justify-center py-16 min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50"></div>
        </div>
      }>
        <SalesContent />
      </Suspense>
      <Toaster position="top-right" />
    </div>
  );
};

export default SalesPage; 