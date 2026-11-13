'use client';

import React, { useCallback } from 'react';
import { formatConflictValue, truncateDisplay } from '../utils/conflictLabels';

interface ValueCellProps {
  value: unknown;
  changed?: boolean;
}

export default function ValueCell({ value, changed }: ValueCellProps) {
  const full = formatConflictValue(value);
  const { text, truncated } = truncateDisplay(full);

  const copy = useCallback(() => {
    void navigator.clipboard?.writeText(full);
  }, [full]);

  return (
    <td className={`py-2 pe-3 align-top text-[11px] break-all ${changed ? 'bg-amber-50/80 font-medium' : ''}`}>
      <span title={truncated ? full : undefined}>{text}</span>
      {truncated && (
        <button
          type="button"
          onClick={copy}
          className="ml-1 text-purple-600 text-[10px] font-bold hover:underline"
        >
          Copy
        </button>
      )}
    </td>
  );
}
