'use client';

import React, { useMemo, useState } from 'react';
import type { ReviewConflict } from '@/shared/services/syncReviewService';
import ValueCell from './ValueCell';

const HIDDEN_UNLESS_CHANGED = new Set(['base', 'probe', 'flowId']);

interface ConflictDetailPanelProps {
  conflict: ReviewConflict | null;
  onRecordDecision: () => void;
}

export default function ConflictDetailPanel({ conflict, onRecordDecision }: ConflictDetailPanelProps) {
  const [showAllFields, setShowAllFields] = useState(false);

  const keys = useMemo(() => {
    if (!conflict) return [];
    const changed = new Set(conflict.changedKeys);
    if (!showAllFields) {
      return [...conflict.changedKeys].sort((a, b) => a.localeCompare(b));
    }
    return Array.from(
      new Set([
        ...Object.keys(conflict.base || {}),
        ...Object.keys(conflict.factory || {}),
        ...Object.keys(conflict.cloud || {}),
      ])
    )
      .filter((k) => k !== 'base' && (changed.has(k) || !HIDDEN_UNLESS_CHANGED.has(k)))
      .sort((a, b) => Number(changed.has(b)) - Number(changed.has(a)) || a.localeCompare(b));
  }, [conflict, showAllFields]);

  if (!conflict) {
    return (
      <div className="rounded border border-gray-100 bg-gray-50/50 p-8 text-center text-[11px] text-gray-500 min-h-[200px] flex items-center justify-center">
        Select a conflict from the list to compare values and record a decision.
      </div>
    );
  }

  const changed = new Set(conflict.changedKeys);

  return (
    <article className="rounded border border-gray-100 overflow-hidden" aria-labelledby="conflict-detail-title">
      <header className="px-3 py-2 border-b border-gray-100 bg-gray-50/80 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="conflict-detail-title" className="text-[11px] font-bold text-gray-800">
            {conflict.entityType} · {conflict.aggregateId}
          </h2>
          <p className="text-[10px] text-gray-500">
            Opened {new Date(conflict.createdAt).toLocaleString()} · v{conflict.aggregateVersion ?? '—'}
          </p>
        </div>
        <button
          type="button"
          onClick={onRecordDecision}
          className="px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700"
        >
          Record decision…
        </button>
      </header>

      <div className="px-3 py-2 flex items-center gap-2 border-b border-gray-50">
        <label className="flex items-center gap-1.5 text-[10px] text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showAllFields}
            onChange={(e) => setShowAllFields(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show all fields (not just conflicting)
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left" aria-label="Field comparison">
          <thead>
            <tr className="border-b border-gray-100 text-[10px] font-bold uppercase text-gray-500">
              <th className="py-2 px-3">Field</th>
              <th className="py-2 px-3">Base</th>
              <th className="py-2 px-3">
                Factory{conflict.factorySiteId ? ` (${conflict.factorySiteId})` : ''}
              </th>
              <th className="py-2 px-3">
                Cloud{conflict.cloudSiteId ? ` (${conflict.cloudSiteId})` : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 px-3 text-[11px] text-gray-500">
                  No fields to show.
                </td>
              </tr>
            ) : (
              keys.map((key) => {
                const isChanged = changed.has(key);
                return (
                  <tr key={key} className="border-b border-gray-50">
                    <th scope="row" className="py-2 px-3 text-[11px] font-semibold text-gray-800 align-top">
                      {key}
                      {isChanged && (
                        <span className="ml-1 text-[9px] font-bold text-amber-700">(both changed)</span>
                      )}
                    </th>
                    <ValueCell value={conflict.base?.[key]} changed={isChanged} />
                    <ValueCell value={conflict.factory?.[key]} changed={isChanged} />
                    <ValueCell value={conflict.cloud?.[key]} changed={isChanged} />
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}
