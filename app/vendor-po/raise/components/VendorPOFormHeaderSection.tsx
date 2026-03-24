"use client";
import React from "react";
import { CRM } from "../../vendor-list/crmUiClasses";
import { VPO_FORM } from "./vendorPoFormLayoutClasses";

export type VendorOption = { id: string; vendorCode: string; vendorName: string };

type Props = {
  locked: boolean;
  vendorId: string;
  creditDays: number;
  estimatedOrderDeliveryDate: string;
  remarks: string;
  vendors: VendorOption[];
  errors: Record<string, string>;
  onVendorChange?: (vendorId: string) => void;
  setVendorId: (id: string) => void;
  setCreditDays: (n: number) => void;
  setEstimatedOrderDeliveryDate: (v: string) => void;
  setRemarks: (v: string) => void;
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
  remarks,
  vendors,
  errors,
  onVendorChange,
  setVendorId,
  setCreditDays,
  setEstimatedOrderDeliveryDate,
  setRemarks,
  clearError,
}: Props) {
  return (
    <div>
      <div className={VPO_FORM.grid2}>
        <div>
          <label className={VPO_FORM.labelRequired}>
            Vendor <span className="text-red-500">*</span>
          </label>
          <select
            className={`${CRM.select} ${errors.vendor ? "border-danger" : ""}`}
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
                {v.vendorCode} – {v.vendorName}
              </option>
            ))}
          </select>
          {errors.vendor && <p className="text-danger text-xs mt-1">{errors.vendor}</p>}
        </div>
        <div>
          <label className={VPO_FORM.labelRequired}>
            Credit Days <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={0}
            className={`${CRM.input} ${errors.creditDays ? "border-danger" : ""}`}
            value={creditDays}
            onChange={(e) => setCreditDays(Math.max(0, Number(e.target.value || 0)))}
            disabled={locked}
            placeholder="0"
          />
          {errors.creditDays && <p className="text-danger text-xs mt-1">{errors.creditDays}</p>}
        </div>
        <div className="md:col-span-2">
          <label className={VPO_FORM.labelRequired}>
            Estimated Order Delivery Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            className={`${CRM.input} ${errors.estimatedOrderDeliveryDate ? "border-danger" : ""}`}
            value={estimatedOrderDeliveryDate}
            onChange={(e) => {
              setEstimatedOrderDeliveryDate(e.target.value);
              if (errors.estimatedOrderDeliveryDate) clearError("estimatedOrderDeliveryDate");
            }}
            disabled={locked}
          />
          {errors.estimatedOrderDeliveryDate && (
            <p className="text-danger text-xs mt-1">{errors.estimatedOrderDeliveryDate}</p>
          )}
        </div>
      </div>
      <div className="mt-4">
        <label className={VPO_FORM.labelOptional}>Notes</label>
        <textarea
          className={CRM.input}
          rows={2}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          disabled={locked}
          placeholder="Additional notes (optional)"
        />
      </div>
    </div>
  );
}
