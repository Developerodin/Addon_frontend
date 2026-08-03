"use client";

import React from "react";
import type { ScanSessionItem } from "@/shared/services/whmsFulfilmentService";

const itemRowClass = (status: string) => {
  switch (status) {
    case "matched":
      return "bg-green-50";
    case "short":
      return "bg-yellow-50";
    case "excess":
      return "bg-red-50";
    default:
      return "";
  }
};

const itemBadge = (status: string) => {
  switch (status) {
    case "matched":
      return (
        <span className="badge bg-green-100 text-green-700 text-[10px] font-semibold px-2 py-0.5 rounded">
          Matched
        </span>
      );
    case "short":
      return (
        <span className="badge bg-yellow-100 text-yellow-700 text-[10px] font-semibold px-2 py-0.5 rounded">
          Short
        </span>
      );
    case "excess":
      return (
        <span className="badge bg-red-100 text-red-700 text-[10px] font-semibold px-2 py-0.5 rounded">
          Excess
        </span>
      );
    default:
      return (
        <span className="badge bg-gray-100 text-gray-600 text-[10px] font-semibold px-2 py-0.5 rounded">
          Pending
        </span>
      );
  }
};

export interface ScanProgressTableProps {
  items: ScanSessionItem[];
  /** When set, renders a pair-style header row before child rows (multi-pair groups). */
  pairStyleCode?: string;
}

/**
 * Scan progress table — style code, EAN, expected/scanned counts, status.
 */
export default function ScanProgressTable({ items, pairStyleCode }: ScanProgressTableProps) {
  if (items.length === 0 && !pairStyleCode) return null;

  return (
    <table className="w-full border-collapse border border-gray-200">
      <thead>
        <tr className="bg-gray-50/30">
          <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">
            Style
          </th>
          <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">
            EAN
          </th>
          <th className="px-1.5 py-3 text-right text-[11px] font-bold uppercase border border-gray-200">
            Expected
          </th>
          <th className="px-1.5 py-3 text-right text-[11px] font-bold uppercase border border-gray-200">
            Scanned
          </th>
          <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">
            Status
          </th>
        </tr>
      </thead>
      <tbody>
        {pairStyleCode ? (
          <tr className="bg-violet-50/60">
            <td
              colSpan={5}
              className="px-1.5 py-2 text-[11px] font-bold text-violet-900 border border-gray-200 uppercase tracking-wide"
            >
              Pair style code: {pairStyleCode}
            </td>
          </tr>
        ) : null}
        {items.map((item) => {
          const scanned = Number(item.scannedQty || 0);
          const expected = Number(item.expectedQty || 0);
          const isExcess = scanned > expected;
          const ean = String(item.eanCode || "").trim() || "—";

          return (
            <tr
              key={item.id || item._id || `${item.styleCode}-${ean}`}
              className={itemRowClass(item.status)}
            >
              <td className="px-1.5 py-2.5 text-[12px] font-bold border border-gray-200">
                {item.styleCode}
              </td>
              <td className="px-1.5 py-2.5 text-[11px] font-medium text-gray-600 border border-gray-200 font-mono">
                {ean}
              </td>
              <td className="px-1.5 py-2.5 text-[12px] text-right border border-gray-200">
                {expected}
              </td>
              <td className="px-1.5 py-2.5 text-right border border-gray-200">
                <span
                  className={`inline-block min-w-[4rem] text-[12px] font-bold tabular-nums ${
                    isExcess
                      ? "text-red-700"
                      : scanned >= expected && expected > 0
                        ? "text-emerald-700"
                        : "text-gray-900"
                  }`}
                  aria-label={`Scanned ${scanned} of ${expected} for ${item.styleCode}`}
                >
                  {scanned}
                  <span className="text-gray-400 font-medium"> / {expected}</span>
                </span>
              </td>
              <td className="px-1.5 py-2.5 border border-gray-200">{itemBadge(item.status)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
