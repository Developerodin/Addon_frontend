"use client";

import React, { useState, useEffect } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { ExploreDataTable } from '@/shared/components/analytics/ExploreDataTable';
import { analyticsCompleteService, CompleteTaxMRPData } from '@/shared/services/analyticsCompleteService';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function TaxAnalyticsPage() {
  const [data, setData] = useState<CompleteTaxMRPData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortBy] = useState<string>('totalTax');
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

      const response = await analyticsCompleteService.getCompleteTaxMRPAnalytics(params);

      setData(response.results || []);
      setTotalResults(response.totalResults || 0);
      setTotalPages(response.totalPages || 0);
    } catch (err) {
      console.error('Error fetching tax analytics data:', err);
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
      const response = await analyticsCompleteService.getCompleteTaxMRPAnalytics(params);
      
      const allData = response.results || [];
      
      if (allData.length === 0) {
        toast.error('No data to export');
        return;
      }
      
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const filename = `tax_analytics_export_${dateStr}.csv`;
      
      analyticsCompleteService.downloadCSV(allData, filename);
      toast.success(`Exported ${allData.length} tax analytics records`);
      
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
      key: 'productName',
      label: 'Product Name',
      sortable: false,
      className: 'w-36 text-left',
      render: (value: string, row: CompleteTaxMRPData) => (
        <Link 
          href={`/analytics/product-analysis/${row._id.productId}`}
          className="text-primary hover:text-primary/80 transition-colors duration-200 font-medium"
        >
          {value}
        </Link>
      )
    },
    {
      key: 'productCode',
      label: 'Product Code',
      sortable: false,
      className: 'w-24 text-left'
    },
    {
      key: 'mrp',
      label: 'MRP',
      sortable: true,
      className: 'w-24 text-right'
    },
    {
      key: 'storeName',
      label: 'Store Name',
      sortable: false,
      className: 'w-36 text-left',
      render: (value: string, row: CompleteTaxMRPData) => (
        <Link 
          href={`/analytics/store-analysis/${row._id.storeId}`}
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
      className: 'w-24 text-left'
    },
    {
      key: 'totalQuantity',
      label: 'Total Quantity',
      sortable: true,
      className: 'w-24 text-right'
    },
    {
      key: 'totalNSV',
      label: 'Total NSV',
      sortable: true,
      className: 'w-24 text-right'
    },
    {
      key: 'totalGSV',
      label: 'Total GSV',
      sortable: true,
      className: 'w-24 text-right'
    },
    {
      key: 'totalTax',
      label: 'Total Tax',
      sortable: true,
      className: 'w-24 text-right'
    },
    {
      key: 'totalMRP',
      label: 'Total MRP',
      sortable: true,
      className: 'w-24 text-right'
    },
    {
      key: 'taxPercentage',
      label: 'Tax %',
      sortable: true,
      className: 'w-20 text-right',
      render: (value: number) => `${Math.round(value)}%`
    },
    {
      key: 'recordCount',
      label: 'Records',
      sortable: true,
      className: 'w-20 text-right'
    }
  ];

  return (
    <>
      <Seo title="Tax Analytics - Complete Data" />
      
      {/* Data Table */}
      <ExploreDataTable
        title="Tax Analytics - Complete Data"
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