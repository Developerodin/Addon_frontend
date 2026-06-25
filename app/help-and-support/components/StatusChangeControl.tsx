'use client';

import React, { useState } from 'react';
import type { TicketDisposition, TicketStatus } from '@/shared/types/helpSupport';
import { DISPOSITION_LABELS, STATUS_LABELS } from '../helpSupportConstants';

interface StatusChangeControlProps {
  allowedStatuses: TicketStatus[];
  currentDisposition: TicketDisposition;
  onStatusChange: (status: TicketStatus, note?: string) => Promise<void>;
  onDispositionChange: (disposition: TicketDisposition, note?: string) => Promise<void>;
}

/**
 * Agent controls for status and disposition changes.
 */
export default function StatusChangeControl({
  allowedStatuses,
  currentDisposition,
  onStatusChange,
  onDispositionChange,
}: StatusChangeControlProps) {
  const [status, setStatus] = useState<TicketStatus | ''>('');
  const [disposition, setDisposition] = useState<TicketDisposition | ''>('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const handleStatus = async () => {
    if (!status) return;
    setBusy(true);
    try {
      await onStatusChange(status, note || undefined);
      setStatus('');
      setNote('');
    } finally {
      setBusy(false);
    }
  };

  const handleDisposition = async () => {
    if (!disposition) return;
    setBusy(true);
    try {
      await onDispositionChange(disposition, note || undefined);
      setDisposition('');
      setNote('');
    } finally {
      setBusy(false);
    }
  };

  const selectClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100';
  const btnBase =
    'inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <section className="rounded-xl border border-gray-300 bg-white shadow-sm" aria-label="Agent actions">
      <header className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
          <i className="ri-settings-3-line text-sm" aria-hidden />
        </span>
        <h3 className="text-sm font-bold text-gray-900">Agent Actions</h3>
      </header>

      <div className="space-y-4 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="status-change" className="block text-xs font-bold text-gray-700">
              Change status
            </label>
            <select
              id="status-change"
              value={status}
              onChange={(e) => setStatus(e.target.value as TicketStatus)}
              className={selectClass}
            >
              <option value="">Select next status</option>
              {allowedStatuses.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!status || busy}
              onClick={handleStatus}
              className={`${btnBase} bg-indigo-600 text-white hover:bg-indigo-700`}
            >
              <i className="ri-refresh-line" aria-hidden />
              Update Status
            </button>
          </div>

          <div className="space-y-2">
            <label htmlFor="disposition-change" className="block text-xs font-bold text-gray-700">
              Set disposition
            </label>
            <select
              id="disposition-change"
              value={disposition}
              onChange={(e) => setDisposition(e.target.value as TicketDisposition)}
              className={selectClass}
            >
              <option value="">Select disposition</option>
              {Object.entries(DISPOSITION_LABELS).map(([value, label]) => (
                <option key={value} value={value} disabled={value === currentDisposition}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!disposition || busy}
              onClick={handleDisposition}
              className={`${btnBase} border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100`}
            >
              <i className="ri-price-tag-3-line" aria-hidden />
              Update Disposition
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="agent-note" className="block text-xs font-bold text-gray-700">
            Note <span className="font-medium text-gray-500">(optional)</span>
          </label>
          <textarea
            id="agent-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            placeholder="Add a reason that will be saved to the timeline..."
          />
        </div>
      </div>
    </section>
  );
}
