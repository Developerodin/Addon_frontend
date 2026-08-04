"use client";

import React, { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import type { M3ArticleRow, M3Snapshot } from "@/shared/services/productionService";
import { ArticleViewOrderCell } from "@/shared/components/production/ArticleViewOrderCell";
import DownloadExcelButton from "@/shared/components/production/DownloadExcelButton";
import { datedExportFilename, downloadCsv } from "@/shared/utils/csvExport";

export interface OrdersViewTabProps {
  rows: M3ArticleRow[];
  isLoading?: boolean;
  onView: (row: M3ArticleRow) => void;
  onOutward: (row: M3ArticleRow) => void;
}

interface M3OrderGroup {
  orderId: string;
  orderNumber: string;
  orderNote?: string;
  articles: M3ArticleRow[];
  totals: M3Snapshot;
}

/**
 * Sum M3 snapshots across articles in an order (checking floors only).
 * @param articles
 * @returns {M3Snapshot}
 */
function sumSnapshots(articles: M3ArticleRow[]): M3Snapshot {
  const byFloor = { checking: 0, secondaryChecking: 0, finalChecking: 0 };
  let onHand = 0;
  let outwardTotal = 0;
  let availableForOutward = 0;

  for (const a of articles) {
    const s = a.m3Snapshot;
    byFloor.checking += s.byFloor.checking;
    byFloor.secondaryChecking += s.byFloor.secondaryChecking;
    byFloor.finalChecking += s.byFloor.finalChecking;
    onHand += s.onHand;
    outwardTotal += s.outwardTotal;
    availableForOutward += s.availableForOutward;
  }

  return { byFloor, onHand, outwardTotal, availableForOutward };
}

/**
 * Orders tab — per-order grouping with per-floor M3 breakdown (checking floors only).
 */
export default function OrdersViewTab({
  rows,
  isLoading = false,
  onView,
  onOutward,
}: OrdersViewTabProps) {
  const [search, setSearch] = useState("");
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const orderGroups = useMemo((): M3OrderGroup[] => {
    const map = new Map<string, M3OrderGroup>();

    for (const row of rows) {
      const oid = String(row.orderId);
      if (!map.has(oid)) {
        map.set(oid, {
          orderId: oid,
          orderNumber: row.orderNumber,
          orderNote: row.orderNote,
          articles: [],
          totals: {
            byFloor: { checking: 0, secondaryChecking: 0, finalChecking: 0 },
            onHand: 0,
            outwardTotal: 0,
            availableForOutward: 0,
          },
        });
      }
      map.get(oid)!.articles.push(row);
    }

    return Array.from(map.values())
      .map((g) => ({ ...g, totals: sumSnapshots(g.articles) }))
      .sort((a, b) => a.orderNumber.localeCompare(b.orderNumber));
  }, [rows]);

  const filtered = useMemo(() => {
    if (!search.trim()) return orderGroups;
    const q = search.trim().toLowerCase();
    return orderGroups.filter(
      (g) =>
        g.orderNumber.toLowerCase().includes(q) ||
        (g.orderNote ?? "").toLowerCase().includes(q) ||
        g.articles.some((a) => a.articleNumber.toLowerCase().includes(q))
    );
  }, [orderGroups, search]);

  const toggleOrder = (orderId: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  /** Export filtered M3 order/article rows (flat per-article) as CSV. */
  const handleExportExcel = () => {
    const exportRows = filtered.flatMap((group) =>
      group.articles.map((row) => ({ group, row }))
    );

    if (exportRows.length === 0) {
      toast.error("No M3 orders to export");
      return;
    }

    const header = [
      "Order",
      "Order Note",
      "Article",
      "Checking M3",
      "Secondary Checking M3",
      "Final Checking M3",
      "On Hand",
      "Outward",
      "Available",
    ];
    const lines = exportRows.map(({ group, row }) => {
      const s = row.m3Snapshot;
      return [
        group.orderNumber,
        group.orderNote || "",
        row.articleNumber,
        s.byFloor.checking,
        s.byFloor.secondaryChecking,
        s.byFloor.finalChecking,
        s.onHand,
        s.outwardTotal,
        s.availableForOutward,
      ];
    });

    downloadCsv(datedExportFilename("m3-orders"), [header, ...lines]);
    toast.success(`Exported ${exportRows.length} M3 ${exportRows.length === 1 ? "row" : "rows"}`);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order or article…"
          className="w-full max-w-md py-1.5 px-2 text-[11px] border border-gray-300 rounded"
          aria-label="Search M3 orders"
        />
        <DownloadExcelButton
          onClick={handleExportExcel}
          disabled={filtered.length === 0}
          ariaLabel="Export filtered M3 orders to Excel"
        />
      </div>

      <div className="border border-gray-300 rounded overflow-hidden overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 text-[10px] min-w-[820px]">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-1 py-1 w-8" aria-label="Expand" />
              <th className="border border-gray-300 px-1 py-1 text-left">Order</th>
              <th className="border border-gray-300 px-1 py-1 text-left">Article</th>
              <th className="border border-gray-300 px-1 py-1 text-right bg-orange-50 text-orange-800">Chk M3</th>
              <th className="border border-gray-300 px-1 py-1 text-right bg-orange-50 text-orange-800">SC M3</th>
              <th className="border border-gray-300 px-1 py-1 text-right bg-orange-50 text-orange-800">FC M3</th>
              <th className="border border-gray-300 px-1 py-1 text-right">On hand</th>
              <th className="border border-gray-300 px-1 py-1 text-right">Outward</th>
              <th className="border border-gray-300 px-1 py-1 text-right">Available</th>
              <th className="border border-gray-300 px-1 py-1 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={10} className="border border-gray-300 px-2 py-6 text-center text-gray-500">Loading…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="border border-gray-300 px-2 py-6 text-center text-gray-500">
                  No orders with M3 activity
                </td>
              </tr>
            ) : (
              filtered.map((group) => {
                const expanded = expandedOrders.has(group.orderId);
                const t = group.totals;

                return (
                  <React.Fragment key={group.orderId}>
                    <tr
                      className="bg-gray-50 hover:bg-gray-100 cursor-pointer font-semibold"
                      onClick={() => toggleOrder(group.orderId)}
                    >
                      <td className="border border-gray-300 px-1 py-1 text-center">
                        <span aria-hidden="true">{expanded ? "▼" : "▶"}</span>
                      </td>
                      <td className="border border-gray-300 px-1 py-1" colSpan={2}>
                        <ArticleViewOrderCell
                          order={{ id: group.orderId, orderNumber: group.orderNumber, orderNote: group.orderNote }}
                        />
                        <span className="text-[9px] text-gray-500 ml-1">
                          ({group.articles.length} article{group.articles.length !== 1 ? "s" : ""})
                        </span>
                      </td>
                      <td className="border border-gray-300 px-1 py-1 text-right bg-orange-50/60">{t.byFloor.checking}</td>
                      <td className="border border-gray-300 px-1 py-1 text-right bg-orange-50/60">{t.byFloor.secondaryChecking}</td>
                      <td className="border border-gray-300 px-1 py-1 text-right bg-orange-50/60">{t.byFloor.finalChecking}</td>
                      <td className="border border-gray-300 px-1 py-1 text-right">{t.onHand}</td>
                      <td className="border border-gray-300 px-1 py-1 text-right text-orange-700">{t.outwardTotal}</td>
                      <td className="border border-gray-300 px-1 py-1 text-right text-orange-800">{t.availableForOutward}</td>
                      <td className="border border-gray-300 px-1 py-1" />
                    </tr>

                    {expanded &&
                      group.articles.map((row) => {
                        const s = row.m3Snapshot;
                        return (
                          <tr key={row._id ?? row.id} className="hover:bg-gray-50/50">
                            <td className="border border-gray-300 px-1 py-1" />
                            <td className="border border-gray-300 px-1 py-1 text-gray-400 text-[9px] pl-3">{group.orderNumber}</td>
                            <td className="border border-gray-300 px-1 py-1 font-medium pl-2">{row.articleNumber}</td>
                            <td className="border border-gray-300 px-1 py-1 text-right bg-orange-50/30">{s.byFloor.checking}</td>
                            <td className="border border-gray-300 px-1 py-1 text-right bg-orange-50/30">{s.byFloor.secondaryChecking}</td>
                            <td className="border border-gray-300 px-1 py-1 text-right bg-orange-50/30">{s.byFloor.finalChecking}</td>
                            <td className="border border-gray-300 px-1 py-1 text-right">{s.onHand}</td>
                            <td className="border border-gray-300 px-1 py-1 text-right text-orange-700">{s.outwardTotal}</td>
                            <td className="border border-gray-300 px-1 py-1 text-right text-orange-800 font-bold">{s.availableForOutward}</td>
                            <td className="border border-gray-300 px-1 py-1 text-center">
                              <div className="flex justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <button type="button" onClick={() => onView(row)} className="px-1.5 py-0.5 text-[9px] font-bold border border-gray-300 rounded hover:bg-gray-100">View</button>
                                <button type="button" disabled={s.availableForOutward <= 0} onClick={() => onOutward(row)} className="px-1.5 py-0.5 text-[9px] font-bold border border-orange-300 text-orange-800 rounded hover:bg-orange-50 disabled:opacity-40">Outward</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-gray-500 mt-2">
        M3 is tracked on Checking, Secondary Checking, and Final Checking only. Click an order to expand per-article floor breakdown.
      </p>
    </div>
  );
}
