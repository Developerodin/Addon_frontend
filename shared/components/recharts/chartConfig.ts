/**
 * Chart Configuration for Production Dashboard
 * Centralized design tokens, colors, and animation settings
 */

export const CHART_COLORS = {
  // Primary palette (purple-based to match app theme)
  primary: ['#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95'],
  
  // Semantic colors
  success: ['#10b981', '#059669', '#047857', '#065f46', '#064e3b'],
  warning: ['#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'],
  danger: ['#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'],
  info: ['#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'],
  
  // Quality metrics (M1-M4)
  quality: {
    m1: '#10b981', // Green - Good
    m2: '#f59e0b', // Amber - Repair  
    m3: '#6366f1', // Indigo - Seconds
    m4: '#ef4444', // Red - Reject
  },
  
  // Floor heatmap colors
  heatmap: {
    low: '#10b981',    // Green < 1 day backlog
    medium: '#f59e0b', // Amber 1-3 days
    high: '#ef4444',   // Red > 3 days
    critical: '#991b1b' // Dark red > 7 days
  },
  
  // Neutral grays
  gray: ['#f9fafb', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937'],
  
  // Chart-specific
  area: {
    fill: 'rgba(139, 92, 246, 0.1)',
    stroke: '#8b5cf6'
  },
  
  // Multi-series colors
  series: ['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#ec4899', '#14b8a6', '#f97316']
};

export const CHART_GRADIENTS = {
  primary: {
    id: 'primaryGradient',
    colors: [
      { offset: '0%', color: '#8b5cf6', opacity: 0.8 },
      { offset: '100%', color: '#8b5cf6', opacity: 0.1 }
    ]
  },
  success: {
    id: 'successGradient',
    colors: [
      { offset: '0%', color: '#10b981', opacity: 0.8 },
      { offset: '100%', color: '#10b981', opacity: 0.1 }
    ]
  },
  danger: {
    id: 'dangerGradient',
    colors: [
      { offset: '0%', color: '#ef4444', opacity: 0.8 },
      { offset: '100%', color: '#ef4444', opacity: 0.1 }
    ]
  }
};

/**
 * Animation configuration
 * Disabled by default for performance (10+ charts on dashboard)
 */
export const ANIMATION_CONFIG = {
  enabled: false,
  duration: 300,
  easing: 'ease-out'
};

/**
 * Tooltip styling
 */
export const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: '#1f2937',
    border: 'none',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    padding: '8px 12px',
    fontSize: '12px'
  },
  labelStyle: {
    color: '#9ca3af',
    fontWeight: 500,
    marginBottom: '4px'
  },
  itemStyle: {
    color: '#f9fafb',
    padding: '2px 0'
  }
};

/**
 * Axis styling
 */
export const AXIS_STYLE = {
  tick: {
    fill: '#6b7280',
    fontSize: 11,
    fontFamily: 'Inter, sans-serif'
  },
  axisLine: {
    stroke: '#e5e7eb'
  },
  tickLine: {
    stroke: '#e5e7eb'
  }
};

/**
 * Grid styling
 */
export const GRID_STYLE = {
  stroke: '#f3f4f6',
  strokeDasharray: '3 3'
};

/**
 * Legend styling
 */
export const LEGEND_STYLE = {
  wrapperStyle: {
    paddingTop: '16px'
  },
  iconSize: 10,
  iconType: 'circle' as const,
  formatter: (value: string) => (
    `<span style="color: #374151; font-size: 12px; font-weight: 500;">${value}</span>`
  )
};

/**
 * Responsive container default props
 */
export const RESPONSIVE_DEFAULTS = {
  width: '100%',
  minHeight: 200,
  debounce: 100
};

/**
 * Number formatters
 */
export const formatters = {
  number: (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  },
  
  compact: (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  },
  
  percentage: (value: number) => `${value.toFixed(1)}%`,
  
  currency: (value: number) => `₹${formatters.number(value)}`,
  
  pairs: (value: number) => `${formatters.number(value)} pairs`,
  
  days: (value: number) => value === 1 ? '1 day' : `${value.toFixed(1)} days`,
  
  hours: (value: number) => value === 1 ? '1 hr' : `${value.toFixed(1)} hrs`
};

/**
 * Get backlog severity color
 */
export const getBacklogColor = (backlogDays: number): string => {
  if (backlogDays <= 1) return CHART_COLORS.heatmap.low;
  if (backlogDays <= 3) return CHART_COLORS.heatmap.medium;
  if (backlogDays <= 7) return CHART_COLORS.heatmap.high;
  return CHART_COLORS.heatmap.critical;
};

/**
 * Get efficiency color
 */
export const getEfficiencyColor = (efficiency: number): string => {
  if (efficiency >= 90) return CHART_COLORS.success[0];
  if (efficiency >= 70) return CHART_COLORS.warning[0];
  return CHART_COLORS.danger[0];
};

/**
 * Sanitize chart data to prevent errors
 */
export const sanitizeChartData = <T extends Record<string, any>>(data: T[]): T[] => {
  if (!Array.isArray(data)) return [];
  
  return data.map(item => {
    const sanitized = { ...item };
    Object.keys(sanitized).forEach(key => {
      const value = sanitized[key];
      if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
        sanitized[key] = 0;
      }
      if (value === null || value === undefined) {
        sanitized[key] = typeof item[key] === 'string' ? '' : 0;
      }
    });
    return sanitized;
  });
};

export default {
  CHART_COLORS,
  CHART_GRADIENTS,
  ANIMATION_CONFIG,
  TOOLTIP_STYLE,
  AXIS_STYLE,
  GRID_STYLE,
  LEGEND_STYLE,
  RESPONSIVE_DEFAULTS,
  formatters,
  getBacklogColor,
  getEfficiencyColor,
  sanitizeChartData
};
