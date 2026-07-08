'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type {
  CreateWarehouseClientBody,
  UpdateWarehouseClientBody,
  WarehouseClient,
  WarehouseClientStoreProfile,
  WarehouseClientType,
} from '@/shared/services/whmsWarehouseClientService';

import WarehouseClientStoreProfileFields from './WarehouseClientStoreProfileFields';
import {
  WAREHOUSE_CLIENT_TYPES,
  buildCreatePayload,
  buildUpdatePayload,
  clientToFormState,
} from './warehouseClientFormPayload';
import {
  UPPERCASE_TEXT_FIELDS,
  normalizeWarehouseClientInput,
  validateWarehouseClientField,
  validateWarehouseClientRoot,
} from './warehouseClientFieldRules';

const inputClass =
  'w-full bg-white border border-gray-200 rounded px-3 py-1.5 text-[11px] font-medium text-gray-800 focus:ring-0 focus:border-purple-300 placeholder:text-gray-400';
const labelClass = 'block text-[11px] font-bold text-[#495057] mb-1';
const selectClass = `${inputClass} appearance-none cursor-pointer pr-8`;

type Mode = 'create' | 'edit';

type SubmitBody = CreateWarehouseClientBody | UpdateWarehouseClientBody;

type Props = {
  mode: Mode;
  initialClient?: WarehouseClient | null;
  onSubmit: (body: SubmitBody) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
};

const TEXT_FIELDS: { key: string; label: string; wide?: boolean }[] = [
  { key: 'retailerName', label: 'Retailer name' },
  { key: 'distributorName', label: 'Distributor name' },
  { key: 'parentKeyCode', label: 'Parent key code' },
  { key: 'contactPerson', label: 'Contact person' },
  { key: 'mobilePhone', label: 'Mobile' },
  { key: 'phone1', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'gstin', label: 'GSTIN' },
  { key: 'locality', label: 'Locality' },
  { key: 'city', label: 'City' },
  { key: 'zipCode', label: 'ZIP' },
  { key: 'state', label: 'State' },
  { key: 'outlet', label: 'Outlet' },
  { key: 'rsm', label: 'RSM' },
  { key: 'asm', label: 'ASM' },
  { key: 'se', label: 'SE' },
  { key: 'dso', label: 'DSO' },
  { key: 'slNo', label: 'Sl. no.' },
];

export default function WarehouseClientForm({
  mode,
  initialClient,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: Props) {
  const initial = useMemo(() => {
    if (initialClient) return clientToFormState(initialClient);
    const root: Record<string, unknown> = { type: 'Trade' as WarehouseClientType, status: 'active' };
    TEXT_FIELDS.forEach(({ key }) => {
      if (!(key in root)) root[key] = '';
    });
    root.address = '';
    root.remarks = '';
    return { root, storeProfile: {} as WarehouseClientStoreProfile };
  }, [initialClient]);

  const [root, setRoot] = useState<Record<string, unknown>>(initial.root);
  const [storeProfile, setStoreProfile] = useState<WarehouseClientStoreProfile>(initial.storeProfile);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setRoot(initial.root);
    setStoreProfile(initial.storeProfile);
  }, [initial]);

  const type = (root.type as WarehouseClientType) || 'Trade';

  const setField = (key: string, value: string) => {
    const next = normalizeWarehouseClientInput(key, value);
    setRoot((prev) => ({ ...prev, [key]: next }));
    const err = validateWarehouseClientField(key, next);
    setFieldErrors((prev) => {
      const copy = { ...prev };
      if (err) copy[key] = err;
      else delete copy[key];
      return copy;
    });
  };

  const handleFieldBlur = (key: string) => {
    const raw = root[key];
    if (typeof raw !== 'string') return;
    const err = validateWarehouseClientField(key, raw);
    setFieldErrors((prev) => {
      const copy = { ...prev };
      if (err) copy[key] = err;
      else delete copy[key];
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateWarehouseClientRoot(root);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    if (mode === 'create') {
      await onSubmit(buildCreatePayload(type, root, storeProfile));
    } else {
      await onSubmit(buildUpdatePayload(type, root, storeProfile));
    }
  };

  const isStore = type === 'Store';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 sm:col-span-6">
          <label className={labelClass}>
            Type <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              className={selectClass}
              value={type}
              onChange={(e) => setField('type', e.target.value)}
              required
            >
              {WAREHOUSE_CLIENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
          </div>
        </div>
        <div className="col-span-12 sm:col-span-6">
          <label className={labelClass}>Status</label>
          <div className="relative">
            <select
              className={selectClass}
              value={(root.status as string) || 'active'}
              onChange={(e) => setField('status', e.target.value)}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
          </div>
        </div>

        {isStore ? (
          <div className="col-span-12">
            <p className="text-[11px] text-gray-500 mb-2">
              Store clients use only the fields below (bill code, SAP, brand, etc.). No distributor / contact / GST
              fields are sent for this type.
            </p>
            <WarehouseClientStoreProfileFields value={storeProfile} onChange={setStoreProfile} />
          </div>
        ) : (
          <>
            {TEXT_FIELDS.map(({ key, label, wide }) => {
              const isUpper = UPPERCASE_TEXT_FIELDS.has(key);
              const err = fieldErrors[key];
              return (
                <div key={key} className={wide ? 'col-span-12' : 'col-span-12 sm:col-span-6'}>
                  <label className={labelClass} htmlFor={`wh-client-${key}`}>
                    {label}
                  </label>
                  <input
                    id={`wh-client-${key}`}
                    type="text"
                    className={`${inputClass}${isUpper ? ' uppercase' : ''}${err ? ' border-red-300 focus:border-red-400' : ''}`}
                    inputMode={key === 'slNo' ? 'numeric' : undefined}
                    maxLength={
                      key === 'gstin' ? 15 : key === 'city' ? 100 : key === 'state' ? 50 : key === 'parentKeyCode' ? 50 : undefined
                    }
                    aria-invalid={err ? true : undefined}
                    aria-describedby={err ? `wh-client-${key}-error` : undefined}
                    value={(root[key] as string) ?? ''}
                    onChange={(e) => setField(key, e.target.value)}
                    onBlur={() => handleFieldBlur(key)}
                  />
                  {err ? (
                    <p id={`wh-client-${key}-error`} className="mt-1 text-[10px] font-medium text-red-600" role="alert">
                      {err}
                    </p>
                  ) : null}
                </div>
              );
            })}
            <div className="col-span-12">
              <label className={labelClass}>Address</label>
              <textarea
                className={`${inputClass} min-h-[72px]`}
                rows={3}
                value={(root.address as string) ?? ''}
                onChange={(e) => setField('address', e.target.value)}
              />
            </div>
            <div className="col-span-12">
              <label className={labelClass}>Remarks</label>
              <textarea
                className={`${inputClass} min-h-[56px]`}
                rows={2}
                value={(root.remarks as string) ?? ''}
                onChange={(e) => setField('remarks', e.target.value)}
              />
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50"
        >
          {isSubmitting ? <i className="ri-loader-4-line text-xs animate-spin" /> : <i className="ri-save-line text-xs" />}
          {mode === 'create' ? 'Create client' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 transition-colors shadow-sm"
        >
          <i className="ri-close-line text-xs" />
          Cancel
        </button>
      </div>
    </form>
  );
}
