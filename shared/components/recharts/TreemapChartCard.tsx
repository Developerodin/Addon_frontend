"use client";

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  Treemap,
  Tooltip
} from 'recharts';
import RechartsWrapper from './RechartsWrapper';
import {
  CHART_COLORS,
  ANIMATION_CONFIG,
  TOOLTIP_STYLE,
  sanitizeChartData,
  formatters
} from './chartConfig';

interface TreemapDataItem {
  name: string;
  size?: number;
  value?: number;
  children?: TreemapDataItem[];
  color?: string;
}

interface TreemapChartCardProps {
  data: TreemapDataItem[];
  height?: number;
  title?: string;
  subtitle?: string;
  dataKey?: string;
  aspectRatio?: number;
  valueFormatter?: (value: number) => string;
  colorScale?: string[];
  className?: string;
}

/**
 * Custom treemap content renderer
 */
const CustomizedContent: React.FC<any> = ({
  x, y, width, height, name, value, depth, index, colors, valueFormatter
}) => {
  if (width < 30 || height < 20) return null;
  
  const color = colors[index % colors.length];
  
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        stroke="#fff"
        strokeWidth={2}
        rx={4}
        style={{ cursor: 'pointer' }}
      />
      {width > 50 && height > 30 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 6}
            textAnchor="middle"
            fill="#fff"
            fontSize={11}
            fontWeight={500}
          >
            {name?.length > 15 ? `${name.slice(0, 12)}...` : name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 8}
            textAnchor="middle"
            fill="rgba(255,255,255,0.8)"
            fontSize={10}
          >
            {valueFormatter(value || 0)}
          </text>
        </>
      )}
    </g>
  );
};

/**
 * Treemap chart for hierarchical data visualization
 * Shows proportional sizes with optional nesting
 */
const TreemapChartCard: React.FC<TreemapChartCardProps> = ({
  data,
  height = 300,
  title,
  subtitle,
  dataKey = 'size',
  aspectRatio = 4 / 3,
  valueFormatter = formatters.number,
  colorScale,
  className = ''
}) => {
  const chartData = useMemo(() => {
    // Normalize data - ensure all items have the correct dataKey
    const normalize = (items: TreemapDataItem[]): any[] => {
      return items.map((item, index) => {
        const normalized: any = {
          name: item.name,
          [dataKey]: item.size || item.value || 0
        };
        
        if (item.children && item.children.length > 0) {
          normalized.children = normalize(item.children);
        }
        
        return normalized;
      });
    };
    
    return normalize(sanitizeChartData(data));
  }, [data, dataKey]);

  const colors = colorScale || CHART_COLORS.series;

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
      <RechartsWrapper height={height} className="p-2">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={chartData}
            dataKey={dataKey}
            aspectRatio={aspectRatio}
            stroke="#fff"
            isAnimationActive={ANIMATION_CONFIG.enabled}
            content={<CustomizedContent colors={colors} valueFormatter={valueFormatter} />}
          >
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value: number, name: string) => [valueFormatter(value), name]}
            />
          </Treemap>
        </ResponsiveContainer>
      </RechartsWrapper>
    </div>
  );
};

export default TreemapChartCard;
