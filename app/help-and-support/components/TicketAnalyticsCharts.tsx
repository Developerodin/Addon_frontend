'use client';

import React from 'react';
import SafeChart from '@/shared/components/SafeChart';
import { humanizeDuration } from '@/shared/utils/duration.util';
import type { TimeInStatusAnalytics } from '@/shared/types/helpSupport';
import { CATEGORY_LABELS, DISPOSITION_LABELS, STATUS_LABELS } from '../helpSupportConstants';

export interface TrendData {
  bucket: string;
  created: { period: string; count: number }[];
  resolved: { period: string; count: number }[];
}

export interface AgentRow {
  agentId: string;
  agentName?: string;
  agentEmail?: string;
  openCount: number;
  totalAssigned: number;
  avgResolutionMs?: number | null;
}

interface ChartsProps {
  byStatus: { status: string; count: number }[];
  byDisposition: { disposition: string; count: number }[];
  timeData: TimeInStatusAnalytics | null;
  trend: TrendData | null;
  agents: AgentRow[];
}

const STATUS_PALETTE = [
  '#6366f1', '#f59e0b', '#3b82f6', '#8b5cf6', '#64748b',
  '#ec4899', '#10b981', '#f97316', '#22c55e', '#ef4444',
];
const DISPOSITION_PALETTE = [
  '#94a3b8', '#6366f1', '#10b981', '#f59e0b', '#3b82f6',
  '#a855f7', '#ef4444', '#f97316', '#0ea5e9', '#ec4899',
];

const baseChart = (extra: Record<string, unknown> = {}) => ({
  chart: { toolbar: { show: false }, fontFamily: 'inherit', ...extra },
  dataLabels: { enabled: false },
  legend: { fontSize: '12px', labels: { colors: '#6b7280' }, markers: { radius: 4 } },
  grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
});

/** Card wrapper for a chart. */
function ChartCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold tracking-tight text-gray-800">
        <i className={`${icon} text-indigo-500`} aria-hidden />
        {title}
      </h3>
      {children}
    </div>
  );
}

/** Empty placeholder when a chart has no data. */
function NoData() {
  return (
    <div className="flex h-[260px] items-center justify-center text-xs text-gray-400">
      <div className="text-center">
        <i className="ri-bar-chart-box-line mb-1 block text-2xl text-gray-300" aria-hidden />
        No data for this range
      </div>
    </div>
  );
}

/**
 * ApexCharts-based visualisations for Help & Support analytics.
 */
