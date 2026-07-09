'use client';

import React from 'react';
import type { WarehouseClientStoreProfile } from '@/shared/services/whmsWarehouseClientService';
import { STORE_PROFILE_FIELDS } from './warehouseClientFieldConfig';
import {
  normalizeWarehouseClientInput,
  validateWarehouseClientField,
  UPPERCASE_STORE_PROFILE_FIELDS,
} from './warehouseClientFieldRules';

const STORE_UPPERCASE_KEYS = UPPERCASE_STORE_PROFILE_FIELDS;

const inputClass =
  'w-full bg-white border border-gray-200 rounded px-3 py-1.5 text-[11px] font-medium text-gray-800 focus:ring-0 focus:border-purple-300 placeholder:text-gray-400';
const labelClass = 'block text-[11px] font-bold text-[#495057] mb-1';

type Props = {
  value: WarehouseClientStoreProfile;
  onChange: (next: WarehouseClientStoreProfile) => void;
};

/** Text profile fields excluding opening date and address textarea. */
const TEXT_PROFILE_FIELDS = STORE_PROFILE_FIELDS.filter(
  (f) => f.key !== 'address' && f.key !== 'openingDate',
);

/**
 * Store-only fields (WHMS warehouse client). Shown when type === Store.
 */
export default function WarehouseClientStoreProfileFields({ value, onChange }: Props) {
  const [fieldErrors, setFieldErrors] = React.useState<Partial<Record<keyof WarehouseClientStoreProfile, string>>>({});

  const set = (key: keyof WarehouseClientStoreProfile, v: string) => {
    const next = STORE_UPPERCASE_KEYS.has(key) ? normalizeWarehouseClientInput(key, v) : v;
    onChange({ ...value, [key]: next });
    if (key === 'city' || key === 'state') {
      const err = validateWarehouseClientField(key, next);
      setFieldErrors((prev) => {
        const copy = { ...prev };
        if (err) copy[key] = err;
        else delete copy[key];
        return copy;
      });
    }
  };

  return (
    <div className="border border-gray-100 rounded-md p-4 bg-gray-50/40 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-[3px] h-4 bg-purple-600 rounded-full" />
        <h3 className="text-[11px] font-bold text-gray-800 uppercase tracking-wide">Store profile</h3>
      </div>
      <div className="grid grid-cols-12 gap-3">
        {TEXT_PROFILE_FIELDS.map(({ key, label }) => {
          const isUpper = STORE_UPPERCASE_KEYS.has(key);
          const err = fieldErrors[key];
          return (
            <div key={key} className="col-span-12 sm:col-span-6">
              <label className={labelClass} htmlFor={`wh-store-${key}`}>
                {label}
              </label>
              <input
                id={`wh-store-${key}`}
                type="text"
                className={`${inputClass}${isUpper ? ' uppercase' : ''}${err ? ' border-red-300 focus:border-red-400' : ''}`}
                maxLength={key === 'city' ? 100 : key === 'state' ? 50 : undefined}
                aria-invalid={err ? true : undefined}
                aria-describedby={err ? `wh-store-${key}-error` : undefined}
                value={value[key] ?? ''}
                onChange={(e) => set(key, e.target.value)}
                onBlur={() => {
                  if (key !== 'city' && key !== 'state') return;
                  const raw = value[key] ?? '';
                  const msg = validateWarehouseClientField(key, raw);
                  setFieldErrors((prev) => {
                    const copy = { ...prev };
                    if (msg) copy[key] = msg;
                    else delete copy[key];
                    return copy;
                  });
                }}
              />
              {err ? (
                <p id={`wh-store-${key}-error`} className="mt-1 text-[10px] font-medium text-red-600" role="alert">
                  {err}
                </p>
              ) : null}
            </div>
          );
        })}
        <div className="col-span-12 sm:col-span-6">
          <label className={labelClass}>Opening date</label>
          <input
            type="date"
            className={inputClass}
            value={value.openingDate ? String(value.openingDate).slice(0, 10) : ''}
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
