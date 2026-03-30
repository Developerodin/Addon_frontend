"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { whmsInwardReceive, InwardReceiveStatus, type WhmsInwardReceiveRow } from "@/shared/services/whmsService";
import {
  autoStatusFromQuantities,
  factoryQty,
  isOnHoldStatus,
  parseEditQty,
  quantitiesMatch,
  receivedQtyFloor,
  statusBadgeClass,
} from "./inwardReceiveTableUtils";
import WarehouseScanContainerDrawer from "./WarehouseScanContainerDrawer";
import WhmsInwardReceivedDetailDrawer from "./WhmsInwardReceivedDetailDrawer";

/** WHMS inward-receive list — GET /v1/whms/inward-receive. */
export default function WhmsInwardReceivedTab() {
  const [scanDrawerOpen, setScanDrawerOpen] = useState(false);
  const [rows, setRows] = useState<WhmsInwardReceiveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<WhmsInwardReceiveRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  /** Row id in inline edit mode (received qty only; status is computed on save). */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const beginEdit = (r: WhmsInwardReceiveRow) => {
    setEditingId(r.id);
    setEditQty(String(receivedQtyFloor(r.receivedQuantity)));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditQty("");
    setSavingId(null);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const row = rows.find((x) => x.id === editingId);
    if (!row) return;
    const rq = parseEditQty(editQty, row.receivedQuantity ?? 0);
    if (rq === null) {
      toast.error("Enter a valid received quantity (≥ 0)");
      return;
    }
    const fq = factoryQty(row);
    const statusToSend = autoStatusFromQuantities(fq, rq);
    setSavingId(editingId);
    try {
      const updated = await whmsInwardReceive.patch(editingId, {
        receivedQuantity: rq,
        status: statusToSend,
      });
      setRows((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setDetailRow((d) => (d?.id === updated.id ? updated : d));
      toast.success(statusToSend === InwardReceiveStatus.ACCEPTED ? "Saved — accepted (qty matches factory)" : "Saved — on hold (qty differs)");
      cancelEdit();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingId(null);
    }
  };

  /** On-hold row: set status from action buttons (Accept / Reject). */
  const patchHoldStatus = async (r: WhmsInwardReceiveRow, status: typeof InwardReceiveStatus.ACCEPTED | typeof InwardReceiveStatus.REJECTED) => {
    setSavingId(r.id);
    try {
      const updated = await whmsInwardReceive.patch(r.id, { status });
      setRows((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setDetailRow((d) => (d?.id === updated.id ? updated : d));
      toast.success(status === InwardReceiveStatus.ACCEPTED ? "Accepted" : "Rejected");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingId(null);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await whmsInwardReceive.list({ page, limit });
      setRows(data.results ?? []);
      setTotalPages(Math.max(1, data.totalPages ?? 1));
      setTotalResults(data.totalResults ?? data.results?.length ?? 0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load inward receive");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const blob = [r.articleNumber, r.styleCode, r.brand, r.status].join(" ").toLowerCase();
      return blob.includes(q);
    });
  }, [rows, search]);

  const openDetail = async (id: string) => {
    setDetailId(id);
    setDetailLoading(true);
    setDetailRow(null);
    try {
      const one = await whmsInwardReceive.get(id);
      setDetailRow(one);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load row");
      setDetailId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <>
      <WarehouseScanContainerDrawer
        open={scanDrawerOpen}
        onClose={() => setScanDrawerOpen(false)}
        onAccepted={() => void load()}
      />
      <div className="p-[10px] flex flex-wrap items-center gap-2 border-b border-gray-300 bg-white">
        <button
          type="button"
          onClick={() => setScanDrawerOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
        >
          <i className="ri-barcode-line text-xs" />
          Scan container
        </button>
        <button
          type="button"
          onClick={() => load()}
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search article, style, brand…"
            className="bg-white border border-gray-300 pl-8 pr-3 py-1.5 text-[11px] rounded w-full placeholder:text-gray-500 focus:ring-1 focus:ring-teal-400 focus:border-teal-500"
          />
        </div>
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
        <span className="text-[11px] font-medium text-gray-600 ml-auto">{totalResults} row{totalResults !== 1 ? "s" : ""}</span>
      </div>

      <div className="border border-gray-300 border-t-0 rounded-b overflow-hidden bg-white">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 min-h-[280px]">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-teal-600 border-t-transparent mb-4" />
            <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 min-h-[280px] text-center px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <i className="ri-inbox-line text-2xl text-gray-300" />
            </div>
            <h3 className="text-sm font-bold text-gray-400 mb-1">{rows.length === 0 ? "No inward receive rows" : "No matches"}</h3>
            <p className="text-xs text-gray-400">GET /v1/whms/inward-receive · adjust search or refresh</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border-collapse">
              <thead className="bg-gray-100 border-b border-gray-300">
                <tr>
                  <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Article</th>
                  <th className="px-2 py-1.5 text-right font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Qty factory</th>
                  <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Style</th>
                  <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Brand</th>
                  <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Received at</th>
                  <th className="px-2 py-1.5 text-right font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Received qty</th>
                  <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Status</th>
                  <th className="px-2 py-1.5 text-center font-semibold text-gray-700 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map((r) => {
                  const isEditing = editingId === r.id;
                  const busy = savingId === r.id;
                  const showHoldActions = !isEditing && isOnHoldStatus(String(r.status));
                  return (
                    <tr key={r.id} className={`transition-colors ${isEditing ? "bg-amber-50/40" : "hover:bg-gray-50"}`}>
                      <td className="px-2 py-1.5 border-r border-gray-300 font-semibold text-gray-900 whitespace-nowrap">
                        {r.articleNumber || "—"}
                      </td>
                      <td className="px-2 py-1.5 border-r border-gray-300 text-right font-medium tabular-nums text-teal-800">
                        {(r.QuantityFromFactory ?? 0).toLocaleString()}
                      </td>
                      <td className="px-2 py-1.5 border-r border-gray-300 max-w-[120px] truncate font-medium text-gray-900" title={r.styleCode}>
                        {r.styleCode || "—"}
                      </td>
                      <td className="px-2 py-1.5 border-r border-gray-300 max-w-[100px] truncate text-gray-800" title={r.brand}>
                        {r.brand || "—"}
                      </td>
                      <td className="px-2 py-1.5 border-r border-gray-300 text-gray-600 whitespace-nowrap text-[10px]">
                        {r.receivedAt ? new Date(r.receivedAt).toLocaleString() : "—"}
                      </td>
                      <td className="px-2 py-1.5 border-r border-gray-300 text-right align-middle">
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={editQty}
                            onChange={(e) => setEditQty(e.target.value)}
                            disabled={busy}
                            className="w-[4.5rem] text-right tabular-nums text-[11px] font-semibold border border-gray-300 rounded px-1 py-0.5 focus:border-teal-500 focus:ring-1 focus:ring-teal-400 disabled:opacity-50"
                            aria-label="Received quantity"
                          />
                        ) : (
                          <span className="tabular-nums font-semibold text-gray-900">{(r.receivedQuantity ?? 0).toLocaleString()}</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 border-r border-gray-300 text-center align-middle">
                        {isEditing ? (() => {
                          const rqParsed = parseEditQty(editQty, r.receivedQuantity ?? 0);
                          if (rqParsed === null) {
                            return <span className="text-[10px] text-gray-400">—</span>;
                          }
                          const will = quantitiesMatch(factoryQty(r), rqParsed) ? "Accepted" : "On hold";
                          return (
                            <span className="text-[10px] font-bold text-gray-700 block" title="Set automatically when you save">
                              {will}
                            </span>
                          );
                        })() : (
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${statusBadgeClass(String(r.status))}`}
                          >
                            {r.status || "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <div className="inline-flex items-center justify-center gap-1 flex-wrap">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void saveEdit()}
                                disabled={busy}
                                className="inline-flex items-center justify-center rounded bg-emerald-600 text-white hover:bg-emerald-700 w-7 h-7 disabled:opacity-40"
                                title="Save"
                              >
                                {busy ? <i className="ri-loader-4-line text-sm animate-spin" /> : <i className="ri-save-line text-sm" />}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={busy}
                                className="inline-flex items-center justify-center rounded bg-gray-200 text-gray-700 hover:bg-gray-300 w-7 h-7 disabled:opacity-40"
                                title="Cancel"
                              >
                                <i className="ri-close-line text-sm" />
                              </button>
                            </>
                          ) : (
                            <>
                              {showHoldActions ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => void patchHoldStatus(r, InwardReceiveStatus.ACCEPTED)}
                                    disabled={busy}
                                    className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-[9px] font-bold disabled:opacity-40"
                                    title="Accept"
                                  >
                                    <i className="ri-check-line text-xs" />
                                    Accept
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void patchHoldStatus(r, InwardReceiveStatus.REJECTED)}
                                    disabled={busy}
                                    className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded bg-red-600 text-white hover:bg-red-700 text-[9px] font-bold disabled:opacity-40"
                                    title="Reject"
                                  >
                                    <i className="ri-close-line text-xs" />
                                    Reject
                                  </button>
                                </>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => beginEdit(r)}
                                disabled={!!editingId && editingId !== r.id}
                                className="inline-flex items-center justify-center rounded bg-amber-100 text-amber-800 hover:bg-amber-200 w-7 h-7 disabled:opacity-30"
                                title="Edit received qty"
                              >
                                <i className="ri-pencil-line text-sm" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openDetail(r.id)}
                                className="inline-flex items-center justify-center rounded bg-sky-100 text-sky-700 hover:bg-sky-200 w-7 h-7"
                                title="View row"
                              >
                                <i className="ri-eye-line text-sm" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

      <WhmsInwardReceivedDetailDrawer
        detailId={detailId}
        detailRow={detailRow}
        detailLoading={detailLoading}
        savingId={savingId}
        onClose={() => {
          setDetailId(null);
          setDetailRow(null);
        }}
        onHoldAccept={(row) => void patchHoldStatus(row, InwardReceiveStatus.ACCEPTED)}
        onHoldReject={(row) => void patchHoldStatus(row, InwardReceiveStatus.REJECTED)}
      />
    </>
  );
}
