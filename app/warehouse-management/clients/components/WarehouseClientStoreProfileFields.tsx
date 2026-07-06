'use client';

import React from 'react';
import type { WarehouseClientStoreProfile } from '@/shared/services/whmsWarehouseClientService';

const inputClass =
  'w-full bg-white border border-gray-200 rounded px-3 py-1.5 text-[11px] font-medium text-gray-800 focus:ring-0 focus:border-purple-300 placeholder:text-gray-400';
const labelClass = 'block text-[11px] font-bold text-[#495057] mb-1';

type Props = {
  value: WarehouseClientStoreProfile;
  onChange: (next: WarehouseClientStoreProfile) => void;
};

/**
 * Store-only fields (WHMS warehouse client). Shown when type === Store.
 */
export default function WarehouseClientStoreProfileFields({ value, onChange }: Props) {
  const set = (key: keyof WarehouseClientStoreProfile, v: string) => {
    onChange({ ...value, [key]: v });
  };

  return (
    <div className="border border-gray-100 rounded-md p-4 bg-gray-50/40 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-[3px] h-4 bg-purple-600 rounded-full" />
        <h3 className="text-[11px] font-bold text-gray-800 uppercase tracking-wide">Store profile</h3>
      </div>
      <div className="grid grid-cols-12 gap-3">
        {(
          [
            ['billCode', 'Bill code'],
            ['sapCode', 'SAP code'],
            ['retekCode', 'Retek code'],
            ['classification', 'Classification'],
            ['city', 'City'],
            ['state', 'State'],
            ['brand', 'Brand'],
            ['brandSub', 'Brand sub'],
            ['gst', 'GST'],
            ['storeLandlineNo', 'Store landline'],
            ['smNameAndContact', 'SM name & contact'],
            ['storeMailId', 'Store mail'],
            ['abmNameAndContact', 'ABM name & contact'],
            ['abmMailId', 'ABM mail'],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="col-span-12 sm:col-span-6">
            <label className={labelClass}>{label}</label>
            <input
              type="text"
              className={inputClass}
              value={value[key] ?? ''}
              onChange={(e) => set(key, e.target.value)}
            />
          </div>
        ))}
        <div className="col-span-12 sm:col-span-6">
          <label className={labelClass}>Opening date</label>
          <input
            type="date"
            className={inputClass}
            value={
              value.openingDate
                ? String(value.openingDate).slice(0, 10)
                : ''
            }
            onChange={(e) =>
              onChange({
                ...value,
                openingDate: e.target.value ? `${e.target.value}T00:00:00.000Z` : null,
              })
            }
          />
        </div>
        <div className="col-span-12">
          <label className={labelClass}>Address</label>
          <textarea
            className={`${inputClass} min-h-[72px]`}
            rows={3}
            value={value.address ?? ''}
            onChange={(e) => set('address', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
