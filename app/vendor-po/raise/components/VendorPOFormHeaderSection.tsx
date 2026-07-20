"use client";

import React, { useState } from "react";
import VendorPickerModal from "./VendorPickerModal";

export type VendorOption = { id: string; vendorCode: string; vendorName: string };

type Props = {
  canEditHeader: boolean;
  vendorId: string;
  selectedVendor: VendorOption | null;
  creditDays: number;
  estimatedOrderDeliveryDate: string;
  errors: Record<string, string>;
  onVendorSelect: (vendor: VendorOption) => void;
  setCreditDays: (n: number) => void;
  setEstimatedOrderDeliveryDate: (v: string) => void;
  clearError: (key: string) => void;
};

/**
 * Header block: vendor (searchable modal picker), credit days, estimated delivery.
 */
export default function VendorPOFormHeaderSection({
  canEditHeader,
  vendorId,
  selectedVendor,
  creditDays,
  estimatedOrderDeliveryDate,
  errors,
  onVendorSelect,
  setCreditDays,
  setEstimatedOrderDeliveryDate,
  clearError,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const displayLabel = selectedVendor
    ? `${selectedVendor.vendorCode} - ${selectedVendor.vendorName}`
    : "Select vendor";

  const handleSelect = (vendor: VendorOption) => {
    onVendorSelect(vendor);
    setPickerOpen(false);
    if (errors.vendor) clearError("vendor");
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block" htmlFor="vendor-picker-trigger">
            Vendor <span className="text-red-500">*</span>
          </label>
          {canEditHeader ? (
            <button
              id="vendor-picker-trigger"
              type="button"
              onClick={() => setPickerOpen(true)}
              className={`w-full px-2 py-1.5 text-xs border rounded text-left flex items-center justify-between focus:ring-0 focus:border-purple-300 ${
                errors.vendor ? "border-red-400" : "border-gray-200"
              } ${vendorId ? "text-gray-800" : "text-gray-400"}`}
              aria-label="Select vendor"
              aria-haspopup="dialog"
              aria-expanded={pickerOpen}
            >
              <span className="truncate">{displayLabel}</span>
              <i className="ri-search-line text-gray-400 text-sm shrink-0 ml-2" />
            </button>
          ) : (
            <div className="w-full px-2 py-1.5 text-xs border rounded border-gray-200 bg-gray-50 text-gray-700">
              {displayLabel}
            </div>
          )}
          {errors.vendor && <p className="text-red-600 text-xs mt-1">{errors.vendor}</p>}
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">
            Credit Days <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={0}
            className={`w-full px-2 py-1.5 text-xs border rounded focus:ring-0 focus:border-purple-300 ${
              errors.creditDays ? "border-red-400" : "border-gray-200"
            }`}
            value={creditDays}
            onChange={(e) => setCreditDays(Math.max(0, Number(e.target.value || 0)))}
            disabled={!canEditHeader}
            placeholder="0"
          />
          {errors.creditDays && <p className="text-red-600 text-xs mt-1">{errors.creditDays}</p>}
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">
            Estimated Order Delivery Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            className={`w-full px-2 py-1.5 text-xs border rounded focus:ring-0 focus:border-purple-300 ${
              errors.estimatedOrderDeliveryDate ? "border-red-400" : "border-gray-200"
            }`}
            value={estimatedOrderDeliveryDate}
            onChange={(e) => {
              setEstimatedOrderDeliveryDate(e.target.value);
              if (errors.estimatedOrderDeliveryDate) clearError("estimatedOrderDeliveryDate");
            }}
            disabled={!canEditHeader}
          />
          {errors.estimatedOrderDeliveryDate && (
            <p className="text-red-600 text-xs mt-1">{errors.estimatedOrderDeliveryDate}</p>
          )}
        </div>
        <div />
      </div>

      <VendorPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={handleSelect} />
    </>
  );
}
