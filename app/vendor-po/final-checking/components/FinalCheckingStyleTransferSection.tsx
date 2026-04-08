"use client";

import React from "react";
import { CRM } from "../../vendor-list/crmUiClasses";
import type { StyleCodeByVendorRow } from "@/shared/services/productService";
import { styleOptionId, type TransferredStyleRowDraft } from "../../utils/transferredStyleRows";

type Props = {
  sectionIndex: string;
  rows: TransferredStyleRowDraft[];
  styleOptions: StyleCodeByVendorRow[];
  /** When set (e.g. from receivedData), only these style ids appear in the dropdown. */
  allowedStyleCodeIds?: Set<string>;
  loadingStyles: boolean;
  saving: boolean;
  transferLoading: boolean;
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onStyleSelect: (index: number, styleId: string) => void;
  onQtyChange: (index: number, value: number) => void;
};

/** Editable `transferredData` rows (Final QC: each row `transferred` means M1 completed for that style). */
export function FinalCheckingStyleTransferSection({
  sectionIndex,
  rows,
  styleOptions,
  allowedStyleCodeIds,
  loadingStyles,
  saving,
  transferLoading,
  onAddRow,
  onRemoveRow,
  onStyleSelect,
  onQtyChange,
}: Props) {
  const filteredOptions =
    allowedStyleCodeIds && allowedStyleCodeIds.size > 0
      ? styleOptions.filter((s) => {
          const sid = styleOptionId(s);
          return sid && allowedStyleCodeIds.has(sid);
        })
      : styleOptions;

  return (
    <div className={CRM.drawerSection}>
      <div className={CRM.drawerSectionHead}>
        {sectionIndex}. M1 completed breakdown (style &amp; qty)
      </div>
      <div className="p-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-center mb-2">
        <p className="text-[10px] text-gray-600 leading-relaxed">
          Each row maps to <code className="text-[10px]">transferredData</code>. Row qty is M1 pass for that style (≤ inbound
          received for that style when listed above).
        </p>
        <button type="button" className={CRM.btnSecondary} onClick={onAddRow} disabled={saving || transferLoading}>
          <i className="ri-add-line" /> Row
        </button>
      </div>
      {allowedStyleCodeIds && allowedStyleCodeIds.size > 0 && filteredOptions.length === 0 && (
        <p className="px-3 pb-0 text-[10px] text-amber-700">
          Inbound style ids don&apos;t match the product catalog for this vendor — refresh styles or check style codes on the
          flow.
        </p>
      )}
      <div className="p-3 space-y-3 pt-0">
        {rows.map((row, index) => (
          <div
            key={index}
            className="grid grid-cols-1 sm:grid-cols-[1fr_minmax(0,120px)_auto] gap-2 items-end border border-gray-100 rounded-lg p-2 bg-gray-50/80"
          >
            <div>
              <label className={CRM.label}>Style / brand</label>
              <select
                className={CRM.select}
                value={row.styleCodeId}
                onChange={(e) => onStyleSelect(index, e.target.value)}
                disabled={saving || transferLoading || loadingStyles}
              >
                <option value="">Unspecified</option>
                {filteredOptions.map((s) => {
                  const sid = styleOptionId(s);
                  if (!sid) return null;
                  return (
                    <option key={sid} value={sid}>
                      {s.styleCode} — {s.brand}
                    </option>
                  );
                })}
              </select>
              {row.styleCodeId && row.brand && (
                <p className="text-[10px] text-gray-500 mt-0.5">Brand sent: {row.brand}</p>
              )}
            </div>
            <div>
              <label className={CRM.label}>M1 qty</label>
              <input
                type="number"
                min={0}
                className={CRM.input}
                value={row.transferred}
                onChange={(e) => onQtyChange(index, Number(e.target.value))}
                disabled={saving || transferLoading}
              />
            </div>
            <div className="flex justify-end sm:justify-center pb-0.5">
              <button
                type="button"
                className={CRM.iconDanger}
                onClick={() => onRemoveRow(index)}
                disabled={saving || transferLoading || rows.length <= 1}
                title="Remove row"
              >
                <i className="ri-delete-bin-line" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
