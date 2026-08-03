"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  whmsWarehouseOrders,
  WarehouseOrder,
  WarehouseOrderFlowStatus,
  WarehouseOrderFlowHistoryEntry,
  warehouseOrderFlowStatusLabel,
} from "@/shared/services/whmsWarehouseOrderService";
import { whmsDispatch, whmsPickListFlow } from "@/shared/services/whmsFulfilmentService";
import { printOrderPickListFromPayload } from "../../pick-pack/components/warehousePickListPrint";

/**
 * Mirror of the backend transition map (orderFlow.service.js). The server is the
 * enforcement point — this only decides which buttons to render.
 */
const NEXT_STAGES: Record<string, WarehouseOrderFlowStatus[]> = {
  "order-created": ["picking", "cancelled"],
  picking: ["picking-done", "cancelled"],
  "picking-done": ["barcode-in-progress", "picking", "cancelled"],
  "barcode-in-progress": ["packing-done", "picking-done", "cancelled"],
  "packing-done": ["sent-to-scanning", "barcode-in-progress", "cancelled"],
  "sent-to-scanning": ["scanning-in-progress", "packing-done", "cancelled"],
  "scanning-in-progress": ["scanning-done", "sent-to-scanning", "cancelled"],
  "scanning-done": ["sent-to-billing", "scanning-in-progress", "cancelled"],
  "sent-to-billing": ["scanning-done", "cancelled"], // billed happens via invoice generation
  billed: ["cancelled"], // ready-to-dispatch happens via dispatch details
  "ready-to-dispatch": ["cancelled"], // dispatch happens via dispatch buttons
  dispatched: ["delivered"],
  "partial-dispatched": ["dispatched", "delivered"],
  "ready-for-pickup": ["dispatched", "delivered"],
  delivered: [],
  cancelled: [],
};

function printSimpleTable(title: string, headHtml: string, bodyHtml: string, metaHtml = "") {
  const win = window.open("", "_blank", "width=800,height=900");
  if (!win) {
    toast.error("Popup blocked — allow popups to print");
    return;
  }
  win.document.write(`<!doctype html><html><head><title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; padding: 24px; }
      h2 { margin-bottom: 4px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border: 1px solid #999; padding: 5px 8px; text-align: left; }
      th { background: #f2f2f2; }
      .meta { color: #444; margin: 2px 0; }
      .label-box { border: 2px solid #000; padding: 16px; margin: 12px 0; page-break-inside: avoid; }
      .label-box .big { font-size: 18px; font-weight: bold; }
    </style></head><body>
    <h2>${title}</h2>${metaHtml}
    ${headHtml || bodyHtml ? `${headHtml}${bodyHtml}` : ""}
    <script>window.onload = () => window.print();</script>
    </body></html>`);
  win.document.close();
}

const COURIER_OPTIONS = ["BLUEDART", "DELHIVERY", "SAFEXPRESS"] as const;

/**
 * Whether a saved courier name matches one of the predefined carrier options.
 * @param name - Stored courier / transport company name
 */
function isKnownCourierOption(name: string): boolean {
  return COURIER_OPTIONS.includes(name.trim().toUpperCase() as (typeof COURIER_OPTIONS)[number]);
}

type Props = {
  orderId: string;
  onClose: () => void;
  onChanged: () => void;
};

