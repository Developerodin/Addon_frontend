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
import { downloadOrdersScanExcel } from "@/shared/components/whms/orderJourneyScanExcel";
import {
  fetchAllActiveScanOrders,
  fetchAllHistoryScanOrders,
  resolveOrders,
  sessionOrderId,
} from "./scanningBulkDownload";

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
  /** Checked orders. Value is the row we already have, or null when it still needs a fetch. */
  const [selected, setSelected] = useState<Map<string, WarehouseOrder | null>>(new Map());
  const [exporting, setExporting] = useState<"selected" | "all" | null>(null);

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
    setSelected(new Map());
    activeList.setPage(1);
    historyList.setPage(1);
  };

  /**
   * Toggle one order checkbox. Pass the loaded order when the row already has it.
   * @param id - Warehouse order id
   * @param order - Order from the active queue, when available
   */
  const toggleSelected = (id: string, order?: WarehouseOrder) => {
    if (!id) return;
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, order ?? null);
      return next;
    });
  };

  /**
   * Select or clear every order on the current page.
   * @param rows - Page rows as id plus optional order
   * @param allChecked - True when every row on the page is already checked
   */
  const togglePage = (rows: Array<{ id: string; order?: WarehouseOrder }>, allChecked: boolean) => {
    setSelected((prev) => {
      const next = new Map(prev);
      rows.forEach((row) => {
        if (!row.id) return;
        if (allChecked) next.delete(row.id);
        else next.set(row.id, row.order ?? next.get(row.id) ?? null);
      });
      return next;
    });
  };

  /**
   * Download scanned-qty Excel for the checked orders, or every order in the current tab.
   * @param scope - Checked rows, or the full filtered list
   */
  const downloadExcel = async (scope: "selected" | "all") => {
    if (exporting) return;
    if (scope === "selected" && selected.size === 0) {
      toast.error("Select at least one order");
      return;
    }
    setExporting(scope);
    try {
      const orders =
        scope === "selected"
          ? await resolveOrders([...selected.entries()])
          : tab === "active"
            ? await fetchAllActiveScanOrders(activeList.q)
            : await fetchAllHistoryScanOrders(historyList.q);
      if (!orders.length) {
        toast.error("No orders to download");
        return;
      }
      const lineCount = await downloadOrdersScanExcel(
        orders,
        scope === "selected" ? "scanning-selected-scanned-qty.xlsx" : "scanning-all-scanned-qty.xlsx",
      );
      toast.success(
        `Excel downloaded — ${orders.length} order${orders.length === 1 ? "" : "s"}, ${lineCount} scanned lines`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to download Excel");
    } finally {
      setExporting(null);
    }
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
  const activePageRows = activeList.results.map((order) => ({ id: order.id, order }));
  const historyPageRows = historyList.results.map((session) => ({ id: sessionOrderId(session) }));
  const pageRows = tab === "active" ? activePageRows : historyPageRows;
  const pageIds = pageRows.map((row) => row.id).filter(Boolean);
  const allPageChecked = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const excelButtonClass =
    "inline-flex items-center gap-1.5 rounded border border-emerald-600/40 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed";

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
            actions={
              <>
                <button
                  type="button"
                  onClick={() => void downloadExcel("selected")}
                  disabled={exporting !== null || selected.size === 0}
                  className={excelButtonClass}
                  aria-label="Download Excel for the checked orders"
                >
                  <i className={`ri-file-excel-2-line text-sm ${exporting === "selected" ? "animate-pulse" : ""}`} aria-hidden />
                  {exporting === "selected" ? "Downloading…" : `Download selected${selected.size ? ` (${selected.size})` : ""}`}
                </button>
                <button
                  type="button"
                  onClick={() => void downloadExcel("all")}
                  disabled={exporting !== null || list.totalResults === 0}
                  className={excelButtonClass}
                  aria-label="Download Excel for every order in this list"
                >
                  <i className={`ri-file-excel-2-line text-sm ${exporting === "all" ? "animate-pulse" : ""}`} aria-hidden />
                  {exporting === "all" ? "Downloading…" : "Download all"}
                </button>
              </>
            }
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
                      <th className="px-1.5 py-3 text-center border border-gray-200 w-8">
                        <input
                          type="checkbox"
                          checked={allPageChecked}
                          onChange={() => togglePage(activePageRows, allPageChecked)}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                          aria-label="Select all orders on this page"
                        />
                      </th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Order #</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Addon Order ID</th>
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
                        <td className="px-1.5 py-2.5 text-center border border-gray-200">
                          <input
                            type="checkbox"
                            checked={selected.has(order.id)}
                            onChange={() => toggleSelected(order.id, order)}
                            className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                            aria-label={`Select order ${order.orderNumber || order.id}`}
                          />
                        </td>
                        <td className="px-1.5 py-2.5 text-[12px] font-bold border border-gray-200">{order.orderNumber || order.id}</td>
                        <td className="px-1.5 py-2.5 text-[12px] border border-gray-200">{order.addonOrderId?.trim() || "—"}</td>
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
                    <th className="px-1.5 py-3 text-center border border-gray-200 w-8">
                      <input
                        type="checkbox"
                        checked={allPageChecked}
                        onChange={() => togglePage(historyPageRows, allPageChecked)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                        aria-label="Select all orders on this page"
                      />
                    </th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Order #</th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Addon Order ID</th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Completed by</th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Completed at</th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Match summary</th>
                    <th className="px-1.5 py-3 text-right text-[11px] font-bold uppercase border border-gray-200">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.results.map((s) => {
                    const orderId = sessionOrderId(s);
                    return (
                    <tr key={s.id} className="hover:bg-gray-50/50">
                      <td className="px-1.5 py-2.5 text-center border border-gray-200">
                        <input
                          type="checkbox"
                          checked={Boolean(orderId) && selected.has(orderId)}
                          onChange={() => toggleSelected(orderId)}
                          disabled={!orderId}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500 disabled:opacity-40"
                          aria-label={`Select order ${s.orderNumber || orderId || s.id}`}
                        />
                      </td>
                      <td className="px-1.5 py-2.5 text-[12px] font-bold border border-gray-200">{s.orderNumber || "—"}</td>
                      <td className="px-1.5 py-2.5 text-[12px] border border-gray-200">{s.addonOrderId?.trim() || "—"}</td>
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
                    );
                  })}
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
