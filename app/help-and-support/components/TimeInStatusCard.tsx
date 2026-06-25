'use client';

import React from 'react';
import type { TicketStatus } from '@/shared/types/helpSupport';
import { humanizeDuration } from '@/shared/utils/duration.util';
import { STATUS_DOT, STATUS_LABELS } from '../helpSupportConstants';

interface TimeInStatusCardProps {
  timeInStatus?: Record<string, number>;
  currentStatus?: TicketStatus;
}

const TRACKED: TicketStatus[] = [
  'raised',
  'pending',
  'in_progress',
  'in_review',
  'on_hold',
  'awaiting_user',
  'resolved',
  'reopened',
];

/**
 * Bar breakdown of time spent per status.
 */
export default function TimeInStatusCard({ timeInStatus, currentStatus }: TimeInStatusCardProps) {
  const entries = TRACKED.map((status) => ({
    status,
    ms: timeInStatus?.[status] || 0,
  })).filter((e) => e.ms > 0);

  const total = entries.reduce((s, e) => s + e.ms, 0) || 1;

  return (
    <section className="rounded-xl border border-gray-300 bg-white shadow-sm" aria-label="Time in status">
      <header className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
          <i className="ri-pie-chart-2-line text-sm" aria-hidden />
        </span>
        <h3 className="text-sm font-bold text-gray-900">Time in Status</h3>
      </header>

      <div className="p-4">
        {!entries.length ? (
          <p className="text-sm font-medium text-gray-500">No time recorded yet.</p>
        ) : (
          <div className="space-y-3" role="list">
            {entries.map(({ status, ms }) => {
              const pct = Math.round((ms / total) * 100);
              const isCurrent = status === currentStatus;
              return (
                <div key={status} role="listitem">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} aria-hidden />
                      <span className={isCurrent ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}>
                        {STATUS_LABELS[status]}
                      </span>
                      {isCurrent && (
                        <span className="rounded bg-indigo-50 px-1 py-px text-[9px] font-semibold text-indigo-600">
                          LIVE
                        </span>
                      )}
                    </span>
                    <span className="font-semibold text-gray-600">{humanizeDuration(ms)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full rounded-full ${STATUS_DOT[status]}`}
                      style={{ width: `${pct}%` }}
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${STATUS_LABELS[status]} ${pct}%`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
