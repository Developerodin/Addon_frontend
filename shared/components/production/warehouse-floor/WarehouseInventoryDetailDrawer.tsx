"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  whmsWarehouseInventory,
  type WhmsWarehouseInventoryDTO,
  type WhmsWarehouseInventoryLog,
} from "@/shared/services/whmsService";

type DrawerTab = "details" | "image" | "activity";

/**
 * Resolve product image URL from populated product or cached itemData snapshot.
 */
function inventoryProductImageUrl(row: WhmsWarehouseInventoryDTO | null): string {
  if (!row) return "";
  const fromProduct = row.product?.image?.trim();
  if (fromProduct) return fromProduct;
  const fromItemData = row.itemData?.image;
  if (typeof fromItemData === "string" && fromItemData.trim()) return fromItemData.trim();
  return "";
}

export interface WarehouseInventoryDetailDrawerProps {
  inventoryId: string | null;
  row: WhmsWarehouseInventoryDTO | null;
  loading: boolean;
  onClose: () => void;
  /** After PATCH — parent refreshes list + detail */
  onPatched: (dto: WhmsWarehouseInventoryDTO) => void;
}

export default function WarehouseInventoryDetailDrawer({
  inventoryId,
  row,
  loading,
  onClose,
  onPatched,
}: WarehouseInventoryDetailDrawerProps) {
  const [tab, setTab] = useState<DrawerTab>("details");
  const [logs, setLogs] = useState<WhmsWarehouseInventoryLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logPage, setLogPage] = useState(1);
  const [logLimit] = useState(20);
  const [logTotalPages, setLogTotalPages] = useState(1);
  const [logTotal, setLogTotal] = useState(0);

  const [editTotal, setEditTotal] = useState("");
  const [editBlocked, setEditBlocked] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [editingQty, setEditingQty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!row) return;
    setEditTotal(String(row.quantities?.total ?? 0));
    setEditBlocked(String(row.quantities?.blocked ?? 0));
    setAdjustReason("");
    setEditingQty(false);
  }, [row?.id, row?.quantities?.total, row?.quantities?.blocked]);

  useEffect(() => {
    setTab("details");
    setLogPage(1);
    setLogs([]);
  }, [inventoryId]);

  const loadLogs = useCallback(async () => {
    if (!inventoryId) return;
    setLogsLoading(true);
    try {
      const data = await whmsWarehouseInventory.logs(inventoryId, {
        page: logPage,
        limit: logLimit,
        sortBy: "createdAt:desc",
      });
      setLogs(data.results ?? []);
      setLogTotalPages(Math.max(1, data.totalPages ?? 1));
      setLogTotal(data.totalResults ?? 0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load logs");
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, [inventoryId, logPage, logLimit]);

  useEffect(() => {
    if (tab !== "activity" || !inventoryId) return;
    void loadLogs();
  }, [tab, inventoryId, loadLogs]);

  const savePatch = async () => {
    if (!inventoryId || !row) return;
    const tq = Number(editTotal);
    const bq = Number(editBlocked);
    if (Number.isNaN(tq) || Number.isNaN(bq) || tq < 0 || bq < 0) {
      toast.error("Invalid quantities");
      return;
    }
    const prevT = row.quantities?.total ?? 0;
    const prevB = row.quantities?.blocked ?? 0;
    const body: { totalQuantity?: number; blockedQuantity?: number; adjustReason?: string } = {};
    if (tq !== prevT) body.totalQuantity = tq;
    if (bq !== prevB) body.blockedQuantity = bq;
    const reason = adjustReason.trim();
    if (reason) body.adjustReason = reason;
    if (body.totalQuantity === undefined && body.blockedQuantity === undefined) {
      toast.error("Change total or blocked quantity (adjustReason is stored with that log)");
      return;
    }
    setSaving(true);
    try {
      const updated = await whmsWarehouseInventory.update(inventoryId, body);
      toast.success("Updated");
      onPatched(updated);
      setEditingQty(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (!inventoryId) return null;

  const eventsBadge = row?.logsSummary?.total;
  const productImageUrl = inventoryProductImageUrl(row);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} aria-hidden />
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-xl z-50 flex flex-col border-l border-gray-200">
        <div className="flex justify-between items-center p-[10px] border-b border-gray-200 shrink-0">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Warehouse inventory</h3>
            {eventsBadge !== undefined && (
              <span className="text-[10px] font-bold text-teal-700">{eventsBadge} events</span>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1">
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <div className="flex border-b border-gray-200 px-[10px] gap-1 shrink-0">
          <button
            type="button"
            className={`px-3 py-2 text-[11px] font-bold border-b-2 ${
              tab === "details" ? "border-teal-600 text-teal-600" : "border-transparent text-gray-500"
            }`}
            onClick={() => setTab("details")}
          >
            Details
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-[11px] font-bold border-b-2 ${
              tab === "image" ? "border-teal-600 text-teal-600" : "border-transparent text-gray-500"
            }`}
            onClick={() => setTab("image")}
          >
            Image
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-[11px] font-bold border-b-2 ${
              tab === "activity" ? "border-teal-600 text-teal-600" : "border-transparent text-gray-500"
            }`}
            onClick={() => setTab("activity")}
          >
            Activity
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-[10px] text-[11px]">
          {loading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent" />
            </div>
          )}

          {!loading && row && tab === "details" && (
            <div className="space-y-3">
              <dl className="space-y-2">
                <div className="grid grid-cols-[110px_1fr] gap-1 border-b border-gray-100 pb-2">
                  <dt className="text-gray-500 font-medium">ID</dt>
                  <dd className="font-mono text-[10px] break-all">{row.id}</dd>
                </div>
                <div className="grid grid-cols-[110px_1fr] gap-1">
                  <dt className="text-gray-500 font-medium">Product</dt>
                  <dd className="font-semibold">{row.product?.name ?? "—"}</dd>
                </div>
                <div className="grid grid-cols-[110px_1fr] gap-1">
                  <dt className="text-gray-500 font-medium">Vendor code</dt>
                  <dd>{row.product?.vendorCode ?? row.product?.factoryCode ?? "—"}</dd>
                </div>
                <div className="grid grid-cols-[110px_1fr] gap-1">
                  <dt className="text-gray-500 font-medium">Factory code</dt>
                  <dd>{row.product?.factoryCode ?? "—"}</dd>
                </div>
                <div className="grid grid-cols-[110px_1fr] gap-1">
                  <dt className="text-gray-500 font-medium">Style</dt>
                  <dd>{row.styleCode ?? row.styleCodeMaster?.styleCode ?? "—"}</dd>
                </div>
                <div className="grid grid-cols-[110px_1fr] gap-1">
                  <dt className="text-gray-500 font-medium">Brand</dt>
                  <dd>{row.styleCodeMaster?.brand ?? "—"}</dd>
                </div>
                <div className="grid grid-cols-[110px_1fr] gap-1">
                  <dt className="text-gray-500 font-medium">MRP</dt>
                  <dd className="tabular-nums">{row.styleCodeMaster?.mrp ?? "—"}</dd>
                </div>
                <div className="grid grid-cols-[110px_1fr] gap-1">
                  <dt className="text-gray-500 font-medium">Updated</dt>
                  <dd>{row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "—"}</dd>
                </div>
              </dl>

              <div className="border border-gray-200 rounded p-2 bg-gray-50/80">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold uppercase text-gray-500">Quantities</span>
                  {!editingQty ? (
                    <button
                      type="button"
                      onClick={() => setEditingQty(true)}
                      className="text-[10px] font-bold text-teal-700 hover:underline"
                    >
                      Edit (manageOrders)
                    </button>
                  ) : null}
                </div>
                {editingQty ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <label>
                        <span className="text-[10px] text-gray-500 block">Total</span>
                        <input
                          type="number"
                          min={0}
                          value={editTotal}
                          onChange={(e) => setEditTotal(e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1 tabular-nums text-[11px]"
                        />
                      </label>
                      <label>
                        <span className="text-[10px] text-gray-500 block">Blocked</span>
                        <input
                          type="number"
                          min={0}
                          value={editBlocked}
                          onChange={(e) => setEditBlocked(e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1 tabular-nums text-[11px]"
                        />
                      </label>
                    </div>
                    <label>
                      <span className="text-[10px] text-gray-500 block">Adjust reason (optional)</span>
                      <input
                        value={adjustReason}
                        onChange={(e) => setAdjustReason(e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-[11px]"
                        placeholder="Manual adjustment note"
                      />
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void savePatch()}
                        disabled={saving}
                        className="px-2 py-1 rounded bg-teal-600 text-white text-[10px] font-bold disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingQty(false);
                          setEditTotal(String(row.quantities?.total ?? 0));
                          setEditBlocked(String(row.quantities?.blocked ?? 0));
                          setAdjustReason("");
                        }}
                        className="px-2 py-1 rounded border border-gray-300 text-[10px] font-bold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[10px] text-gray-500">Total</div>
                      <div className="font-bold tabular-nums text-teal-800">{(row.quantities?.total ?? 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500">Blocked</div>
                      <div className="font-bold tabular-nums">{(row.quantities?.blocked ?? 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500">Available</div>
                      <div className="font-bold tabular-nums text-emerald-800">{(row.quantities?.available ?? 0).toLocaleString()}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!loading && row && tab === "image" && (
            <div className="space-y-3">
              <dl className="space-y-2">
                <div className="grid grid-cols-[110px_1fr] gap-1 border-b border-gray-100 pb-2">
                  <dt className="text-gray-500 font-medium">Product</dt>
                  <dd className="font-semibold">{row.product?.name ?? "—"}</dd>
                </div>
                <div className="grid grid-cols-[110px_1fr] gap-1 border-b border-gray-100 pb-2">
                  <dt className="text-gray-500 font-medium">Style</dt>
                  <dd>{row.styleCode ?? row.styleCodeMaster?.styleCode ?? "—"}</dd>
                </div>
              </dl>
              {productImageUrl ? (
                <figure className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                  <img
                    src={productImageUrl}
                    alt={row.product?.name ? `${row.product.name} product image` : "Product image"}
                    className="w-full max-h-[420px] object-contain bg-white"
                  />
                </figure>
              ) : (
                <div
                  className="flex flex-col items-center justify-center py-16 border border-dashed border-gray-300 rounded-lg bg-gray-50 text-center px-4"
                  role="status"
                  aria-label="No product image available"
                >
                  <i className="ri-image-line text-3xl text-gray-300 mb-2" aria-hidden />
                  <p className="text-[11px] font-semibold text-gray-500">No product image</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Add an image in Catalog → Items for this product.
                  </p>
                </div>
              )}
            </div>
          )}

          {!loading && tab === "activity" && (
            <div>
              {logsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent" />
                </div>
              ) : logs.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-[11px]">No log entries</p>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded">
                  <table className="min-w-full text-[10px] border-collapse">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-2 py-1 text-left font-semibold">When</th>
                        <th className="px-2 py-1 text-left font-semibold">Action</th>
                        <th className="px-2 py-1 text-left font-semibold">Message</th>
                        <th className="px-2 py-1 text-right font-semibold">Δ qty</th>
                        <th className="px-2 py-1 text-right font-semibold">Total after</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {logs.map((l) => (
                        <tr key={l.id} className="hover:bg-gray-50">
                          <td className="px-2 py-1 whitespace-nowrap text-gray-600">
                            {l.createdAt ? new Date(l.createdAt).toLocaleString() : "—"}
                          </td>
                          <td className="px-2 py-1 font-mono text-[9px]">{l.action ?? "—"}</td>
                          <td className="px-2 py-1 max-w-[200px] truncate" title={l.message}>
                            {l.message ?? "—"}
                          </td>
                          <td className="px-2 py-1 text-right tabular-nums">
                            {l.quantityDelta != null ? l.quantityDelta.toLocaleString() : "—"}
                          </td>
                          <td className="px-2 py-1 text-right tabular-nums font-medium">
                            {l.totalQuantityAfter != null ? l.totalQuantityAfter.toLocaleString() : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {!logsLoading && logTotalPages > 1 && (
                <div className="flex justify-between items-center mt-3 text-[10px]">
                  <span>
                    Page {logPage} of {logTotalPages} · {logTotal} lines
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={logPage <= 1}
                      onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                      className="px-2 py-1 rounded border border-gray-200 disabled:opacity-30"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      disabled={logPage >= logTotalPages}
                      onClick={() => setLogPage((p) => Math.min(logTotalPages, p + 1))}
                      className="px-2 py-1 rounded border border-gray-200 disabled:opacity-30"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
