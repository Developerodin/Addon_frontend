"use client";
import React, { useEffect, useState } from 'react';
import type { PoReturnChallanListParams } from '@/shared/services/poReturnChallanService';

interface ChallanFiltersProps {
  value: PoReturnChallanListParams;
  onChange: (next: PoReturnChallanListParams) => void;
  resultsCount: number;
}

const inputClass =
  'w-full bg-white border border-gray-300 px-2 py-1.5 text-[11px] rounded focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 placeholder:text-gray-400 transition-colors';
const labelClass = 'block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1';

/**
 * Filter bar for PO return challan history (draft-then-apply).
 */
const ChallanFilters: React.FC<ChallanFiltersProps> = ({ value, onChange, resultsCount }) => {
  const [draft, setDraft] = useState<PoReturnChallanListParams>(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const update = <K extends keyof PoReturnChallanListParams>(key: K, val: PoReturnChallanListParams[K]) => {
    setDraft((d) => ({ ...d, [key]: val === '' ? undefined : val }));
  };

  const apply = () => onChange(draft);
  const reset = () => {
    const empty: PoReturnChallanListParams = {};
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
          <h2 className="text-sm font-bold text-gray-800">Filter Return Challans</h2>
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
          <label htmlFor="challan-filter-number" className={labelClass}>Challan No</label>
          <input
            id="challan-filter-number"
            type="text"
            className={inputClass}
            placeholder="PRC-2026-0001"
            value={draft.challanNumber || ''}
            onChange={(e) => update('challanNumber', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="challan-filter-po" className={labelClass}>PO No</label>
          <input
            id="challan-filter-po"
            type="text"
            className={inputClass}
            placeholder="PO number"
            value={draft.poNumber || ''}
            onChange={(e) => update('poNumber', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="challan-filter-supplier" className={labelClass}>Vendor</label>
          <input
            id="challan-filter-supplier"
            type="text"
            className={inputClass}
            placeholder="Vendor name"
            value={draft.supplierName || ''}
            onChange={(e) => update('supplierName', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="challan-filter-from" className={labelClass}>From</label>
            <input
              id="challan-filter-from"
              type="date"
              className={inputClass}
              value={draft.from || ''}
              onChange={(e) => update('from', e.target.value)}
              aria-label="Start date"
            />
          </div>
          <div>
            <label htmlFor="challan-filter-to" className={labelClass}>To</label>
            <input
              id="challan-filter-to"
              type="date"
              className={inputClass}
              value={draft.to || ''}
              onChange={(e) => update('to', e.target.value)}
              aria-label="End date"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChallanFilters;
