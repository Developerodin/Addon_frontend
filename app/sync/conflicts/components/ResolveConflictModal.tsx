'use client';

import React, { useEffect, useId, useState } from 'react';
import type { ReviewConflict, SyncDecision } from '@/shared/services/syncReviewService';
import { getDecisionOptions } from '../utils/conflictLabels';

interface ResolveConflictModalProps {
  open: boolean;
  conflict: ReviewConflict | null;
  serverSiteId: string | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: (decision: SyncDecision, note: string) => void;
}

export default function ResolveConflictModal({
  open,
  conflict,
  serverSiteId,
  busy,
  onClose,
  onConfirm,
}: ResolveConflictModalProps) {
  const titleId = useId();
  const [decision, setDecision] = useState<SyncDecision | null>(null);
  const [note, setNote] = useState('');
  const [ack, setAck] = useState(false);

  useEffect(() => {
    if (open) {
      setDecision(null);
      setNote('');
      setAck(false);
    }
  }, [open, conflict?.id]);

  if (!open || !conflict) return null;

  const options = getDecisionOptions(serverSiteId, conflict.factorySiteId, conflict.cloudSiteId);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-100">
        <header className="px-4 py-3 border-b border-gray-100">
          <h2 id={titleId} className="text-sm font-bold text-gray-900">
            Record decision
          </h2>
          <p className="text-[11px] text-gray-500 mt-1 font-mono truncate">{conflict.aggregateId}</p>
          {conflict.changedKeys.length > 0 && (
            <p className="text-[10px] text-amber-800 mt-1">
              Conflicting fields: {conflict.changedKeys.join(', ')}
            </p>
          )}
        </header>

        <div className="px-4 py-3 space-y-2">
          {options.map((opt) => (
            <label
              key={opt.value}
              className={`flex gap-2 p-3 border rounded cursor-pointer ${
                decision === opt.value ? 'border-purple-400 bg-purple-50' : 'border-gray-100 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="sync-decision"
                checked={decision === opt.value}
                onChange={() => setDecision(opt.value)}
                className="mt-0.5"
              />
              <span>
                <span className="block text-[11px] font-bold text-gray-800">{opt.label}</span>
                <span className="block text-[10px] text-gray-500 mt-0.5">{opt.description}</span>
              </span>
            </label>
          ))}

          <label className="block mt-3">
            <span className="text-[10px] font-bold text-gray-600">Audit note (optional)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 2000))}
              rows={3}
              className="mt-1 w-full border border-gray-200 rounded text-[11px] px-2 py-1.5 focus:border-purple-300 focus:ring-0"
              placeholder="Why this choice, ticket link, etc."
            />
          </label>

          <label className="flex items-start gap-2 mt-2">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              className="mt-0.5 rounded"
            />
            <span className="text-[10px] text-gray-600">
              I understand this records intent only — no order, floor, or quantity is changed in the system.
            </span>
          </label>
        </div>

        <footer className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-3 py-1.5 text-[11px] font-bold border border-gray-200 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !decision || !ack}
            onClick={() => decision && onConfirm(decision, note.trim())}
            className="px-3 py-1.5 text-[11px] font-bold bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Confirm decision'}
          </button>
        </footer>
      </div>
    </div>
  );
}
