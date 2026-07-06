"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  whmsWarehouseOrders,
  warehouseOrderFlowStatusLabel,
  type WarehouseOrder,
  type WarehouseOrderFlowHistoryEntry,
} from "@/shared/services/whmsWarehouseOrderService";
import {
  whmsScanning,
  whmsInvoices,
  type ScanSession,
  type WhmsInvoice,
} from "@/shared/services/whmsFulfilmentService";
import WhmsFlowTimeline from "./WhmsFlowTimeline";
import { getDispatchActorFromHistory } from "./flowHistoryUtils";

export interface WhmsOrderJourneyDrawerProps {
  orderId: string;
  onClose: () => void;
  /** Optional: open full flow modal (dispatch actions, etc.). */
  onOpenFlowActions?: (orderId: string) => void;
}

/**
 * Slide-over drawer showing order-wise fulfilment journey: timeline, scan, invoice, dispatch facts.
 */
export default function WhmsOrderJourneyDrawer({
  orderId,
  onClose,
  onOpenFlowActions,
}: WhmsOrderJourneyDrawerProps) {
  const [order, setOrder] = useState<WarehouseOrder | null>(null);
  const [history, setHistory] = useState<WarehouseOrderFlowHistoryEntry[]>([]);
  const [scanSession, setScanSession] = useState<ScanSession | null>(null);
  const [invoice, setInvoice] = useState<WhmsInvoice | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, h, sessions, invoices] = await Promise.all([
        whmsWarehouseOrders.get(orderId),
        whmsWarehouseOrders.getFlowHistory(orderId).catch(() => null),
        whmsScanning.listSessions({ orderId, limit: 1, sortBy: "createdAt:desc" }).catch(() => null),
        whmsInvoices.list({ orderId, limit: 1 }).catch(() => null),
      ]);
      setOrder(o);
      setHistory(h?.history || o.flowHistory || []);
      setScanSession(sessions?.results?.[0] ?? null);
      setInvoice(invoices?.results?.[0] ?? null);
    } catch {
      setOrder(null);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const dispatchActor = getDispatchActorFromHistory(history);

  return (
    <div
      className="fixed inset-0 z-[998] flex justify-end bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Order journey"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md h-full shadow-xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between z-10">
          <h3 className="text-[14px] font-bold text-gray-800">Order Journey</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50" />
          </div>
        ) : !order ? (
          <p className="text-sm text-gray-500 p-5">Could not load order.</p>
        ) : (
          <div className="p-5 space-y-5">
            <div>
              <p className="text-[15px] font-bold text-gray-900">{order.orderNumber || order.id}</p>
              <p className="text-[12px] text-gray-600 mt-1">{order.clientName || "—"}</p>
              <span className="inline-flex mt-2 px-2 py-1 text-[11px] font-bold rounded bg-violet-100 text-violet-800">
                {warehouseOrderFlowStatusLabel(order.flowStatus)}
              </span>
            </div>

            {scanSession ? (
              <section>
                <p className="text-[11px] font-bold text-gray-600 uppercase mb-2">Scanning</p>
                <div className="text-[12px] text-gray-700 space-y-1 bg-gray-50 rounded p-3">
                  <p>
                    Status: <b>{scanSession.status}</b>
                    {scanSession.status === "completed" && scanSession.summary ? (
                      <span className="text-gray-500">
                        {" "}
                        · {scanSession.summary.matched} matched, {scanSession.summary.short} short
                      </span>
                    ) : null}
                  </p>
                  {scanSession.startedByName ? <p>Started by: {scanSession.startedByName}</p> : null}
                  {scanSession.completedByName ? <p>Completed by: {scanSession.completedByName}</p> : null}
                  {scanSession.completedAt ? (
                    <p>Completed: {new Date(scanSession.completedAt).toLocaleString()}</p>
                  ) : null}
                </div>
              </section>
            ) : null}

            {invoice ? (
              <section>
                <p className="text-[11px] font-bold text-gray-600 uppercase mb-2">Billing</p>
                <div className="text-[12px] text-gray-700 space-y-1 bg-gray-50 rounded p-3">
                  <p>
                    Invoice: <b>{invoice.invoiceNumber}</b> ({invoice.status})
                  </p>
                  <p>Qty: {invoice.totalQuantity}</p>
                  {invoice.createdByName ? <p>Billed by: {invoice.createdByName}</p> : null}
                  {invoice.createdAt ? <p>Created: {new Date(invoice.createdAt).toLocaleString()}</p> : null}
                </div>
              </section>
            ) : null}

            {order.dispatch?.courierName || order.dispatch?.trackingNumber || dispatchActor ? (
              <section>
                <p className="text-[11px] font-bold text-gray-600 uppercase mb-2">Dispatch</p>
                <div className="text-[12px] text-gray-700 space-y-1 bg-gray-50 rounded p-3">
                  {order.dispatch?.courierName ? <p>Courier: {order.dispatch.courierName}</p> : null}
                  {order.dispatch?.trackingNumber ? <p>AWB: {order.dispatch.trackingNumber}</p> : null}
                  {order.dispatch?.dispatchDate ? (
                    <p>Dispatch date: {new Date(order.dispatch.dispatchDate).toLocaleString()}</p>
                  ) : null}
                  {dispatchActor?.byName ? (
                    <p>
                      {warehouseOrderFlowStatusLabel(dispatchActor.stage)} by: {dispatchActor.byName}
                    </p>
                  ) : null}
                </div>
              </section>
            ) : null}

            <section>
              <p className="text-[11px] font-bold text-gray-600 uppercase mb-2">Flow Timeline</p>
              <WhmsFlowTimeline history={history} />
            </section>

            {onOpenFlowActions ? (
              <button
                type="button"
                onClick={() => onOpenFlowActions(orderId)}
                className="ti-btn ti-btn-primary w-full text-[12px] font-semibold"
              >
                <i className="ri-route-line"></i> Open full flow actions
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
