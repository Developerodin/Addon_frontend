"use client";

import React, { useMemo } from "react";

export default function QtyInputCell({
  value,
  min = 0,
  max,
  step = 1,
  onChange,
  disabled,
  className = "",
  warn,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  className?: string;
  warn?: boolean;
}) {
  const clamp = (n: number) => {
    let out = Number.isFinite(n) ? n : min;
    out = Math.max(min, out);
    if (typeof max === "number") out = Math.min(max, out);
    return out;
  };

  const canDec = !disabled && value > min;
  const canInc = !disabled && (typeof max !== "number" ? true : value < max);

  const inputValue = useMemo(() => (Number.isFinite(value) ? String(value) : String(min)), [value, min]);

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <button
        type="button"
        className="w-9 h-9 flex items-center justify-center rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
        onClick={() => onChange(clamp(value - step))}
        disabled={!canDec}
        title="Decrease"
      >
        <i className="ri-subtract-line"></i>
      </button>
      <input
        type="number"
        className={`w-[84px] h-9 text-center border rounded ${
          warn ? "border-orange-300 bg-orange-50" : "border-gray-200 bg-white"
        }`}
        value={inputValue}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => onChange(clamp(parseInt(e.target.value || `${min}`, 10)))}
      />
      <button
        type="button"
        className="w-9 h-9 flex items-center justify-center rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
        onClick={() => onChange(clamp(value + step))}
        disabled={!canInc}
        title="Increase"
      >
        <i className="ri-add-line"></i>
      </button>
    </div>
  );
}

