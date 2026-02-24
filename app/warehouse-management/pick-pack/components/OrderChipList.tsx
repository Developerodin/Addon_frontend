"use client";

import React from "react";

export default function OrderChipList({
  orderIds,
  max = 3,
  onClickOrderId,
  className = "",
}: {
  orderIds: string[];
  max?: number;
  onClickOrderId?: (orderId: string) => void;
  className?: string;
}) {
  const shown = orderIds.slice(0, max);
  const remaining = orderIds.length - shown.length;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {shown.map((orderId) => (
        <button
          key={orderId}
          type="button"
          onClick={() => onClickOrderId?.(orderId)}
          className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors ${
            onClickOrderId ? "cursor-pointer" : "cursor-default"
          }`}
        >
          {orderId}
        </button>
      ))}
      {remaining > 0 ? (
        <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold border border-gray-200 bg-gray-50 text-gray-700">
          +{remaining}
        </span>
      ) : null}
    </div>
  );
}

