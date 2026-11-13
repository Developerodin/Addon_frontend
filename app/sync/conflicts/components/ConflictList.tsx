'use client';

import React, { memo } from 'react';
import type { ReviewConflict } from '@/shared/services/syncReviewService';

interface ConflictListProps {
  conflicts: ReviewConflict[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function relativeAge(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return d.toLocaleDateString();
}

const ConflictListRow = memo(function ConflictListRow({
  row,
  selected,
  onSelect,
}: {
  row: ReviewConflict;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left px-3 py-2 border rounded transition-colors ${
        selected ? 'border-purple-300 bg-purple-50' : 'border-gray-100 hover:bg-gray-50'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-1">
        <span className="text-[11px] font-bold text-gray-800">{row.entityType}</span>
        <span className="text-[10px] text-gray-400">{relativeAge(row.createdAt)}</span>
      </div>
      <p className="text-[10px] font-mono text-gray-600 truncate mt-0.5">{row.aggregateId}</p>
      <div className="flex flex-wrap gap-1 mt-1">
        {row.changedKeys.slice(0, 4).map((k) => (
          <span key={k} className="text-[9px] font-bold bg-amber-100 text-amber-900 px-1 py-0.5 rounded">
            {k}
          </span>
        ))}
        {row.changedKeys.length > 4 && (
          <span className="text-[9px] text-gray-500">+{row.changedKeys.length - 4}</span>
        )}
      </div>
    </button>
  );
});

export default function ConflictList({ conflicts, selectedId, onSelect }: ConflictListProps) {
  if (conflicts.length === 0) {
    return (
      <div className="rounded border border-dashed border-gray-200 p-6 text-center text-[11px] text-gray-500">
        No open conflicts — sync queue is clean for your filters.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-h-[min(70vh,640px)] overflow-y-auto pr-1" role="list">
      {conflicts.map((row) => (
        <ConflictListRow
          key={row.id}
          row={row}
          selected={row.id === selectedId}
          onSelect={() => onSelect(row.id)}
        />
      ))}
    </div>
  );
}
