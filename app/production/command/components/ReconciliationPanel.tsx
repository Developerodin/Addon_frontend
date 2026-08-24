"use client";

import React from 'react';
import { formatters } from '@/shared/components/recharts/chartConfig';
import InfoTooltip, { SECTION_INFO } from './InfoTooltip';
import type { ReconciliationData } from '../types';

interface ReconciliationPanelProps {
  data?: ReconciliationData;
  loading?: boolean;
}

/**
 * Zone L: Reconciliation Panel
 * Identity check - does input = output + WIP + losses?
 */
const ReconciliationPanel: React.FC<ReconciliationPanelProps> = ({
  data,
  loading = false
}) => {
  if (loading && !data) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 h-48 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-40 mb-4" />
        <div className="grid grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const planned = data?.planned || 0;
  const dispatched = data?.dispatched || 0;
  const wip = data?.wip || 0;
  const m3Out = data?.m3Out || 0;
  const m4Out = data?.m4Out || 0;
  const unaccounted = data?.unaccounted || 0;
  const unaccountedPct = data?.unaccountedPct || 0;
  const isHealthy = data?.isHealthy ?? true;

  const segments = [
    { label: 'Dispatched', value: dispatched, color: 'bg-emerald-500', textColor: 'text-emerald-700' },
    { label: 'WIP', value: wip, color: 'bg-blue-500', textColor: 'text-blue-700' },
    { label: 'M3 Out', value: m3Out, color: 'bg-amber-500', textColor: 'text-amber-700' },
    { label: 'M4 Out', value: m4Out, color: 'bg-red-500', textColor: 'text-red-700' }
  ];

  const accounted = dispatched + wip + m3Out + m4Out;
  const getWidthPercent = (value: number) => planned > 0 ? (value / planned) * 100 : 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 pt-4 pb-2 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Reconciliation</h3>
              <p className="text-xs text-gray-500">Planned vs Accounted quantities</p>
            </div>
            <InfoTooltip {...SECTION_INFO.reconciliation} />
          </div>
          <span className={`
            inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
            ${isHealthy 
              ? 'bg-emerald-50 text-emerald-700' 
              : 'bg-red-50 text-red-700'}
          `}>
            <i className={`mr-1 ${isHealthy ? 'ri-check-line' : 'ri-alert-line'}`} />
            {isHealthy ? 'Healthy' : 'Drift Detected'}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Visual bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Distribution of {formatters.number(planned)} planned pairs</span>
            <span className="text-gray-500">{((accounted / planned) * 100).toFixed(1)}% accounted</span>
          </div>
          <div className="h-6 bg-gray-100 rounded-full overflow-hidden flex">
            {segments.map((seg, idx) => (
              <div
                key={seg.label}
                className={`${seg.color} transition-all duration-500`}
                style={{ width: `${getWidthPercent(seg.value)}%` }}
                title={`${seg.label}: ${formatters.number(seg.value)}`}
              />
            ))}
            {unaccounted > 0 && (
              <div
                className="bg-gray-400 transition-all duration-500"
                style={{ width: `${getWidthPercent(unaccounted)}%` }}
                title={`Unaccounted: ${formatters.number(unaccounted)}`}
              />
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs">
          {segments.map((seg) => (
            <div key={seg.label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded ${seg.color}`} />
              <span className="text-gray-500">{seg.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gray-400" />
            <span className="text-gray-500">Unaccounted</span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-6 gap-2">
          <div className="text-center p-2 rounded-lg bg-gray-50">
            <div className="text-lg font-bold text-gray-700">
              {formatters.compact(planned)}
            </div>
            <div className="text-[10px] text-gray-500">Planned</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-emerald-50">
            <div className="text-lg font-bold text-emerald-700">
              {formatters.compact(dispatched)}
            </div>
            <div className="text-[10px] text-emerald-600">Dispatched</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-blue-50">
            <div className="text-lg font-bold text-blue-700">
              {formatters.compact(wip)}
            </div>
            <div className="text-[10px] text-blue-600">WIP</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-amber-50">
            <div className="text-lg font-bold text-amber-700">
              {formatters.compact(m3Out)}
            </div>
            <div className="text-[10px] text-amber-600">M3 Out</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-red-50">
            <div className="text-lg font-bold text-red-700">
              {formatters.compact(m4Out)}
            </div>
            <div className="text-[10px] text-red-600">M4 Out</div>
          </div>
          <div className={`text-center p-2 rounded-lg ${isHealthy ? 'bg-gray-50' : 'bg-rose-50'}`}>
            <div className={`text-lg font-bold ${isHealthy ? 'text-gray-700' : 'text-rose-700'}`}>
              {formatters.compact(Math.abs(unaccounted))}
            </div>
            <div className={`text-[10px] ${isHealthy ? 'text-gray-500' : 'text-rose-600'}`}>
              {unaccounted >= 0 ? 'Unaccounted' : 'Over'}
            </div>
          </div>
        </div>

        {/* Formula explanation */}
        <div className="text-[10px] text-gray-400 text-center pt-2 border-t border-gray-100">
          Planned = Dispatched + WIP + M3 + M4 + Unaccounted
          {!isHealthy && (
            <span className="text-rose-500 ml-2">
              ({unaccountedPct > 0 ? '+' : ''}{unaccountedPct}% drift)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReconciliationPanel;
