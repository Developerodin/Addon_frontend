"use client";

import React from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Pageheader from '@/shared/layout-components/page-header/pageheader';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import Link from 'next/link';

export default function StorePerformancePage() {
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
        <Seo title="Store Performance - Analytics" />
        <Pageheader currentpage="Store Performance" activepage="Analytics" mainpage="Store Performance" />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Seo title="Store Performance - Analytics" />
        <Pageheader currentpage="Store Performance" activepage="Analytics" mainpage="Store Performance" />
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

  const storePerformance = data?.storePerformance || [];
  const totalNSV = storePerformance.reduce((sum, item) => sum + (item.totalNSV || 0), 0);
  const totalQuantity = storePerformance.reduce((sum, item) => sum + (item.totalQuantity || 0), 0);

  return (
    <>
      <Seo title="Store Performance - Analytics" />
      <Pageheader currentpage="Store Performance" activepage="Analytics" mainpage="Store Performance" />
      
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
                <p className="text-sm font-medium text-gray-600">Total Stores</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(storePerformance.length)}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <i className="ri-store-line text-xl text-blue-600"></i>
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
                <i className="ri-shopping-bag-3-line text-xl text-amber-600"></i>
              </div>
            </div>
          </div>
        </div>
        
        <div className="xl:col-span-3 lg:col-span-6 md:col-span-6 col-span-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg NSV per Store</p>
                <p className="text-2xl font-bold text-gray-900">
                  {storePerformance.length > 0 ? formatCurrency(totalNSV / storePerformance.length) : '₹0'}
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
          <h3 className="text-lg font-semibold text-gray-900">Store Performance Details</h3>
          <p className="text-sm text-gray-600 mt-1">Detailed breakdown of sales performance by store</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Store Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Store ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
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
                  Tax
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
              {storePerformance.length > 0 ? (
                storePerformance
                  .sort((a, b) => (b.totalNSV || 0) - (a.totalNSV || 0))
                  .map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{index + 1}
                      </td>
                                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <Link 
                        href={`/analytics/store-analysis/${item.storeId}`}
                        className="text-primary hover:text-primary/80 transition-colors duration-200"
                      >
                        {item.storeName || 'Unknown Store'}
                      </Link>
                    </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.storeId || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.city && item.state ? `${item.city}, ${item.state}` : 'N/A'}
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
                        {formatCurrency(item.totalTax || 0)}
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
                  <td colSpan={11} className="px-6 py-4 text-center text-sm text-gray-500">
                    No store performance data available
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