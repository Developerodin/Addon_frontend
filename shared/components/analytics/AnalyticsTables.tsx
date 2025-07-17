import React from 'react';
import Link from 'next/link';
import { ProductPerformance, StorePerformance } from '@/shared/services/analyticsService';

// Format number using Indian number system (k for thousands, L for lakhs, Cr for crores)
const formatNumber = (value: number): string => {
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
    // Round to 2 decimal places for smaller numbers
    const rounded = Math.round(value * 100) / 100;
    const str = rounded.toString();
    if (str.includes('.')) {
      return str.replace(/\.?0+$/, '');
    }
    return str;
  }
};

// Format currency using Indian number system (k for thousands, L for lakhs, Cr for crores)
const formatCurrency = (value: number): string => {
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
    // Round to 2 decimal places for smaller numbers
    const rounded = Math.round(value * 100) / 100;
    const formatted = rounded.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
    return `₹${formatted}`;
  }
};

interface AnalyticsTablesProps {
  productPerformance: ProductPerformance[];
  storePerformance: StorePerformance[];
}

export const AnalyticsTables: React.FC<AnalyticsTablesProps> = ({
  productPerformance,
  storePerformance
}) => {
  // Only show real data from API
  const displayProductData = productPerformance;
  const displayStoreData = storePerformance;

  // Check if we have real data
  const hasRealProductData = productPerformance.length > 0;
  const hasRealStoreData = storePerformance.length > 0;

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Product Performance Table */}
      <div className="col-span-12">
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
                <Link
                  href="/analytics/product-performance"
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors duration-200"
                >
                  <i className="ri-external-link-line mr-1"></i>
                  Explore
                </Link>
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
                  <tr key={product._id} className={`hover:bg-gray-50 transition-colors duration-200 ${!hasRealProductData ? 'text-gray-400' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                          !hasRealProductData 
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
                          <div className={`text-sm font-medium ${!hasRealProductData ? 'text-gray-400' : 'text-gray-900'}`}>
                            {!hasRealProductData ? (
                              product.productName
                            ) : (
                              <Link 
                                href={`/analytics/product-analysis/${product._id}`}
                                className="text-primary hover:text-primary/80 transition-colors duration-200"
                              >
                                {product.productName}
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${!hasRealProductData ? 'text-gray-400' : 'text-gray-500'}`}>
                      {product.categoryName}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${!hasRealProductData ? 'text-gray-400' : 'text-gray-900'}`}>
                      {formatNumber(product.totalQuantity)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${!hasRealProductData ? 'text-gray-400' : 'text-green-600'}`}>
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
      <div className="col-span-12">
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
                <Link
                  href="/analytics/store-performance"
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors duration-200"
                >
                  <i className="ri-external-link-line mr-1"></i>
                  Explore
                </Link>
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
                  <tr key={store._id} className={`hover:bg-gray-50 transition-colors duration-200 ${!hasRealStoreData ? 'text-gray-400' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                          !hasRealStoreData 
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
                          <div className={`text-sm font-medium ${!hasRealStoreData ? 'text-gray-400' : 'text-gray-900'}`}>
                            {!hasRealStoreData ? (
                              store.storeName
                            ) : (
                              <Link 
                                href={`/analytics/store-analysis/${store._id}`}
                                className="text-primary hover:text-primary/80 transition-colors duration-200"
                              >
                                {store.storeName}
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${!hasRealStoreData ? 'text-gray-400' : 'text-gray-500'}`}>
                      {store.city}, {store.state}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${!hasRealStoreData ? 'text-gray-400' : 'text-gray-900'}`}>
                      {formatNumber(store.totalQuantity)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${!hasRealStoreData ? 'text-gray-400' : 'text-green-600'}`}>
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