'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { helpSupportService } from '@/shared/services/helpSupportService';
import type { AnalyticsSummary, TimeInStatusAnalytics } from '@/shared/types/helpSupport';
import { humanizeDuration } from '@/shared/utils/duration.util';
import TicketAnalyticsCharts, { AgentRow, TrendData } from './TicketAnalyticsCharts';

interface KpiCard {
  label: string;
  value: string | number;
  icon: string;
  tone: string;
}

/**
 * Analytics dashboard tab for agents/admins, with KPI cards and charts.
 */
export default function AnalyticsTab() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [timeData, setTimeData] = useState<TimeInStatusAnalytics | null>(null);
  const [byStatus, setByStatus] = useState<{ status: string; count: number }[]>([]);
  const [byDisposition, setByDisposition] = useState<{ disposition: string; count: number }[]>([]);
  const [trend, setTrend] = useState<TrendData | null>(null);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, t, bs, bd, tr, aw] = await Promise.all([
        helpSupportService.getAnalyticsSummary(),
        helpSupportService.getTimeInStatus(),
        helpSupportService.getByStatus() as Promise<{ results: { status: string; count: number }[] }>,
        helpSupportService.getByDisposition() as Promise<{
          results: { disposition: string; count: number }[];
        }>,
        helpSupportService.getTrend() as Promise<TrendData>,
        helpSupportService.getAgentWorkload() as Promise<{ results: AgentRow[] }>,
      ]);
      setSummary(s);
      setTimeData(t);
      setByStatus(bs.results || []);
      setByDisposition(bd.results || []);
      setTrend(tr);
      setAgents(aw.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-72 animate-pulse rounded-xl bg-gray-100" />
          <div className="h-72 animate-pulse rounded-xl bg-gray-100" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-red-100 bg-red-50/50 py-12 text-center">
        <i className="ri-error-warning-line text-3xl text-red-400" aria-hidden />
        <p className="mt-2 text-sm text-red-500">{error}</p>
        <button
          type="button"
          onClick={load}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
        >
          <i className="ri-refresh-line" aria-hidden /> Retry
        </button>
      </div>
    );
  }

  const cards: KpiCard[] = [
    { label: 'Total Tickets', value: summary?.totalTickets ?? 0, icon: 'ri-ticket-2-line', tone: 'bg-indigo-50 text-indigo-600' },
    { label: 'Open', value: summary?.openCount ?? 0, icon: 'ri-folder-open-line', tone: 'bg-amber-50 text-amber-600' },
    { label: 'Resolved', value: summary?.resolvedCount ?? 0, icon: 'ri-check-double-line', tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'Closed', value: summary?.closedCount ?? 0, icon: 'ri-archive-line', tone: 'bg-slate-100 text-slate-600' },
    { label: 'Avg First Response', value: humanizeDuration(summary?.avgTimeToFirstResponseMs), icon: 'ri-chat-smile-2-line', tone: 'bg-blue-50 text-blue-600' },
    { label: 'Avg Resolution', value: humanizeDuration(summary?.avgTimeToResolutionMs), icon: 'ri-timer-flash-line', tone: 'bg-violet-50 text-violet-600' },
    {
      label: 'SLA Breaches',
      value: `${summary?.slaBreachCount ?? 0} (${Math.round((summary?.slaBreachRate ?? 0) * 100)}%)`,
      icon: 'ri-alarm-warning-line',
      tone: 'bg-red-50 text-red-600',
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.tone}`}>
                <i className={`${card.icon} text-base`} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-600">{card.label}</p>
                <p className="mt-0.5 truncate text-lg font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <TicketAnalyticsCharts
        byStatus={byStatus}
        byDisposition={byDisposition}
        timeData={timeData}
        trend={trend}
        agents={agents}
      />
    </div>
  );
}
