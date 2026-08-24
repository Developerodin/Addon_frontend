"use client";

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  Tooltip
} from 'recharts';
import { CHART_COLORS, ANIMATION_CONFIG, sanitizeChartData } from './chartConfig';

interface SparklineChartProps {
  data: number[] | { value: number; label?: string }[];
  type?: 'area' | 'line';
  color?: string;
  height?: number;
  width?: number | string;
  showTooltip?: boolean;
  valueFormatter?: (value: number) => string;
  className?: string;
  trend?: 'up' | 'down' | 'neutral';
}

/**
 * Mini sparkline chart for KPI cards
 * Optimized for small inline display
 */
const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  type = 'area',
  color,
  height = 40,
  width = 80,
  showTooltip = false,
  valueFormatter = (v) => v.toLocaleString(),
  className = '',
  trend
}) => {
  // Normalize data to consistent format
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const normalized = data.map((item, index) => {
      if (typeof item === 'number') {
        return { value: item, index };
      }
      return { value: item.value, label: item.label, index };
    });
    
    return sanitizeChartData(normalized);
  }, [data]);

  // Determine color based on trend or explicit color
  const chartColor = useMemo(() => {
    if (color) return color;
    if (trend === 'up') return CHART_COLORS.success[0];
    if (trend === 'down') return CHART_COLORS.danger[0];
    return CHART_COLORS.primary[0];
  }, [color, trend]);

  if (chartData.length === 0) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 rounded ${className}`}
        style={{ height, width }}
      >
        <span className="text-[10px] text-gray-400">No data</span>
      </div>
    );
  }

  const commonProps = {
    data: chartData,
    margin: { top: 2, right: 2, bottom: 2, left: 2 }
  };

  const tooltipContent = showTooltip ? (
    <Tooltip
      contentStyle={{
        backgroundColor: '#1f2937',
        border: 'none',
        borderRadius: '4px',
        padding: '4px 8px',
        fontSize: '10px'
      }}
      labelStyle={{ display: 'none' }}
      formatter={(value: number) => [valueFormatter(value), '']}
      cursor={false}
    />
  ) : null;

  return (
    <div className={`sparkline-chart ${className}`} style={{ height, width }}>
      <ResponsiveContainer width="100%" height="100%">
        {type === 'area' ? (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id={`sparklineGradient-${chartColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            {tooltipContent}
            <Area
              type="monotone"
              dataKey="value"
              stroke={chartColor}
              strokeWidth={1.5}
              fill={`url(#sparklineGradient-${chartColor.replace('#', '')})`}
              isAnimationActive={ANIMATION_CONFIG.enabled}
            />
          </AreaChart>
        ) : (
          <LineChart {...commonProps}>
            {tooltipContent}
            <Line
              type="monotone"
              dataKey="value"
              stroke={chartColor}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={ANIMATION_CONFIG.enabled}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

export default SparklineChart;
