"use client"
import { ApexOptions } from "apexcharts";

// Chart configuration interfaces
interface ChartConfig {
  series: ApexOptions['series'];
  options: ApexOptions;
}

// Helper function to safely access properties with enhanced validation
const safeGet = (obj: any, path: string, defaultValue: any = 0) => {
  if (!obj || typeof obj !== 'object') {
    return defaultValue;
  }
  
  const result = path.split('.').reduce((acc, part) => {
    if (acc === null || acc === undefined) {
      return defaultValue;
    }
    return acc[part] !== undefined ? acc[part] : defaultValue;
  }, obj);
  
  // Additional validation for numeric values
  if (typeof result === 'number' && (isNaN(result) || !isFinite(result))) {
    return defaultValue;
  }
  
  // Handle empty strings for string fields
  if (typeof result === 'string' && result.trim() === '') {
    return defaultValue === 0 ? 'Unknown' : defaultValue;
  }
  
  return result;
};

// Enhanced safe number conversion
const safeNumber = (value: any, defaultValue: number = 0): number => {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  
  const num = typeof value === 'number' ? value : parseFloat(value);
  return isNaN(num) || !isFinite(num) ? defaultValue : num;
};

// Enhanced safe string conversion
const safeString = (value: any, defaultValue: string = 'Unknown'): string => {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  
  const str = String(value).trim();
  return str === '' ? defaultValue : str;
};

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

  // Safely extract and validate data
  const dates = data.map(item => {
    const date = safeGet(item, 'date');
    if (!date) return 'Unknown';
    
    try {
      const dateObj = new Date(date);
      return isNaN(dateObj.getTime()) ? 'Unknown' : dateObj.toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  });
  
  const quantities = data.map(item => safeNumber(safeGet(item, 'totalQuantity'), 0));
  const nsvValues = data.map(item => safeNumber(safeGet(item, 'totalNSV'), 0));
  
  // Check if all values are zero (empty data)
  const isEmptyData = quantities.every(q => q === 0) && nsvValues.every(n => n === 0);

  // Ensure we have valid series data
  const series = [
    {
      name: 'Quantity',
      type: 'line' as const,
      data: quantities.map(q => safeNumber(q, 0))
    },
    {
      name: 'NSV',
      type: 'line' as const,
      data: nsvValues.map(n => safeNumber(n, 0))
    }
  ];

  return {
    series,
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
          },
          formatter: function(val: number) {
            return formatNumber(val);
          }
        }
      },
      yaxis: [
        {
          title: {
            text: 'Quantity'
          },
          labels: {
            formatter: function(val: number) {
              return formatNumber(val);
            }
          }
        },
        {
          opposite: true,
          title: {
            text: 'NSV (₹)'
          },
          labels: {
            formatter: function(val: number) {
              return formatCurrency(val);
            }
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
            const safeVal = safeNumber(val, 0);
            return seriesIndex === 0 ? `${formatNumber(safeVal)} units` : formatCurrency(safeVal);
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
          },
          labels: {
            formatter: function(val: number) {
              return formatNumber(val);
            }
          }
        },
        {
          opposite: true,
          title: {
            text: 'NSV (₹)'
          },
          labels: {
            formatter: function(val: number) {
              return formatCurrency(val);
            }
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
            return seriesIndex === 0 ? `${formatNumber(val)} units` : formatCurrency(val);
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
          return metric === 'quantity' ? formatNumber(val) : formatCurrency(val);
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
            return formatNumber(val);
          }
        }
      },
      yaxis: {
        title: {
          text: metric === 'quantity' ? 'Quantity' : 'NSV (₹)'
        },
        labels: {
          formatter: function(val: number) {
            return formatCurrency(val);
          }
        }
      },
      tooltip: {
        y: {
          formatter: function (val: number) {
            return metric === 'quantity' ? `${formatNumber(val)} units` : formatCurrency(val);
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
          },
          labels: {
            formatter: function(val: number) {
              return formatCurrency(val);
            }
          }
        },
        {
          opposite: true,
          title: {
            text: 'Quantity'
          },
          labels: {
            formatter: function(val: number) {
              return formatNumber(val);
            }
          }
        }
      ],
      fill: {
        opacity: 1
      },
      tooltip: {
        y: {
          formatter: function (val: number, { seriesIndex }) {
            return seriesIndex === 0 ? formatCurrency(val) : `${formatNumber(val)} units`;
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

  // Sort data by NSV/Quantity and take top 8 stores to avoid clutter
  const sortedData = [...data].sort((a, b) => {
    const aValue = metric === 'nsv' ? safeGet(a, 'totalNSV', 0) : safeGet(a, 'totalQuantity', 0);
    const bValue = metric === 'nsv' ? safeGet(b, 'totalNSV', 0) : safeGet(b, 'totalQuantity', 0);
    return bValue - aValue; // Sort in descending order
  }).slice(0, 8); // Limit to top 8 stores

  const stores = sortedData.map(item => {
    const storeName = safeGet(item, 'storeName', 'Unknown');
    // Truncate long store names to keep chart clean
    return storeName.length > 20 ? storeName.substring(0, 20) + '...' : storeName;
  });
  const values = sortedData.map(item => {
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
          barHeight: '60%',
          distributed: false,
          dataLabels: {
            position: 'center'
          }
        }
      },
      colors: ['#10b981'],
      dataLabels: {
        enabled: true,
        formatter: function (val: number) {
          return metric === 'nsv' ? formatCurrency(val) : formatNumber(val);
        },
        style: {
          fontSize: '10px',
          fontFamily: 'Helvetica, Arial, sans-serif',
          fontWeight: 'bold',
          colors: ['#fff']
        },
        offsetX: 0,
        offsetY: 0
      },
      stroke: {
        width: 0,
        colors: ['#fff']
      },
      fill: {
        opacity: 1
      },
      xaxis: {
        categories: stores,
        labels: {
          style: {
            fontSize: '12px',
            fontFamily: 'Helvetica, Arial, sans-serif'
          },
          formatter: function (val: number) {
            return formatNumber(val);
          }
        }
      },
      yaxis: {
        title: {
          text: metric === 'nsv' ? 'NSV (₹)' : 'Quantity',
          style: {
            fontSize: '14px',
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontWeight: 600
          }
        },
        labels: {
          style: {
            fontSize: '11px',
            fontFamily: 'Helvetica, Arial, sans-serif'
          },
          maxWidth: 120,
          trim: true,
          trimAmount: 0,
          formatter: function(val: number) {
            return metric === 'nsv' ? formatCurrency(val) : formatNumber(val);
          }
        }
      },
      tooltip: {
        enabled: true,
        theme: 'light',
        y: {
          formatter: function (val: number) {
            return metric === 'nsv' ? formatCurrency(val) : `${formatNumber(val)} units`;
          }
        }
      },
      grid: {
        borderColor: '#f1f1f1',
        strokeDashArray: 3,
        xaxis: {
          lines: {
            show: true
          }
        },
        yaxis: {
          lines: {
            show: false
          }
        }
      }
    }
  };
};

