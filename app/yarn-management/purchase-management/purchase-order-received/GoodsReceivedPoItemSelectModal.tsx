"use client";

import React, { useEffect, useMemo, useState } from "react";

export interface GoodsReceivedPoLineItem {
  id: string;
  yarnName: string;
  sizeCount: string;
  shadeCode: string;
  quantity: number;
}

interface GoodsReceivedPoItemSelectModalProps {
  isOpen: boolean;
  items: GoodsReceivedPoLineItem[];
  selectedItemId?: string;
  onClose: () => void;
  onSelect: (itemId: string) => void;
}

/**
 * Modal picker for choosing a PO line item in the goods received drawer.
 */
export function GoodsReceivedPoItemSelectModal({
  isOpen,
  items,
  selectedItemId,
  onClose,
  onSelect,
}: GoodsReceivedPoItemSelectModalProps) {
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setSearchInput("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const filteredItems = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const haystack = `${item.yarnName} ${item.sizeCount} ${item.shadeCode} ${item.quantity}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [items, searchInput]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10050] overflow-y-auto"
      aria-modal="true"
      role="dialog"
      aria-labelledby="gr-po-item-select-title"
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <button
          type="button"
          className="fixed inset-0 bg-black/50 transition-opacity"
          aria-label="Close PO item picker"
          onClick={onClose}
        />
        <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h3 id="gr-po-item-select-title" className="text-sm font-semibold text-gray-900">
              Select PO Item
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1.5 text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <i className="ri-close-line text-xl" aria-hidden />
            </button>
          </div>

          <div className="border-b border-gray-100 p-4">
            <div className="relative">
              <i
                className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400"
                aria-hidden
              />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by yarn, size, shade..."
                className="form-control w-full rounded border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-purple-300 focus:ring-0"
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {filteredItems.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500">No PO items match your search.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200 text-left">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th className="border border-gray-200 px-3 py-2.5 text-[11px] font-bold uppercase text-gray-600">
                        Yarn Name
                      </th>
                      <th className="border border-gray-200 px-3 py-2.5 text-[11px] font-bold uppercase text-gray-600">
                        Size / Count
                      </th>
                      <th className="border border-gray-200 px-3 py-2.5 text-[11px] font-bold uppercase text-gray-600">
                        Shade
                      </th>
                      <th className="border border-gray-200 px-3 py-2.5 text-[11px] font-bold uppercase text-gray-600">
                        Qty
                      </th>
                      <th className="border border-gray-200 px-3 py-2.5 text-right text-[11px] font-bold uppercase text-gray-600">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      const isSelected = selectedItemId && String(selectedItemId) === String(item.id);
                      return (
                        <tr
                          key={item.id}
                          className={isSelected ? "bg-purple-50/70" : "hover:bg-gray-50/80"}
                        >
                          <td className="border border-gray-200 px-3 py-2.5 text-sm text-gray-900">
                            {item.yarnName}
                          </td>
                          <td className="border border-gray-200 px-3 py-2.5 text-sm text-gray-700">
                            {item.sizeCount}
                          </td>
                          <td className="border border-gray-200 px-3 py-2.5 text-sm text-gray-700">
                            {item.shadeCode}
                          </td>
                          <td className="border border-gray-200 px-3 py-2.5 text-sm text-gray-700">
                            {item.quantity}
                          </td>
                          <td className="border border-gray-200 px-3 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                onSelect(item.id);
                                onClose();
                              }}
                              className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
                                isSelected
                                  ? "bg-purple-600 text-white hover:bg-purple-700"
                                  : "border border-purple-200 bg-white text-purple-700 hover:bg-purple-50"
                              }`}
                            >
                              {isSelected ? "Selected" : "Select"}
                            </button>
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
  );
}