export default function TicketAnalyticsCharts({
  byStatus,
  byDisposition,
  timeData,
  trend,
  agents,
}: ChartsProps) {
  // Tickets by status (donut)
  const statusRows = byStatus.filter((r) => r.count > 0);
  const statusLabels = statusRows.map((r) => STATUS_LABELS[r.status as keyof typeof STATUS_LABELS] || r.status);
  const statusSeries = statusRows.map((r) => r.count);

  // Tickets by disposition (donut)
  const dispRows = byDisposition.filter((r) => r.count > 0);
  const dispLabels = dispRows.map(
    (r) => DISPOSITION_LABELS[r.disposition as keyof typeof DISPOSITION_LABELS] || r.disposition
  );
  const dispSeries = dispRows.map((r) => r.count);

  // Avg time in status (horizontal bar, hours)
  const timeRows = timeData
    ? Object.entries(timeData.perStatus)
        .filter(([, v]) => v.avgMs > 0)
        .sort((a, b) => b[1].avgMs - a[1].avgMs)
    : [];
  const timeLabels = timeRows.map(([s]) => STATUS_LABELS[s as keyof typeof STATUS_LABELS] || s);
  const timeValues = timeRows.map(([, v]) => Number((v.avgMs / 3_600_000).toFixed(2)));
  const timeRaw = timeRows.map(([, v]) => v.avgMs);

  // Created vs resolved trend (area)
  const trendPeriods = Array.from(
    new Set([...(trend?.created || []), ...(trend?.resolved || [])].map((r) => r.period))
  ).sort();
  const createdMap = new Map((trend?.created || []).map((r) => [r.period, r.count]));
  const resolvedMap = new Map((trend?.resolved || []).map((r) => [r.period, r.count]));
  const trendCreated = trendPeriods.map((p) => createdMap.get(p) || 0);
  const trendResolved = trendPeriods.map((p) => resolvedMap.get(p) || 0);

  // Agent workload (stacked-ish bar)
  const agentLabels = agents.map((a) => a.agentName || a.agentEmail || 'Unknown');
  const agentOpen = agents.map((a) => a.openCount);
  const agentResolved = agents.map((a) => Math.max(0, a.totalAssigned - a.openCount));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Tickets by Status" icon="ri-pie-chart-2-line">
        {statusSeries.length ? (
          <SafeChart
            type="donut"
            height={280}
            chartTitle="Tickets by Status"
            series={statusSeries}
            options={{
              ...baseChart(),
              labels: statusLabels,
              colors: STATUS_PALETTE,
              legend: { position: 'bottom', fontSize: '12px', labels: { colors: '#6b7280' } },
              plotOptions: {
                pie: { donut: { size: '62%', labels: { show: true, total: { show: true, label: 'Total' } } } },
              },
            }}
          />
        ) : (
          <NoData />
        )}
      </ChartCard>

      <ChartCard title="Tickets by Disposition" icon="ri-donut-chart-line">
        {dispSeries.length ? (
          <SafeChart
            type="donut"
            height={280}
            chartTitle="Tickets by Disposition"
            series={dispSeries}
            options={{
              ...baseChart(),
              labels: dispLabels,
              colors: DISPOSITION_PALETTE,
              legend: { position: 'bottom', fontSize: '12px', labels: { colors: '#6b7280' } },
              plotOptions: { pie: { donut: { size: '62%' } } },
            }}
          />
        ) : (
          <NoData />
        )}
      </ChartCard>

      <ChartCard title="Created vs Resolved" icon="ri-line-chart-line">
        {trendPeriods.length ? (
          <SafeChart
            type="area"
            height={280}
            chartTitle="Created vs Resolved"
            series={[
              { name: 'Created', data: trendCreated },
              { name: 'Resolved', data: trendResolved },
            ]}
            options={{
              ...baseChart(),
              colors: ['#6366f1', '#10b981'],
              stroke: { curve: 'smooth', width: 2 },
              fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.05 } },
              xaxis: { categories: trendPeriods, labels: { style: { colors: '#9ca3af', fontSize: '11px' } } },
              yaxis: { labels: { style: { colors: '#9ca3af' } }, min: 0, forceNiceScale: true },
              legend: { position: 'top', horizontalAlign: 'right' },
            }}
          />
        ) : (
          <NoData />
        )}
      </ChartCard>

      <ChartCard title="Avg Time in Status" icon="ri-time-line">
        {timeValues.length ? (
          <SafeChart
            type="bar"
            height={280}
            chartTitle="Avg Time in Status"
            series={[{ name: 'Avg time', data: timeValues }]}
            options={{
              ...baseChart(),
              colors: ['#8b5cf6'],
              plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '60%' } },
              xaxis: {
                categories: timeLabels,
                labels: { style: { colors: '#9ca3af', fontSize: '11px' }, formatter: (v: string) => `${v}h` },
              },
              yaxis: { labels: { style: { colors: '#6b7280', fontSize: '11px' } } },
              tooltip: {
                y: { formatter: (_v: number, opts: { dataPointIndex: number }) => humanizeDuration(timeRaw[opts.dataPointIndex]) },
              },
            }}
          />
        ) : (
          <NoData />
        )}
      </ChartCard>

      {agents.length > 0 && (
        <ChartCard title="Agent Workload" icon="ri-team-line">
          <SafeChart
            type="bar"
            height={300}
            chartTitle="Agent Workload"
            series={[
              { name: 'Open', data: agentOpen },
              { name: 'Resolved/Closed', data: agentResolved },
            ]}
            options={{
              ...baseChart(),
              colors: ['#f59e0b', '#10b981'],
              plotOptions: { bar: { horizontal: false, borderRadius: 4, columnWidth: '45%', stacked: true } },
              chart: { stacked: true, toolbar: { show: false }, fontFamily: 'inherit' },
              xaxis: { categories: agentLabels, labels: { style: { colors: '#9ca3af', fontSize: '11px' } } },
              yaxis: { labels: { style: { colors: '#9ca3af' } }, min: 0 },
              legend: { position: 'top', horizontalAlign: 'right' },
            }}
          />
        </ChartCard>
      )}
    </div>
  );
}
