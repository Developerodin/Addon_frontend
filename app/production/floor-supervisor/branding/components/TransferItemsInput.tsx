"use client";

import React from "react";
import NumericInput from "@/shared/utils/numericInput";
import type { TransferItem } from "@/shared/services/productionService";

export interface StyleCodeOption {
  styleCode: string;
  brand?: string;
}

interface TransferItemsInputProps {
  value: TransferItem[];
  onChange: (items: TransferItem[]) => void;
  maxTotal: number;
  disabled?: boolean;
  styleCodeOptions: StyleCodeOption[];
  placeholder?: string;
  /** Per-style-code max: sum of transferred for each styleCode must not exceed this. Used in Final Checking. */
  styleCodeMaxQuantities?: Record<string, number>;
}

/**
 * Dynamic rows for transfer items: quantity, style code, brand.
 * Used in Branding Update Order modal.
 */
export default function TransferItemsInput({
  value,
  onChange,
  maxTotal,
  disabled = false,
  styleCodeOptions,
  placeholder = "Add transfer lines",
  styleCodeMaxQuantities,
}: TransferItemsInputProps) {
  const total = value.reduce((s, i) => s + (i.transferred || 0), 0);
  const totalValid = total <= maxTotal;
  // Per-style-code: sum of transferred for each styleCode <= styleCodeMaxQuantities[styleCode]
  const byStyleCode = value.reduce((acc, i) => {
    const sc = i.styleCode?.trim();
    if (sc) acc[sc] = (acc[sc] ?? 0) + (i.transferred ?? 0);
    return acc;
  }, {} as Record<string, number>);
  const styleCodeValid = !styleCodeMaxQuantities || Object.entries(byStyleCode).every(
    ([sc, sum]) => sum <= (styleCodeMaxQuantities[sc] ?? Infinity)
  );
  const isValid = totalValid && styleCodeValid;

  const addRow = () => {
    onChange([...value, { transferred: 0 }]);
  };

  const removeRow = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const updateRow = (idx: number, field: keyof TransferItem, val: number | string) => {
    const next = [...value];
    next[idx] = { ...next[idx], [field]: val };
    onChange(next);
  };

  return (
    <div className="space-y-1.5">
      {value.length === 0 ? (
        <div className="py-3 px-3 border border-dashed border-gray-300 rounded bg-white text-[11px] text-gray-500 flex items-center justify-between">
          <span>{placeholder}{!disabled ? '. Click "Add row" to add transfer lines.' : ''}</span>
          {!disabled && (
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200"
            >
              <i className="ri-add-line text-xs" /> Add row
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="border border-gray-200 rounded overflow-hidden">
            <table className="min-w-full text-xs border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-1 text-left font-semibold text-gray-700 border-b border-r border-gray-200 w-20">Qty</th>
                  <th className="px-2 py-1 text-left font-semibold text-gray-700 border-b border-r border-gray-200">Style Code</th>
                  <th className="px-2 py-1 text-left font-semibold text-gray-700 border-b border-gray-200">Brand</th>
                  {!disabled && <th className="px-2 py-1 w-9 border-b border-gray-200" />}
                </tr>
              </thead>
              <tbody>
                {value.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="px-2 py-1 border-r border-b border-gray-200">
                      <NumericInput
                        className={`py-1 px-2 text-xs h-7 w-full border rounded ${!isValid ? "border-red-400" : "border-gray-200"}`}
                        value={item.transferred ?? 0}
                        onChange={(v) => updateRow(idx, "transferred", v)}
                        disabled={disabled}
                        allowDecimals
                        placeholder="0"
                      />
                    </td>
                    <td className="px-2 py-1 border-r border-b border-gray-200">
                      <select
                        className="py-1 px-2 text-xs h-7 w-full border border-gray-200 rounded focus:ring-0 focus:border-amber-300 bg-white"
                        value={item.styleCode ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          const opt = styleCodeOptions.find((o) => o.styleCode === v);
                          const next = [...value];
                          next[idx] = {
                            ...next[idx],
                            styleCode: v || undefined,
                            brand: opt?.brand ?? "",
                          };
                          onChange(next);
                        }}
                        disabled={disabled}
                      >
                        <option value="">— Select —</option>
                        {/* Include current value if not in options (preserve existing data) */}
                        {item.styleCode && !styleCodeOptions.some((o) => o.styleCode === item.styleCode) && (
                          <option value={item.styleCode}>{item.styleCode}</option>
                        )}
                        {styleCodeOptions.map((o) => (
                          <option key={o.styleCode} value={o.styleCode}>
                            {o.styleCode}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1 border-b border-gray-200">
                      <input
                        type="text"
                        readOnly
                        className="py-1 px-2 text-xs h-7 w-full border border-gray-200 rounded bg-gray-50 text-gray-700 cursor-not-allowed"
                        value={item.brand ?? ""}
                        placeholder="—"
                        title="Auto-filled from style code"
                      />
                    </td>
                    {!disabled && (
                      <td className="px-1 py-1 border-b border-gray-200">
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          className="w-6 h-6 flex items-center justify-center text-red-500 hover:bg-red-50 rounded"
                          title="Remove row"
                        >
                          <i className="ri-close-line text-xs" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-medium ${!isValid ? "text-red-600" : "text-gray-500"}`}>
              Total: {total.toLocaleString()} {maxTotal > 0 && `/ ${maxTotal} max`}
              {!totalValid && " — exceeds remaining"}
              {totalValid && !styleCodeValid && " — exceeds received for style code(s)"}
            </span>
            {!disabled && (
              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200"
              >
                <i className="ri-add-line text-xs" /> Add row
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
