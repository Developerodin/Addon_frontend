"use client";
import React from "react";

export type VendorOption = { id: string; vendorCode: string; vendorName: string };

type Props = {
  locked: boolean;
  vendorId: string;
  creditDays: number;
  estimatedOrderDeliveryDate: string;
  vendors: VendorOption[];
  errors: Record<string, string>;
  onVendorChange?: (vendorId: string) => void;
  setVendorId: (id: string) => void;
  setCreditDays: (n: number) => void;
  setEstimatedOrderDeliveryDate: (v: string) => void;
  clearError: (key: string) => void;
};

/**
 * Header block: vendor, credit days, estimated delivery, notes (yarn PO field order).
 */
export default function VendorPOFormHeaderSection({
  locked,
  vendorId,
  creditDays,
  estimatedOrderDeliveryDate,
  vendors,
  errors,
  onVendorChange,
  setVendorId,
  setCreditDays,
  setEstimatedOrderDeliveryDate,
  clearError,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">
            Vendor <span className="text-red-500">*</span>
          </label>
          <select
            className={`w-full px-2 py-1.5 text-xs border rounded focus:ring-0 focus:border-purple-300 ${
              errors.vendor ? "border-red-400" : "border-gray-200"
            }`}
            value={vendorId}
            onChange={(e) => {
              const nextVendorId = e.target.value;
              setVendorId(nextVendorId);
              onVendorChange?.(nextVendorId);
              if (errors.vendor) clearError("vendor");
            }}
            disabled={locked}
          >
            <option value="">Select vendor</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.vendorCode} - {v.vendorName}
              </option>
            ))}
          </select>
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
            disabled={locked}
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
            disabled={locked}
          />
          {errors.estimatedOrderDeliveryDate && (
            <p className="text-red-600 text-xs mt-1">{errors.estimatedOrderDeliveryDate}</p>
          )}
        </div>
        <div />
      </div>
  );
}
