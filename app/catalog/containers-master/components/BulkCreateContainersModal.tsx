'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  containersMasterService,
  CONTAINER_TYPE_TEAR_WEIGHT_DEFAULTS,
  type ContainerNamingPattern,
  type ContainerStatus,
  type ContainerType,
} from '@/shared/services/containersMasterService';

interface BulkCreateContainersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TYPE_OPTIONS: { value: ContainerType; label: string }[] = [
  { value: 'bag', label: 'Bag' },
  { value: 'bigContainer', label: 'Big Container' },
  { value: 'container', label: 'Container' },
];

/**
 * Modal to bulk-create containers with type, tear weight, and auto-generated names.
 */
export default function BulkCreateContainersModal({
  isOpen,
  onClose,
  onSuccess,
}: BulkCreateContainersModalProps) {
  const [patterns, setPatterns] = useState<ContainerNamingPattern[]>([]);
  const [patternsLoading, setPatternsLoading] = useState(false);
  const [namePatternId, setNamePatternId] = useState('');
  const [count, setCount] = useState('10');
  const [type, setType] = useState<ContainerType>('bag');
  const [tearWeight, setTearWeight] = useState(String(CONTAINER_TYPE_TEAR_WEIGHT_DEFAULTS.bag));
  const [status, setStatus] = useState<ContainerStatus>('Active');
  const [saving, setSaving] = useState(false);

  const selectedPattern = useMemo(
    () => patterns.find((p) => p.id === namePatternId) ?? patterns[0] ?? null,
    [patterns, namePatternId],
  );

  const namePreview = useMemo(() => {
    const qty = Math.max(1, parseInt(count, 10) || 0);
    if (!selectedPattern) {
      return qty === 1 ? 'Container {n}' : 'Container {n} … Container {n}';
    }
    const start = selectedPattern.nextNumber;
    const end = start + qty - 1;
    const fmt = (n: number) => `${selectedPattern.prefix}${selectedPattern.separator}${n}`;
    if (qty <= 1) return fmt(start);
    if (qty === 2) return `${fmt(start)}, ${fmt(end)}`;
    return `${fmt(start)} … ${fmt(end)} (${qty} containers)`;
  }, [count, selectedPattern]);

  const loadPatterns = useCallback(async () => {
    setPatternsLoading(true);
    try {
      const data = await containersMasterService.getNamingPatterns();
      setPatterns(data.patterns);
      const defaultId = data.defaultPatternId ?? data.patterns[0]?.id ?? '';
      setNamePatternId(defaultId);

      const defaultPattern = data.patterns.find((p) => p.id === defaultId) ?? data.patterns[0];
      if (defaultPattern?.suggestedType) {
        setType(defaultPattern.suggestedType);
        const weight =
          defaultPattern.suggestedTearWeight ??
          CONTAINER_TYPE_TEAR_WEIGHT_DEFAULTS[defaultPattern.suggestedType];
        setTearWeight(String(weight));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load naming patterns');
      setPatterns([]);
    } finally {
      setPatternsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setCount('10');
    setStatus('Active');
    void loadPatterns();
  }, [isOpen, loadPatterns]);

  /**
   * Apply type defaults and pattern suggestions when user changes type or pattern.
   */
  const handleTypeChange = (nextType: ContainerType) => {
    setType(nextType);
    if (!tearWeight.trim()) {
      setTearWeight(String(CONTAINER_TYPE_TEAR_WEIGHT_DEFAULTS[nextType]));
    }
  };

  const handlePatternChange = (patternId: string) => {
    setNamePatternId(patternId);
    const pattern = patterns.find((p) => p.id === patternId);
    if (!pattern) return;
    if (pattern.suggestedType) {
      setType(pattern.suggestedType);
      if (pattern.suggestedTearWeight != null) {
        setTearWeight(String(pattern.suggestedTearWeight));
      } else {
        setTearWeight(String(CONTAINER_TYPE_TEAR_WEIGHT_DEFAULTS[pattern.suggestedType]));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(count, 10);
    if (!Number.isInteger(qty) || qty < 1 || qty > 500) {
      toast.error('Enter a count between 1 and 500');
      return;
    }
    const weight = parseFloat(tearWeight);
    if (!Number.isFinite(weight) || weight < 0) {
      toast.error('Enter a valid tear weight');
      return;
    }

    setSaving(true);
    try {
      const result = await containersMasterService.bulkCreate({
        count: qty,
        type,
        tearWeight: weight,
        status,
        namePatternId: namePatternId || undefined,
      });
      toast.success(`Created ${result.created} container(s)`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk create failed');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" aria-modal="true" role="dialog" aria-labelledby="bulk-create-containers-title">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md bg-white shadow-xl flex flex-col h-full overflow-hidden">
        <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
          <h2 id="bulk-create-containers-title" className="text-sm font-bold text-gray-800">
            Bulk Create Containers
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1"
            aria-label="Close bulk create"
          >
            <i className="ri-close-line text-lg" aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-[10px] flex flex-col gap-4 flex-1 overflow-auto">
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Names continue from your existing containers (e.g. Container 1101, Container 1102…).
          </p>

          <div>
            <label htmlFor="bulk-count" className="block text-[11px] font-bold text-gray-700 mb-1">
              Number of containers
            </label>
            <input
              id="bulk-count"
              type="number"
              min={1}
              max={500}
              required
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className="w-full bg-white border border-gray-200 text-[12px] font-medium rounded px-3 py-2 focus:ring-0 focus:border-purple-300"
              placeholder="e.g. 50"
            />
          </div>

          <div>
            <label htmlFor="bulk-name-pattern" className="block text-[11px] font-bold text-gray-700 mb-1">
              Name format
            </label>
            {patternsLoading ? (
              <p className="text-[11px] text-gray-400">Loading patterns…</p>
            ) : (
              <select
                id="bulk-name-pattern"
                value={namePatternId}
                onChange={(e) => handlePatternChange(e.target.value)}
                className="w-full bg-white border border-gray-200 text-[12px] font-medium rounded px-3 py-2 focus:ring-0 focus:border-purple-300"
              >
                {patterns.length === 0 ? (
                  <option value="">Container {'{n}'} (default)</option>
                ) : (
                  patterns.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} — next {p.nextNumber} ({p.count} existing)
                    </option>
                  ))
                )}
              </select>
            )}
            <p className="mt-1.5 text-[10px] text-gray-500 font-medium" aria-live="polite">
              Preview: {namePreview}
            </p>
          </div>

          <div>
            <label htmlFor="bulk-type" className="block text-[11px] font-bold text-gray-700 mb-1">
              Type
            </label>
            <select
              id="bulk-type"
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as ContainerType)}
              className="w-full bg-white border border-gray-200 text-[12px] font-medium rounded px-3 py-2 focus:ring-0 focus:border-purple-300"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="bulk-tear-weight" className="block text-[11px] font-bold text-gray-700 mb-1">
              Tear weight
            </label>
            <input
              id="bulk-tear-weight"
              type="number"
              step="0.001"
              min={0}
              required
              value={tearWeight}
              onChange={(e) => setTearWeight(e.target.value)}
              placeholder="e.g. 0.412"
              className="w-full bg-white border border-gray-200 text-[12px] font-medium rounded px-3 py-2 focus:ring-0 focus:border-purple-300"
            />
          </div>

          <div>
            <label htmlFor="bulk-status" className="block text-[11px] font-bold text-gray-700 mb-1">
              Status
            </label>
            <select
              id="bulk-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ContainerStatus)}
              className="w-full bg-white border border-gray-200 text-[12px] font-medium rounded px-3 py-2 focus:ring-0 focus:border-purple-300"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="mt-auto flex gap-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-1.5 bg-white border border-gray-200 text-[11px] font-bold rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || patternsLoading}
              className="flex-1 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? <i className="ri-loader-4-line animate-spin inline-block" aria-hidden /> : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
