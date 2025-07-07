"use client"
import { ApexOptions } from "apexcharts";

// Chart configuration interfaces
interface ChartConfig {
  series: ApexOptions['series'];
  options: ApexOptions;
}

// Helper function to safely access properties
const safeGet = (obj: any, path: string, defaultValue: any = 0) => {
  return path.split('.').reduce((acc, part) => {
    return acc && acc[part] !== undefined ? acc[part] : defaultValue;
  }, obj);
};

// 1. Time-Based Sales Trends - Line Chart
export const getTimeBasedTrendsChart = (data: any[]): ChartConfig => {
  // Ensure data is valid
  if (!data || !Array.isArray(data) || data.length === 0) {
    return {
      series: [{ name: 'No Data', data: [0] }],
      options: {
        chart: { type: 'line', height: 350, toolbar: { show: false } },
        xaxis: { categories: ['No Data'] },
        yaxis: { title: { text: 'No Data Available' } },
        tooltip: { enabled: false },
        dataLabels: { enabled: false }
      }
    };
  }

  const dates = data.map(item => {
    const date = safeGet(item, 'date');
    return date ? new Date(date).toLocaleDateString() : 'Unknown';
  });
  const quantities = data.map(item => safeGet(item, 'totalQuantity', 0));
  const nsvValues = data.map(item => safeGet(item, 'totalNSV', 0));
  
  // Check if all values are zero (empty data)
  const isEmptyData = quantities.every(q => q === 0) && nsvValues.every(n => n === 0);

  return {
    series: [
      {
        name: 'Quantity',
        type: 'line',
        data: quantities
      },
      {
        name: 'NSV',
        type: 'line',
        data: nsvValues
      }
    ],
    options: {
      chart: {
        type: 'line',
        height: 350,
        toolbar: {
          show: true
        },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800
        }
      },
      stroke: {
        curve: 'smooth',
        width: [3, 3]
      },
      colors: ['#3b82f6', '#10b981'],
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'light',
          type: 'vertical',
          shadeIntensity: 0.1,
          gradientToColors: undefined,
          inverseColors: true,
          opacityFrom: 0.8,
          opacityTo: 0.2,
          stops: [0, 100]
        }
      },
      dataLabels: {
        enabled: false
      },
      grid: {
        borderColor: '#f1f1f1',
        strokeDashArray: 3
      },
      xaxis: {
        categories: dates,
        labels: {
          rotate: -45,
          style: {
            fontSize: '12px'
          }
        }
      },
      yaxis: [
        {
          title: {
            text: 'Quantity'
          }
        },
        {
          opposite: true,
          title: {
            text: 'NSV (₹)'
          }
        }
      ],
      legend: {
        position: 'top'
      },
      tooltip: {
        shared: true,
        intersect: false,
        y: {
          formatter: function (val: number, { seriesIndex }) {
            if (isEmptyData) {
              return seriesIndex === 0 ? 'No data available' : 'No data available';
            }
            return seriesIndex === 0 ? `${val.toLocaleString()} units` : `₹${val.toLocaleString()}`;
          }
        }
      },
      annotations: isEmptyData ? {
        yaxis: [{
          y: 0,
          borderColor: '#999',
          label: {
            borderColor: '#999',
            style: {
              color: '#666',
              background: '#f8f9fa'
            },
            text: 'No data available'
          }
        }]
      } : undefined
    }
  };
};

