import { DashboardOverview, SalesAnalytics, StorePerformance, CategoryAnalytics, CityPerformance, DemandForecast, TopProducts } from '@/shared/services/dashboardService';

// Format number with K, L, CR suffixes for better readability
const formatLargeNumber = (num: number): string => {
  if (num >= 10000000) { // 1 crore = 10,000,000
    return (num / 10000000).toFixed(1) + ' CR';
  } else if (num >= 100000) { // 1 lakh = 100,000
    return (num / 100000).toFixed(1) + ' L';
  } else if (num >= 1000) { // 1 thousand = 1,000
    return (num / 1000).toFixed(1) + ' K';
  }
  return num.toString();
};

// Format currency with K, L, CR suffixes
export const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) { // 1 crore = 10,000,000
    return '₹' + (amount / 10000000).toFixed(1) + ' CR';
  } else if (amount >= 100000) { // 1 lakh = 100,000
    return '₹' + (amount / 100000).toFixed(1) + ' L';
  } else if (amount >= 1000) { // 1 thousand = 1,000
    return '₹' + (amount / 1000).toFixed(1) + ' K';
  }
  return '₹' + amount.toString();
};

// Format number with K, L, CR suffixes
export const formatNumber = (num: number): string => {
  return formatLargeNumber(num);
};

// Format percentage
export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// Convert dashboard data to chart series for monthly trends
export const getMonthlyTrendsChartData = (monthlyTrends: DashboardOverview['monthlyTrends'] | undefined) => {
  if (!monthlyTrends || monthlyTrends.length === 0) {
    return {
      categories: [],
      nsvSeries: [0],
      quantitySeries: [0],
      ordersSeries: [0]
    };
  }

  const sortedTrends = monthlyTrends.sort((a, b) => {
    const dateA = new Date(a._id.year, a._id.month - 1);
    const dateB = new Date(b._id.year, b._id.month - 1);
    return dateA.getTime() - dateB.getTime();
  });

  const categories = sortedTrends.map(trend => {
    const date = new Date(trend._id.year, trend._id.month - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  });

  const nsvSeries = sortedTrends.map(trend => trend.totalNSV);
  const quantitySeries = sortedTrends.map(trend => trend.totalQuantity);
  const ordersSeries = sortedTrends.map(trend => trend.totalOrders);

  return {
    categories,
    nsvSeries,
    quantitySeries,
    ordersSeries
  };
};

// Convert store performance to donut chart data
export const getStorePerformanceChartData = (storePerformance: StorePerformance[]) => {
  if (!storePerformance || storePerformance.length === 0) {
    return {
      labels: ['No Data'],
      series: [100]
    };
  }

  const labels = storePerformance.map(store => store.storeName);
  const series = storePerformance.map(store => store.totalNSV);

  return {
    labels,
    series
  };
};

// Convert category analytics to line chart data
export const getCategoryAnalyticsChartData = (categoryAnalytics: CategoryAnalytics | null) => {
  if (!categoryAnalytics || !categoryAnalytics.categories || categoryAnalytics.categories.length === 0) {
    return {
      categories: ['No Data'],
      nsvSeries: [0],
      quantitySeries: [0]
    };
  }

  const categories = categoryAnalytics.categories.map(cat => cat.categoryName);
  const nsvSeries = categoryAnalytics.categories.map(cat => cat.totalNSV);
  const quantitySeries = categoryAnalytics.categories.map(cat => cat.totalQuantity);

  return {
    categories,
    nsvSeries,
    quantitySeries
  };
};

// Convert demand forecast to chart data
export const getDemandForecastChartData = (demandForecast: DemandForecast | null) => {
  if (!demandForecast || !demandForecast.forecast || demandForecast.forecast.length === 0) {
    return {
      categories: ['No Data'],
      actualSeries: [0],
      forecastSeries: [0]
    };
  }

  const categories = demandForecast.forecast.map(item => item.productName);
  const actualSeries = demandForecast.actualDemand.map(item => item.actualQuantity);
  const forecastSeries = demandForecast.forecast.map(item => item.forecastedQuantity);

  return {
    categories,
    actualSeries,
    forecastSeries
  };
};

// Convert city performance to table data
export const getCityPerformanceTableData = (cityPerformance: CityPerformance[]) => {
  if (!cityPerformance || cityPerformance.length === 0) {
    return [];
  }

  return cityPerformance.map(city => ({
    city: city._id,
    totalNSV: formatCurrency(city.totalNSV),
    totalQuantity: formatNumber(city.totalQuantity),
    totalOrders: formatNumber(city.totalOrders),
    storeCount: formatNumber(city.storeCount),
    avgOrderValue: formatCurrency(city.avgOrderValue)
  }));
};

// Get top stores data for display
export const getTopStoresData = (topStores: DashboardOverview['topStores']) => {
  if (!topStores || topStores.length === 0) {
    return [];
  }

  return topStores.map(store => ({
    name: store.storeName,
    nsv: formatCurrency(store.totalNSV),
    quantity: formatNumber(store.totalQuantity)
  }));
};

// Calculate total values from overview
export const getOverviewTotals = (overview: DashboardOverview['overview'] | undefined) => {
  if (!overview) {
    return {
      totalNSV: 0,
      totalGSV: 0,
      totalOrders: 0,
      salesChange: 0
    };
  }

  return {
    totalNSV: overview.totalSales.totalNSV,
    totalGSV: overview.totalSales.totalGSV,
    totalOrders: overview.totalOrders,
    salesChange: overview.salesChange
  };
};

// Convert top products to pie chart data
export const getTopProductsChartData = (topProducts: TopProducts | null) => {
  if (!topProducts || !topProducts.products || topProducts.products.length === 0) {
    return {
      labels: ['No Data'],
      series: [100],
      colors: ['#e5e7eb']
    };
  }

  const labels = topProducts.products.map(product => product.productName);
  const series = topProducts.products.map(product => product.totalNSV);
  const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'];

  return {
    labels,
    series,
    colors: colors.slice(0, labels.length)
  };
}; 