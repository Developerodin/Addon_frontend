"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import vendorPurchaseOrderService, {
  VendorPoApiStatus,
  VendorPurchaseOrder,
  VendorPackListEntry,
  VendorLotStatus,
} from "@/shared/services/vendorPurchaseOrderService";
import { vendorPoApiStatusToUi, vendorPoUiStatusClass } from "../utils/vendorPoFlow";
import type { VendorPO } from "../raise/types";
import { getPoLineItemId, packlistRowTotalUnits, productNameForPoLineId, receivedLotTotalUnits, vendorCodeFromPoLineItem, dashOr, findPoLineItemById } from "./vendorPacklistHelpers";

function readVendorName(vendor: VendorPurchaseOrder["vendor"]): string {
  if (!vendor) return "—";
  if (typeof vendor === "string") return vendor;
  return vendor.header?.vendorName || "—";
}

function packlistToArray(pd: VendorPurchaseOrder["packListDetails"]): VendorPackListEntry[] {
  if (!pd) return [];
  return Array.isArray(pd) ? pd : [pd];
}

function formatMoney(n: number): string {
  return `₹${Number(n || 0).toLocaleString()}`;
}

function readProductVendorCode(item: VendorPurchaseOrder["poItems"][number]): string {
  return vendorCodeFromPoLineItem(item);
}

function receivedQtyByLineFromLots(po: VendorPurchaseOrder | null | undefined): Record<string, number> {
  const map: Record<string, number> = {};
  if (!po?.receivedLotDetails?.length) return map;
  for (const lot of po.receivedLotDetails) {
    for (const line of lot.poItems || []) {
      const key = String(line.poItem || "").trim();
      if (!key) continue;
      map[key] = (map[key] || 0) + Number(line.receivedQuantity || 0);
    }
  }
  return map;
}

function lotStatusLabel(s: VendorLotStatus | undefined): string | undefined {
  if (!s) return undefined;
  const map: Record<VendorLotStatus, string> = {
    lot_pending: "Pending",
    lot_qc_pending: "QC pending",
    lot_rejected: "Rejected",
    lot_accepted: "Accepted",
  };
  return map[s] ?? s.replace(/_/g, " ");
}

export interface VendorPODetailsDrawerProps {
  isOpen: boolean;
  /** List row (for instant header); merged with API fetch. */
  summary: VendorPO | null;
  onClose: () => void;
  /** Receipt lots (`receivedLotDetails`); use on Receive only — hidden on Raise list by default. */
  showReceivedLotDetails?: boolean;
}

/**
 * Yarn purchase “View” parity: right slide-over, tabs, loading fetch, lines + packlist + status history.
 */
