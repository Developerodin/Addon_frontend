"use client";

import React from "react";
import { CRM } from "../vendor-list/crmUiClasses";
import type { VendorProductionFlow } from "@/shared/services/vendorProductionFlowService";

type Props = {
  flow: VendorProductionFlow;
  /** Section heading, e.g. "1. Batch summary" */
  sectionTitle?: string;
};

/**
 * Read-only batch header block for vendor floor drawers (vendor, VPO, ref, planned, current floor).
 */
export function VendorFloorBatchSummary({ flow, sectionTitle = "1. Batch summary" }: Props) {
  const vendorName = typeof flow.vendor === "object" ? flow.vendor?.header?.vendorName ?? "—" : "—";
  const poNumber = typeof flow.vendorPurchaseOrder === "object" ? flow.vendorPurchaseOrder?.vpoNumber ?? "—" : "—";

  return (
    <div className={CRM.drawerSection}>
      <div className={CRM.drawerSectionHead}>{sectionTitle}</div>
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
        <div>
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">Vendor</span>
          <span className="font-semibold text-gray-900">{vendorName}</span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">VPO</span>
          <span className="font-semibold text-purple-700">{poNumber}</span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">Reference</span>
          <span className="font-semibold text-gray-900">{flow.referenceCode || "—"}</span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">Planned qty</span>
          <span className="font-semibold text-gray-900">{flow.plannedQuantity.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">Current floor</span>
          <span className="font-semibold text-purple-800">{flow.currentFloorKey}</span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">Batch id</span>
          <span className="font-mono text-[10px] text-gray-600">{flow.id}</span>
        </div>
      </div>
    </div>
  );
}
