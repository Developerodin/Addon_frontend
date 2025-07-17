import React from 'react';
import SafeChart from '@/shared/components/SafeChart';

interface ProductAnalysisChartsProps {
  monthlySalesAnalysis: any[];
  storeWiseSalesAnalysis: any[];
  forecastData: any;
  replenishmentData: any;
  salesEntries: any[];
}

/**
 * Product Analysis Charts Component
 * Displays comprehensive analytics for product performance including:
 * - Demand Forecast vs Sales Trends (3-line chart)
 * - Monthly Sales Performance
 * - Store Performance Distribution
 * - Sales Trend Analysis
 */
export const ProductAnalysisCharts: React.FC<ProductAnalysisChartsProps> = ({
  monthlySalesAnalysis,
  storeWiseSalesAnalysis,
  forecastData,
  replenishmentData,
  salesEntries
}) => {
  
  // Format currency using Indian number system
  const formatCurrency = (value: number) => {
    if (value === 0) return '₹0';
    const absValue = Math.abs(value);
    if (absValue >= 10000000) {
      const crores = absValue / 10000000;
      const formatted = crores >= 10 ? Math.round(crores) : Math.round(crores * 10) / 10;
      return `₹${formatted}Cr`;
    } else if (absValue >= 100000) {
      const lakhs = absValue / 100000;
      const formatted = lakhs >= 10 ? Math.round(lakhs) : Math.round(lakhs * 10) / 10;
      return `₹${formatted}L`;
    } else if (absValue >= 1000) {
      const thousands = absValue / 1000;
      const formatted = thousands >= 10 ? Math.round(thousands) : Math.round(thousands * 10) / 10;
      return `₹${formatted}k`;
    } else {
      return `₹${Math.round(value).toLocaleString()}`;
    }
  };

  // Format number using Indian number system
  const formatNumber = (value: number) => {
    if (value === 0) return '0';
    const absValue = Math.abs(value);
    if (absValue >= 10000000) {
      const crores = absValue / 10000000;
      const formatted = crores >= 10 ? Math.round(crores) : Math.round(crores * 10) / 10;
      return `${value < 0 ? '-' : ''}${formatted}Cr`;
    } else if (absValue >= 100000) {
      const lakhs = absValue / 100000;
      const formatted = lakhs >= 10 ? Math.round(lakhs) : Math.round(lakhs * 10) / 10;
      return `${value < 0 ? '-' : ''}${formatted}L`;
    } else if (absValue >= 1000) {
      const thousands = absValue / 1000;
      const formatted = thousands >= 10 ? Math.round(thousands) : Math.round(thousands * 10) / 10;
      return `${value < 0 ? '-' : ''}${formatted}k`;
    } else {
      return Math.round(value).toLocaleString();
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

  // 1. Future Demand Forecast Chart (Forecasted Sales and Quantity)
  const getFutureForecastChart = () => {
    // Get forecast data for future months only
    let forecastMonths: string[] = [];
    let forecastedNSV: number[] = [];
    let forecastedQuantity: number[] = [];
    
    if (forecastData?.forecastData && forecastData.forecastData.length > 0) {
      // Group forecast data by month
      const forecastByMonth = forecastData.forecastData.reduce((acc: any, item: any) => {
        const month = formatMonth(item.forecastMonth);
        if (!acc[month]) {
          acc[month] = { nsv: 0, quantity: 0 };
        }
        acc[month].nsv += item.forecastedNSV || 0;
        acc[month].quantity += item.forecastedQuantity || 0;
        return acc;
      }, {});
      
      // Sort months chronologically
      const sortedMonths = Object.keys(forecastByMonth).sort((a, b) => {
        return new Date(a).getTime() - new Date(b).getTime();
      });
      
      sortedMonths.forEach(month => {
        forecastMonths.push(month);
        forecastedNSV.push(forecastByMonth[month].nsv);
        forecastedQuantity.push(forecastByMonth[month].quantity);
      });
    }

    // Calculate min/max for proper Y-axis scaling
    const maxNSV = Math.max(...forecastedNSV, 1);
    const maxQuantity = Math.max(...forecastedQuantity, 1);
    const minQuantity = Math.min(...forecastedQuantity, 0);

    return {
      series: [
        {
          name: 'Forecasted Sales (NSV)',
          type: 'line',
          data: forecastedNSV,
          color: '#10b981'
        },
        {
          name: 'Forecasted Quantity',
          type: 'line',
          data: forecastedQuantity,
          color: '#ec4899'
        }
      ],
      options: {
        chart: {
          type: 'line',
          height: 350,
          toolbar: { show: false },
          animations: {
            enabled: true,
            easing: 'easeinout',
            speed: 800
          }
        },
        stroke: {
          curve: 'smooth',
          width: 3
        },
        colors: ['#10b981', '#ec4899'],
        xaxis: {
          categories: forecastMonths,
          labels: {
            style: {
              colors: '#6b7280',
              fontSize: '12px'
            }
          }
        },
        yaxis: [
          {
            title: {
              text: 'Sales Value (₹)',
              style: {
                color: '#6b7280',
                fontSize: '12px'
              }
            },
            labels: {
              formatter: (value: number) => formatCurrency(value),
              style: {
                colors: '#6b7280',
                fontSize: '11px'
              }
            },
            min: 0,
            max: maxNSV * 1.1
          },
          {
            opposite: true,
            title: {
              text: 'Quantity',
              style: {
                color: '#6b7280',
                fontSize: '12px'
              }
            },
            labels: {
              formatter: (value: number) => formatNumber(value),
              style: {
                colors: '#6b7280',
                fontSize: '11px'
              }
            },
            min: Math.max(0, minQuantity * 0.9),
            max: maxQuantity * 1.1
          }
        ],
        tooltip: {
          shared: true,
          intersect: false,
          y: {
            formatter: (value: number, { seriesIndex }: any) => {
              if (seriesIndex === 1) return formatNumber(value);
              return formatCurrency(value);
            }
          }
        },
        legend: {
          position: 'top',
          horizontalAlign: 'left',
          fontSize: '12px',
          markers: {
            radius: 4
          }
        },
        grid: {
          borderColor: '#f1f1f1',
          strokeDashArray: 3
        },
        markers: {
          size: 4,
          hover: {
            size: 6
          }
        }
      }
    };
  };

  // 2. Monthly Sales Performance (Bar Chart)
  const getMonthlySalesChart = () => {
    const months = monthlySalesAnalysis.map(item => formatMonth(item.month));
    const nsvData = monthlySalesAnalysis.map(item => item.totalNSV || 0);
    const quantityData = monthlySalesAnalysis.map(item => item.totalQuantity || 0);

    // Calculate min/max for proper Y-axis scaling
    const maxNSV = Math.max(...nsvData, 1);
    const maxQuantity = Math.max(...quantityData, 1);
    const minQuantity = Math.max(0, Math.min(...quantityData, 0)); // Ensure quantity never goes below 0

    return {
      series: [
        {
          name: 'NSV',
          data: nsvData,
          color: '#3b82f6'
        },
        {
          name: 'Quantity',
          data: quantityData,
          color: '#10b981'
        }
      ],
      options: {
        chart: {
          type: 'bar',
          height: 350,
          toolbar: { show: false },
          stacked: false
        },
        colors: ['#3b82f6', '#10b981'],
        xaxis: {
          categories: months,
          labels: {
            style: {
              colors: '#6b7280',
              fontSize: '12px'
            }
          }
        },
        yaxis: [
          {
            title: {
              text: 'Sales Value (₹)',
              style: {
                color: '#6b7280',
                fontSize: '12px'
              }
            },
            labels: {
              formatter: (value: number) => formatCurrency(value),
              style: {
                colors: '#6b7280',
                fontSize: '11px'
              }
            },
            min: 0,
            max: maxNSV * 1.1
          },
          {
            opposite: true,
            title: {
              text: 'Quantity',
              style: {
                color: '#6b7280',
                fontSize: '12px'
              }
            },
            labels: {
              formatter: (value: number) => formatNumber(value),
              style: {
                colors: '#6b7280',
                fontSize: '11px'
              }
            },
            min: 0, // Always start from 0 for quantity
            max: maxQuantity * 1.1
          }
        ],
        tooltip: {
          shared: true,
          intersect: false,
          y: {
            formatter: (value: number, { seriesIndex }: any) => {
              if (seriesIndex === 1) return formatNumber(value);
              return formatCurrency(value);
            }
          }
        },
        legend: {
          position: 'top',
          horizontalAlign: 'left',
          fontSize: '12px'
        },
        dataLabels: {
          enabled: false
        },
        plotOptions: {
          bar: {
            horizontal: false,
            columnWidth: '55%',
            borderRadius: 4
          }
        },
        grid: {
          borderColor: '#f1f1f1',
          strokeDashArray: 3
        }
      }
    };
  };

  // 3. Store Performance Distribution (Vertical Bar Chart)
  const getStorePerformanceChart = () => {
    // Get top 8 stores by NSV
    const topStores = storeWiseSalesAnalysis
      .sort((a, b) => b.totalNSV - a.totalNSV)
      .slice(0, 8);

    const storeNames = topStores.map(store => store.storeName);
    const nsvData = topStores.map(store => store.totalNSV);

    return {
      series: [
        {
          name: 'NSV',
          data: nsvData,
          color: '#8b5cf6'
        }
      ],
      options: {
        chart: {
          type: 'bar',
          height: 350,
          toolbar: { show: false },
          stacked: false
        },
        colors: ['#8b5cf6'],
        plotOptions: {
          bar: {
            horizontal: false,
            columnWidth: '55%',
            borderRadius: 4
          }
        },
        xaxis: {
          categories: storeNames,
          labels: {
            style: {
              colors: '#6b7280',
              fontSize: '11px'
            },
            rotate: -45,
            rotateAlways: false
          }
        },
        yaxis: {
          title: {
            text: 'Sales Value (₹)',
            style: {
              color: '#6b7280',
              fontSize: '12px'
            }
          },
          labels: {
            formatter: (value: number) => formatCurrency(value),
            style: {
              colors: '#6b7280',
              fontSize: '11px'
            }
          }
        },
        tooltip: {
          y: {
            formatter: (value: number) => formatCurrency(value)
          }
        },
        legend: {
          position: 'top',
          horizontalAlign: 'left',
          fontSize: '12px'
        },
        dataLabels: {
          enabled: false
        },
        grid: {
          borderColor: '#f1f1f1',
          strokeDashArray: 3
        }
      }
    };
  };

  // 3b. Store Quantity Performance (Vertical Bar Chart)
  const getStoreQuantityChart = () => {
    // Get top 8 stores by Quantity
    const topStores = storeWiseSalesAnalysis
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 8);

    const storeNames = topStores.map(store => store.storeName);
    const quantityData = topStores.map(store => store.totalQuantity);

    return {
      series: [
        {
          name: 'Quantity',
          data: quantityData,
          color: '#f59e0b'
        }
      ],
      options: {
        chart: {
          type: 'bar',
          height: 350,
          toolbar: { show: false },
          stacked: false
        },
        colors: ['#f59e0b'],
        plotOptions: {
          bar: {
            horizontal: false,
            columnWidth: '55%',
            borderRadius: 4
          }
        },
        xaxis: {
          categories: storeNames,
          labels: {
            style: {
              colors: '#6b7280',
              fontSize: '11px'
            },
            rotate: -45,
            rotateAlways: false
          }
        },
        yaxis: {
          title: {
            text: 'Quantity Sold',
            style: {
              color: '#6b7280',
              fontSize: '12px'
            }
          },
          labels: {
            formatter: (value: number) => formatNumber(value),
            style: {
              colors: '#6b7280',
              fontSize: '11px'
            }
          }
        },
        tooltip: {
          y: {
            formatter: (value: number) => formatNumber(value)
          }
        },
        legend: {
          position: 'top',
          horizontalAlign: 'left',
          fontSize: '12px'
        },
        dataLabels: {
          enabled: false
        },
        grid: {
          borderColor: '#f1f1f1',
          strokeDashArray: 3
        }
      }
    };
  };

  // 4. Replenishment Insights (Donut Chart)
  const getReplenishmentChart = () => {
    if (!replenishmentData?.recommendations || replenishmentData.recommendations.length === 0) {
      return {
        series: [0],
        options: {
          chart: {
            type: 'donut',
            height: 350,
            toolbar: { show: false }
          },
          labels: ['No Data'],
          colors: ['#6b7280'],
          legend: {
            position: 'bottom'
          },
          dataLabels: {
            enabled: false
          }
        }
      };
    }

    // Group recommendations by priority
    const priorityCounts = replenishmentData.recommendations.reduce((acc: any, item: any) => {
      const priority = item.priority || 'Low';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {});

    const labels = Object.keys(priorityCounts);
    const data = Object.values(priorityCounts).map(count => Math.round(count)); // Round the actual count values
    const totalStores = data.reduce((sum: number, count: number) => sum + count, 0);
    
    // Calculate percentages and round to whole numbers
    const percentages = data.map((count: number) => {
      const percentage = (count / totalStores) * 100;
      return Math.round(percentage); // Round to whole number
    });

    const colors = ['#ef4444', '#f59e0b', '#10b981']; // Red, Yellow, Green

    return {
      series: data,
      options: {
        chart: {
          type: 'donut',
          height: 350,
          toolbar: { show: false }
        },
        labels: labels.map((label, index) => `${label} (${percentages[index]}%)`),
        colors: colors,
        legend: {
          position: 'bottom',
          fontSize: '12px',
          formatter: (seriesName: string, opts: any) => {
            const percentage = percentages[opts.seriesIndex];
            return `${seriesName}: ${percentage}%`;
          }
        },
        dataLabels: {
          enabled: true,
          formatter: (val: number, opts: any) => {
            const percentage = percentages[opts.seriesIndex];
            return `${percentage}%`;
          },
          style: {
            fontSize: '12px',
            fontWeight: 'bold'
          }
        },
        plotOptions: {
          pie: {
            donut: {
              size: '60%',
              labels: {
                show: true,
                total: {
                  show: true,
                  label: 'Total',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#6b7280',
                  formatter: () => '100%'
                }
              }
            }
          }
        },
        tooltip: {
          y: {
            formatter: (val: number, opts: any) => {
              const percentage = percentages[opts.seriesIndex];
              return `${percentage}%`;
            }
          }
        }
      }
    };
  };

  // 5. Sales Trend Analysis (Area Chart)
  const getSalesTrendChart = () => {
    // Group sales entries by date and calculate daily totals
    const dailySales = salesEntries.reduce((acc: any, entry: any) => {
      const date = new Date(entry.date).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric'
      });
      
      if (!acc[date]) {
        acc[date] = { nsv: 0, quantity: 0, count: 0 };
      }
      
      acc[date].nsv += entry.nsv || 0;
      acc[date].quantity += entry.quantity || 0;
      acc[date].count += 1;
      
      return acc;
    }, {});

    const dates = Object.keys(dailySales).slice(-30); // Last 30 days
    const nsvData = dates.map(date => dailySales[date].nsv);
    const quantityData = dates.map(date => dailySales[date].quantity);

    return {
      series: [
        {
          name: 'Daily NSV',
          data: nsvData,
          color: '#06b6d4'
        },
        {
          name: 'Daily Quantity',
          data: quantityData,
          color: '#ec4899'
        }
      ],
      options: {
        chart: {
          type: 'area',
          height: 350,
          toolbar: { show: false },
          animations: {
            enabled: true,
            easing: 'easeinout',
            speed: 800
          }
        },
        colors: ['#06b6d4', '#ec4899'],
        stroke: {
          curve: 'smooth',
          width: 2
        },
        fill: {
          type: 'gradient',
          gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.7,
            opacityTo: 0.2,
            stops: [0, 90, 100]
          }
        },
        xaxis: {
          categories: dates,
          labels: {
            style: {
              colors: '#6b7280',
              fontSize: '11px'
            }
          }
        },
        yaxis: [
          {
            title: {
              text: 'Sales Value (₹)',
              style: {
                color: '#6b7280',
                fontSize: '12px'
              }
            },
            labels: {
              formatter: (value: number) => formatCurrency(value),
              style: {
                colors: '#6b7280',
                fontSize: '11px'
              }
            }
          },
          {
            opposite: true,
            title: {
              text: 'Quantity',
              style: {
                color: '#6b7280',
                fontSize: '12px'
              }
            },
            labels: {
              formatter: (value: number) => formatNumber(value),
              style: {
                colors: '#6b7280',
                fontSize: '11px'
              }
            }
          }
        ],
        tooltip: {
          shared: true,
          intersect: false,
          y: {
            formatter: (value: number, { seriesIndex }: any) => {
              if (seriesIndex === 1) return formatNumber(value);
              return formatCurrency(value);
            }
          }
        },
        legend: {
          position: 'top',
          horizontalAlign: 'left',
          fontSize: '12px'
        },
        grid: {
          borderColor: '#f1f1f1',
          strokeDashArray: 3
        }
      }
    };
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Future Demand Forecast Chart */}
      <div className="xl:col-span-12 col-span-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <i className="ri-line-chart-line text-lg text-green-600"></i>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Future Demand Forecast</h3>
                  <p className="text-sm text-gray-500">Forecasted sales and quantity for upcoming months</p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6">
            <SafeChart
              options={getFutureForecastChart().options}
              series={getFutureForecastChart().series}
              type="line"
              height={350}
              chartTitle="Future Demand Forecast"
              fallbackMessage="No forecast data available"
            />
          </div>
        </div>
      </div>

      {/* Monthly Sales Performance */}
      <div className="xl:col-span-6 col-span-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <i className="ri-bar-chart-line text-lg text-green-600"></i>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Monthly Sales Performance</h3>
                  <p className="text-sm text-gray-500">Monthly NSV and quantity comparison</p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6">
            <SafeChart
              options={getMonthlySalesChart().options}
              series={getMonthlySalesChart().series}
              type="bar"
              height={350}
              chartTitle="Monthly Sales Performance"
              fallbackMessage="No monthly data available"
            />
          </div>
        </div>
      </div>

      {/* Store Performance - NSV */}
      <div className="xl:col-span-6 col-span-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <i className="ri-store-line text-lg text-purple-600"></i>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Store Performance - NSV</h3>
                  <p className="text-sm text-gray-500">Top stores by sales value</p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6">
            <SafeChart
              options={getStorePerformanceChart().options}
              series={getStorePerformanceChart().series}
              type="bar"
              height={350}
              chartTitle="Store Performance - NSV"
              fallbackMessage="No store data available"
            />
          </div>
        </div>
      </div>

      {/* Store Performance - Quantity */}
      <div className="xl:col-span-6 col-span-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                  <i className="ri-shopping-cart-line text-lg text-amber-600"></i>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Store Performance - Quantity</h3>
                  <p className="text-sm text-gray-500">Top stores by quantity sold</p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6">
            <SafeChart
              options={getStoreQuantityChart().options}
              series={getStoreQuantityChart().series}
              type="bar"
              height={350}
              chartTitle="Store Performance - Quantity"
              fallbackMessage="No store data available"
            />
          </div>
        </div>
      </div>

      {/* Replenishment Insights */}
      <div className="xl:col-span-6 col-span-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                  <i className="ri-refresh-line text-lg text-red-600"></i>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Replenishment Insights</h3>
                  <p className="text-sm text-gray-500">Store priority distribution for replenishment</p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6">
            <SafeChart
              options={getReplenishmentChart().options}
              series={getReplenishmentChart().series}
              type="donut"
              height={350}
              chartTitle="Replenishment Insights"
              fallbackMessage="No replenishment data available"
            />
          </div>
        </div>
      </div>

      {/* Sales Trend Analysis */}
      <div className="xl:col-span-12 col-span-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-50 rounded-lg flex items-center justify-center">
                  <i className="ri-area-chart-line text-lg text-cyan-600"></i>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Sales Trend Analysis</h3>
                  <p className="text-sm text-gray-500">Daily sales trends over the last 30 days</p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6">
            <SafeChart
              options={getSalesTrendChart().options}
              series={getSalesTrendChart().series}
              type="area"
              height={350}
              chartTitle="Sales Trend Analysis"
              fallbackMessage="No sales trend data available"
            />
          </div>
        </div>
      </div>
    </div>
  );
}; 