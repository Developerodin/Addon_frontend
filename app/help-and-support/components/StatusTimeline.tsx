'use client';

import React from 'react';
import type { StatusHistoryEntry, TicketStatus } from '@/shared/types/helpSupport';
import { humanizeDuration } from '@/shared/utils/duration.util';
import { STATUS_DOT, STATUS_LABELS, userDisplayName } from '../helpSupportConstants';

interface StatusTimelineProps {
  history: StatusHistoryEntry[];
}

/**
 * Vertical timeline of status changes with durations.
 */
export default function StatusTimeline({ history }: StatusTimelineProps) {
  if (!history?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <i className="ri-time-line text-2xl text-gray-300" aria-hidden />
        <p className="mt-1 text-sm font-medium text-gray-500">No status history yet.</p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-5 ps-2" aria-label="Status timeline">
      {history.map((entry, idx) => {
        const status = entry.toStatus as TicketStatus;
        const isCurrent = !entry.exitedAt;
        const isLast = idx === history.length - 1;
        const duration =
          entry.durationMs != null ? humanizeDuration(entry.durationMs) : isCurrent ? 'In progress' : '—';

        return (
          <li key={entry.id || idx} className="relative ps-6">
            {!isLast && (
              <span className="absolute left-[5px] top-4 h-full w-px bg-gray-300" aria-hidden />
            )}
            <span
              className={`absolute left-0 top-1 h-[11px] w-[11px] rounded-full ring-4 ring-white ${STATUS_DOT[status] || 'bg-gray-300'} ${
                isCurrent ? 'animate-pulse' : ''
              }`}
              aria-hidden
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold text-gray-900">{STATUS_LABELS[status]}</span>
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                  isCurrent ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {duration}
              </span>
            </div>
            <p className="mt-0.5 text-xs font-medium text-gray-500">
              {new Date(entry.enteredAt).toLocaleString()}
              {entry.changedBy && (
                <>
                  {' · '}
                  <span className="font-semibold text-gray-700">
                    {userDisplayName(entry.changedBy as { name?: string; email?: string })}
                  </span>
                </>
              )}
            </p>
            {entry.note && (
              <p className="mt-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-700">{entry.note}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
