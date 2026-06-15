"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import vendorPurchaseOrderService, {
  VendorPurchaseOrder,
} from "@/shared/services/vendorPurchaseOrderService";
import {
  getPoLineItemId,
  productNameForPoLineId,
  readVendorName,
  vendorCodeFromPoLineItem,
  dashOr,
  findPoLineItemById,
} from "./vendorPacklistHelpers";
import {
  type VendorLotDraft,
  buildVendorLotDrafts,
  draftsToReceivedLotDetails,
  emptyLineQtyMap,
  maxQtyForLineInLot,
  orderedQtyByLine,
  totalReceivedFromDrafts,
  validateVendorLotDrafts,
} from "./vendorGoodsReceivedModalHelpers";

export interface VendorGoodsReceivedModalProps {
  isOpen: boolean;
  purchaseOrder: VendorPurchaseOrder | null;
  onClose: () => void;
  onSaved: () => void;
}

const lotInputCls =
  "mt-0.5 w-full px-2 py-1.5 text-xs border border-gray-500 rounded bg-white text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-600";
const lotQtyInputCls =
  "w-full px-1.5 py-1 text-right text-xs border border-gray-500 rounded bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-600";

function packlistToArray(pd: VendorPurchaseOrder["packListDetails"]) {
  if (!pd) return [];
  return Array.isArray(pd) ? pd : [pd];
}

/**
 * Yarn PO Received parity: right slide-over, order + packlist summary, multiple receipt cards (UI: invoice) with per-line qty.
 */
