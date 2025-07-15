"use client";

import React, { useState, useEffect } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { ExploreDataTable } from '@/shared/components/analytics/ExploreDataTable';
import { analyticsCompleteService, CompleteBrandPerformance } from '@/shared/services/analyticsCompleteService';
import { toast } from 'react-hot-toast';

export default function BrandPerformancePage() {
  const [data, setData] = useState<CompleteBrandPerformance[]>([]);
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

      const response = await analyticsCompleteService.getCompleteBrandPerformance(params);

      setData(response.results || []);
      setTotalResults(response.totalResults || 0);
      setTotalPages(response.totalPages || 0);
    } catch (err) {
      console.error('Error fetching brand performance data:', err);
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
      const response = await analyticsCompleteService.getCompleteBrandPerformance(params);
      
      const allData = response.results || [];
      
      if (allData.length === 0) {
        toast.error('No data to export');
        return;
      }
      
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const filename = `brand_performance_export_${dateStr}.csv`;
      
      analyticsCompleteService.downloadCSV(allData, filename);
      toast.success(`Exported ${allData.length} brand performance records`);
      
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
      key: 'brandName',
      label: 'Brand Name',
      sortable: false,
      className: 'w-48 text-left'
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
      <Seo title="Brand Performance - Complete Data" />
      
      {/* Data Table */}
      <ExploreDataTable
        title="Brand Performance - Complete Data"
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
      />
    </>
  );
} 