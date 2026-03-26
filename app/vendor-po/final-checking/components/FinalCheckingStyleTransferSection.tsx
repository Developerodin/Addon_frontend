"use client";

import React from "react";
import { CRM } from "../../vendor-list/crmUiClasses";
import type { StyleCodeByVendorRow } from "@/shared/services/productService";
import { styleOptionId, type TransferredStyleRowDraft } from "../../utils/transferredStyleRows";

type Props = {
  sectionIndex: string;
  rows: TransferredStyleRowDraft[];
  styleOptions: StyleCodeByVendorRow[];
  transferCap: number;
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
  transferCap,
  loadingStyles,
  saving,
  transferLoading,
  onAddRow,
  onRemoveRow,
  onStyleSelect,
  onQtyChange,
}: Props) {
  return (
    <div className={CRM.drawerSection}>
      <div className={CRM.drawerSectionHead}>
        {sectionIndex}. M1 completed breakdown (style &amp; qty)
      </div>
      <div className="p-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-center mb-2">
        <p className="text-[10px] text-gray-600 leading-relaxed">
          Each row maps to <code className="text-[10px]">transferredData</code>. Here <code className="text-[10px]">transferred</code>{" "}
          is M1 line qty for that style (used to derive floor <code className="text-[10px]">completed</code> when omitted).
        </p>
        <button type="button" className={CRM.btnSecondary} onClick={onAddRow} disabled={saving || transferLoading}>
          <i className="ri-add-line" /> Row
        </button>
      </div>
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
                {styleOptions.map((s) => {
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
                max={transferCap}
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
