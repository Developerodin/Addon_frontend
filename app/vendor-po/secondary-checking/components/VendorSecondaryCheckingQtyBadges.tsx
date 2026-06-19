"use client";

import React from "react";
import type { QualityFloorQuantity } from "@/shared/services/vendorProductionFlowService";
import { getArticleVendorCode, statusBadgeClass } from "../utils/groupVendorScFlows";
import type { VendorProductionFlow } from "@/shared/services/vendorProductionFlowService";

type Props = {
  sc: QualityFloorQuantity;
};

/**
 * Renders M1/M2/M3/VM4 quantity badges for a secondary checking flow.
 */
export function VendorSecondaryCheckingQtyBadges({ sc }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <div className="bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
        <span className="text-emerald-700 font-bold text-[10px]">
          M1: {sc.m1Quantity ?? 0}
        </span>
      </div>
      <div className="bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
        <span className="text-amber-700 font-bold text-[10px]">
          M2: {sc.m2Quantity ?? 0}
        </span>
      </div>
      <div className="bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded">
        <span className="text-violet-700 font-bold text-[10px]">
          M3: {sc.m3Quantity ?? 0}
        </span>
      </div>
      <div className="bg-red-50 border border-red-100 px-1.5 py-0.5 rounded">
        <span className="text-red-700 font-bold text-[10px]">
          VM4: {sc.vm4Quantity ?? (sc as { m4Quantity?: number }).m4Quantity ?? 0}
        </span>
      </div>
    </div>
  );
}

type FlowRowProps = {
  flow: VendorProductionFlow;
  highlight?: boolean;
  onProcess: (flow: VendorProductionFlow) => void;
  showProduct?: boolean;
};

/**
 * Shared table row for a single article (production flow) on secondary checking.
 */
export function VendorSecondaryCheckingFlowRow({
  flow,
  highlight = false,
  onProcess,
  showProduct = true,
}: FlowRowProps) {
  const sc = flow.floorQuantities.secondaryChecking;
  const productName =
    typeof flow.product === "object" ? flow.product?.name : undefined;

  return (
    <tr
      className={`transition-colors ${
        highlight
          ? "bg-purple-50 ring-1 ring-inset ring-purple-200"
          : "hover:bg-gray-50/50"
      }`}
    >
      {showProduct && (
        <td className="px-1.5 py-2.5 border border-gray-200">
          <div className="font-bold text-gray-900 text-[12px]">
            {productName || "—"}
          </div>
          <div className="text-[10px] text-gray-500 font-semibold mt-0.5">
            {getArticleVendorCode(flow)}
          </div>
          <div className="text-[10px] text-gray-400 font-medium">
            Ref: {flow.referenceCode || "—"}
          </div>
        </td>
      )}
      <td className="px-1.5 py-2.5 text-right font-bold text-gray-800 text-[12px] border border-gray-200">
        {flow.plannedQuantity.toLocaleString()}
      </td>
      <td className="px-1.5 py-2.5 text-right border border-gray-200">
        {(sc.pendingFromBoxes ?? 0) > 0 ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-50 border border-orange-200 text-[10px] font-bold text-orange-700">
            <i className="ri-barcode-line text-[9px]" aria-hidden="true" />
            {(sc.pendingFromBoxes ?? 0).toLocaleString()}
          </span>
        ) : (
          <span className="text-[11px] text-gray-400 font-medium">0</span>
        )}
      </td>
      <td className="px-1.5 py-2.5 text-right font-medium text-gray-700 text-[12px] border border-gray-200">
        {sc.received.toLocaleString()}
      </td>
      <td className="px-1.5 py-2.5 text-right font-bold text-amber-800 text-[12px] border border-gray-200">
        {(sc.remaining ?? 0).toLocaleString()}
      </td>
      <td className="px-1.5 py-2.5 border border-gray-200">
        <VendorSecondaryCheckingQtyBadges sc={sc} />
      </td>
      <td className="px-1.5 py-2.5 border border-gray-200">
        <span className={statusBadgeClass(flow)}>
          {sc.completed > 0 ? "Completed" : "Pending"}
        </span>
      </td>
      <td className="px-1.5 py-2.5 border border-gray-200">
        <button
          type="button"
          onClick={() => onProcess(flow)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
          aria-label={`Process ${productName || "batch"}`}
        >
          Process
        </button>
      </td>
    </tr>
  );
}
