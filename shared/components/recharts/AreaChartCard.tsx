"use client";

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import RechartsWrapper from './RechartsWrapper';
import {
  CHART_COLORS,
  ANIMATION_CONFIG,
  TOOLTIP_STYLE,
  AXIS_STYLE,
  GRID_STYLE,
  sanitizeChartData,
  formatters
} from './chartConfig';

interface AreaChartCardProps {
  data: Record<string, any>[];
  dataKeys: { key: string; name: string; color?: string; stackId?: string }[];
  xAxisKey: string;
  height?: number;
  title?: string;
  subtitle?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  stacked?: boolean;
  gradient?: boolean;
  valueFormatter?: (value: number) => string;
  xAxisFormatter?: (value: string) => string;
  className?: string;
}

/**
 * Area chart component with gradient fills
 * Supports stacked and non-stacked modes
 */
const AreaChartCard: React.FC<AreaChartCardProps> = ({
  data,
  dataKeys,
  xAxisKey,
  height = 300,
  title,
  subtitle,
  showGrid = true,
  showLegend = true,
  stacked = false,
  gradient = true,
  valueFormatter = formatters.number,
  xAxisFormatter,
  className = ''
}) => {
  const chartData = useMemo(() => sanitizeChartData(data), [data]);

  const colors = useMemo(() => {
    return dataKeys.map((dk, index) => dk.color || CHART_COLORS.series[index % CHART_COLORS.series.length]);
  }, [dataKeys]);

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
      <RechartsWrapper height={height} className="px-2 pb-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            {gradient && (
              <defs>
                {colors.map((color, index) => (
                  <linearGradient key={`gradient-${index}`} id={`areaGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
            )}
            {showGrid && <CartesianGrid {...GRID_STYLE} />}
            <XAxis
              dataKey={xAxisKey}
              {...AXIS_STYLE}
              tickFormatter={xAxisFormatter}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              {...AXIS_STYLE}
              tickFormatter={valueFormatter}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value: number, name: string) => [valueFormatter(value), name]}
              labelFormatter={xAxisFormatter}
            />
            {showLegend && (
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
              />
            )}
            {dataKeys.map((dk, index) => (
              <Area
                key={dk.key}
                type="monotone"
                dataKey={dk.key}
                name={dk.name}
                stackId={stacked ? (dk.stackId || 'stack') : undefined}
                stroke={colors[index]}
                strokeWidth={2}
                fill={gradient ? `url(#areaGradient-${index})` : colors[index]}
                fillOpacity={gradient ? 1 : 0.1}
                isAnimationActive={ANIMATION_CONFIG.enabled}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </RechartsWrapper>
    </div>
  );
};

export default AreaChartCard;
