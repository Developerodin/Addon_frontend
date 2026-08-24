"use client";

import React, { useMemo } from 'react';
import { AreaChartCard, ComposedChartCard } from '@/shared/components/recharts';
import { formatters, CHART_COLORS } from '@/shared/components/recharts/chartConfig';
import InfoTooltip, { SECTION_INFO } from './InfoTooltip';
import type { TrendsData } from '../types';

interface ThroughputPanelProps {
  data?: TrendsData;
  loading?: boolean;
}

/**
 * Zone D: Throughput Trends
 * Daily output trend with area chart
 */
const ThroughputPanel: React.FC<ThroughputPanelProps> = ({ data, loading = false }) => {
  // Format chart data
  const chartData = useMemo(() => {
    if (!data?.output) return [];
    
    return data.output.map(d => ({
      date: new Date(d.date).toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short' 
      }),
      output: d.output,
      stnCount: d.stnCount
    }));
  }, [data]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!data?.output?.length) return null;
    
    const values = data.output.map(d => d.output);
    const total = values.reduce((sum, v) => sum + v, 0);
    const avg = Math.round(total / values.length);
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    return { total, avg, max, min };
  }, [data]);

  if (loading && !data) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 h-80 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
        <div className="h-60 bg-gray-100 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 pt-4 pb-2 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Output Trend</h3>
              <p className="text-xs text-gray-500">Daily dispatch volume</p>
            </div>
            <InfoTooltip {...SECTION_INFO.throughput} />
          </div>
          {stats && (
            <div className="flex items-center gap-4 text-xs">
              <span className="text-gray-500">
                Avg: <span className="font-semibold text-gray-700">{formatters.number(stats.avg)}</span>/day
              </span>
              <span className="text-gray-500">
                Total: <span className="font-semibold text-purple-600">{formatters.number(stats.total)}</span>
              </span>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-2">
        <AreaChartCard
          data={chartData}
          dataKeys={[
            { key: 'output', name: 'Output (pairs)', color: CHART_COLORS.primary[0] }
          ]}
          xAxisKey="date"
          height={260}
          showLegend={false}
          showGrid={true}
          gradient={true}
          valueFormatter={formatters.number}
          className="border-0 shadow-none p-0"
        />
      </div>
      
      {/* Stats row */}
      {stats && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-gray-900">{formatters.number(stats.total)}</div>
            <div className="text-xs text-gray-500">Total Output</div>
          </div>
          <div>
            <div className="text-lg font-bold text-purple-600">{formatters.number(stats.avg)}</div>
            <div className="text-xs text-gray-500">Daily Average</div>
          </div>
          <div>
            <div className="text-lg font-bold text-emerald-600">{formatters.number(stats.max)}</div>
            <div className="text-xs text-gray-500">Best Day</div>
          </div>
          <div>
            <div className="text-lg font-bold text-red-500">{formatters.number(stats.min)}</div>
            <div className="text-xs text-gray-500">Lowest Day</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThroughputPanel;
