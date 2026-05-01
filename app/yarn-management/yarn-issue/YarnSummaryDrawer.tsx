"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  getYarnIssuePendingSummary,
  type YarnIssuePendingSummary,
} from "@/shared/services/machineOrderAssignmentService";

/**
 * Format a mass stored in grams as kg for display (matches yarn-issue page).
 * @param valueInGrams — value in grams
 */
function formatKgDisplay(valueInGrams: number): string {
  const valueInKg = valueInGrams / 1000;
  const formatted = valueInKg.toFixed(2);
  const trimmed = formatted.replace(/\.?0+$/, "");
  const parts = trimmed.split(".");
  if (parts.length === 1) {
    return `${trimmed}.00 kg`;
  }
  if (parts[1].length === 1) {
    return `${trimmed}0 kg`;
  }
  return `${trimmed} kg`;
}

type TabId = "yarn" | "order";

export interface YarnSummaryDrawerProps {
  /** When true, panel is visible and data is (re)loaded. */
  open: boolean;
  /** Called when user closes the drawer (backdrop or close control). */
  onClose: () => void;
}

/**
 * Right-side drawer: total outstanding yarn required across all PO queue lines
 * where yarn issue is not marked Completed (BOM requirement minus issued weight).
 */
const YarnSummaryDrawer: React.FC<YarnSummaryDrawerProps> = ({ open, onClose }) => {
  const [tab, setTab] = useState<TabId>("yarn");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<YarnIssuePendingSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const summary = await getYarnIssuePendingSummary();
      setData(summary);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to load yarn summary");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  if (!open) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="yarn-summary-drawer-title"
      >
        <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3 bg-gray-50/80">
          <div className="min-w-0">
            <h2 id="yarn-summary-drawer-title" className="text-sm font-bold text-gray-900 truncate">
              Yarn summary (pending issue)
            </h2>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Queue rows without completed yarn issue · outstanding = BOM required − issued · ST stock = available cones on
              short-term racks (same logic as live inventory)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 inline-flex items-center justify-center rounded-md p-1.5 text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close yarn summary"
          >
            <i className="ri-close-line text-xl leading-none" />
          </button>
        </div>

        <div className="px-4 py-2 border-b border-gray-100 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setTab("yarn")}
            className={`px-3 py-1.5 text-[11px] font-bold rounded border transition-colors ${
              tab === "yarn"
                ? "border-purple-500 bg-purple-50 text-purple-800"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
            aria-pressed={tab === "yarn"}
          >
            By yarn
          </button>
          <button
            type="button"
            onClick={() => setTab("order")}
            className={`px-3 py-1.5 text-[11px] font-bold rounded border transition-colors ${
              tab === "order"
                ? "border-purple-500 bg-purple-50 text-purple-800"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
            aria-pressed={tab === "order"}
          >
            By order
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="ml-auto px-2 py-1.5 text-[11px] font-semibold text-purple-700 hover:bg-purple-50 rounded border border-transparent disabled:opacity-50"
            aria-label="Refresh summary"
          >
            <i className={`ri-refresh-line ${loading ? "animate-spin inline-block" : ""}`} /> Refresh
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-auto px-4 py-3">
          {loading && !data ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500 text-[11px]">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent mb-2" />
              Loading summary…
            </div>
          ) : data && data.byYarn.length === 0 && data.byOrder.length === 0 ? (
            <div className="text-center py-12 text-[11px] text-gray-500">
              <i className="ri-checkbox-circle-line text-3xl text-green-400 mb-2 block" aria-hidden />
              No outstanding yarn for pending queue lines, or no BOM data linked.
              {data.pendingLineCount > 0 && (
                <p className="mt-2 text-[10px] text-gray-400">
                  {data.pendingLineCount} queue line(s); check skipped articles below if BOMs are missing.
                </p>
              )}
            </div>
          ) : data && tab === "yarn" ? (
            <div className="overflow-x-auto border border-gray-200 rounded-md">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-left text-gray-700">
                    <th className="px-2 py-2 font-bold border-b border-gray-200">Yarn</th>
                    <th className="px-2 py-2 font-bold border-b border-gray-200 text-right">Outstanding</th>
                    <th className="px-2 py-2 font-bold border-b border-gray-200 text-right hidden sm:table-cell">Required</th>
                    <th className="px-2 py-2 font-bold border-b border-gray-200 text-right hidden sm:table-cell">Issued</th>
                    <th
                      className="px-2 py-2 font-bold border-b border-gray-200 text-right"
                      title="Available cones on short-term (ST) racks — net weight (per yarn, warehouse-wide)"
                    >
                      ST stock
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.byYarn.map((row) => (
                    <tr key={row.yarnKey} className="border-b border-gray-100 hover:bg-gray-50/80">
                      <td className="px-2 py-2 align-top">
                        <div className="font-semibold text-gray-900">{row.yarnName}</div>
                        {row.yarnType && <div className="text-[10px] text-gray-500">{row.yarnType}</div>}
                      </td>
                      <td className="px-2 py-2 text-right font-bold text-purple-700 tabular-nums whitespace-nowrap">
                        {formatKgDisplay(row.totalOutstandingGrams)}
                      </td>
                      <td className="px-2 py-2 text-right text-gray-700 tabular-nums whitespace-nowrap hidden sm:table-cell">
                        {formatKgDisplay(row.totalRequiredGrams)}
                      </td>
                      <td className="px-2 py-2 text-right text-gray-600 tabular-nums whitespace-nowrap hidden sm:table-cell">
                        {formatKgDisplay(row.totalIssuedGrams)}
                      </td>
                      <td
                        className="px-2 py-2 text-right text-emerald-800 tabular-nums whitespace-nowrap"
                        title={
                          row.shortTermConeCount > 0
                            ? `${row.shortTermConeCount} cone(s) on ST racks (net)`
                            : "No available cones on ST racks for this yarn"
                        }
                      >
                        {formatKgDisplay(row.shortTermNetGrams ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : data && tab === "order" ? (
            <div className="space-y-4">
              {data.byOrder.map((ord) => (
                <div key={ord.orderId} className="border border-gray-200 rounded-md overflow-hidden">
                  <div className="px-2 py-1.5 bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-800">
                    {ord.orderNumber || ord.orderId}
                  </div>
                  <table className="w-full text-[10px] border-collapse">
                    <thead>
                      <tr className="bg-white text-left text-gray-600">
                        <th className="px-2 py-1 font-semibold">Article</th>
                        <th className="px-2 py-1 font-semibold">Yarn</th>
                        <th className="px-2 py-1 font-semibold text-right">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ord.lines.map((ln, idx) => (
                        <tr key={`${ord.orderId}-${ln.articleNumber}-${ln.yarnName}-${idx}`} className="border-t border-gray-100">
                          <td className="px-2 py-1.5 text-gray-800 whitespace-nowrap">{ln.articleNumber}</td>
                          <td className="px-2 py-1.5 text-gray-700">{ln.yarnName}</td>
                          <td className="px-2 py-1.5 text-right font-semibold text-purple-700 tabular-nums whitespace-nowrap">
                            {formatKgDisplay(ln.outstandingGrams)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ) : null}

          {data && data.skippedArticles.length > 0 && (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50/60 p-3 text-[10px] text-amber-900">
              <p className="font-bold mb-1">Skipped articles (no BOM)</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {data.skippedArticles.slice(0, 20).map((s, i) => (
                  <li key={`${s.orderNumber}-${s.articleNumber}-${i}`}>
                    Order {s.orderNumber} · {s.articleNumber}: {s.reason}
                  </li>
                ))}
              </ul>
              {data.skippedArticles.length > 20 && (
                <p className="mt-1 text-amber-800">+{data.skippedArticles.length - 20} more…</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default YarnSummaryDrawer;