export default function OrderFlowModal({ orderId, onClose, onChanged }: Props) {
  const [order, setOrder] = useState<WarehouseOrder | null>(null);
  const [history, setHistory] = useState<WarehouseOrderFlowHistoryEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [remarks, setRemarks] = useState("");

  // dispatch form
  const [courierName, setCourierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [vehicleDetails, setVehicleDetails] = useState("");
  const [boxCount, setBoxCount] = useState<number | "">("");
  const [shippingRemarks, setShippingRemarks] = useState("");

  const load = useCallback(async () => {
    try {
      const [o, h] = await Promise.all([
        whmsWarehouseOrders.get(orderId),
        whmsWarehouseOrders.getFlowHistory(orderId).catch(() => null),
      ]);
      setOrder(o);
      setHistory(h?.history || []);
      const d = o.dispatch || {};
      setCourierName(d.courierName || "");
      setTrackingNumber(d.trackingNumber || "");
      setVehicleDetails(d.vehicleDetails || "");
      setBoxCount(d.boxCount ?? "");
      setShippingRemarks(d.shippingRemarks || "");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load order");
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const flowStatus = String(order?.flowStatus || "order-created");
  const nextStages = NEXT_STAGES[flowStatus] || [];

  const handleTransition = async (to: WarehouseOrderFlowStatus) => {
    if (to === "cancelled" && !window.confirm("Cancel this order?")) return;
    if (to === "dispatched" || to === "partial-dispatched" || to === "ready-for-pickup") {
      await handleDispatch(to, remarks);
      setRemarks("");
      return;
    }
    setBusy(true);
    try {
      await whmsWarehouseOrders.transitionFlowStatus(orderId, to, remarks);
      toast.success(`Moved to ${warehouseOrderFlowStatusLabel(to)}`);
      setRemarks("");
      await load();
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transition failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveDispatchDetails = async (successMessage?: string) => {
    setBusy(true);
    try {
      await whmsDispatch.setDetails(orderId, {
        courierName,
        trackingNumber,
        vehicleDetails,
        ...(boxCount !== "" ? { boxCount: Number(boxCount) } : {}),
        shippingRemarks,
      });
      toast.success(successMessage || "Dispatch details saved");
      await load();
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save dispatch details");
    } finally {
      setBusy(false);
    }
  };

  /** Persist form fields when present, then run the dispatch transition. */
  const handleDispatch = async (
    mode: "dispatched" | "partial-dispatched" | "ready-for-pickup",
    transitionRemarks = ""
  ) => {
    const hasAnyDetail = Boolean(
      courierName.trim() ||
        trackingNumber.trim() ||
        vehicleDetails.trim() ||
        boxCount !== "" ||
        shippingRemarks.trim()
    );

    setBusy(true);
    try {
      if (hasAnyDetail) {
        await whmsDispatch.setDetails(orderId, {
          courierName,
          trackingNumber,
          vehicleDetails,
          ...(boxCount !== "" ? { boxCount: Number(boxCount) } : {}),
          shippingRemarks,
        });
      }
      await whmsDispatch.dispatch(orderId, mode, transitionRemarks || shippingRemarks);
      toast.success(`Order marked ${warehouseOrderFlowStatusLabel(mode)}`);
      await load();
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Dispatch failed");
    } finally {
      setBusy(false);
    }
  };

  const handlePrintPickList = async () => {
    try {
      const payload = await whmsPickListFlow.printPayload(orderId);
      printOrderPickListFromPayload(payload);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load pick list");
    }
  };

  const handlePrintShippingLabels = async () => {
    try {
      const payload = await whmsDispatch.shippingLabel(orderId);
      const labels = payload.labels
        .map(
          (l) => `<div class="label-box">
            <div class="big">${l.clientName || ""}</div>
            <p class="meta">Order: ${l.orderNumber || ""} ${payload.invoiceNumber ? `· Invoice: ${payload.invoiceNumber}` : ""}</p>
            <p class="meta">Courier: ${l.courierName || "—"} · AWB: ${l.trackingNumber || "—"}</p>
            <div class="big">Box ${l.boxNumber} / ${l.boxCount}</div>
          </div>`
        )
        .join("");
      printSimpleTable(`Shipping Labels — ${payload.orderNumber || orderId}`, "", labels);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load shipping label");
    }
  };

  const handlePrintPackingList = async () => {
    try {
      const payload = await whmsDispatch.packingList(orderId);
      const head = `<table><thead><tr><th>#</th><th>Style Code</th><th>Size</th><th>Shade</th><th>Qty</th></tr></thead>`;
      const body = `<tbody>${payload.items
        .map((i) => `<tr><td>${i.srNo}</td><td>${i.styleCode}</td><td>${i.size || ""}</td><td>${i.shade || ""}</td><td>${i.quantity}</td></tr>`)
        .join("")}</tbody></table>`;
      printSimpleTable(
        `Packing List — ${payload.orderNumber || orderId}`,
        head,
        body,
        `<p class="meta">Client: ${payload.clientName || ""} ${payload.invoiceNumber ? `· Invoice: ${payload.invoiceNumber}` : ""} · Total Qty: ${payload.totalQuantity}</p>`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load packing list");
    }
  };

  const showDispatchSection = ["billed", "ready-to-dispatch", "dispatched", "partial-dispatched", "ready-for-pickup"].includes(flowStatus);
  const canEditDispatchDetails = ["billed", "ready-to-dispatch", "dispatched", "partial-dispatched", "ready-for-pickup"].includes(flowStatus);
  const canRunDispatchActions = ["billed", "ready-to-dispatch"].includes(flowStatus);
  const canCompletePartialDispatch = flowStatus === "partial-dispatched";

  return (
    <div className="fixed inset-0 z-[999] flex items-start justify-center bg-black/40 overflow-y-auto py-8" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h3 className="text-[14px] font-bold text-gray-800">
            Order Flow — {order?.orderNumber || orderId}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {!order ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50" />
          </div>
        ) : (
          <div className="p-5 space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[12px] text-gray-600">Current stage:</span>
              <span className="inline-flex px-2 py-1 text-[11px] font-bold rounded bg-violet-100 text-violet-800">
                {warehouseOrderFlowStatusLabel(flowStatus)}
              </span>
              <span className="text-[12px] text-gray-500">Client: {order.clientName || "—"}</span>
              <div className="ml-auto flex gap-2">
                <button type="button" onClick={handlePrintPickList} className="ti-btn ti-btn-light px-2.5 py-1.5 text-[11px] font-semibold">
                  <i className="ri-printer-line"></i> Pick List
                </button>
                {showDispatchSection && (
                  <>
                    <button type="button" onClick={handlePrintShippingLabels} className="ti-btn ti-btn-light px-2.5 py-1.5 text-[11px] font-semibold">
                      <i className="ri-price-tag-3-line"></i> Shipping Labels
                    </button>
                    <button type="button" onClick={handlePrintPackingList} className="ti-btn ti-btn-light px-2.5 py-1.5 text-[11px] font-semibold">
                      <i className="ri-file-list-3-line"></i> Packing List
                    </button>
                  </>
                )}
              </div>
            </div>

            {nextStages.length > 0 && (
              <div className="border border-gray-200 rounded p-4">
                <p className="text-[11px] font-bold text-gray-600 uppercase mb-2">Move to next stage</p>
                <div className="flex flex-wrap items-center gap-2">
                  {nextStages.map((to) => (
                    <button
                      key={to}
                      type="button"
                      disabled={busy}
                      onClick={() => handleTransition(to)}
                      className={`ti-btn px-3 py-2 min-h-[32px] text-[11px] font-semibold ${
                        to === "cancelled" ? "ti-btn-danger" : "ti-btn-primary"
                      }`}
                    >
                      {warehouseOrderFlowStatusLabel(to)}
                    </button>
                  ))}
                  <input
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Remarks (optional)"
                    className="form-control flex-1 min-w-[160px] text-[12px]"
                  />
                </div>
                {flowStatus === "sent-to-billing" && (
                  <p className="text-[11px] text-gray-500 mt-2">
                    <i className="ri-information-line"></i> Billing happens from the <b>Billing</b> page (generate invoice).
                  </p>
                )}
                {flowStatus === "sent-to-scanning" && (
                  <p className="text-[11px] text-gray-500 mt-2">
                    <i className="ri-information-line"></i> Scanning happens from the <b>Scanning</b> page.
                  </p>
                )}
              </div>
            )}

            {showDispatchSection && (
              <div className="border border-gray-200 rounded p-4 space-y-4">
                <div>
                  <p className="text-[11px] font-bold text-gray-600 uppercase mb-1">Dispatch Preparation</p>
                  <p className="text-[11px] text-gray-500">
                    Courier and AWB can be filled in later via Update Details after dispatch.
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-gray-600 mb-2">Shipment details</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-1">Courier / Transport Company <span className="text-gray-400">(optional)</span></label>
                      <select
                        value={courierName}
                        onChange={(e) => setCourierName(e.target.value)}
                        className="form-control text-[12px] w-full"
                        aria-label="Courier or transport company"
                      >
                        <option value="">Select courier</option>
                        {COURIER_OPTIONS.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                        {courierName.trim() && !isKnownCourierOption(courierName) ? (
                          <option value={courierName}>{courierName}</option>
                        ) : null}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-1">Tracking Number / AWB <span className="text-gray-400">(optional)</span></label>
                      <input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} className="form-control text-[12px] w-full" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-1">Vehicle Details <span className="text-gray-400">(optional)</span></label>
                      <input value={vehicleDetails} onChange={(e) => setVehicleDetails(e.target.value)} className="form-control text-[12px] w-full" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-1">Boxes / Cartons <span className="text-gray-400">(optional)</span></label>
                      <input
                        type="number"
                        min={0}
                        value={boxCount}
                        onChange={(e) => setBoxCount(e.target.value === "" ? "" : Number(e.target.value))}
                        className="form-control text-[12px] w-full"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] text-gray-600 mb-1">Shipping Remarks <span className="text-gray-400">(optional)</span></label>
                      <input value={shippingRemarks} onChange={(e) => setShippingRemarks(e.target.value)} className="form-control text-[12px] w-full" />
                    </div>
                  </div>
                  {canEditDispatchDetails && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          handleSaveDispatchDetails(
                            flowStatus === "billed"
                              ? "Dispatch details saved — order is Ready to Dispatch"
                              : "Dispatch details updated"
                          )
                        }
                        className="ti-btn ti-btn-light text-[11px] font-semibold"
                      >
                        <i className="ri-save-line"></i> {flowStatus === "billed" ? "Save Details" : "Update Details"}
                      </button>
                    </div>
                  )}
                </div>

                {(canRunDispatchActions || canCompletePartialDispatch) && (
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-[11px] font-semibold text-gray-600 mb-2">Dispatch actions</p>
                    <div className="flex flex-wrap gap-2">
                      {canRunDispatchActions && (
                        <>
                          <button type="button" disabled={busy} onClick={() => handleDispatch("dispatched")} className="ti-btn ti-btn-primary text-[11px] font-semibold">
                            <i className="ri-truck-line"></i> Dispatched
                          </button>
                          <button type="button" disabled={busy} onClick={() => handleDispatch("partial-dispatched")} className="ti-btn ti-btn-primary text-[11px] font-semibold">
                            Partial Dispatch
                          </button>
                          <button type="button" disabled={busy} onClick={() => handleDispatch("ready-for-pickup")} className="ti-btn ti-btn-primary text-[11px] font-semibold">
                            Ready for Pickup
                          </button>
                        </>
                      )}
                      {canCompletePartialDispatch && (
                        <button type="button" disabled={busy} onClick={() => handleDispatch("dispatched")} className="ti-btn ti-btn-primary text-[11px] font-semibold">
                          <i className="ri-truck-line"></i> Complete Dispatch
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="border border-gray-200 rounded p-4">
              <p className="text-[11px] font-bold text-gray-600 uppercase mb-2">Flow History</p>
              {history.length === 0 ? (
                <p className="text-[12px] text-gray-400">No stage changes yet.</p>
              ) : (
                <ul className="space-y-1.5 max-h-56 overflow-y-auto">
                  {[...history].reverse().map((h, i) => (
                    <li key={i} className="text-[12px] text-gray-700 flex flex-wrap gap-x-2">
                      <span className="text-gray-400 whitespace-nowrap">{h.at ? new Date(h.at).toLocaleString() : ""}</span>
                      <span>
                        <b>{warehouseOrderFlowStatusLabel(h.from)}</b> → <b>{warehouseOrderFlowStatusLabel(h.to)}</b>
                      </span>
                      {h.byName && <span className="text-gray-500">by {h.byName}</span>}
                      {h.remarks && <span className="text-gray-500 italic">“{h.remarks}”</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