// 2. Product Performance - Vertical Bar Chart (for multiple series)
export const getProductPerformanceChart = (data: any[]): ChartConfig => {
  // Ensure data is valid
  if (!data || !Array.isArray(data) || data.length === 0) {
    return {
      series: [{ name: 'No Data', data: [0] }],
      options: {
        chart: { type: 'bar', height: 400, toolbar: { show: false } },
        xaxis: { categories: ['No Data'] },
        yaxis: { title: { text: 'No Data Available' } },
        tooltip: { enabled: false },
        dataLabels: { enabled: false }
      }
    };
  }

  const products = data.map(item => safeGet(item, 'productName', 'Unknown'));
  const quantities = data.map(item => safeGet(item, 'totalQuantity', 0));
  const nsvValues = data.map(item => safeGet(item, 'totalNSV', 0));

  return {
    series: [
      {
        name: 'Quantity',
        data: quantities
      },
      {
        name: 'NSV',
        data: nsvValues
      }
    ],
    options: {
      chart: {
        type: 'bar',
        height: 400,
        stacked: false,
        toolbar: {
          show: true
        }
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          endingShape: 'rounded'
        }
      },
      colors: ['#3b82f6', '#10b981'],
      dataLabels: {
        enabled: false
      },
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent']
      },
      xaxis: {
        categories: products,
        labels: {
          rotate: -45,
          style: {
            fontSize: '12px'
          }
        }
      },
      yaxis: [
        {
          title: {
            text: 'Quantity'
          }
        },
        {
          opposite: true,
          title: {
            text: 'NSV (₹)'
          }
        }
      ],
      fill: {
        opacity: 1
      },
      tooltip: {
        shared: false,
        y: {
          formatter: function (val: number, { seriesIndex }) {
            return seriesIndex === 0 ? `${val.toLocaleString()} units` : `₹${val.toLocaleString()}`;
          }
        }
      },
      legend: {
        position: 'top'
      }
    }
  };
};

// 2.5. Product Performance - Horizontal Bar Chart (Single Series)
export const getProductPerformanceHorizontalChart = (data: any[], metric: 'quantity' | 'nsv' = 'nsv'): ChartConfig => {
  // Ensure data is valid
  if (!data || !Array.isArray(data) || data.length === 0) {
    return {
      series: [{ name: 'No Data', data: [0] }],
      options: {
        chart: { type: 'bar', height: 400, toolbar: { show: false } },
        xaxis: { categories: ['No Data'] },
        yaxis: { title: { text: 'No Data Available' } },
        tooltip: { enabled: false },
        dataLabels: { enabled: false }
      }
    };
  }

  const products = data.map(item => safeGet(item, 'productName', 'Unknown'));
  const values = data.map(item => {
    const value = metric === 'quantity' ? safeGet(item, 'totalQuantity', 0) : safeGet(item, 'totalNSV', 0);
    return value || 0;
  });

  return {
    series: [
      {
        name: metric === 'quantity' ? 'Quantity' : 'NSV',
        data: values
      }
    ],
    options: {
      chart: {
        type: 'bar',
        height: 400,
        toolbar: {
          show: true
        }
      },
      plotOptions: {
        bar: {
          horizontal: true,
          dataLabels: {
            position: 'top'
          }
        }
      },
      colors: ['#3b82f6'],
      dataLabels: {
        enabled: true,
        formatter: function (val: number) {
          return metric === 'quantity' ? val.toLocaleString() : `₹${val.toLocaleString()}`;
        },
        style: {
          fontSize: '12px',
          colors: ['#fff']
        }
      },
      stroke: {
        width: 1,
        colors: ['#fff']
      },
      xaxis: {
        categories: products,
        labels: {
          formatter: function (val: number) {
            return val.toLocaleString();
          }
        }
      },
      yaxis: {
        title: {
          text: metric === 'quantity' ? 'Quantity' : 'NSV (₹)'
        }
      },
      tooltip: {
        y: {
          formatter: function (val: number) {
            return metric === 'quantity' ? `${val.toLocaleString()} units` : `₹${val.toLocaleString()}`;
          }
        }
      }
    }
  };
};

