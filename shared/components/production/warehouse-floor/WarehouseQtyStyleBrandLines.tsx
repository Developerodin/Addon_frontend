"use client";

import React from "react";

export type QtyStyleBrandLine = { transferred?: number; styleCode?: string; brand?: string };

/** Lines with quantity > 0 (warehouse receivedData uses `transferred` per line for qty). */
export function filterLinesWithQty(data: QtyStyleBrandLine[] | undefined): QtyStyleBrandLine[] {
  return (data ?? []).filter((d) => (d.transferred ?? 0) > 0);
}

type Tone = "received" | "transferred";

const toneClasses: Record<Tone, { border: string; bg: string; qty: string }> = {
  received: {
    border: "border-teal-200/90",
    bg: "bg-teal-50/60",
    qty: "text-teal-800",
  },
  transferred: {
    border: "border-emerald-200/90",
    bg: "bg-emerald-50/50",
    qty: "text-emerald-800",
  },
};

/**
 * Quantity + brand line rows for warehouse received/transferred data.
 * `variant="table"` — compact row strip for dense tables. `variant="panel"` — modals / detail.
 */
export default function WarehouseQtyStyleBrandLines({
  lines,
  tone = "received",
  variant = "table",
  className = "",
}: {
  lines: QtyStyleBrandLine[] | undefined;
  tone?: Tone;
  variant?: "table" | "panel";
  className?: string;
}) {
  const filtered = filterLinesWithQty(lines);
  const t = toneClasses[tone];

  if (filtered.length === 0) {
    return <span className={`text-gray-400 text-[10px] ${className}`}>—</span>;
  }

  if (variant === "table") {
    return (
      <div className={`space-y-1.5 min-w-[120px] max-w-[180px] ${className}`}>
        {filtered.map((d, i) => (
          <div key={i} className={`rounded border ${t.border} ${t.bg} px-2 py-1`}>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className={`text-sm font-bold tabular-nums leading-none ${t.qty}`}>
                {(d.transferred ?? 0).toLocaleString()}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wide text-gray-500">Brand</span>
              <span className="text-[11px] font-medium text-gray-800 truncate max-w-[120px]" title={(d.brand ?? "").trim() || undefined}>
                {(d.brand ?? "—").trim() || "—"}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {filtered.map((d, i) => (
        <div key={i} className={`rounded-md border ${t.border} ${t.bg} px-2.5 py-2`}>
          <div className="flex flex-wrap items-start gap-x-4 gap-y-1">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-wide text-gray-500">Qty</span>
              <span className={`text-xl font-bold tabular-nums leading-tight ${t.qty}`}>
                {(d.transferred ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[9px] font-bold uppercase tracking-wide text-gray-500">Brand</span>
              <div className="text-sm font-medium text-gray-800 break-words">{(d.brand ?? "—").trim() || "—"}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
