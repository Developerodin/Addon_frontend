"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  productionService,
  type ArticleProcess,
} from "@/shared/services/productionService";
import {
  floorHasActivity,
  floorKeyHasQualityMetrics,
  getFloorKeyDisplayName,
  resolveArticleDisplayFloorKeys,
  type LinkingType,
} from "@/shared/utils/productionUtils";
import { downloadOrderArticlesExcel } from "./orderViewExcelExport";

interface FloorQuantityData {
  received?: number;
  completed?: number;
  remaining?: number;
  transferred?: number;
  m1Quantity?: number;
  m2Quantity?: number;
  m3Quantity?: number;
  m4Quantity?: number;
  repairStatus?: string;
  repairRemarks?: string;
}

export interface OrderViewOrderInfo {
  id: string;
  orderNumber?: string;
  priority: string;
  status: string;
  currentFloor?: string;
  floor?: string;
  orderNote?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderViewArticle {
  id: string;
  _id?: string;
  articleNumber: string;
  plannedQuantity: number;
  completedQuantity?: number;
  linkingType: string;
  priority: string;
  status: string;
  progress: number;
  currentFloor: string;
  finalQualityConfirmed?: boolean;
  remarks?: string;
  knittingCode?: string;
  createdAt?: string;
  updatedAt?: string;
  floorQuantities?: Record<string, FloorQuantityData>;
}

interface OrderViewArticlesTabProps {
  order: OrderViewOrderInfo;
  articles: OrderViewArticle[];
  getStatusBadge: (status: string) => string;
  getPriorityBadge: (priority: string) => string;
  getFloorBadge: (floor: string) => string;
  onViewLogs: (article: OrderViewArticle) => void;
  onSelectArticle?: (article: OrderViewArticle) => void;
  selectedArticleId?: string | null;
}

/**
 * Computes article progress percentage from API or planned/completed quantities.
 */
function calculateProgress(article: OrderViewArticle): number {
  if (article.progress !== undefined) return article.progress;
  if (!article.plannedQuantity) return 0;
  return Math.round(((article.completedQuantity || 0) / article.plannedQuantity) * 100);
}

/**
 * Returns floor keys for an article using process route + floorQuantities fallback.
 */
function getFloorKeysForArticle(
  article: OrderViewArticle,
  processesByArticleId: Record<string, ArticleProcess[]>
): string[] {
  const articleId = article._id || article.id;
  return resolveArticleDisplayFloorKeys(
    article.floorQuantities,
    processesByArticleId[articleId],
    article.linkingType as LinkingType
  );
}

/**
 * Compact, Excel-style articles tab with full floor-wise progress for admins.
 */
const OrderViewArticlesTab: React.FC<OrderViewArticlesTabProps> = ({
  order,
  articles,
  getStatusBadge,
  getPriorityBadge,
  getFloorBadge,
  onViewLogs,
  onSelectArticle,
  selectedArticleId,
}) => {
  const [processesByArticleId, setProcessesByArticleId] = useState<Record<string, ArticleProcess[]>>({});
  const [loadingProcesses, setLoadingProcesses] = useState(false);
  const [expandedArticleIds, setExpandedArticleIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpandedArticleIds(new Set(articles.map((article) => article._id || article.id)));
  }, [articles]);

  useEffect(() => {
    let cancelled = false;

    const loadProcesses = async () => {
      setLoadingProcesses(true);
      try {
        const results = await Promise.all(
          articles.map(async (article) => {
            const articleId = article._id || article.id;
            try {
              const response = await productionService.getArticleProcesses(articleId);
              return {
                articleId,
                processes: response.success ? response.data?.processes ?? [] : [],
              };
            } catch {
              return { articleId, processes: [] as ArticleProcess[] };
            }
          })
        );

        if (!cancelled) {
          setProcessesByArticleId(
            Object.fromEntries(results.map(({ articleId, processes }) => [articleId, processes]))
          );
        }
      } finally {
        if (!cancelled) setLoadingProcesses(false);
      }
    };

    if (articles.length) void loadProcesses();
    else setProcessesByArticleId({});

    return () => {
      cancelled = true;
    };
  }, [articles]);

