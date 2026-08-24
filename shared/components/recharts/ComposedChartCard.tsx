"use client";

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
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

type ChartType = 'bar' | 'line' | 'area';

interface DataKeyConfig {
  key: string;
  name: string;
  type: ChartType;
  color?: string;
  yAxisId?: string;
  stackId?: string;
}

interface ComposedChartCardProps {
  data: Record<string, any>[];
  dataKeys: DataKeyConfig[];
  xAxisKey: string;
  height?: number;
  title?: string;
  subtitle?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  dualAxis?: boolean;
  valueFormatter?: (value: number) => string;
  secondaryValueFormatter?: (value: number) => string;
  xAxisFormatter?: (value: string) => string;
  className?: string;
}

/**
 * Composed chart combining bars, lines, and areas
 * Supports dual Y-axis for different scales
 */
const ComposedChartCard: React.FC<ComposedChartCardProps> = ({
  data,
  dataKeys,
  xAxisKey,
  height = 300,
  title,
  subtitle,
  showGrid = true,
  showLegend = true,
  dualAxis = false,
  valueFormatter = formatters.number,
  secondaryValueFormatter,
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

  const renderDataSeries = (dk: DataKeyConfig, index: number) => {
    const commonProps = {
      key: dk.key,
      dataKey: dk.key,
      name: dk.name,
      yAxisId: dualAxis ? (dk.yAxisId || 'left') : undefined,
      isAnimationActive: ANIMATION_CONFIG.enabled
    };

    switch (dk.type) {
      case 'bar':
        return (
          <Bar
            {...commonProps}
            fill={colors[index]}
            barSize={20}
            radius={[4, 4, 0, 0]}
            stackId={dk.stackId}
          />
        );
      case 'line':
        return (
          <Line
            {...commonProps}
            type="monotone"
            stroke={colors[index]}
            strokeWidth={2}
            dot={{ fill: colors[index], strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5 }}
          />
        );
      case 'area':
        return (
          <Area
            {...commonProps}
            type="monotone"
            stroke={colors[index]}
            strokeWidth={2}
            fill={colors[index]}
            fillOpacity={0.1}
            stackId={dk.stackId}
          />
        );
      default:
        return null;
    }
  };

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
          <ComposedChart data={chartData} margin={{ top: 10, right: dualAxis ? 50 : 10, left: 0, bottom: 0 }}>
            {showGrid && <CartesianGrid {...GRID_STYLE} />}
            
            <XAxis
              dataKey={xAxisKey}
              {...AXIS_STYLE}
              tickFormatter={xAxisFormatter}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            
            <YAxis
              yAxisId={dualAxis ? 'left' : undefined}
              {...AXIS_STYLE}
              tickFormatter={valueFormatter}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            
            {dualAxis && (
              <YAxis
                yAxisId="right"
                orientation="right"
                {...AXIS_STYLE}
                tickFormatter={secondaryValueFormatter || valueFormatter}
                tickLine={false}
                axisLine={false}
                width={50}
              />
            )}
            
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value: number, name: string, props: any) => {
                const dk = dataKeys.find(d => d.name === name);
                const formatter = dk?.yAxisId === 'right' && secondaryValueFormatter 
                  ? secondaryValueFormatter 
                  : valueFormatter;
                return [formatter(value), name];
              }}
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
            
            {dataKeys.map((dk, index) => renderDataSeries(dk, index))}
          </ComposedChart>
        </ResponsiveContainer>
      </RechartsWrapper>
    </div>
  );
};

export default ComposedChartCard;
