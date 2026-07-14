"use client";

import React, { useMemo } from "react";
import {
  effectiveWarehouseOrderFlowStatus,
  type WarehouseOrder,
} from "@/shared/services/whmsWarehouseOrderService";

export interface GeneratePickListModalProps {
  open: boolean;
  orders: WarehouseOrder[];
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Confirm dialog before creating a single or combined pick-list batch.
 */
export default function GeneratePickListModal({
  open,
  orders,
  busy,
  onConfirm,
  onClose,
}: GeneratePickListModalProps) {
  const isCombined = orders.length > 1;
  const totalQty = useMemo(
    () =>
      orders.reduce((sum, o) => {
        const a = o.styleCodeSinglePair?.reduce((s, r) => s + (Number(r.quantity) || 0), 0) ?? 0;
        const b = o.styleCodeMultiPair?.reduce((s, r) => s + (Number(r.quantity) || 0), 0) ?? 0;
        return sum + a + b;
      }, 0),
    [orders],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="generate-picklist-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 id="generate-picklist-title" className="text-sm font-bold text-gray-800">
            {isCombined ? "Combine & Generate Pick List" : "Generate Pick List"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500"
            aria-label="Close"
          >
            <i className="ri-close-line" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-3 text-[12px] text-gray-600">
          <p>
            {isCombined
              ? `${orders.length} orders will be combined into one pick list. Style codes with the same SKU/size/shade will be aggregated for picking.`
              : "This order will get its own pick list for the Pick & Pack team."}
          </p>
          <div className="bg-gray-50 border border-gray-100 rounded p-3 max-h-40 overflow-y-auto">
            <ul className="space-y-1">
              {orders.map((o) => (
                <li key={o.id} className="flex justify-between gap-2 font-medium text-gray-800">
                  <span>{o.orderNumber?.trim() || o.id}</span>
                  <span className="text-gray-500 text-[11px]">{o.clientName || o.clientType}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-[11px] text-gray-500">
            Total units across selected orders: <strong className="text-gray-800">{totalQty}</strong>
          </p>
        </div>

        <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-3 py-1.5 text-[11px] font-bold text-gray-600 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="px-3 py-1.5 text-[11px] font-bold text-white bg-purple-600 rounded hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            {busy ? (
              <>
                <i className="ri-loader-4-line animate-spin" aria-hidden /> Creating…
              </>
            ) : (
              <>
                <i className="ri-list-check-2" aria-hidden />
                Confirm & Generate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Whether an order can be selected for pick-list batch generation. */
export function isOrderSelectableForPickBatch(order: WarehouseOrder): boolean {
  const flow = effectiveWarehouseOrderFlowStatus(order);
  if (flow !== "order-created") return false;
  if (order.activeBatchId) return false;
  return true;
}
