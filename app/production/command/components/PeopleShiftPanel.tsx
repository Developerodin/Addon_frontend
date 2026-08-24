"use client";

import React, { useMemo } from 'react';
import { BarChartCard } from '@/shared/components/recharts';
import { formatters, CHART_COLORS } from '@/shared/components/recharts/chartConfig';
import InfoTooltip, { SECTION_INFO } from './InfoTooltip';

interface PeopleMetric {
  _id: string;
  totalOutput: number;
  actionCount: number;
}

interface PeopleData {
  metrics: PeopleMetric[];
  groupBy: 'supervisor' | 'shift' | 'user';
}

interface PeopleShiftPanelProps {
  data?: PeopleData;
  loading?: boolean;
  onGroupByChange?: (groupBy: 'supervisor' | 'shift' | 'user') => void;
}

/**
 * Zone G: People/Shift Panel
 * Supervisor and shift performance metrics
 */
const PeopleShiftPanel: React.FC<PeopleShiftPanelProps> = ({
  data,
  loading = false,
  onGroupByChange
}) => {
  const barData = useMemo(() => {
    if (!data?.metrics) return [];
    
    return data.metrics.slice(0, 15).map((m, idx) => ({
      name: m._id || `Unknown ${idx + 1}`,
      output: m.totalOutput,
      actions: m.actionCount
    }));
  }, [data]);

  const totalOutput = useMemo(() => {
    return data?.metrics?.reduce((sum, m) => sum + m.totalOutput, 0) || 0;
  }, [data]);

  const topPerformer = useMemo(() => {
    if (!data?.metrics?.length) return null;
    return data.metrics[0];
  }, [data]);

  if (loading && !data) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 h-80 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-40 mb-4" />
        <div className="h-60 bg-gray-100 rounded" />
      </div>
    );
  }

  const groupByLabel = {
    supervisor: 'Supervisor',
    shift: 'Shift',
    user: 'User'
  }[data?.groupBy || 'supervisor'];

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 pt-4 pb-2 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">People Performance</h3>
              <p className="text-xs text-gray-500">Output by {groupByLabel.toLowerCase()}</p>
            </div>
            <InfoTooltip {...SECTION_INFO.people} />
          </div>
          <div className="flex items-center gap-2">
            {onGroupByChange && (
              <select
                value={data?.groupBy || 'supervisor'}
                onChange={(e) => onGroupByChange(e.target.value as 'supervisor' | 'shift' | 'user')}
                className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="supervisor">By Supervisor</option>
                <option value="shift">By Shift</option>
                <option value="user">By User</option>
              </select>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Stats cards */}
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-blue-50">
              <div className="text-2xl font-bold text-blue-700">
                {formatters.number(totalOutput)}
              </div>
              <div className="text-xs text-blue-600">Total Output</div>
            </div>
            
            {topPerformer && (
              <div className="p-3 rounded-lg bg-emerald-50">
                <div className="text-sm font-semibold text-emerald-700 truncate">
                  {topPerformer._id || 'Unknown'}
                </div>
                <div className="text-xl font-bold text-emerald-700">
                  {formatters.number(topPerformer.totalOutput)}
                </div>
                <div className="text-xs text-emerald-600">Top Performer</div>
              </div>
            )}
            
            <div className="p-3 rounded-lg bg-purple-50">
              <div className="text-2xl font-bold text-purple-700">
                {data?.metrics?.length || 0}
              </div>
              <div className="text-xs text-purple-600">Active {groupByLabel}s</div>
            </div>
          </div>

          {/* Bar chart */}
          <div className="lg:col-span-3">
            {barData.length > 0 ? (
              <BarChartCard
                data={barData}
                dataKeys={[
                  { key: 'output', name: 'Output (pairs)', color: CHART_COLORS.primary[0] }
                ]}
                xAxisKey="name"
                height={260}
                layout="vertical"
                showLegend={false}
                barSize={16}
                valueFormatter={formatters.number}
                className="border-0 shadow-none p-0"
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <i className="ri-group-line text-4xl mb-2" />
                  <p className="text-sm">No data available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PeopleShiftPanel;
