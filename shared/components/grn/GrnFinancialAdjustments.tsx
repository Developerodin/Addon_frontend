"use client";
import React, { useEffect, useMemo, useState } from 'react';
import {
  computeGrnTotals,
  fmtGrnINR,
  GrnAdjustmentInputs,
  GrnTotalsItem,
} from '@/shared/utils/grnTotals';

export interface GrnFinancialAdjustmentsValue {
  discountPercent: number;
  freightAmount: number;
  freightGstPercent: number;
  roundOff: number;
  roundOffOverridden: boolean;
}

interface GrnFinancialAdjustmentsProps {
  /** GRN line items used for basic value / GST preview. */
  items: GrnTotalsItem[];
  /** Supplier state drives SGST/CGST vs IGST split. */
  supplierState?: string;
  /** Initial values from persisted GRN adjustments. */
  initial: GrnFinancialAdjustmentsValue;
  /** Called whenever any adjustment input changes. */
  onChange: (value: GrnFinancialAdjustmentsValue) => void;
  disabled?: boolean;
}

/**
 * Financial adjustment inputs for GRN Edit Header: discount %, freight,
 * freight GST %, and round-off with live computed preview.
 */
const GrnFinancialAdjustments: React.FC<GrnFinancialAdjustmentsProps> = ({
  items,
  supplierState,
  initial,
  onChange,
  disabled = false,
}) => {
  const [discountPercent, setDiscountPercent] = useState(initial.discountPercent);
  const [freightAmount, setFreightAmount] = useState(initial.freightAmount);
  const [freightGstPercent, setFreightGstPercent] = useState(initial.freightGstPercent);
  const [roundOff, setRoundOff] = useState(initial.roundOff);
  const [roundOffOverridden, setRoundOffOverridden] = useState(initial.roundOffOverridden);

  useEffect(() => {
    setDiscountPercent(initial.discountPercent);
    setFreightAmount(initial.freightAmount);
    setFreightGstPercent(initial.freightGstPercent);
    setRoundOff(initial.roundOff);
    setRoundOffOverridden(initial.roundOffOverridden);
  }, [
    initial.discountPercent,
    initial.freightAmount,
    initial.freightGstPercent,
    initial.roundOff,
    initial.roundOffOverridden,
  ]);

  const preview = useMemo(() => {
    const adj: GrnAdjustmentInputs = {
      discountPercent,
      freightAmount,
      freightGstPercent,
      roundOff: roundOffOverridden ? roundOff : null,
    };
    const computed = computeGrnTotals(items, supplierState, adj, true);
    return computed;
  }, [items, supplierState, discountPercent, freightAmount, freightGstPercent, roundOff, roundOffOverridden]);

  useEffect(() => {
    if (!roundOffOverridden) {
      setRoundOff(preview.roundOffSuggested);
    }
  }, [preview.roundOffSuggested, roundOffOverridden]);

  const emitChange = (patch: Partial<GrnFinancialAdjustmentsValue>) => {
    onChange({
      discountPercent,
      freightAmount,
      freightGstPercent,
      roundOff,
      roundOffOverridden,
      ...patch,
    });
  };

  const handleDiscountChange = (value: number) => {
    setDiscountPercent(value);
    emitChange({ discountPercent: value });
  };

  const handleFreightChange = (value: number) => {
    setFreightAmount(value);
    emitChange({ freightAmount: value });
  };

  const handleFreightGstChange = (value: number) => {
    setFreightGstPercent(value);
    emitChange({ freightGstPercent: value });
  };

  const handleRoundOffChange = (value: number) => {
    setRoundOff(value);
    setRoundOffOverridden(true);
    emitChange({ roundOff: value, roundOffOverridden: true });
  };

  const resetRoundOff = () => {
    setRoundOffOverridden(false);
    setRoundOff(preview.roundOffSuggested);
    emitChange({ roundOff: preview.roundOffSuggested, roundOffOverridden: false });
  };

  const previewRows = [
    { label: 'Basic Value', value: preview.subTotal },
    { label: 'Discount (−)', value: preview.discountAmount, hide: preview.discountAmount === 0 },
    { label: 'Taxable Value', value: preview.taxableValue },
    { label: 'Item GST', value: preview.itemGst },
    { label: 'Freight / Shipping', value: preview.freightAmount, hide: preview.freightAmount === 0 },
    { label: 'Freight GST', value: preview.freightGst, hide: preview.freightGst === 0 },
    { label: 'Pre-round Total', value: preview.preRoundTotal },
    { label: 'Round Off', value: preview.roundOff, hide: preview.roundOff === 0 },
  ];

  return (
    <div className="space-y-3" role="group" aria-label="Financial adjustments">
      <h4 className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
        <i className="ri-money-rupee-circle-line mr-1" aria-hidden />
        Financial Adjustments
      </h4>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="grn-discount-percent" className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">
            Discount (%)
          </label>
          <input
            id="grn-discount-percent"
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={discountPercent}
            onChange={(e) => handleDiscountChange(Number(e.target.value))}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[12px] focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            disabled={disabled}
            aria-label="Discount percentage on basic value"
          />
          <p className="text-[10px] text-gray-400 mt-0.5">Deducted from basic value</p>
        </div>
        <div>
          <label htmlFor="grn-freight-amount" className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">
            Freight / Shipping (₹)
          </label>
          <input
            id="grn-freight-amount"
            type="number"
            min={0}
            step={0.01}
            value={freightAmount}
            onChange={(e) => handleFreightChange(Number(e.target.value))}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[12px] focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            disabled={disabled}
            aria-label="Freight or shipping amount"
          />
        </div>
        <div>
          <label htmlFor="grn-freight-gst" className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">
            Freight GST (%)
          </label>
          <input
            id="grn-freight-gst"
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={freightGstPercent}
            onChange={(e) => handleFreightGstChange(Number(e.target.value))}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[12px] focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            disabled={disabled}
            aria-label="GST percentage on freight"
          />
        </div>
        <div>
          <label htmlFor="grn-round-off" className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">
            Round Off (₹)
          </label>
          <div className="flex gap-1">
            <input
              id="grn-round-off"
              type="number"
              step={0.01}
              value={roundOff}
              onChange={(e) => handleRoundOffChange(Number(e.target.value))}
              className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-[12px] focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              disabled={disabled}
              aria-label="Round off amount"
            />
            {roundOffOverridden && (
              <button
                type="button"
                onClick={resetRoundOff}
                disabled={disabled}
                className="px-2 py-1 text-[10px] font-bold text-purple-700 border border-purple-200 rounded hover:bg-purple-50"
                aria-label="Reset round off to auto-suggested value"
                title={`Auto: ${fmtGrnINR(preview.roundOffSuggested)}`}
              >
                Auto
              </button>
            )}
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Suggested: {fmtGrnINR(preview.roundOffSuggested)}
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded p-3 space-y-1" aria-live="polite">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Preview</p>
        {previewRows
          .filter((row) => !row.hide)
          .map((row) => (
            <div key={row.label} className="flex justify-between text-[11px]">
              <span className="text-gray-600">{row.label}</span>
              <span className="font-bold text-gray-800">{fmtGrnINR(row.value)}</span>
            </div>
          ))}
        <div className="flex justify-between text-[12px] border-t border-gray-100 pt-2 mt-2">
          <span className="font-bold text-purple-700">Final Total</span>
          <span className="font-bold text-purple-700">{fmtGrnINR(preview.grandTotal)}</span>
        </div>
        <p className="text-[10px] text-gray-400 text-right">{preview.taxLabel}</p>
      </div>
    </div>
  );
};

export default GrnFinancialAdjustments;
