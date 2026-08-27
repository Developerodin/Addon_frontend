"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { CRM } from "../vendor-list/crmUiClasses";
import vendorGrnService, {
  type VendorGrn,
  type VendorGrnLineCommercial,
} from "@/shared/services/vendorGrnService";
import { fmtGrnINR } from "@/shared/utils/grnTotals";
import { computeVendorGrnFinancials } from "@/shared/utils/vendorGrnTotals";

interface LineDraft {
  lotNumber: string;
  poItem?: string;
  productId?: string;
  productName: string;
  hsnCode: string;
  rate: number;
  unit: string;
  verifiedQty: number;
  gstRate: number;
  amount: number;
}

interface VendorGrnValuesEditorProps {
  grn: VendorGrn;
  onSaved: (updated: VendorGrn) => void;
}

/**
 * Flatten GRN lots into editable commercial line drafts.
 * @param grn - vendor GRN snapshot
 */
const buildLineDrafts = (grn: VendorGrn): LineDraft[] => {
  const rows: LineDraft[] = [];
  (grn.lots || []).forEach((lot) => {
    (lot.items || []).forEach((item) => {
      const rate = Number(item.rate) || 0;
      const verifiedQty = Number(item.verifiedQty) || 0;
      rows.push({
        lotNumber: lot.lotNumber,
        poItem: item.poItem,
        productId: item.productId,
        productName: item.productName || "—",
        hsnCode: item.hsnCode || "",
        rate,
        unit: item.unit || "Pairs",
        verifiedQty,
        gstRate: Number(item.gstRate) || 0,
        amount: verifiedQty * rate,
      });
    });
  });
  return rows;
};

/**
 * Commercial values editor for vendor GRN print: HSN, Rate, Per, discount ₹, freight, round-off.
 */
