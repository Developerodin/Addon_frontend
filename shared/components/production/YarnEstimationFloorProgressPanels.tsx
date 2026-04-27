"use client";

import React from "react";
import type { FloorProgress, OrderFloorProgress } from "@/shared/services/yarnEstimationService";
import {
  batchWeightFromKnitting,
  linkingFloorActive,
  plannedQtyForDisplay,
  knittingCompletedForDisplay,
} from "./yarnEstimationFloorProgressUtils";

const fmt = (n?: number) => (n != null ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—");

/** Per-article floor progress: planned qty, knitting completed, batch weight (from knitting). */
export const ArticleFloorStrip: React.FC<{
  plannedQuantity: number;
  floorProgress?: FloorProgress | null;
}> = ({ plannedQuantity, floorProgress: fp }) => {
  if (!fp) {
    return (
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-gray-400">
        <span>Planned —</span>
        <span>Knitting completed —</span>
        <span>Batch wt —</span>
      </div>
    );
  }
  const autoLinkOnly = !linkingFloorActive(fp);
  const planned = plannedQtyForDisplay(fp, plannedQuantity);
  const completed = knittingCompletedForDisplay(fp);
  const bw = batchWeightFromKnitting(fp);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px]">
      <span>
        <span className="text-gray-500">Planned</span>{" "}
        <span className="font-semibold text-gray-900 tabular-nums">{planned.toLocaleString()}</span>
      </span>
      <span title="floorProgress.knitting.completed">
        <span className="text-gray-500">Knitting completed</span>{" "}
        <span className="font-semibold tabular-nums text-violet-800">
          {completed != null ? completed.toLocaleString() : "—"}
        </span>
      </span>
      <span title="Weight (from knitting)">
        <span className="text-gray-500">Batch wt</span>{" "}
        <span className="font-semibold tabular-nums">{bw != null ? `${fmt(bw)} kg` : "—"}</span>
      </span>
      {autoLinkOnly && (
        <span
          className="text-[9px] text-amber-800 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded"
          title="Auto linking — no separate linking floor"
        >
          Auto linking
        </span>
      )}
    </div>
  );
};

export const OrderFloorProgressSummary: React.FC<{ orderFloorProgress: OrderFloorProgress }> = ({
  orderFloorProgress: o,
}) => (
  <div className="px-[10px] pb-2">
    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Floor progress (order)</div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <div className="bg-slate-50 border border-slate-200 rounded p-2">
        <div className="text-[9px] font-bold text-slate-600 uppercase">Planned qty</div>
        <div className="text-sm font-bold text-slate-900 tabular-nums">{o.plannedQuantityTotal.toLocaleString()}</div>
      </div>
      <div className="bg-violet-50/80 border border-violet-100 rounded p-2">
        <div className="text-[9px] font-bold text-violet-700 uppercase">Knitting completed</div>
        <div className="text-sm font-bold text-violet-900 tabular-nums">{o.knittingCompletedTotal.toLocaleString()}</div>
      </div>
      <div className="bg-amber-50/80 border border-amber-100 rounded p-2">
        <div className="text-[9px] font-bold text-amber-800 uppercase">Batch weight (knitting)</div>
        <div className="text-sm font-bold text-amber-900 tabular-nums">{fmt(o.knittingBatchWeightTotal)} kg</div>
      </div>
    </div>
  </div>
);
