"use client";
import React from 'react';
import { fmtGrnINR } from '@/shared/utils/grnTotals';
import type { GrnSnapshotTotals } from '@/shared/utils/grnPrint';

interface GrnFinancialSummaryProps {
  totals?: GrnSnapshotTotals | null;
}

/**
 * Read-only financial breakdown card for the GRN drawer overview tab.
 */
const GrnFinancialSummary: React.FC<GrnFinancialSummaryProps> = ({ totals }) => {
  if (!totals) return null;

  const rows = [
    { label: 'Basic Value', value: totals.subTotal },
    { label: 'Discount (−)', value: totals.discountAmount ?? 0, hide: !totals.discountAmount },
    { label: 'Taxable Value', value: totals.taxableValue ?? totals.subTotal },
    { label: 'SGST', value: totals.sgst, hide: !totals.sgst },
    { label: 'CGST', value: totals.cgst ?? 0, hide: !(totals.cgst && totals.cgst > 0) },
    { label: 'IGST', value: totals.igst, hide: !totals.igst },
    { label: 'Freight / Shipping', value: totals.freightAmount ?? 0, hide: !totals.freightAmount },
    { label: 'Freight GST', value: totals.freightGst ?? 0, hide: !totals.freightGst },
    { label: 'Round Off', value: totals.roundOff ?? 0, hide: totals.roundOff === 0 || totals.roundOff == null },
  ];

  return (
    <section
      className="bg-gray-50 border border-gray-200 rounded p-3 space-y-1"
      aria-label="Financial summary"
    >
      <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
        Financial Summary
      </h3>
      {rows
        .filter((row) => !row.hide)
        .map((row) => (
          <div key={row.label} className="flex justify-between text-[11px]">
            <span className="text-gray-600">{row.label}</span>
            <span className="font-bold text-gray-800">{fmtGrnINR(row.value ?? 0)}</span>
          </div>
        ))}
      <div className="flex justify-between text-[12px] border-t border-gray-200 pt-2 mt-2">
        <span className="font-bold text-gray-800">Final Total</span>
        <span className="font-bold text-indigo-700">{fmtGrnINR(totals.grandTotal ?? 0)}</span>
      </div>
      {totals.amountInWords && (
        <p className="text-[10px] text-gray-500 italic mt-1">{totals.amountInWords}</p>
      )}
    </section>
  );
};

export default GrnFinancialSummary;