// 3. Store Performance - Bar Chart (Vertical for multiple series)
export const getStorePerformanceChart = (data: any[]): ChartConfig => {
  // Ensure data is valid
  if (!data || !Array.isArray(data) || data.length === 0) {
    return {
      series: [{ name: 'No Data', data: [0] }],
      options: {
        chart: { type: 'bar', height: 350, toolbar: { show: false } },
        xaxis: { categories: ['No Data'] },
        yaxis: { title: { text: 'No Data Available' } },
        tooltip: { enabled: false },
        dataLabels: { enabled: false }
      }
    };
  }

  const stores = data.map(item => safeGet(item, 'storeName', 'Unknown'));
  const nsvValues = data.map(item => safeGet(item, 'totalNSV', 0));
  const quantities = data.map(item => safeGet(item, 'totalQuantity', 0));

  return {
    series: [
      {
        name: 'NSV',
        data: nsvValues
      },
      {
        name: 'Quantity',
        data: quantities
      }
    ],
    options: {
      chart: {
        type: 'bar',
        height: 350,
        toolbar: {
          show: true
        }
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          endingShape: 'rounded'
        }
      },
      colors: ['#3b82f6', '#f59e0b'],
      dataLabels: {
        enabled: false
      },
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent']
      },
      xaxis: {
        categories: stores,
        labels: {
          rotate: -45,
          style: {
            fontSize: '12px'
          }
        }
      },
      yaxis: [
        {
          title: {
            text: 'NSV (₹)'
          }
        },
        {
          opposite: true,
          title: {
            text: 'Quantity'
          }
        }
      ],
      fill: {
        opacity: 1
      },
      tooltip: {
        y: {
          formatter: function (val: number, { seriesIndex }) {
            return seriesIndex === 0 ? `₹${val.toLocaleString()}` : `${val.toLocaleString()} units`;
          }
        }
      }
    }
  };
};

// 3.5. Store Performance - Horizontal Bar Chart (Single Series)
export const getStorePerformanceHorizontalChart = (data: any[], metric: 'nsv' | 'quantity' = 'nsv'): ChartConfig => {
  // Ensure data is valid
  if (!data || !Array.isArray(data) || data.length === 0) {
    return {
      series: [{ name: 'No Data', data: [0] }],
      options: {
        chart: { type: 'bar', height: 350, toolbar: { show: false } },
        xaxis: { categories: ['No Data'] },
        yaxis: { title: { text: 'No Data Available' } },
        tooltip: { enabled: false },
        dataLabels: { enabled: false }
      }
    };
  }

  const stores = data.map(item => safeGet(item, 'storeName', 'Unknown'));
  const values = data.map(item => {
    const value = metric === 'nsv' ? safeGet(item, 'totalNSV', 0) : safeGet(item, 'totalQuantity', 0);
    return value || 0;
  });

  return {
    series: [
      {
        name: metric === 'nsv' ? 'NSV' : 'Quantity',
        data: values
      }
    ],
    options: {
      chart: {
        type: 'bar',
        height: 350,
        toolbar: {
          show: true
        }
      },
      plotOptions: {
        bar: {
          horizontal: true,
          dataLabels: {
            position: 'top'
          }
        }
      },
      colors: ['#3b82f6'],
      dataLabels: {
        enabled: true,
        formatter: function (val: number) {
          return metric === 'nsv' ? `₹${val.toLocaleString()}` : val.toLocaleString();
        },
        style: {
          fontSize: '12px',
          colors: ['#fff']
        }
      },
      stroke: {
        width: 1,
        colors: ['#fff']
      },
      xaxis: {
        categories: stores,
        labels: {
          formatter: function (val: number) {
            return val.toLocaleString();
          }
        }
      },
      yaxis: {
        title: {
          text: metric === 'nsv' ? 'NSV (₹)' : 'Quantity'
        }
      },
      tooltip: {
        y: {
          formatter: function (val: number) {
            return metric === 'nsv' ? `₹${val.toLocaleString()}` : `${val.toLocaleString()} units`;
          }
        }
      }
    }
  };
};

// 4. Brand Performance - Donut Chart
export const getBrandPerformanceChart = (data: any[]): ChartConfig => {
  // Ensure data is valid
  if (!data || !Array.isArray(data) || data.length === 0) {
    return {
      series: [0],
      options: {
        chart: { type: 'donut', height: 350 },
        labels: ['No Data'],
        colors: ['#6b7280'],
        plotOptions: {
          pie: {
            donut: {
              size: '65%',
              labels: {
                show: true,
                name: { show: true, fontSize: '22px', fontWeight: 600 },
                value: { show: true, fontSize: '16px', fontWeight: 400 },
                total: { show: true, label: 'No Data', fontSize: '16px', fontWeight: 600 }
              }
            }
          }
        },
        dataLabels: { enabled: false },
        legend: { position: 'bottom' }
      }
    };
  }

  const brands = data.map(item => safeGet(item, 'brandName', 'Unknown'));
  const nsvValues = data.map(item => safeGet(item, 'totalNSV', 0));

  return {
    series: nsvValues,
    options: {
      chart: {
        type: 'donut',
        height: 350
      },
      labels: brands,
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '22px',
                fontFamily: 'Helvetica, Arial, sans-serif',
                fontWeight: 600,
                color: undefined,
                offsetY: -10
              },
              value: {
                show: true,
                fontSize: '16px',
                fontFamily: 'Helvetica, Arial, sans-serif',
                fontWeight: 400,
                color: undefined,
                offsetY: 16,
                formatter: function (val: number) {
                  return `₹${val.toLocaleString()}`;
                }
              },
              total: {
                show: true,
                label: 'Total NSV',
                fontSize: '16px',
                fontWeight: 600,
                formatter: function (w: any) {
                  return `₹${w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0).toLocaleString()}`;
                }
              }
            }
          }
        }
      },
      dataLabels: {
        enabled: true,
        formatter: function (val: number) {
          return `${val.toFixed(1)}%`;
        }
      },
      legend: {
        position: 'bottom'
      }
    }
  };
};

