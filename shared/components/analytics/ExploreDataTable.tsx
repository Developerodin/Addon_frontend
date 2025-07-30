import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import HelpIcon from '@/shared/components/HelpIcon';

interface ExploreDataTableProps {
  title: string;
  data: any[];
  loading: boolean;
  error: string | null;
  totalResults: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSort: (field: string) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  columns: {
    key: string;
    label: string;
    sortable?: boolean;
    render?: (value: any, row: any) => React.ReactNode;
    className?: string;
  }[];
  onExport?: () => void;
  exportLoading?: boolean;
  backLink?: string;
  backLinkText?: string;
  dateRange?: {
    dateFrom: string;
    dateTo: string;
  };
  onDateRangeChange?: (field: 'dateFrom' | 'dateTo', value: string) => void;
  onRefresh?: () => void;
  helpTitle?: string;
  helpContent?: React.ReactNode;
}

export const ExploreDataTable: React.FC<ExploreDataTableProps> = ({
  title,
  data,
  loading,
  error,
  totalResults,
  totalPages,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onSort,
  sortBy,
  sortOrder,
  columns,
  onExport,
  exportLoading = false,
  backLink,
  backLinkText = 'Back to Analytics',
  dateRange,
  onDateRangeChange,
  onRefresh,
  helpTitle,
  helpContent
}) => {
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

  // Format currency
  const formatCurrency = (value: number) => {
    return `₹${Math.round(value).toLocaleString()}`;
  };

  // Format number
  const formatNumber = (value: number) => {
    return Math.round(value).toLocaleString();
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`;
  };

  // Default render function
  const defaultRender = (value: any, key: string) => {
    if (value === null || value === undefined) return '-';
    
    // Handle different data types
    if (typeof value === 'number') {
      if (key.toLowerCase().includes('nsv') || key.toLowerCase().includes('gsv') || key.toLowerCase().includes('discount') || key.toLowerCase().includes('tax') || key.toLowerCase().includes('mrp')) {
        return formatCurrency(value);
      }
      if (key.toLowerCase().includes('quantity') || key.toLowerCase().includes('count')) {
        return formatNumber(value);
      }
      if (key.toLowerCase().includes('percentage')) {
        return formatPercentage(value);
      }
      return formatNumber(value);
    }
    
    if (typeof value === 'string') {
      // Check if it's a date
      if (key.toLowerCase().includes('date')) {
        return new Date(value).toLocaleDateString();
      }
      return value;
    }
    
    return String(value);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="bg-red-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <i className="ri-error-warning-line text-2xl text-red-500"></i>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Data</h3>
        <p className="text-gray-600 mb-6">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          {backLink && (
            <div className="mb-2">
              <Link 
                href={backLink}
                className="inline-flex items-center text-sm text-primary hover:text-primary/80 transition-colors duration-200"
              >
                <i className="ri-arrow-left-line mr-2"></i>
                {backLinkText}
              </Link>
            </div>
          )}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {helpTitle && helpContent && (
              <HelpIcon
                title={helpTitle}
                content={helpContent}
              />
            )}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          {/* Date Range Filters */}
          {dateRange && onDateRangeChange && (
            <>
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                    value={dateRange.dateFrom}
                    onChange={(e) => onDateRangeChange('dateFrom', e.target.value)}
                    placeholder="From Date"
                  />
                  <i className="ri-calendar-line absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                </div>
              </div>
              <div className="flex items-center justify-center px-2">
                <span className="text-sm font-medium text-gray-600">To</span>
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                    value={dateRange.dateTo}
                    onChange={(e) => onDateRangeChange('dateTo', e.target.value)}
                    placeholder="To Date"
                  />
                  <i className="ri-calendar-line absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                </div>
              </div>
            </>
          )}
          
          {/* Refresh Button */}
          {onRefresh && (
            <button 
              onClick={onRefresh}
              className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 shadow-sm"
            >
              <i className="ri-refresh-line mr-2"></i>
              Refresh
            </button>
          )}
          
          {/* Export Button */}
          {onExport && (
            <button 
              onClick={onExport}
              disabled={exportLoading}
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors duration-200 shadow-sm"
            >
              {exportLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <i className="ri-file-excel-2-line mr-2"></i>
                  Export
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        {/* Page Size Selector */}
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">Show:</label>
          <select
            className="form-select form-select-sm w-20"
            value={pageSize}
            onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-gray-600">entries</span>
        </div>

        {/* Results Info */}
        <div className="text-sm text-gray-500">
          {totalResults > 0 ? (
            `Showing ${((currentPage - 1) * pageSize) + 1} to ${Math.min(currentPage * pageSize, totalResults)} of ${totalResults} entries`
          ) : (
            'No entries to show'
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column, index) => (
                  <th 
                    key={column.key}
                    className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap ${
                      column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                    } ${column.className || 'text-left'}`}
                    onClick={() => column.sortable && onSort(column.key)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{column.label}</span>
                      {column.sortable && (
                        <div className="flex flex-col ml-2 flex-shrink-0">
                          <i className={`ri-arrow-up-s-line text-xs ${
                            sortBy === column.key && sortOrder === 'asc' ? 'text-primary' : 'text-gray-300'
                          }`}></i>
                          <i className={`ri-arrow-down-s-line text-xs ${
                            sortBy === column.key && sortOrder === 'desc' ? 'text-primary' : 'text-gray-300'
                          }`}></i>
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-8 text-gray-500">
                    No data found
                  </td>
                </tr>
              ) : (
                data.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50 transition-colors duration-200">
                    {columns.map((column) => (
                      <td key={column.key} className={`px-6 py-4 text-sm align-middle ${column.className || 'text-left'}`}>
                        <div className="truncate font-mono">
                          {column.render 
                            ? column.render(row[column.key], row)
                            : defaultRender(row[column.key], column.key)
                          }
                        </div>
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 0 && (
        <div className="flex justify-center">
          <nav aria-label="Page navigation">
            <ul className="flex flex-wrap items-center">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button
                  className="page-link py-2 px-3 ml-0 leading-tight text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                  onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
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
                      onClick={() => onPageChange(page as number)}
                    >
                      {page}
                    </button>
                  )}
                </li>
              ))}
              
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button
                  className="page-link py-2 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                  onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}; 