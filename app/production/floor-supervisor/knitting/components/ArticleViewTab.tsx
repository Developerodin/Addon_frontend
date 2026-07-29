"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ProductionOrder, Article } from "@/shared/services/productionService";
import { listMachineOrderAssignments } from "@/shared/services/machineOrderAssignmentService";
import { productionArticleRowKey } from "@/shared/utils/productionArticleQr";
import {
  ArticleViewOrderCell,
  formatArticleViewOrderLabel,
} from "@/shared/components/production/ArticleViewOrderCell";
import ArticleProductImageButton from "@/shared/components/production/ArticleProductImageButton";
import { collectArticleFactoryCodes, useArticleProductImages } from "@/shared/hooks/useArticleProductImages";

export interface ArticleRow {
  article: Article;
  order: ProductionOrder;
}

export interface ArticleViewTabProps {
  /** Orders shaped for knitting (articles with received > 0); may be a wide fetch for article-level paging. */
  orders: ProductionOrder[];
  isLoading?: boolean;
  /** When true, show every line with knitting received > 0; when false, only remaining > 0. */
  showAllArticles: boolean;
  onShowAllArticlesChange: (show: boolean) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (n: number) => void;
  onViewOrder: (order: ProductionOrder, article?: Article) => void;
  getStatusBadge: (status: string) => string;
  getPriorityBadge: (priority: string) => string;
  /** Row key `orderId|articleId` to highlight after QR scan. */
  highlightedRowKey?: string | null;
  /** When set, jump to page and scroll this row into view (then call onFocusRowHandled). */
  focusRowKey?: string | null;
  onFocusRowHandled?: () => void;
  onScanQrClick?: () => void;
  qrScanPinned?: boolean;
  onClearQrScanFilter?: () => void;
}

/**
 * Knitting remaining qty for an article (prefers API `remaining`, else received − transferred).
 */
function knittingRemaining(article: Article): number {
  const k = article.floorQuantities?.knitting;
  if (k == null) return 0;
  if (typeof k.remaining === "number") return k.remaining;
  const received = k.received ?? 0;
  const transferred = k.transferred ?? 0;
  return Math.max(0, received - transferred);
}

