"use client";

import React, { useMemo, useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { Toaster } from "react-hot-toast";
import {
  whmsWarehouseOrders,
  WarehouseOrder,
  warehouseOrderFlowStatusLabel,
  type PaginatedWarehouseOrders,
} from "@/shared/services/whmsWarehouseOrderService";
import { useWhmsPaginatedList } from "@/shared/hooks/useWhmsPaginatedList";
import {
  WhmsListPagination,
  WhmsListToolbar,
  WhmsOrderJourneyDrawer,
  getDispatchActorFromHistory,
} from "@/shared/components/whms";
import OrderFlowModal from "../orders/components/OrderFlowModal";

type DispatchTab = "active" | "shipped";

const FLOW_BY_TAB: Record<DispatchTab, string> = {
  active: "billed,ready-to-dispatch",
  shipped: "dispatched,partial-dispatched,ready-for-pickup,delivered",
};

const fetchDispatchOrders = (params: { flowStatusIn: string; sortBy: string; page: number; limit: number; q?: string }) =>
  whmsWarehouseOrders.list(params) as Promise<PaginatedWarehouseOrders>;

/**
 * Dispatch workboard: paginated queue + shipped history with operator attribution.
 */
export default function DispatchPage() {
  const [tab, setTab] = useState<DispatchTab>("active");
  const [journeyOrderId, setJourneyOrderId] = useState<string | null>(null);
  const [flowOrderId, setFlowOrderId] = useState<string | null>(null);

  const baseParams = useMemo(
    () => ({ flowStatusIn: FLOW_BY_TAB[tab], sortBy: "createdAt:desc" }),
    [tab]
  );

  const {
    page,
    setPage,
    limit,
    setLimit,
    q,
    setQ,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    results,
    totalPages,
    totalResults,
    loading,
    error,
    refresh,
  } = useWhmsPaginatedList<WarehouseOrder, { flowStatusIn: string; sortBy: string }>({
    fetchFn: fetchDispatchOrders,
    baseParams,
  });

  const handleTabChange = (next: DispatchTab) => {
    setTab(next);
    setPage(1);
  };

  return (
    <>
      <Seo title="Dispatch" />
      <Toaster position="top-right" />

      <div className="box mb-4">
        <div className="box-header flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="box-title">Dispatch</h3>
            <p className="text-xs text-gray-500 mt-1">
              Enter courier / AWB, print labels, and confirm shipment.
            </p>
          </div>
          <button type="button" onClick={() => void refresh()} className="ti-btn ti-btn-light text-[12px]">
            <i className="ri-refresh-line"></i> Refresh
          </button>
        </div>

        <div className="box-body">
          <div className="flex gap-2 mb-4 border-b border-gray-100 pb-2">
            <button
              type="button"
              onClick={() => handleTabChange("active")}
              className={`px-3 py-1.5 text-[12px] font-semibold rounded transition-colors ${
                tab === "active" ? "bg-violet-100 text-violet-800" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Needs Action
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("shipped")}
              className={`px-3 py-1.5 text-[12px] font-semibold rounded transition-colors ${
                tab === "shipped" ? "bg-violet-100 text-violet-800" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Shipped / History
            </button>
          </div>

          <WhmsListToolbar
            search={q}
            onSearchChange={setQ}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            limit={limit}
            onLimitChange={setLimit}
          />

          {error ? <p className="text-sm text-red-600 mb-3">{error}</p> : null}

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">
              {tab === "active"
                ? "No orders waiting for dispatch. Complete billing first."
                : "No shipped orders yet."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50/30">
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Order #</th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Client</th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Stage</th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Courier / AWB</th>
                    {tab === "shipped" ? (
                      <>
                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Dispatched by</th>
                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Dispatch date</th>
                      </>
                    ) : null}
                    <th className="px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((order) => {
                    const dispatchActor = getDispatchActorFromHistory(order.flowHistory);
                    return (
                      <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">{order.orderNumber || order.id}</td>
                        <td className="px-1.5 py-2.5 text-[12px] text-gray-700 border border-gray-200">{order.clientName || "—"}</td>
                        <td className="px-1.5 py-2.5 text-[12px] border border-gray-200">
                          <span className="badge bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5 rounded">
                            {warehouseOrderFlowStatusLabel(order.flowStatus)}
                          </span>
                        </td>
                        <td className="px-1.5 py-2.5 text-[12px] text-gray-600 border border-gray-200">
                          {order.dispatch?.courierName || "—"}
                          {order.dispatch?.trackingNumber ? ` · ${order.dispatch.trackingNumber}` : ""}
                        </td>
                        {tab === "shipped" ? (
                          <>
                            <td className="px-1.5 py-2.5 text-[12px] text-gray-700 border border-gray-200">{dispatchActor?.byName || "—"}</td>
                            <td className="px-1.5 py-2.5 text-[12px] text-gray-600 border border-gray-200">
                              {order.dispatch?.dispatchDate
                                ? new Date(order.dispatch.dispatchDate).toLocaleDateString()
                                : dispatchActor?.at
                                  ? new Date(dispatchActor.at).toLocaleDateString()
                                  : "—"}
                            </td>
                          </>
                        ) : null}
                        <td className="px-1.5 py-2.5 text-right border border-gray-200 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setJourneyOrderId(order.id)}
                            className="ti-btn ti-btn-light px-2 py-1.5 text-[10px] font-semibold mr-1"
                          >
                            View
                          </button>
                          {tab === "active" ? (
                            <button
                              type="button"
                              onClick={() => setFlowOrderId(order.id)}
                              className="ti-btn ti-btn-primary px-3 py-2 min-h-[32px] text-[11px] font-semibold"
                            >
                              <i className="ri-truck-line"></i> Manage
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setFlowOrderId(order.id)}
                              className="ti-btn ti-btn-light px-2 py-1.5 text-[10px] font-semibold"
                            >
                              Flow
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <WhmsListPagination
            page={page}
            totalPages={totalPages}
            totalResults={totalResults}
            onPageChange={setPage}
            itemLabel="orders"
          />
        </div>
      </div>

      {journeyOrderId ? (
        <WhmsOrderJourneyDrawer
          orderId={journeyOrderId}
          onClose={() => setJourneyOrderId(null)}
          onOpenFlowActions={(id) => {
            setJourneyOrderId(null);
            setFlowOrderId(id);
          }}
        />
      ) : null}

      {flowOrderId ? (
        <OrderFlowModal
          orderId={flowOrderId}
          onClose={() => setFlowOrderId(null)}
          onChanged={() => {
            setFlowOrderId(null);
            void refresh();
          }}
        />
      ) : null}
    </>
  );
}
