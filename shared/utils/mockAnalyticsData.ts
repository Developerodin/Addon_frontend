import { TimeBasedTrend, ProductPerformance, StorePerformance, BrandPerformance, DiscountImpact, TaxMRPData, SummaryKPIs } from '@/shared/services/analyticsService';

// Generate mock time-based trends data
export const generateMockTimeBasedTrends = (dateFrom: string, dateTo: string): TimeBasedTrend[] => {
  const startDate = new Date(dateFrom);
  const endDate = new Date(dateTo);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  return Array.from({ length: Math.min(days, 30) }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    
    return {
      date: date.toISOString(),
      totalQuantity: Math.floor(Math.random() * 1000) + 100,
      totalNSV: Math.floor(Math.random() * 50000) + 5000,
      totalGSV: Math.floor(Math.random() * 60000) + 6000,
      totalDiscount: Math.floor(Math.random() * 10000) + 500,
      totalTax: Math.floor(Math.random() * 5000) + 250,
      recordCount: Math.floor(Math.random() * 50) + 5
    };
  });
};

// Generate mock product performance data
export const generateMockProductPerformance = (): ProductPerformance[] => {
  const products = [
    { name: 'Premium Cotton Socks', code: 'SOCKS001', category: 'Socks' },
    { name: 'Wool Blend Socks', code: 'SOCKS002', category: 'Socks' },
    { name: 'Silk Hankies', code: 'HANK001', category: 'Hankies' },
    { name: 'Cotton Hankies', code: 'HANK002', category: 'Hankies' },
    { name: 'Linen Hankies', code: 'HANK003', category: 'Hankies' },
    { name: 'Sports Socks', code: 'SOCKS003', category: 'Socks' },
    { name: 'Formal Socks', code: 'SOCKS004', category: 'Socks' },
    { name: 'Designer Hankies', code: 'HANK004', category: 'Hankies' },
    { name: 'Kids Socks', code: 'SOCKS005', category: 'Socks' },
    { name: 'Luxury Hankies', code: 'HANK005', category: 'Hankies' }
  ];

  return products.map((product, index) => ({
    _id: `product_${index + 1}`,
    productName: product.name,
    productCode: product.code,
    categoryName: product.category,
    totalQuantity: Math.floor(Math.random() * 5000) + 500,
    totalNSV: Math.floor(Math.random() * 250000) + 25000,
    totalGSV: Math.floor(Math.random() * 300000) + 30000,
    totalDiscount: Math.floor(Math.random() * 50000) + 5000,
    recordCount: Math.floor(Math.random() * 150) + 15
  }));
};

// Generate mock store performance data
export const generateMockStorePerformance = (): StorePerformance[] => {
  const stores = [
    { name: 'Mumbai Central Store', id: 'MUM001', city: 'Mumbai', state: 'Maharashtra' },
    { name: 'Delhi Main Store', id: 'DEL001', city: 'Delhi', state: 'Delhi' },
    { name: 'Bangalore Store', id: 'BLR001', city: 'Bangalore', state: 'Karnataka' },
    { name: 'Chennai Store', id: 'CHN001', city: 'Chennai', state: 'Tamil Nadu' },
    { name: 'Kolkata Store', id: 'KOL001', city: 'Kolkata', state: 'West Bengal' },
    { name: 'Hyderabad Store', id: 'HYD001', city: 'Hyderabad', state: 'Telangana' },
    { name: 'Pune Store', id: 'PUN001', city: 'Pune', state: 'Maharashtra' },
    { name: 'Ahmedabad Store', id: 'AHM001', city: 'Ahmedabad', state: 'Gujarat' }
  ];

  return stores.map((store, index) => ({
    _id: `store_${index + 1}`,
    storeName: store.name,
    storeId: store.id,
    city: store.city,
    state: store.state,
    totalQuantity: Math.floor(Math.random() * 10000) + 1000,
    totalNSV: Math.floor(Math.random() * 500000) + 50000,
    totalGSV: Math.floor(Math.random() * 600000) + 60000,
    totalDiscount: Math.floor(Math.random() * 100000) + 10000,
    totalTax: Math.floor(Math.random() * 25000) + 2500,
    recordCount: Math.floor(Math.random() * 300) + 30
  }));
};

