"use client";

import React, { useMemo, useState } from "react";
import type { PickItem } from "../types";
import PickTable from "./PickTable";
import PickDrawer from "./PickDrawer";
import QRScanPanel from "./QRScanPanel";

interface PickListDashboardProps {
  items: PickItem[];
  onSetPickedQty: (itemId: string, pickedQty: number) => void;
  onConfirmPick: (itemId: string, pickedQty: number) => void;
  onMarkPartial: (itemId: string, pickedQty: number) => void;
  onSkip: (itemId: string) => void;
  onAlert?: (message: string) => void;
}

const PickListDashboard: React.FC<PickListDashboardProps> = ({
  items,
  onSetPickedQty,
  onConfirmPick,
  onMarkPartial,
  onSkip,
  onAlert,
}) => {
  const [view, setView] = useState<"list" | "qr">("list");
  const [filterOrder, setFilterOrder] = useState("");
  const [filterBatch, setFilterBatch] = useState("");
  const [filterZone, setFilterZone] = useState("");
  const [selectedItem, setSelectedItem] = useState<PickItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const batches = useMemo(() => Array.from(new Set(items.map(i => i.batchId).filter(Boolean))) as string[], [items]);
  const zones = useMemo(() => Array.from(new Set(items.map(i => i.rackLocation.zone).filter(Boolean))), [items]);

  const filtered = useMemo(() => {
    const o = filterOrder.trim().toUpperCase();
    return items
      .slice()
      .sort((a, b) => a.pathIndex - b.pathIndex)
      .filter((i) => {
        if (filterBatch && i.batchId !== filterBatch) return false;
        if (filterZone && i.rackLocation.zone !== filterZone) return false;
        if (o) {
          const hasOrder = i.linkedOrderIds.some(id => id.toUpperCase().includes(o));
          if (!hasOrder) return false;
        }
        return true;
      });
  }, [items, filterOrder, filterBatch, filterZone]);

  const stats = useMemo(() => {
    const total = items.length;
    const pending = items.filter(i => i.status === "pending").length;
    const picked = items.filter(i => i.status === "picked").length;
    const verified = items.filter(i => i.status === "verified").length;
    return { total, pending, picked, verified };
  }, [items]);

  const openPick = (item: PickItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const confirmBySku = (sku: string, qty: number) => {
    const match = items.find(i => i.sku.toUpperCase() === sku.toUpperCase());
    if (!match) {
      onAlert?.(`No pick item found for SKU ${sku}`);
      return;
    }
    onConfirmPick(match.id, qty);
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
            </div>
            <i className="ri-file-list-line text-3xl text-blue-400"></i>
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
            </div>
            <i className="ri-time-line text-3xl text-yellow-500"></i>
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Picked</p>
              <p className="text-2xl font-bold text-blue-700">{stats.picked}</p>
            </div>
            <i className="ri-checkbox-circle-line text-3xl text-blue-500"></i>
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Verified</p>
              <p className="text-2xl font-bold text-green-700">{stats.verified}</p>
            </div>
            <i className="ri-checkbox-circle-fill text-3xl text-green-500"></i>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="box">
        <div className="box-body">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setView("list")}
                className={`ti-btn ${view === "list" ? "ti-btn-primary" : "ti-btn-light"} px-4 py-2.5`}
              >
                <i className="ri-list-check-2 me-1"></i>
                List View
              </button>
              <button
                type="button"
                onClick={() => setView("qr")}
                className={`ti-btn ${view === "qr" ? "ti-btn-success" : "ti-btn-light"} px-4 py-2.5`}
              >
                <i className="ri-qr-scan-line me-1"></i>
                QR Scan Mode
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                className="ti-form-input !h-10 !text-[12px] min-w-[220px]"
                placeholder="Filter by Order ID..."
                value={filterOrder}
                onChange={(e) => setFilterOrder(e.target.value)}
              />
              <select
                className="ti-form-input !h-10 !text-[12px] min-w-[180px]"
                value={filterBatch}
                onChange={(e) => setFilterBatch(e.target.value)}
              >
                <option value="">All Batches</option>
                {batches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <select
                className="ti-form-input !h-10 !text-[12px] min-w-[140px]"
                value={filterZone}
                onChange={(e) => setFilterZone(e.target.value)}
              >
                <option value="">All Zones</option>
                {zones.map((z) => (
                  <option key={z} value={z}>
                    Zone {z}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {view === "qr" ? (
        <QRScanPanel
          items={filtered}
          onConfirmPickBySku={confirmBySku}
          onMismatch={(msg) => onAlert?.(msg)}
        />
      ) : (
        <div className="box">
          <div className="box-header">
            <h3 className="box-title">Pick List (Optimized Path)</h3>
          </div>
          <div className="box-body">
            <PickTable
              items={filtered}
              onOpenPick={openPick}
              onInlineQtyChange={onSetPickedQty}
            />
          </div>
        </div>
      )}

      <PickDrawer
        isOpen={drawerOpen}
        item={selectedItem ? items.find(i => i.id === selectedItem.id) || selectedItem : null}
        onClose={() => setDrawerOpen(false)}
        onConfirm={onConfirmPick}
        onMarkPartial={onMarkPartial}
        onSkip={onSkip}
        onScanMismatch={(msg) => onAlert?.(msg)}
      />
    </div>
  );
};

export default PickListDashboard;



