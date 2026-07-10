"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import { toast, Toaster } from "react-hot-toast";
import {
  whmsWarehouseOrders,
  normalizeWarehouseOrderStatus,
  type WarehouseOrder,
  type WarehouseOrderStatus,
  type WarehouseClientType,
} from "@/shared/services/whmsWarehouseOrderService";
import { whmsWarehouseClients } from "@/shared/services/whmsWarehouseClientService";
import WarehouseOrdersTable from "./components/WarehouseOrdersTable";
import WarehouseOrderDetailDrawer from "./components/WarehouseOrderDetailDrawer";
import OrderFlowModal from "./components/OrderFlowModal";
import {
  downloadWarehouseOrdersBulkTemplate,
  fetchAllWarehouseClientsForReference,
  parseWarehouseOrdersBulkImportFile,
} from "./components/warehouseOrderBulkImport";

const STATUS_TABS: Array<{ id: "all" | WarehouseOrderStatus; label: string }> = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "pending", label: "Pending" },
  { id: "in-progress", label: "In-Progress" },
  { id: "packed", label: "Packed" },
  { id: "dispatched", label: "Dispatched" },
  { id: "cancelled", label: "Cancelled" },
];

const CLIENT_TYPE_OPTIONS: Array<{ id: "" | WarehouseClientType; label: string }> = [
  { id: "", label: "All client types" },
  { id: "Store", label: "Store" },
  { id: "Trade", label: "Trade" },
  { id: "Departmental", label: "Departmental" },
  { id: "Ecom", label: "Ecom" },
];