/**
 * Flattens orders into one row per article for knitting floor (received > 0 only on parent orders).
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

function machineLabel(m: { machineCode?: string; name?: string; id?: string } | string): string {
  if (typeof m === "string") return m;
  return m?.machineCode ?? m?.name ?? m?.id ?? "—";
}

function csvCell(value: string | number): string {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function ArticleViewTab({
  orders,
  isLoading = false,
  showAllArticles,
  onShowAllArticlesChange,
  itemsPerPage,
  onItemsPerPageChange,
  onViewOrder,
  getStatusBadge,
  getPriorityBadge,
  highlightedRowKey = null,
  focusRowKey = null,
  onFocusRowHandled,
  onScanQrClick,
  qrScanPinned = false,
  onClearQrScanFilter,
}: ArticleViewTabProps) {
  const [articleSearch, setArticleSearch] = useState("");
  const [articlePage, setArticlePage] = useState(1);
  const [articleToMachineMap, setArticleToMachineMap] = useState<Map<string, string>>(new Map());
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listMachineOrderAssignments({ page: 1, limit: 500 });
        const map = new Map<string, string>();
        for (const a of data.results ?? []) {
          const label = machineLabel(a.machine as { machineCode?: string; name?: string; id?: string });
          for (const item of a.productionOrderItems ?? []) {
            const orderId =
              typeof item.productionOrder === "string"
                ? item.productionOrder
                : (item.productionOrder as { id?: string; _id?: string })?.id ??
                  (item.productionOrder as { _id?: string })?._id ??
                  "";
            const articleId =
              typeof item.article === "string"
                ? item.article
                : (item.article as { id?: string; _id?: string })?.id ?? (item.article as { _id?: string })?._id ?? "";
            if (orderId && articleId) map.set(`${orderId}|${articleId}`, label);
          }
        }
        if (!cancelled) setArticleToMachineMap(map);
      } catch {
        // Machine labels are optional for the grid
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const articleRows = useMemo(() => flattenOrdersToArticles(orders), [orders]);
  const factoryCodes = useMemo(() => collectArticleFactoryCodes(orders), [orders]);
  const { openProductImage, productImageModal } = useArticleProductImages(factoryCodes);


  const visibilityFilteredRows = useMemo(() => {
    if (showAllArticles) return articleRows;
    return articleRows.filter((r) => knittingRemaining(r.article) > 0);
  }, [articleRows, showAllArticles]);

  const filteredRows = useMemo(() => {
    if (!articleSearch.trim()) return visibilityFilteredRows;
    const q = articleSearch.trim().toLowerCase();
    return visibilityFilteredRows.filter(
      (r) =>
        (r.article.articleNumber ?? "").toLowerCase().includes(q) ||
        (r.order.orderNumber ?? "").toLowerCase().includes(q) ||
        (r.order.orderNote ?? "").toLowerCase().includes(q) ||
        (r.article.linkingType ?? "").toLowerCase().includes(q) ||
        (r.article.knittingCode ?? "").toLowerCase().includes(q)
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

  useEffect(() => {
    if (!focusRowKey) return;
    const idx = filteredRows.findIndex(
      ({ order, article }) => productionArticleRowKey(order, article) === focusRowKey
    );
    if (idx < 0) {
      onFocusRowHandled?.();
      return;
    }
    const targetPage = Math.floor(idx / itemsPerPage) + 1;
    setArticlePage(targetPage);
    window.setTimeout(() => {
      rowRefs.current.get(focusRowKey)?.scrollIntoView({ behavior: "smooth", block: "center" });
      onFocusRowHandled?.();
    }, 150);
  }, [focusRowKey, filteredRows, itemsPerPage, onFocusRowHandled]);

  /**
   * Exports every row matching search and Show-all filter (not only the current page).
   */
  const handleExportExcel = () => {
    const headers = [
      "Article",
      "Linking Type",
      "Knitting Code",
      "Order",
      "Machine",
      "Order Status",
      "Priority",
      "Planned",
      "Received",
      "Completed",
      "Transferred",
      "Remaining",
      "M4",
    ];

    const rows = filteredRows.map(({ article, order }) => {
      const planned = article.plannedQuantity ?? 0;
      const received = article.floorQuantities?.knitting?.received ?? 0;
      const completed = article.floorQuantities?.knitting?.completed ?? 0;
      const transferred = article.floorQuantities?.knitting?.transferred ?? 0;
      const remaining = article.floorQuantities?.knitting?.remaining ?? 0;
      const m4 = article.floorQuantities?.knitting?.m4Quantity ?? 0;
      const machine = articleToMachineMap.get(`${order.id}|${article.id ?? article._id}`) ?? "—";

      return [
        article.articleNumber ?? "—",
        article.linkingType ?? "N/A",
        article.knittingCode ?? "",
        formatArticleViewOrderLabel(order),
        machine,
        order.status ?? "",
        order.priority ?? "",
        planned,
        received,
        completed,
        transferred,
        remaining,
        m4,
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
    a.download = `knitting-article-view-${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Changes article-view page (clamped by parent total pages).
   */
  const handleArticlePageChange = (page: number) => {
    const next = Math.min(Math.max(1, page), articleTotalPages);
    setArticlePage(next);
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
      <div className="p-[10px] flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <i className="ri-file-list-line text-xl text-gray-200" />
        </div>
        <h3 className="text-xs font-bold text-gray-400 mb-1">NO ARTICLES</h3>
        <p className="text-[10px] text-gray-500">No knitting articles in current order set</p>
      </div>
    );
  }

  const rangeStart = filteredRows.length === 0 ? 0 : (safeArticlePage - 1) * itemsPerPage + 1;
  const rangeEnd = filteredRows.length === 0 ? 0 : Math.min(safeArticlePage * itemsPerPage, filteredRows.length);

  return (
    <div className="p-[10px]">
      {qrScanPinned && onClearQrScanFilter ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2">
          <p className="text-[11px] text-purple-900 font-medium">
            Showing article from label QR scan only.
          </p>
          <button
            type="button"
            onClick={onClearQrScanFilter}
            className="text-[11px] font-bold text-purple-700 hover:text-purple-900 underline"
          >
            Show all articles
          </button>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {onScanQrClick && (
          <button
            type="button"
            onClick={onScanQrClick}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm"
          >
            <i className="ri-qr-scan-2-line text-xs" aria-hidden />
            Scan QR
          </button>
        )}
        <div className="relative flex-1 min-w-[160px] max-w-[260px]">
          <input
            type="text"
            className="bg-white border border-gray-300 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-1 focus:ring-purple-300 focus:border-purple-500 w-full placeholder:text-gray-400 font-medium"
            placeholder="Search article, order..."
            value={articleSearch}
            onChange={(e) => setArticleSearch(e.target.value)}
            aria-label="Search articles and orders"
          />
          <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" aria-hidden />
        </div>

        <label className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-gray-700 border border-gray-200 rounded bg-white hover:bg-gray-50 cursor-pointer">
          <input
            type="checkbox"
            checked={showAllArticles}
            onChange={(e) => onShowAllArticlesChange(e.target.checked)}
            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            aria-label="Show all knitting lines with received quantity"
          />
          Show all (incl. completed / zero remaining)
        </label>

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

        <span className="text-[11px] font-medium text-gray-500">
          {filteredRows.length} article{filteredRows.length !== 1 ? "s" : ""}
          {isLoading ? " · refreshing…" : ""}
        </span>

        <button
          type="button"
          onClick={handleExportExcel}
          disabled={filteredRows.length === 0}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Download current filter as Excel-compatible CSV"
        >
          <i className="ri-file-excel-2-line text-xs text-emerald-600" aria-hidden />
          Download Excel
        </button>
      </div>

      {/* Excel-like table: series-wise (one row per article) */}
      <div className="overflow-x-auto border border-gray-300 rounded relative">
        {isLoading && orders.length > 0 ? (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-purple-600 opacity-70" />
              <span className="text-[10px] text-gray-500 font-medium">Updating…</span>
            </div>
          </div>
        ) : null}
        <table className="min-w-full text-xs border-collapse">
          <thead className="bg-gray-100 border-b border-gray-300">
            <tr>
              <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Article</th>
              <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Order</th>
              <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Machine</th>
              <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Planned</th>
              <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Rcv</th>
              <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Done</th>
              <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Trf</th>
              <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Rem</th>
              <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap bg-red-50">M4</th>
              <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Status</th>
              <th className="px-2 py-1.5 text-right font-semibold text-gray-700 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pagedRows.map(({ article, order }) => {
              const planned = article.plannedQuantity ?? 0;
              const received = article.floorQuantities?.knitting?.received ?? 0;
              const completed = article.floorQuantities?.knitting?.completed ?? 0;
              const transferred = article.floorQuantities?.knitting?.transferred ?? 0;
              const remaining = article.floorQuantities?.knitting?.remaining ?? 0;
              const m4 = article.floorQuantities?.knitting?.m4Quantity ?? 0;
              const isOverproduction = completed > planned;
              const key = (article.id ?? article._id) + "-" + order.id;
              const rowKey = productionArticleRowKey(order, article);
              const isHighlighted = Boolean(highlightedRowKey && rowKey === highlightedRowKey);
              return (
                <tr
                  key={key}
                  ref={(el) => {
                    if (el) rowRefs.current.set(rowKey, el);
                    else rowRefs.current.delete(rowKey);
                  }}
                  className={`hover:bg-gray-50 transition-colors group ${
                    isHighlighted ? "ring-2 ring-purple-500 ring-inset bg-purple-50/60" : ""
                  }`}
                >
                  <td className="px-2 py-1.5 border-r border-gray-300">
                    <div className="font-medium text-gray-900">{article.articleNumber ?? "—"}</div>
                    <div className="text-gray-500 text-[10px]">{article.linkingType ?? "N/A"}</div>
                    {article.knittingCode && (
                      <div className="text-[10px] text-gray-500 truncate" title={article.knittingCode}>
                        {article.knittingCode}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-1.5 border-r border-gray-300">
                    <ArticleViewOrderCell order={order} />
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium mt-0.5 ${getStatusBadge(order.status)}`}>
                      {order.status}
                    </span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ml-0.5 ${getPriorityBadge(order.priority)}`}>
                      {order.priority}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 border-r border-gray-300">
                    <span className="font-medium text-gray-700">
                      {articleToMachineMap.get(`${order.id}|${article.id ?? article._id}`) ?? "—"}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-center border-r border-gray-300 text-gray-700">{planned.toLocaleString()}</td>
                  <td className="px-2 py-1.5 text-center border-r border-gray-300 text-blue-600 font-medium">{received.toLocaleString()}</td>
                  <td className="px-2 py-1.5 text-center border-r border-gray-300">
                    <span className="text-green-600 font-medium">{completed.toLocaleString()}</span>
                    {isOverproduction && <div className="text-[10px] text-orange-600">+{completed - planned}</div>}
                  </td>
                  <td className="px-2 py-1.5 text-center border-r border-gray-300 text-green-600 font-medium">{transferred.toLocaleString()}</td>
                  <td className="px-2 py-1.5 text-center border-r border-gray-300 text-orange-600 font-medium">{remaining.toLocaleString()}</td>
                  <td className="px-2 py-1.5 text-center border-r border-gray-300 bg-red-50">
                    {m4 > 0 ? <span className="text-red-600 font-medium">{m4.toLocaleString()}</span> : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-2 py-1.5 border-r border-gray-300">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusBadge(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100">
                      <ArticleProductImageButton factoryCode={article.articleNumber ?? ""} onClick={openProductImage} />
                      <button
                        type="button"
                        className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-400 border border-blue-100 rounded hover:bg-blue-100"
                        onClick={() => onViewOrder(order, article)}
                        title="View order"
                        aria-label={`View order ${formatArticleViewOrderLabel(order)}`}
                      >
                        <i className="ri-eye-line text-xs" aria-hidden />
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
            ? "No knitting lines to display."
            : "No articles with remaining quantity greater than zero. Turn on Show all to include lines with zero remaining."}
        </div>
      )}

      {!isLoading && filteredRows.length > 0 && (
        <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 mt-3">
          <div className="text-[11px] font-medium text-[#495057]">
            Showing {rangeStart} to {rangeEnd} of {filteredRows.length} articles
          </div>
          <div className="flex items-center gap-1" role="navigation" aria-label="Article pagination">
            <button
              type="button"
              onClick={() => handleArticlePageChange(safeArticlePage - 1)}
              disabled={safeArticlePage <= 1}
              className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30"
            >
              Prev
            </button>
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
                  className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded ${
                    safeArticlePage === pageNum ? "bg-purple-600 text-white shadow-md" : "text-gray-400 hover:bg-gray-50"
                  }`}
                  aria-label={`Page ${pageNum}`}
                  aria-current={safeArticlePage === pageNum ? "page" : undefined}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => handleArticlePageChange(safeArticlePage + 1)}
              disabled={safeArticlePage >= articleTotalPages}
              className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      )}
      {productImageModal}
    </div>
  );
}
