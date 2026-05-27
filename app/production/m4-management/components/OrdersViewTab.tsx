"use client";

import React, { useMemo, useState } from "react";
import type { M4ArticleRow, M4Snapshot } from "@/shared/services/productionService";
import { ArticleViewOrderCell } from "@/shared/components/production/ArticleViewOrderCell";

export interface OrdersViewTabProps {
  rows: M4ArticleRow[];
  isLoading?: boolean;
  onView: (row: M4ArticleRow) => void;
  onOutward: (row: M4ArticleRow) => void;
}

interface M4OrderGroup {
  orderId: string;
  orderNumber: string;
  orderNote?: string;
  articles: M4ArticleRow[];
  totals: M4Snapshot;
}

/**
 * Sum M4 snapshots across articles in an order.
 * @param articles
 * @returns {M4Snapshot}
 */
function sumSnapshots(articles: M4ArticleRow[]): M4Snapshot {
  const byFloor = { knitting: 0, checking: 0, secondaryChecking: 0, finalChecking: 0 };
  let onHand = 0;
  let outwardTotal = 0;
  let availableForOutward = 0;

  for (const a of articles) {
    const s = a.m4Snapshot;
    byFloor.knitting += s.byFloor.knitting;
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
 * Orders tab — per-order grouping with per-floor M4 breakdown per article.
 */
export default function OrdersViewTab({
  rows,
  isLoading = false,
  onView,
  onOutward,
}: OrdersViewTabProps) {
  const [search, setSearch] = useState("");
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const orderGroups = useMemo((): M4OrderGroup[] => {
    const map = new Map<string, M4OrderGroup>();

    for (const row of rows) {
      const oid = String(row.orderId);
      if (!map.has(oid)) {
        map.set(oid, {
          orderId: oid,
          orderNumber: row.orderNumber,
          orderNote: row.orderNote,
          articles: [],
          totals: {
            byFloor: { knitting: 0, checking: 0, secondaryChecking: 0, finalChecking: 0 },
            onHand: 0,
            outwardTotal: 0,
            availableForOutward: 0,
          },
        });
      }
      map.get(oid)!.articles.push(row);
    }

    const groups = Array.from(map.values()).map((g) => ({
      ...g,
      totals: sumSnapshots(g.articles),
    }));

    groups.sort((a, b) => a.orderNumber.localeCompare(b.orderNumber));
    return groups;
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

  return (
    <div>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search order or article…"
        className="w-full max-w-md py-1.5 px-2 text-[11px] border border-gray-300 rounded mb-3"
        aria-label="Search M4 orders"
      />

      <div className="border border-gray-300 rounded overflow-hidden overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 text-[10px] min-w-[960px]">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-1 py-1 w-8" aria-label="Expand" />
              <th className="border border-gray-300 px-1 py-1 text-left">Order</th>
              <th className="border border-gray-300 px-1 py-1 text-left">Article</th>
              <th className="border border-gray-300 px-1 py-1 text-right bg-red-50 text-red-800">Knit M4</th>
              <th className="border border-gray-300 px-1 py-1 text-right bg-red-50 text-red-800">Chk M4</th>
              <th className="border border-gray-300 px-1 py-1 text-right bg-red-50 text-red-800">SC M4</th>
              <th className="border border-gray-300 px-1 py-1 text-right bg-red-50 text-red-800">FC M4</th>
              <th className="border border-gray-300 px-1 py-1 text-right">On hand</th>
              <th className="border border-gray-300 px-1 py-1 text-right">Outward</th>
              <th className="border border-gray-300 px-1 py-1 text-right">Available</th>
              <th className="border border-gray-300 px-1 py-1 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={11} className="border border-gray-300 px-2 py-6 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="border border-gray-300 px-2 py-6 text-center text-gray-500">
                  No orders with M4 activity
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
                          order={{
                            id: group.orderId,
                            orderNumber: group.orderNumber,
                            orderNote: group.orderNote,
                          }}
                        />
                        <span className="text-[9px] text-gray-500 ml-1">
                          ({group.articles.length} article{group.articles.length !== 1 ? "s" : ""})
                        </span>
                      </td>
                      <td className="border border-gray-300 px-1 py-1 text-right bg-red-50/60">{t.byFloor.knitting}</td>
                      <td className="border border-gray-300 px-1 py-1 text-right bg-red-50/60">{t.byFloor.checking}</td>
                      <td className="border border-gray-300 px-1 py-1 text-right bg-red-50/60">{t.byFloor.secondaryChecking}</td>
                      <td className="border border-gray-300 px-1 py-1 text-right bg-red-50/60">{t.byFloor.finalChecking}</td>
                      <td className="border border-gray-300 px-1 py-1 text-right">{t.onHand}</td>
                      <td className="border border-gray-300 px-1 py-1 text-right text-orange-700">{t.outwardTotal}</td>
                      <td className="border border-gray-300 px-1 py-1 text-right text-red-800">{t.availableForOutward}</td>
                      <td className="border border-gray-300 px-1 py-1" />
                    </tr>

                    {expanded &&
                      group.articles.map((row) => {
                        const s = row.m4Snapshot;
                        return (
                          <tr key={row._id ?? row.id} className="hover:bg-gray-50/50">
                            <td className="border border-gray-300 px-1 py-1" />
                            <td className="border border-gray-300 px-1 py-1 text-gray-400 text-[9px] pl-3">
                              {group.orderNumber}
                            </td>
                            <td className="border border-gray-300 px-1 py-1 font-medium pl-2">{row.articleNumber}</td>
                            <td className="border border-gray-300 px-1 py-1 text-right bg-red-50/30">{s.byFloor.knitting}</td>
                            <td className="border border-gray-300 px-1 py-1 text-right bg-red-50/30">{s.byFloor.checking}</td>
                            <td className="border border-gray-300 px-1 py-1 text-right bg-red-50/30">{s.byFloor.secondaryChecking}</td>
                            <td className="border border-gray-300 px-1 py-1 text-right bg-red-50/30">{s.byFloor.finalChecking}</td>
                            <td className="border border-gray-300 px-1 py-1 text-right">{s.onHand}</td>
                            <td className="border border-gray-300 px-1 py-1 text-right text-orange-700">{s.outwardTotal}</td>
                            <td className="border border-gray-300 px-1 py-1 text-right text-red-800 font-bold">{s.availableForOutward}</td>
                            <td className="border border-gray-300 px-1 py-1 text-center">
                              <div className="flex justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => onView(row)}
                                  className="px-1.5 py-0.5 text-[9px] font-bold border border-gray-300 rounded hover:bg-gray-100"
                                >
                                  View
                                </button>
                                <button
                                  type="button"
                                  disabled={s.availableForOutward <= 0}
                                  onClick={() => onOutward(row)}
                                  className="px-1.5 py-0.5 text-[9px] font-bold border border-red-300 text-red-800 rounded hover:bg-red-50 disabled:opacity-40"
                                >
                                  Outward
                                </button>
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
        Click an order row to expand per-article M4 entries by floor (Knitting, Checking, SC, FC).
      </p>
    </div>
  );
}
