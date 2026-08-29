"use client";

import React from "react";
import { VendorPO, VendorPOPriority } from "../raise/types";
import { VendorPurchaseOrder } from "@/shared/services/vendorPurchaseOrderService";
import { vendorPoUiStatusClass } from "../utils/vendorPoFlow";
import { vendorReceiveInvoiceNumbers, vendorReceiveRowSummary } from "./receivePageUtils";

const thCls =
  "px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200";
const tdCls = "px-1.5 py-2.5 text-[12px] border border-gray-200";

export type VendorReceiveOrdersTableProps = {
  orders: VendorPO[];
  detailsOpen: boolean;
  detailsOrderId?: string;
  processingId: string | null;
  canOpenGoodsReceived: (order: VendorPO) => boolean;
  canProcess: (order: VendorPO) => boolean;
  onViewDetails: (order: VendorPO) => void;
  onGoodsReceived: (raw: VendorPurchaseOrder) => void;
  onProcess: (order: VendorPO) => void;
};

/**
 * Priority badge classes for the receive list.
 */
function getPriorityColor(priority: VendorPOPriority) {
  switch (priority) {
    case "Urgent":
      return "bg-red-100 text-red-800";
    case "High":
      return "bg-orange-100 text-orange-800";
    case "Medium":
      return "bg-yellow-100 text-yellow-800";
    case "Low":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

/**
 * Formats a date as `02 Aug 2026`, or em dash when missing.
 */
function formatListDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Invoice-number chips for one receive-list row.
 */
function InvoiceNoCell({ order }: { order: VendorPO }) {
  const invoices = vendorReceiveInvoiceNumbers(order);
  if (invoices.length === 0) {
    return <span className="text-[12px] text-gray-400">—</span>;
  }
  return (
    <ul className="flex flex-wrap gap-1 list-none m-0 p-0" aria-label="Invoice numbers">
      {invoices.map((no) => (
        <li key={no}>
          <span
            className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded whitespace-nowrap"
            title={no}
          >
            {no}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Compact receive-list table (PO rows + goods-received / process actions).
 */
export default function VendorReceiveOrdersTable({
  orders,
  detailsOpen,
  detailsOrderId,
  processingId,
  canOpenGoodsReceived,
  canProcess,
  onViewDetails,
  onGoodsReceived,
  onProcess,
}: VendorReceiveOrdersTableProps) {
  return (
    <table className="w-full border-collapse border border-gray-200">
      <thead>
        <tr className="bg-gray-50/30">
          <th className={thCls}>PO No</th>
          <th className={thCls}>PO Date</th>
          <th className={thCls}>Est. delivery</th>
          <th className={thCls}>Invoice no</th>
          <th className={thCls}>Vendor</th>
          <th className={thCls}>Status</th>
          <th className={thCls}>Priority</th>
          <th className={thCls}>Summary</th>
          <th className={`${thCls} text-right`}>Ordered</th>
          <th className={`${thCls} text-right`}>Pending</th>
          <th className={`${thCls} text-right pr-[10px]`}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => {
          const pendingQty = order.totalQty - (order.receivedQty ?? 0);
          const goodsDisabled = !canOpenGoodsReceived(order);
          const processDisabled = !canProcess(order);
          const sum = vendorReceiveRowSummary(order);
          return (
            <tr
              key={order.id}
              className={`hover:bg-gray-50/50 transition-colors ${
                detailsOpen && detailsOrderId === order.id ? "!bg-primary/5" : ""
              }`}
            >
              <td className={`${tdCls} font-bold text-gray-900`}>{order.poNo}</td>
              <td className={`${tdCls} text-gray-600`}>{formatListDate(order.poDate)}</td>
              <td className={`${tdCls} text-gray-600`}>
                {formatListDate(order.estimatedOrderDeliveryDate)}
              </td>
              <td className={tdCls}>
                <InvoiceNoCell order={order} />
              </td>
              <td className={`${tdCls} text-gray-700`}>{order.vendorName}</td>
              <td className={tdCls}>
                <span
                  className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full ${vendorPoUiStatusClass(order.status)}`}
                >
                  {order.status}
                </span>
              </td>
              <td className={tdCls}>
                <span
                  className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full ${getPriorityColor(order.priority)}`}
                >
                  {order.priority}
                </span>
              </td>
              <td className={tdCls}>
                <div className="flex flex-col gap-0.5 min-w-[7rem]">
                  <div className="text-[12px] font-bold text-gray-800">
                    ₹{sum.total.toLocaleString()}
                  </div>
                  {sum.received > 0 && (
                    <div className="text-[10px] font-medium text-gray-500">
                      Rec: {sum.received.toLocaleString()} pcs
                    </div>
                  )}
                  {sum.ordered > 0 && (
                    <div className="text-[10px] font-medium text-gray-500">
                      Ord: {sum.ordered.toLocaleString()} pcs
                    </div>
                  )}
                  {(sum.pending > 0 || (sum.ordered > 0 && sum.received === 0)) && (
                    <div
                      className={`text-[10px] font-medium ${
                        sum.pending > 0 ? "text-orange-600" : "text-green-600"
                      }`}
                    >
                      Pending: {sum.pending.toLocaleString()} pcs
                    </div>
                  )}
                  {sum.ordered > 0 && sum.received > sum.ordered && (
                    <div
                      className="text-[10px] font-bold text-green-600"
                      title="Received more than ordered (extra qty counted at receiving)"
                    >
                      Extra received: {(sum.received - sum.ordered).toLocaleString()} pcs
                    </div>
                  )}
                </div>
              </td>
              <td className={`${tdCls} text-gray-900 text-right`}>{order.totalQty.toLocaleString()}</td>
              <td className={`${tdCls} text-right`}>
                {pendingQty < 0 ? (
                  <span
                    className="inline-flex flex-col items-end leading-tight"
                    title={`Over-received: ${Math.abs(pendingQty).toLocaleString()} pcs more than ordered`}
                  >
                    <span className="text-gray-900">0</span>
                    <span className="text-[10px] font-bold text-green-600">
                      +{Math.abs(pendingQty).toLocaleString()} extra received
                    </span>
                  </span>
                ) : (
                  <span className="text-gray-900">{pendingQty.toLocaleString()}</span>
                )}
              </td>
              <td className={`${tdCls} text-right`}>
                <div className="flex flex-wrap items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => onViewDetails(order)}
                    className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-400 border border-blue-100 rounded hover:bg-blue-100 transition-colors shrink-0"
                    title="View details"
                    aria-label={`View details for ${order.poNo}`}
                  >
                    <i className="ri-eye-line text-xs" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const raw = order.rawPurchaseOrder;
                      if (raw) onGoodsReceived(raw);
                    }}
                    disabled={goodsDisabled}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-600 text-white text-[10px] font-bold rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={goodsDisabled ? "Nothing pending to receive" : "Record goods received (invoice + qty)"}
                  >
                    <i className="ri-checkbox-circle-line text-xs" />
                    Goods received
                  </button>
                  <button
                    type="button"
                    onClick={() => onProcess(order)}
                    disabled={processDisabled || processingId === order.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white text-gray-700 text-[10px] font-bold rounded border border-gray-200 hover:border-purple-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      processDisabled
                        ? "Complete goods receipt with invoice/boxes first"
                        : "Create boxes (if needed) and open process"
                    }
                  >
                    {processingId === order.id ? (
                      <i className="ri-loader-4-line animate-spin text-xs" />
                    ) : (
                      <i className="ri-box-3-line text-xs" />
                    )}
                    Process
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