export function VendorGoodsReceivedModal({ isOpen, purchaseOrder, onClose, onSaved }: VendorGoodsReceivedModalProps) {
  const [detailPo, setDetailPo] = useState<VendorPurchaseOrder | null>(null);
  const [loadingPo, setLoadingPo] = useState(false);
  const [lots, setLots] = useState<VendorLotDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !purchaseOrder?.id) {
      setDetailPo(null);
      setLots([]);
      return;
    }
    setLoadingPo(true);
    setDetailPo(null);
    let cancelled = false;
    void vendorPurchaseOrderService
      .getById(purchaseOrder.id, { populate: "vendor,poItems.productId" })
      .then((d) => {
        if (cancelled) return;
        setDetailPo(d);
        setLots(buildVendorLotDrafts(d));
      })
      .catch(() => {
        if (cancelled) return;
        setDetailPo(purchaseOrder);
        setLots(buildVendorLotDrafts(purchaseOrder));
      })
      .finally(() => {
        if (!cancelled) setLoadingPo(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, purchaseOrder?.id]);

  const po = detailPo;
  const poItems = po?.poItems || [];
  const orderedMap = useMemo(() => orderedQtyByLine(poItems), [poItems]);
  const packlists = useMemo(() => (po ? packlistToArray(po.packListDetails) : []), [po]);

  const totals = useMemo(() => {
    if (!po) return { ordered: 0, inForm: 0 };
    const ordered = poItems.reduce((s, i) => s + Number(i.quantity || 0), 0);
    return { ordered, inForm: totalReceivedFromDrafts(lots) };
  }, [po, poItems, lots]);

  const setLineQty = (lotIndex: number, lineId: string, value: number) => {
    setLots((prev) => {
      const max = maxQtyForLineInLot(lineId, lotIndex, prev, orderedMap);
      const v = Math.max(0, Math.min(Number(value) || 0, max));
      const next = [...prev];
      const lot = next[lotIndex];
      if (!lot) return prev;
      next[lotIndex] = {
        ...lot,
        lineQty: { ...lot.lineQty, [lineId]: v },
      };
      return next;
    });
  };

  const setLineBoxes = (lotIndex: number, lineId: string, value: number) => {
    setLots((prev) => {
      const v = Math.max(0, Number(value) || 0);
      const next = [...prev];
      const lot = next[lotIndex];
      if (!lot) return prev;
      next[lotIndex] = {
        ...lot,
        lineBoxes: { ...lot.lineBoxes, [lineId]: v },
      };
      return next;
    });
  };

  const addLot = () => {
    setLots((prev) => [
      ...prev,
      { lotNumber: "", numberOfBoxes: 1, lineQty: emptyLineQtyMap(poItems), lineBoxes: emptyLineQtyMap(poItems), isExisting: false },
    ]);
  };

  const removeLot = (index: number) => {
    setLots((prev) => {
      if (prev[index]?.isExisting) return prev;
      return prev.length <= 1 ? prev : prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!po) return;
    const err = validateVendorLotDrafts(lots, orderedMap, poItems);
    if (err) {
      toast.error(err);
      return;
    }
    setSubmitting(true);
    try {
      const fresh = await vendorPurchaseOrderService.getById(po.id, { populate: "vendor,poItems.productId" });
      const merged = draftsToReceivedLotDetails(lots);
      const newTotal = merged.reduce(
        (sum, lot) => sum + (lot.poItems || []).reduce((s, p) => s + Number(p.receivedQuantity || 0), 0),
        0
      );
      const totalOrdered = (fresh.poItems || []).reduce((s, i) => s + Number(i.quantity || 0), 0);
      const nextStatus =
        newTotal >= totalOrdered - 1e-6 ? "goods_received" : "goods_partially_received";
      const vendorName =
        typeof fresh.vendor === "object" && fresh.vendor?.header?.vendorName
          ? fresh.vendor.header.vendorName
          : "";

      await vendorPurchaseOrderService.update(po.id, {
        ...(vendorName ? { vendorName } : {}),
        receivedLotDetails: merged,
        currentStatus: nextStatus,
        goodsReceivedDate: new Date().toISOString(),
      });
      toast.success(nextStatus === "goods_received" ? "Fully received" : "Partial receipt saved");
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !purchaseOrder) return null;

  return (
    <div className={`fixed inset-0 z-[60] overflow-hidden ${isOpen ? "" : "pointer-events-none"}`}>
      <div
        className={`fixed inset-0 z-[61] bg-gray-500/60 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
        aria-hidden
        onClick={() => !submitting && onClose()}
      />
      <div
        className={`fixed right-0 top-0 z-[62] h-full w-full max-w-2xl bg-white shadow-xl flex flex-col transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
          <div className="bg-primary text-white px-4 py-3 flex-shrink-0 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Goods received</h3>
              <p className="text-xs text-white/80 mt-0.5">{purchaseOrder.vpoNumber}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white hover:text-gray-200 p-1"
              disabled={submitting}
              aria-label="Close"
            >
              <i className="ri-close-line text-lg" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {loadingPo || !po ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <div className="h-8 w-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Loading PO…</p>
              </div>
            ) : (
              <>
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Order details</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-500">Vendor</span>
                      <div className="font-medium text-gray-900">{readVendorName(po.vendor)}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500">Total</span>
                      <div className="font-medium text-gray-900">₹{Number(po.total || 0).toLocaleString()}</div>
                    </div>
                  </div>
                  {poItems.length > 0 && (
                    <div className="mt-3 overflow-x-auto border border-gray-200 rounded">
                      <table className="min-w-full text-[10px]">
                        <thead className="bg-gray-50/80">
                          <tr>
                            <th className="px-2 py-1.5 text-left font-bold text-gray-600 border-b">Article</th>
                            <th className="px-2 py-1.5 text-left font-bold text-gray-600 border-b">Vendor code</th>
                            <th className="px-2 py-1.5 text-left font-bold text-gray-600 border-b">Type</th>
                            <th className="px-2 py-1.5 text-left font-bold text-gray-600 border-b">Color</th>
                            <th className="px-2 py-1.5 text-left font-bold text-gray-600 border-b">Pattern</th>
                            <th className="px-2 py-1.5 text-right font-bold text-gray-600 border-b">Ordered</th>
                          </tr>
                        </thead>
                        <tbody>
                          {poItems.map((it) => {
                            const id = getPoLineItemId(it);
                            return (
                              <tr key={id || it.productName} className="bg-white">
                                <td className="px-2 py-1.5 border-b border-gray-100">{it.productName || "—"}</td>
                                <td className="px-2 py-1.5 border-b border-gray-100">
                                  {vendorCodeFromPoLineItem(it) || "no vendor code"}
                                </td>
                                <td className="px-2 py-1.5 border-b border-gray-100">{dashOr(it.type)}</td>
                                <td className="px-2 py-1.5 border-b border-gray-100">{dashOr(it.color)}</td>
                                <td className="px-2 py-1.5 border-b border-gray-100">{dashOr(it.pattern)}</td>
                                <td className="px-2 py-1.5 text-right border-b border-gray-100">
                                  {Number(it.quantity || 0).toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {packlists.length > 0 && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="text-xs font-semibold text-gray-700 mb-2">Packlist (in transit)</h4>
                    <div className="space-y-2">
                      {packlists.map((p, idx) => (
                        <div key={idx} className="p-2 bg-white rounded border border-gray-100 text-[10px] space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-gray-500">Challan</span>
                              <div>{p.challanNumber || "—"}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Boxes</span>
                              <div>{p.numberOfBoxes ?? "—"}</div>
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-500">Courier</span>
                              <div>{p.courierName || "—"}</div>
                            </div>
                          </div>
                          {p.poItems && p.poItems.length > 0 && (
                            <div className="border-t border-gray-100 pt-2 overflow-x-auto">
                              <span className="text-gray-500 block mb-0.5">PO lines</span>
                              <table className="min-w-full text-[10px]">
                                <thead>
                                  <tr className="text-gray-500">
                                    <th className="text-left pr-2 pb-0.5 font-medium">Article</th>
                                    <th className="text-left pr-2 pb-0.5 font-medium">Vendor code</th>
                                    <th className="text-left pr-2 pb-0.5 font-medium">Type</th>
                                    <th className="text-left pr-2 pb-0.5 font-medium">Color</th>
                                    <th className="text-left pb-0.5 font-medium">Pattern</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {p.poItems.map((lineId) => {
                                    const line = findPoLineItemById(String(lineId), poItems);
                                    return (
                                      <tr key={String(lineId)} className="text-gray-900">
                                        <td className="py-0.5 pr-2">{productNameForPoLineId(String(lineId), poItems)}</td>
                                        <td className="py-0.5 pr-2">
                                          {line ? vendorCodeFromPoLineItem(line) || "no vendor code" : "—"}
                                        </td>
                                        <td className="py-0.5 pr-2">{dashOr(line?.type)}</td>
                                        <td className="py-0.5 pr-2">{dashOr(line?.color)}</td>
                                        <td className="py-0.5">{dashOr(line?.pattern)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-gray-800">Received invoice details</h4>
                  <button
                    type="button"
                    onClick={addLot}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-600 text-white text-[10px] font-bold rounded hover:bg-purple-700 shadow-sm"
                  >
                    <i className="ri-add-line text-xs" />
                    Add invoice
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 mb-3">
                  Ordered: {totals.ordered.toLocaleString()} pcs · In this form: {totals.inForm.toLocaleString()} pcs
                </p>

                <div className="space-y-4">
                  {lots.map((lot, lotIndex) => {
                    const isReadOnly = !!lot.isExisting;
                    return (
                    <div
                      key={lotIndex}
                      className={`border rounded-lg p-3 space-y-3 shadow-sm ${isReadOnly ? "border-gray-300 bg-gray-50/60" : "border-gray-200 bg-white"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-800">Invoice {lotIndex + 1}</span>
                          {isReadOnly && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-green-100 text-green-700 border border-green-200">
                              <i className="ri-lock-line text-[9px]" /> Saved
                            </span>
                          )}
                        </div>
                        {lots.length > 1 && !isReadOnly && (
                          <button
                            type="button"
                            onClick={() => removeLot(lotIndex)}
                            className="text-[10px] font-bold text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-medium text-gray-600">Invoice number {isReadOnly ? "" : "*"}</label>
                          {isReadOnly ? (
                            <div className="mt-0.5 px-2 py-1.5 text-xs text-gray-700 bg-gray-100 border border-gray-200 rounded">{lot.lotNumber || "—"}</div>
                          ) : (
                          <input
                            className={lotInputCls}
                            value={lot.lotNumber}
                            onChange={(e) =>
                              setLots((prev) => {
                                const n = [...prev];
                                if (n[lotIndex]) n[lotIndex] = { ...n[lotIndex], lotNumber: e.target.value };
                                return n;
                              })
                            }
                            placeholder="e.g. INV-001"
                          />
                          )}
                        </div>
                        <div>
                          <label className="text-[10px] font-medium text-gray-600">Number of boxes {isReadOnly ? "" : "*"}</label>
                          {isReadOnly ? (
                            <div className="mt-0.5 px-2 py-1.5 text-xs text-gray-700 bg-gray-100 border border-gray-200 rounded text-right">{lot.numberOfBoxes}</div>
                          ) : (
                          <input
                            type="number"
                            min={1}
                            className={lotInputCls}
                            value={lot.numberOfBoxes}
                            onChange={(e) =>
                              setLots((prev) => {
                                const n = [...prev];
                                if (n[lotIndex])
                                  n[lotIndex] = { ...n[lotIndex], numberOfBoxes: Math.max(1, Number(e.target.value) || 1) };
                                return n;
                              })
                            }
                          />
                          )}
                        </div>
                      </div>

                      <div className="border border-gray-100 rounded overflow-hidden">
                        <table className="min-w-full text-[10px]">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-2 py-2 text-left font-bold text-gray-600">Article</th>
                              <th className="px-2 py-2 text-left font-bold text-gray-600">Vendor code</th>
                              <th className="px-2 py-2 text-left font-bold text-gray-600">Type</th>
                              <th className="px-2 py-2 text-left font-bold text-gray-600">Color</th>
                              <th className="px-2 py-2 text-left font-bold text-gray-600">Pattern</th>
                              {!isReadOnly && <th className="px-2 py-2 text-right">Max</th>}
                              <th className="px-2 py-2 text-right w-[88px]">Qty</th>
                              <th className="px-2 py-2 text-right w-[88px]">Boxes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {poItems.map((it) => {
                              const id = getPoLineItemId(it);
                              if (!id) return null;
                              const max = maxQtyForLineInLot(id, lotIndex, lots, orderedMap);
                              const v = lot.lineQty[id] ?? 0;
                              const boxV = lot.lineBoxes[id] ?? 0;
                              return (
                                <tr key={`${lotIndex}-${id}`} className="border-t border-gray-100">
                                  <td className="px-2 py-2 text-gray-900">{it.productName || "—"}</td>
                                  <td className="px-2 py-2 text-gray-700">{vendorCodeFromPoLineItem(it) || "no vendor code"}</td>
                                  <td className="px-2 py-2 text-gray-700">{dashOr(it.type)}</td>
                                  <td className="px-2 py-2 text-gray-700">{dashOr(it.color)}</td>
                                  <td className="px-2 py-2 text-gray-700">{dashOr(it.pattern)}</td>
                                  {!isReadOnly && <td className="px-2 py-2 text-right text-gray-500">{max}</td>}
                                  <td className="px-2 py-2">
                                    {isReadOnly ? (
                                      <div className="text-right text-xs text-gray-700">{v || "—"}</div>
                                    ) : (
                                    <input
                                      type="number"
                                      min={0}
                                      max={max}
                                      className={lotQtyInputCls}
                                      value={v === 0 ? "" : v}
                                      onChange={(e) => {
                                        const raw = e.target.value;
                                        setLineQty(lotIndex, id, raw === "" ? 0 : Number(raw));
                                      }}
                                    />
                                    )}
                                  </td>
                                  <td className="px-2 py-2">
                                    {isReadOnly ? (
                                      <div className="text-right text-xs text-gray-700">{boxV || "—"}</div>
                                    ) : (
                                    <input
                                      type="number"
                                      min={0}
                                      className={lotQtyInputCls}
                                      value={boxV === 0 ? "" : boxV}
                                      onChange={(e) => {
                                        const raw = e.target.value;
                                        setLineBoxes(lotIndex, id, raw === "" ? 0 : Number(raw));
                                      }}
                                    />
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="bg-gray-50 px-4 py-3 flex justify-end gap-3 flex-shrink-0 border-t border-gray-200">
            <button
              type="button"
              className="flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 bg-white text-gray-700 text-[11px] font-bold rounded border border-gray-300 hover:bg-gray-100 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onClose}
              disabled={submitting || loadingPo}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting || loadingPo || !po}
            >
              {submitting ? (
                <>
                  <i className="ri-loader-4-line animate-spin text-xs" />
                  Saving…
                </>
              ) : (
                "Save receipt"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
