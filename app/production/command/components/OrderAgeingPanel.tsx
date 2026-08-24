"use client";

import React, { useMemo } from 'react';
import { BarChartCard } from '@/shared/components/recharts';
import { formatters } from '@/shared/components/recharts/chartConfig';
import InfoTooltip, { SECTION_INFO } from './InfoTooltip';
import type { AgeingData } from '../types';

interface OrderAgeingPanelProps {
  data?: AgeingData;
  loading?: boolean;
}

const BUCKET_LABELS: Record<number | string, { label: string; color: string; bgColor: string }> = {
  0: { label: '0-7 days', color: '#10b981', bgColor: 'bg-emerald-50' },
  7: { label: '7-15 days', color: '#f59e0b', bgColor: 'bg-amber-50' },
  15: { label: '15-30 days', color: '#f97316', bgColor: 'bg-orange-50' },
  30: { label: '30+ days', color: '#ef4444', bgColor: 'bg-red-50' },
  '30+': { label: '30+ days', color: '#ef4444', bgColor: 'bg-red-50' }
};

/**
 * Zone H: Order Ageing Panel
 * Age bucket distribution for orders
 */
const OrderAgeingPanel: React.FC<OrderAgeingPanelProps> = ({
  data,
  loading = false
}) => {
  const chartData = useMemo(() => {
    if (!data?.buckets) return [];
    
    return data.buckets.map(bucket => {
      const bucketKey = bucket._id;
      const config = BUCKET_LABELS[bucketKey] || { label: `${bucketKey}`, color: '#6b7280' };
      
      return {
        bucket: config.label,
        count: bucket.count,
        color: config.color
      };
    });
  }, [data]);

  const totalOrders = useMemo(() => {
    return data?.buckets?.reduce((sum, b) => sum + b.count, 0) || 0;
  }, [data]);

  const criticalCount = useMemo(() => {
    const critical = data?.buckets?.find(b => b._id === 30 || b._id === '30+');
    return critical?.count || 0;
  }, [data]);

  if (loading && !data) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 h-64 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
        <div className="h-48 bg-gray-100 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 pt-4 pb-2 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Order Ageing</h3>
              <p className="text-xs text-gray-500">Time since last activity</p>
            </div>
            <InfoTooltip {...SECTION_INFO.ageing} />
          </div>
          {criticalCount > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium">
              <i className="ri-alert-fill mr-1" />
              {criticalCount} critical
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {Object.entries(BUCKET_LABELS).slice(0, 4).map(([key, config]) => {
            const bucket = data?.buckets?.find(b => String(b._id) === key);
            return (
              <div key={key} className={`p-2 rounded-lg ${config.bgColor} text-center`}>
                <div className="text-lg font-bold" style={{ color: config.color }}>
                  {bucket?.count || 0}
                </div>
                <div className="text-[10px]" style={{ color: config.color }}>
                  {config.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bar chart */}
        {chartData.length > 0 ? (
          <BarChartCard
            data={chartData}
            dataKeys={[
              { key: 'count', name: 'Orders', color: '#6366f1' }
            ]}
            xAxisKey="bucket"
            height={180}
            showLegend={false}
            showLabels={true}
            barSize={40}
            valueFormatter={(v) => String(v)}
            colorByValue={(_, item) => item.color}
            className="border-0 shadow-none p-0"
          />
        ) : (
          <div className="flex items-center justify-center h-48 text-gray-400">
            <div className="text-center">
              <i className="ri-time-line text-4xl mb-2" />
              <p className="text-sm">No ageing data</p>
            </div>
          </div>
        )}

        {/* Total footer */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
          <span>Total open orders</span>
          <span className="font-semibold text-gray-700">{totalOrders}</span>
        </div>
      </div>
    </div>
  );
};

export default OrderAgeingPanel;
