"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import {
  whmsWarehouseOrders,
  warehouseOrderStatusLabel,
  type WarehouseOrder,
} from "@/shared/services/whmsWarehouseOrderService";

function Field({
  label,
  value,
  wide,
}: {
  label: string;
  value: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={`border border-gray-200 rounded px-3 py-2 bg-white ${
        wide ? "col-span-12" : "col-span-12 sm:col-span-6"
      }`}
    >
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">
        {label}
      </div>
      <div className="text-[12px] font-medium text-gray-800 break-words">
        {value ?? "—"}
      </div>
    </div>
  );
}

type Props = {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
};

export default function WarehouseOrderDetailDrawer({ orderId, open, onClose }: Props) {
  const [order, setOrder] = useState<WarehouseOrder | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !orderId) {
      setOrder(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await whmsWarehouseOrders.get(orderId);
        if (!cancelled) setOrder(data);
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Failed to load order");
          onClose();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, orderId, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const title = order?.orderNumber?.trim() || orderId || "Order";

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} aria-hidden />
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-xl z-50 flex flex-col border-l border-gray-200">
        <div className="flex justify-between items-start gap-2 p-[10px] border-b border-gray-200 shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-800 truncate">Warehouse order</h3>
            <p className="text-[11px] font-medium text-gray-600 truncate mt-0.5">{title}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {orderId && (
              <Link
                href={`/warehouse-management/orders/edit/${orderId}`}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded hover:bg-emerald-700"
                onClick={onClose}
              >
                <i className="ri-pencil-line text-xs" /> Edit
              </Link>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-800 p-1.5 rounded hover:bg-gray-100"
              aria-label="Close"
            >
              <i className="ri-close-line text-lg" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-[10px] text-[11px]">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <i className="ri-loader-4-line animate-spin text-2xl mb-2" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Loading</span>
            </div>
          )}

          {!loading && order && (
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-2">
                <Field label="Order #" value={order.orderNumber || order.id} />
                <Field label="Addon order ID" value={order.addonOrderId?.trim() || "—"} />
                <Field label="Status" value={warehouseOrderStatusLabel(order.status)} />
                <Field label="Date" value={order.date ? new Date(order.date).toLocaleString() : "—"} />
                <Field label="Client type" value={order.clientType} />
                <Field label="Client name" value={order.clientName || "—"} />
              </div>

              <div className="border-t border-gray-100 pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-[3px] h-4 bg-purple-600 rounded-full" />
                  <h4 className="text-[11px] font-bold text-gray-800 uppercase tracking-wide">
                    Single pair rows
                  </h4>
                  <span className="text-[10px] font-bold text-gray-500">
                    {order.styleCodeSinglePair?.length ?? 0}
                  </span>
                </div>
                {(order.styleCodeSinglePair?.length ?? 0) === 0 ? (
                  <p className="text-[11px] text-gray-500">—</p>
                ) : (
                  <div className="space-y-2">
                    {order.styleCodeSinglePair!.map((r, idx) => (
                      <div key={`single-${idx}`} className="border border-gray-200 rounded p-2 bg-white">
                        <div className="grid grid-cols-12 gap-2">
                          <Field label="Style code" value={r.styleCode || "—"} />
                          <Field label="Pack" value={r.pack || "—"} />
                          <Field label="Colour" value={r.colour || "—"} />
                          <Field label="Type" value={r.type || "—"} />
                          <Field label="Pattern" value={r.pattern || "—"} />
                          <Field label="Qty" value={r.quantity} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-[3px] h-4 bg-purple-600 rounded-full" />
                  <h4 className="text-[11px] font-bold text-gray-800 uppercase tracking-wide">
                    Multi pair rows
                  </h4>
                  <span className="text-[10px] font-bold text-gray-500">
                    {order.styleCodeMultiPair?.length ?? 0}
                  </span>
                </div>
                {(order.styleCodeMultiPair?.length ?? 0) === 0 ? (
                  <p className="text-[11px] text-gray-500">—</p>
                ) : (
                  <div className="space-y-2">
                    {order.styleCodeMultiPair!.map((r, idx) => (
                      <div
                        key={`multi-${idx}`}
                        className="border border-gray-200 rounded p-2 bg-white"
                      >
                        <div className="grid grid-cols-12 gap-2">
                          <Field label="Pair style code" value={r.styleCode || "—"} />
                          <Field label="Pack" value={r.pack || "—"} />
                          <Field label="Colour" value={r.colour || "—"} />
                          <Field label="Type" value={r.type || "—"} />
                          <Field label="Pattern" value={r.pattern || "—"} />
                          <Field label="Qty" value={r.quantity} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-[10px] text-gray-400 font-medium pt-2 border-t border-gray-100">
                {order.createdAt && (
                  <span className="me-3">Created {new Date(order.createdAt).toLocaleString()}</span>
                )}
                {order.updatedAt && <span>Updated {new Date(order.updatedAt).toLocaleString()}</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

