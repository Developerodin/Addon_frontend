'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CountSize } from '@/shared/services/yarnCountSizeService';

type CountSizeMultiSelectProps = {
  options: CountSize[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  isLoading?: boolean;
  disabled?: boolean;
};

const CountSizeMultiSelect: React.FC<CountSizeMultiSelectProps> = ({
  options,
  selected,
  onChange,
  placeholder = 'Select count sizes',
  isLoading = false,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selectedLabels = useMemo(() => {
    if (!selected.length) return [];

    const labelMap = new Map(options.map(option => [option.id, option.name]));
    return selected
      .map(id => labelMap.get(id) || id)
      .filter((label): label is string => Boolean(label));
  }, [options, selected]);

  const toggleDropdown = useCallback(() => {
    if (disabled) return;
    setIsOpen(prev => !prev);
  }, [disabled]);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleOptionToggle = useCallback(
    (optionId: string) => {
      const isSelected = selected.includes(optionId);
      const updatedSelection = isSelected
        ? selected.filter(id => id !== optionId)
        : [...selected, optionId];
      onChange(updatedSelection);
    },
    [onChange, selected]
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeDropdown, isOpen]);

  useEffect(() => {
    if (!disabled) return;
    closeDropdown();
  }, [closeDropdown, disabled]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggleDropdown}
        disabled={disabled}
        className="form-select flex items-center justify-between gap-2 text-left"
      >
        <span className="truncate">
          {selectedLabels.length > 0 ? selectedLabels.join(', ') : placeholder}
        </span>
        <i className={`ri-arrow-${isOpen ? 'up' : 'down'}-s-line text-base`} aria-hidden />
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500">Loading count sizes...</div>
          ) : options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">No count sizes available.</div>
          ) : (
            <ul className="py-1">
              {options.map(option => {
                const isChecked = selected.includes(option.id);
                return (
                  <li key={option.id}>
                    <label className="flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 focus-within:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleOptionToggle(option.id)}
                        className="ti-form-checkbox"
                        aria-label={option.name}
                      />
                      <span className="flex-1 truncate">{option.name}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          {selected.length > 0 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2">
              <span className="text-xs text-gray-500">{selected.length} selected</span>
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => onChange([])}
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CountSizeMultiSelect;


