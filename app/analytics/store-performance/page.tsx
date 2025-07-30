"use client";

import React, { useState, useEffect } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { ExploreDataTable } from '@/shared/components/analytics/ExploreDataTable';
import { analyticsCompleteService, CompleteStorePerformance } from '@/shared/services/analyticsCompleteService';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function StorePerformancePage() {
  const [data, setData] = useState<CompleteStorePerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortBy] = useState<string>('totalNSV');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateRange, setDateRange] = useState({
    dateFrom: '',
    dateTo: ''
  });
  const [exportLoading, setExportLoading] = useState(false);

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        sortBy: sortBy as 'nsv' | 'quantity' | 'gsv',
        page: currentPage,
        limit: pageSize
      };

      // Only add date parameters if they are provided
      if (dateRange.dateFrom) {
        params.dateFrom = dateRange.dateFrom;
      }
      if (dateRange.dateTo) {
        params.dateTo = dateRange.dateTo;
      }

      const response = await analyticsCompleteService.getCompleteStorePerformance(params);

      setData(response.results || []);
      setTotalResults(response.totalResults || 0);
      setTotalPages(response.totalPages || 0);
    } catch (err) {
      console.error('Error fetching store performance data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setData([]);
      setTotalResults(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount and when filters change
  useEffect(() => {
    fetchData();
  }, [currentPage, pageSize, sortBy, sortOrder, dateRange]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle page size change
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Handle sorting
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // Handle date range change
  const handleDateRangeChange = (field: 'dateFrom' | 'dateTo', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  // Handle export
  const handleExport = async () => {
    try {
      setExportLoading(true);
      
      const params: any = {
        sortBy: sortBy as 'nsv' | 'quantity' | 'gsv',
        limit: 10000 // Large limit to get all data
      };

      // Only add date parameters if they are provided
      if (dateRange.dateFrom) {
        params.dateFrom = dateRange.dateFrom;
      }
      if (dateRange.dateTo) {
        params.dateTo = dateRange.dateTo;
      }
      
      // Fetch all data for export
      const response = await analyticsCompleteService.getCompleteStorePerformance(params);
      
      const allData = response.results || [];
      
      if (allData.length === 0) {
        toast.error('No data to export');
        return;
      }
      
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const filename = `store_performance_export_${dateStr}.csv`;
      
      analyticsCompleteService.downloadCSV(allData, filename);
      toast.success(`Exported ${allData.length} store performance records`);
      
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setExportLoading(false);
    }
  };

  // Table columns configuration
  const columns = [
    {
      key: 'storeName',
      label: 'Store Name',
      sortable: false,
      className: 'w-48 text-left',
      render: (value: string, row: CompleteStorePerformance) => (
        <Link 
          href={`/analytics/store-analysis/${row._id}`}
          className="text-primary hover:text-primary/80 transition-colors duration-200 font-medium"
        >
          {value}
        </Link>
      )
    },
    {
      key: 'storeId',
      label: 'Store ID',
      sortable: false,
      className: 'w-32 text-left'
    },
    {
      key: 'city',
      label: 'City',
      sortable: false,
      className: 'w-32 text-left'
    },
    {
      key: 'state',
      label: 'State',
      sortable: false,
      className: 'w-32 text-left'
    },
    {
      key: 'totalQuantity',
      label: 'Total Quantity',
      sortable: true,
      className: 'w-32 text-right'
    },
    {
      key: 'totalNSV',
      label: 'Total NSV',
      sortable: true,
      className: 'w-32 text-right'
    },
    {
      key: 'totalGSV',
      label: 'Total GSV',
      sortable: true,
      className: 'w-32 text-right'
    },
    {
      key: 'totalDiscount',
      label: 'Total Discount',
      sortable: true,
      className: 'w-32 text-right'
    },
    {
      key: 'totalTax',
      label: 'Total Tax',
      sortable: true,
      className: 'w-32 text-right'
    },
    {
      key: 'recordCount',
      label: 'Records',
      sortable: true,
      className: 'w-24 text-right'
    }
  ];

  return (
    <>
      <Seo title="Store Performance - Complete Data" />
      
      {/* Data Table */}
      <ExploreDataTable
        title="Store Performance - Complete Data"
        data={data}
        loading={loading}
        error={error}
        totalResults={totalResults}
        totalPages={totalPages}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSort={handleSort}
        sortBy={sortBy}
        sortOrder={sortOrder}
        columns={columns}
        onExport={handleExport}
        exportLoading={exportLoading}
        backLink="/analytics"
        backLinkText="Back to Analytics"
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        onRefresh={fetchData}
        helpTitle="Store Performance Analysis"
        helpContent={
          <div>
            <p className="mb-4">
              This page provides comprehensive analysis of store performance across all locations, showing sales metrics and performance indicators for each store.
            </p>
            
            <h4 className="font-semibold mb-2">What you can do:</h4>
            <ul className="list-disc list-inside mb-4 space-y-1">
              <li><strong>View Store Performance:</strong> See performance metrics for each store</li>
              <li><strong>Compare Store Performance:</strong> Compare performance across different stores</li>
              <li><strong>Analyze Geographic Performance:</strong> Understand performance by city and state</li>
              <li><strong>Filter by Date Range:</strong> Analyze store performance for specific time periods</li>
              <li><strong>Sort Data:</strong> Sort by various metrics like NSV, quantity, or discount</li>
              <li><strong>Export Data:</strong> Export store performance data for external analysis</li>
              <li><strong>Navigate to Details:</strong> Click on store names for detailed analysis</li>
              <li><strong>Pagination:</strong> Navigate through large datasets efficiently</li>
            </ul>

            <h4 className="font-semibold mb-2">Key Metrics:</h4>
            <ul className="list-disc list-inside mb-4 space-y-1">
              <li><strong>Store Name:</strong> Name of the store with clickable link to detailed analysis</li>
              <li><strong>Store ID:</strong> Unique identifier for the store</li>
              <li><strong>City:</strong> City where the store is located</li>
              <li><strong>State:</strong> State where the store is located</li>
              <li><strong>Total Quantity:</strong> Total quantity sold by the store</li>
              <li><strong>Total NSV:</strong> Net Sales Value for the store</li>
              <li><strong>Total GSV:</strong> Gross Sales Value for the store</li>
              <li><strong>Total Discount:</strong> Total discount amount given by the store</li>
              <li><strong>Total Tax:</strong> Total tax amount collected by the store</li>
              <li><strong>Records:</strong> Number of sales records for the store</li>
            </ul>

            <h4 className="font-semibold mb-2">Tips:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Use date filters to analyze store performance for specific periods</li>
              <li>Sort by different metrics to identify top and bottom performing stores</li>
              <li>Click on store names to view detailed analysis</li>
              <li>Export data for performance reporting and analysis</li>
              <li>Compare stores within the same city or state for fair comparison</li>
            </ul>
          </div>
        }
      />
    </>
  );
} 