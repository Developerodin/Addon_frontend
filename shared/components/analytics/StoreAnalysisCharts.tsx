import React from 'react';
import SafeChart from '@/shared/components/SafeChart';

interface StoreAnalysisChartsProps {
  monthlySalesAnalysis: any[];
  productSalesAnalysis: any[];
  forecastData: any;
  replenishmentData: any;
  salesEntries: any[];
}

/**
 * Store Analysis Charts Component
 * Displays comprehensive analytics for store performance including:
 * - Monthly Sales Performance
 * - Product Performance Distribution
 * - Future Demand Forecast
 * - Replenishment Insights
 * - Sales Trend Analysis
 */
export const StoreAnalysisCharts: React.FC<StoreAnalysisChartsProps> = ({
  monthlySalesAnalysis,
  productSalesAnalysis,
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

  // 1. Monthly Sales Performance Chart
  const getMonthlySalesChart = () => {
    const months = monthlySalesAnalysis.map(item => formatMonth(item.month));
    const nsvData = monthlySalesAnalysis.map(item => item.totalNSV || 0);
    const quantityData = monthlySalesAnalysis.map(item => item.totalQuantity || 0);
    const ordersData = monthlySalesAnalysis.map(item => item.totalOrders || 0);

    return {
      series: [
        {
          name: 'NSV',
          type: 'column',
          data: nsvData,
          color: '#3b82f6'
        },
        {
          name: 'Quantity',
          type: 'line',
          data: quantityData,
          color: '#10b981'
        },
        {
          name: 'Orders',
          type: 'line',
          data: ordersData,
          color: '#f59e0b'
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
          width: [0, 3, 3]
        },
        colors: ['#3b82f6', '#10b981', '#f59e0b'],
        fill: {
          opacity: [1, 1, 1]
        },
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
            }
          },
          {
            opposite: true,
            title: {
              text: 'Quantity & Orders',
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
            min: 0
          }
        ],
        tooltip: {
          shared: true,
          intersect: false,
          y: {
            formatter: function(value: number, { seriesIndex }: any) {
              if (seriesIndex === 0) return formatCurrency(value);
              return formatNumber(value);
            }
          }
        },
        legend: {
          position: 'top',
          horizontalAlign: 'left',
          fontSize: '14px',
          markers: {
            radius: 12
          }
        },
        dataLabels: {
          enabled: false
        },
        grid: {
          borderColor: '#e5e7eb',
          strokeDashArray: 4
        }
      }
    };
  };

  // 2. Product Performance Chart (Top 10 Products by NSV)
  const getProductPerformanceChart = () => {
    const topProducts = productSalesAnalysis
      .sort((a, b) => (b.totalNSV || 0) - (a.totalNSV || 0))
      .slice(0, 10);

    const productNames = topProducts.map(item => item.productName);
    const nsvData = topProducts.map(item => item.totalNSV || 0);
    const quantityData = topProducts.map(item => item.totalQuantity || 0);

    return {
      series: [
        {
          name: 'NSV',
          data: nsvData,
          color: '#8b5cf6'
        },
        {
          name: 'Quantity',
          data: quantityData,
          color: '#06b6d4'
        }
      ],
      options: {
        chart: {
          type: 'bar',
          height: 400,
          toolbar: { show: false },
          stacked: false,
          animations: {
            enabled: true,
            easing: 'easeinout',
            speed: 800
          }
        },
        colors: ['#8b5cf6', '#06b6d4'],
        plotOptions: {
          bar: {
            horizontal: false,
            dataLabels: {
              position: 'top'
            },
            borderRadius: 4
          }
        },
        dataLabels: {
          enabled: true,
          formatter: function(value: number, { seriesIndex }: any) {
            if (seriesIndex === 0) return formatCurrency(value);
            return formatNumber(value);
          },
          style: {
            fontSize: '11px',
            colors: ['#fff']
          }
        },
        xaxis: {
          categories: productNames,
          labels: {
            style: {
              colors: '#6b7280',
              fontSize: '11px'
            },
            rotate: -45,
            rotateAlways: false
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
            formatter: function(value: number, { seriesIndex }: any) {
              if (seriesIndex === 0) return formatCurrency(value);
              return formatNumber(value);
            }
          }
        },
        legend: {
          position: 'top',
          horizontalAlign: 'left',
          fontSize: '14px'
        },
        grid: {
          borderColor: '#e5e7eb',
          strokeDashArray: 4
        }
      }
    };
  };

  // 3. Future Demand Forecast Chart
  const getFutureForecastChart = () => {
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

    const maxNSV = Math.max(...forecastedNSV, 1);
    const maxQuantity = Math.max(...forecastedQuantity, 1);

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
            min: 0,
            max: maxQuantity * 1.1
          }
        ],
        tooltip: {
          shared: true,
          intersect: false,
          y: {
            formatter: function(value: number, { seriesIndex }: any) {
              if (seriesIndex === 0) return formatCurrency(value);
              return formatNumber(value);
            }
          }
        },
        legend: {
          position: 'top',
          horizontalAlign: 'left',
          fontSize: '14px'
        },
        dataLabels: {
          enabled: false
        },
        grid: {
          borderColor: '#e5e7eb',
          strokeDashArray: 4
        }
      }
    };
  };

  // 4. Replenishment Insights Chart
  const getReplenishmentChart = () => {
    if (!replenishmentData?.recommendations || replenishmentData.recommendations.length === 0) {
      return {
        series: [0],
        options: {
          chart: {
            type: 'donut',
            height: 300,
            toolbar: { show: false }
          },
          labels: ['No Data'],
          colors: ['#e5e7eb'],
          plotOptions: {
            pie: {
              donut: {
                size: '70%',
                labels: {
                  show: true,
                  name: {
                    show: true,
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#374151'
                  },
                  value: {
                    show: true,
                    fontSize: '14px',
                    fontWeight: 400,
                    color: '#6b7280'
                  },
                  total: {
                    show: true,
                    label: 'Total',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#374151'
                  }
                }
              }
            }
          },
          legend: {
            position: 'bottom',
            fontSize: '12px'
          }
        }
      };
    }

    const recommendations = replenishmentData.recommendations;
    const highPriority = recommendations.filter((item: any) => item.priority === 'High').length;
    const mediumPriority = recommendations.filter((item: any) => item.priority === 'Medium').length;
    const lowPriority = recommendations.filter((item: any) => item.priority === 'Low').length;

    const total = highPriority + mediumPriority + lowPriority;
    const highPercentage = total > 0 ? Math.round((highPriority / total) * 100) : 0;
    const mediumPercentage = total > 0 ? Math.round((mediumPriority / total) * 100) : 0;
    const lowPercentage = total > 0 ? Math.round((lowPriority / total) * 100) : 0;

    // Debug logging to help identify issues
    console.log('Replenishment Chart Data:', {
      total,
      highPriority,
      mediumPriority,
      lowPriority,
      highPercentage,
      mediumPercentage,
      lowPercentage,
      percentagesSum: highPercentage + mediumPercentage + lowPercentage
    });

    return {
      series: [highPriority, mediumPriority, lowPriority],
      options: {
        chart: {
          type: 'donut',
          height: 300,
          toolbar: { show: false }
        },
        labels: [
          `High Priority (${highPercentage}%)`,
          `Medium Priority (${mediumPercentage}%)`,
          `Low Priority (${lowPercentage}%)`
        ],
        colors: ['#ef4444', '#f59e0b', '#10b981'],
        plotOptions: {
          pie: {
            donut: {
              size: '70%',
              labels: {
                show: true,
                name: {
                  show: true,
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#374151'
                },
                value: {
                  show: true,
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#374151',
                  formatter: function(value: number) {
                    return `${value} items`;
                  }
                },
                total: {
                  show: true,
                  label: 'Total Items',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#374151',
                  formatter: function() {
                    return total.toString();
                  }
                }
              }
            }
          }
        },
        legend: {
          position: 'bottom',
          fontSize: '12px',
          markers: {
            radius: 12
          }
        },
        tooltip: {
          y: {
            formatter: function(value: number, opts: any) {
              const percentages = [highPercentage, mediumPercentage, lowPercentage];
              const percentage = percentages[opts.seriesIndex] || 0;
              return `${value} items (${percentage}%)`;
            }
          }
        },
        dataLabels: {
          enabled: true,
          formatter: function(value: number, opts: any) {
            const percentages = [highPercentage, mediumPercentage, lowPercentage];
            const percentage = percentages[opts.seriesIndex] || 0;
            return `${percentage}%`;
          },
          style: {
            fontSize: '12px',
            fontWeight: 600,
            colors: ['#fff']
          }
        }
      }
    };
  };

  // 5. Sales Trend Analysis Chart
  const getSalesTrendChart = () => {
    // Group sales entries by date
    const salesByDate = salesEntries.reduce((acc: any, entry: any) => {
      const date = new Date(entry.date).toLocaleDateString('en-IN', {
        year: 'numeric',
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

    // Sort by date and take last 30 entries
    const sortedDates = Object.keys(salesByDate)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .slice(-30);

    const dates = sortedDates;
    const nsvData = sortedDates.map(date => salesByDate[date].nsv);
    const quantityData = sortedDates.map(date => salesByDate[date].quantity);
    const transactionCount = sortedDates.map(date => salesByDate[date].count);

    return {
      series: [
        {
          name: 'Daily NSV',
          type: 'area',
          data: nsvData,
          color: '#3b82f6'
        },
        {
          name: 'Daily Quantity',
          type: 'line',
          data: quantityData,
          color: '#10b981'
        },
        {
          name: 'Transactions',
          type: 'line',
          data: transactionCount,
          color: '#f59e0b'
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
          width: [3, 2, 2]
        },
        colors: ['#3b82f6', '#10b981', '#f59e0b'],
        fill: {
          type: 'gradient',
          gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.7,
            opacityTo: 0.1,
            stops: [0, 100]
          }
        },
        xaxis: {
          categories: dates,
          labels: {
            style: {
              colors: '#6b7280',
              fontSize: '11px'
            },
            rotate: -45,
            rotateAlways: false
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
              text: 'Quantity & Transactions',
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
            min: 0
          }
        ],
        tooltip: {
          shared: true,
          intersect: false,
          y: {
            formatter: function(value: number, { seriesIndex }: any) {
              if (seriesIndex === 0) return formatCurrency(value);
              return formatNumber(value);
            }
          }
        },
        legend: {
          position: 'top',
          horizontalAlign: 'left',
          fontSize: '14px'
        },
        dataLabels: {
          enabled: false
        },
        grid: {
          borderColor: '#e5e7eb',
          strokeDashArray: 4
        }
      }
    };
  };

  return (
    <div className="space-y-6">
      {/* Monthly Sales Performance */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Monthly Sales Performance</h3>
            <p className="text-sm text-gray-600 mt-1">Monthly sales trends with NSV, quantity, and orders</p>
          </div>
        </div>
        <SafeChart
          options={getMonthlySalesChart().options}
          series={getMonthlySalesChart().series}
          type="line"
          height={350}
        />
      </div>

      {/* Product Performance */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Top Products Performance</h3>
            <p className="text-sm text-gray-600 mt-1">Top 10 products by sales value and quantity</p>
          </div>
        </div>
        <SafeChart
          options={getProductPerformanceChart().options}
          series={getProductPerformanceChart().series}
          type="bar"
          height={400}
        />
      </div>

      {/* Future Demand Forecast */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Future Demand Forecast</h3>
            <p className="text-sm text-gray-600 mt-1">Predicted sales and quantity for upcoming months</p>
          </div>
        </div>
        <SafeChart
          options={getFutureForecastChart().options}
          series={getFutureForecastChart().series}
          type="line"
          height={350}
        />
      </div>

      {/* Replenishment Insights */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Replenishment Insights</h3>
            <p className="text-sm text-gray-600 mt-1">Priority distribution for stock replenishment</p>
          </div>
        </div>
        <SafeChart
          options={getReplenishmentChart().options}
          series={getReplenishmentChart().series}
          type="donut"
          height={300}
        />
      </div>

      {/* Sales Trend Analysis */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Sales Trend Analysis</h3>
            <p className="text-sm text-gray-600 mt-1">Daily sales patterns and transaction trends</p>
          </div>
        </div>
        <SafeChart
          options={getSalesTrendChart().options}
          series={getSalesTrendChart().series}
          type="line"
          height={350}
        />
      </div>
    </div>
  );
}; 