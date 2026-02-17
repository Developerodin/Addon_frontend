"use client";

import React, { useMemo, useState } from "react";
import type { PurchaseOrder } from "@/shared/services/yarnPurchaseOrderService";

export interface PurchaseOrderSelectDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  orders: PurchaseOrder[];
  selectedOrderNumber: string;
  onSelect: (orderNumber: string) => void;
  title?: string;
  emptyMessage?: string;
}

/**
 * Side drawer to select a Purchase Order. Search filters by PO number,
 * supplier, amount, or any text in the row. Handles large lists (e.g. 300+ POs).
 */
const PurchaseOrderSelectDrawer: React.FC<PurchaseOrderSelectDrawerProps> = ({
  isOpen,
  onClose,
  orders,
  selectedOrderNumber,
  onSelect,
  title = "Select Purchase Order",
  emptyMessage = "No purchase orders found.",
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((order) => {
      const searchable =
        [
          order.orderNumber,
          order.supplier,
          order.totalAmount?.toString(),
          order.id,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase() || "";
      return searchable.includes(q);
    });
  }, [orders, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 z-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative z-10 ml-auto w-full max-w-xl h-full bg-white shadow-xl flex flex-col border-l border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 flex justify-between items-center shrink-0">
          <h3 className="text-base font-bold text-gray-800">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-600 border border-gray-200 rounded hover:bg-gray-200"
            aria-label="Close"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>
        <div className="p-3 border-b border-gray-200 shrink-0">
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
              placeholder="Search by PO number, supplier, amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 min-h-0">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              {orders.length === 0 ? emptyMessage : "No orders match your search."}
            </div>
          ) : (
            <ul className="space-y-1">
              {filteredOrders.map((order) => {
                const isSelected = order.orderNumber === selectedOrderNumber;
                return (
                  <li key={order.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(order.orderNumber);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between gap-2 p-3 rounded-lg border text-left transition-colors ${
                        isSelected
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 truncate">
                          {order.orderNumber}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {order.supplier} · ₹{order.totalAmount?.toLocaleString() ?? "—"}
                        </div>
                      </div>
                      {isSelected && (
                        <i className="ri-check-line text-purple-600 text-lg shrink-0" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderSelectDrawer;
