"use client";

import React, { useState, useEffect } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Pageheader from '@/shared/layout-components/page-header/pageheader';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import { StoreAnalysisCharts } from '@/shared/components/analytics/StoreAnalysisCharts';
import { StoreAnalysisSummary } from '@/shared/components/analytics/StoreAnalysisSummary';

interface StoreInfo {
  storeId: string;
  storeName: string;
  address: string;
  contactPerson: string;
  grossLTV: number;
  currentMonthTrend: number;
  norms: number;
  totalOrders: number;
  totalQuantity: number;
}

interface MonthlySalesAnalysis {
  month: string;
  totalNSV: number;
  totalQuantity: number;
  totalOrders: number;
}

interface ProductSalesAnalysis {
  productId: string;
  productName: string;
  productCode: string;
  totalNSV: number;
  totalQuantity: number;
  totalOrders: number;
}

interface SalesEntry {
  _id: string;
  date: string;
  quantity: number;
  mrp: number;
  discount: number;
  gsv: number;
  nsv: number;
  totalTax: number;
  productName: string;
  productCode: string;
}

interface ForecastData {
  forecastMonth: string;
  productId: string;
  productName: string;
  productCode: string;
  forecastedQuantity: number;
  forecastedNSV: number;
  confidence: number;
}

interface ReplenishmentRecommendation {
  productId: string;
  productName: string;
  productCode: string;
  currentDailySales: number;
  monthlyProjection: number;
  recommendedStock: number;
  reorderPoint: number;
  priority: string;
  recommendation: string;
}

interface StoreAnalysisData {
  storeInfo: StoreInfo;
  monthlySalesAnalysis: MonthlySalesAnalysis[];
  productSalesAnalysis: ProductSalesAnalysis[];
  salesEntries: SalesEntry[];
}

interface ForecastData {
  forecastData: ForecastData[];
  forecastPeriod: number;
  generatedAt: string;
}

interface ReplenishmentData {
  recommendations: ReplenishmentRecommendation[];
  storeNorms: number;
  analysisPeriod: string;
  generatedAt: string;
}

