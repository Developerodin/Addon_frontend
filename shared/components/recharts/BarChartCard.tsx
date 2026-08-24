"use client";

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  LabelList
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

interface BarChartCardProps {
  data: Record<string, any>[];
  dataKeys: { key: string; name: string; color?: string; stackId?: string }[];
  xAxisKey: string;
  height?: number;
  title?: string;
  subtitle?: string;
  layout?: 'vertical' | 'horizontal';
  showGrid?: boolean;
  showLegend?: boolean;
  stacked?: boolean;
  showLabels?: boolean;
  barSize?: number;
  valueFormatter?: (value: number) => string;
  xAxisFormatter?: (value: string) => string;
  colorByValue?: (value: number, item: any) => string;
  className?: string;
}

/**
 * Bar chart component with horizontal/vertical layout support
 * Supports stacked, grouped, and colored-by-value modes
 */
const BarChartCard: React.FC<BarChartCardProps> = ({
  data,
  dataKeys,
  xAxisKey,
  height = 300,
  title,
  subtitle,
  layout = 'horizontal',
  showGrid = true,
  showLegend = true,
  stacked = false,
  showLabels = false,
  barSize = 20,
  valueFormatter = formatters.number,
  xAxisFormatter,
  colorByValue,
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

  const isVertical = layout === 'vertical';

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
          <BarChart
            data={chartData}
            layout={isVertical ? 'vertical' : 'horizontal'}
            margin={{ top: 10, right: 10, left: isVertical ? 80 : 0, bottom: 0 }}
          >
            {showGrid && <CartesianGrid {...GRID_STYLE} horizontal={!isVertical} vertical={isVertical} />}
            
            {isVertical ? (
              <>
                <XAxis
                  type="number"
                  {...AXIS_STYLE}
                  tickFormatter={valueFormatter}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  type="category"
                  dataKey={xAxisKey}
                  {...AXIS_STYLE}
                  tickFormatter={xAxisFormatter}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                />
              </>
            ) : (
              <>
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
              </>
            )}
            
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value: number, name: string) => [valueFormatter(value), name]}
              labelFormatter={xAxisFormatter}
              cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
            />
            
            {showLegend && dataKeys.length > 1 && (
              <Legend
                verticalAlign="top"
                align="right"
                iconType="square"
                iconSize={10}
                wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
              />
            )}
            
            {dataKeys.map((dk, index) => (
              <Bar
                key={dk.key}
                dataKey={dk.key}
                name={dk.name}
                stackId={stacked ? (dk.stackId || 'stack') : undefined}
                fill={colors[index]}
                barSize={barSize}
                radius={stacked ? 0 : [4, 4, 4, 4]}
                isAnimationActive={ANIMATION_CONFIG.enabled}
              >
                {colorByValue && chartData.map((entry, idx) => (
                  <Cell 
                    key={`cell-${idx}`} 
                    fill={colorByValue(entry[dk.key], entry)} 
                  />
                ))}
                {showLabels && (
                  <LabelList
                    dataKey={dk.key}
                    position={isVertical ? 'right' : 'top'}
                    formatter={valueFormatter}
                    style={{ fontSize: '10px', fill: '#6b7280' }}
                  />
                )}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </RechartsWrapper>
    </div>
  );
};

export default BarChartCard;
