"use client";
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import yarnGrnService, { YarnGrn } from '@/shared/services/yarnGrnService';
import GrnFinancialAdjustments, {
  GrnFinancialAdjustmentsValue,
} from './GrnFinancialAdjustments';

interface GrnHeaderEditorProps {
  /** GRN currently being edited. Drives the initial form state. */
  grn: YarnGrn;
  /** Called with the patched GRN after a successful save. */
  onSaved: (updated: YarnGrn) => void;
  /** Called when the user clicks Cancel. */
  onCancel: () => void;
}

/**
 * Convert any ISO/Date value to the `YYYY-MM-DD` format expected by
 * `<input type="date">`. Returns '' for unparseable input.
 */
const toDateInput = (value?: string | Date | null): string => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

/**
 * Build initial financial adjustment form state from a GRN snapshot.
 * @param grn - source GRN document
 */
const buildFinancialInitial = (grn: YarnGrn): GrnFinancialAdjustmentsValue => ({
  discountPercent: grn.adjustments?.discountPercent ?? 0,
  freightAmount: grn.adjustments?.freightAmount ?? 0,
  freightGstPercent: grn.adjustments?.freightGstPercent ?? 0,
  roundOff: grn.adjustments?.roundOff ?? grn.totals?.roundOff ?? 0,
  roundOffOverridden: Boolean(
    grn.adjustments?.roundOff !== undefined &&
      grn.totals?.roundOffSuggested !== undefined &&
      grn.adjustments.roundOff !== grn.totals.roundOffSuggested
  ),
});

/**
 * In-place editor for a GRN's *header-only* metadata: vendor invoice
 * number/date, discrepancy notes. These fields are post-issuance metadata
 * and editing them does NOT mint a revision (PATCH /yarn-grns/:id/header).
 *
 * Material lot data (cones/weight/boxes/items) cannot be changed here on
 * purpose — those edits flow through PO updates which mint a `-R{n}`.
 */
const GrnHeaderEditor: React.FC<GrnHeaderEditorProps> = ({ grn, onSaved, onCancel }) => {
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState(grn.vendorInvoiceNo || '');
  const [vendorInvoiceDate, setVendorInvoiceDate] = useState(
    toDateInput(grn.vendorInvoiceDate as string | Date | null | undefined)
  );
  const [discrepancyDetails, setDiscrepancyDetails] = useState(grn.discrepancyDetails || '');
  const [financial, setFinancial] = useState<GrnFinancialAdjustmentsValue>(() => buildFinancialInitial(grn));
  const [saving, setSaving] = useState(false);

  // Reset form whenever a different GRN is opened in the drawer.
  useEffect(() => {
    setVendorInvoiceNo(grn.vendorInvoiceNo || '');
    setVendorInvoiceDate(toDateInput(grn.vendorInvoiceDate as string | Date | null | undefined));
    setDiscrepancyDetails(grn.discrepancyDetails || '');
    setFinancial(buildFinancialInitial(grn));
  }, [grn.id, grn.vendorInvoiceNo, grn.vendorInvoiceDate, grn.discrepancyDetails, grn.adjustments, grn.totals]);

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (saving) return;
    setSaving(true);
    // eslint-disable-next-line no-console
    console.info('[GRN] header save start', {
      grnId: grn.id,
      vendorInvoiceNo: vendorInvoiceNo.trim(),
      vendorInvoiceDate,
      discrepancyLength: discrepancyDetails.length,
    });
    try {
      const updated = await yarnGrnService.updateGrnHeader(grn.id, {
        vendorInvoiceNo: vendorInvoiceNo.trim(),
        vendorInvoiceDate: vendorInvoiceDate || undefined,
        discrepancyDetails,
        discountPercent: financial.discountPercent,
        freightAmount: financial.freightAmount,
        freightGstPercent: financial.freightGstPercent,
        roundOff: financial.roundOff,
      });
      // eslint-disable-next-line no-console
      console.info('[GRN] header save ok', { grnId: updated.id, vendorInvoiceNo: updated.vendorInvoiceNo });
      toast.success('GRN header updated');
      onSaved(updated);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update GRN header';
      console.error('[GRN] header save failed', err);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="border border-purple-100 bg-purple-50/40 rounded p-3 space-y-3"
      role="group"
      aria-label="Edit GRN header"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
          <i className="ri-edit-2-line mr-1" aria-hidden />
          Edit Header
        </h4>
        <span className="text-[10px] text-purple-600 italic">
          No revision will be created
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor={`grn-vendor-invoice-no-${grn.id}`}
            className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1"
          >
            Vendor Invoice No
          </label>
          <input
            id={`grn-vendor-invoice-no-${grn.id}`}
            type="text"
            value={vendorInvoiceNo}
            onChange={(e) => setVendorInvoiceNo(e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[12px] focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            placeholder="INV-2026-0042"
            maxLength={120}
            disabled={saving}
            aria-required="false"
          />
        </div>
        <div>
          <label
            htmlFor={`grn-vendor-invoice-date-${grn.id}`}
            className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1"
          >
            Vendor Invoice Date
          </label>
          <input
            id={`grn-vendor-invoice-date-${grn.id}`}
            type="date"
            value={vendorInvoiceDate}
            onChange={(e) => setVendorInvoiceDate(e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-[12px] focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            disabled={saving}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor={`grn-discrepancy-${grn.id}`}
          className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1"
        >
          Discrepancy Details
        </label>
        <textarea
          id={`grn-discrepancy-${grn.id}`}
          value={discrepancyDetails}
          onChange={(e) => setDiscrepancyDetails(e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-[12px] focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-y"
          rows={3}
          maxLength={2000}
          disabled={saving}
          placeholder="Note any short-shipped lots, damaged cones, weight mismatch…"
        />
        <p className="text-[10px] text-gray-400 mt-1 text-right">
          {discrepancyDetails.length} / 2000
        </p>
      </div>

      <GrnFinancialAdjustments
        items={grn.items || []}
        supplierState={grn.supplier?.state}
        initial={financial}
        onChange={setFinancial}
        disabled={saving}
      />

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-3 py-1.5 text-[11px] font-bold text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onMouseDown={() => {
            // eslint-disable-next-line no-console
            console.info('[GRN] save button mousedown');
          }}
          onClick={(e) => {
            // eslint-disable-next-line no-console
            console.info('[GRN] save button clicked', { saving, grnId: grn.id });
            handleSubmit(e);
          }}
          disabled={saving}
          className="px-3 py-1.5 text-[11px] font-bold text-white bg-purple-600 rounded hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer"
          style={{ pointerEvents: saving ? 'none' : 'auto' }}
        >
          {saving ? (
            <>
              <i className="ri-loader-4-line animate-spin mr-1" aria-hidden />
              Saving…
            </>
          ) : (
            <>
              <i className="ri-save-line mr-1" aria-hidden />
              Save Header
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default GrnHeaderEditor;