// 4. Brand Performance - Multiple Chart Types (Bar, Pie, Line)
export const getBrandPerformanceChart = (data: any[]): ChartConfig => {
  // Debug logging for brand performance data
  console.log('=== BRAND PERFORMANCE DATA DEBUG ===');
  console.log('Raw data received:', data);
  console.log('Data type:', typeof data);
  console.log('Is array:', Array.isArray(data));
  console.log('Data length:', data?.length);
  
  if (data && Array.isArray(data) && data.length > 0) {
    console.log('First 3 items:', data.slice(0, 3));
    console.log('Sample brand names:', data.slice(0, 3).map(item => safeGet(item, 'brandName', 'Unknown')));
    console.log('Sample NSV values:', data.slice(0, 3).map(item => safeGet(item, 'totalNSV', 0)));
  }
  console.log('=== END BRAND PERFORMANCE DEBUG ===');

  // Ensure data is valid
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.log('Brand Performance: No valid data, returning empty chart');
    return {
      series: [{ name: 'No Data', data: [0] }],
      options: {
        chart: { 
          type: 'bar', 
          height: 350,
          toolbar: { show: false }
        },
        xaxis: { categories: ['No Data'] },
        yaxis: { title: { text: 'No Data Available' } },
        tooltip: { enabled: false },
        dataLabels: { enabled: false },
        noData: {
          text: 'No brand performance data available',
          align: 'center',
          verticalAlign: 'middle',
          offsetX: 0,
          offsetY: 0,
          style: {
            color: '#6b7280',
            fontSize: '16px',
            fontFamily: 'Helvetica, Arial, sans-serif'
          }
        }
      }
    };
  }

  // Sort data by NSV and take top 6 brands to avoid clutter
  const sortedData = [...data].sort((a, b) => {
    const aValue = safeGet(a, 'totalNSV', 0);
    const bValue = safeGet(b, 'totalNSV', 0);
    return bValue - aValue; // Sort in descending order
  }).slice(0, 6); // Limit to top 6 brands

  console.log('Sorted data (top 6):', sortedData);
  console.log('Sorted data length:', sortedData.length);

  const brands = sortedData.map(item => {
    const brandName = safeGet(item, 'brandName', 'Unknown');
    // Truncate long brand names
    return brandName.length > 15 ? brandName.substring(0, 15) + '...' : brandName;
  });
  const nsvValues = sortedData.map(item => safeGet(item, 'totalNSV', 0));

  console.log('Brand names:', brands);
  console.log('NSV values:', nsvValues);

  // Try different chart types based on data characteristics
  const totalNSV = nsvValues.reduce((sum, val) => sum + val, 0);
  const hasValidData = nsvValues.some(val => val > 0);

  if (!hasValidData) {
    // If no valid data, show pie chart with "No Data" message
    return {
      series: [100],
      options: {
        chart: {
          type: 'pie',
          height: 350,
          toolbar: { show: false }
        },
        labels: ['No Data Available'],
        colors: ['#6b7280'],
        plotOptions: {
          pie: {
            donut: {
              size: '65%',
              labels: {
                show: true,
                name: {
                  show: true,
                  fontSize: '18px',
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
                  label: 'No Data',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#374151'
                }
              }
            }
          }
        },
        dataLabels: { enabled: false },
        legend: { position: 'bottom' }
      }
    };
  }

  // If we have valid data, use a vertical bar chart (more reliable than horizontal)
  return {
    series: [
      {
        name: 'NSV',
        data: nsvValues
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
          columnWidth: '60%',
          dataLabels: {
            position: 'top'
          }
        }
      },
      colors: ['#f59e0b'],
      dataLabels: {
        enabled: true,
        formatter: function (val: number) {
          return formatCurrency(val);
        },
        style: {
          fontSize: '11px',
          fontFamily: 'Helvetica, Arial, sans-serif',
          fontWeight: 'bold',
          colors: ['#fff']
        },
        offsetY: -5
      },
      stroke: {
        width: 0,
        colors: ['#fff']
      },
      fill: {
        opacity: 1
      },
      xaxis: {
        categories: brands,
        labels: {
          style: {
            fontSize: '12px',
            fontFamily: 'Helvetica, Arial, sans-serif'
          },
          rotate: -45,
          rotateAlways: false
        }
      },
      yaxis: {
        title: {
          text: 'NSV (₹)',
          style: {
            fontSize: '14px',
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontWeight: 600
          }
        },
        labels: {
          style: {
            fontSize: '12px',
            fontFamily: 'Helvetica, Arial, sans-serif'
          },
          formatter: function(val: number) {
            return formatCurrency(val);
          }
        }
      },
      tooltip: {
        enabled: true,
        theme: 'light',
        y: {
          formatter: function (val: number) {
            const percentage = totalNSV > 0 ? ((val / totalNSV) * 100).toFixed(1) : '0.0';
            return `${formatCurrency(val)} (${percentage}%)`;
          }
        }
      },
      grid: {
        borderColor: '#f1f1f1',
        strokeDashArray: 3,
        xaxis: {
          lines: {
            show: false
          }
        },
        yaxis: {
          lines: {
            show: true
          }
        }
      },
      noData: {
        text: 'No brand performance data available',
        align: 'center',
        verticalAlign: 'middle',
        offsetX: 0,
        offsetY: 0,
        style: {
          color: '#6b7280',
          fontSize: '16px',
          fontFamily: 'Helvetica, Arial, sans-serif'
        }
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
            return formatCurrency(val);
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
        },
        labels: {
          formatter: function(val: number) {
            return formatCurrency(val);
          }
        }
      },
      tooltip: {
        y: {
          formatter: function (val: number) {
            return formatCurrency(val);
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
        },
        labels: {
          formatter: function(val: number) {
            return formatNumber(val);
          }
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
        }),
        labels: {
          formatter: function(val: number) {
            return formatNumber(val);
          }
        }
      },
      yaxis: {
        title: {
          text: 'Sales Value (₹)'
        },
        labels: {
          formatter: function(val: number) {
            return formatCurrency(val);
          }
        }
      },
      fill: {
        opacity: 1
      },
      tooltip: {
        shared: false,
        y: {
          formatter: function (val: number, { seriesIndex }) {
            return formatCurrency(val);
          }
        }
      },
      legend: {
        position: 'top'
      }
    }
  };
};