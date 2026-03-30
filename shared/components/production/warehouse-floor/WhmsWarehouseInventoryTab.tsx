"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  whmsWarehouseInventory,
  type WhmsWarehouseInventoryDTO,
} from "@/shared/services/whmsService";
import WarehouseInventoryCreateModal from "./WarehouseInventoryCreateModal";
import WarehouseInventoryDetailDrawer from "./WarehouseInventoryDetailDrawer";

/**
 * WHMS warehouse inventory — GET /v1/whms/warehouse-inventory (list + detail + logs).
 * UI aligned with WhmsInwardReceivedTab (toolbar, dense table, drawer, pagination).
 */
export default function WhmsWarehouseInventoryTab() {
  const [rows, setRows] = useState<WhmsWarehouseInventoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedStyleCode, setDebouncedStyleCode] = useState("");
  const [sortBy, setSortBy] = useState("createdAt:desc");
  const [createOpen, setCreateOpen] = useState(false);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<WhmsWarehouseInventoryDTO | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedStyleCode(searchInput.trim()), 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedStyleCode, sortBy, limit]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit, sortBy };
      if (debouncedStyleCode) params.styleCode = debouncedStyleCode;
      const data = await whmsWarehouseInventory.list(params);
      setRows(data.results ?? []);
      setTotalPages(Math.max(1, data.totalPages ?? 1));
      setTotalResults(data.totalResults ?? data.results?.length ?? 0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load inventory");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, debouncedStyleCode]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (id: string) => {
    setDetailId(id);
    setDetailLoading(true);
    setDetailRow(null);
    try {
      const one = await whmsWarehouseInventory.get(id);
      setDetailRow(one);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load row");
      setDetailId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const mergeRow = (dto: WhmsWarehouseInventoryDTO) => {
    setRows((prev) => prev.map((r) => (r.id === dto.id ? { ...r, ...dto } : r)));
    setDetailRow((d) => (d?.id === dto.id ? dto : d));
  };

  return (
    <>
      <WarehouseInventoryCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(row) => {
          setRows((prev) => [row, ...prev]);
          void load();
        }}
      />

      <div className="p-[10px] flex flex-wrap items-center gap-2 border-b border-gray-300 bg-white">
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
        >
          <i className="ri-add-line text-xs" />
          Add inventory
        </button>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50"
        >
          <i className={`ri-refresh-line text-xs ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
        <div className="relative flex-1 min-w-[140px] max-w-[240px]">
          <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Filter by style code…"
            className="bg-white border border-gray-300 pl-8 pr-3 py-1.5 text-[11px] rounded w-full placeholder:text-gray-500 focus:ring-1 focus:ring-teal-400 focus:border-teal-500"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-white border border-gray-300 text-[#495057] text-[11px] font-medium rounded px-2 py-1.5 max-w-[160px]"
        >
          <option value="createdAt:desc">Newest</option>
          <option value="createdAt:asc">Oldest</option>
          <option value="updatedAt:desc">Updated ↓</option>
          <option value="updatedAt:asc">Updated ↑</option>
        </select>
        <select
          value={limit}
          onChange={(e) => {
            setLimit(Number(e.target.value));
            setPage(1);
          }}
          className="bg-white border border-gray-300 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5"
        >
          <option value={10}>10 / page</option>
          <option value={25}>25 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
        </select>
        <span className="text-[11px] font-medium text-gray-600 ml-auto">
          {totalResults} row{totalResults !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="border border-gray-300 border-t-0 rounded-b overflow-hidden bg-white">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 min-h-[280px]">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-teal-600 border-t-transparent mb-4" />
            <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 min-h-[280px] text-center px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <i className="ri-stack-line text-2xl text-gray-300" />
            </div>
            <h3 className="text-sm font-bold text-gray-400 mb-1">No inventory rows</h3>
            <p className="text-xs text-gray-400">GET /v1/whms/warehouse-inventory · adjust filters or add a row</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border-collapse">
              <thead className="bg-gray-100 border-b border-gray-300">
                <tr>
                  <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">
                    Product
                  </th>
                  <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">
                    Factory
                  </th>
                  <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">
                    Style
                  </th>
                  <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">
                    Brand
                  </th>
                  <th className="px-2 py-1.5 text-right font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">
                    Total
                  </th>
                  <th className="px-2 py-1.5 text-right font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">
                    Blocked
                  </th>
                  <th className="px-2 py-1.5 text-right font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">
                    Avail
                  </th>
                  <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">
                    Updated
                  </th>
                  <th className="px-2 py-1.5 text-center font-semibold text-gray-700 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-2 py-1.5 border-r border-gray-300 font-semibold text-gray-900 max-w-[140px] truncate" title={r.product?.name}>
                      {r.product?.name ?? "—"}
                    </td>
                    <td className="px-2 py-1.5 border-r border-gray-300 text-gray-700 whitespace-nowrap font-mono text-[10px]">
                      {r.product?.factoryCode ?? "—"}
                    </td>
                    <td className="px-2 py-1.5 border-r border-gray-300 font-medium text-gray-900 max-w-[100px] truncate" title={r.styleCode}>
                      {r.styleCode ?? r.styleCodeMaster?.styleCode ?? "—"}
                    </td>
                    <td className="px-2 py-1.5 border-r border-gray-300 max-w-[90px] truncate text-gray-800" title={r.styleCodeMaster?.brand}>
                      {r.styleCodeMaster?.brand ?? "—"}
                    </td>
                    <td className="px-2 py-1.5 border-r border-gray-300 text-right tabular-nums font-semibold text-teal-800">
                      {(r.quantities?.total ?? 0).toLocaleString()}
                    </td>
                    <td className="px-2 py-1.5 border-r border-gray-300 text-right tabular-nums">
                      {(r.quantities?.blocked ?? 0).toLocaleString()}
                    </td>
                    <td className="px-2 py-1.5 border-r border-gray-300 text-right tabular-nums font-medium text-emerald-800">
                      {(r.quantities?.available ?? 0).toLocaleString()}
                    </td>
                    <td className="px-2 py-1.5 border-r border-gray-300 text-gray-600 whitespace-nowrap text-[10px]">
                      {r.updatedAt ? new Date(r.updatedAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => void openDetail(r.id)}
                        className="inline-flex items-center justify-center rounded bg-sky-100 text-sky-700 hover:bg-sky-200 w-7 h-7"
                        title="View"
                      >
                        <i className="ri-eye-line text-sm" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="p-3 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 bg-gray-50">
            <div className="text-[11px] font-medium text-[#495057]">
              Page {page} of {totalPages} · API total {totalResults.toLocaleString()}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-[11px] font-bold text-gray-500 hover:text-gray-700 disabled:opacity-30 rounded border border-gray-200"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-[11px] font-bold text-gray-500 hover:text-gray-700 disabled:opacity-30 rounded border border-gray-200"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <WarehouseInventoryDetailDrawer
        inventoryId={detailId}
        row={detailRow}
        loading={detailLoading}
        onClose={() => {
          setDetailId(null);
          setDetailRow(null);
        }}
        onPatched={(dto) => {
          mergeRow(dto);
          void load();
        }}
      />
    </>
  );
}
