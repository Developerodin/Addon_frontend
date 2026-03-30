"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Seo from "@/shared/layout-components/seo/seo";
import { toast, Toaster } from "react-hot-toast";
import {
  whmsWarehouseOrders,
  normalizeWarehouseOrderStatus,
  type WarehouseOrder,
  type WarehouseOrderStatus,
} from "@/shared/services/whmsWarehouseOrderService";
import WarehouseOrdersTable from "./components/WarehouseOrdersTable";
import WarehouseOrderDetailDrawer from "./components/WarehouseOrderDetailDrawer";

const STATUS_TABS: Array<{ id: "all" | WarehouseOrderStatus; label: string }> = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "pending", label: "Pending" },
  { id: "in-progress", label: "In-Progress" },
  { id: "packed", label: "Packed" },
  { id: "dispatched", label: "Dispatched" },
  { id: "cancelled", label: "Cancelled" },
];

export default function WarehouseOrdersPage() {
  const [statusTab, setStatusTab] = useState<"all" | WarehouseOrderStatus>("all");
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
  }, [statusTab, q, dateFrom, dateTo, page, limit]);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const res = await whmsWarehouseOrders.list({
        ...(statusTab !== "all" ? { status: statusTab } : {}),
        ...(q.trim() ? { q: q.trim() } : {}),
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {}),
        page,
        limit,
        sortBy: "date:desc",
      });
      setRows(res.results || []);
      setTotalPages(res.totalPages || 1);
      setTotalResults(res.totalResults || 0);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to load warehouse orders");
      setRows([]);
      setTotalPages(1);
      setTotalResults(0);
    } finally {
      setLoading(false);
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
    </>
  );
}
