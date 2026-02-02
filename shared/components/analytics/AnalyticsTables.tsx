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
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12">
        <div className="bg-white rounded border border-gray-100 overflow-hidden shadow-sm">
          <div className="p-[10px] border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded flex items-center justify-center bg-purple-50 text-purple-600">
                <i className="ri-shopping-bag-line text-sm"></i>
              </div>
              <h3 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider">Top Products</h3>
            </div>
            <Link
              href="/analytics/product-performance"
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-purple-600 hover:bg-purple-50 rounded transition-colors"
            >
              <i className="ri-external-link-line text-sm"></i> Explore
            </Link>
          </div>

          <div className="overflow-x-auto min-h-[200px]">
            <table className="w-full border-collapse border border-gray-200">
              <thead className="bg-gray-50/30">
                <tr>
                  <th className="pl-[10px] pr-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Product</th>
                  <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Category</th>
                  <th className="px-1.5 py-2 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Quantity</th>
                  <th className="pr-[10px] pl-1.5 py-2 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">NSV</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {displayProductData.slice(0, 5).map((product, index) => (
                  <tr key={product._id} className={`hover:bg-gray-50/50 transition-colors ${!hasRealProductData ? 'text-gray-400' : ''}`}>
                    <td className="pl-[10px] pr-1.5 py-2 whitespace-nowrap border border-gray-200">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold ${
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
                        <div className="min-w-0">
                          <div className={`text-[12px] font-medium truncate ${!hasRealProductData ? 'text-gray-400' : 'text-gray-900'}`}>
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
                    <td className={`px-1.5 py-2 whitespace-nowrap text-[12px] border border-gray-200 ${!hasRealProductData ? 'text-gray-400' : 'text-gray-500'}`}>
                      {product.categoryName}
                    </td>
                    <td className={`px-1.5 py-2 whitespace-nowrap text-[12px] text-right font-medium border border-gray-200 ${!hasRealProductData ? 'text-gray-400' : 'text-gray-900'}`}>
                      {formatNumber(product.totalQuantity)}
                    </td>
                    <td className={`pr-[10px] pl-1.5 py-2 whitespace-nowrap text-[12px] text-right font-medium border border-gray-200 ${!hasRealProductData ? 'text-gray-400' : 'text-green-600'}`}>
                      {formatCurrency(product.totalNSV)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="col-span-12">
        <div className="bg-white rounded border border-gray-100 overflow-hidden shadow-sm">
          <div className="p-[10px] border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded flex items-center justify-center bg-emerald-50 text-emerald-600">
                <i className="ri-store-line text-sm"></i>
              </div>
              <h3 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider">Store Performance</h3>
            </div>
            <Link
              href="/analytics/store-performance"
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-purple-600 hover:bg-purple-50 rounded transition-colors"
            >
              <i className="ri-external-link-line text-sm"></i> Explore
            </Link>
          </div>

          <div className="overflow-x-auto min-h-[200px]">
            <table className="w-full border-collapse border border-gray-200">
              <thead className="bg-gray-50/30">
                <tr>
                  <th className="pl-[10px] pr-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Store</th>
                  <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Location</th>
                  <th className="px-1.5 py-2 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Quantity</th>
                  <th className="pr-[10px] pl-1.5 py-2 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">NSV</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {displayStoreData.slice(0, 5).map((store, index) => (
                  <tr key={store._id} className={`hover:bg-gray-50/50 transition-colors ${!hasRealStoreData ? 'text-gray-400' : ''}`}>
                    <td className="pl-[10px] pr-1.5 py-2 whitespace-nowrap border border-gray-200">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold ${
                          !hasRealStoreData ? 'bg-gray-100 text-gray-400' : index === 0 ? 'bg-yellow-100 text-yellow-700' : index === 1 ? 'bg-gray-100 text-gray-600' : index === 2 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className={`text-[12px] font-medium truncate ${!hasRealStoreData ? 'text-gray-400' : 'text-gray-900'}`}>
                            {!hasRealStoreData ? store.storeName : (
                              <Link href={`/analytics/store-analysis/${store._id}`} className="text-purple-600 hover:text-purple-700">
                                {store.storeName}
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className={`px-1.5 py-2 whitespace-nowrap text-[12px] border border-gray-200 ${!hasRealStoreData ? 'text-gray-400' : 'text-gray-500'}`}>
                      {store.city}, {store.state}
                    </td>
                    <td className={`px-1.5 py-2 whitespace-nowrap text-[12px] text-right font-medium border border-gray-200 ${!hasRealStoreData ? 'text-gray-400' : 'text-gray-900'}`}>
                      {formatNumber(store.totalQuantity)}
                    </td>
                    <td className={`pr-[10px] pl-1.5 py-2 whitespace-nowrap text-[12px] text-right font-medium border border-gray-200 ${!hasRealStoreData ? 'text-gray-400' : 'text-green-600'}`}>
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