"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  normalizeWarehouseOrderStatus,
  warehouseOrderStatusLabel,
  warehouseOrderFlowStatusLabel,
  type WarehouseOrder,
} from "@/shared/services/whmsWarehouseOrderService";
import { clientEditHref } from "@/app/warehouse-management/clients/components/tradeClientCompleteness";
import { groupWarehouseOrdersByDate } from "./warehouseOrderDateGrouping";

const th =
  "px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200";
const thFirst =
  "pl-[10px] pr-1 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200";
const thLast =
  "px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200";
const td =
  "px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200";
const tdBold =
  "pl-[10px] pr-1 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200";

function statusPill(status?: string) {
  const s = normalizeWarehouseOrderStatus(status);
  const cls =
    s === "cancelled"
      ? "bg-red-100 text-red-800"
      : s === "dispatched"
        ? "bg-teal-100 text-teal-800"
        : s === "packed"
          ? "bg-emerald-100 text-emerald-800"
          : s === "in-progress"
            ? "bg-violet-100 text-violet-800"
            : s === "pending"
              ? "bg-sky-100 text-sky-800"
              : "bg-amber-100 text-amber-800";
  return (
    <span
      className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded tracking-tight ${cls}`}
    >
      {warehouseOrderStatusLabel(s)}
    </span>
  );
}

function hasIncompleteClient(o: WarehouseOrder): boolean {
  const meta = o.meta as Record<string, unknown> | undefined;
  return Array.isArray(meta?.clientIncompleteFields) && meta.clientIncompleteFields.length > 0;
}

function isWebsiteOrder(o: WarehouseOrder): boolean {
  return (o.meta as Record<string, unknown> | undefined)?.source === "addonweb";
}

function websiteSyncIcon(o: WarehouseOrder) {
  if (!isWebsiteOrder(o)) return null;
  const err = String((o.meta as Record<string, unknown> | undefined)?.lastWebsitePushError || "").trim();
  if (err) {
    return (
      <i
        className="ri-error-warning-fill text-red-500 text-xs"
        title={err}
        aria-label="Website sync failed"
      />
    );
  }
  if ((o.meta as Record<string, unknown> | undefined)?.lastWebsitePushAt) {
    return <i className="ri-checkbox-circle-fill text-emerald-500 text-xs" title="Synced" aria-label="Website synced" />;
  }
  return <i className="ri-time-line text-amber-500 text-xs" title="Pending sync" aria-label="Website sync pending" />;
}

function totalQty(o: WarehouseOrder): number {
  const a =
    o.styleCodeSinglePair?.reduce((s, r) => s + (Number(r.quantity) || 0), 0) ??
    0;
  const b =
    o.styleCodeMultiPair?.reduce((s, r) => s + (Number(r.quantity) || 0), 0) ??
    0;
  return a + b;
}

function flowPill(flowStatus?: string) {
  if (!flowStatus) return <span className="text-[10px] text-gray-400">—</span>;
  const s = String(flowStatus);
  const cls = s === "cancelled"
    ? "bg-red-100 text-red-800"
    : s.startsWith("dispatched") || s === "delivered" || s === "partial-dispatched" || s === "ready-for-pickup"
      ? "bg-teal-100 text-teal-800"
      : s === "billed" || s === "ready-to-dispatch" || s === "sent-to-billing"
        ? "bg-emerald-100 text-emerald-800"
        : s.includes("scanning")
          ? "bg-indigo-100 text-indigo-800"
          : s.includes("barcode") || s === "packing-done"
            ? "bg-violet-100 text-violet-800"
            : s.includes("picking")
              ? "bg-amber-100 text-amber-800"
              : "bg-sky-100 text-sky-800";
  return (
    <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded tracking-tight ${cls}`}>
      {warehouseOrderFlowStatusLabel(s)}
    </span>
  );
}

type Props = {
  rows: WarehouseOrder[];
  loading: boolean;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  onFlow?: (id: string) => void;
};

const COLUMN_COUNT = 10;

