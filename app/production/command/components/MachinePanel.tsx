"use client";

import React, { useMemo } from 'react';
import { BarChartCard, DonutChartCard } from '@/shared/components/recharts';
import { formatters, CHART_COLORS, getBacklogColor } from '@/shared/components/recharts/chartConfig';
import InfoTooltip, { SECTION_INFO } from './InfoTooltip';
import type { MachineUtilizationData, MachineData } from '../types';

interface MachinePanelProps {
  data?: MachineUtilizationData;
  loading?: boolean;
  limit?: number;
}

/**
 * Zone F: Machine Utilization
 * Capacity vs load bar chart + status donut
 */
const MachinePanel: React.FC<MachinePanelProps> = ({ 
  data, 
  loading = false,
  limit = 15
}) => {
  // Prepare bar chart data (top machines by queue)
  const barChartData = useMemo(() => {
    if (!data?.machines) return [];
    
    return data.machines.slice(0, limit).map(m => ({
      machine: m.machineCode || m.machineNumber,
      pendingPairs: m.pendingPairs,
      capacity: m.capacity,
      daysOfQueue: m.daysOfQueue
    }));
  }, [data, limit]);

  // Status donut data
  const statusData = useMemo(() => {
    if (!data?.statusBreakdown) return [];
    
    return [
      { name: 'Active', value: data.statusBreakdown.active, color: CHART_COLORS.success[0] },
      { name: 'Idle', value: data.statusBreakdown.idle, color: CHART_COLORS.gray[4] },
      { name: 'Maintenance', value: data.statusBreakdown.maintenance, color: CHART_COLORS.warning[0] }
    ].filter(item => item.value > 0);
  }, [data]);

  if (loading && !data) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 h-80 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-40 mb-4" />
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
              <h3 className="text-sm font-semibold text-gray-800">Machine Utilization</h3>
              <p className="text-xs text-gray-500">Queue depth and status overview</p>
            </div>
            <InfoTooltip {...SECTION_INFO.machines} />
          </div>
          <div className="flex items-center gap-3 text-xs">
            {data?.starvedCount && data.starvedCount > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded bg-amber-50 text-amber-700">
                <i className="ri-alert-line mr-1" />
                {data.starvedCount} starved
              </span>
            )}
            {data?.overloadedCount && data.overloadedCount > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded bg-red-50 text-red-700">
                <i className="ri-error-warning-line mr-1" />
                {data.overloadedCount} overloaded
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bar chart - Machine queues */}
          <div className="lg:col-span-2">
            <BarChartCard
              data={barChartData}
              dataKeys={[
                { key: 'pendingPairs', name: 'Pending Pairs', color: CHART_COLORS.primary[0] }
              ]}
              xAxisKey="machine"
              height={240}
              layout="vertical"
              showLegend={false}
              barSize={14}
              valueFormatter={formatters.number}
              colorByValue={(value, item) => getBacklogColor(item.daysOfQueue)}
              className="border-0 shadow-none p-0"
            />
          </div>

          {/* Right side - Status donut + stats */}
          <div className="space-y-4">
            {/* Status donut */}
            <DonutChartCard
              data={statusData}
              height={140}
              innerRadius="55%"
              outerRadius="85%"
              showLegend={false}
              centerLabel={{
                value: data?.utilization || 0,
                label: 'Util %'
              }}
              className="border-0 shadow-none p-0"
            />

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 rounded-lg bg-emerald-50">
                <div className="text-lg font-bold text-emerald-700">
                  {data?.statusBreakdown?.active || 0}
                </div>
                <div className="text-xs text-emerald-600">Active</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-gray-50">
                <div className="text-lg font-bold text-gray-700">
                  {data?.statusBreakdown?.idle || 0}
                </div>
                <div className="text-xs text-gray-600">Idle</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-amber-50">
                <div className="text-lg font-bold text-amber-700">
                  {data?.statusBreakdown?.maintenance || 0}
                </div>
                <div className="text-xs text-amber-600">Maintenance</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-purple-50">
                <div className="text-lg font-bold text-purple-700">
                  {data?.maintenanceDueCount || 0}
                </div>
                <div className="text-xs text-purple-600">Due Soon</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Machine list table */}
      {data?.machines && data.machines.length > 0 && (
        <div className="border-t border-gray-100">
          <div className="max-h-48 overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-500 font-medium">Machine</th>
                  <th className="px-3 py-2 text-right text-gray-500 font-medium">Queue</th>
                  <th className="px-3 py-2 text-right text-gray-500 font-medium">Pairs</th>
                  <th className="px-3 py-2 text-right text-gray-500 font-medium">Days</th>
                  <th className="px-3 py-2 text-center text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.machines.slice(0, 10).map((m, idx) => (
                  <tr 
                    key={m.id} 
                    className={`border-b border-gray-50 ${m.isOverloaded ? 'bg-red-50/50' : ''} ${m.isStarved ? 'bg-amber-50/50' : ''}`}
                  >
                    <td className="px-3 py-2 font-medium text-gray-800">
                      {m.machineCode || m.machineNumber}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600">{m.queueRows}</td>
                    <td className="px-3 py-2 text-right text-gray-600">
                      {formatters.number(m.pendingPairs)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span 
                        className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium"
                        style={{ 
                          backgroundColor: `${getBacklogColor(m.daysOfQueue)}15`,
                          color: getBacklogColor(m.daysOfQueue)
                        }}
                      >
                        {m.daysOfQueue.toFixed(1)}d
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`
                        inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium
                        ${m.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : ''}
                        ${m.status === 'Idle' ? 'bg-gray-100 text-gray-600' : ''}
                        ${m.status === 'Under Maintenance' ? 'bg-amber-100 text-amber-700' : ''}
                      `}>
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MachinePanel;