export function VendorPODetailsDrawer({
  isOpen,
  summary,
  onClose,
  showReceivedLotDetails = false,
}: VendorPODetailsDrawerProps) {
  const [detail, setDetail] = useState<VendorPurchaseOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"details" | "history">("details");

  const load = useCallback(async () => {
    if (!summary?.id) return;
    setLoading(true);
    try {
      const d = await vendorPurchaseOrderService.getById(summary.id, {
        populate: "vendor,poItems.productId",
      });
      setDetail(d);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load PO details");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [summary?.id]);

  useEffect(() => {
    if (!isOpen || !summary?.id) {
      setDetail(null);
      setTab("details");
      return;
    }
    void load();
  }, [isOpen, summary?.id, load]);

  if (!isOpen || !summary) return null;

  const d = detail;
  const vpo = d?.vpoNumber ?? summary.poNo;
  const sub = d?.subTotal ?? 0;
  const gst = d?.gst ?? 0;
  const total = d?.total ?? 0;
  const statusUi = d ? vendorPoApiStatusToUi(d.currentStatus) : summary.status;
  const notes = d?.notes ?? summary.remarks;
  /** Order date in UI = record created date (fallback to list poDate if API omits createdAt). */
  const orderDateRaw = d?.createdAt ?? summary.createdAt ?? summary.poDate;

  const vendorObj = d?.vendor && typeof d.vendor === "object" ? d.vendor : null;
  const header = vendorObj?.header;

  const statusLogs = (d?.statusLogs as Array<Record<string, unknown>> | undefined) ?? [];
  const packlists = packlistToArray(d?.packListDetails);
  const receivedByLineFromLots = receivedQtyByLineFromLots(d ?? summary.rawPurchaseOrder);
  const receivedLots = showReceivedLotDetails
    ? d != null && d.receivedLotDetails !== undefined
      ? d.receivedLotDetails
      : summary.rawPurchaseOrder?.receivedLotDetails ?? []
    : [];

  return (
    <div className={`fixed inset-0 z-50 overflow-hidden ${isOpen ? "" : "pointer-events-none"}`}>
      <div
        className={`fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl transform transition-transform duration-300 ease-in-out overflow-hidden flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="bg-primary text-white px-6 py-4 flex-shrink-0">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-lg font-semibold">Vendor PO details</h3>
              <p className="text-sm text-white/80 mt-1">{vpo}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
              aria-label="Close"
            >
              <i className="ri-close-line text-xl" />
            </button>
          </div>
          <div className="flex gap-1 border-b border-white/20">
            <button
              type="button"
              onClick={() => setTab("details")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tab === "details" ? "text-white border-b-2 border-white" : "text-white/70 hover:text-white"
              }`}
            >
              Order details
            </button>
            <button
              type="button"
              onClick={() => setTab("history")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tab === "history" ? "text-white border-b-2 border-white" : "text-white/70 hover:text-white"
              }`}
            >
              Status history
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-gray-600 text-sm">Loading order details…</p>
            </div>
          ) : (
            <>
              {tab === "details" && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600">PO number</label>
                        <div className="mt-0.5 text-xs text-gray-900 font-medium">{vpo}</div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Vendor</label>
                        <div className="mt-0.5 text-xs text-gray-900">{d ? readVendorName(d.vendor) : summary.vendorName}</div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Order date</label>
                        <div className="mt-0.5 text-xs text-gray-900">
                          {orderDateRaw
                            ? new Date(orderDateRaw).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            : "—"}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Est. order delivery</label>
                        <div className="mt-0.5 text-xs text-gray-900">
                          {d?.estimatedOrderDeliveryDate
                            ? new Date(d.estimatedOrderDeliveryDate).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            : summary.estimatedOrderDeliveryDate
                              ? new Date(summary.estimatedOrderDeliveryDate).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })
                              : "—"}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Priority</label>
                        <div className="mt-0.5 text-xs text-gray-900">{summary.priority}</div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Total qty / Received</label>
                        <div className="mt-0.5 text-xs text-gray-900">
                          {summary.totalQty.toLocaleString()} / {summary.receivedQty.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600">Status</label>
                        <div className="mt-0.5">
                          <span
                            className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full ${vendorPoUiStatusClass(statusUi)}`}
                          >
                            {statusUi}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Sub total</label>
                        <div className="mt-0.5 text-xs text-gray-900">{formatMoney(sub)}</div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">GST</label>
                        <div className="mt-0.5 text-xs text-gray-900">{formatMoney(gst)}</div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Total</label>
                        <div className="mt-0.5 text-xs text-gray-900 font-semibold">{formatMoney(total)}</div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Credit days</label>
                        <div className="mt-0.5 text-xs text-gray-900">{d?.creditDays ?? summary.creditDays ?? "—"}</div>
                      </div>
                    </div>
                  </div>

                  {header && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <label className="text-xs font-medium text-gray-700 mb-2 block">Vendor details</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        {header.vendorCode && (
                          <div>
                            <span className="text-[10px] text-gray-500">Code</span>
                            <div className="text-gray-900">{header.vendorCode}</div>
                          </div>
                        )}
                        {header.city && (
                          <div>
                            <span className="text-[10px] text-gray-500">City</span>
                            <div className="text-gray-900">{header.city}</div>
                          </div>
                        )}
                        {header.state && (
                          <div>
                            <span className="text-[10px] text-gray-500">State</span>
                            <div className="text-gray-900">{header.state}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {notes && (
                    <div className="mb-4">
                      <label className="text-xs font-medium text-gray-600">Notes</label>
                      <div className="mt-1 p-2 bg-gray-50 rounded text-xs text-gray-900 whitespace-pre-wrap">{notes}</div>
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="text-xs font-medium text-gray-600 mb-2 block">Order items</label>
                    <div className="overflow-x-auto border border-gray-300 rounded">
                      <table className="min-w-full border-collapse text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="border border-gray-300 px-2 py-1 text-left font-medium text-gray-500 uppercase">
                              Product
                            </th>
                            <th className="border border-gray-300 px-2 py-1 text-left font-medium text-gray-500 uppercase">
                              Vendor code
                            </th>
                            <th className="border border-gray-300 px-2 py-1 text-left font-medium text-gray-500 uppercase">
                              Type
                            </th>
                            <th className="border border-gray-300 px-2 py-1 text-left font-medium text-gray-500 uppercase">
                              Color
                            </th>
                            <th className="border border-gray-300 px-2 py-1 text-left font-medium text-gray-500 uppercase">
                              Pattern
                            </th>
                            <th className="border border-gray-300 px-2 py-1 text-right font-medium text-gray-500 uppercase">
                              Qty
                            </th>
                            <th className="border border-gray-300 px-2 py-1 text-right font-medium text-gray-500 uppercase">
                              Received
                            </th>
                            <th className="border border-gray-300 px-2 py-1 text-right font-medium text-gray-500 uppercase">
                              Pending
                            </th>
                            <th className="border border-gray-300 px-2 py-1 text-right font-medium text-gray-500 uppercase">
                              Rate
                            </th>
                            <th className="border border-gray-300 px-2 py-1 text-right font-medium text-gray-500 uppercase">
                              GST %
                            </th>
                            <th className="border border-gray-300 px-2 py-1 text-right font-medium text-gray-500 uppercase">
                              Subtotal
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {(d?.poItems ?? []).map((item, index) => {
                            const pid = item.productId;
                            const name =
                              item.productName || (typeof pid === "object" ? pid?.name || "" : "") || "—";
                            const vendorCode = readProductVendorCode(item);
                            const qty = Number(item.quantity || 0);
                            const lineId = getPoLineItemId(item) ?? "";
                            const receivedFromItem = Number(item.receivedQuantity || 0);
                            const receivedFromLots = lineId ? Number(receivedByLineFromLots[lineId] || 0) : 0;
                            const receivedRaw = receivedFromItem > 0 ? receivedFromItem : receivedFromLots;
                            const received = Math.max(0, receivedRaw);
                            const pending = Math.max(0, qty - received);
                            const rate = Number(item.rate || 0);
                            const g = Number(item.gstRate ?? 0);
                            const lineSub = qty * rate;
                            const key = getPoLineItemId(item) ?? `row-${index}`;
                            return (
                              <tr key={key} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-2 py-1.5">{name}</td>
                                <td className="border border-gray-300 px-2 py-1.5">{vendorCode || "no vendor code"}</td>
                                <td className="border border-gray-300 px-2 py-1.5">{dashOr(item.type)}</td>
                                <td className="border border-gray-300 px-2 py-1.5">{dashOr(item.color)}</td>
                                <td className="border border-gray-300 px-2 py-1.5">{dashOr(item.pattern)}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-right">{qty.toLocaleString()}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-right">{received.toLocaleString()}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-right">{pending.toLocaleString()}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-right">{formatMoney(rate)}</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-right">{g}%</td>
                                <td className="border border-gray-300 px-2 py-1.5 text-right">{formatMoney(lineSub)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {packlists.length > 0 && (
                    <div className="mb-4">
                      <label className="text-xs font-medium text-gray-700 mb-2 block">
                        Packlist details
                        <span className="text-[10px] text-gray-500 ms-2">
                          ({packlists.length} {packlists.length === 1 ? "entry" : "entries"})
                        </span>
                      </label>
                      <div className="space-y-3">
                        {packlists.map((pl, idx) => (
                          <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <h4 className="text-xs font-semibold text-gray-800 mb-2">Packlist entry {idx + 1}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                              {pl.packingNumber && (
                                <div>
                                  <span className="text-[10px] text-gray-600">Packing #</span>
                                  <div className="text-gray-900">{pl.packingNumber}</div>
                                </div>
                              )}
                              {pl.courierName && (
                                <div>
                                  <span className="text-[10px] text-gray-600">Courier</span>
                                  <div className="text-gray-900">{pl.courierName}</div>
                                </div>
                              )}
                              {pl.dispatchDate && (
                                <div>
                                  <span className="text-[10px] text-gray-600">Dispatch</span>
                                  <div className="text-gray-900">{new Date(pl.dispatchDate).toLocaleDateString()}</div>
                                </div>
                              )}
                              {pl.estimatedDeliveryDate && (
                                <div>
                                  <span className="text-[10px] text-gray-600">Est. delivery</span>
                                  <div className="text-gray-900">{new Date(pl.estimatedDeliveryDate).toLocaleDateString()}</div>
                                </div>
                              )}
                              {pl.numberOfBoxes != null && (
                                <div>
                                  <span className="text-[10px] text-gray-600">Boxes</span>
                                  <div className="text-gray-900">{pl.numberOfBoxes}</div>
                                </div>
                              )}
                              {packlistRowTotalUnits(pl) > 0 && (
                                <div>
                                  <span className="text-[10px] text-gray-600">Total units</span>
                                  <div className="text-gray-900">{packlistRowTotalUnits(pl)}</div>
                                </div>
                              )}
                            </div>
                            {pl.poItems && pl.poItems.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-blue-100">
                                <span className="text-[10px] text-gray-600 block mb-1">PO lines in this shipment</span>
                                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-gray-900">
                                  {pl.poItems.map((lineId) => (
                                    <li key={String(lineId)}>
                                      {productNameForPoLineId(String(lineId), d?.poItems)}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {pl.notes && (
                              <p className="text-[11px] text-gray-700 mt-2 border-t border-blue-100 pt-2">{pl.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {receivedLots.length > 0 && (
                    <div className="mb-4">
                      <label className="text-xs font-medium text-gray-700 mb-2 block">
                        Received invoice details
                        <span className="text-[10px] text-gray-500 ms-2">
                          ({receivedLots.length} {receivedLots.length === 1 ? "invoice" : "invoices"})
                        </span>
                      </label>
                      <div className="space-y-3">
                        {receivedLots.map((lot, idx) => {
                          const statusLbl = lotStatusLabel(lot.status);
                          return (
                            <div key={`${lot.lotNumber || "lot"}-${idx}`} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <h4 className="text-xs font-semibold text-gray-800 mb-2">Invoice entry {idx + 1}</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-[10px] text-gray-600">Invoice number</span>
                                  <div className="text-gray-900 font-medium">{lot.lotNumber?.trim() || "—"}</div>
                                </div>
                                <div>
                                  <span className="text-[10px] text-gray-600">Boxes</span>
                                  <div className="text-gray-900">{Number(lot.numberOfBoxes ?? 0).toLocaleString()}</div>
                                </div>
                                {statusLbl && (
                                  <div>
                                    <span className="text-[10px] text-gray-600">Status</span>
                                    <div className="text-gray-900">{statusLbl}</div>
                                  </div>
                                )}
                                {lot.numberOfCones != null && lot.numberOfCones > 0 && (
                                  <div>
                                    <span className="text-[10px] text-gray-600">Cones</span>
                                    <div className="text-gray-900">{lot.numberOfCones}</div>
                                  </div>
                                )}
                                {receivedLotTotalUnits(lot) > 0 && (
                                  <div>
                                    <span className="text-[10px] text-gray-600">Total units</span>
                                    <div className="text-gray-900">{receivedLotTotalUnits(lot)}</div>
                                  </div>
                                )}
                              </div>
                              {lot.poItems && lot.poItems.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-blue-100 overflow-x-auto">
                                  <span className="text-[10px] text-gray-600 block mb-1">Received by line</span>
                                  <table className="min-w-full border-collapse text-[10px]">
                                    <thead>
                                      <tr className="bg-blue-50/50">
                                        <th className="border border-blue-100 px-1.5 py-1 text-left font-medium text-gray-600">Product</th>
                                        <th className="border border-blue-100 px-1.5 py-1 text-left font-medium text-gray-600">Vendor code</th>
                                        <th className="border border-blue-100 px-1.5 py-1 text-left font-medium text-gray-600">Type</th>
                                        <th className="border border-blue-100 px-1.5 py-1 text-left font-medium text-gray-600">Color</th>
                                        <th className="border border-blue-100 px-1.5 py-1 text-left font-medium text-gray-600">Pattern</th>
                                        <th className="border border-blue-100 px-1.5 py-1 text-right font-medium text-gray-600">Qty</th>
                                        <th className="border border-blue-100 px-1.5 py-1 text-right font-medium text-gray-600">Boxes</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {lot.poItems.map((p, i) => {
                                        const line = findPoLineItemById(String(p.poItem), d?.poItems);
                                        const name = productNameForPoLineId(String(p.poItem), d?.poItems);
                                        return (
                                          <tr key={`${String(p.poItem)}-${i}`}>
                                            <td className="border border-blue-100 px-1.5 py-1">{name}</td>
                                            <td className="border border-blue-100 px-1.5 py-1">
                                              {line ? vendorCodeFromPoLineItem(line) || "no vendor code" : "—"}
                                            </td>
                                            <td className="border border-blue-100 px-1.5 py-1">{dashOr(line?.type)}</td>
                                            <td className="border border-blue-100 px-1.5 py-1">{dashOr(line?.color)}</td>
                                            <td className="border border-blue-100 px-1.5 py-1">{dashOr(line?.pattern)}</td>
                                            <td className="border border-blue-100 px-1.5 py-1 text-right tabular-nums">
                                              {Number(p.receivedQuantity || 0).toLocaleString()} pcs
                                            </td>
                                            <td className="border border-blue-100 px-1.5 py-1 text-right tabular-nums">
                                              {Number(p.receivedBoxes || 0).toLocaleString()}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {tab === "history" && (
                <>
                  {statusLogs.length > 0 ? (
                    <div className="mb-4">
                      <label className="text-xs font-medium text-gray-600 mb-2 block">Status history</label>
                      <div className="space-y-2">
                        {statusLogs.map((log, index) => {
                          const code = (log.status ?? log.statusCode ?? log.currentStatus) as string | undefined;
                          const at = (log.changedAt ?? log.updatedAt ?? log.createdAt) as string | undefined;
                          const by = (log.changedBy ?? log.updatedBy) as string | { username?: string } | undefined;
                          const remarks = (log.remarks ?? log.notes) as string | undefined;
                          const labelUi = code
                            ? vendorPoApiStatusToUi(code as VendorPoApiStatus)
                            : ("Status" as const);
                          return (
                            <div key={index} className="p-2 bg-gray-50 rounded-lg border-l-4 border-primary">
                              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                <span
                                  className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                                    code ? vendorPoUiStatusClass(labelUi) : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {code ? labelUi : "Entry"}
                                </span>
                                {at && (
                                  <span className="text-[10px] text-gray-500">{new Date(at).toLocaleString()}</span>
                                )}
                              </div>
                              {by && (
                                <div className="text-[10px] text-gray-600">
                                  By:{" "}
                                  <span className="font-medium">
                                    {typeof by === "string" ? by : by.username ?? "—"}
                                  </span>
                                </div>
                              )}
                              {remarks && <div className="text-xs text-gray-700 mt-1">{remarks}</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-400 mb-3">
                        <i className="ri-history-line text-3xl" />
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 mb-1">No status history</h3>
                      <p className="text-xs text-gray-500">No status changes recorded for this PO.</p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-2 flex-shrink-0 border-t border-gray-200">
          {summary.status === "Submitted to vendor" && (
            <Link
              href={`/vendor-po/purchase-management/purchase/edit/${summary.id}`}
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-black bg-black px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-900 hover:border-gray-900 transition-colors whitespace-nowrap"
              onClick={onClose}
            >
              <i className="ri-edit-line" />
              Edit
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors whitespace-nowrap"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
