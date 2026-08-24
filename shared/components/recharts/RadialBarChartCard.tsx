"use client";

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Legend,
  Tooltip
} from 'recharts';
import RechartsWrapper from './RechartsWrapper';
import {
  CHART_COLORS,
  ANIMATION_CONFIG,
  TOOLTIP_STYLE,
  sanitizeChartData,
  formatters,
  getEfficiencyColor
} from './chartConfig';

interface RadialBarChartCardProps {
  data: { name: string; value: number; fill?: string; max?: number }[];
  height?: number;
  title?: string;
  subtitle?: string;
  innerRadius?: number | string;
  outerRadius?: number | string;
  showLegend?: boolean;
  startAngle?: number;
  endAngle?: number;
  centerLabel?: { value: string | number; label: string };
  valueFormatter?: (value: number) => string;
  className?: string;
}

/**
 * Radial bar chart for gauge-like visualizations
 * Perfect for showing progress or efficiency metrics
 */
const RadialBarChartCard: React.FC<RadialBarChartCardProps> = ({
  data,
  height = 250,
  title,
  subtitle,
  innerRadius = '40%',
  outerRadius = '100%',
  showLegend = true,
  startAngle = 90,
  endAngle = -270,
  centerLabel,
  valueFormatter = formatters.percentage,
  className = ''
}) => {
  const chartData = useMemo(() => {
    const sanitized = sanitizeChartData(data);
    return sanitized.map((item, index) => ({
      ...item,
      fill: item.fill || getEfficiencyColor(item.value)
    }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        {title && <h3 className="text-sm font-semibold text-gray-800 mb-1">{title}</h3>}
        <div className="flex items-center justify-center h-48 text-gray-400">
          <span className="text-sm">No data available</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {(title || subtitle) && (
        <div className="px-4 pt-4 pb-2">
          {title && <h3 className="text-sm font-semibold text-gray-800">{title}</h3>}
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      )}
      <RechartsWrapper height={height} className="relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            data={chartData}
            startAngle={startAngle}
            endAngle={endAngle}
          >
            <RadialBar
              dataKey="value"
              background={{ fill: '#f3f4f6' }}
              cornerRadius={4}
              isAnimationActive={ANIMATION_CONFIG.enabled}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value: number, name: string) => [valueFormatter(value), name]}
            />
            {showLegend && (
              <Legend
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }}
                formatter={(value) => <span className="text-gray-600">{value}</span>}
              />
            )}
          </RadialBarChart>
        </ResponsiveContainer>
        
        {/* Center label */}
        {centerLabel && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">
                {typeof centerLabel.value === 'number' 
                  ? valueFormatter(centerLabel.value) 
                  : centerLabel.value}
              </div>
              <div className="text-xs text-gray-500">{centerLabel.label}</div>
            </div>
          </div>
        )}
      </RechartsWrapper>
    </div>
  );
};

export default RadialBarChartCard;
