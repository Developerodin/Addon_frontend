"use client";

import React, { useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast, Toaster } from "react-hot-toast";
import {
  whmsWarehouseOrders,
  WarehouseOrder,
  warehouseOrderFlowStatusLabel,
  type PaginatedWarehouseOrders,
} from "@/shared/services/whmsWarehouseOrderService";
import { whmsScanning, ScanSession } from "@/shared/services/whmsFulfilmentService";
import { whmsPickListBatches } from "@/shared/services/whmsPickListBatchService";
import { useWhmsPaginatedList } from "@/shared/hooks/useWhmsPaginatedList";
import {
  WhmsListPagination,
  WhmsListToolbar,
  WhmsOrderJourneyDrawer,
} from "@/shared/components/whms";
import ScanningLiveSession from "./components/ScanningLiveSession";

type ScanTab = "active" | "history";

const ACTIVE_BASE = { flowStatusIn: "sent-to-scanning,scanning-in-progress", sortBy: "createdAt:desc" };
const HISTORY_BASE = { status: "completed", sortBy: "createdAt:desc" };

const fetchActiveOrders = (params: { flowStatusIn: string; sortBy: string; page: number; limit: number; q?: string }) =>
  whmsWarehouseOrders.list(params) as Promise<PaginatedWarehouseOrders>;

const fetchCompletedSessions = (params: { status: string; sortBy: string; page: number; limit: number; q?: string }) =>
  whmsScanning.list({ ...params, status: "completed", sortBy: "createdAt:desc" });

/**
 * Scanning workboard with active queue, completed session history, and live scan UI.
 */
