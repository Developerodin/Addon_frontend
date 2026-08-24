"use client";

import React, { useMemo } from 'react';
import { DonutChartCard } from '@/shared/components/recharts';
import { CHART_COLORS, formatters } from '@/shared/components/recharts/chartConfig';
import InfoTooltip, { SECTION_INFO } from './InfoTooltip';
import type { OrderFunnel as OrderFunnelData } from '../types';

interface OrderFunnelProps {
  data?: OrderFunnelData;
  loading?: boolean;
}

interface FunnelStage {
  key: keyof OrderFunnelData;
  label: string;
  color: string;
}

const stages: FunnelStage[] = [
  { key: 'pending', label: 'Pending', color: '#94a3b8' },
  { key: 'inProgress', label: 'In Progress', color: CHART_COLORS.primary[0] },
  { key: 'completed', label: 'Completed', color: CHART_COLORS.success[0] },
  { key: 'onHold', label: 'On Hold', color: CHART_COLORS.warning[0] },
  { key: 'shortClose', label: 'Short Close', color: '#f97316' },
  { key: 'cancelled', label: 'Cancelled', color: CHART_COLORS.danger[0] }
];

/**
 * Zone B: Order Funnel
 * Donut chart showing order status distribution
 */
const OrderFunnel: React.FC<OrderFunnelProps> = ({ data, loading = false }) => {
  // Transform data for donut chart
  const chartData = useMemo(() => {
    if (!data) return [];
    
    return stages
      .map(stage => ({
        name: stage.label,
        value: data[stage.key] || 0,
        color: stage.color
      }))
      .filter(item => item.value > 0);
  }, [data]);

  // Calculate totals
  const totalOrders = useMemo(() => {
    if (!data) return 0;
    return Object.values(data).reduce((sum, val) => sum + val, 0);
  }, [data]);

  const activeOrders = useMemo(() => {
    if (!data) return 0;
    return data.pending + data.inProgress;
  }, [data]);

  if (loading && !data) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-5 bg-gray-200 rounded w-32 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-48" />
          </div>
          <div className="w-48 h-48 bg-gray-100 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Left side - Stats */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-800">Order Pipeline</h3>
            <InfoTooltip {...SECTION_INFO.orderFunnel} />
          </div>
          <p className="text-xs text-gray-500 mb-4">Current order status distribution</p>
          
          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {formatters.number(totalOrders)}
              </div>
              <div className="text-xs text-gray-500">Total Orders</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {formatters.number(activeOrders)}
              </div>
              <div className="text-xs text-gray-500">Active</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-600">
                {formatters.number(data?.completed || 0)}
              </div>
              <div className="text-xs text-gray-500">Completed</div>
            </div>
          </div>

          {/* Stage breakdown */}
          <div className="space-y-2">
            {stages.map(stage => {
              const value = data?.[stage.key] || 0;
              const percentage = totalOrders > 0 ? (value / totalOrders) * 100 : 0;
              
              return (
                <div key={stage.key} className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="text-sm text-gray-600 flex-1">{stage.label}</span>
                  <span className="text-sm font-medium text-gray-900 w-12 text-right">
                    {formatters.number(value)}
                  </span>
                  <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: stage.color
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-10 text-right">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right side - Donut chart */}
        <div className="w-full lg:w-64">
          <DonutChartCard
            data={chartData}
            height={200}
            innerRadius="55%"
            outerRadius="90%"
            showLegend={false}
            centerLabel={{
              value: activeOrders,
              label: 'Active'
            }}
            className="border-0 shadow-none p-0"
          />
        </div>
      </div>
    </div>
  );
};

export default OrderFunnel;
