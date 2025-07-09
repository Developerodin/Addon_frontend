"use client";

import React, { useState, useEffect, Suspense, useRef } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { salesService, SalesRecord, SalesFilters, Plant, MaterialCode, getSaleId } from '@/shared/services/salesService';
import { toast, Toaster } from 'react-hot-toast';
import { API_BASE_URL } from '@/shared/data/utilities/api';

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
          <h3 className="text-lg font-semibold">Sales Filters</h3>
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

const SalesContent = () => {
  const searchParams = useSearchParams();
  const [selectedSales, setSelectedSales] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25); // Default to 25 rows
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [salesData, setSalesData] = useState<SalesRecord[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<SalesFilters>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch sales data
  const fetchSales = async (filters: SalesFilters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await salesService.getSales({
        ...filters,
        page: currentPage,
        limit: pageSize,
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
      // Search by material code (style code) or plant (store ID)
      filters.materialCode = searchQuery;
    }
    fetchSales(filters);
  }, [currentPage, pageSize, searchQuery, activeFilters]);

  // Check for success message from URL params
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setSuccess('Sale saved successfully!');
      // Clear success message after 3 seconds
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
        // Refresh the data
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
        
        // Clear selections
        setSelectedSales([]);
        setSelectAll(false);
        
        // Refresh the data
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
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleApplyFilters = (filters: SalesFilters) => {
    setActiveFilters(filters);
    setCurrentPage(1); // Reset to first page when applying filters
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      
      // Get all sales data for export (without pagination)
      const filters: SalesFilters = { ...activeFilters };
      if (searchQuery) {
        filters.materialCode = searchQuery;
      }
      
      // Remove pagination for export
      delete filters.page;
      delete filters.limit;
      
      const response = await salesService.getSales(filters);
      const allSalesData = response.results || [];
      
      if (allSalesData.length === 0) {
        toast.error('No data to export');
        return;
      }
      
      // Generate filename with current date
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const filename = `sales_export_${dateStr}.csv`;
      
      // Download CSV
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
    const delta = 2; // Number of pages to show on each side of current page
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

  // Check if any filters are active
  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12">
        {/* Page Header */}
        <div className="box !bg-transparent border-0 shadow-none">
          <div className="box-header flex justify-between items-center">
            <h1 className="box-title text-2xl font-semibold">Sales Records</h1>
            <div className="box-tools flex items-center space-x-2">
              {selectedSales.length > 0 && (
                <button 
                  type="button" 
                  className="ti-btn ti-btn-danger"
                  onClick={handleBulkDelete}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white me-2"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <i className="ri-delete-bin-line me-2"></i>
                      Delete Selected ({selectedSales.length})
                    </>
                  )}
                </button>
              )}
              
              <button 
                type="button" 
                className={`ti-btn ${hasActiveFilters ? 'ti-btn-warning' : 'ti-btn-secondary'}`}
                onClick={() => setShowFilters(true)}
              >
                <i className="ri-filter-3-line me-2"></i>
                Filters {hasActiveFilters && <span className="bg-white text-warning rounded-full px-2 py-1 text-xs ml-1">●</span>}
              </button>
              
              <button 
                type="button" 
                className="ti-btn ti-btn-primary"
                onClick={handleExport}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white me-2"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <i className="ri-file-excel-2-line me-2"></i> Export
                  </>
                )}
              </button>
              <Link href="/sales/add" className="ti-btn ti-btn-primary">
                <i className="ri-add-line me-2"></i> Add New Sale
              </Link>
            </div>
          </div>
        </div>

        {/* Content Box */}
        <div className="box">
          <div className="box-body">
            {/* Search Bar */}
            <div className="mb-4">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  className="form-control py-3"
                  placeholder="Search by style code or store ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="absolute end-0 top-0 px-4 h-full">
                  <i className="ri-search-line text-lg"></i>
                </button>
              </form>
            </div>

            {error && (
              <div className="alert alert-danger mb-4">
                <i className="ri-error-warning-line me-2"></i>
                {error}
              </div>
            )}

            {success && (
              <div className="alert alert-success mb-4">
                <i className="ri-check-line me-2"></i>
                {success}
              </div>
            )}

            {loading ? (
              <div className="text-center py-8">
                <i className="ri-loader-4-line animate-spin text-2xl"></i>
                <p className="mt-2">Loading sales data...</p>
              </div>
            ) : (

            <div className="overflow-x-auto">
              <table className="table whitespace-nowrap table-bordered min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th scope="col" className="!text-start">
                      <input 
                        type="checkbox" 
                        className="form-check-input" 
                        checked={selectAll}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th scope="col" className="text-start">Date</th>
                    <th scope="col" className="text-start">Plant ID</th>
                    <th scope="col" className="text-start">Material Code</th>
                    <th scope="col" className="text-start">Qty</th>
                    <th scope="col" className="text-start">MRP</th>
                    <th scope="col" className="text-start">Discount</th>
                    <th scope="col" className="text-start">GSV</th>
                    <th scope="col" className="text-start">NSV</th>
                    <th scope="col" className="text-start">Tax</th>
                    <th scope="col" className="text-start">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {!salesData || salesData.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-8 text-gray-500">
                        No sales records found
                      </td>
                    </tr>
                  ) : (
                    salesData.map((sale, index) => (
                      <tr 
                        key={getSaleId(sale) || `sale-${index}`}
                        className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : ''}`}
                      >
                        <td>
                          {getSaleId(sale) ? (
                            <input 
                              type="checkbox" 
                              className="form-check-input" 
                              checked={selectedSales.includes(getSaleId(sale))}
                              onChange={() => handleSaleSelect(getSaleId(sale))}
                            />
                          ) : (
                            <input 
                              type="checkbox" 
                              className="form-check-input opacity-50" 
                              disabled
                              title="No ID available"
                            />
                          )}
                        </td>
                        <td>{new Date(sale.date).toLocaleDateString()}</td>
                        <td>{(sale.plant as Plant)?.storeId || (sale.plant as string) || '-'}</td>
                        <td>{(sale.materialCode as MaterialCode)?.styleCode || (sale.materialCode as string) || '-'}</td>
                        <td className="text-right">{sale.quantity}</td>
                        <td className="text-right">{sale.mrp.toFixed(2)}</td>
                        <td className="text-right">{(sale.discount || 0).toFixed(2)}</td>
                        <td className="text-right">{sale.gsv.toFixed(2)}</td>
                        <td className="text-right">{sale.nsv.toFixed(2)}</td>
                        <td className="text-right">{(sale.totalTax || 0).toFixed(2)}</td>
                        <td>
                          <div className="flex space-x-2">
                            {getSaleId(sale) ? (
                              <Link 
                                href={`/sales/edit/${getSaleId(sale)}`}
                                className="ti-btn ti-btn-primary ti-btn-sm"
                              >
                                <i className="ri-edit-line"></i>
                              </Link>
                            ) : (
                              <span className="ti-btn ti-btn-primary ti-btn-sm opacity-50 cursor-not-allowed" title="No ID available">
                                <i className="ri-edit-line"></i>
                              </span>
                            )}
                            {getSaleId(sale) ? (
                              <button 
                                className="ti-btn ti-btn-danger ti-btn-sm"
                                onClick={() => handleDeleteSale(getSaleId(sale))}
                              >
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            ) : (
                              <span className="ti-btn ti-btn-danger ti-btn-sm opacity-50 cursor-not-allowed" title="No ID available">
                                <i className="ri-delete-bin-line"></i>
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            )}

            {/* Pagination and Page Size */}
            <div className="flex justify-between items-center mt-4">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500">
                  {totalRecords > 0 ? (
                    `Showing ${((currentPage - 1) * pageSize) + 1} to ${Math.min(currentPage * pageSize, totalRecords)} of ${totalRecords} entries`
                  ) : (
                    'No entries to show'
                  )}
                </div>
                
                {/* Page Size Selector */}
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">Show:</label>
                  <select
                    className="form-select form-select-sm w-20"
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-sm text-gray-600">entries</span>
                </div>
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

      {/* Filter Modal */}
      <FilterModal
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={activeFilters}
        onApplyFilters={handleApplyFilters}
      />
    </div>
  );
};

// Main component with Suspense boundary
const SalesPage = () => {
  return (
    <div className="main-content">
      <Seo title="Sales Records"/>
      <Suspense fallback={
        <div className="text-center py-8">
          <i className="ri-loader-4-line animate-spin text-2xl"></i>
          <p className="mt-2">Loading...</p>
        </div>
      }>
        <SalesContent />
      </Suspense>
      <Toaster position="top-right" />
    </div>
  );
};

export default SalesPage; 