export default function ScanningPage() {
  const [tab, setTab] = useState<ScanTab>("active");
  const [session, setSession] = useState<ScanSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [journeyOrderId, setJourneyOrderId] = useState<string | null>(null);
  const [scannerByOrder, setScannerByOrder] = useState<Record<string, string>>({});
  const [batchByOrder, setBatchByOrder] = useState<Record<string, string>>({});

  const activeList = useWhmsPaginatedList<WarehouseOrder, { flowStatusIn: string; sortBy: string }>({
    fetchFn: fetchActiveOrders,
    baseParams: ACTIVE_BASE,
    enabled: !session && tab === "active",
  });

  const historyList = useWhmsPaginatedList<ScanSession, { status: string; sortBy: string }>({
    fetchFn: fetchCompletedSessions,
    baseParams: HISTORY_BASE,
    enabled: !session && tab === "history",
  });

  React.useEffect(() => {
    if (tab !== "active" || session || activeList.loading) return;
    void (async () => {
      try {
        const open = await whmsScanning.list({ status: "open", limit: 50 });
        const map: Record<string, string> = {};
        (open.results || []).forEach((s) => {
          const oid =
            typeof s.orderId === "string" ? s.orderId : String((s.orderId as { id?: string })?.id || "");
          if (oid && s.startedByName) map[oid] = s.startedByName;
        });
        setScannerByOrder(map);
      } catch {
        /* non-fatal */
      }
    })();
  }, [tab, session, activeList.loading, activeList.page, activeList.totalResults]);

  React.useEffect(() => {
    if (tab !== "active" || !activeList.results.length) return;
    void (async () => {
      const map: Record<string, string> = {};
      await Promise.all(
        activeList.results.map(async (order) => {
          if (!order.activeBatchId) return;
          try {
            const info = await whmsPickListBatches.forOrder(order.id);
            if (info?.type === "combined") map[order.id] = info.batchNumber;
          } catch {
            /* ignore */
          }
        }),
      );
      setBatchByOrder(map);
    })();
  }, [tab, activeList.results]);

  const openSession = async (order: WarehouseOrder) => {
    setBusy(true);
    try {
      const s = await whmsScanning.createSession(order.id);
      setSession(s);
      if (s.startedByName) {
        setScannerByOrder((prev) => ({ ...prev, [order.id]: s.startedByName || "" }));
      }
      toast.success(`Scan session open for ${order.orderNumber || order.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open session");
    } finally {
      setBusy(false);
    }
  };

  const handleTabChange = (next: ScanTab) => {
    setTab(next);
    activeList.setPage(1);
    historyList.setPage(1);
  };

  const refreshLists = () => {
    void activeList.refresh();
    void historyList.refresh();
  };

  if (session) {
    return (
      <>
        <Seo title="Scanning" />
        <Toaster position="top-right" />
        <ScanningLiveSession
          session={session}
          busy={busy}
          onBack={() => setSession(null)}
          onSessionChange={setSession}
          onComplete={refreshLists}
        />
      </>
    );
  }

  const list = tab === "active" ? activeList : historyList;

  return (
    <>
      <Seo title="Scanning" />
      <Toaster position="top-right" />

      <div className="box">
        <div className="box-header flex flex-wrap items-center justify-between gap-2">
          <h3 className="box-title">Scanning</h3>
          <button type="button" onClick={refreshLists} className="ti-btn ti-btn-light text-[12px]">
            <i className="ri-refresh-line"></i> Refresh
          </button>
        </div>
        <div className="box-body">
          <div className="flex gap-2 mb-4 border-b border-gray-100 pb-2">
            <button
              type="button"
              onClick={() => handleTabChange("active")}
              className={`px-3 py-1.5 text-[12px] font-semibold rounded ${tab === "active" ? "bg-violet-100 text-violet-800" : "text-gray-600 hover:bg-gray-50"}`}
            >
              Active Queue
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("history")}
              className={`px-3 py-1.5 text-[12px] font-semibold rounded ${tab === "history" ? "bg-violet-100 text-violet-800" : "text-gray-600 hover:bg-gray-50"}`}
            >
              History
            </button>
          </div>

          <WhmsListToolbar
            search={list.q}
            onSearchChange={list.setQ}
            dateFrom={list.dateFrom}
            dateTo={list.dateTo}
            onDateFromChange={list.setDateFrom}
            onDateToChange={list.setDateTo}
            limit={list.limit}
            onLimitChange={list.setLimit}
            showDates={tab === "history"}
          />

          {list.error ? <p className="text-sm text-red-600 mb-3">{list.error}</p> : null}

          {list.loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50" />
            </div>
          ) : tab === "active" ? (
            activeList.results.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">No orders awaiting scanning.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50/30">
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Order #</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Client</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Batch</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Stage</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Scanner</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Date</th>
                      <th className="px-1.5 py-3 text-right text-[11px] font-bold uppercase border border-gray-200">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeList.results.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50/50">
                        <td className="px-1.5 py-2.5 text-[12px] font-bold border border-gray-200">{order.orderNumber || order.id}</td>
                        <td className="px-1.5 py-2.5 text-[12px] border border-gray-200">{order.clientName || "—"}</td>
                        <td className="px-1.5 py-2.5 text-[12px] border border-gray-200">
                          {batchByOrder[order.id] ? (
                            <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-100 text-violet-800 uppercase">
                              {batchByOrder[order.id]}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-1.5 py-2.5 text-[12px] border border-gray-200">{warehouseOrderFlowStatusLabel(order.flowStatus as string)}</td>
                        <td className="px-1.5 py-2.5 text-[12px] border border-gray-200">
                          {order.flowStatus === "scanning-in-progress" ? scannerByOrder[order.id] || "In progress" : "—"}
                        </td>
                        <td className="px-1.5 py-2.5 text-[12px] border border-gray-200">{order.date ? new Date(order.date).toLocaleDateString() : "—"}</td>
                        <td className="px-1.5 py-2.5 text-right border border-gray-200 whitespace-nowrap">
                          <button type="button" onClick={() => setJourneyOrderId(order.id)} className="ti-btn ti-btn-light px-2 py-1.5 text-[10px] font-semibold mr-1">View</button>
                          <button type="button" disabled={busy} onClick={() => void openSession(order)} className="ti-btn ti-btn-primary px-3 py-2 text-[11px] font-semibold">
                            {order.flowStatus === "scanning-in-progress" ? "Resume" : "Start"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : historyList.results.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">No completed scan sessions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50/30">
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Order #</th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Completed by</th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Completed at</th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Match summary</th>
                    <th className="px-1.5 py-3 text-right text-[11px] font-bold uppercase border border-gray-200">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.results.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50/50">
                      <td className="px-1.5 py-2.5 text-[12px] font-bold border border-gray-200">{s.orderNumber || "—"}</td>
                      <td className="px-1.5 py-2.5 text-[12px] border border-gray-200">{s.completedByName || s.startedByName || "—"}</td>
                      <td className="px-1.5 py-2.5 text-[12px] border border-gray-200">{s.completedAt ? new Date(s.completedAt).toLocaleString() : "—"}</td>
                      <td className="px-1.5 py-2.5 text-[12px] border border-gray-200">
                        {s.summary.matched} ok · {s.summary.short} short · {s.summary.excess} excess
                      </td>
                      <td className="px-1.5 py-2.5 text-right border border-gray-200">
                        <button
                          type="button"
                          onClick={() => setJourneyOrderId(typeof s.orderId === "string" ? s.orderId : String((s.orderId as { id?: string })?.id || ""))}
                          className="ti-btn ti-btn-light px-2 py-1.5 text-[10px] font-semibold"
                        >
                          Journey
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <WhmsListPagination
            page={list.page}
            totalPages={list.totalPages}
            totalResults={list.totalResults}
            onPageChange={list.setPage}
            itemLabel={tab === "active" ? "orders" : "sessions"}
          />
        </div>
      </div>

      {journeyOrderId ? (
        <WhmsOrderJourneyDrawer orderId={journeyOrderId} onClose={() => setJourneyOrderId(null)} />
      ) : null}
    </>
  );
}
