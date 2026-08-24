"use client";

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts';
import RechartsWrapper from './RechartsWrapper';
import {
  CHART_COLORS,
  ANIMATION_CONFIG,
  TOOLTIP_STYLE,
  sanitizeChartData,
  formatters
} from './chartConfig';

interface DonutChartCardProps {
  data: { name: string; value: number; color?: string }[];
  height?: number;
  title?: string;
  subtitle?: string;
  innerRadius?: number | string;
  outerRadius?: number | string;
  showLegend?: boolean;
  showLabels?: boolean;
  centerLabel?: { value: string | number; label: string };
  valueFormatter?: (value: number) => string;
  className?: string;
}

/**
 * Donut/Pie chart component with center label support
 * For displaying proportions and distributions
 */
const DonutChartCard: React.FC<DonutChartCardProps> = ({
  data,
  height = 250,
  title,
  subtitle,
  innerRadius = '60%',
  outerRadius = '80%',
  showLegend = true,
  showLabels = false,
  centerLabel,
  valueFormatter = formatters.number,
  className = ''
}) => {
  const chartData = useMemo(() => {
    const sanitized = sanitizeChartData(data);
    return sanitized.map((item, index) => ({
      ...item,
      color: item.color || CHART_COLORS.series[index % CHART_COLORS.series.length]
    }));
  }, [data]);

  const total = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.value, 0);
  }, [chartData]);

  if (chartData.length === 0 || total === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        {title && <h3 className="text-sm font-semibold text-gray-800 mb-1">{title}</h3>}
        <div className="flex items-center justify-center h-48 text-gray-400">
          <span className="text-sm">No data available</span>
        </div>
      </div>
    );
  }

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    if (!showLabels || percent < 0.05) return null;
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontSize: '11px', fontWeight: 500 }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

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
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              dataKey="value"
              nameKey="name"
              label={showLabels ? renderCustomLabel : false}
              labelLine={false}
              isAnimationActive={ANIMATION_CONFIG.enabled}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value: number, name: string) => [
                `${valueFormatter(value)} (${((value / total) * 100).toFixed(1)}%)`,
                name
              ]}
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
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center label */}
        {centerLabel && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-800">
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

export default DonutChartCard;
