"use client";

import React, { useMemo, useState } from "react";
import type { ProductionOrder, Article } from "@/shared/services/productionService";
import {
  ArticleQrScanPinBanner,
  ArticleScanToolbarButtons,
  articleIdsMatch,
} from "@/shared/components/production/ArticleViewQrScanUi";

export interface ArticleRow {
  article: Article;
  order: ProductionOrder;
}

export interface ArticleViewTabProps {
  orders: ProductionOrder[];
  onViewOrder: (order: ProductionOrder, article?: Article) => void;
  onUpdateOrder: (order: ProductionOrder, article?: Article) => void;
  getStatusBadge: (status: string) => string;
  getPriorityBadge: (priority: string) => string;
  activeArticleId?: string | null;
  onAssignClick?: () => void;
  onScanContainerClick?: () => void;
  onScanLabelQrClick?: () => void;
  onShowAllArticlesChange?: (show: boolean) => void;
  qrScanPinned?: boolean;
  onClearQrScanFilter?: () => void;
  showAllArticles?: boolean;
  onShowAllArticlesChange?: (show: boolean) => void;
}

function flattenOrdersToArticles(orders: ProductionOrder[]): ArticleRow[] {
  const rows: ArticleRow[] = [];
  for (const order of orders) {
    for (const article of order.articles) rows.push({ article, order });
  }
  return rows;
}

