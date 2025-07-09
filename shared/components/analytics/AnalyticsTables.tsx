import React from 'react';
import { ProductPerformance, StorePerformance } from '@/shared/services/analyticsService';

// Format number to show only 2 decimal places and hide trailing zeros
const formatNumber = (value: number): string => {
  if (value === 0) return '0';
  
  // Round to 2 decimal places
  const rounded = Math.round(value * 100) / 100;
  
  // Convert to string and remove trailing zeros after decimal
  const str = rounded.toString();
  if (str.includes('.')) {
    return str.replace(/\.?0+$/, '');
  }
  
  return str;
};

// Format currency with proper decimal handling
const formatCurrency = (value: number): string => {
  if (value === 0) return '₹0';
  
  // Round to 2 decimal places
  const rounded = Math.round(value * 100) / 100;
  
  // Format with locale and remove trailing zeros
  const formatted = rounded.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  
  return `₹${formatted}`;
};

interface AnalyticsTablesProps {
  productPerformance: ProductPerformance[];
  storePerformance: StorePerformance[];
}

export const AnalyticsTables: React.FC<AnalyticsTablesProps> = ({
  productPerformance,
  storePerformance
}) => {
  // Generate sample data for empty tables
  const getSampleProductData = () => [
    { _id: '1', productName: 'No Data Available', categoryName: 'N/A', totalQuantity: 0, totalNSV: 0 },
    { _id: '2', productName: 'Sample Product 1', categoryName: 'Sample', totalQuantity: 0, totalNSV: 0 },
    { _id: '3', productName: 'Sample Product 2', categoryName: 'Sample', totalQuantity: 0, totalNSV: 0 },
    { _id: '4', productName: 'Sample Product 3', categoryName: 'Sample', totalQuantity: 0, totalNSV: 0 },
    { _id: '5', productName: 'Sample Product 4', categoryName: 'Sample', totalQuantity: 0, totalNSV: 0 }
  ];

  const getSampleStoreData = () => [
    { _id: '1', storeName: 'No Data Available', city: 'N/A', state: 'N/A', totalQuantity: 0, totalNSV: 0 },
    { _id: '2', storeName: 'Sample Store 1', city: 'Sample City', state: 'Sample State', totalQuantity: 0, totalNSV: 0 },
    { _id: '3', storeName: 'Sample Store 2', city: 'Sample City', state: 'Sample State', totalQuantity: 0, totalNSV: 0 },
    { _id: '4', storeName: 'Sample Store 3', city: 'Sample City', state: 'Sample State', totalQuantity: 0, totalNSV: 0 },
    { _id: '5', storeName: 'Sample Store 4', city: 'Sample City', state: 'Sample State', totalQuantity: 0, totalNSV: 0 }
  ];

  const displayProductData = productPerformance.length > 0 ? productPerformance : getSampleProductData();
  const displayStoreData = storePerformance.length > 0 ? storePerformance : getSampleStoreData();

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Product Performance Table */}
      <div className="xl:col-span-6 col-span-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300">
          {/* Table Header */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <i className="ri-shopping-bag-line text-lg text-purple-600"></i>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Top Products</h3>
                  <p className="text-sm text-gray-500">Best performing products by sales</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs text-gray-500">Updated</span>
              </div>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">NSV</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {displayProductData.slice(0, 5).map((product, index) => (
                  <tr key={product._id} className={`hover:bg-gray-50 transition-colors duration-200 ${productPerformance.length === 0 ? 'text-gray-400' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                          productPerformance.length === 0 
                            ? 'bg-gray-100 text-gray-400' 
                            : index === 0 
                              ? 'bg-yellow-100 text-yellow-700' 
                              : index === 1 
                                ? 'bg-gray-100 text-gray-600' 
                                : index === 2 
                                  ? 'bg-amber-100 text-amber-700' 
                                  : 'bg-blue-100 text-blue-700'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="ml-3">
                          <div className={`text-sm font-medium ${productPerformance.length === 0 ? 'text-gray-400' : 'text-gray-900'}`}>
                            {product.productName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${productPerformance.length === 0 ? 'text-gray-400' : 'text-gray-500'}`}>
                      {product.categoryName}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${productPerformance.length === 0 ? 'text-gray-400' : 'text-gray-900'}`}>
                      {formatNumber(product.totalQuantity)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${productPerformance.length === 0 ? 'text-gray-400' : 'text-green-600'}`}>
                      {formatCurrency(product.totalNSV)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Store Performance Table */}
      <div className="xl:col-span-6 col-span-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300">
          {/* Table Header */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <i className="ri-store-line text-lg text-emerald-600"></i>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Store Performance</h3>
                  <p className="text-sm text-gray-500">Top performing retail locations</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs text-gray-500">Live</span>
              </div>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">NSV</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {displayStoreData.slice(0, 5).map((store, index) => (
                  <tr key={store._id} className={`hover:bg-gray-50 transition-colors duration-200 ${storePerformance.length === 0 ? 'text-gray-400' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                          storePerformance.length === 0 
                            ? 'bg-gray-100 text-gray-400' 
                            : index === 0 
                              ? 'bg-yellow-100 text-yellow-700' 
                              : index === 1 
                                ? 'bg-gray-100 text-gray-600' 
                                : index === 2 
                                  ? 'bg-amber-100 text-amber-700' 
                                  : 'bg-blue-100 text-blue-700'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="ml-3">
                          <div className={`text-sm font-medium ${storePerformance.length === 0 ? 'text-gray-400' : 'text-gray-900'}`}>
                            {store.storeName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${storePerformance.length === 0 ? 'text-gray-400' : 'text-gray-500'}`}>
                      {store.city}, {store.state}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${storePerformance.length === 0 ? 'text-gray-400' : 'text-gray-900'}`}>
                      {formatNumber(store.totalQuantity)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${storePerformance.length === 0 ? 'text-gray-400' : 'text-green-600'}`}>
                      {formatCurrency(store.totalNSV)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}; 