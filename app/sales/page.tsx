"use client";

import React, { useState, useEffect, Suspense, useRef } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { salesService, SalesRecord, SalesFilters, Plant, MaterialCode, getSaleId } from '@/shared/services/salesService';
import { toast, Toaster } from 'react-hot-toast';

const SalesContent = () => {
  const searchParams = useSearchParams();
  const [selectedSales, setSelectedSales] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [salesData, setSalesData] = useState<SalesRecord[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const itemsPerPage = 10;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch sales data
  const fetchSales = async (filters: SalesFilters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await salesService.getSales({
        ...filters,
        page: currentPage,
        limit: itemsPerPage,
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
    const filters: SalesFilters = {};
    if (searchQuery) {
      // Search by material code (style code) or plant (store ID)
      filters.materialCode = searchQuery;
    }
    fetchSales(filters);
  }, [currentPage, searchQuery]);

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
        fetchSales();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete sale');
      }
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when searching
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12">
        {/* Page Header */}
        <div className="box !bg-transparent border-0 shadow-none">
          <div className="box-header flex justify-between items-center">
            <h1 className="box-title text-2xl font-semibold">Sales Records</h1>
            <div className="box-tools flex items-center space-x-2">
              <button
                type="button"
                // onClick={handleDownloadTemplate}
                className="ti-btn ti-btn-secondary"
                disabled={loading}
              >
                <i className="ri-file-download-line me-2"></i>
                Download Template
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx,.xls"
                // onChange={handleImport}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="ti-btn ti-btn-success"
                disabled={loading}
              >
                <i className="ri-file-excel-2-line me-2"></i>
                Import
              </button>
              {importProgress !== null && (
                <div className="w-40 h-3 bg-gray-200 rounded-full overflow-hidden flex items-center ml-2">
                  <div
                    className="bg-primary h-full transition-all duration-200"
                    style={{ width: `${importProgress}%` }}
                  ></div>
                  <span className="ml-2 text-xs text-gray-700">{importProgress}%</span>
                </div>
              )}
              <button type="button" className="ti-btn ti-btn-primary">
                <i className="ri-file-excel-2-line me-2"></i> Export
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

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-500">
                {totalRecords > 0 ? (
                  `Showing ${((currentPage - 1) * itemsPerPage) + 1} to ${Math.min(currentPage * itemsPerPage, totalRecords)} of ${totalRecords} entries`
                ) : (
                  'No entries to show'
                )}
              </div>
              {totalPages > 0 && (
                <nav aria-label="Page navigation" className="">
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
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <li key={page} className="page-item">
                        <button
                          className={`page-link py-2 px-3 leading-tight border border-gray-300 ${
                            currentPage === page 
                            ? 'bg-primary text-white hover:bg-primary-dark' 
                            : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                          }`}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </button>
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