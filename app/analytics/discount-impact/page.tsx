"use client";

import React, { useState, useEffect } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { ExploreDataTable } from '@/shared/components/analytics/ExploreDataTable';
import { analyticsCompleteService, CompleteDiscountImpact } from '@/shared/services/analyticsCompleteService';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function DiscountImpactPage() {
  const [data, setData] = useState<CompleteDiscountImpact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortBy] = useState<string>('totalDiscount');
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

      const response = await analyticsCompleteService.getCompleteDiscountImpact(params);

      setData(response.results || []);
      setTotalResults(response.totalResults || 0);
      setTotalPages(response.totalPages || 0);
    } catch (err) {
      console.error('Error fetching discount impact data:', err);
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
      const response = await analyticsCompleteService.getCompleteDiscountImpact(params);
      
      const allData = response.results || [];
      
      if (allData.length === 0) {
        toast.error('No data to export');
        return;
      }
      
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const filename = `discount_impact_export_${dateStr}.csv`;
      
      analyticsCompleteService.downloadCSV(allData, filename);
      toast.success(`Exported ${allData.length} discount impact records`);
      
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
      className: 'w-40 text-left',
      render: (value: string, row: CompleteDiscountImpact) => (
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
      className: 'w-28 text-left'
    },
    {
      key: 'storeName',
      label: 'Store Name',
      sortable: false,
      className: 'w-40 text-left',
      render: (value: string, row: CompleteDiscountImpact) => (
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
      className: 'w-28 text-left'
    },
    {
      key: 'totalQuantity',
      label: 'Total Quantity',
      sortable: true,
      className: 'w-28 text-right'
    },
    {
      key: 'totalNSV',
      label: 'Total NSV',
      sortable: true,
      className: 'w-28 text-right'
    },
    {
      key: 'totalGSV',
      label: 'Total GSV',
      sortable: true,
      className: 'w-28 text-right'
    },
    {
      key: 'totalDiscount',
      label: 'Total Discount',
      sortable: true,
      className: 'w-28 text-right'
    },
    {
      key: 'discountPercentage',
      label: 'Discount %',
      sortable: true,
      className: 'w-24 text-right',
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
      <Seo title="Discount Impact - Complete Data" />
      
      {/* Data Table */}
      <ExploreDataTable
        title="Discount Impact - Complete Data"
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
        helpTitle="Discount Impact Analysis"
        helpContent={
          <div>
            <p className="mb-4">
              This page provides comprehensive analysis of discount impact across products and stores, showing how discounts affect sales performance and revenue.
            </p>
            
            <h4 className="font-semibold mb-2">What you can do:</h4>
            <ul className="list-disc list-inside mb-4 space-y-1">
              <li><strong>View Discount Impact:</strong> See how discounts affect sales across products and stores</li>
              <li><strong>Analyze Discount Patterns:</strong> Understand discount strategies and their effectiveness</li>
              <li><strong>Compare Performance:</strong> Compare sales performance with and without discounts</li>
              <li><strong>Filter by Date Range:</strong> Analyze discount impact for specific time periods</li>
              <li><strong>Sort Data:</strong> Sort by various metrics like discount amount, percentage, or NSV</li>
              <li><strong>Export Data:</strong> Export discount impact data for external analysis</li>
              <li><strong>Navigate to Details:</strong> Click on product or store names for detailed analysis</li>
              <li><strong>Pagination:</strong> Navigate through large datasets efficiently</li>
            </ul>

            <h4 className="font-semibold mb-2">Key Metrics:</h4>
            <ul className="list-disc list-inside mb-4 space-y-1">
              <li><strong>Product Name:</strong> Name of the product with clickable link to detailed analysis</li>
              <li><strong>Product Code:</strong> Unique identifier for the product</li>
              <li><strong>Store Name:</strong> Name of the store with clickable link to detailed analysis</li>
              <li><strong>Store ID:</strong> Unique identifier for the store</li>
              <li><strong>Total Quantity:</strong> Total quantity sold</li>
              <li><strong>Total NSV:</strong> Net Sales Value</li>
              <li><strong>Total GSV:</strong> Gross Sales Value</li>
              <li><strong>Total Discount:</strong> Total discount amount given</li>
              <li><strong>Discount %:</strong> Discount percentage applied</li>
              <li><strong>Records:</strong> Number of sales records</li>
            </ul>

            <h4 className="font-semibold mb-2">Tips:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Use date filters to analyze discount impact for specific periods</li>
              <li>Sort by discount percentage to identify products with high discount rates</li>
              <li>Click on product or store names to view detailed analysis</li>
              <li>Export data for marketing analysis and strategy planning</li>
              <li>Compare discount percentages across different product categories</li>
            </ul>
          </div>
        }
      />
    </>
  );
} 