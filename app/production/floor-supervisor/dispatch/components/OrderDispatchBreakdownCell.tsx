"use client";

import React from "react";
import type { ProductionOrder } from "@/shared/services/productionService";

type BreakdownRow = {
  article: string;
  kind: "in" | "out";
  styleCode: string;
  brand: string;
  qty: number;
};

/**
 * Compact per-order table: dispatch receivedData (in) and transferredData (out) by article, style, brand, qty.
 */
export default function OrderDispatchBreakdownCell({ order }: { order: ProductionOrder }) {
  const rows: BreakdownRow[] = [];
  for (const a of order.articles) {
    const d = a.floorQuantities?.dispatch;
    if (!d) continue;
    const an = a.articleNumber?.trim() || "—";
    const rd = d.receivedData ?? [];
    for (const r of rd) {
      rows.push({
        article: an,
        kind: "in",
        styleCode: (r.styleCode ?? "").trim() || "—",
        brand: (r.brand ?? "").trim() || "—",
        qty: r.transferred ?? 0,
      });
    }
    const td = d.transferredData ?? [];
    for (const r of td) {
      rows.push({
        article: an,
        kind: "out",
        styleCode: (r.styleCode ?? "").trim() || "—",
        brand: (r.brand ?? "").trim() || "—",
        qty: r.transferred ?? 0,
      });
    }
  }

  if (rows.length === 0) {
    return <span className="text-[10px] text-gray-400">—</span>;
  }

  return (
    <div className="max-w-[320px] overflow-x-auto">
      <table className="text-[9px] border-collapse w-full border border-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-200 px-1 py-0.5 text-left font-bold text-gray-600">Art</th>
            <th className="border border-gray-200 px-1 py-0.5 text-left font-bold text-gray-600">Dir</th>
            <th className="border border-gray-200 px-1 py-0.5 text-left font-bold text-gray-600">Style</th>
            <th className="border border-gray-200 px-1 py-0.5 text-left font-bold text-gray-600">Brand</th>
            <th className="border border-gray-200 px-1 py-0.5 text-right font-bold text-gray-600">Qty</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={r.kind === "out" ? "bg-teal-50/50" : "bg-white"}>
              <td className="border border-gray-200 px-1 py-0.5 font-medium text-gray-800 whitespace-nowrap">{r.article}</td>
              <td className="border border-gray-200 px-1 py-0.5 whitespace-nowrap">
                {r.kind === "in" ? <span className="text-sky-700 font-semibold">In</span> : <span className="text-teal-800 font-semibold">Out</span>}
              </td>
              <td className="border border-gray-200 px-1 py-0.5 max-w-[72px] truncate" title={r.styleCode}>
                {r.styleCode}
              </td>
              <td className="border border-gray-200 px-1 py-0.5 max-w-[64px] truncate" title={r.brand}>
                {r.brand}
              </td>
              <td className="border border-gray-200 px-1 py-0.5 text-right font-semibold tabular-nums">{r.qty}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