const VendorGrnValuesEditor: React.FC<VendorGrnValuesEditorProps> = ({ grn, onSaved }) => {
  const [lines, setLines] = useState<LineDraft[]>(() => buildLineDrafts(grn));
  const [discountAmount, setDiscountAmount] = useState(grn.adjustments?.discountAmount ?? 0);
  const [freightAmount, setFreightAmount] = useState(grn.adjustments?.freightAmount ?? 0);
  const [freightGstPercent, setFreightGstPercent] = useState(
    grn.adjustments?.freightGstPercent ?? 0
  );
  const [roundOff, setRoundOff] = useState(grn.adjustments?.roundOff ?? grn.totals?.roundOff ?? 0);
  const [roundOffOverridden, setRoundOffOverridden] = useState(
    Boolean(
      grn.adjustments?.roundOff != null &&
        grn.totals?.roundOffSuggested != null &&
        grn.adjustments.roundOff !== grn.totals.roundOffSuggested
    )
  );
  const [saving, setSaving] = useState(false);
  const disabled = grn.status !== "active";

  useEffect(() => {
    setLines(buildLineDrafts(grn));
    setDiscountAmount(grn.adjustments?.discountAmount ?? 0);
    setFreightAmount(grn.adjustments?.freightAmount ?? 0);
    setFreightGstPercent(grn.adjustments?.freightGstPercent ?? 0);
    setRoundOff(grn.adjustments?.roundOff ?? grn.totals?.roundOff ?? 0);
    setRoundOffOverridden(
      Boolean(
        grn.adjustments?.roundOff != null &&
          grn.totals?.roundOffSuggested != null &&
          grn.adjustments.roundOff !== grn.totals.roundOffSuggested
      )
    );
  }, [grn]);

  const previewItems = useMemo(
    () =>
      lines.map((line) => ({
        amount: line.verifiedQty * line.rate,
        verifiedQty: line.verifiedQty,
        gstRate: line.gstRate,
      })),
    [lines]
  );

  const preview = useMemo(
    () =>
      computeVendorGrnFinancials(
        previewItems,
        grn.vendor?.state,
        {
          discountAmount,
          freightAmount,
          freightGstPercent,
          roundOff: roundOffOverridden ? roundOff : null,
        },
        true
      ),
    [
      previewItems,
      grn.vendor?.state,
      discountAmount,
      freightAmount,
      freightGstPercent,
      roundOff,
      roundOffOverridden,
    ]
  );

  useEffect(() => {
    if (!roundOffOverridden) {
      setRoundOff(preview.roundOffSuggested);
    }
  }, [preview.roundOffSuggested, roundOffOverridden]);

  /**
   * Patch a single commercial line field.
   * @param index - line index
   * @param patch - partial draft
   */
  const updateLine = (index: number, patch: Partial<LineDraft>) => {
    setLines((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, ...patch };
        next.amount = next.verifiedQty * next.rate;
        return next;
      })
    );
  };

  /**
   * Persist commercial values without minting a GRN revision.
   */
  const handleSave = async () => {
    if (saving || disabled) return;
    setSaving(true);
    try {
      const lineCommercial: VendorGrnLineCommercial[] = lines.map((line) => {
        const row: VendorGrnLineCommercial = {
          lotNumber: line.lotNumber,
          hsnCode: line.hsnCode,
          rate: line.rate,
          unit: line.unit,
        };
        if (line.poItem) row.poItem = line.poItem;
        if (line.productId) row.productId = line.productId;
        return row;
      });
      const updated = await vendorGrnService.updateHeader(grn.id, {
        discountAmount,
        freightAmount,
        freightGstPercent,
        roundOff,
        lineCommercial,
      });
      toast.success("GRN values saved");
      onSaved(updated);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save GRN values");
    } finally {
      setSaving(false);
    }
  };

  const previewRows = [
    { label: "Basic Value", value: preview.subTotal },
    { label: "Discount (−)", value: preview.discountAmount, hide: preview.discountAmount === 0 },
    { label: "Taxable Value", value: preview.taxableValue },
    { label: "Item GST", value: preview.itemGst },
    { label: "Freight / Shipping", value: preview.freightAmount, hide: preview.freightAmount === 0 },
    { label: "Freight GST", value: preview.freightGst, hide: preview.freightGst === 0 },
    { label: "Round Off", value: preview.roundOff, hide: preview.roundOff === 0 },
  ];

  return (
    <section
      className="border border-purple-100 bg-purple-50/40 rounded p-3 space-y-3"
      aria-label="Edit GRN commercial values"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
          Print values
        </h2>
        <span className="text-[10px] text-purple-600 italic">
          {disabled ? "Only active GRNs can be edited" : "No revision will be created"}
        </span>
      </div>

      <div className={CRM.tableWrap}>
        <table className={CRM.table}>
          <thead>
            <tr className={CRM.theadTr}>
              <th scope="col" className={CRM.th}>Lot</th>
              <th scope="col" className={CRM.th}>Article</th>
              <th scope="col" className={CRM.th}>HSN</th>
              <th scope="col" className={CRM.thRight}>Received</th>
              <th scope="col" className={CRM.thRight}>Rate</th>
              <th scope="col" className={CRM.th}>Per</th>
              <th scope="col" className={CRM.thRight}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={`${line.lotNumber}-${line.productId || line.poItem || index}`} className={CRM.tbodyTr}>
                <td className={`${CRM.td} font-medium whitespace-nowrap`}>{line.lotNumber}</td>
                <td className={CRM.td}>{line.productName}</td>
                <td className={CRM.td}>
                  <input
                    type="text"
                    value={line.hsnCode}
                    onChange={(e) => updateLine(index, { hsnCode: e.target.value })}
                    className={CRM.inputTable}
                    disabled={disabled}
                    aria-label={`HSN for ${line.productName} ${line.lotNumber}`}
                  />
                </td>
                <td className={`${CRM.td} text-right tabular-nums`}>{line.verifiedQty}</td>
                <td className={CRM.td}>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={line.rate}
                    onChange={(e) => updateLine(index, { rate: Number(e.target.value) })}
                    className={CRM.inputTableNum}
                    disabled={disabled}
                    aria-label={`Rate for ${line.productName} ${line.lotNumber}`}
                  />
                </td>
                <td className={CRM.td}>
                  <input
                    type="text"
                    value={line.unit}
                    onChange={(e) => updateLine(index, { unit: e.target.value })}
                    className={CRM.inputTable}
                    disabled={disabled}
                    aria-label={`Unit for ${line.productName} ${line.lotNumber}`}
                  />
                </td>
                <td className={`${CRM.td} text-right tabular-nums font-semibold`}>
                  {fmtGrnINR(line.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label htmlFor="vgrn-discount" className={CRM.label}>
            Discount (₹)
          </label>
          <input
            id="vgrn-discount"
            type="number"
            min={0}
            step={0.01}
            value={discountAmount}
            onChange={(e) => setDiscountAmount(Number(e.target.value))}
            className={CRM.input}
            disabled={disabled}
            aria-label="Discount amount in rupees"
          />
        </div>
        <div>
          <label htmlFor="vgrn-freight" className={CRM.label}>
            Freight / Shipping (₹)
          </label>
          <input
            id="vgrn-freight"
            type="number"
            min={0}
            step={0.01}
            value={freightAmount}
            onChange={(e) => setFreightAmount(Number(e.target.value))}
            className={CRM.input}
            disabled={disabled}
            aria-label="Freight or shipping amount"
          />
        </div>
        <div>
          <label htmlFor="vgrn-freight-gst" className={CRM.label}>
            Freight GST (%)
          </label>
          <input
            id="vgrn-freight-gst"
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={freightGstPercent}
            onChange={(e) => setFreightGstPercent(Number(e.target.value))}
            className={CRM.input}
            disabled={disabled}
            aria-label="GST percentage on freight"
          />
        </div>
        <div>
          <label htmlFor="vgrn-round-off" className={CRM.label}>
            Round Off (₹)
          </label>
          <div className="flex gap-1">
            <input
              id="vgrn-round-off"
              type="number"
              step={0.01}
              value={roundOff}
              onChange={(e) => {
                setRoundOff(Number(e.target.value));
                setRoundOffOverridden(true);
              }}
              className={CRM.input}
              disabled={disabled}
              aria-label="Round off amount"
            />
            {roundOffOverridden && (
              <button
                type="button"
                onClick={() => {
                  setRoundOffOverridden(false);
                  setRoundOff(preview.roundOffSuggested);
                }}
                disabled={disabled}
                className="px-2 py-1 text-[10px] font-bold text-purple-700 border border-purple-200 rounded hover:bg-purple-50"
                aria-label="Reset round off to auto-suggested value"
                title={`Auto: ${fmtGrnINR(preview.roundOffSuggested)}`}
              >
                Auto
              </button>
            )}
          </div>
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

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={disabled || saving}
          className={CRM.btnPrimary}
          aria-label="Save GRN print values"
        >
          {saving ? "Saving…" : "Save values"}
        </button>
      </div>
    </section>
  );
};

export default VendorGrnValuesEditor;
