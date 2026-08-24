"use client";

import React, { useMemo } from 'react';
import { DonutChartCard, RadialBarChartCard } from '@/shared/components/recharts';
import { formatters, CHART_COLORS } from '@/shared/components/recharts/chartConfig';
import InfoTooltip, { SECTION_INFO } from './InfoTooltip';
import type { QualityData } from '../types';

interface QualityPanelProps {
  data?: QualityData;
  loading?: boolean;
}

/**
 * Zone E: Quality Panel
 * FPY gauge, M-Mix donut, M2 recovery stats
 */
const QualityPanel: React.FC<QualityPanelProps> = ({ data, loading = false }) => {
  // M-Mix chart data
  const mMixData = useMemo(() => {
    if (!data?.mMix) return [];
    
    return [
      { name: 'M1 (Good)', value: data.mMix.m1, color: CHART_COLORS.quality.m1 },
      { name: 'M2 (Repair)', value: data.mMix.m2, color: CHART_COLORS.quality.m2 },
      { name: 'M3 (Seconds)', value: data.mMix.m3, color: CHART_COLORS.quality.m3 },
      { name: 'M4 (Reject)', value: data.mMix.m4, color: CHART_COLORS.quality.m4 }
    ].filter(item => item.value > 0);
  }, [data]);

  if (loading && !data) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 h-80 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-40 bg-gray-100 rounded-full" />
          <div className="h-40 bg-gray-100 rounded-full" />
        </div>
      </div>
    );
  }

  const fpy = data?.firstPassYield || 0;
  const rty = data?.rolledThroughputYield || 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 pt-4 pb-2 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Quality Metrics</h3>
              <p className="text-xs text-gray-500">First-pass yield and M-mix breakdown</p>
            </div>
            <InfoTooltip {...SECTION_INFO.quality} />
          </div>
          {data?.openM2 && data.openM2.count > 0 && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
              <i className="ri-error-warning-line mr-1" />
              {data.openM2.count} open M2 ({formatters.number(data.openM2.pairs)} prs)
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        {/* Main metrics row */}
        <div className="grid grid-cols-2 gap-6 mb-4">
          {/* FPY Gauge */}
          <div className="text-center">
            <div className="relative inline-block">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="#f3f4f6"
                  strokeWidth="10"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke={fpy >= 90 ? CHART_COLORS.success[0] : fpy >= 70 ? CHART_COLORS.warning[0] : CHART_COLORS.danger[0]}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(fpy / 100) * 352} 352`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">{fpy.toFixed(1)}%</span>
                <span className="text-xs text-gray-500">FPY</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              RTY: <span className="font-semibold">{rty.toFixed(1)}%</span>
            </div>
          </div>

          {/* M-Mix donut */}
          <DonutChartCard
            data={mMixData}
            height={140}
            innerRadius="50%"
            outerRadius="85%"
            showLegend={false}
            centerLabel={{
              value: data?.mMix?.total || 0,
              label: 'Total'
            }}
            className="border-0 shadow-none p-0"
          />
        </div>

        {/* M-Mix breakdown */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { key: 'm1', label: 'M1', color: CHART_COLORS.quality.m1, desc: 'Good' },
            { key: 'm2', label: 'M2', color: CHART_COLORS.quality.m2, desc: 'Repair' },
            { key: 'm3', label: 'M3', color: CHART_COLORS.quality.m3, desc: 'Seconds' },
            { key: 'm4', label: 'M4', color: CHART_COLORS.quality.m4, desc: 'Reject' }
          ].map(item => {
            const value = data?.mMix?.[item.key as keyof typeof data.mMix] || 0;
            const total = data?.mMix?.total || 1;
            const pct = ((value / total) * 100).toFixed(1);
            
            return (
              <div 
                key={item.key}
                className="text-center p-2 rounded-lg"
                style={{ backgroundColor: `${item.color}10` }}
              >
                <div className="text-lg font-bold" style={{ color: item.color }}>
                  {formatters.number(value)}
                </div>
                <div className="text-xs text-gray-500">{item.label} ({pct}%)</div>
                <div className="text-[10px] text-gray-400">{item.desc}</div>
              </div>
            );
          })}
        </div>

        {/* M2 Recovery stats */}
        {data?.m2Recovery && (
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">M2 Recovery Rate</span>
              <span className="font-semibold text-emerald-600">
                {data.m2Recovery.recoveryRate}%
              </span>
            </div>
            <div className="mt-1.5 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${data.m2Recovery.recoveryRate}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-gray-400">
              <span>Recovered: {formatters.number(data.m2Recovery.mergedQuantity)}</span>
              <span>To M3: {formatters.number(data.m2Recovery.toM3)}</span>
              <span>To M4: {formatters.number(data.m2Recovery.toM4)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QualityPanel;