  const showQualityColumns = useMemo(() => {
    return articles.some((article) =>
      getFloorKeysForArticle(article, processesByArticleId).some((key) => floorKeyHasQualityMetrics(key))
    );
  }, [articles, processesByArticleId]);

  /** Toggle expanded floor breakdown for one article. */
  const toggleExpand = (article: OrderViewArticle) => {
    const articleId = article._id || article.id;
    setExpandedArticleIds((prev) => {
      const next = new Set(prev);
      if (next.has(articleId)) next.delete(articleId);
      else next.add(articleId);
      return next;
    });
    onSelectArticle?.(article);
  };

  /** Expand floor breakdown for every article in the order. */
  const handleExpandAll = () => {
    setExpandedArticleIds(new Set(articles.map((article) => article._id || article.id)));
  };

  /** Collapse all floor breakdown rows. */
  const handleCollapseAll = () => {
    setExpandedArticleIds(new Set());
  };

  const allExpanded = articles.length > 0 && expandedArticleIds.size === articles.length;

  const handleExportExcel = () => {
    if (loadingProcesses) {
      toast.error("Process routes are still loading. Please wait a moment.");
      return;
    }
    downloadOrderArticlesExcel(order, articles, processesByArticleId);
  };

  if (!articles.length) {
    return (
      <div className="py-10 text-center text-[11px] text-gray-500" role="status">
        No articles in this order
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium text-[#495057]">
          {articles.length} article{articles.length !== 1 ? "s" : ""}
        </span>
        {loadingProcesses && (
          <span className="text-[10px] text-gray-400">Loading process routes…</span>
        )}
        <button
          type="button"
          onClick={allExpanded ? handleCollapseAll : handleExpandAll}
          className="px-2 py-1 text-[10px] font-bold rounded border border-gray-200 bg-white hover:bg-gray-50"
          aria-pressed={allExpanded}
        >
          {allExpanded ? "Collapse floors" : "Expand all floors"}
        </button>
        <button
          type="button"
          onClick={handleExportExcel}
          disabled={!articles.length || loadingProcesses}
          className="ml-auto flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-300 text-[#495057] text-[10px] font-bold rounded hover:bg-gray-50 disabled:opacity-50"
          aria-label="Download order articles Excel workbook"
        >
          <i className="ri-file-excel-2-line text-xs text-emerald-600" aria-hidden="true" />
          Excel
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded">
        <table className="w-full border-collapse text-[11px]" aria-label="Order articles">
          <thead>
            <tr className="bg-gray-50/80">
              <th className="pl-2 pr-1 py-2 text-left font-bold text-[#495057] uppercase tracking-wide border border-gray-200 w-6" aria-label="Expand" />
              <th className="px-1 py-2 text-left font-bold text-[#495057] uppercase tracking-wide border border-gray-200">Article</th>
              <th className="px-1 py-2 text-left font-bold text-[#495057] uppercase tracking-wide border border-gray-200">Linking</th>
              <th className="px-1 py-2 text-center font-bold text-[#495057] uppercase tracking-wide border border-gray-200">Planned</th>
              <th className="px-1 py-2 text-center font-bold text-[#495057] uppercase tracking-wide border border-gray-200">Done</th>
              <th className="px-1 py-2 text-center font-bold text-[#495057] uppercase tracking-wide border border-gray-200">Prog</th>
              <th className="px-1 py-2 text-left font-bold text-[#495057] uppercase tracking-wide border border-gray-200">Status</th>
              <th className="px-1 py-2 text-left font-bold text-[#495057] uppercase tracking-wide border border-gray-200">Floor</th>
              <th className="px-1 py-2 text-right pr-2 font-bold text-[#495057] uppercase tracking-wide border border-gray-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article) => {
              const articleId = article._id || article.id;
              const isExpanded = expandedArticleIds.has(articleId);
              const isSelected = selectedArticleId === articleId;
              const floorKeys = getFloorKeysForArticle(article, processesByArticleId);
              const progress = calculateProgress(article);
              const activeFloorCount = floorKeys.filter((key) =>
                floorHasActivity(article.floorQuantities?.[key])
              ).length;

              return (
                <React.Fragment key={articleId}>
                  <tr
                    className={`cursor-pointer hover:bg-gray-50/60 ${isSelected || isExpanded ? "bg-primary/5" : ""}`}
                    onClick={() => toggleExpand(article)}
                  >
                    <td className="pl-2 pr-0 py-1.5 border border-gray-200 text-gray-400">
                      <i className={`ri-arrow-${isExpanded ? "down" : "right"}-s-line text-sm`} aria-hidden="true" />
                    </td>
                    <td className="px-1 py-1.5 border border-gray-200">
                      <div className="font-bold text-gray-900">{article.articleNumber || "—"}</div>
                      <span className={`inline-flex mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium ${getPriorityBadge(article.priority || "Unknown")}`}>
                        {article.priority || "—"}
                      </span>
                    </td>
                    <td className="px-1 py-1.5 border border-gray-200 text-gray-600">{article.linkingType || "N/A"}</td>
                    <td className="px-1 py-1.5 border border-gray-200 text-center font-medium">{(article.plannedQuantity ?? 0).toLocaleString()}</td>
                    <td className="px-1 py-1.5 border border-gray-200 text-center font-medium">{(article.completedQuantity ?? 0).toLocaleString()}</td>
                    <td className="px-1 py-1.5 border border-gray-200 text-center font-medium">{progress}%</td>
                    <td className="px-1 py-1.5 border border-gray-200">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-medium ${getStatusBadge(article.status || "Unknown")}`}>
                        {article.status || "—"}
                      </span>
                    </td>
                    <td className="px-1 py-1.5 border border-gray-200">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-medium ${getFloorBadge(article.currentFloor || "Unknown")}`}>
                        {article.currentFloor || "—"}
                      </span>
                      <div className="text-[9px] text-gray-400 mt-0.5">{activeFloorCount}/{floorKeys.length} floors active</div>
                    </td>
                    <td className="px-1 py-1.5 pr-2 border border-gray-200 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewLogs(article);
                        }}
                        className="px-2 py-0.5 text-[10px] font-bold rounded border border-gray-200 bg-white hover:bg-gray-50"
                        aria-label={`View logs for ${article.articleNumber}`}
                      >
                        Logs
                      </button>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr>
                      <td colSpan={9} className="p-0 border border-gray-200 bg-gray-50/40">
                        <div className="px-2 py-1 text-[9px] text-gray-500 border-b border-gray-200">
                          Floor-wise progress · {floorKeys.length} floor{floorKeys.length !== 1 ? "s" : ""} in route
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-[10px]" aria-label={`Floor progress for ${article.articleNumber}`}>
                            <thead>
                              <tr className="bg-white">
                                <th className="pl-3 pr-1 py-1.5 text-left font-bold text-gray-600 border-b border-gray-200">Floor</th>
                                <th className="px-1 py-1.5 text-center font-bold text-gray-600 border-b border-gray-200">Rcv</th>
                                <th className="px-1 py-1.5 text-center font-bold text-gray-600 border-b border-gray-200">Done</th>
                                <th className="px-1 py-1.5 text-center font-bold text-gray-600 border-b border-gray-200">Rem</th>
                                <th className="px-1 py-1.5 text-center font-bold text-gray-600 border-b border-gray-200">Trf</th>
                                {showQualityColumns && (
                                  <>
                                    <th className="px-1 py-1.5 text-center font-bold text-green-700 border-b border-gray-200">M1</th>
                                    <th className="px-1 py-1.5 text-center font-bold text-yellow-700 border-b border-gray-200">M2</th>
                                    <th className="px-1 py-1.5 text-center font-bold text-orange-700 border-b border-gray-200">M3</th>
                                    <th className="px-1 py-1.5 text-center font-bold text-red-700 border-b border-gray-200">M4</th>
                                  </>
                                )}
                                <th className="px-1 py-1.5 text-left font-bold text-gray-600 border-b border-gray-200 pr-3">Repair</th>
                              </tr>
                            </thead>
                            <tbody>
                              {floorKeys.map((floorKey) => {
                                const data = article.floorQuantities?.[floorKey];
                                const hasQuality = floorKeyHasQualityMetrics(floorKey);
                                const received = data?.received ?? 0;
                                const completed = data?.completed ?? 0;
                                const transferred = data?.transferred ?? 0;
                                const remaining = data?.remaining ?? Math.max(0, received - transferred);
                                const hasActivity = floorHasActivity(data);
                                const currentNorm = (article.currentFloor ?? "").toLowerCase().replace(/\s+/g, "");
                                const floorDisplayNorm = getFloorKeyDisplayName(floorKey).toLowerCase().replace(/\s+/g, "");
                                const isCurrentFloor =
                                  floorDisplayNorm === currentNorm || floorKey.toLowerCase() === currentNorm;

                                return (
                                  <tr
                                    key={floorKey}
                                    className={
                                      isCurrentFloor
                                        ? "bg-primary/10 font-medium"
                                        : hasActivity
                                          ? ""
                                          : "text-gray-400"
                                    }
                                  >
                                    <td className="pl-3 pr-1 py-1 border-b border-gray-100">
                                      {getFloorKeyDisplayName(floorKey)}
                                      {isCurrentFloor && (
                                        <span className="ml-1 text-[8px] uppercase text-primary font-bold">Now</span>
                                      )}
                                    </td>
                                    <td className="px-1 py-1 text-center border-b border-gray-100">{received.toLocaleString()}</td>
                                    <td className="px-1 py-1 text-center border-b border-gray-100">{completed.toLocaleString()}</td>
                                    <td className="px-1 py-1 text-center border-b border-gray-100">{remaining.toLocaleString()}</td>
                                    <td className="px-1 py-1 text-center border-b border-gray-100">{transferred.toLocaleString()}</td>
                                    {showQualityColumns && (
                                      <>
                                        <td className="px-1 py-1 text-center border-b border-gray-100">{hasQuality ? (data?.m1Quantity ?? 0) : "—"}</td>
                                        <td className="px-1 py-1 text-center border-b border-gray-100">{hasQuality ? (data?.m2Quantity ?? 0) : "—"}</td>
                                        <td className="px-1 py-1 text-center border-b border-gray-100">{hasQuality ? (data?.m3Quantity ?? 0) : "—"}</td>
                                        <td className="px-1 py-1 text-center border-b border-gray-100">{hasQuality ? (data?.m4Quantity ?? 0) : "—"}</td>
                                      </>
                                    )}
                                    <td className="px-1 py-1 pr-3 border-b border-gray-100 text-[9px] text-gray-600">
                                      {data?.repairStatus || "—"}
                                      {data?.repairRemarks ? ` · ${data.repairRemarks}` : ""}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        {(article.remarks || article.finalQualityConfirmed !== undefined) && (
                          <div className="px-3 py-1.5 text-[10px] text-gray-600 border-t border-gray-200 flex flex-wrap gap-3">
                            {article.finalQualityConfirmed !== undefined && (
                              <span>
                                Final QC:{" "}
                                <span className={article.finalQualityConfirmed ? "text-green-700 font-medium" : "text-yellow-700 font-medium"}>
                                  {article.finalQualityConfirmed ? "Confirmed" : "Pending"}
                                </span>
                              </span>
                            )}
                            {article.remarks && <span>Remarks: {article.remarks}</span>}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderViewArticlesTab;
