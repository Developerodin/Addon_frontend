"use client";

import React, { useMemo, useState } from "react";
import type { PickItem } from "../types";
import RackLocationChip from "./RackLocationChip";
import QtyInputCell from "./QtyInputCell";
import StatusBadge from "./StatusBadge";

export default function QRScanPanel({
  items,
  onConfirmPickBySku,
  onMismatch,
}: {
  items: PickItem[];
  onConfirmPickBySku: (sku: string, pickedQty: number) => void;
  onMismatch?: (message: string) => void;
}) {
  const [scanInput, setScanInput] = useState("");
  const [lastSku, setLastSku] = useState<string | null>(null);
  const [pickedQty, setPickedQty] = useState(0);

  const matched = useMemo(() => {
    const sku = (lastSku || "").trim().toUpperCase();
    if (!sku) return null;
    return items.find(i => i.sku.toUpperCase() === sku) || null;
  }, [items, lastSku]);

  const handleScan = () => {
    const raw = scanInput.trim();
    if (!raw) return;
    // Accept raw sku or "SKU:xxx"
    const sku = raw.includes(":") ? raw.split(":").pop()!.trim() : raw;
    setLastSku(sku);
    const found = items.find(i => i.sku.toUpperCase() === sku.toUpperCase());
    if (!found) {
      onMismatch?.(`No pick item found for SKU ${sku}`);
    } else {
      setPickedQty(Math.min(found.requiredQty, Math.max(0, found.pickedQty || 0)));
    }
    setScanInput("");
  };

  const canConfirm = matched && pickedQty >= 0 && pickedQty <= matched.requiredQty;

  return (
    <div className="box border-primary/20 bg-primary/5">
      <div className="box-header">
        <h3 className="box-title">QR Scan Mode (Picking)</h3>
      </div>
      <div className="box-body space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="ti-form-input !h-14 !text-[16px] flex-1 min-w-[280px]"
            placeholder="Scan SKU (or type and press Enter)"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleScan();
            }}
            autoFocus
          />
          <button type="button" className="ti-btn ti-btn-primary px-5 py-3" onClick={handleScan}>
            <i className="ri-qr-scan-line me-1"></i>
            Scan
          </button>
        </div>

        {matched ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="box lg:col-span-2">
              <div className="box-body space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[12px] font-bold text-gray-900">{matched.sku}</div>
                    <div className="text-[12px] font-semibold text-gray-700">{matched.name}</div>
                  </div>
                  <StatusBadge label={matched.status} tone={matched.status === "picked" ? "blue" : matched.status === "partial" ? "orange" : "yellow"} />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <div className="text-[11px] font-bold text-gray-500 uppercase">Rack</div>
                    <RackLocationChip location={matched.rackLocation} emphasize />
                  </div>
                  <div className="flex-1" />
                  <div className="text-right">
                    <div className="text-[11px] font-bold text-gray-500 uppercase">Required</div>
                    <div className="text-xl font-extrabold text-gray-900">
                      {matched.requiredQty} <span className="text-sm font-bold text-gray-500">{matched.unit}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="box">
              <div className="box-body space-y-2">
                <div className="text-[11px] font-bold text-gray-500 uppercase">Picked Qty</div>
                <QtyInputCell value={pickedQty} min={0} max={matched.requiredQty} onChange={setPickedQty} warn={pickedQty > 0 && pickedQty < matched.requiredQty} />
                <button
                  type="button"
                  className="ti-btn ti-btn-success w-full px-4 py-3"
                  disabled={!canConfirm}
                  onClick={() => onConfirmPickBySku(matched.sku, pickedQty)}
                >
                  <i className="ri-check-line me-1"></i>
                  Confirm
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-[12px] text-gray-600">
            Scan a SKU to load rack + required quantity, then confirm.
          </div>
        )}
      </div>
    </div>
  );
}