export default function WarehouseOrdersPage() {
  const searchParams = useSearchParams();
  const [statusTab, setStatusTab] = useState<"all" | WarehouseOrderStatus>("all");
  const [clientTypeFilter, setClientTypeFilter] = useState<"" | WarehouseClientType>("");
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [rows, setRows] = useState<WarehouseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [flowOrderId, setFlowOrderId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [websiteTradeOnly, setWebsiteTradeOnly] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const knownWebOrderIdsRef = useRef<Set<string>>(new Set());
  const pollInitializedRef = useRef(false);

  useEffect(() => {
    const viewId = searchParams.get("view")?.trim();
    if (viewId) setDetailId(viewId);
  }, [searchParams]);

  const stats = useMemo(() => {
    const by: Record<WarehouseOrderStatus, number> = {
      draft: 0,
      pending: 0,
      "in-progress": 0,
      packed: 0,
      dispatched: 0,
      cancelled: 0,
    };
    rows.forEach((r) => {
      const s = normalizeWarehouseOrderStatus(r.status);
      by[s] += 1;
    });
    return by;
  }, [rows]);

  useEffect(() => {
    const t = setTimeout(() => {
      void fetchRows();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusTab, clientTypeFilter, websiteTradeOnly, q, dateFrom, dateTo, page, limit]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const poll = () => {
      if (document.visibilityState !== "visible") return;
      void fetchRows({ silent: true });
    };
    const id = window.setInterval(poll, 30000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusTab, clientTypeFilter, websiteTradeOnly, q, dateFrom, dateTo, page, limit]);

  const fetchRows = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const res = await whmsWarehouseOrders.list({
        ...(statusTab !== "all" ? { status: statusTab } : {}),
        ...(clientTypeFilter ? { clientType: clientTypeFilter } : {}),
        ...(websiteTradeOnly ? { clientType: "Trade", source: "addonweb" } : {}),
        ...(q.trim() ? { q: q.trim() } : {}),
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {}),
        page,
        limit,
        sortBy: "createdAt:desc",
      });
      setRows(res.results || []);
      setTotalPages(res.totalPages || 1);
      setTotalResults(res.totalResults || 0);

      const webOrders = (res.results || []).filter(
        (r) => r.meta && (r.meta as Record<string, unknown>).source === "addonweb",
      );
      if (pollInitializedRef.current) {
        const newOnes = webOrders.filter((r) => !knownWebOrderIdsRef.current.has(r.id));
        for (const order of newOnes) {
          const meta = (order.meta || {}) as Record<string, unknown>;
          const addonRef = order.addonOrderId || order.orderNumber || order.id;
          if (meta.clientCreated) {
            toast("New website order — Trade client auto-created. Complete client profile.", {
              icon: "⚠️",
            });
          } else if (Array.isArray(meta.syncErrors) && meta.syncErrors.length > 0) {
            toast(`Website order ${addonRef} ingested as draft — style mapping errors`, { icon: "⚠️" });
          } else if (Array.isArray(meta.clientIncompleteFields) && meta.clientIncompleteFields.length > 0) {
            toast(`Website order ${addonRef} — client profile incomplete`, { icon: "⚠️" });
          } else {
            toast.success(`New website order: ${addonRef}`);
          }
        }
      } else {
        pollInitializedRef.current = true;
      }
      knownWebOrderIdsRef.current = new Set(webOrders.map((r) => r.id));
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to load warehouse orders");
      setRows([]);
      setTotalPages(1);
      setTotalResults(0);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  const handleDelete = async (orderId: string) => {
    if (!window.confirm("Delete this warehouse order?")) return;
    try {
      await whmsWarehouseOrders.delete(orderId);
      if (detailId === orderId) setDetailId(null);
      toast.success("Order deleted");
      await fetchRows();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const downloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const clients = await fetchAllWarehouseClientsForReference(whmsWarehouseClients.listByType);
      downloadWarehouseOrdersBulkTemplate(clients);
      toast.success(
        clients.length
          ? `Template downloaded (${clients.length} clients in ClientReference sheet)`
          : "Template downloaded",
      );
    } catch (e) {
      console.error(e);
      downloadWarehouseOrdersBulkTemplate([]);
      toast.error(e instanceof Error ? e.message : "Could not load client list; template downloaded without reference");
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setIsImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const { orders, errors: parseErrors } = parseWarehouseOrdersBulkImportFile(buf);

      if (parseErrors.length) {
        parseErrors.slice(0, 5).forEach((msg) => toast.error(msg, { duration: 6000 }));
        if (parseErrors.length > 5) toast(`+${parseErrors.length - 5} parse error(s)`, { icon: "⚠️" });
      }

      if (!orders.length) {
        if (!parseErrors.length) toast.error("No valid orders parsed. Fill clientType + clientId (or clientName) on header rows.");
        return;
      }

      const summary = await whmsWarehouseOrders.bulkImport({ orders });
      if (summary.created > 0) toast.success(`${summary.created} order(s) created successfully`);
      if (summary.failed > 0) toast.error(`${summary.failed} order(s) failed`);
      if (summary.errors?.length) {
        summary.errors.slice(0, 5).forEach((err) => {
          const msg = err.reason || err.error || "Unknown error";
          const prefix = err.row != null ? `Order ${err.row}: ` : err.index != null ? `Order ${err.index + 1}: ` : "";
          toast.error(`${prefix}${msg}`, { duration: 8000 });
        });
        if (summary.errors.length > 5) toast(`+${summary.errors.length - 5} more error(s)`, { icon: "⚠️" });
      }
      await fetchRows();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Bulk import failed");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <Seo title="Warehouse Orders" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
              <h1 className="text-sm font-bold text-gray-800">Warehouse Orders</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {totalResults}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-52 min-w-[140px] placeholder:text-gray-400 transition-all font-medium"
                  placeholder="Search WO / client..."
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                />
                <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              </div>
              <div className="relative group">
                <select
                  value={clientTypeFilter}
                  onChange={(e) => {
                    setClientTypeFilter(e.target.value as "" | WarehouseClientType);
                    setPage(1);
                  }}
                  className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 appearance-none cursor-pointer min-w-[130px]"
                  aria-label="Filter by client type"
                >
                  {CLIENT_TYPE_OPTIONS.map(({ id, label }) => (
                    <option key={id || "all"} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
                <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
              </div>
              <input
                type="date"
                className="bg-white border border-gray-200 px-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 font-medium"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
              />
              <input
                type="date"
                className="bg-white border border-gray-200 px-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 font-medium"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
              />
              <div className="relative group">
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 appearance-none cursor-pointer"
                >
                  <option value={20}>Show 20</option>
                  <option value={50}>Show 50</option>
                  <option value={100}>Show 100</option>
                </select>
                <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
              </div>
              <button
                type="button"
                onClick={() => {
                  setWebsiteTradeOnly((v) => !v);
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border transition-colors shadow-sm ${
                  websiteTradeOnly
                    ? "bg-sky-600 text-white border-sky-600 hover:bg-sky-700"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
                aria-pressed={websiteTradeOnly}
                aria-label="Filter website Trade orders"
              >
                <i className="ri-global-line text-xs" aria-hidden />
                Website Trade
              </button>
              <button
                type="button"
                onClick={() => void downloadTemplate()}
                disabled={isDownloadingTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-[11px] font-bold rounded hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
              >
                {isDownloadingTemplate ? (
                  <><i className="ri-loader-4-line text-xs animate-spin" /> Loading...</>
                ) : (
                  <><i className="ri-download-2-line text-xs" /> Template</>
                )}
              </button>
              <button
                type="button"
                onClick={() => importRef.current?.click()}
                disabled={isImporting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {isImporting ? (
                  <><i className="ri-loader-4-line text-xs animate-spin" /> Importing...</>
                ) : (
                  <><i className="ri-file-excel-2-line text-xs" /> Bulk Import</>
                )}
              </button>
              <input ref={importRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleBulkImport} />
              <Link
                href="/warehouse-management/orders/add"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              >
                <i className="ri-add-line text-xs" /> Add order
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-4">
            <div className="bg-amber-50 border border-amber-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">Draft</span>
              <span className="text-sm font-bold text-amber-950">{stats.draft}</span>
            </div>
            <div className="bg-sky-50 border border-sky-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wide">Pending</span>
              <span className="text-sm font-bold text-sky-950">{stats.pending}</span>
            </div>
            <div className="bg-violet-50 border border-violet-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-violet-800 uppercase tracking-wide">In-Prog</span>
              <span className="text-sm font-bold text-violet-950">{stats["in-progress"]}</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">Packed</span>
              <span className="text-sm font-bold text-emerald-950">{stats.packed}</span>
            </div>
            <div className="bg-teal-50 border border-teal-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wide">Dispatch</span>
              <span className="text-sm font-bold text-teal-950">{stats.dispatched}</span>
            </div>
            <div className="bg-red-50 border border-red-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-red-700 uppercase tracking-wide">Cancelled</span>
              <span className="text-sm font-bold text-red-900">{stats.cancelled}</span>
            </div>
          </div>

          <div className="flex flex-wrap border-b border-gray-200 mt-4 -mb-px">
            {STATUS_TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
                  statusTab === id ? "border-purple-600 text-purple-600" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => {
                  setStatusTab(id);
                  setPage(1);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <WarehouseOrdersTable
            rows={rows}
            loading={loading}
            onView={(id) => setDetailId(id)}
            onDelete={handleDelete}
            onFlow={(id) => setFlowOrderId(id)}
          />
        </div>

        {!loading && (
          <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white">
            <div className="text-[11px] font-medium text-[#495057] tracking-tight">
              Page <span>{page}</span> of <span>{totalPages}</span> <span className="ml-1 opacity-50">→</span>
            </div>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <WarehouseOrderDetailDrawer orderId={detailId} open={detailId !== null} onClose={() => setDetailId(null)} />
      {flowOrderId && (
        <OrderFlowModal
          orderId={flowOrderId}
          onClose={() => setFlowOrderId(null)}
          onChanged={() => void fetchRows()}
        />
      )}
    </>
  );
}
