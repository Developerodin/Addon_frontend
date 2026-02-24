"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { PickItem } from "../types";
import RackLocationChip from "./RackLocationChip";
import QtyInputCell from "./QtyInputCell";
import StatusBadge from "./StatusBadge";

function statusTone(status: PickItem["status"]) {
  switch (status) {
    case "pending":
      return "yellow" as const;
    case "partial":
      return "orange" as const;
    case "picked":
      return "blue" as const;
    case "verified":
      return "green" as const;
    case "skipped":
      return "red" as const;
    default:
      return "gray" as const;
  }
}

export default function PickDrawer({
  isOpen,
  item,
  onClose,
  onConfirm,
  onMarkPartial,
  onSkip,
  onScanMismatch,
}: {
  isOpen: boolean;
  item: PickItem | null;
  onClose: () => void;
  onConfirm: (itemId: string, pickedQty: number) => void;
  onMarkPartial: (itemId: string, pickedQty: number) => void;
  onSkip: (itemId: string) => void;
  onScanMismatch?: (message: string) => void;
}) {
  const [pickedQty, setPickedQty] = useState<number>(0);
  const [scanValue, setScanValue] = useState("");

  useEffect(() => {
    if (item) {
      setPickedQty(item.pickedQty);
      setScanValue("");
    }
  }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const max = item?.requiredQty ?? 0;

  const canConfirm = useMemo(() => {
    if (!item) return false;
    if (item.status === "verified" || item.status === "skipped") return false;
    return pickedQty >= 0 && pickedQty <= max;
  }, [item, pickedQty, max]);

  if (!isOpen || !item) return null;

  const handleScanEnter = () => {
    const v = scanValue.trim();
    if (!v) return;
    const normalized = v.toUpperCase();
    const sku = item.sku.toUpperCase();
    const ok = normalized === sku || normalized.endsWith(sku);
    if (!ok) {
      onScanMismatch?.(`Scan mismatch: expected ${item.sku}, got ${v}`);
      return;
    }
    // Optional SKU verify at picking; do not generate barcode here.
  };

  const warnPartial = pickedQty > 0 && pickedQty < item.requiredQty;

  return (
    <div className={`fixed inset-0 z-50 overflow-hidden ${isOpen ? "" : "pointer-events-none"}`}>
      <div
        className={`fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />

      <div
        className={`fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-xl transform transition-transform duration-200 ease-in-out overflow-hidden flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="bg-primary text-white px-6 py-4 flex-shrink-0">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h3 className="text-lg font-semibold">Pick Item</h3>
              <p className="text-sm text-white/80 mt-1">{item.sku}</p>
            </div>
            <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <StatusBadge label={item.status} tone={statusTone(item.status)} size="md" />
            <span className="text-white/80 text-[12px] font-semibold">Path #{item.pathIndex}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="box">
            <div className="box-body">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded border border-gray-100 bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <i className="ri-image-line text-2xl text-gray-300"></i>
                </div>
                <div className="flex-1">
                  <div className="text-[12px] font-bold text-gray-900">{item.name}</div>
                  <div className="mt-2">
                    <div className="text-[11px] font-bold text-gray-500 uppercase mb-1">Rack Location</div>
                    <RackLocationChip location={item.rackLocation} emphasize />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="box">
              <div className="box-body">
                <div className="text-[11px] font-bold text-gray-500 uppercase">Required Qty</div>
                <div className="text-2xl font-extrabold text-gray-900 mt-1">
                  {item.requiredQty} <span className="text-sm font-bold text-gray-500">{item.unit}</span>
                </div>
              </div>
            </div>
            <div className="box">
              <div className="box-body">
                <div className="text-[11px] font-bold text-gray-500 uppercase">Already Picked</div>
                <div className="text-2xl font-extrabold text-gray-900 mt-1">
                  {item.pickedQty} <span className="text-sm font-bold text-gray-500">{item.unit}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="box">
            <div className="box-header">
              <h3 className="box-title">Pick Quantity</h3>
            </div>
            <div className="box-body">
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <QtyInputCell value={pickedQty} min={0} max={item.requiredQty} onChange={setPickedQty} warn={warnPartial} />
                {warnPartial ? (
                  <div className="text-[11px] font-semibold text-orange-700 bg-orange-50 border border-orange-100 rounded px-3 py-2">
                    <i className="ri-alert-line me-1"></i>
                    Partial pick (picked &lt; required)
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="box">
            <div className="box-header">
              <h3 className="box-title">Scan (optional)</h3>
            </div>
            <div className="box-body">
              <input
                className="ti-form-input !h-12 !text-[14px]"
                placeholder="Scan SKU barcode to verify..."
                value={scanValue}
                onChange={(e) => setScanValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleScanEnter();
                }}
              />
              <div className="text-[11px] text-gray-500 mt-2">
                Picking scan is optional. Barcode generation happens at pack stage.
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap gap-2 justify-end bg-white">
          <button type="button" className="ti-btn ti-btn-light px-4 py-2.5" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="ti-btn ti-btn-warning px-4 py-2.5"
            onClick={() => onMarkPartial(item.id, pickedQty)}
            disabled={!canConfirm}
          >
            <i className="ri-error-warning-line me-1"></i>
            Mark Partial
          </button>
          <button
            type="button"
            className="ti-btn ti-btn-danger px-4 py-2.5"
            onClick={() => onSkip(item.id)}
            disabled={item.status === "verified"}
          >
            <i className="ri-skip-forward-line me-1"></i>
            Skip
          </button>
          <button
            type="button"
            className="ti-btn ti-btn-primary px-4 py-2.5"
            onClick={() => onConfirm(item.id, pickedQty)}
            disabled={!canConfirm}
          >
            <i className="ri-check-line me-1"></i>
            Confirm Pick
          </button>
        </div>
      </div>
    </div>
  );
}

