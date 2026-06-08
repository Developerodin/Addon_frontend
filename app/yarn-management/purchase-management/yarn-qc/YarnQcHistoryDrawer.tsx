"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  fetchYarnQcHistoryOrders,
  getDefaultQcHistoryEndDate,
  getDefaultQcHistoryStartDate,
  type YarnQcHistoryOrderSummary,
} from "./yarnQcHistoryService";

export interface YarnQcHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Lists POs with completed QC; opens the process page in history view for details.
 */
export function YarnQcHistoryDrawer({ isOpen, onClose }: YarnQcHistoryDrawerProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(getDefaultQcHistoryStartDate());
  const [endDate, setEndDate] = useState(getDefaultQcHistoryEndDate());
  const [orders, setOrders] = useState<YarnQcHistoryOrderSummary[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const data = await fetchYarnQcHistoryOrders({ startDate, endDate });
      setOrders(data);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to load QC history");
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (!isOpen) return;
    void loadOrders();
  }, [isOpen, loadOrders]);

  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.supplier.toLowerCase().includes(q)
    );
  }, [orders, searchTerm]);

  /**
   * Opens the QC process page in read-only history mode for the selected PO.
   */
  const openPoHistory = (order: YarnQcHistoryOrderSummary) => {
    onClose();
    router.push(
      `/yarn-management/purchase-management/yarn-qc/process/${order.id}?view=history`
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden />
      <aside
        className="fixed top-0 right-0 z-50 flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl"
        aria-label="QC history"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-gray-200 p-[10px]">
          <div>
            <h2 className="text-base font-bold text-gray-800">QC History</h2>
            <p className="mt-0.5 text-[10px] text-gray-500">
              Last 12 months by default · select a PO to open full history
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close QC history"
          >
            <i className="ri-close-line text-xl" aria-hidden />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-[10px]">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search PO or supplier…"
                className="w-full rounded border border-gray-200 py-1.5 pl-8 pr-3 text-[11px] font-medium placeholder:text-gray-400 focus:border-purple-300 focus:outline-none focus:ring-0"
                aria-label="Search QC history"
              />
              <i
                className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400"
                aria-hidden
              />
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded border border-gray-200 px-2 py-1.5 text-[10px] font-medium text-gray-600"
              aria-label="History start date"
            />
            <span className="text-[10px] text-gray-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded border border-gray-200 px-2 py-1.5 text-[10px] font-medium text-gray-600"
              aria-label="History end date"
            />
            <button
              type="button"
              onClick={() => void loadOrders()}
              disabled={loadingOrders}
              className="inline-flex items-center gap-1 rounded border border-gray-200 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <i className={`ri-refresh-line text-sm ${loadingOrders ? "animate-spin" : ""}`} aria-hidden />
              Refresh
            </button>
          </div>

          {loadingOrders ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
              <p className="text-[11px] font-medium text-gray-500">Loading QC history…</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <i className="ri-history-line mb-2 text-4xl text-gray-300" aria-hidden />
              <h3 className="mb-1 text-xs font-bold text-gray-400">No QC history</h3>
              <p className="max-w-xs text-[11px] text-gray-500">
                Widen the date range or complete lot QC on a PO — records appear once lots are
                accepted/rejected or boxes have QC data.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {filteredOrders.map((order) => (
                <li
                  key={order.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 hover:bg-gray-50/80"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-bold text-gray-900">{order.orderNumber}</p>
                    <p className="truncate text-[11px] text-gray-600">{order.supplier}</p>
                    <p className="mt-1 text-[10px] text-gray-400">
                      {order.orderDate
                        ? new Date(order.orderDate).toLocaleDateString("en-IN")
                        : "—"}{" "}
                      · ₹{order.totalAmount.toLocaleString()} · {order.qcLotCount} lot(s) QC&apos;d
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openPoHistory(order)}
                    className="inline-flex shrink-0 items-center gap-1 rounded bg-purple-600 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-sm transition-colors hover:bg-purple-700"
                    aria-label={`View QC history for ${order.orderNumber}`}
                  >
                    <i className="ri-external-link-line text-xs" aria-hidden />
                    View
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