export default function WarehouseOrdersTable({
  rows,
  loading,
  onView,
  onDelete,
  onFlow,
}: Props) {
  const groupedRows = useMemo(() => groupWarehouseOrdersByDate(rows), [rows]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
        <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">
          Loading Data
        </p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <i className="ri-inbox-2-line text-xl text-gray-200" />
        </div>
        <h3 className="text-xs font-bold text-gray-400 mb-1">DATA EMPTY</h3>
        <p className="text-[11px] text-gray-500">No orders match your filters.</p>
      </div>
    );
  }

  return (
    <table className="w-full border-collapse border border-gray-200 min-w-[1100px]">
      <thead>
        <tr className="bg-gray-50/30">
          <th className={thFirst}>Order #</th>
          <th className={th}>Addon order ID</th>
          <th className={th}>Client</th>
          <th className={th}>Client type</th>
          <th className={th}>Qty</th>
          <th className={th}>Single rows</th>
          <th className={th}>Multi rows</th>
          <th className={th}>Status</th>
          <th className={th}>Flow Stage</th>
          <th className={thLast}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {groupedRows.map(({ dateKey, label, orders }) => (
          <React.Fragment key={dateKey}>
            <tr className="bg-gray-100/80">
              <td
                colSpan={COLUMN_COUNT}
                className="px-3 py-2 text-[11px] font-bold text-gray-700 border border-gray-200"
              >
                <i className="ri-calendar-line mr-1.5 text-purple-600" aria-hidden="true" />
                <span>{label}</span>
                <span className="ml-2 text-[10px] font-semibold text-gray-500">({orders.length})</span>
              </td>
            </tr>
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className={tdBold}>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span>{o.orderNumber?.trim() || o.id}</span>
                    {isWebsiteOrder(o) && (
                      <span className="inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold bg-sky-100 text-sky-800 uppercase tracking-tight">
                        Web
                      </span>
                    )}
                    {websiteSyncIcon(o)}
                  </div>
                </td>
                <td className={td}>{o.addonOrderId?.trim() || "—"}</td>
                <td className={td}>
                  {o.clientId ? (
                    <Link
                      href={clientEditHref(o.clientId, o.id)}
                      className="text-purple-700 hover:text-purple-900 hover:underline"
                    >
                      {o.clientName?.trim() || "—"}
                    </Link>
                  ) : (
                    o.clientName?.trim() || "—"
                  )}
                  {hasIncompleteClient(o) && (
                    <span className="ml-1.5 inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold bg-amber-100 text-amber-800 uppercase tracking-tight">
                      Incomplete client
                    </span>
                  )}
                </td>
                <td className={td}>{o.clientType}</td>
                <td className={td}>{totalQty(o)}</td>
                <td className={td}>{o.styleCodeSinglePair?.length ?? 0}</td>
                <td className={td}>{o.styleCodeMultiPair?.length ?? 0}</td>
                <td className={`${td} border border-gray-200`}>{statusPill(o.status)}</td>
                <td className={`${td} border border-gray-200`}>{flowPill(o.flowStatus as string)}</td>
                <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                  <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    {onFlow && (
                      <button
                        type="button"
                        onClick={() => onFlow(o.id)}
                        className="w-7 h-7 flex items-center justify-center bg-violet-50 text-violet-500 border border-violet-100 rounded hover:bg-violet-100 transition-colors"
                        title="Flow stage / dispatch"
                      >
                        <i className="ri-route-line text-xs" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onView(o.id)}
                      className="w-7 h-7 flex items-center justify-center bg-sky-50 text-sky-500 border border-sky-100 rounded hover:bg-sky-100 transition-colors"
                      title="View"
                    >
                      <i className="ri-eye-line text-xs" />
                    </button>
                    <Link
                      href={`/warehouse-management/orders/edit/${o.id}`}
                      className="w-7 h-7 flex items-center justify-center bg-emerald-50 text-emerald-400 border border-emerald-100 rounded hover:bg-emerald-100 transition-colors"
                      title="Edit"
                    >
                      <i className="ri-pencil-line text-xs" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => onDelete(o.id)}
                      className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-400 border border-red-100 rounded hover:bg-red-100 transition-colors"
                      title="Delete"
                    >
                      <i className="ri-delete-bin-line text-xs" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
}

