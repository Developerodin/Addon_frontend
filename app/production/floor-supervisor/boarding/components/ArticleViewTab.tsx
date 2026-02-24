"use client";

import React, { useMemo, useState } from "react";
import type { ProductionOrder, Article } from "@/shared/services/productionService";

export interface ArticleRow {
  article: Article;
  order: ProductionOrder;
}

export interface ArticleViewTabProps {
  /** Orders already filtered by boarding received > 0. */
  orders: ProductionOrder[];
  onViewOrder: (order: ProductionOrder) => void;
  onUpdateOrder: (order: ProductionOrder) => void;
  getStatusBadge: (status: string) => string;
  getPriorityBadge: (priority: string) => string;
  activeArticleId?: string | null;
  onAssignClick?: () => void;
  onScanContainerClick?: () => void;
}

function flattenOrdersToArticles(orders: ProductionOrder[]): ArticleRow[] {
  const rows: ArticleRow[] = [];
  for (const order of orders) {
    for (const article of order.articles) {
      const received = (article as any).floorQuantities?.boarding?.received ?? 0;
      if (received > 0) rows.push({ article, order });
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
  activeArticleId = null,
  onAssignClick,
  onScanContainerClick,
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
        (r.article.linkingType ?? "").toLowerCase().includes(q)
    );
  }, [articleRows, articleSearch]);

  if (orders.length === 0) {
    return (
      <div className="p-[10px]">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {onScanContainerClick && (
            <button type="button" onClick={onScanContainerClick} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-green-600 text-white hover:bg-green-700 shadow-sm">
              <i className="ri-barcode-line text-xs" /> Scan Container
            </button>
          )}
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4"><i className="ri-file-list-line text-xl text-gray-200" /></div>
          <h3 className="text-xs font-bold text-gray-400 mb-1">NO ARTICLES</h3>
          <p className="text-[10px] text-gray-500">No boarding articles in current order set</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-[10px]">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {onScanContainerClick && (
          <button type="button" onClick={onScanContainerClick} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-green-600 text-white hover:bg-green-700 shadow-sm">
            <i className="ri-barcode-line text-xs" /> Scan Container
          </button>
        )}
        <div className="relative flex-1 min-w-[140px] max-w-[240px]">
          <input type="text" className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-green-300 w-full placeholder:text-gray-400 font-medium" placeholder="Search article, order..." value={articleSearch} onChange={(e) => setArticleSearch(e.target.value)} />
          <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
        </div>
        <span className="text-[11px] font-medium text-[#495057]">{filteredRows.length} article{filteredRows.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="overflow-x-auto border border-gray-200 rounded">
        <table className="w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-50/30">
              <th className="pl-[10px] pr-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Article</th>
              <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Order</th>
              <th className="px-1.5 py-2.5 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Planned</th>
              <th className="px-1.5 py-2.5 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Rcv</th>
              <th className="px-1.5 py-2.5 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Done</th>
              <th className="px-1.5 py-2.5 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Trf</th>
              <th className="px-1.5 py-2.5 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Rem</th>
              <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
              <th className="px-1.5 py-2.5 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map(({ article, order }) => {
              const planned = article.plannedQuantity ?? 0;
              const board = (article as any).floorQuantities?.boarding;
              const received = board?.received ?? 0;
              const completed = board?.completed ?? 0;
              const transferred = board?.transferred ?? 0;
              const remaining = board?.remaining ?? Math.max(0, received - transferred);
              const key = (article.id ?? article._id) + "-" + order.id;
              const articleId = article.id ?? article._id;
              const isActiveRow = Boolean(activeArticleId && articleId && String(articleId) === String(activeArticleId));
              return (
                <tr key={key} className={`hover:bg-gray-50/50 transition-colors group ${isActiveRow ? "ring-2 ring-green-500 ring-inset bg-green-50/50" : ""}`}>
                  <td className="pl-[10px] pr-1.5 py-2.5 border border-gray-200">
                    <div className="text-[12px] font-bold text-gray-900">{article.articleNumber ?? "—"}</div>
                    <div className="text-[10px] text-gray-500">{article.linkingType ?? "N/A"}</div>
                  </td>
                  <td className="px-1.5 py-2.5 border border-gray-200">
                    <div className="text-[12px] font-medium text-gray-800">{order.orderNumber ?? order.id}</div>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium mt-0.5 ${getStatusBadge(order.status)}`}>{order.status}</span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ml-0.5 ${getPriorityBadge(order.priority)}`}>{order.priority}</span>
                  </td>
                  <td className="px-1.5 py-2.5 text-center text-[12px] text-gray-700 border border-gray-200">{planned.toLocaleString()}</td>
                  <td className="px-1.5 py-2.5 text-center text-[12px] text-green-600 font-medium border border-gray-200">{received.toLocaleString()}</td>
                  <td className="px-1.5 py-2.5 text-center text-[12px] text-green-600 font-medium border border-gray-200">{completed.toLocaleString()}</td>
                  <td className="px-1.5 py-2.5 text-center text-[12px] text-green-600 font-medium border border-gray-200">{transferred.toLocaleString()}</td>
                  <td className="px-1.5 py-2.5 text-center text-[12px] text-orange-600 font-medium border border-gray-200">{remaining.toLocaleString()}</td>
                  <td className="px-1.5 py-2.5 border border-gray-200">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${getStatusBadge(order.status)}`}>{order.status}</span>
                  </td>
                  <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                    <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 flex-wrap">
                      {onAssignClick && (
                        <button type="button" className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded ${isActiveRow ? "bg-green-600 text-white hover:bg-green-700 shadow-sm" : "bg-green-50 text-green-600 border border-green-100 hover:bg-green-100"}`} onClick={onAssignClick} title="Assign to team member">
                          <i className="ri-user-add-line text-xs" /> Assign
                        </button>
                      )}
                      <button type="button" className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-400 border border-blue-100 rounded hover:bg-blue-100" onClick={() => onViewOrder(order)} title="View order"><i className="ri-eye-line text-xs" /></button>
                      <button type="button" className="w-7 h-7 flex items-center justify-center bg-emerald-50 text-emerald-400 border border-emerald-100 rounded hover:bg-emerald-100" onClick={() => onUpdateOrder(order)} title="Update order"><i className="ri-edit-line text-xs" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filteredRows.length === 0 && articleSearch.trim() && <div className="py-8 text-center text-[11px] text-gray-500">No articles match &quot;{articleSearch.trim()}&quot;</div>}
    </div>
  );
}
