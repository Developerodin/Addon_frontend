import { ApexOptions } from 'apexcharts';

// Utility functions for ApexCharts data validation and debugging

export interface ChartValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates chart data to prevent ApexCharts errors
 */
export const validateChartData = (data: any[], chartName: string): ChartValidationResult => {
  const result: ChartValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (!data || !Array.isArray(data)) {
    result.isValid = false;
    result.errors.push(`Invalid data structure for ${chartName}: data is not an array`);
    return result;
  }

  if (data.length === 0) {
    result.warnings.push(`Empty data array for ${chartName}`);
    return result;
  }

  // Check each data item
  data.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      result.isValid = false;
      result.errors.push(`Invalid item at index ${index} for ${chartName}: not an object`);
      return;
    }

    // Check for undefined/null values that could cause toString() errors
    Object.keys(item).forEach(key => {
      const value = item[key];
      if (value === undefined) {
        result.errors.push(`Undefined value for key '${key}' at index ${index} in ${chartName}`);
      } else if (value === null) {
        result.errors.push(`Null value for key '${key}' at index ${index} in ${chartName}`);
      } else if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
        result.errors.push(`Invalid number for key '${key}' at index ${index} in ${chartName}: ${value}`);
      }
    });
  });

  return result;
};

/**
 * Sanitizes chart data to prevent ApexCharts errors
 */
export const sanitizeChartData = (data: any[], chartName: string): any[] => {
  if (!data || !Array.isArray(data)) {
    console.warn(`Invalid data for ${chartName}, returning empty array`);
    return [];
  }

  return data.map((item, index) => {
    if (!item || typeof item !== 'object') {
      console.warn(`Invalid item at index ${index} for ${chartName}, using empty object`);
      return {};
    }

    const sanitized: any = {};
    Object.keys(item).forEach(key => {
      const value = item[key];
      
      if (value === undefined || value === null) {
        sanitized[key] = 0; // Default to 0 for numeric fields
      } else if (typeof value === 'string' && value.trim() === '') {
        sanitized[key] = 'Unknown'; // Default for empty strings
      } else if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
        sanitized[key] = 0; // Default for invalid numbers
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  });
};

/**
 * Validates ApexCharts configuration
 */
export const validateChartConfig = (config: any, chartName: string): ChartValidationResult => {
  const result: ChartValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (!config) {
    result.isValid = false;
    result.errors.push(`No configuration provided for ${chartName}`);
    return result;
  }

  if (!config.series || !Array.isArray(config.series)) {
    result.isValid = false;
    result.errors.push(`Invalid series configuration for ${chartName}`);
    return result;
  }

  if (!config.options || typeof config.options !== 'object') {
    result.isValid = false;
    result.errors.push(`Invalid options configuration for ${chartName}`);
    return result;
  }

  // Validate series data
  config.series.forEach((series: any, index: number) => {
    if (!series || typeof series !== 'object') {
      result.isValid = false;
      result.errors.push(`Invalid series at index ${index} for ${chartName}`);
      return;
    }

    if (!series.name) {
      result.warnings.push(`Series at index ${index} for ${chartName} has no name`);
    }

    if (!Array.isArray(series.data)) {
      result.isValid = false;
      result.errors.push(`Invalid series data at index ${index} for ${chartName}`);
      return;
    }

    // Check for undefined/null values in series data
    series.data.forEach((value: any, dataIndex: number) => {
      if (value === undefined) {
        result.errors.push(`Undefined value at data index ${dataIndex} in series ${index} for ${chartName}`);
      } else if (value === null) {
        result.errors.push(`Null value at data index ${dataIndex} in series ${index} for ${chartName}`);
      } else if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
        result.errors.push(`Invalid number at data index ${dataIndex} in series ${index} for ${chartName}: ${value}`);
      }
    });
  });

  return result;
};

/**
 * Creates a safe fallback chart configuration
 */
export const createSafeChartConfig = (chartType: string, height: number = 350): any => {
  return {
    series: [{
      name: 'No Data',
      data: [0]
    }],
    options: {
      chart: {
        type: chartType,
        height: height,
        toolbar: { show: false }
      },
      xaxis: {
        categories: ['No Data']
      },
      yaxis: {
        title: { text: 'No Data Available' }
      },
      tooltip: {
        enabled: false
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'smooth',
        width: 2
      },
      colors: ['#6b7280'],
      grid: {
        borderColor: '#f1f1f1',
        strokeDashArray: 3
      }
    }
  };
};

/**
 * Debug function to log chart data issues
 */
export const debugChartData = (data: any[], chartName: string): void => {
  console.group(`Chart Debug: ${chartName}`);
  console.log('Data length:', data?.length);
  console.log('Data type:', typeof data);
  console.log('Is array:', Array.isArray(data));
  
  if (data && Array.isArray(data) && data.length > 0) {
    console.log('First item:', data[0]);
    console.log('Last item:', data[data.length - 1]);
    
    // Check for problematic values
    data.forEach((item, index) => {
      if (item && typeof item === 'object') {
        Object.keys(item).forEach(key => {
          const value = item[key];
          if (value === undefined || value === null) {
            console.warn(`Problematic value at index ${index}, key '${key}':`, value);
          }
        });
      }
    });
  }
  
  console.groupEnd();
}; 