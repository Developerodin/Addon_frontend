"use client";

import React, { useState, useEffect } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Pageheader from '@/shared/layout-components/page-header/pageheader';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import { ProductAnalysisCharts } from '@/shared/components/analytics/ProductAnalysisCharts';
import { ProductAnalysisSummary } from '@/shared/components/analytics/ProductAnalysisSummary';
import HelpIcon from '@/shared/components/HelpIcon';

interface ProductInfo {
  productId: string;
  productName: string;
  productCode: string;
  description: string;
  totalQuantity: number;
  totalUnits: number;
  currentTrend: number;
}

interface MonthlySalesAnalysis {
  month: string;
  totalNSV: number;
  totalQuantity: number;
}

interface StoreWiseSalesAnalysis {
  storeId: string;
  storeName: string;
  storeCode: string;
  totalNSV: number;
  totalQuantity: number;
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
  storeName: string;
  storeId: string;
}

interface ForecastData {
  forecastMonth: string;
  storeId: string;
  storeName: string;
  storeCode: string;
  forecastedQuantity: number;
  forecastedNSV: number;
  confidence: number;
}

interface ReplenishmentRecommendation {
  storeId: string;
  storeName: string;
  storeCode: string;
  currentDailySales: number;
  monthlyProjection: number;
  recommendedStock: number;
  reorderPoint: number;
  storeNorms: number;
  priority: string;
  recommendation: string;
}

interface ProductAnalysisData {
  productInfo: ProductInfo;
  monthlySalesAnalysis: MonthlySalesAnalysis[];
  storeWiseSalesAnalysis: StoreWiseSalesAnalysis[];
  salesEntries: SalesEntry[];
}

interface ForecastResponse {
  forecastData: ForecastData[];
  forecastPeriod: number;
  generatedAt: string;
}

interface ReplenishmentResponse {
  recommendations: ReplenishmentRecommendation[];
  analysisPeriod: string;
  generatedAt: string;
}

