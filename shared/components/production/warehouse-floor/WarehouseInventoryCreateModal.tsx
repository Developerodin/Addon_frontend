"use client";

import React, { useState } from "react";
import { toast } from "react-hot-toast";
import {
  whmsWarehouseInventory,
  type WhmsWarehouseInventoryDTO,
} from "@/shared/services/whmsService";

export interface WarehouseInventoryCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (row: WhmsWarehouseInventoryDTO) => void;
}

/** POST /v1/whms/warehouse-inventory — requires manageOrders. */
export default function WarehouseInventoryCreateModal({
  open,
  onClose,
  onCreated,
}: WarehouseInventoryCreateModalProps) {
  const [itemId, setItemId] = useState("");
  const [styleCodeId, setStyleCodeId] = useState("");
  const [styleCode, setStyleCode] = useState("");
  const [totalQuantity, setTotalQuantity] = useState("0");
  const [blockedQuantity, setBlockedQuantity] = useState("0");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const reset = () => {
    setItemId("");
    setStyleCodeId("");
    setStyleCode("");
    setTotalQuantity("0");
    setBlockedQuantity("0");
  };

  const submit = async () => {
    const iid = itemId.trim();
    const sid = styleCodeId.trim();
    const sc = styleCode.trim();
    if (!iid || !sid || !sc) {
      toast.error("itemId, styleCodeId, and styleCode are required");
      return;
    }
    const tq = Number(totalQuantity);
    const bq = Number(blockedQuantity);
    if (Number.isNaN(tq) || Number.isNaN(bq) || tq < 0 || bq < 0) {
      toast.error("Quantities must be non-negative numbers");
      return;
    }
    setSaving(true);
    try {
      const created = await whmsWarehouseInventory.create({
        itemId: iid,
        styleCodeId: sid,
        styleCode: sc,
        totalQuantity: tq,
        blockedQuantity: bq,
      });
      toast.success("Inventory row created");
      onCreated(created);
      reset();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} aria-hidden />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-lg shadow-xl z-[70] border border-gray-200 p-[10px]">
        <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-3">
          <h3 className="text-sm font-bold text-gray-800">New warehouse inventory</h3>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1">
            <i className="ri-close-line text-lg" />
          </button>
        </div>
        <div className="space-y-2 text-[11px]">
          <label className="block">
            <span className="text-gray-600 font-medium">itemId (Product)</span>
            <input
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 font-mono text-[10px]"
              placeholder="Mongo ObjectId"
            />
          </label>
          <label className="block">
            <span className="text-gray-600 font-medium">styleCodeId</span>
            <input
              value={styleCodeId}
              onChange={(e) => setStyleCodeId(e.target.value)}
              className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 font-mono text-[10px]"
              placeholder="Mongo ObjectId"
            />
          </label>
          <label className="block">
            <span className="text-gray-600 font-medium">styleCode</span>
            <input
              value={styleCode}
              onChange={(e) => setStyleCode(e.target.value)}
              className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5"
              placeholder="STY-001"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-gray-600 font-medium">totalQuantity</span>
              <input
                type="number"
                min={0}
                value={totalQuantity}
                onChange={(e) => setTotalQuantity(e.target.value)}
                className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 tabular-nums"
              />
            </label>
            <label className="block">
              <span className="text-gray-600 font-medium">blockedQuantity</span>
              <input
                type="number"
                min={0}
                value={blockedQuantity}
                onChange={(e) => setBlockedQuantity(e.target.value)}
                className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 tabular-nums"
              />
            </label>
          </div>
          <p className="text-[10px] text-gray-400">Requires manageOrders permission.</p>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-[11px] font-bold rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="px-3 py-1.5 text-[11px] font-bold rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Create"}
          </button>
        </div>
      </div>
    </>
  );
}
