'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { rawMaterialService, RawMaterial } from '@/shared/services/rawMaterialService';

interface RawMaterialSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

function GroupCheckbox({
  checked,
  indeterminate,
  onChange,
  disabled,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="rounded border-gray-300 text-primary focus:ring-primary"
    />
  );
}

/** Groups raw materials by groupName and renders checkboxes. User can select as many as needed. */
export function RawMaterialSelector({ selectedIds, onChange, disabled }: RawMaterialSelectorProps) {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    rawMaterialService
      .list({ search: search || undefined })
      .then((list) => {
        if (!cancelled) setMaterials(list);
      })
      .catch(() => {
        if (!cancelled) setMaterials([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search]);

  const grouped = useMemo(() => {
    const map = new Map<string, RawMaterial[]>();
    for (const m of materials) {
      const key = m.groupName?.trim() || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [materials]);

  const toggle = (id: string) => {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const toggleGroup = (groupMaterials: RawMaterial[]) => {
    if (disabled) return;
    const ids = groupMaterials.map((m) => m.id);
    const allSelected = ids.every((id) => selectedIds.includes(id));
    if (allSelected) {
      onChange(selectedIds.filter((id) => !ids.includes(id)));
    } else {
      const added = new Set(selectedIds);
      ids.forEach((id) => added.add(id));
      onChange(Array.from(added));
    }
  };

  return (
    <div className="mt-6">
      <h4 className="text-base font-medium text-gray-800 mb-2">Raw Materials</h4>
      <p className="text-sm text-gray-500 mb-3">Select raw materials used in this product (grouped by group name).</p>
      <div className="mb-3">
        <input
          type="text"
          className="form-control max-w-md"
          placeholder="Search raw materials..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={disabled}
        />
      </div>
      {loading ? (
        <div className="py-6 text-center text-gray-500">
          <i className="ri-loader-4-line animate-spin text-xl inline-block me-2"></i>
          Loading raw materials...
        </div>
      ) : grouped.length === 0 ? (
        <p className="text-gray-500 py-4">No raw materials found.</p>
      ) : (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
          {grouped.map(([groupName, groupMaterials]) => {
            const groupIds = groupMaterials.map((m) => m.id);
            const allSelected = groupIds.every((id) => selectedIds.includes(id));
            const someSelected = groupIds.some((id) => selectedIds.includes(id));
            const indeterminate = someSelected && !allSelected;
            return (
              <div key={groupName} className="bg-gray-50/50">
                <div
                  className="px-4 py-2.5 flex items-center gap-2 border-b border-gray-100 cursor-pointer hover:bg-gray-100/80"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('input')) return;
                    toggleGroup(groupMaterials);
                  }}
                >
                  <GroupCheckbox
                    checked={allSelected}
                    indeterminate={indeterminate}
                    onChange={() => toggleGroup(groupMaterials)}
                    disabled={disabled}
                  />
                  <span className="font-semibold text-gray-800">{groupName}</span>
                  <span className="text-xs text-gray-500">({groupMaterials.length})</span>
                </div>
                <ul className="px-4 py-2 pb-3 space-y-1.5">
                  {groupMaterials.map((m) => (
                    <li key={m.id} className="flex items-center gap-2 pl-6">
                      <input
                        type="checkbox"
                        id={`rm-${m.id}`}
                        checked={selectedIds.includes(m.id)}
                        onChange={() => toggle(m.id)}
                        disabled={disabled}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <label htmlFor={`rm-${m.id}`} className="text-sm text-gray-700 cursor-pointer">
                        {m.name}
                        {m.unit && <span className="text-gray-400 ml-1">({m.unit})</span>}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
