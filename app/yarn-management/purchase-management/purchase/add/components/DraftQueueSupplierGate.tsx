"use client";

import React from "react";
import Link from "next/link";
import { type Supplier } from "@/shared/services/supplierService";

export type DraftQueueSupplierGateProps = {
  /** Resolved supplier catalogue for the picker. */
  suppliers: Supplier[];
  /** Busy while fetching suppliers client-side. */
  suppliersLoading: boolean;
  /** User-chosen Mongo id pending confirmation. */
  selectedSupplierId: string;
  /** Updates local selection prior to navigating with `supplierId`. */
  onSelectedSupplierChange: (nextId: string) => void;
  /** Advances into the PurchaseForm once a vendor lock is confirmed. */
  onContinue: () => void;
  /** Whether downstream draft rows are hydrating. */
  queueHydrating?: boolean;
};

/**
 * Blocking step that forces planners to associate a staging queue with exactly one yarn supplier—
 * aligning server-side merges on `preferredSupplierId`.
 */
export function DraftQueueSupplierGate({
  suppliers,
  suppliersLoading,
  selectedSupplierId,
  onSelectedSupplierChange,
  onContinue,
  queueHydrating,
}: DraftQueueSupplierGateProps) {
  const disabledContinue =
    !selectedSupplierId || suppliersLoading || Boolean(queueHydrating);

  return (
    <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 rounded-md">
      <div className="p-6 md:p-8 max-w-lg mx-auto text-center flex flex-col gap-4">
        <div className="inline-flex mx-auto items-center justify-center rounded-full bg-amber-50 text-amber-900 border border-amber-200 size-14">
          <i className="ri-truck-line text-2xl" aria-hidden />
        </div>
        <div>
          <h2 className="text-sm md:text-base font-bold text-gray-900">Choose yarn supplier first</h2>
          <p className="text-[11px] md:text-[12px] text-gray-600 mt-1">
            Rows staged from Requisition lists are partitioned by supplier. Pick the vendor whose queue you
            are covering so lines auto-merge into existing draft PO buckets for them.
          </p>
        </div>

        <div className="text-left">
          <label
            htmlFor="draft-queue-supplier"
            className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wide"
          >
            Supplier
          </label>
          <select
            id="draft-queue-supplier"
            className="w-full bg-white border border-gray-200 text-[12px] font-medium rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-200 focus:border-purple-400 disabled:bg-gray-50"
            value={selectedSupplierId}
            disabled={suppliersLoading}
            onChange={(e) => onSelectedSupplierChange(e.target.value)}
            aria-required
            aria-label="Draft queue supplier selector"
          >
            <option value="">Select supplier…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.brandName}
              </option>
            ))}
          </select>
          {suppliersLoading ? (
            <p className="text-[10px] text-gray-500 mt-2" role="status">
              Loading suppliers…
            </p>
          ) : null}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <button
            type="button"
            disabled={disabledContinue}
            onClick={() => onContinue()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-[11px] font-bold rounded-md hover:bg-purple-700 shadow-sm disabled:opacity-45"
          >
            {queueHydrating ? (
              <>
                <span
                  className="inline-block size-3 border-2 border-white/70 border-t-transparent rounded-full animate-spin"
                  aria-hidden
                />
                Hydrating yarns…
              </>
            ) : (
              <>
                <i className="ri-arrow-right-line" aria-hidden />
                Continue to lines
              </>
            )}
          </button>
          <Link
            href="/yarn-management/purchase-management/draft-pos"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-gray-200 text-[11px] font-bold rounded-md hover:bg-gray-50 text-gray-800"
          >
            <i className="ri-arrow-go-back-line" aria-hidden />
            Back to Draft PO hub
          </Link>
        </div>
      </div>
    </div>
  );
}