export default function StoreAnalysisPage() {
  const params = useParams();
  const storeId = params.storeId as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storeData, setStoreData] = useState<StoreAnalysisData | null>(null);
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [replenishmentData, setReplenishmentData] = useState<ReplenishmentData | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Format currency using Indian number system (k for thousands, L for lakhs, Cr for crores)
  const formatCurrency = (value: number) => {
    if (value === 0) return '₹0';
    
    const absValue = Math.abs(value);
    
    if (absValue >= 10000000) { // 1 Crore = 10,000,000
      const crores = absValue / 10000000;
      const formatted = crores >= 10 ? Math.round(crores) : Math.round(crores * 10) / 10;
      return `₹${formatted}Cr`;
    } else if (absValue >= 100000) { // 1 Lakh = 100,000
      const lakhs = absValue / 100000;
      const formatted = lakhs >= 10 ? Math.round(lakhs) : Math.round(lakhs * 10) / 10;
      return `₹${formatted}L`;
    } else if (absValue >= 1000) { // 1 Thousand = 1,000
      const thousands = absValue / 1000;
      const formatted = thousands >= 10 ? Math.round(thousands) : Math.round(thousands * 10) / 10;
      return `₹${formatted}k`;
    } else {
      return `₹${Math.round(value).toLocaleString()}`;
    }
  };

  // Format number using Indian number system (k for thousands, L for lakhs, Cr for crores)
  const formatNumber = (value: number) => {
    if (value === 0) return '0';
    
    const absValue = Math.abs(value);
    
    if (absValue >= 10000000) { // 1 Crore = 10,000,000
      const crores = absValue / 10000000;
      const formatted = crores >= 10 ? Math.round(crores) : Math.round(crores * 10) / 10;
      return `${value < 0 ? '-' : ''}${formatted}Cr`;
    } else if (absValue >= 100000) { // 1 Lakh = 100,000
      const lakhs = absValue / 100000;
      const formatted = lakhs >= 10 ? Math.round(lakhs) : Math.round(lakhs * 10) / 10;
      return `${value < 0 ? '-' : ''}${formatted}L`;
    } else if (absValue >= 1000) { // 1 Thousand = 1,000
      const thousands = absValue / 1000;
      const formatted = thousands >= 10 ? Math.round(thousands) : Math.round(thousands * 10) / 10;
      return `${value < 0 ? '-' : ''}${formatted}k`;
    } else {
      return Math.round(value).toLocaleString();
    }
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Format month
  const formatMonth = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short'
      });
    } catch {
      return dateString;
    }
  };

  // Fetch store analysis data
  const fetchStoreData = async () => {
    try {
      setLoading(true);
      console.log('Fetching store data for storeId:', storeId);
      const response = await fetch(`${API_BASE_URL}/analytics/store-analysis?storeId=${storeId}`);
      if (!response.ok) throw new Error('Failed to fetch store data');
      const data = await response.json();
      setStoreData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch store data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch forecast data
  const fetchForecastData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/store-forecasting?storeId=${storeId}&months=6`);
      if (!response.ok) throw new Error('Failed to fetch forecast data');
      const data = await response.json();
      setForecastData(data);
    } catch (err) {
      console.error('Failed to fetch forecast data:', err);
    }
  };

  // Fetch replenishment data
  const fetchReplenishmentData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/store-replenishment?storeId=${storeId}`);
      if (!response.ok) throw new Error('Failed to fetch replenishment data');
      const data = await response.json();
      setReplenishmentData(data);
    } catch (err) {
      console.error('Failed to fetch replenishment data:', err);
    }
  };

  useEffect(() => {
    if (storeId) {
      fetchStoreData();
      fetchForecastData();
      fetchReplenishmentData();
    }
  }, [storeId]);

  if (loading) {
    return (
      <>
        <Seo title="Store Analysis - Analytics" />
        <Pageheader currentpage="Store Analysis" activepage="Analytics" mainpage="Store Analysis" />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </>
    );
  }

  if (error || !storeData) {
    return (
      <>
        <Seo title="Store Analysis - Analytics" />
        <Pageheader currentpage="Store Analysis" activepage="Analytics" mainpage="Store Analysis" />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md mx-auto">
            <div className="bg-red-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <i className="ri-error-warning-line text-2xl text-red-500"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Data</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button 
              onClick={fetchStoreData}
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

  const { storeInfo, monthlySalesAnalysis, productSalesAnalysis, salesEntries } = storeData;

  return (
    <>
      <Seo title={`${storeInfo.storeName} - Store Analysis`} />
      <Pageheader currentpage={storeInfo.storeName} activepage="Analytics" mainpage="Store Analysis" />
      
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

      {/* Store Info Cards */}
      <div className="grid grid-cols-12 gap-4 mb-8">
        {/* Address Card - Takes 2 rows height */}
        <div className="xl:col-span-4 lg:col-span-6 md:col-span-6 col-span-12 row-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-full">
            <div className="flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-600 mb-1">Store Name</p>
                  <p className="text-sm font-semibold text-gray-900 leading-tight break-words">{storeInfo.storeName}</p>
                </div>
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 ml-3">
                  <i className="ri-store-line text-lg text-blue-600"></i>
                </div>
              </div>
              <div className="flex-1 flex items-start justify-between py-8">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-600 mb-1">Store Address</p>
                  <p className="text-sm font-semibold text-gray-900 leading-tight break-words">{storeInfo.address}</p>
                </div>
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0 ml-3">
                  <i className="ri-map-pin-line text-lg text-green-600"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Contact Person Card - Top right */}
        <div className="xl:col-span-3 lg:col-span-6 md:col-span-6 col-span-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-full">
            <div className="flex items-start justify-between h-full">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-600 mb-1">Contact Person</p>
                <p className="text-sm font-semibold text-gray-900 leading-tight break-words">{storeInfo.contactPerson}</p>
              </div>
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0 ml-3">
                <i className="ri-user-line text-lg text-green-600"></i>
              </div>
            </div>
          </div>
        </div>
        
        {/* Gross LTV Card */}
        <div className="xl:col-span-3 lg:col-span-6 md:col-span-6 col-span-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-full">
            <div className="flex items-start justify-between h-full">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-600 mb-1">Gross LTV</p>
                <p className="text-lg font-bold text-gray-900 leading-tight">{formatCurrency(storeInfo.grossLTV)}</p>
              </div>
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0 ml-3">
                <i className="ri-money-dollar-circle-line text-lg text-purple-600"></i>
              </div>
            </div>
          </div>
        </div>
        
        {/* Current Month Trend Card */}
        <div className="xl:col-span-2 lg:col-span-6 md:col-span-6 col-span-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-full">
            <div className="flex items-start justify-between h-full">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-600 mb-1">Current Month Trend</p>
                <p className={`text-lg font-bold leading-tight ${storeInfo.currentMonthTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPercentage(storeInfo.currentMonthTrend)}</p>
              </div>
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0 ml-3">
                <i className={`text-lg ${storeInfo.currentMonthTrend >= 0 ? 'ri-arrow-up-s-line text-green-600' : 'ri-arrow-down-s-line text-red-600'}`}></i>
              </div>
            </div>
          </div>
        </div>
        
        {/* Total Orders Card - Bottom right */}
        <div className="xl:col-span-3 lg:col-span-6 md:col-span-6 col-span-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-full">
            <div className="flex items-start justify-between h-full">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-600 mb-1">Total Orders</p>
                <p className="text-lg font-bold text-gray-900 leading-tight">{formatNumber(storeInfo.totalOrders)}</p>
              </div>
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0 ml-3">
                <i className="ri-shopping-cart-line text-lg text-red-600"></i>
              </div>
            </div>
          </div>
        </div>
        
        {/* Total Quantity Card */}
        <div className="xl:col-span-3 lg:col-span-6 md:col-span-6 col-span-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-full">
            <div className="flex items-start justify-between h-full">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-600 mb-1">Total Quantity</p>
                <p className="text-lg font-bold text-gray-900 leading-tight">{formatNumber(storeInfo.totalQuantity)}</p>
              </div>
              <div className="w-10 h-10 bg-cyan-50 rounded-lg flex items-center justify-center flex-shrink-0 ml-3">
                <i className="ri-shopping-bag-3-line text-lg text-cyan-600"></i>
              </div>
            </div>
          </div>
        </div>
        
        {/* Norms Card */}
        <div className="xl:col-span-2 lg:col-span-6 md:col-span-6 col-span-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-full">
            <div className="flex items-start justify-between h-full">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-600 mb-1">Norms</p>
                <p className="text-lg font-bold text-gray-900 leading-tight">{formatCurrency(storeInfo.norms)}</p>
              </div>
              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0 ml-3">
                <i className="ri-flag-2-line text-lg text-indigo-600"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: 'ri-dashboard-line' },
              { id: 'monthly', label: 'Monthly Analysis', icon: 'ri-calendar-line' },
              { id: 'products', label: 'Product Analysis', icon: 'ri-shopping-bag-line' },
              { id: 'sales', label: 'Sales Entries', icon: 'ri-file-list-3-line' },
              { id: 'forecast', label: 'Demand Forecast', icon: 'ri-line-chart-line' },
              { id: 'replenishment', label: 'Replenishment', icon: 'ri-refresh-line' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className={tab.icon}></i>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          <StoreAnalysisSummary
            storeInfo={storeInfo}
            monthlySalesAnalysis={monthlySalesAnalysis}
            forecastData={forecastData}
            replenishmentData={replenishmentData}
          />
          <StoreAnalysisCharts
            monthlySalesAnalysis={monthlySalesAnalysis}
            productSalesAnalysis={productSalesAnalysis}
            forecastData={forecastData}
            replenishmentData={replenishmentData}
            salesEntries={salesEntries}
          />
        </>
      )}

      {activeTab === 'monthly' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Sales Analysis</h3>
            <p className="text-sm text-gray-600 mt-1">Month-wise sales performance breakdown</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NSV</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {monthlySalesAnalysis.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatMonth(item.month)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.totalNSV)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(item.totalQuantity)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(item.totalOrders)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Product Sales Analysis</h3>
            <p className="text-sm text-gray-600 mt-1">Product-wise sales performance breakdown</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NSV</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productSalesAnalysis.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.productName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.productCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.totalNSV)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(item.totalQuantity)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(item.totalOrders)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'sales' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Sales Entries</h3>
            <p className="text-sm text-gray-600 mt-1">Detailed list of all sales transactions</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MRP</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GSV</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NSV</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {salesEntries.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(item.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.productName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.productCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(item.quantity)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.mrp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.discount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.gsv)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.nsv)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.totalTax)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'forecast' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Demand Forecasting</h3>
            <p className="text-sm text-gray-600 mt-1">Future demand predictions for the next 6 months</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Forecasted Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Forecasted NSV</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {forecastData?.forecastData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatMonth(item.forecastMonth)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.productName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.productCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(item.forecastedQuantity)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.forecastedNSV)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPercentage(item.confidence * 100)}
                    </td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      No forecast data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'replenishment' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Replenishment Recommendations</h3>
            <p className="text-sm text-gray-600 mt-1">Stock management recommendations based on sales analysis</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Daily Sales</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Projection</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recommended Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reorder Point</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recommendation</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {replenishmentData?.recommendations.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.productName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.productCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(item.currentDailySales)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(item.monthlyProjection)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(item.recommendedStock)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(item.reorderPoint)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.priority === 'High' ? 'bg-red-100 text-red-800' :
                        item.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.recommendation}
                    </td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                      No replenishment recommendations available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
} 