"use client";

import React from "react";
import type { ProductionOrder } from "@/shared/services/productionService";

type Row = { article: string; kind: "in" | "out"; styleCode: string; brand: string; qty: number };

/** Per-order warehouse receivedData (in) + transferredData (out) by article / style / brand. */
export default function WarehouseOrderBreakdownCell({ order }: { order: ProductionOrder }) {
  const rows: Row[] = [];
  for (const a of order.articles) {
    const w = a.floorQuantities?.warehouse;
    if (!w) continue;
    const an = a.articleNumber?.trim() || "—";
    for (const r of w.receivedData ?? []) {
      rows.push({
        article: an,
        kind: "in",
        styleCode: (r.styleCode ?? "").trim() || "—",
        brand: (r.brand ?? "").trim() || "—",
        qty: r.transferred ?? 0,
      });
    }
    for (const r of w.transferredData ?? []) {
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
    return <span className="text-xs text-gray-400">—</span>;
  }
  return (
    <div className="max-w-[320px] overflow-x-auto">
      <table className="text-[10px] border-collapse w-full border border-gray-200">
        <thead>
          <tr className="bg-slate-50">
            <th className="border border-gray-200 px-1 py-0.5 text-right font-bold text-gray-800">Qty</th>
            <th className="border border-gray-200 px-1 py-0.5 text-left font-semibold text-gray-700">Style</th>
            <th className="border border-gray-200 px-1 py-0.5 text-left font-semibold text-gray-700">Brand</th>
            <th className="border border-gray-200 px-1 py-0.5 text-left font-semibold text-gray-500">Dir</th>
            <th className="border border-gray-200 px-1 py-0.5 text-left font-normal text-gray-400">Art</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={r.kind === "out" ? "bg-emerald-50/50" : ""}>
              <td
                className={`border border-gray-200 px-1 py-0.5 text-right font-bold tabular-nums ${
                  r.kind === "out" ? "text-emerald-800" : "text-teal-800"
                }`}
              >
                {r.qty}
              </td>
              <td className="border border-gray-200 px-1 py-0.5 max-w-[72px] truncate font-semibold text-gray-900" title={r.styleCode}>
                {r.styleCode}
              </td>
              <td className="border border-gray-200 px-1 py-0.5 max-w-[64px] truncate font-medium text-gray-800" title={r.brand}>
                {r.brand}
              </td>
              <td className="border border-gray-200 px-1 py-0.5">
                {r.kind === "in" ? <span className="text-sky-700 font-semibold">In</span> : <span className="text-emerald-800 font-semibold">Out</span>}
              </td>
              <td className="border border-gray-200 px-1 py-0.5 text-gray-400 truncate max-w-[56px]" title={r.article}>
                {r.article}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
