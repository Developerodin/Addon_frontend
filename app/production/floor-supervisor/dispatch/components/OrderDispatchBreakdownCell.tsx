"use client";

import React from "react";
import type { ProductionOrder } from "@/shared/services/productionService";
import {
  collapseLinesByBrand,
  formatProductBrandsList,
} from "@/shared/utils/brandTransfer.util";

type BreakdownRow = {
  article: string;
  kind: "in" | "out";
  brand: string;
  qty: number;
  fromCatalog?: boolean;
};

/**
 * Compact per-order table: dispatch receivedData (in) and transferredData (out) by article, brand, qty.
 * Falls back to product catalog brands when received lines have no brand breakdown.
 */
export default function OrderDispatchBreakdownCell({
  order,
  productBrandsByArticleId,
}: {
  order: ProductionOrder;
  productBrandsByArticleId?: Record<string, string[]>;
}) {
  const rows: BreakdownRow[] = [];
  for (const a of order.articles) {
    const d = a.floorQuantities?.dispatch;
    if (!d) continue;
    const an = a.articleNumber?.trim() || "—";
    const articleId = a.id ?? a._id ?? "";
    const rd = d.receivedData ?? [];
    const rdCollapsed = collapseLinesByBrand(rd);
    if (rdCollapsed.length > 0) {
      for (const line of rdCollapsed) {
        rows.push({ article: an, kind: "in", brand: line.brand ?? "—", qty: line.transferred ?? 0 });
      }
    } else {
      const catalogBrands = productBrandsByArticleId?.[articleId];
      if ((d.received ?? 0) > 0 && catalogBrands?.length) {
        rows.push({
          article: an,
          kind: "in",
          brand: formatProductBrandsList(catalogBrands),
          qty: d.received ?? 0,
          fromCatalog: true,
        });
      }
    }
    const td = d.transferredData ?? [];
    for (const line of collapseLinesByBrand(td)) {
      rows.push({ article: an, kind: "out", brand: line.brand ?? "—", qty: line.transferred ?? 0 });
    }
  }

  if (rows.length === 0) {
    return <span className="text-[10px] text-gray-400">—</span>;
  }

  return (
    <div className="max-w-[280px] overflow-x-auto">
      <table className="text-[9px] border-collapse w-full border border-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-200 px-1 py-0.5 text-left font-bold text-gray-600">Art</th>
            <th className="border border-gray-200 px-1 py-0.5 text-left font-bold text-gray-600">Dir</th>
            <th className="border border-gray-200 px-1 py-0.5 text-left font-bold text-gray-600">Brand</th>
            <th className="border border-gray-200 px-1 py-0.5 text-right font-bold text-gray-600">Qty</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={r.kind === "out" ? "bg-teal-50/50" : r.fromCatalog ? "bg-indigo-50/40" : "bg-white"}>
              <td className="border border-gray-200 px-1 py-0.5 font-medium text-gray-800 whitespace-nowrap">{r.article}</td>
              <td className="border border-gray-200 px-1 py-0.5 whitespace-nowrap">
                {r.kind === "in" ? (
                  <span className={`font-semibold ${r.fromCatalog ? "text-indigo-700" : "text-sky-700"}`}>
                    {r.fromCatalog ? "Cat" : "In"}
                  </span>
                ) : (
                  <span className="text-teal-800 font-semibold">Out</span>
                )}
              </td>
              <td className="border border-gray-200 px-1 py-0.5 max-w-[90px] truncate" title={r.brand}>
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