export default function ProductAnalysisPage() {
  const params = useParams();
  const productId = params.productId as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productData, setProductData] = useState<ProductAnalysisData | null>(null);
  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
  const [replenishmentData, setReplenishmentData] = useState<ReplenishmentResponse | null>(null);
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

  // Fetch product analysis data
  const fetchProductData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/analytics/product-analysis?productId=${productId}`);
      if (!response.ok) throw new Error('Failed to fetch product data');
      const data = await response.json();
      setProductData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch product data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch forecast data
  const fetchForecastData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/product-forecasting?productId=${productId}&months=6`);
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
      const response = await fetch(`${API_BASE_URL}/analytics/product-replenishment?productId=${productId}`);
      if (!response.ok) throw new Error('Failed to fetch replenishment data');
      const data = await response.json();
      setReplenishmentData(data);
    } catch (err) {
      console.error('Failed to fetch replenishment data:', err);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchProductData();
      fetchForecastData();
      fetchReplenishmentData();
    }
  }, [productId]);

  if (loading) {
    return (
      <>
        <Seo title="Product Analysis - Analytics" />
        <Pageheader currentpage="Product Analysis" activepage="Analytics" mainpage="Product Analysis" />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </>
    );
  }

  if (error || !productData) {
    return (
      <>
        <Seo title="Product Analysis - Analytics" />
        <Pageheader currentpage="Product Analysis" activepage="Analytics" mainpage="Product Analysis" />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md mx-auto">
            <div className="bg-red-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <i className="ri-error-warning-line text-2xl text-red-500"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Data</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button 
              onClick={fetchProductData}
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

  const { productInfo, monthlySalesAnalysis, storeWiseSalesAnalysis, salesEntries } = productData;

  return (
    <>
      <Seo title={`${productInfo.productName} - Product Analysis`} />
      <Pageheader currentpage={productInfo.productName} activepage="Analytics" mainpage="Product Analysis" />
      
      {/* Back to Analytics */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <Link 
            href="/analytics"
            className="inline-flex items-center text-sm text-primary hover:text-primary/80 transition-colors duration-200"
          >
            <i className="ri-arrow-left-line mr-2"></i>
            Back to Analytics
          </Link>
          <HelpIcon
            title="Product Analysis"
            content={
              <div>
                <p className="mb-4">
                  This page provides detailed analysis for a specific product, including sales performance, trends, forecasts, and replenishment recommendations.
                </p>
                
                <h4 className="font-semibold mb-2">What you can do:</h4>
                <ul className="list-disc list-inside mb-4 space-y-1">
                  <li><strong>View Product Overview:</strong> See key metrics like total quantity, units, and current trend</li>
                  <li><strong>Monthly Analysis:</strong> View month-wise sales performance and trends</li>
                  <li><strong>Store Analysis:</strong> See how the product performs across different stores</li>
                  <li><strong>Sales Entries:</strong> View detailed sales records for the product</li>
                  <li><strong>Demand Forecast:</strong> See predicted demand for the product</li>
                  <li><strong>Replenishment:</strong> Get stock recommendations for different stores</li>
                  <li><strong>Interactive Charts:</strong> Visualize data through various chart types</li>
                  <li><strong>Export Data:</strong> Export analysis data for external use</li>
                </ul>

                <h4 className="font-semibold mb-2">Product Information:</h4>
                <ul className="list-disc list-inside mb-4 space-y-1">
                  <li><strong>Product Name:</strong> Name of the product being analyzed</li>
                  <li><strong>Product Code:</strong> Unique identifier for the product</li>
                  <li><strong>Description:</strong> Product description and details</li>
                  <li><strong>Total Quantity:</strong> Total quantity sold</li>
                  <li><strong>Total Units:</strong> Total units sold</li>
                  <li><strong>Current Trend:</strong> Current performance trend (positive/negative)</li>
                </ul>

                <h4 className="font-semibold mb-2">Analysis Tabs:</h4>
                <ul className="list-disc list-inside mb-4 space-y-1">
                  <li><strong>Overview:</strong> Summary charts and key metrics</li>
                  <li><strong>Monthly Analysis:</strong> Month-wise sales breakdown</li>
                  <li><strong>Store Analysis:</strong> Store-wise performance comparison</li>
                  <li><strong>Sales Entries:</strong> Detailed sales records</li>
                  <li><strong>Demand Forecast:</strong> Future demand predictions</li>
                  <li><strong>Replenishment:</strong> Stock recommendations</li>
                </ul>

                <h4 className="font-semibold mb-2">Tips:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Use different tabs to explore various aspects of product performance</li>
                  <li>Check the forecast tab for future planning</li>
                  <li>Review replenishment recommendations for inventory management</li>
                  <li>Compare store performance to identify best and worst performing locations</li>
                  <li>Use the monthly analysis to identify seasonal trends</li>
                </ul>
              </div>
            }
          />
        </div>
      </div>

      {/* Product Info Cards */}
      <div className="grid grid-cols-12 gap-4 mb-8">
        <div className="xl:col-span-4 lg:col-span-6 md:col-span-6 col-span-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-full">
            <div className="flex items-start justify-between h-full">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-600 mb-1">Product Name</p>
                <p className="text-sm font-semibold text-gray-900 leading-tight break-words">{productInfo.productName}</p>
                <p className="text-xs text-gray-500 mt-1 break-words">{productInfo.productCode}</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 ml-3">
                <i className="ri-shopping-bag-line text-lg text-blue-600"></i>
              </div>
            </div>
          </div>
        </div>
        
        <div className="xl:col-span-2 lg:col-span-6 md:col-span-6 col-span-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-full">
            <div className="flex items-start justify-between h-full">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-600 mb-1">Total Quantity</p>
                <p className="text-lg font-bold text-gray-900 leading-tight">{formatNumber(productInfo.totalQuantity)}</p>
              </div>
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0 ml-3">
                <i className="ri-shopping-cart-line text-lg text-green-600"></i>
              </div>
            </div>
          </div>
        </div>
        
        <div className="xl:col-span-2 lg:col-span-6 md:col-span-6 col-span-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-full">
            <div className="flex items-start justify-between h-full">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-600 mb-1">Total Units</p>
                <p className="text-lg font-bold text-gray-900 leading-tight">{formatNumber(productInfo.totalUnits)}</p>
              </div>
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0 ml-3">
                <i className="ri-box-line text-lg text-purple-600"></i>
              </div>
            </div>
          </div>
        </div>
        
        <div className="xl:col-span-2 lg:col-span-6 md:col-span-6 col-span-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-full">
            <div className="flex items-start justify-between h-full">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-600 mb-1">Current Trend</p>
                <p className={`text-lg font-bold leading-tight ${productInfo.currentTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(productInfo.currentTrend)}
                </p>
              </div>
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0 ml-3">
                <i className="ri-trending-up-line text-lg text-amber-600"></i>
              </div>
            </div>
          </div>
        </div>
        
        <div className="xl:col-span-2 lg:col-span-6 md:col-span-6 col-span-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-full">
            <div className="flex items-start justify-between h-full">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-600 mb-1">Description</p>
                <p className="text-sm font-semibold text-gray-900 leading-tight break-words line-clamp-2">{productInfo.description}</p>
              </div>
              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0 ml-3">
                <i className="ri-file-text-line text-lg text-indigo-600"></i>
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
              { id: 'stores', label: 'Store Analysis', icon: 'ri-store-line' },
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
          <ProductAnalysisSummary
            productInfo={productInfo}
            monthlySalesAnalysis={monthlySalesAnalysis}
            forecastData={forecastData}
            replenishmentData={replenishmentData}
          />
          <ProductAnalysisCharts
            monthlySalesAnalysis={monthlySalesAnalysis}
            storeWiseSalesAnalysis={storeWiseSalesAnalysis}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'stores' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Store-wise Sales Analysis</h3>
            <p className="text-sm text-gray-600 mt-1">Store-wise sales performance breakdown</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NSV</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {storeWiseSalesAnalysis.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.storeName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.storeCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.totalNSV)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(item.totalQuantity)}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
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
                      {item.storeName}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
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
                      {item.storeName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.storeCode}
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
            <p className="text-sm text-gray-600 mt-1">Stock management recommendations by store</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Daily Sales</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Projection</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recommended Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reorder Point</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store Norms</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recommendation</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {replenishmentData?.recommendations.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.storeName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.storeCode}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.storeNorms)}
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
                    <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">
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