function csvCell(value: string | number): string {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
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
  onScanLabelQrClick,
  qrScanPinned = false,
  onClearQrScanFilter,
  showAllArticles = false,
  onShowAllArticlesChange,
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

  const handleExportExcel = () => {
    const headers = [
      "Article",
      "Linking Type",
      "Order",
      "Order Status",
      "Priority",
      "Planned",
      "Received",
      "Done",
      "Transferred",
      "Remaining",
    ];

    const rows = filteredRows.map(({ article, order }) => {
      const planned = article.plannedQuantity ?? 0;
      const silicon = (article as { floorQuantities?: { silicon?: { received?: number; completed?: number; transferred?: number; remaining?: number } } }).floorQuantities?.silicon;
      const received = silicon?.received ?? 0;
      const done = silicon?.completed ?? 0;
      const transferred = silicon?.transferred ?? 0;
      const remaining = silicon?.remaining ?? Math.max(0, received - transferred);

      return [
        article.articleNumber ?? "—",
        article.linkingType ?? "N/A",
        order.orderNumber ?? order.id ?? "—",
        order.status ?? "",
        order.priority ?? "",
        planned,
        received,
        done,
        transferred,
        remaining,
      ];
    });

    const csvContent = [
      headers.map(csvCell).join(","),
      ...rows.map((r) => r.map(csvCell).join(",")),
    ].join("\n");

    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const now = new Date();
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    a.href = url;
    a.download = `silicon-article-view-${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (orders.length === 0) {
    return (
      <div className="p-[10px]">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <ArticleScanToolbarButtons
            onScanContainerClick={onScanContainerClick}
            onScanLabelQrClick={onScanLabelQrClick}
          />
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <i className="ri-file-list-line text-xl text-gray-200" />
          </div>
          <h3 className="text-xs font-bold text-gray-400 mb-1">NO ARTICLES</h3>
          <p className="text-[10px] text-gray-500">No silicon articles in current order set</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-[10px]">
      {qrScanPinned && onClearQrScanFilter ? (
        <ArticleQrScanPinBanner pinned={qrScanPinned} onClear={onClearQrScanFilter} />
      ) : null}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <ArticleScanToolbarButtons
            onScanContainerClick={onScanContainerClick}
            onScanLabelQrClick={onScanLabelQrClick}
          />
        {onShowAllArticlesChange && (
          <label className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-gray-700 border border-gray-200 rounded bg-white hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" checked={showAllArticles} onChange={(e) => onShowAllArticlesChange(e.target.checked)} className="rounded border-gray-300" />
            Show all
          </label>
        )}
        <div className="relative flex-1 min-w-[140px] max-w-[240px]">
          <input
            type="text"
            className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-full placeholder:text-gray-400 font-medium transition-all"
            placeholder="Search article, order..."
            value={articleSearch}
            onChange={(e) => setArticleSearch(e.target.value)}
          />
          <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
        </div>
        <span className="text-[11px] font-medium text-[#495057]">
          {filteredRows.length} article{filteredRows.length !== 1 ? "s" : ""}
        </span>
        <button
          type="button"
          onClick={handleExportExcel}
          disabled={filteredRows.length === 0}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Download current table rows as Excel-compatible CSV"
        >
          <i className="ri-file-excel-2-line text-xs text-emerald-600" />
          Download Excel
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded">
        <table className="w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-50/30">
              <th className="pl-[10px] pr-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                Article
              </th>
              <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                Order
              </th>
              <th className="px-1.5 py-2.5 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                Planned
              </th>
              <th className="px-1.5 py-2.5 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                Rcv
              </th>
              <th className="px-1.5 py-2.5 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                Done
              </th>
              <th className="px-1.5 py-2.5 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                Trf
              </th>
              <th className="px-1.5 py-2.5 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                Rem
              </th>
              <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                Status
              </th>
              <th className="px-1.5 py-2.5 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map(({ article, order }) => {
              const planned = article.plannedQuantity ?? 0;
              const silicon = (article as any).floorQuantities?.silicon;
              const received = silicon?.received ?? 0;
              const completed = silicon?.completed ?? 0;
              const transferred = silicon?.transferred ?? 0;
              const remaining = silicon?.remaining ?? Math.max(0, received - transferred);
              const key = (article.id ?? article._id) + "-" + order.id;
              const articleId = article.id ?? article._id;
              const isActiveRow = Boolean(activeArticleId && articleId && articleIdsMatch(articleId, activeArticleId) || articleIdsMatch(article._id, activeArticleId));
              return (
                <tr
                  key={key}
                  className={`hover:bg-gray-50/50 transition-colors group ${isActiveRow ? "ring-2 ring-purple-500 ring-inset bg-purple-50/50" : ""}`}
                >
                  <td className="pl-[10px] pr-1.5 py-2.5 border border-gray-200">
                    <div className="text-[12px] font-bold text-gray-900">{article.articleNumber ?? "—"}</div>
                    <div className="text-[10px] text-gray-500">{article.linkingType ?? "N/A"}</div>
                  </td>
                  <td className="px-1.5 py-2.5 border border-gray-200">
                    <div className="text-[12px] font-medium text-gray-800">{order.orderNumber ?? order.id}</div>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium mt-0.5 ${getStatusBadge(order.status)}`}>
                      {order.status}
                    </span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ml-0.5 ${getPriorityBadge(order.priority)}`}>
                      {order.priority}
                    </span>
                  </td>
                  <td className="px-1.5 py-2.5 text-center text-[12px] text-gray-700 border border-gray-200">
                    {planned.toLocaleString()}
                  </td>
                  <td className="px-1.5 py-2.5 text-center text-[12px] text-purple-600 font-medium border border-gray-200">
                    {received.toLocaleString()}
                  </td>
                  <td className="px-1.5 py-2.5 text-center text-[12px] text-green-600 font-medium border border-gray-200">
                    {completed.toLocaleString()}
                  </td>
                  <td className="px-1.5 py-2.5 text-center text-[12px] text-green-600 font-medium border border-gray-200">
                    {transferred.toLocaleString()}
                  </td>
                  <td className="px-1.5 py-2.5 text-center text-[12px] text-orange-600 font-medium border border-gray-200">
                    {remaining.toLocaleString()}
                  </td>
                  <td className="px-1.5 py-2.5 border border-gray-200">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${getStatusBadge(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                    <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 flex-wrap">
                      {onAssignClick && (
                        <button
                          type="button"
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded transition-colors ${
                            isActiveRow
                              ? "bg-purple-600 text-white hover:bg-purple-700 shadow-sm"
                              : "bg-sky-50 text-sky-600 border border-sky-100 hover:bg-sky-100"
                          }`}
                          onClick={onAssignClick}
                          title="Assign to team member"
                        >
                          <i className="ri-user-add-line text-xs" />
                          Assign
                        </button>
                      )}
                      <button
                        type="button"
                        className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-400 border border-blue-100 rounded hover:bg-blue-100 transition-opacity opacity-80 group-hover:opacity-100"
                        onClick={() => onViewOrder(order, article)}
                        title="View order"
                      >
                        <i className="ri-eye-line text-xs" />
                      </button>
                      <button
                        type="button"
                        className="w-7 h-7 flex items-center justify-center bg-emerald-50 text-emerald-400 border border-emerald-100 rounded hover:bg-emerald-100 transition-opacity opacity-80 group-hover:opacity-100"
                        onClick={() => onUpdateOrder(order, article)}
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