// 5. Discount Impact - Scatter Plot
export const getDiscountImpactChart = (data: any[]): ChartConfig => {
  // Ensure data is valid
  if (!data || !Array.isArray(data) || data.length === 0) {
    return {
      series: [{ name: 'No Data', data: [] }],
      options: {
        chart: { type: 'scatter', height: 350, zoom: { enabled: false } },
        xaxis: { title: { text: 'No Data Available' } },
        yaxis: { title: { text: 'No Data Available' } },
        tooltip: { enabled: false }
      }
    };
  }

  const scatterData = data.map(item => ({
    x: safeGet(item, 'avgDiscountPercentage', 0),
    y: safeGet(item, 'totalNSV', 0)
  })).filter(point => point.x !== 0 || point.y !== 0); // Filter out zero points

  return {
    series: [
      {
        name: 'Discount vs NSV',
        data: scatterData
      }
    ],
    options: {
      chart: {
        type: 'scatter',
        height: 350,
        zoom: {
          enabled: true
        }
      },
      colors: ['#3b82f6'],
      xaxis: {
        title: {
          text: 'Average Discount Percentage (%)'
        },
        type: 'numeric'
      },
      yaxis: {
        title: {
          text: 'Total NSV (₹)'
        }
      },
      tooltip: {
        shared: false,
        intersect: true,
        y: {
          formatter: function (val: number) {
            return `₹${val.toLocaleString()}`;
          }
        },
        x: {
          formatter: function (val: number) {
            return `${val.toFixed(2)}%`;
          }
        }
      }
    }
  };
};

// 6. Tax Analytics - Line Chart
export const getTaxAnalyticsChart = (data: any[]): ChartConfig => {
  // Ensure data is valid
  if (!data || !Array.isArray(data) || data.length === 0) {
    return {
      series: [{ name: 'No Data', data: [0] }],
      options: {
        chart: { type: 'line', height: 350, toolbar: { show: false } },
        xaxis: { categories: ['No Data'] },
        yaxis: { title: { text: 'No Data Available' } },
        tooltip: { enabled: false },
        dataLabels: { enabled: false }
      }
    };
  }

  const dates = data.map(item => {
    const date = safeGet(item, 'date');
    return date ? new Date(date).toLocaleDateString() : 'Unknown';
  });
  const taxValues = data.map(item => safeGet(item, 'totalTax', 0));

  return {
    series: [
      {
        name: 'Total Tax',
        data: taxValues
      }
    ],
    options: {
      chart: {
        type: 'line',
        height: 350,
        toolbar: {
          show: true
        }
      },
      stroke: {
        curve: 'smooth',
        width: 3
      },
      colors: ['#ef4444'],
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'light',
          type: 'vertical',
          shadeIntensity: 0.1,
          gradientToColors: undefined,
          inverseColors: true,
          opacityFrom: 0.8,
          opacityTo: 0.2,
          stops: [0, 100]
        }
      },
      dataLabels: {
        enabled: false
      },
      grid: {
        borderColor: '#f1f1f1',
        strokeDashArray: 3
      },
      xaxis: {
        categories: dates,
        labels: {
          rotate: -45,
          style: {
            fontSize: '12px'
          }
        }
      },
      yaxis: {
        title: {
          text: 'Total Tax (₹)'
        }
      },
      tooltip: {
        y: {
          formatter: function (val: number) {
            return `₹${val.toLocaleString()}`;
          }
        }
      }
    }
  };
};

