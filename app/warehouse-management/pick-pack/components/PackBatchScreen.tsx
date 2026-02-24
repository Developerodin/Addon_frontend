"use client";

import React, { useMemo, useState } from "react";
import type { BarcodeGenerateRequest, BarcodeGenerateResult, PackBatch, PackOrder, PackItem } from "../types";
import StatusBadge from "./StatusBadge";
import OrderChipList from "./OrderChipList";
import QtyInputCell from "./QtyInputCell";
import BarcodeModal from "./BarcodeModal";

function orderTone(status: PackOrder["status"]) {
  switch (status) {
    case "ready":
      return "yellow" as const;
    case "packing":
      return "blue" as const;
    case "packed":
      return "green" as const;
    case "dispatch-ready":
      return "purple" as const;
    default:
      return "gray" as const;
  }
}

function itemTone(status: PackItem["status"]) {
  switch (status) {
    case "pending":
      return "yellow" as const;
    case "partial":
      return "orange" as const;
    case "packed":
      return "green" as const;
    case "verified":
      return "blue" as const;
    case "damaged":
      return "red" as const;
    case "missing":
      return "orange" as const;
    default:
      return "gray" as const;
  }
}

export default function PackBatchScreen({
  batch,
  onBack,
  onSetPackedQty,
  onGenerateCarton,
  onCompletePacking,
  onGenerateBarcodes,
  onAlert,
}: {
  batch: PackBatch;
  onBack: () => void;
  onSetPackedQty: (orderId: string, itemId: string, packedQty: number) => void;
  onGenerateCarton: (batchId: string) => void;
  onCompletePacking: (batchId: string) => void;
  onGenerateBarcodes: (args: {
    batchId: string;
    orderId: string;
    itemIds: string[];
    request: BarcodeGenerateRequest;
  }) => Promise<void> | void;
  onAlert?: (message: string) => void;
}) {
  const [selectedOrderId, setSelectedOrderId] = useState(batch.orders[0]?.orderId || "");
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);

  const selectedOrder = useMemo(
    () => batch.orders.find((o) => o.orderId === selectedOrderId) || batch.orders[0],
    [batch.orders, selectedOrderId]
  );

  const totalSkus = useMemo(() => batch.orders.reduce((s, o) => s + o.items.length, 0), [batch.orders]);
  const totalPicked = useMemo(
    () => batch.orders.reduce((s, o) => s + o.items.reduce((ss, i) => ss + i.pickedQty, 0), 0),
    [batch.orders]
  );
  const totalPacked = useMemo(
    () => batch.orders.reduce((s, o) => s + o.items.reduce((ss, i) => ss + i.packedQty, 0), 0),
    [batch.orders]
  );

  const handleScan = (item: PackItem, scanValue: string) => {
    const v = scanValue.trim();
    if (!v) return;
    if (!item.itemBarcode) {
      onAlert?.(`No item barcode yet for ${item.sku}. Generate barcode labels first.`);
      return;
    }
    const ok = v.toUpperCase() === item.itemBarcode.toUpperCase();
    if (!ok) {
      onAlert?.(`Scan mismatch for ${item.sku}. Expected ${item.itemBarcode}, got ${v}`);
      return;
    }
    const next = Math.min(item.pickedQty, item.packedQty + 1);
    onSetPackedQty(selectedOrder.orderId, item.id, next);
  };

  const cartons = batch.cartons || [];
  const hasMultipleCartons = cartons.length > 1;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="box">
        <div className="box-body">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <button type="button" className="ti-btn ti-btn-light px-3 py-2" onClick={onBack}>
                  <i className="ri-arrow-left-line me-1"></i>
                  Back
                </button>
                <div className="text-[14px] font-extrabold text-gray-900">Pack Batch</div>
                <span className="text-[13px] font-bold text-purple-600">{batch.id}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <OrderChipList orderIds={batch.orderIds} max={8} />
                <span className="text-[11px] text-gray-500">
                  Total SKUs: <b>{totalSkus}</b>
                </span>
                <span className="text-[11px] text-gray-500">
                  Packed: <b>{totalPacked}</b>/<b>{totalPicked}</b>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="ti-btn ti-btn-primary px-4 py-2.5"
                onClick={() => {
                  setBarcodeModalOpen(true);
                }}
              >
                <i className="ri-barcode-line me-1"></i>
                Generate Barcode Labels
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-success px-4 py-2.5"
                onClick={() => onCompletePacking(batch.id)}
              >
                <i className="ri-checkbox-circle-line me-1"></i>
                Complete Packing
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        {/* Orders sidebar */}
        <div className="col-span-12 lg:col-span-4">
          <div className="box">
            <div className="box-header">
              <h3 className="box-title">Orders in Batch</h3>
            </div>
            <div className="box-body space-y-2">
              {batch.orders.map((o) => (
                <button
                  key={o.orderId}
                  type="button"
                  onClick={() => setSelectedOrderId(o.orderId)}
                  className={`w-full text-left border rounded p-3 transition-colors ${
                    o.orderId === selectedOrderId ? "border-purple-200 bg-purple-50" : "border-gray-100 bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[12px] font-extrabold text-gray-900">{o.orderNumber}</div>
                      <div className="text-[11px] text-gray-500">{o.customerName}</div>
                    </div>
                    <StatusBadge label={o.status} tone={orderTone(o.status)} />
                  </div>
                  <div className="mt-2 text-[11px] text-gray-600">
                    SKUs: <b>{o.items.length}</b> • Picked:{" "}
                    <b>{o.items.reduce((s, i) => s + i.pickedQty, 0)}</b>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right panel actions (shown under sidebar on smaller screens) */}
          <div className="box mt-3">
            <div className="box-header">
              <h3 className="box-title">Cartons</h3>
            </div>
            <div className="box-body space-y-2">
              <div className="text-[11px] text-gray-600">
                Multiple cartons are supported. Carton barcode is attached on carton close (UI only here).
              </div>
              <div className="space-y-2">
                {cartons.map((c) => (
                  <div key={c.id} className="border border-gray-100 rounded p-3 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="text-[12px] font-bold text-gray-900">{c.id}</div>
                      <StatusBadge label={c.cartonBarcode ? "barcode-attached" : "no-barcode"} tone={c.cartonBarcode ? "green" : "gray"} />
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1">
                      {c.cartonBarcode ? `Carton Barcode: ${c.cartonBarcode}` : "Carton barcode not attached yet"}
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className="ti-btn ti-btn-light w-full px-4 py-2.5" onClick={() => onGenerateCarton(batch.id)}>
                <i className="ri-add-line me-1"></i>
                Generate Carton
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-primary w-full px-4 py-2.5"
                onClick={() => alert("Print carton label placeholder (no backend)")}
                disabled={cartons.length === 0}
              >
                <i className="ri-printer-line me-1"></i>
                Print Carton Label
              </button>
              {hasMultipleCartons ? (
                <div className="text-[11px] text-gray-500">
                  Tip: assign items across cartons as needed (UI placeholder).
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Items grid */}
        <div className="col-span-12 lg:col-span-8">
          <div className="box">
            <div className="box-header">
              <h3 className="box-title">Packing Items</h3>
            </div>
            <div className="box-body">
              {!selectedOrder ? (
                <div className="text-[12px] text-gray-600">Select an order to pack.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50/30">
                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                          SKU
                        </th>
                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                          Item Name
                        </th>
                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 w-44">
                          Picked Qty
                        </th>
                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 w-56">
                          Packed Qty
                        </th>
                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 w-56">
                          Scan Item Barcode (mandatory)
                        </th>
                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 w-32">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((it) => {
                        const pct = it.pickedQty > 0 ? Math.round((it.packedQty / it.pickedQty) * 100) : 0;
                        return (
                          <tr key={it.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">
                              {it.sku}
                            </td>
                            <td className="px-1.5 py-2.5 text-[12px] font-semibold text-gray-700 border border-gray-200">
                              {it.name}
                              <div className="text-[10px] text-gray-500 mt-1">
                                Barcode: {it.itemBarcode ? <span className="font-mono">{it.itemBarcode}</span> : <span className="text-orange-700 font-bold">not generated</span>}
                              </div>
                            </td>
                            <td className="px-1.5 py-2.5 border border-gray-200">
                              <div className="text-[12px] font-bold text-gray-900">{it.pickedQty}</div>
                            </td>
                            <td className="px-1.5 py-2.5 border border-gray-200">
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[12px] font-bold text-gray-800">
                                    {it.packedQty} / {it.pickedQty}
                                  </span>
                                  <span className="text-[10px] font-semibold text-gray-500">{pct}%</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded">
                                  <div className="h-2 bg-purple-600 rounded" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
                                </div>
                                <QtyInputCell
                                  value={it.packedQty}
                                  min={0}
                                  max={it.pickedQty}
                                  onChange={(next) => onSetPackedQty(selectedOrder.orderId, it.id, next)}
                                  warn={it.packedQty > 0 && it.packedQty < it.pickedQty}
                                />
                              </div>
                            </td>
                            <td className="px-1.5 py-2.5 border border-gray-200">
                              <input
                                className="ti-form-input !h-11 !text-[12px]"
                                placeholder="Scan barcode & press Enter"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    const input = e.currentTarget as HTMLInputElement;
                                    handleScan(it, input.value);
                                    input.value = "";
                                  }
                                }}
                              />
                              <div className="text-[10px] text-gray-500 mt-1">
                                Scan increments packed qty by 1.
                              </div>
                            </td>
                            <td className="px-1.5 py-2.5 border border-gray-200">
                              <StatusBadge label={it.status} tone={itemTone(it.status)} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <BarcodeModal
        isOpen={barcodeModalOpen}
        onClose={() => setBarcodeModalOpen(false)}
        onGenerate={async ({ types, quantity }) => {
          if (!selectedOrder) return [];
          const request: BarcodeGenerateRequest = { types, quantity };
          await onGenerateBarcodes({
            batchId: batch.id,
            orderId: selectedOrder.orderId,
            itemIds: selectedOrder.items.map((i) => i.id),
            request,
          });
          // UI placeholder preview (no backend)
          const results: BarcodeGenerateResult[] = types.map((t) => ({
            type: t,
            quantity,
            previewText:
              t === "item"
                ? `ITEM-BARCODE-${batch.id}-${selectedOrder?.orderNumber || "ORDER"}`
                : t === "carton"
                ? `CARTON-BARCODE-${batch.id}-CTN`
                : `ORDER-LABEL-${selectedOrder?.orderNumber || "ORDER"}`,
          }));
          return results;
        }}
      />
    </div>
  );
}

