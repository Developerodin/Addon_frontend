"use client";

import React from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Pageheader from '@/shared/layout-components/page-header/pageheader';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import Link from 'next/link';

export default function ProductPerformancePage() {
  const { loading, error, data, loadAnalyticsData } = useAnalytics();

  // Format currency with rounding
  const formatCurrency = (value: number) => {
    return `₹${Math.round(value).toLocaleString()}`;
  };

  // Format number with rounding
  const formatNumber = (value: number) => {
    return Math.round(value).toLocaleString();
  };

  // Format percentage
  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return '0%';
    return `${Math.round((value / total) * 100)}%`;
  };

  if (loading) {
    return (
      <>
        <Seo title="Product Performance - Analytics" />
        <Pageheader currentpage="Product Performance" activepage="Analytics" mainpage="Product Performance" />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Seo title="Product Performance - Analytics" />
        <Pageheader currentpage="Product Performance" activepage="Analytics" mainpage="Product Performance" />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md mx-auto">
            <div className="bg-red-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <i className="ri-error-warning-line text-2xl text-red-500"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Data</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button 
              onClick={loadAnalyticsData}
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors duration-200"
            >
              <i className="ri-refresh-line mr-2"></i>
              Try Again
            </button>
          </div>
        </div>
      </>
    );
  }

  const productPerformance = data?.productPerformance || [];
  const totalNSV = productPerformance.reduce((sum, item) => sum + (item.totalNSV || 0), 0);
  const totalQuantity = productPerformance.reduce((sum, item) => sum + (item.totalQuantity || 0), 0);

  return (
    <>
      <Seo title="Product Performance - Analytics" />
      <Pageheader currentpage="Product Performance" activepage="Analytics" mainpage="Product Performance" />
      
      {/* Back to Analytics */}
      <div className="mb-6">
        <Link 
          href="/analytics"
          className="inline-flex items-center text-sm text-primary hover:text-primary/80 transition-colors duration-200"
        >
          <i className="ri-arrow-left-line mr-2"></i>
          Back to Analytics
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-12 gap-6 mb-8">
        <div className="xl:col-span-3 lg:col-span-6 md:col-span-6 col-span-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(productPerformance.length)}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <i className="ri-shopping-bag-line text-xl text-blue-600"></i>
              </div>
            </div>
          </div>
        </div>
        
        <div className="xl:col-span-3 lg:col-span-6 md:col-span-6 col-span-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total NSV</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalNSV)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <i className="ri-money-dollar-circle-line text-xl text-green-600"></i>
              </div>
            </div>
          </div>
        </div>
        
        <div className="xl:col-span-3 lg:col-span-6 md:col-span-6 col-span-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Quantity</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(totalQuantity)}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
                <i className="ri-shopping-cart-line text-xl text-amber-600"></i>
              </div>
            </div>
          </div>
        </div>
        
        <div className="xl:col-span-3 lg:col-span-6 md:col-span-6 col-span-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg NSV per Product</p>
                <p className="text-2xl font-bold text-gray-900">
                  {productPerformance.length > 0 ? formatCurrency(totalNSV / productPerformance.length) : '₹0'}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <i className="ri-calculator-line text-xl text-purple-600"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Product Performance Details</h3>
          <p className="text-sm text-gray-600 mt-1">Detailed breakdown of sales performance by product</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  NSV
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  GSV
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Discount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  NSV %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Records
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {productPerformance.length > 0 ? (
                productPerformance
                  .sort((a, b) => (b.totalNSV || 0) - (a.totalNSV || 0))
                  .map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{index + 1}
                      </td>
                                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <Link 
                        href={`/analytics/product-analysis/${item.productId}`}
                        className="text-primary hover:text-primary/80 transition-colors duration-200"
                      >
                        {item.productName || 'Unknown Product'}
                      </Link>
                    </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.productCode || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.categoryName || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatNumber(item.totalQuantity || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(item.totalNSV || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(item.totalGSV || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(item.totalDiscount || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPercentage(item.totalNSV || 0, totalNSV)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatNumber(item.recordCount || 0)}
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-6 py-4 text-center text-sm text-gray-500">
                    No product performance data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
} 