"use client";

import React, { useMemo } from 'react';
import { formatters, getBacklogColor, CHART_COLORS } from '@/shared/components/recharts/chartConfig';
import InfoTooltip, { SECTION_INFO } from './InfoTooltip';
import type { FloorHeatstripData, FloorData } from '../types';

interface FloorHeatstripProps {
  data?: FloorHeatstripData;
  loading?: boolean;
  onFloorClick?: (floorKey: string) => void;
}

interface ColumnConfig {
  key: keyof FloorData | 'floor';
  label: string;
  width: string;
  align: 'left' | 'right' | 'center';
  formatter?: (value: any, floor: FloorData) => React.ReactNode;
}

const columns: ColumnConfig[] = [
  { 
    key: 'floor', 
    label: 'Floor', 
    width: '140px', 
    align: 'left',
    formatter: (_, floor) => (
      <span className="font-medium text-gray-900">{floor.floor}</span>
    )
  },
  { 
    key: 'inTransit', 
    label: 'In Transit', 
    width: '90px', 
    align: 'right',
    formatter: (v) => formatters.number(v || 0)
  },
  { 
    key: 'received', 
    label: 'Received', 
    width: '90px', 
    align: 'right',
    formatter: (v) => formatters.number(v || 0)
  },
  { 
    key: 'wip', 
    label: 'WIP', 
    width: '100px', 
    align: 'right',
    formatter: (v, floor) => (
      <span className={v > 0 ? 'font-semibold' : 'text-gray-400'}>
        {formatters.number(v || 0)}
      </span>
    )
  },
  { 
    key: 'completed', 
    label: 'Completed', 
    width: '90px', 
    align: 'right',
    formatter: (v) => formatters.number(v || 0)
  },
  { 
    key: 'transferred', 
    label: 'Out', 
    width: '80px', 
    align: 'right',
    formatter: (v) => formatters.number(v || 0)
  },
  { 
    key: 'articleCount', 
    label: 'Articles', 
    width: '70px', 
    align: 'right',
    formatter: (v) => v || '-'
  },
  { 
    key: 'backlogDays', 
    label: 'Backlog', 
    width: '80px', 
    align: 'right',
    formatter: (v) => {
      if (!v || v === 0) return <span className="text-gray-400">-</span>;
      return (
        <span 
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ 
            backgroundColor: `${getBacklogColor(v)}15`,
            color: getBacklogColor(v)
          }}
        >
          {v.toFixed(1)}d
        </span>
      );
    }
  },
  { 
    key: 'avgDailyThroughput', 
    label: 'Avg/Day', 
    width: '80px', 
    align: 'right',
    formatter: (v) => v ? formatters.number(v) : '-'
  }
];

/**
 * Zone C: Floor Heatstrip
 * Most important widget - shows all floors with bottleneck detection
 * CSS Grid layout with color-coded cells
 */
const FloorHeatstrip: React.FC<FloorHeatstripProps> = ({ 
  data, 
  loading = false,
  onFloorClick 
}) => {
  const floors = data?.floors || [];
  const bottleneck = data?.bottleneck;

  // Calculate column totals
  const totals = useMemo(() => {
    if (!floors.length) return null;
    return {
      inTransit: floors.reduce((sum, f) => sum + (f.inTransit || 0), 0),
      received: floors.reduce((sum, f) => sum + (f.received || 0), 0),
      wip: floors.reduce((sum, f) => sum + (f.wip || 0), 0),
      completed: floors.reduce((sum, f) => sum + (f.completed || 0), 0),
      transferred: floors.reduce((sum, f) => sum + (f.transferred || 0), 0),
      articleCount: floors.reduce((sum, f) => sum + (f.articleCount || 0), 0)
    };
  }, [floors]);

  // Get row background based on backlog
  const getRowStyle = (floor: FloorData) => {
    if (floor.backlogDays > 3) {
      return { 
        backgroundColor: `${CHART_COLORS.danger[0]}08`,
        borderLeft: `3px solid ${CHART_COLORS.danger[0]}`
      };
    }
    if (floor.backlogDays > 1) {
      return { 
        backgroundColor: `${CHART_COLORS.warning[0]}08`,
        borderLeft: `3px solid ${CHART_COLORS.warning[0]}`
      };
    }
    return { borderLeft: '3px solid transparent' };
  };

  if (loading && !data) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse">
        <div className="bg-gray-50 border-b px-4 py-3">
          <div className="h-5 bg-gray-200 rounded w-40" />
        </div>
        {[...Array(12)].map((_, i) => (
          <div key={i} className="px-4 py-3 border-b border-gray-100 flex gap-4">
            {[...Array(9)].map((_, j) => (
              <div key={j} className="h-4 bg-gray-100 rounded flex-1" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header with bottleneck indicator */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Floor Status</h3>
            <p className="text-xs text-gray-500">Real-time floor metrics with bottleneck detection</p>
          </div>
          <InfoTooltip {...SECTION_INFO.floors} />
        </div>
        {bottleneck && (
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
            style={{ 
              backgroundColor: `${CHART_COLORS.danger[0]}10`,
              color: CHART_COLORS.danger[0]
            }}
          >
            <i className="ri-error-warning-fill" />
            <span className="font-medium">
              Bottleneck: {bottleneck.floor}
            </span>
            <span className="opacity-75">
              ({bottleneck.backlogDays.toFixed(1)} days backlog)
            </span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          {/* Column headers */}
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/50">
              {columns.map(col => (
                <th 
                  key={col.key}
                  className={`
                    px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider
                    text-${col.align}
                  `}
                  style={{ width: col.width }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          {/* Floor rows */}
          <tbody>
            {floors.map((floor, idx) => {
              const isBottleneck = bottleneck?.floorKey === floor.floorKey;
              
              return (
                <tr 
                  key={floor.floorKey}
                  onClick={() => onFloorClick?.(floor.floorKey)}
                  className={`
                    border-b border-gray-100 transition-colors
                    ${onFloorClick ? 'cursor-pointer hover:bg-gray-50' : ''}
                    ${isBottleneck ? 'ring-2 ring-inset ring-red-200' : ''}
                  `}
                  style={getRowStyle(floor)}
                >
                  {columns.map(col => {
                    const value = floor[col.key as keyof FloorData];
                    
                    return (
                      <td 
                        key={col.key}
                        className={`
                          px-4 py-3 text-sm text-gray-600
                          text-${col.align}
                        `}
                      >
                        {col.formatter 
                          ? col.formatter(value, floor)
                          : value
                        }
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* Totals row */}
            {totals && (
              <tr className="bg-gray-50 border-t-2 border-gray-200 font-medium">
                <td className="px-4 py-3 text-sm text-gray-900">Total</td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                  {formatters.number(totals.inTransit)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                  {formatters.number(totals.received)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right font-bold">
                  {formatters.number(totals.wip)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                  {formatters.number(totals.completed)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                  {formatters.number(totals.transferred)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                  {totals.articleCount}
                </td>
                <td className="px-4 py-3 text-sm text-gray-400 text-right">-</td>
                <td className="px-4 py-3 text-sm text-gray-400 text-right">-</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center gap-6 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          &lt; 1 day backlog
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          1-3 days backlog
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          &gt; 3 days backlog
        </span>
      </div>
    </div>
  );
};

export default FloorHeatstrip;