// 7. MRP Distribution - Histogram
export const getMRPDistributionChart = (data: any[]): ChartConfig => {
  // Ensure data is valid
  if (!data || !Array.isArray(data) || data.length === 0) {
    return {
      series: [{ name: 'No Data', data: [0] }],
      options: {
        chart: { type: 'bar', height: 350, toolbar: { show: false } },
        xaxis: { categories: ['No Data'] },
        yaxis: { title: { text: 'No Data Available' } },
        tooltip: { enabled: false },
        dataLabels: { enabled: false }
      }
    };
  }

  const mrpRanges = data.map(item => {
    const id = safeGet(item, '_id');
    return id ? id.toString() : 'Unknown';
  });
  const counts = data.map(item => safeGet(item, 'count', 0));

  return {
    series: [
      {
        name: 'Product Count',
        data: counts
      }
    ],
    options: {
      chart: {
        type: 'bar',
        height: 350,
        toolbar: {
          show: true
        }
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '70%',
          endingShape: 'rounded'
        }
      },
      colors: ['#8b5cf6'],
      dataLabels: {
        enabled: true,
        formatter: function (val: number) {
          return val.toString();
        }
      },
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent']
      },
      xaxis: {
        categories: mrpRanges,
        title: {
          text: 'MRP Range (₹)'
        }
      },
      yaxis: {
        title: {
          text: 'Number of Products'
        }
      },
      fill: {
        opacity: 1
      },
      tooltip: {
        y: {
          formatter: function (val: number) {
            return `${val} products`;
          }
        }
      }
    }
  };
};

// 8. Monthly Sales Bar Chart
export const getMonthlySalesChart = (data: any[]): ChartConfig => {
  // Ensure data is valid
  if (!data || !Array.isArray(data) || data.length === 0) {
    return {
      series: [{ name: 'No Data', data: [0] }],
      options: {
        chart: { type: 'bar', height: 350, toolbar: { show: false } },
        xaxis: { categories: ['No Data'] },
        yaxis: { title: { text: 'No Data Available' } },
        tooltip: { enabled: false },
        dataLabels: { enabled: false }
      }
    };
  }

  // Group data by month
  const monthlyData = data.reduce((acc: any, item) => {
    const dateStr = safeGet(item, 'date');
    if (!dateStr) return acc;
    
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return acc;
      
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthKey,
          totalNSV: 0,
          totalGSV: 0,
          totalQuantity: 0
        };
      }
      
      acc[monthKey].totalNSV += safeGet(item, 'totalNSV', 0);
      acc[monthKey].totalGSV += safeGet(item, 'totalGSV', 0);
      acc[monthKey].totalQuantity += safeGet(item, 'totalQuantity', 0);
    } catch (error) {
      console.error('Error processing date:', dateStr, error);
    }
    
    return acc;
  }, {});

  const months = Object.keys(monthlyData).sort();
  const nsvValues = months.map(month => monthlyData[month].totalNSV);
  const gsvValues = months.map(month => monthlyData[month].totalGSV);

  return {
    series: [
      {
        name: 'NSV',
        data: nsvValues
      },
      {
        name: 'GSV',
        data: gsvValues
      }
    ],
    options: {
      chart: {
        type: 'bar',
        height: 350,
        toolbar: {
          show: true
        }
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          endingShape: 'rounded'
        }
      },
      colors: ['#3b82f6', '#10b981'],
      dataLabels: {
        enabled: false
      },
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent']
      },
      xaxis: {
        categories: months.map(month => {
          try {
            const [year, monthNum] = month.split('-');
            return new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short' 
            });
          } catch (error) {
            return month;
          }
        })
      },
      yaxis: {
        title: {
          text: 'Sales Value (₹)'
        }
      },
      fill: {
        opacity: 1
      },
      tooltip: {
        shared: false,
        y: {
          formatter: function (val: number, { seriesIndex }) {
            return seriesIndex === 0 ? `₹${val.toLocaleString()}` : `₹${val.toLocaleString()}`;
          }
        }
      },
      legend: {
        position: 'top'
      }
    }
  };
}; 