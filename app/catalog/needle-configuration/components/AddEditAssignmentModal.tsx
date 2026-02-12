"use client";

import React, { useState, useEffect } from "react";
import type {
  MachineOrderAssignment,
  ProductionOrderItem,
  CreateAssignmentBody,
  UpdateAssignmentBody,
} from "@/shared/services/machineOrderAssignmentService";
import { OrderStatus, OrderStatusType } from "@/shared/services/machineOrderAssignmentService";
import type { ProductionOrder, Article } from "@/shared/services/productionService";

export interface MachineOption {
  id: string;
  machineCode?: string;
  name?: string;
}

export interface AddEditAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  editAssignment: MachineOrderAssignment | null;
  machines: MachineOption[];
  productionOrders: ProductionOrder[];
  onCreate: (body: CreateAssignmentBody) => Promise<void>;
  onUpdate: (id: string, body: UpdateAssignmentBody) => Promise<void>;
}

const STATUS_OPTIONS: OrderStatusType[] = [
  OrderStatus.PENDING,
  OrderStatus.IN_PROGRESS,
  OrderStatus.COMPLETED,
  OrderStatus.ON_HOLD,
  OrderStatus.CANCELLED,
];

export default function AddEditAssignmentModal({
  isOpen,
  onClose,
  editAssignment,
  machines,
  productionOrders,
  onCreate,
  onUpdate,
}: AddEditAssignmentModalProps) {
  const isEdit = !!editAssignment?.id;
  const [machineId, setMachineId] = useState("");
  const [items, setItems] = useState<ProductionOrderItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editAssignment) {
      const mid =
        typeof editAssignment.machine === "object"
          ? (editAssignment.machine as { id?: string }).id ?? ""
          : String(editAssignment.machine);
      setMachineId(mid);
      setItems(
        editAssignment.productionOrderItems?.length
          ? [...editAssignment.productionOrderItems]
          : [{ productionOrder: "", article: "" }]
      );
    } else {
      setMachineId("");
      setItems([{ productionOrder: "", article: "" }]);
    }
  }, [isOpen, editAssignment]);

  const addItem = () => {
    setItems((prev) => [...prev, { productionOrder: "", article: "" }]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ProductionOrderItem, value: string | number | undefined) => {
    setItems((prev) => {
      const next = [...prev];
      (next[index] as any)[field] = value;
      return next;
    });
  };

  const getArticlesForOrder = (orderId: string): Article[] => {
    const order = productionOrders.find(
      (o) => (o.id ?? (o as any)._id) === orderId
    );
    return order?.articles ?? [];
  };

  /** Resolve order number for display (from item or lookup) */
  const getOrderNumber = (item: ProductionOrderItem): string => {
    if (item.orderNumber) return item.orderNumber;
    const order = productionOrders.find(
      (o) => (o.id ?? (o as any)._id) === item.productionOrder
    );
    return (order?.orderNumber as string) ?? item.productionOrder ?? "—";
  };

  /** Resolve article number for display (from item or lookup) */
  const getArticleNumber = (item: ProductionOrderItem): string => {
    if (item.articleNumber) return item.articleNumber;
    const articles = getArticlesForOrder(item.productionOrder);
    const art = articles.find(
      (a) => (a.id ?? (a as any)._id) === item.article
    );
    return (art?.articleNumber as string) ?? item.article ?? "—";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineId.trim()) return;
    const validItems = items.filter(
      (i) => i.productionOrder && i.article
    );
    if (!isEdit && validItems.length === 0) return;

    setSaving(true);
    try {
      if (isEdit && editAssignment?.id) {
        await onUpdate(editAssignment.id, {
          productionOrderItems: validItems.length ? validItems : undefined,
        });
      } else {
        await onCreate({
          machine: machineId,
          activeNeedle: "",
          productionOrderItems: validItems.map((i) => ({
            productionOrder: i.productionOrder,
            article: i.article,
          })),
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEdit ? "View Orders" : "Add assignment"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <i className="ri-close-line text-2xl" />
          </button>
        </div>
        {isEdit ? (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="p-4 overflow-auto space-y-4 flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Machine</label>
                <div className="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-gray-50 text-gray-800">
                  {(() => {
                    const m = machines.find((me) => me.id === machineId);
                    return m?.machineCode ?? m?.name ?? machineId ?? "—";
                  })()}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Orders</label>
                <div className="space-y-2 max-h-56 overflow-auto">
                  {items.length > 0 ? (
                    <>
                      <div className="grid grid-cols-4 gap-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide px-1">
                        <div>Order #</div>
                        <div>Article #</div>
                        <div>Priority</div>
                        <div>Status</div>
                      </div>
                      {items.map((item, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-4 gap-2 items-center border border-gray-200 rounded p-2 bg-gray-50/50"
                        >
                          <div className="text-sm font-medium text-gray-800 truncate" title={getOrderNumber(item)}>
                            {getOrderNumber(item)}
                          </div>
                          <div className="text-sm font-medium text-gray-800 truncate" title={getArticleNumber(item)}>
                            {getArticleNumber(item)}
                          </div>
                          <div className="text-sm text-gray-700">{item.priority ?? "—"}</div>
                          <div className="text-sm text-gray-700">{item.status ?? "—"}</div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 py-2">No orders assigned.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end p-4 border-t shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-sm bg-gray-800 text-white rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="p-4 overflow-auto space-y-4 flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Machine</label>
                <select
                  value={machineId}
                  onChange={(e) => setMachineId(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select machine</option>
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.machineCode ?? m.name ?? m.id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">Production order items</label>
                  <button type="button" onClick={addItem} className="text-xs text-purple-600 hover:underline">
                    + Add row
                  </button>
                </div>
                <div className="space-y-2 max-h-56 overflow-auto">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-center border border-gray-200 rounded p-2 bg-gray-50/50"
                    >
                      <div className="col-span-4">
                        <select
                          value={item.productionOrder}
                          onChange={(e) => {
                            updateItem(idx, "productionOrder", e.target.value);
                            updateItem(idx, "article", "");
                          }}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                          <option value="">PO</option>
                          {productionOrders.map((po) => (
                            <option key={po.id ?? (po as any)._id} value={po.id ?? (po as any)._id}>
                              {po.orderNumber ?? po.id}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <select
                          value={item.article}
                          onChange={(e) => updateItem(idx, "article", e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                          <option value="">Article</option>
                          {getArticlesForOrder(item.productionOrder).map((a) => (
                            <option key={a.id ?? (a as any)._id} value={a.id ?? (a as any)._id}>
                              {a.articleNumber ?? a.id}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          min={1}
                          placeholder="Pri"
                          value={item.priority ?? ""}
                          onChange={(e) =>
                            updateItem(idx, "priority", e.target.value === "" ? undefined : Number(e.target.value))
                          }
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <select
                          value={item.status ?? OrderStatus.PENDING}
                          onChange={(e) => updateItem(idx, "status", e.target.value as OrderStatusType)}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <i className="ri-delete-bin-line" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t shrink-0">
              <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Create"}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
