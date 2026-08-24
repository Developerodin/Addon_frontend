"use client";

import React, { useState, useRef, useEffect } from 'react';
import type { DashboardFilters } from '../types';

interface DashboardHeaderProps {
  filters: DashboardFilters;
  filterCount: number;
  onFilterChange: (filters: Partial<DashboardFilters>) => void;
  onClearFilters: () => void;
  onRefresh: () => void;
  onDateRangeSelect: (range: string) => void;
  isRefreshing?: boolean;
  lastUpdated?: string;
  onExport?: (format: 'xlsx' | 'pdf') => void;
}

const dateRangeOptions = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: 'mtd', label: 'MTD' }
];

/**
 * Dashboard Header with filters, export, and actions
 * Responsive design for mobile/tablet/desktop
 */
const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  filters,
  filterCount,
  onFilterChange,
  onClearFilters,
  onRefresh,
  onDateRangeSelect,
  isRefreshing = false,
  lastUpdated,
  onExport
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [selectedRange, setSelectedRange] = useState('30d');
  const [isExporting, setIsExporting] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const handleRangeClick = (range: string) => {
    setSelectedRange(range);
    onDateRangeSelect(range);
    setShowMobileMenu(false);
  };

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    setIsExporting(true);
    setShowExportMenu(false);
    
    try {
      if (onExport) {
        await onExport(format);
      } else {
        // Default export behavior - download from API
        const params = new URLSearchParams();
        if (filters.from) params.append('from', filters.from);
        if (filters.to) params.append('to', filters.to);
        params.append('format', format);
        
        const response = await fetch(`/api/v1/production/dashboard-v2/export?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
          }
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `production-dashboard-${new Date().toISOString().split('T')[0]}.${format}`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="px-4 md:px-6 py-3 md:py-4">
        {/* Main row */}
        <div className="flex items-center justify-between gap-2 md:gap-4">
          {/* Title */}
          <div className="min-w-0 flex-1">
            <h1 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white truncate">
              Production Command
            </h1>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              <span className="hidden sm:inline">Real-time production monitoring</span>
              <span className="sm:hidden">Live monitoring</span>
              {lastUpdated && (
                <span className="ml-2 text-gray-400 dark:text-gray-500">
                  • {lastUpdated}
                </span>
              )}
            </p>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            {/* Date range quick select */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {dateRangeOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleRangeClick(option.value)}
                  className={`
                    px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                    ${selectedRange === option.value
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Filters button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors
                ${filterCount > 0 
                  ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                }
              `}
            >
              <i className="ri-filter-3-line" />
              Filters
              {filterCount > 0 && (
                <span className="bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {filterCount}
                </span>
              )}
            </button>

            {/* Refresh button */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <i className={`ri-refresh-line ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            {/* Export dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={isExporting}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                <i className={`${isExporting ? 'ri-loader-4-line animate-spin' : 'ri-download-2-line'}`} />
                Export
                <i className="ri-arrow-down-s-line" />
              </button>
              
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  <button
                    onClick={() => handleExport('xlsx')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <i className="ri-file-excel-2-line text-green-600" />
                    Export as Excel
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <i className="ri-file-pdf-2-line text-red-600" />
                    Export as PDF
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-purple-600 text-white"
            >
              <i className={`ri-refresh-line ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              <i className="ri-more-2-fill" />
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {showMobileMenu && (
          <div className="md:hidden mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
            {/* Date range */}
            <div className="flex flex-wrap gap-2">
              {dateRangeOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleRangeClick(option.value)}
                  className={`
                    px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
                    ${selectedRange === option.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
            
            {/* Mobile action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowFilters(!showFilters); setShowMobileMenu(false); }}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium
                  ${filterCount > 0 
                    ? 'bg-purple-50 border-purple-200 text-purple-700'
                    : 'bg-white border-gray-200 text-gray-700'
                  }
                `}
              >
                <i className="ri-filter-3-line" />
                Filters {filterCount > 0 && `(${filterCount})`}
              </button>
              
              <button
                onClick={() => { handleExport('xlsx'); setShowMobileMenu(false); }}
                disabled={isExporting}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium disabled:opacity-50"
              >
                <i className="ri-download-2-line" />
                Export
              </button>
            </div>
          </div>
        )}

        {/* Filters panel - Responsive */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-start lg:items-center gap-3 lg:gap-4">
              {/* Date range picker */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">From:</label>
                <input
                  type="date"
                  value={filters.from || ''}
                  onChange={(e) => onFilterChange({ from: e.target.value })}
                  className="w-full sm:w-auto px-3 py-1.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">To:</label>
                <input
                  type="date"
                  value={filters.to || ''}
                  onChange={(e) => onFilterChange({ to: e.target.value })}
                  className="w-full sm:w-auto px-3 py-1.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Floor filter */}
              <select
                value={filters.floor?.[0] || ''}
                onChange={(e) => onFilterChange({ floor: e.target.value ? [e.target.value] : undefined })}
                className="w-full sm:w-auto px-3 py-1.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Floors</option>
                <option value="Knitting">Knitting</option>
                <option value="Linking">Linking</option>
                <option value="Checking">Checking</option>
                <option value="Washing">Washing</option>
                <option value="Boarding">Boarding</option>
                <option value="Silicon">Silicon</option>
                <option value="Secondary Checking">Secondary Checking</option>
                <option value="Branding">Branding</option>
                <option value="Re-Boarding">Re-Boarding</option>
                <option value="Final Checking">Final Checking</option>
                <option value="Dispatch">Dispatch</option>
                <option value="Warehouse">Warehouse</option>
              </select>

              {/* Priority filter */}
              <select
                value={filters.priority?.[0] || ''}
                onChange={(e) => onFilterChange({ priority: e.target.value ? [e.target.value as any] : undefined })}
                className="w-full sm:w-auto px-3 py-1.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Priorities</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              {/* Clear filters */}
              {filterCount > 0 && (
                <button
                  onClick={onClearFilters}
                  className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default DashboardHeader;
