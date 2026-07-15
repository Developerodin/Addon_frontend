"use client";

import React, { useMemo } from "react";
import { CRM } from "../../vendor-list/crmUiClasses";
import type { StyleCodeByVendorRow } from "@/shared/services/productService";
import {
  brandLabelForStyleId,
  type TransferredStyleRowDraft,
} from "../../utils/transferredStyleRows";
import {
  buildInboundBrandOptions,
  getFinalCheckingRowQtyCap,
  getFinalCheckingRowQtyError,
  type InboundBrandAggregate,
} from "../finalCheckingInboundAggregates";

type Props = {
  sectionIndex: string;
  rows: TransferredStyleRowDraft[];
  styleOptions: StyleCodeByVendorRow[];
  /** Inbound buckets for per-brand caps and brand picker. */
  inboundBrandAggregates: InboundBrandAggregate[];
  loadingStyles: boolean;
  saving: boolean;
  transferLoading: boolean;
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onInboundBrandSelect: (index: number, optionKey: string) => void;
  onQtyChange: (index: number, value: number) => void;
};

/** Editable `transferredData` rows (Final QC: each row `transferred` = M1 completed for that brand). */
export function FinalCheckingStyleTransferSection({
  sectionIndex,
  rows,
  styleOptions,
  inboundBrandAggregates,
  loadingStyles,
  saving,
  transferLoading,
  onAddRow,
  onRemoveRow,
  onInboundBrandSelect,
  onQtyChange,
}: Props) {
  const brandOptions = useMemo(
    () => buildInboundBrandOptions(inboundBrandAggregates),
    [inboundBrandAggregates],
  );
  const hasInboundBrands = brandOptions.length > 0;

  return (
    <div className={CRM.drawerSection}>
      <div className={CRM.drawerSectionHead}>
        {sectionIndex}. M1 completed breakdown (brand &amp; qty)
      </div>
      <div className="p-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-center mb-2">
        <p className="text-[10px] text-gray-600 leading-relaxed">
          Each row maps to <code className="text-[10px]">transferredData</code> per brand (all channels
          combined). M1 qty must be ≤ total inbound received for that brand.
        </p>
        <button type="button" className={CRM.btnSecondary} onClick={onAddRow} disabled={saving || transferLoading}>
          <i className="ri-add-line" /> Row
        </button>
      </div>
      {hasInboundBrands && brandOptions.length === 0 && (
        <p className="px-3 pb-0 text-[10px] text-amber-700">
          Inbound style ids don&apos;t match the product catalog for this vendor — refresh styles or check style codes on
          the flow.
        </p>
      )}
      <div className="p-3 space-y-3 pt-0">
        {rows.map((row, index) => {
          const qtyError = !row.fromServer
            ? getFinalCheckingRowQtyError(rows, index, inboundBrandAggregates)
            : null;
          const qtyCap = !row.fromServer
            ? getFinalCheckingRowQtyCap(rows, index, inboundBrandAggregates)
            : 0;
          const qtyInputId = `fc-m1-qty-${index}`;
          const brandSelectId = `fc-m1-brand-${index}`;
          const brandInbound =
            inboundBrandAggregates.find(
              (a) =>
                a.styleCodeId === row.styleCodeId.trim() &&
                a.brand === row.brand.trim(),
            )?.receivedSum ?? 0;

          return (
            <div
              key={index}
              className={`grid grid-cols-1 sm:grid-cols-[1fr_minmax(0,100px)_minmax(0,120px)_auto] gap-2 items-end border rounded-lg p-2 ${
                row.fromServer
                  ? "border-gray-200 bg-gray-100/90"
                  : "border-gray-100 bg-gray-50/80"
              }`}
            >
              <div>
                <label className={CRM.label} htmlFor={brandSelectId}>
                  Brand
                </label>
                {row.fromServer ? (
                  <p className="text-[11px] font-medium text-gray-800 py-2 px-1">
                    {brandLabelForStyleId(styleOptions, row.styleCodeId, row.brand)}{" "}
                    <span className="text-[10px] font-normal text-gray-500">(recorded)</span>
                  </p>
                ) : hasInboundBrands ? (
                  <select
                    id={brandSelectId}
                    className={CRM.select}
                    value={row.styleCodeId ? `${row.styleCodeId}\u0000${row.brand}` : ""}
                    onChange={(e) => onInboundBrandSelect(index, e.target.value)}
                    disabled={saving || transferLoading || loadingStyles}
                    aria-label="Select brand"
                  >
                    <option value="">Select brand…</option>
                    {brandOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label} ({opt.receivedSum.toLocaleString()} inbound)
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-[10px] text-gray-500 py-2 px-1">No inbound brands — add row after receive.</p>
                )}
              </div>
              <div>
                <label className={CRM.label}>Inbound</label>
                <p
                  className="text-[11px] font-semibold text-gray-700 py-2 px-1 tabular-nums"
                  aria-label={`Total inbound for ${row.brand || "brand"}`}
                >
                  {brandInbound > 0 ? brandInbound.toLocaleString() : "—"}
                </p>
              </div>
              <div>
                <label className={CRM.label} htmlFor={qtyInputId}>
                  M1 qty
                </label>
                <input
                  id={qtyInputId}
                  type="number"
                  min={0}
                  max={qtyCap > 0 ? qtyCap : undefined}
                  className={`${CRM.input}${
                    qtyError ? " border-red-400 focus:border-red-500 focus:ring-red-200" : ""
                  }`}
                  value={row.transferred}
                  onChange={(e) => onQtyChange(index, Number(e.target.value))}
                  disabled={saving || transferLoading || row.fromServer}
                  aria-invalid={qtyError ? true : undefined}
                  aria-describedby={qtyError ? `${qtyInputId}-err` : undefined}
                />
                {qtyError ? (
                  <p id={`${qtyInputId}-err`} className="text-[10px] text-red-600 mt-0.5" role="alert">
                    {qtyError}
                  </p>
                ) : null}
              </div>
              <div className="flex justify-end sm:justify-center pb-0.5">
                {!row.fromServer ? (
                  <button
                    type="button"
                    className={CRM.iconDanger}
                    onClick={() => onRemoveRow(index)}
                    disabled={saving || transferLoading || rows.length <= 1}
                    title="Remove row"
                    aria-label="Remove row"
                  >
                    <i className="ri-delete-bin-line" />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
