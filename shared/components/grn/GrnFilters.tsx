"use client";
import React, { useEffect, useState } from 'react';
import type { YarnGrnListParams } from '@/shared/services/yarnGrnService';

interface GrnFiltersProps {
  value: YarnGrnListParams;
  onChange: (next: YarnGrnListParams) => void;
  resultsCount: number;
}

const inputClass =
  'w-full bg-white border border-gray-300 px-2 py-1.5 text-[11px] rounded focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 placeholder:text-gray-400 transition-colors';
const labelClass = 'block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1';

/**
 * Filter bar for the GRN history page. Owns its own draft state so users can
 * tweak multiple fields without firing a fetch on every keystroke. "Apply"
 * commits the draft up to the parent (which then triggers a refetch via the
 * useGrns hook). "Reset" clears every field including the date range.
 */
const GrnFilters: React.FC<GrnFiltersProps> = ({ value, onChange, resultsCount }) => {
  const [draft, setDraft] = useState<YarnGrnListParams>(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const update = <K extends keyof YarnGrnListParams>(key: K, val: YarnGrnListParams[K]) => {
    setDraft((d) => ({ ...d, [key]: val === '' ? undefined : val }));
  };

  const apply = () => onChange(draft);
  const reset = () => {
    const empty: YarnGrnListParams = {};
    setDraft(empty);
    onChange(empty);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') apply();
  };

  return (
    <div className="bg-white shadow-sm border border-gray-100 rounded p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-[3px] h-5 bg-purple-600 rounded-full" aria-hidden />
          <h2 className="text-sm font-bold text-gray-800">Filter GRNs</h2>
          <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
            {resultsCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="text-[11px] text-gray-500 hover:text-gray-700 font-bold uppercase tracking-wider"
            aria-label="Reset all filters"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={apply}
            className="px-3 py-1.5 text-white text-[11px] font-bold rounded bg-purple-600 hover:bg-purple-700 transition-colors"
            aria-label="Apply filters"
          >
            Apply
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3" onKeyDown={onKeyDown}>
        <div>
          <label htmlFor="grn-filter-grnNumber" className={labelClass}>GRN No</label>
          <input
            id="grn-filter-grnNumber"
            type="text"
            className={inputClass}
            placeholder="GRN-2026-0042"
            value={draft.grnNumber || ''}
            onChange={(e) => update('grnNumber', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="grn-filter-poNumber" className={labelClass}>PO No</label>
          <input
            id="grn-filter-poNumber"
            type="text"
            className={inputClass}
            placeholder="PO-2026-001"
            value={draft.poNumber || ''}
            onChange={(e) => update('poNumber', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="grn-filter-lotNumber" className={labelClass}>Lot No</label>
          <input
            id="grn-filter-lotNumber"
            type="text"
            className={inputClass}
            placeholder="LOT-A-1"
            value={draft.lotNumber || ''}
            onChange={(e) => update('lotNumber', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="grn-filter-supplierName" className={labelClass}>Supplier</label>
          <input
            id="grn-filter-supplierName"
            type="text"
            className={inputClass}
            placeholder="Sutlej Textiles"
            value={draft.supplierName || ''}
            onChange={(e) => update('supplierName', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="grn-filter-from" className={labelClass}>From Date</label>
          <input
            id="grn-filter-from"
            type="date"
            className={inputClass}
            value={draft.from || ''}
            onChange={(e) => update('from', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="grn-filter-to" className={labelClass}>To Date</label>
          <input
            id="grn-filter-to"
            type="date"
            className={inputClass}
            value={draft.to || ''}
            onChange={(e) => update('to', e.target.value)}
          />
        </div>
        <div className="flex items-end gap-3">
          <label className="inline-flex items-center gap-2 text-[11px] font-bold text-gray-700">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              checked={!!draft.includeSuperseded}
              onChange={(e) => update('includeSuperseded', e.target.checked || undefined)}
              aria-label="Include superseded revisions"
            />
            Include superseded
          </label>
          <label className="inline-flex items-center gap-2 text-[11px] font-bold text-gray-700">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              checked={!!draft.isLegacy}
              onChange={(e) => update('isLegacy', e.target.checked || undefined)}
              aria-label="Show legacy GRNs only"
            />
            Legacy only
          </label>
        </div>
      </div>
    </div>
  );
};

export default GrnFilters;
