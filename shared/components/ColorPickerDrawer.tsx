"use client";

import React, { useMemo, useState } from 'react';
import type { YarnColor } from '@/shared/services/yarnColorService';

export interface ColorPickerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  colors: YarnColor[];
  selectedColorId: string;
  onSelect: (colorId: string) => void;
  /** Optional title override */
  title?: string;
}

/** Normalize color code for CSS (support hex with/without #). */
function toCssColor(colorCode: string): string {
  const s = (colorCode || '').trim();
  if (!s) return '#e5e7eb';
  if (/^#[0-9A-Fa-f]{3,8}$/.test(s)) return s;
  if (/^[0-9A-Fa-f]{3,8}$/.test(s)) return `#${s}`;
  return s.startsWith('rgb') || s.startsWith('hsl') ? s : '#e5e7eb';
}

/**
 * Side drawer for selecting a yarn color. Shows full list with color swatch,
 * name, and pantone. Search filters by both name and pantone name.
 */
const ColorPickerDrawer: React.FC<ColorPickerDrawerProps> = ({
  isOpen,
  onClose,
  colors,
  selectedColorId,
  onSelect,
  title = 'Select Color',
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredColors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return colors;
    return colors.filter(
      (c) =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.pantoneName || '').toLowerCase().includes(q) ||
        (c.colorCode || '').toLowerCase().includes(q)
    );
  }, [colors, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 z-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative z-10 ml-auto w-full max-w-xl h-full bg-white shadow-xl flex flex-col border-l border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 flex justify-between items-center shrink-0">
          <h3 className="text-base font-bold text-gray-800">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-600 border border-gray-200 rounded hover:bg-gray-200"
            aria-label="Close"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>
        <div className="p-3 border-b border-gray-200 shrink-0">
          <input
            type="text"
            className="form-control w-full"
            placeholder="Search by color name or Pantone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-y-auto p-3 min-h-0">
          {filteredColors.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No colors match your search.
            </div>
          ) : (
            <ul className="space-y-1">
              {filteredColors.map((color) => {
                const isSelected = color.id === selectedColorId;
                const bgColor = toCssColor(color.colorCode || '');
                return (
                  <li key={color.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(color.id);
                        onClose();
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span
                        className="shrink-0 w-8 h-8 rounded-md border border-gray-300 shadow-inner"
                        style={{ backgroundColor: bgColor }}
                        title={color.colorCode || ''}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 truncate">
                          {color.name || '—'}
                        </div>
                        {color.pantoneName ? (
                          <div className="text-xs text-gray-500 truncate">
                            Pantone: {color.pantoneName}
                          </div>
                        ) : null}
                      </div>
                      {isSelected && (
                        <i className="ri-check-line text-primary text-lg shrink-0" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ColorPickerDrawer;
