"use client";
import React, { useState, useEffect } from "react";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import { dashboardService, SalesData, AllSalesDataResponse } from "@/shared/services/dashboardService";
import { formatCurrency, formatNumber } from "@/shared/utils/dashboardUtils";
import HelpIcon from '@/shared/components/HelpIcon';

const AllSalesData = () => {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof SalesData>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [showFilters, setShowFilters] = useState(false);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: { startDate?: string; endDate?: string } = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const data: AllSalesDataResponse = await dashboardService.getAllSalesData(params);
      setSalesData(data.sales);
    } catch (err) {
      console.error("Error fetching sales data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch sales data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, []);

  // Filter and sort data
  const filteredData = salesData
    .filter((sale) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        sale.storeName.toLowerCase().includes(searchLower) ||
        sale.productName.toLowerCase().includes(searchLower) ||
        sale.categoryName.toLowerCase().includes(searchLower) ||
        sale.storeCity.toLowerCase().includes(searchLower) ||
        sale.productCode.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (field: keyof SalesData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleFilter = () => {
    setCurrentPage(1);
    fetchSalesData();
  };

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    setSearchTerm("");
    setCurrentPage(1);
    fetchSalesData();
  };

  const SortIcon = ({ field }: { field: keyof SalesData }) => {
    if (sortField !== field) return <i className="ri-arrow-up-down-line text-gray-400" />;
    return sortDirection === "asc" ? (
      <i className="ri-arrow-up-line text-primary" />
    ) : (
      <i className="ri-arrow-down-line text-primary" />
    );
  };

  if (loading) {
    return (
      <>
        <Seo title="All Sales Data" />
        <Pageheader
          currentpage="All Sales Data"
          activepage="Analytics"
          mainpage="Sales Data"
        />
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            <p className="text-gray-600 animate-pulse">Loading sales data...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Seo title="All Sales Data" />
        <Pageheader
          currentpage="All Sales Data"
          activepage="Analytics"
          mainpage="Sales Data"
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="text-red-500 p-4 bg-red-50 rounded-lg border border-red-200">
              <i className="ri-error-warning-line text-2xl mb-2 block"></i>
              <p className="mb-4">{error}</p>
            </div>
            <button
              onClick={fetchSalesData}
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
      <Seo title="All Sales Data" />
      <Pageheader
        currentpage="All Sales Data"
        activepage="Analytics"
        mainpage="Sales Data"
      />

      <div className="grid grid-cols-12 gap-6 animate-fade-in">
        <div className="xl:col-span-12 col-span-12">
          <div className="box transition-all duration-300 hover:shadow-lg">
            <div className="box-header justify-between">
              <div className="flex items-center space-x-3">
                <div className="box-title">All Sales Data</div>
                <HelpIcon
                  title="All Sales Data Analytics"
                  content={
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-lg mb-2">What is this page?</h4>
                        <p className="text-gray-700">
                          This is the All Sales Data Analytics page that provides comprehensive insights into your sales performance, allowing you to analyze trends, patterns, and key metrics across all your sales transactions.
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-lg mb-2">What can you do here?</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li><strong>View Sales Data:</strong> Browse all sales transactions with detailed information</li>
                          <li><strong>Search & Filter:</strong> Find specific sales by store, product, category, or city</li>
                          <li><strong>Sort Data:</strong> Sort by any column to organize data as needed</li>
                          <li><strong>Date Filtering:</strong> Filter sales by specific date ranges</li>
                          <li><strong>Quick Date Selection:</strong> Use preset date ranges (Today, Yesterday, Last 7 Days, etc.)</li>
                          <li><strong>Pagination:</strong> Navigate through large datasets efficiently</li>
                          <li><strong>Export Data:</strong> Download sales data for external analysis</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-lg mb-2">Data Columns:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li><strong>Date:</strong> Transaction date</li>
                          <li><strong>Store Name:</strong> Name of the selling store</li>
                          <li><strong>Store City:</strong> Location of the store</li>
                          <li><strong>Product Name:</strong> Name of the sold product</li>
                          <li><strong>Product Code:</strong> Unique product identifier</li>
                          <li><strong>Category:</strong> Product category</li>
                          <li><strong>Quantity:</strong> Number of units sold</li>
                          <li><strong>Revenue:</strong> Total revenue from the sale</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-lg mb-2">Analytics Features:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li><strong>Performance Metrics:</strong> Track sales performance over time</li>
                          <li><strong>Store Analysis:</strong> Compare performance across different stores</li>
                          <li><strong>Product Insights:</strong> Identify top-performing products</li>
                          <li><strong>Geographic Analysis:</strong> Analyze sales by location</li>
                          <li><strong>Trend Identification:</strong> Spot sales patterns and trends</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-lg mb-2">Tips:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li>Use the search bar to quickly find specific transactions</li>
                          <li>Click column headers to sort data</li>
                          <li>Use date filters to focus on specific time periods</li>
                          <li>Adjust the number of entries per page for better viewing</li>
                          <li>Export data for detailed analysis in external tools</li>
                        </ul>
                      </div>
                    </div>
                  }
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* Search Bar */}
                <div className="flex items-center">
                  <input
                    type="text"
                    className="ti-form-control form-control-sm !w-64"
                    placeholder="Search stores, products, categories..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                {/* Rows Per Page Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Show:</span>
                  <select
                    className="ti-form-control form-control-sm !w-20"
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-sm text-gray-600">entries</span>
                </div>
                
                {/* Filter Button */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="ti-btn ti-btn-outline-primary ti-btn-wave !font-medium"
                >
                  <i className="ri-filter-3-line me-1 align-middle inline-block"></i>
                  Filters
                </button>
                
                {/* Quick Date Range Dropdown */}
                <div className="hs-dropdown ti-dropdown">
                  <button
                    className="ti-btn ti-btn-outline-secondary ti-btn-wave !font-medium"
                    aria-expanded="false"
                  >
                    <i className="ri-calendar-line me-1 align-middle inline-block"></i>
                    Quick Date
                    <i className="ri-arrow-down-s-line align-middle ms-1 inline-block"></i>
                  </button>
                  <ul className="hs-dropdown-menu ti-dropdown-menu hidden" role="menu">
                    <li>
                      <button
                        className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block w-full text-left"
                        onClick={() => {
                          const today = new Date().toISOString().split('T')[0];
                          setStartDate(today);
                          setEndDate(today);
                          setCurrentPage(1);
                          fetchSalesData();
                        }}
                      >
                        Today
                      </button>
                    </li>
                    <li>
                      <button
                        className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block w-full text-left"
                        onClick={() => {
                          const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                          setStartDate(yesterday);
                          setEndDate(yesterday);
                          setCurrentPage(1);
                          fetchSalesData();
                        }}
                      >
                        Yesterday
                      </button>
                    </li>
                    <li>
                      <button
                        className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block w-full text-left"
                        onClick={() => {
                          const end = new Date().toISOString().split('T')[0];
                          const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                          setStartDate(start);
                          setEndDate(end);
                          setCurrentPage(1);
                          fetchSalesData();
                        }}
                      >
                        Last 7 Days
                      </button>
                    </li>
                    <li>
                      <button
                        className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block w-full text-left"
                        onClick={() => {
                          const end = new Date().toISOString().split('T')[0];
                          const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                          setStartDate(start);
                          setEndDate(end);
                          setCurrentPage(1);
                          fetchSalesData();
                        }}
                      >
                        Last 30 Days
                      </button>
                    </li>
                    <li>
                      <button
                        className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block w-full text-left"
                        onClick={() => {
                          const now = new Date();
                          const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                          const end = new Date().toISOString().split('T')[0];
                          setStartDate(start);
                          setEndDate(end);
                          setCurrentPage(1);
                          fetchSalesData();
                        }}
                      >
                        This Month
                      </button>
                    </li>
                    <li>
                      <button
                        className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block w-full text-left"
                        onClick={() => {
                          const now = new Date();
                          const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
                          const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
                          setStartDate(start);
                          setEndDate(end);
                          setCurrentPage(1);
                          fetchSalesData();
                        }}
                      >
                        Last Month
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Advanced Filters Section - Hidden by default */}
            {showFilters && (
              <div className="box-body border-t border-b bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="form-label text-sm font-medium">Start Date</label>
                    <input
                      type="date"
                      className="ti-form-control"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label text-sm font-medium">End Date</label>
                    <input
                      type="date"
                      className="ti-form-control"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      onClick={handleFilter}
                      className="ti-btn ti-btn-primary ti-btn-wave !font-medium"
                    >
                      <i className="ri-search-line me-1 align-middle inline-block"></i>
                      Apply Filters
                    </button>
                    <button
                      onClick={handleReset}
                      className="ti-btn ti-btn-outline-secondary ti-btn-wave !font-medium"
                    >
                      <i className="ri-refresh-line me-1 align-middle inline-block"></i>
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="box-body">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-600">
                  Showing {filteredData.length} of {salesData.length} sales records
                </div>
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </div>
              </div>
              
              <div className="table-responsive">
                <table className="table table-hover whitespace-nowrap table-bordered min-w-full">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="text-start cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort("date")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Date</span>
                          <SortIcon field="date" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="text-start cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort("storeName")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Store</span>
                          <SortIcon field="storeName" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="text-start cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort("storeCity")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>City</span>
                          <SortIcon field="storeCity" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="text-start cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort("productName")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Product</span>
                          <SortIcon field="productName" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="text-start cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort("categoryName")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Category</span>
                          <SortIcon field="categoryName" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="text-start cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort("quantity")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Quantity</span>
                          <SortIcon field="quantity" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="text-start cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort("nsv")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>NSV</span>
                          <SortIcon field="nsv" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="text-start cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort("gsv")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>GSV</span>
                          <SortIcon field="gsv" />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((sale) => (
                      <tr
                        key={sale._id}
                        className="border-t border-inherit border-solid hover:bg-gray-100 dark:hover:bg-light dark:border-defaultborder/10"
                      >
                        <td>
                          <span className="text-sm">
                            {new Date(sale.date).toLocaleDateString()}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center">
                            <span className="avatar avatar-rounded avatar-sm p-1 bg-light me-2">
                              <i className="ri-store-line text-xs text-primary"></i>
                            </span>
                            <div>
                              <div className="font-medium text-sm">
                                {sale.storeName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {sale.storeId}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="text-sm">{sale.storeCity}</span>
                        </td>
                        <td>
                          <div>
                            <div className="font-medium text-sm">
                              {sale.productName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {sale.productCode}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-primary/10 text-primary text-xs">
                            {sale.categoryName}
                          </span>
                        </td>
                        <td>
                          <span className="text-sm font-medium">
                            {formatNumber(sale.quantity)}
                          </span>
                        </td>
                        <td>
                          <span className="text-success font-medium text-sm">
                            {formatCurrency(sale.nsv)}
                          </span>
                        </td>
                        <td>
                          <span className="text-warning font-medium text-sm">
                            {formatCurrency(sale.gsv)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {paginatedData.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-8">
                          <div className="text-gray-500">
                            <i className="ri-inbox-line text-3xl mb-2 block"></i>
                            <p>No sales data found</p>
                            {searchTerm && (
                              <p className="text-sm mt-1">
                                Try adjusting your search criteria
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="box-footer">
                <div className="sm:flex items-center">
                  <div className="dark:text-defaulttextcolor/70">
                    Showing {startIndex + 1} to{" "}
                    {Math.min(startIndex + itemsPerPage, filteredData.length)} of{" "}
                    {filteredData.length} Entries <i className="bi bi-arrow-right ms-2 font-semibold"></i>
                  </div>
                  <div className="ms-auto">
                    <nav aria-label="Page navigation" className="pagination-style-4">
                      <ul className="ti-pagination mb-0">
                        <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                          <button
                            className="page-link"
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            Prev
                          </button>
                        </li>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(
                            (page) =>
                              page === 1 ||
                              page === totalPages ||
                              (page >= currentPage - 2 && page <= currentPage + 2)
                          )
                          .map((page, index, array) => (
                            <React.Fragment key={page}>
                              {index > 0 && array[index - 1] !== page - 1 && (
                                <li className="page-item disabled">
                                  <span className="page-link">...</span>
                                </li>
                              )}
                              <li
                                className={`page-item ${
                                  page === currentPage ? "active" : ""
                                }`}
                              >
                                <button
                                  className="page-link"
                                  onClick={() => setCurrentPage(page)}
                                >
                                  {page}
                                </button>
                              </li>
                            </React.Fragment>
                          ))}
                        <li
                          className={`page-item ${
                            currentPage === totalPages ? "disabled" : ""
                          }`}
                        >
                          <button
                            className="page-link"
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AllSalesData; 