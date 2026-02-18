"use client";

import React, { useMemo, useState } from "react";
import type { ProductionOrder, Article } from "@/shared/services/productionService";

export interface ArticleRow {
  article: Article;
  order: ProductionOrder;
}

export interface ArticleViewTabProps {
  /** Orders already filtered by knitting received > 0 (e.g. from parent paginated list). */
  orders: ProductionOrder[];
  onViewOrder: (order: ProductionOrder) => void;
  onUpdateOrder: (order: ProductionOrder) => void;
  getStatusBadge: (status: string) => string;
  getPriorityBadge: (priority: string) => string;
}

/**
 * Flattens orders into one row per article for knitting floor.
 * Only includes articles that have knitting received > 0.
 */
function flattenOrdersToArticles(orders: ProductionOrder[]): ArticleRow[] {
  const rows: ArticleRow[] = [];
  for (const order of orders) {
    for (const article of order.articles) {
      const received = article.floorQuantities?.knitting?.received ?? 0;
      if (received > 0) {
        rows.push({ article, order });
      }
    }
  }
  return rows;
}

export default function ArticleViewTab({
  orders,
  onViewOrder,
  onUpdateOrder,
  getStatusBadge,
  getPriorityBadge,
}: ArticleViewTabProps) {
  const [articleSearch, setArticleSearch] = useState("");

  const articleRows = useMemo(() => flattenOrdersToArticles(orders), [orders]);

  const filteredRows = useMemo(() => {
    if (!articleSearch.trim()) return articleRows;
    const q = articleSearch.trim().toLowerCase();
    return articleRows.filter(
      (r) =>
        (r.article.articleNumber ?? "").toLowerCase().includes(q) ||
        (r.order.orderNumber ?? "").toLowerCase().includes(q) ||
        (r.article.linkingType ?? "").toLowerCase().includes(q) ||
        (r.article.knittingCode ?? "").toLowerCase().includes(q)
    );
  }, [articleRows, articleSearch]);

  if (orders.length === 0) {
    return (
      <div className="p-[10px] flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <i className="ri-file-list-line text-xl text-gray-200" />
        </div>
        <h3 className="text-xs font-bold text-gray-400 mb-1">NO ARTICLES</h3>
        <p className="text-[10px] text-gray-500">No knitting articles in current order set</p>
      </div>
    );
  }

  return (
    <div className="p-[10px]">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[160px] max-w-[260px]">
          <input
            type="text"
            className="bg-white border border-gray-300 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-1 focus:ring-purple-300 focus:border-purple-500 w-full placeholder:text-gray-400 font-medium"
            placeholder="Search article, order..."
            value={articleSearch}
            onChange={(e) => setArticleSearch(e.target.value)}
          />
          <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
        </div>
        <span className="text-[11px] font-medium text-gray-500">
          {filteredRows.length} article{filteredRows.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-x-auto border border-gray-300 rounded">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-50/30">
              <th className="pl-2 pr-1 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">
                Article
              </th>
              <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">
                Order
              </th>
              <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">
                Planned
              </th>
              <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">
                Rcv
              </th>
              <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">
                Done
              </th>
              <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">
                Trf
              </th>
              <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">
                Rem
              </th>
              <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300 bg-red-50">
                M4
              </th>
              <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">
                Status
              </th>
              <th className="px-1.5 py-2 text-right pr-2 text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map(({ article, order }) => {
              const planned = article.plannedQuantity ?? 0;
              const received = article.floorQuantities?.knitting?.received ?? 0;
              const completed = article.floorQuantities?.knitting?.completed ?? 0;
              const transferred = article.floorQuantities?.knitting?.transferred ?? 0;
              const remaining = article.floorQuantities?.knitting?.remaining ?? 0;
              const m4 = article.floorQuantities?.knitting?.m4Quantity ?? 0;
              const isOverproduction = completed > planned;
              const key = (article.id ?? article._id) + "-" + order.id;
              return (
                <tr key={key} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="pl-2 pr-1 py-2 border border-gray-300">
                    <div className="text-[12px] font-bold text-gray-900">{article.articleNumber ?? "—"}</div>
                    <div className="text-[10px] text-gray-500">{article.linkingType ?? "N/A"}</div>
                    {article.knittingCode && (
                      <div className="text-[10px] text-gray-500 truncate" title={article.knittingCode}>
                        {article.knittingCode}
                      </div>
                    )}
                  </td>
                  <td className="px-1.5 py-2 border border-gray-300">
                    <div className="text-[12px] font-medium text-gray-800">{order.orderNumber ?? order.id}</div>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium mt-0.5 ${getStatusBadge(order.status)}`}>
                      {order.status}
                    </span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ml-0.5 ${getPriorityBadge(order.priority)}`}>
                      {order.priority}
                    </span>
                  </td>
                  <td className="px-1.5 py-2 text-center text-[12px] text-gray-700 border border-gray-300">
                    {planned.toLocaleString()}
                  </td>
                  <td className="px-1.5 py-2 text-center text-[12px] text-blue-600 font-medium border border-gray-300">
                    {received.toLocaleString()}
                  </td>
                  <td className="px-1.5 py-2 text-center border border-gray-300">
                    <span className="text-[12px] text-green-600 font-medium">{completed.toLocaleString()}</span>
                    {isOverproduction && (
                      <div className="text-[10px] text-orange-600">+{completed - planned}</div>
                    )}
                  </td>
                  <td className="px-1.5 py-2 text-center text-[12px] text-green-600 font-medium border border-gray-300">
                    {transferred.toLocaleString()}
                  </td>
                  <td className="px-1.5 py-2 text-center text-[12px] text-orange-600 font-medium border border-gray-300">
                    {remaining.toLocaleString()}
                  </td>
                  <td className="px-1.5 py-2 text-center border border-gray-300 bg-red-50">
                    {m4 > 0 ? (
                      <span className="text-[12px] text-red-600 font-medium">{m4.toLocaleString()}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-1.5 py-2 border border-gray-300">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${getStatusBadge(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-1.5 py-2 text-right pr-2 border border-gray-300">
                    <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        type="button"
                        className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-400 border border-blue-100 rounded hover:bg-blue-100"
                        onClick={() => onViewOrder(order)}
                        title="View order"
                      >
                        <i className="ri-eye-line text-xs" />
                      </button>
                      <button
                        type="button"
                        className="w-7 h-7 flex items-center justify-center bg-emerald-50 text-emerald-400 border border-emerald-100 rounded hover:bg-emerald-100"
                        onClick={() => onUpdateOrder(order)}
                        title="Update order"
                      >
                        <i className="ri-edit-line text-xs" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredRows.length === 0 && articleSearch.trim() && (
        <div className="py-8 text-center text-[11px] text-gray-500">No articles match &quot;{articleSearch.trim()}&quot;</div>
      )}
    </div>
  );
}
