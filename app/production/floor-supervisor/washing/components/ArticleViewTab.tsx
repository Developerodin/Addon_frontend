"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { ProductionOrder, Article } from "@/shared/services/productionService";
import {
  ArticleQrScanPinBanner,
  ArticleScanToolbarButtons,
  articleIdsMatch,
} from "@/shared/components/production/ArticleViewQrScanUi";
import {
  ArticleViewOrderCell,
  formatArticleViewOrderLabel,
} from "@/shared/components/production/ArticleViewOrderCell";

export interface ArticleRow {
  article: Article;
  order: ProductionOrder;
}

export interface ArticleViewTabProps {
  orders: ProductionOrder[];
  isLoading?: boolean;
  onViewOrder: (order: ProductionOrder, article?: Article) => void;
  onUpdateOrder: (order: ProductionOrder, article?: Article) => void;
  getStatusBadge: (status: string) => string;
  getPriorityBadge: (priority: string) => string;
  activeArticleId?: string | null;
  onAssignClick?: () => void;
  onScanContainerClick?: () => void;
  onScanLabelQrClick?: () => void;
  showAllArticles?: boolean;
  itemsPerPage: number;
  onItemsPerPageChange: (n: number) => void;
  qrScanPinned?: boolean;
  onClearQrScanFilter?: () => void;
}

/** Washing remaining qty (prefers API remaining, else received − transferred). */
function washingRemaining(article: Article): number {
  const washing = article.floorQuantities?.washing;
  if (washing == null) return 0;
  if (typeof washing.remaining === "number") return washing.remaining;
  const received = washing.received ?? 0;
  const transferred = washing.transferred ?? 0;
  return Math.max(0, received - transferred);
}

