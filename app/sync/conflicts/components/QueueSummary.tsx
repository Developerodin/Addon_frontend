'use client';

import React, { useState } from 'react';
import type { ReviewQueue } from '@/shared/services/syncReviewService';

interface QueueSummaryProps {
  queue: ReviewQueue | null;
}

export default function QueueSummary({ queue }: QueueSummaryProps) {
  const [diagOpen, setDiagOpen] = useState(false);
  if (!queue) return null;

  return (
    <section aria-label="Sync queue summary" className="mb-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded border border-red-100 bg-red-50/50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Open conflicts</p>
          <p className="text-xl font-bold text-gray-900">{queue.openConflicts}</p>
          <p className="text-[10px] text-gray-500">Need a decision below</p>
        </div>
        <div className="rounded border border-gray-100 bg-gray-50/80 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Live inbox</p>
          <p className="text-xl font-bold text-gray-900">{queue.inboxLive}</p>
          <p className="text-[10px] text-gray-500">Events waiting (non-test)</p>
        </div>
        <div className="rounded border border-gray-100 bg-gray-50/80 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Waiting to send</p>
          <p className="text-xl font-bold text-gray-900">{queue.outboxPending}</p>
          <p className="text-[10px] text-gray-500">Outbox not yet pushed</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setDiagOpen((v) => !v)}
        className="mt-2 text-[10px] font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1"
        aria-expanded={diagOpen}
      >
        <i className={`ri-arrow-${diagOpen ? 'up' : 'down'}-s-line`} aria-hidden />
        Diagnostics
      </button>
      {diagOpen && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2 text-[10px] text-gray-600 border border-gray-100 rounded p-2 bg-gray-50">
          <p>Rebased (stored, not applied): <strong>{queue.rebased}</strong></p>
          <p>Test probe inbox: <strong>{queue.inboxProbe}</strong></p>
          <p>Total inbox pending: <strong>{queue.inboxPending}</strong></p>
        </div>
      )}
    </section>
  );
}
