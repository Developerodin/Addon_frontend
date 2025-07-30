"use client";

import React, { useState, useEffect } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Pageheader from '@/shared/layout-components/page-header/pageheader';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import { StoreAnalysisCharts } from '@/shared/components/analytics/StoreAnalysisCharts';
import { StoreAnalysisSummary } from '@/shared/components/analytics/StoreAnalysisSummary';
import HelpIcon from '@/shared/components/HelpIcon';

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
        <div className="flex items-center justify-between">
          <Link 
            href="/analytics"
            className="inline-flex items-center text-sm text-primary hover:text-primary/80 transition-colors duration-200"
          >
            <i className="ri-arrow-left-line mr-2"></i>
            Back to Analytics
          </Link>
                     <HelpIcon
             title="Store Analysis"
             content={
               <div>
                 <p className="mb-4">
                   This page provides detailed analysis for a specific store, including sales performance, product analysis, forecasts, and replenishment recommendations.
                 </p>
                 
                 <h4 className="font-semibold mb-2">What you can do:</h4>
                 <ul className="list-disc list-inside mb-4 space-y-1">
                   <li><strong>View Store Overview:</strong> See key metrics like gross LTV, current month trend, and norms</li>
                   <li><strong>Monthly Analysis:</strong> View month-wise sales performance and trends</li>
                   <li><strong>Product Analysis:</strong> See how different products perform in this store</li>
                   <li><strong>Sales Entries:</strong> View detailed sales records for the store</li>
                   <li><strong>Demand Forecast:</strong> See predicted demand for products in this store</li>
                   <li><strong>Replenishment:</strong> Get stock recommendations for the store</li>
                   <li><strong>Interactive Charts:</strong> Visualize data through various chart types</li>
                   <li><strong>Export Data:</strong> Export analysis data for external use</li>
                 </ul>

                 <h4 className="font-semibold mb-2">Key Metrics Explained:</h4>
                 
                 <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                   <h5 className="font-semibold text-blue-800 mb-2 flex items-center">
                     <i className="ri-money-dollar-circle-line mr-2"></i>
                     Gross LTV (Lifetime Value)
                   </h5>
                   <p className="text-sm text-blue-700 mb-2">
                     <strong>What it is:</strong> Gross Lifetime Value represents the total revenue generated by this store over its entire operational period.
                   </p>
                   <p className="text-sm text-blue-700 mb-2">
                     <strong>How calculated:</strong> Sum of all sales transactions (NSV) from the store's inception to current date.
                   </p>
                   <p className="text-sm text-blue-700">
                     <strong>Formula:</strong> Gross LTV = Σ(All Historical Sales NSV)
                   </p>
                 </div>

                 <div className="mb-4 p-3 bg-green-50 rounded-lg">
                   <h5 className="font-semibold text-green-800 mb-2 flex items-center">
                     <i className="ri-bar-chart-line mr-2"></i>
                     Norms (₹)
                   </h5>
                   <p className="text-sm text-green-700 mb-2">
                     <strong>What it is:</strong> Store-specific performance benchmarks and standards based on historical data and store characteristics.
                   </p>
                   <p className="text-sm text-green-700 mb-2">
                     <strong>How found:</strong> Calculated using statistical analysis of the store's historical performance, considering factors like location, size, and market conditions.
                   </p>
                   <p className="text-sm text-green-700 mb-2">
                     <strong>Rupee sign (₹):</strong> Indicates the monetary value of the norm in Indian Rupees. This represents the expected performance level for this store.
                   </p>
                   <p className="text-sm text-green-700">
                     <strong>Formula:</strong> Norms = Average(Historical Performance) ± Standard Deviation
                   </p>
                 </div>

                 <h4 className="font-semibold mb-2">Demand Forecast Calculations:</h4>
                 <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                   <h5 className="font-semibold text-purple-800 mb-2 flex items-center">
                     <i className="ri-calculator-line mr-2"></i>
                     Moving Average Method
                   </h5>
                   <p className="text-sm text-purple-700 mb-2">
                     <strong>Formula:</strong> MA(n) = (D₁ + D₂ + ... + Dₙ) / n
                   </p>
                   <p className="text-sm text-purple-700 mb-2">
                     Where: D = Demand values, n = Number of periods
                   </p>
                   <p className="text-sm text-purple-700">
                     <strong>Use case:</strong> Smooths out short-term fluctuations to identify trends
                   </p>
                 </div>

                 <div className="mb-4 p-3 bg-orange-50 rounded-lg">
                   <h5 className="font-semibold text-orange-800 mb-2 flex items-center">
                     <i className="ri-function-line mr-2"></i>
                     Weighted Average Method
                   </h5>
                   <p className="text-sm text-orange-700 mb-2">
                     <strong>Formula:</strong> WA = (w₁×D₁ + w₂×D₂ + ... + wₙ×Dₙ) / (w₁ + w₂ + ... + wₙ)
                   </p>
                   <p className="text-sm text-orange-700 mb-2">
                     Where: w = Weight factors, D = Demand values
                   </p>
                   <p className="text-sm text-orange-700">
                     <strong>Use case:</strong> Gives more importance to recent data points
                   </p>
                 </div>

                 <h4 className="font-semibold mb-2">Replenishment Calculations:</h4>
                 <div className="mb-4 p-3 bg-teal-50 rounded-lg">
                   <h5 className="font-semibold text-teal-800 mb-2 flex items-center">
                     <i className="ri-stack-line mr-2"></i>
                     Replenishment Formula
                   </h5>
                   <p className="text-sm text-teal-700 mb-2">
                     <strong>Basic Formula:</strong> Replenishment = Forecasted Demand + Safety Stock - Current Inventory
                   </p>
                   <p className="text-sm text-teal-700 mb-2">
                     <strong>Safety Stock:</strong> Buffer inventory to handle demand variability
                   </p>
                   <p className="text-sm text-teal-700">
                     <strong>Lead Time:</strong> Time between ordering and receiving inventory
                   </p>
                 </div>

                 <h4 className="font-semibold mb-2">Replenishment Insights Section:</h4>
                 <div className="mb-4 p-3 bg-indigo-50 rounded-lg">
                   <h5 className="font-semibold text-indigo-800 mb-2 flex items-center">
                     <i className="ri-pie-chart-line mr-2"></i>
                     Priority Distribution Chart
                   </h5>
                   <p className="text-sm text-indigo-700 mb-2">
                     <strong>What it shows:</strong> A pie chart displaying the distribution of products by replenishment priority levels.
                   </p>
                   <p className="text-sm text-indigo-700 mb-2">
                     <strong>Priority Levels:</strong>
                   </p>
                   <ul className="text-sm text-indigo-700 mb-2 list-disc list-inside space-y-1">
                     <li><strong>High Priority (Red):</strong> Products that need immediate replenishment</li>
                     <li><strong>Medium Priority (Yellow):</strong> Products that need replenishment soon</li>
                     <li><strong>Low Priority (Green):</strong> Products with adequate stock levels</li>
                   </ul>
                   <p className="text-sm text-indigo-700 mb-2">
                     <strong>How to read:</strong> The chart shows the percentage of products in each priority category. For example, if you see "High Priority (25%)", it means 25% of products need immediate replenishment.
                   </p>
                   <p className="text-sm text-indigo-700 mb-2">
                     <strong>Understanding percentages:</strong> The percentages should always add up to 100%. If you see unusual percentages like 1111% or 2222%, this indicates a data issue that needs investigation.
                   </p>
                   <p className="text-sm text-indigo-700 mb-2">
                     <strong>What each item represents:</strong> Each "item" in the pie chart represents a product that has been analyzed for replenishment needs. The chart shows how many products fall into each priority category.
                   </p>
                   <p className="text-sm text-indigo-700">
                     <strong>What to check:</strong> If percentages seem incorrect, verify that the replenishment data is properly loaded and that all products have valid priority values assigned.
                   </p>
                 </div>

                 <h4 className="font-semibold mb-2">Data Sources:</h4>
                 <ul className="list-disc list-inside mb-4 space-y-1">
                   <li><strong>Real-time Data:</strong> All sales transactions, inventory levels, and performance metrics are fetched from live database</li>
                   <li><strong>Historical Data:</strong> Past sales records used for trend analysis and forecasting</li>
                   <li><strong>Store Configuration:</strong> Store-specific settings and parameters</li>
                   <li><strong>No Static Data:</strong> All displayed information is dynamic and updated based on actual business data</li>
                 </ul>

                 <h4 className="font-semibold mb-2">Analysis Tabs:</h4>
                 <ul className="list-disc list-inside mb-4 space-y-1">
                   <li><strong>Overview:</strong> Summary charts and key metrics</li>
                   <li><strong>Monthly Analysis:</strong> Month-wise sales breakdown</li>
                   <li><strong>Product Analysis:</strong> Product-wise performance comparison</li>
                   <li><strong>Sales Entries:</strong> Detailed sales records</li>
                   <li><strong>Demand Forecast:</strong> Future demand predictions using moving average and weighted average methods</li>
                   <li><strong>Replenishment:</strong> Stock recommendations based on forecasted demand and current inventory</li>
                 </ul>

                 <h4 className="font-semibold mb-2">How to Check Replenishment Items:</h4>
                 <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                   <h5 className="font-semibold text-yellow-800 mb-2 flex items-center">
                     <i className="ri-search-line mr-2"></i>
                     Finding Specific Items
                   </h5>
                   <p className="text-sm text-yellow-700 mb-2">
                     <strong>To see the actual products in each priority category:</strong>
                   </p>
                   <ol className="text-sm text-yellow-700 mb-2 list-decimal list-inside space-y-1">
                     <li>Click on the <strong>"Replenishment"</strong> tab in the analysis section</li>
                     <li>This will show a detailed table with all products and their replenishment recommendations</li>
                     <li>Look at the <strong>"Priority"</strong> column to see which products are High, Medium, or Low priority</li>
                     <li>You can also see specific recommendations for each product</li>
                   </ol>
                   <p className="text-sm text-yellow-700 mb-2">
                     <strong>What each item represents:</strong> Each "item" in the pie chart represents a product that has been analyzed for replenishment needs. The chart shows how many products fall into each priority category.
                   </p>
                   <p className="text-sm text-yellow-700 mb-2">
                     <strong>Example:</strong> If you see "High Priority (3 items, 30%)", it means there are 3 products that need immediate replenishment, and they represent 30% of all analyzed products.
                   </p>
                   <p className="text-sm text-yellow-700">
                     <strong>Troubleshooting:</strong> If the pie chart shows unusual percentages, check the Replenishment tab to see if all products have proper priority values assigned (High, Medium, or Low).
                   </p>
                 </div>

                 <h4 className="font-semibold mb-2">Tips:</h4>
                 <ul className="list-disc list-inside space-y-1">
                   <li>Compare actual performance against norms to identify improvement opportunities</li>
                   <li>Use demand forecast for inventory planning and procurement decisions</li>
                   <li>Review replenishment recommendations regularly to optimize stock levels</li>
                   <li>Monitor trends in monthly analysis to identify seasonal patterns</li>
                   <li>Export data for external analysis and reporting purposes</li>
                 </ul>
               </div>
             }
           />
        </div>
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
                <p className="text-lg font-bold text-gray-900 leading-tight">{formatNumber(storeInfo.norms)}</p>
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
          
          {/* Summary Cards */}
          {replenishmentData?.recommendations && replenishmentData.recommendations.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-red-800">High Priority Items</p>
                    <p className="text-xs text-red-600">Need immediate replenishment</p>
                  </div>
                  <span className="text-lg font-bold text-red-600">
                    {replenishmentData.recommendations.filter((item: any) => item.priority === 'High').length}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Medium Priority Items</p>
                    <p className="text-xs text-yellow-600">Need replenishment soon</p>
                  </div>
                  <span className="text-lg font-bold text-yellow-600">
                    {replenishmentData.recommendations.filter((item: any) => item.priority === 'Medium').length}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-green-800">Low Priority Items</p>
                    <p className="text-xs text-green-600">Adequate stock levels</p>
                  </div>
                  <span className="text-lg font-bold text-green-600">
                    {replenishmentData.recommendations.filter((item: any) => item.priority === 'Low').length}
                  </span>
                </div>
              </div>
            </div>
          )}
          
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