/** Flattens orders into rows with washing received > 0. */
function flattenOrdersToArticles(orders: ProductionOrder[]): ArticleRow[] {
  const rows: ArticleRow[] = [];
  for (const order of orders) {
    for (const article of order.articles) {
      const received = article.floorQuantities?.washing?.received ?? 0;
      if (received > 0) rows.push({ article, order });
    }
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
  isLoading = false,
  onViewOrder,
  onUpdateOrder,
  getStatusBadge,
  getPriorityBadge,
  activeArticleId = null,
  onAssignClick,
  onScanContainerClick,
  onScanLabelQrClick,
  showAllArticles = false,
  itemsPerPage,
  onItemsPerPageChange,
  qrScanPinned = false,
  onClearQrScanFilter,
}: ArticleViewTabProps) {
  const [articleSearch, setArticleSearch] = useState("");
  const [articlePage, setArticlePage] = useState(1);

  const articleRows = useMemo(() => flattenOrdersToArticles(orders), [orders]);

  const visibilityFilteredRows = useMemo(() => {
    if (showAllArticles) return articleRows;
    return articleRows.filter((r) => washingRemaining(r.article) > 0);
  }, [articleRows, showAllArticles]);

  const filteredRows = useMemo(() => {
    if (!articleSearch.trim()) return visibilityFilteredRows;
    const q = articleSearch.trim().toLowerCase();
    return visibilityFilteredRows.filter(
      (r) =>
        (r.article.articleNumber ?? "").toLowerCase().includes(q) ||
        (r.order.orderNumber ?? "").toLowerCase().includes(q) ||
        (r.order.orderNote ?? "").toLowerCase().includes(q) ||
        (r.article.linkingType ?? "").toLowerCase().includes(q)
    );
  }, [visibilityFilteredRows, articleSearch]);

  useEffect(() => {
    setArticlePage(1);
  }, [showAllArticles, articleSearch, orders]);

  const articleTotalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));

  useEffect(() => {
    setArticlePage((p) => Math.min(Math.max(1, p), articleTotalPages));
  }, [articleTotalPages]);

  const safeArticlePage = Math.min(Math.max(1, articlePage), articleTotalPages);
  const pagedRows = useMemo(() => {
    const start = (safeArticlePage - 1) * itemsPerPage;
    return filteredRows.slice(start, start + itemsPerPage);
  }, [filteredRows, safeArticlePage, itemsPerPage]);

  /** Changes article-view page (clamped by total pages). */
  const handleArticlePageChange = (page: number) => {
    setArticlePage(Math.min(Math.max(1, page), articleTotalPages));
  };

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
      const wash = article.floorQuantities?.washing;
      const received = wash?.received ?? 0;
      const done = wash?.completed ?? article.completedQuantity ?? 0;
      const transferred = wash?.transferred ?? 0;
      const remaining = wash?.remaining ?? Math.max(0, received - transferred);

      return [
        article.articleNumber ?? "—",
        article.linkingType ?? "N/A",
        formatArticleViewOrderLabel(order),
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
    a.download = `washing-article-view-${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading && orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
        <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading articles</p>
      </div>
    );
  }

  if (!isLoading && orders.length === 0) {
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
          <p className="text-[10px] text-gray-500">No washing articles on this floor</p>
        </div>
      </div>
    );
  }

  const rangeStart = filteredRows.length === 0 ? 0 : (safeArticlePage - 1) * itemsPerPage + 1;
  const rangeEnd = filteredRows.length === 0 ? 0 : Math.min(safeArticlePage * itemsPerPage, filteredRows.length);

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
        <div className="relative flex-1 min-w-[140px] max-w-[240px]">
          <input
            type="text"
            className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-full placeholder:text-gray-400 font-medium"
            placeholder="Search article, order..."
            value={articleSearch}
            onChange={(e) => setArticleSearch(e.target.value)}
            aria-label="Search articles and orders"
          />
          <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
        </div>
        <select
          className="bg-white border border-gray-300 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5"
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          aria-label="Articles per page"
        >
          <option value={10}>Show 10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span className="text-[11px] font-medium text-[#495057]">
          {filteredRows.length} article{filteredRows.length !== 1 ? "s" : ""}
          {isLoading ? " · refreshing…" : ""}
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
            {pagedRows.map(({ article, order }) => {
              const planned = article.plannedQuantity ?? 0;
              const wash = article.floorQuantities?.washing;
              const received = wash?.received ?? 0;
              const completed = wash?.completed ?? article.completedQuantity ?? 0;
              const transferred = wash?.transferred ?? 0;
              const remaining = wash?.remaining ?? Math.max(0, received - transferred);
              const key = (article.id ?? article._id) + "-" + order.id;
              const articleId = article.id ?? article._id;
              const isActiveRow = Boolean(
                activeArticleId &&
                  (articleIdsMatch(articleId, activeArticleId) ||
                    articleIdsMatch(article._id, activeArticleId))
              );
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
                    <ArticleViewOrderCell order={order} />
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium mt-0.5 ${getStatusBadge(order.status)}`}>{order.status}</span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ml-0.5 ${getPriorityBadge(order.priority)}`}>{order.priority}</span>
                  </td>
                  <td className="px-1.5 py-2.5 text-center text-[12px] text-gray-700 border border-gray-200">{planned.toLocaleString()}</td>
                  <td className="px-1.5 py-2.5 text-center text-[12px] text-purple-600 font-medium border border-gray-200">{received.toLocaleString()}</td>
                  <td className="px-1.5 py-2.5 text-center text-[12px] text-green-600 font-medium border border-gray-200">{completed.toLocaleString()}</td>
                  <td className="px-1.5 py-2.5 text-center text-[12px] text-green-600 font-medium border border-gray-200">{transferred.toLocaleString()}</td>
                  <td className="px-1.5 py-2.5 text-center text-[12px] text-orange-600 font-medium border border-gray-200">{remaining.toLocaleString()}</td>
                  <td className="px-1.5 py-2.5 border border-gray-200">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${getStatusBadge(order.status)}`}>{order.status}</span>
                  </td>
                  <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                    <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 flex-wrap">
                      {onAssignClick && (
                        <button
                          type="button"
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded transition-colors ${isActiveRow ? "bg-purple-600 text-white hover:bg-purple-700 shadow-sm" : "bg-purple-50 text-purple-600 border border-purple-100 hover:bg-purple-100"}`}
                          onClick={onAssignClick}
                          title="Assign to team member"
                        >
                          <i className="ri-user-add-line text-xs" />
                          Assign
                        </button>
                      )}
                      <button type="button" className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-400 border border-blue-100 rounded hover:bg-blue-100" onClick={() => onViewOrder(order, article)} title="View order" aria-label={`View order ${formatArticleViewOrderLabel(order)}`}>
                        <i className="ri-eye-line text-xs" />
                      </button>
                      <button type="button" className="w-7 h-7 flex items-center justify-center bg-emerald-50 text-emerald-400 border border-emerald-100 rounded hover:bg-emerald-100" onClick={() => onUpdateOrder(order, article)} title="Update order" aria-label={`Update order ${formatArticleViewOrderLabel(order)}`}>
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

      {filteredRows.length === 0 && !articleSearch.trim() && orders.length > 0 && (
        <div className="py-8 text-center text-[11px] text-gray-500">
          {showAllArticles
            ? "No washing lines to display."
            : "No articles with remaining quantity. Turn on Show all to include completed lines."}
        </div>
      )}

      {filteredRows.length > 0 && (
        <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 mt-3">
          <div className="text-[11px] font-medium text-[#495057]">
            Showing {rangeStart} to {rangeEnd} of {filteredRows.length} articles
          </div>
          <div className="flex items-center gap-1" role="navigation" aria-label="Article pagination">
            <button type="button" onClick={() => handleArticlePageChange(safeArticlePage - 1)} disabled={safeArticlePage <= 1} className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30">Prev</button>
            {Array.from({ length: Math.min(articleTotalPages, 7) }, (_, i) => {
              const pageNum =
                articleTotalPages <= 7
                  ? i + 1
                  : safeArticlePage <= 4
                    ? i + 1
                    : safeArticlePage >= articleTotalPages - 3
                      ? articleTotalPages - 6 + i
                      : safeArticlePage - 3 + i;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => handleArticlePageChange(pageNum)}
                  className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded ${safeArticlePage === pageNum ? "bg-purple-600 text-white shadow-md" : "text-gray-400 hover:bg-gray-50"}`}
                  aria-label={`Page ${pageNum}`}
                  aria-current={safeArticlePage === pageNum ? "page" : undefined}
                >
                  {pageNum}
                </button>
              );
            })}
            <button type="button" onClick={() => handleArticlePageChange(safeArticlePage + 1)} disabled={safeArticlePage >= articleTotalPages} className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