// Generate mock brand performance data
export const generateMockBrandPerformance = (): BrandPerformance[] => {
  const brands = [
    'Louis Philippe',
    'Van Heusen',
    'Allen Solly',
    'Peter England',
    'Raymond',
    'Arrow',
    'Park Avenue',
    'ColorPlus'
  ];

  return brands.map((brand, index) => ({
    _id: brand,
    brandName: brand,
    totalQuantity: Math.floor(Math.random() * 15000) + 1500,
    totalNSV: Math.floor(Math.random() * 750000) + 75000,
    totalGSV: Math.floor(Math.random() * 900000) + 90000,
    totalDiscount: Math.floor(Math.random() * 150000) + 15000,
    recordCount: Math.floor(Math.random() * 450) + 45
  }));
};

// Generate mock discount impact data
export const generateMockDiscountImpact = (dateFrom: string, dateTo: string): DiscountImpact[] => {
  const startDate = new Date(dateFrom);
  const endDate = new Date(dateTo);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  return Array.from({ length: Math.min(days, 30) }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    
    return {
      date: date.toISOString(),
      avgDiscountPercentage: Math.random() * 20 + 5, // 5-25%
      totalDiscount: Math.floor(Math.random() * 50000) + 5000,
      totalNSV: Math.floor(Math.random() * 400000) + 40000,
      totalTax: Math.floor(Math.random() * 20000) + 2000,
      recordCount: Math.floor(Math.random() * 100) + 10
    };
  });
};

// Generate mock tax and MRP data
export const generateMockTaxMRPData = (dateFrom: string, dateTo: string): TaxMRPData => {
  const startDate = new Date(dateFrom);
  const endDate = new Date(dateTo);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const dailyTaxData = Array.from({ length: Math.min(days, 30) }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    
    return {
      date: date.toISOString(),
      totalTax: Math.floor(Math.random() * 25000) + 2500,
      avgMRP: Math.random() * 200 + 100, // 100-300
      recordCount: Math.floor(Math.random() * 100) + 10
    };
  });

  const mrpDistribution = [
    { _id: 100, count: 500, avgNSV: 95.00 },
    { _id: 200, count: 300, avgNSV: 180.00 },
    { _id: 500, count: 200, avgNSV: 450.00 },
    { _id: 1000, count: 150, avgNSV: 850.00 },
    { _id: 2000, count: 100, avgNSV: 1800.00 },
    { _id: 'Above 5000', count: 50, avgNSV: 4500.00 }
  ];

  return {
    dailyTaxData,
    mrpDistribution
  };
};

// Generate mock summary KPIs
export const generateMockSummaryKPIs = (): SummaryKPIs => {
  return {
    totalQuantity: 50000,
    totalNSV: 2500000,
    totalGSV: 3000000,
    totalDiscount: 500000,
    totalTax: 250000,
    recordCount: 1500,
    avgDiscountPercentage: 16.67,
    topSellingSKU: {
      _id: 'product_1',
      productName: 'Premium Cotton Socks',
      totalQuantity: 5000,
      totalNSV: 250000
    }
  };
};

// Safe mock data generator with null checks
export const generateSafeMockSummaryKPIs = (): SummaryKPIs => {
  try {
    return generateMockSummaryKPIs();
  } catch (error) {
    console.error('Error generating mock summary KPIs:', error);
    // Return safe fallback data
    return {
      totalQuantity: 0,
      totalNSV: 0,
      totalGSV: 0,
      totalDiscount: 0,
      totalTax: 0,
      recordCount: 0,
      avgDiscountPercentage: 0,
      topSellingSKU: {
        _id: 'fallback',
        productName: 'N/A',
        totalQuantity: 0,
        totalNSV: 0
      }
    };
  }
}; 