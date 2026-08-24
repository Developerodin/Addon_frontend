"use client";

import React from 'react';
import Link from 'next/link';
import { SparklineChart } from '@/shared/components/recharts';
import { formatters, CHART_COLORS } from '@/shared/components/recharts/chartConfig';
import type { SummaryKpis } from '../types';

interface KpiStripProps {
  kpis?: SummaryKpis;
  loading?: boolean;
}

interface KpiCardConfig {
  key: keyof SummaryKpis;
  title: string;
  icon: string;
  color: string;
  formatter: (value: number) => string;
  href?: string;
  showSparkline?: boolean;
}

const kpiConfig: KpiCardConfig[] = [
  {
    key: 'wipPairs',
    title: 'WIP Pairs',
    icon: 'ri-stack-line',
    color: CHART_COLORS.primary[0],
    formatter: formatters.number,
    href: '/production/floor-supervisor',
    showSparkline: true
  },
  {
    key: 'outputToday',
    title: 'Output Today',
    icon: 'ri-truck-line',
    color: CHART_COLORS.success[0],
    formatter: formatters.number,
    href: '/production/dispatch-stn-list',
    showSparkline: true
  },
  {
    key: 'firstPassYield',
    title: 'First-Pass Yield',
    icon: 'ri-shield-check-line',
    color: CHART_COLORS.info[0],
    formatter: formatters.percentage,
    href: '/production/m2-management',
    showSparkline: true
  },
  {
    key: 'machineUtilization',
    title: 'Machine Util.',
    icon: 'ri-cpu-line',
    color: CHART_COLORS.warning[0],
    formatter: formatters.percentage,
    href: '/production/floor-supervisor/knitting',
    showSparkline: false
  },
  {
    key: 'openOrders',
    title: 'Open Orders',
    icon: 'ri-file-list-3-line',
    color: CHART_COLORS.primary[1],
    formatter: formatters.number,
    href: '/production/orders',
    showSparkline: false
  },
  {
    key: 'readyToDispatch',
    title: 'Ready to Dispatch',
    icon: 'ri-inbox-archive-line',
    color: CHART_COLORS.success[1],
    formatter: formatters.number,
    href: '/production/dispatch-receiving',
    showSparkline: true
  }
];

/**
 * Zone A: KPI Strip
 * 6 headline KPI cards with sparklines
 */
const KpiStrip: React.FC<KpiStripProps> = ({ kpis, loading = false }) => {
  // Generate fake sparkline data for demo
  const generateSparkline = (base: number): number[] => {
    return Array.from({ length: 12 }, (_, i) => 
      Math.max(0, base * (0.8 + Math.random() * 0.4))
    );
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {kpiConfig.map(config => {
        const kpiData = kpis?.[config.key];
        const value = kpiData?.value ?? 0;
        const isLoading = loading && !kpis;
        
        const CardWrapper = config.href ? Link : 'div';
        
        return (
          <CardWrapper
            key={config.key}
            href={config.href || '#'}
            className={`
              bg-white rounded-lg border border-gray-200 p-4 
              transition-all duration-200
              ${config.href ? 'hover:shadow-md hover:border-gray-300 cursor-pointer' : ''}
              ${isLoading ? 'animate-pulse' : ''}
            `}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {config.title}
              </span>
              <div 
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${config.color}15` }}
              >
                <i className={`${config.icon} text-sm`} style={{ color: config.color }} />
              </div>
            </div>

            {/* Value */}
            <div className="mb-2">
              {isLoading ? (
                <div className="h-7 bg-gray-200 rounded w-20" />
              ) : (
                <span className="text-2xl font-bold text-gray-900">
                  {config.formatter(value)}
                </span>
              )}
            </div>

            {/* Sparkline or subtitle */}
            <div className="flex items-center gap-2">
              {kpiData && 'stnCount' in kpiData && (
                <span className="text-xs text-gray-500">
                  {(kpiData as any).stnCount} STNs
                </span>
              )}
              {kpiData && 'machinesWithWork' in kpiData && (
                <span className="text-xs text-gray-500">
                  {(kpiData as any).machinesWithWork}/{(kpiData as any).activeMachines} active
                </span>
              )}
              {config.showSparkline && !isLoading && (
                <div className="flex-1">
                  <SparklineChart
                    data={generateSparkline(value)}
                    height={24}
                    color={config.color}
                    trend={kpiData?.deltaDirection || 'neutral'}
                  />
                </div>
              )}
            </div>

            {/* Delta indicator */}
            {kpiData?.delta !== undefined && (
              <div className={`
                mt-2 text-xs font-medium flex items-center gap-1
                ${kpiData.deltaDirection === 'up' ? 'text-emerald-600' : ''}
                ${kpiData.deltaDirection === 'down' ? 'text-red-600' : ''}
                ${kpiData.deltaDirection === 'neutral' ? 'text-gray-500' : ''}
              `}>
                <i className={`
                  ${kpiData.deltaDirection === 'up' ? 'ri-arrow-up-line' : ''}
                  ${kpiData.deltaDirection === 'down' ? 'ri-arrow-down-line' : ''}
                  ${kpiData.deltaDirection === 'neutral' ? 'ri-arrow-right-line' : ''}
                `} />
                {kpiData.delta > 0 ? '+' : ''}{kpiData.delta}% vs prev
              </div>
            )}
          </CardWrapper>
        );
      })}
    </div>
  );
};

export default KpiStrip;
