"use client";

import React from "react";
import {
  WarehouseOrderFlowHistoryEntry,
  warehouseOrderFlowStatusLabel,
} from "@/shared/services/whmsWarehouseOrderService";

export interface WhmsFlowTimelineProps {
  history: WarehouseOrderFlowHistoryEntry[];
  maxHeight?: string;
}

/**
 * Vertical timeline of warehouse order flow stage transitions.
 */
export default function WhmsFlowTimeline({ history, maxHeight = "max-h-64" }: WhmsFlowTimelineProps) {
  if (!history.length) {
    return <p className="text-[12px] text-gray-400">No stage changes recorded yet.</p>;
  }

  return (
    <ul className={`space-y-2 overflow-y-auto ${maxHeight}`} aria-label="Order flow history">
      {[...history].reverse().map((h, i) => (
        <li key={`${h.at}-${h.to}-${i}`} className="text-[12px] text-gray-700 flex flex-wrap gap-x-2 border-l-2 border-violet-200 pl-3 py-1">
          <span className="text-gray-400 whitespace-nowrap text-[11px]">
            {h.at ? new Date(h.at).toLocaleString() : "—"}
          </span>
          <span>
            <b>{warehouseOrderFlowStatusLabel(h.from)}</b>
            {" → "}
            <b>{warehouseOrderFlowStatusLabel(h.to)}</b>
          </span>
          {h.byName ? <span className="text-gray-500">by {h.byName}</span> : null}
          {h.remarks ? <span className="text-gray-500 italic w-full">“{h.remarks}”</span> : null}
        </li>
      ))}
    </ul>
  );
}
