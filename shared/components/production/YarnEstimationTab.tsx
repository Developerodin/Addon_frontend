"use client";
import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import yarnEstimationService, {
  SummaryOrder,
  OrderEstimation,
  ArticleEstimation,
  YarnIssuedReturned,
  YarnConsumption,
} from "@/shared/services/yarnEstimationService";

type View = "summary" | "order" | "article";

const fmt = (n?: number) => (n != null ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—");

const WeightCell: React.FC<{ data: YarnIssuedReturned | YarnConsumption | undefined; compact?: boolean }> = ({ data, compact }) => {
  if (!data) return <span className="text-gray-400">—</span>;
  const nw = data.netWeight ?? 0;
  const c = data.cones ?? 0;
  if (compact) return <span>{fmt(nw)} kg</span>;
  return (
    <div className="leading-tight">
      <span className="font-medium">{fmt(nw)} kg</span>
      {c > 0 && <span className="text-gray-400 ml-1 text-[10px]">({c} cones)</span>}
    </div>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cls: Record<string, string> = {
    Pending: "bg-yellow-100 text-yellow-800",
    "In Progress": "bg-blue-100 text-blue-800",
    Completed: "bg-green-100 text-green-800",
    "On Hold": "bg-red-100 text-red-800",
    Cancelled: "bg-gray-100 text-gray-800",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${cls[status] || "bg-gray-100 text-gray-800"}`}>
      {status}
    </span>
  );
};

const YarnEstimationTab: React.FC = () => {
  const [view, setView] = useState<View>("summary");

  // summary state
  const [summaryData, setSummaryData] = useState<SummaryOrder[]>([]);
  const [summaryPage, setSummaryPage] = useState(1);
  const [summaryLimit, setSummaryLimit] = useState(10);
  const [summaryTotalPages, setSummaryTotalPages] = useState(1);
  const [summaryTotal, setSummaryTotal] = useState(0);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // order detail state
  const [orderDetail, setOrderDetail] = useState<OrderEstimation | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);

  // article detail state
  const [articleDetail, setArticleDetail] = useState<ArticleEstimation | null>(null);
  const [articleLoading, setArticleLoading] = useState(false);

  // expanded rows in order detail
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set());

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await yarnEstimationService.getSummary({ page: summaryPage, limit: summaryLimit });
      setSummaryData(res.results);
      setSummaryTotalPages(res.totalPages);
      setSummaryTotal(res.totalResults);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load yarn estimation summary");
      setSummaryData([]);
    } finally {
      setSummaryLoading(false);
    }
  }, [summaryPage, summaryLimit]);

  useEffect(() => {
    if (view === "summary") loadSummary();
  }, [view, loadSummary]);

  const openOrder = async (orderId: string) => {
    setOrderLoading(true);
    setView("order");
    setExpandedArticles(new Set());
    try {
      const res = await yarnEstimationService.getByOrder(orderId);
      setOrderDetail(res);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load order estimation");
      setOrderDetail(null);
    } finally {
      setOrderLoading(false);
    }
  };

  const openArticle = async (articleId: string) => {
    setArticleLoading(true);
    setView("article");
    try {
      const res = await yarnEstimationService.getByArticle(articleId);
      setArticleDetail(res);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load article estimation");
      setArticleDetail(null);
    } finally {
      setArticleLoading(false);
    }
  };

  const goBack = () => {
    if (view === "article" && orderDetail) {
      setView("order");
    } else {
      setView("summary");
      setOrderDetail(null);
      setArticleDetail(null);
    }
  };

  const toggleArticle = (key: string) => {
    setExpandedArticles((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ─── Summary View ───
  const renderSummary = () => (
    <>
      <div className="p-[10px] mb-2 flex flex-wrap items-center gap-2">
        <select
          className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5"
          value={summaryLimit}
          onChange={(e) => { setSummaryLimit(Number(e.target.value)); setSummaryPage(1); }}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700"
          onClick={loadSummary}
          disabled={summaryLoading}
        >
          <i className={`ri-refresh-line text-xs ${summaryLoading ? "animate-spin" : ""}`}></i> Refresh
        </button>
      </div>

      {summaryLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
          <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading</p>
        </div>
      ) : summaryData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <i className="ri-inbox-line text-xl text-gray-200"></i>
          </div>
          <h3 className="text-xs font-bold text-gray-400 mb-1">NO ESTIMATION DATA</h3>
          <p className="text-[10px] text-gray-400">Yarn estimation data will appear once orders have yarn transactions.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="pl-[10px] pr-1 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Order</th>
                  <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Status</th>
                  <th className="px-1.5 py-2.5 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Articles</th>
                  <th className="px-1.5 py-2.5 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Issued (Net Wt)</th>
                  <th className="px-1.5 py-2.5 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Returned (Net Wt)</th>
                  <th className="px-1.5 py-2.5 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Consumption (Net Wt)</th>
                  <th className="px-1.5 py-2.5 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Action</th>
                </tr>
              </thead>
              <tbody>
                {summaryData.map((row) => (
                  <tr key={row.orderId} className="hover:bg-gray-50/50">
                    <td className="pl-[10px] pr-1 py-2.5 text-[12px] font-medium text-gray-900 border border-gray-300">
                      {row.orderNumber}
                    </td>
                    <td className="px-1.5 py-2.5 border border-gray-300">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-1.5 py-2.5 text-center text-[12px] text-gray-700 border border-gray-300">
                      {row.articleCount}
                    </td>
                    <td className="px-1.5 py-2.5 text-right text-[12px] text-gray-700 border border-gray-300">
                      <WeightCell data={row.issued} />
                    </td>
                    <td className="px-1.5 py-2.5 text-right text-[12px] text-gray-700 border border-gray-300">
                      <WeightCell data={row.returned} />
                    </td>
                    <td className="px-1.5 py-2.5 text-right text-[12px] font-semibold text-gray-900 border border-gray-300">
                      <WeightCell data={row.consumption} />
                    </td>
                    <td className="px-1.5 py-2.5 text-center border border-gray-300">
                      <button
                        className="w-7 h-7 inline-flex items-center justify-center bg-blue-50 text-blue-500 border border-blue-100 rounded hover:bg-blue-100"
                        onClick={() => openOrder(row.orderId)}
                        title="View order detail"
                      >
                        <i className="ri-eye-line text-xs"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100">
            <div className="text-[11px] font-medium text-[#495057]">
              Page {summaryPage} of {summaryTotalPages} &middot; {summaryTotal} order(s)
            </div>
            <div className="flex items-center gap-1">
              <button className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30" onClick={() => setSummaryPage((p) => Math.max(1, p - 1))} disabled={summaryPage <= 1}>Prev</button>
              <span className="px-2 text-[11px] text-gray-500">{summaryPage}</span>
              <button className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30" onClick={() => setSummaryPage((p) => Math.min(summaryTotalPages, p + 1))} disabled={summaryPage >= summaryTotalPages}>Next</button>
            </div>
          </div>
        </>
      )}
    </>
  );

  // ─── Order Detail View ───
  const renderOrderDetail = () => {
    if (orderLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
          <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading order</p>
        </div>
      );
    }
    if (!orderDetail) {
      return <div className="p-6 text-center text-sm text-gray-400">No order data found.</div>;
    }

    const { orderNumber, status, articles, orderTotals } = orderDetail;
    return (
      <>
        {/* breadcrumb + order header */}
        <div className="p-[10px] flex flex-wrap items-center gap-3 border-b border-gray-100">
          <button onClick={goBack} className="flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:underline">
            <i className="ri-arrow-left-s-line text-sm"></i> Back
          </button>
          <div className="w-px h-4 bg-gray-200" />
          <span className="text-[12px] font-bold text-gray-800">{orderNumber}</span>
          <StatusBadge status={status} />
        </div>

        {/* order totals cards */}
        <div className="p-[10px] grid grid-cols-3 gap-2">
          <div className="bg-blue-50 border border-blue-100 rounded p-2">
            <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-1">Issued</div>
            <div className="text-sm font-bold text-blue-900">{fmt(orderTotals?.issued?.netWeight)} kg</div>
            <div className="text-[10px] text-blue-600">{fmt(orderTotals?.issued?.cones)} cones</div>
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded p-2">
            <div className="text-[10px] font-bold text-orange-700 uppercase tracking-wide mb-1">Returned</div>
            <div className="text-sm font-bold text-orange-900">{fmt(orderTotals?.returned?.netWeight)} kg</div>
            <div className="text-[10px] text-orange-600">{fmt(orderTotals?.returned?.cones)} cones</div>
          </div>
          <div className="bg-green-50 border border-green-100 rounded p-2">
            <div className="text-[10px] font-bold text-green-700 uppercase tracking-wide mb-1">Consumption</div>
            <div className="text-sm font-bold text-green-900">{fmt(orderTotals?.consumption?.netWeight)} kg</div>
            <div className="text-[10px] text-green-600">{fmt(orderTotals?.consumption?.cones)} cones</div>
          </div>
        </div>

        {/* articles accordion */}
        <div className="px-[10px] pb-[10px]">
          {articles.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">No articles in this order.</p>
          ) : (
            <div className="space-y-1">
              {articles.map((art) => {
                const key = art.articleId || art.articleNumber;
                const isOpen = expandedArticles.has(key);
                return (
                  <div key={key} className="border border-gray-200 rounded overflow-hidden">
                    {/* article header */}
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 text-left"
                      onClick={() => toggleArticle(key)}
                    >
                      <div className="flex items-center gap-3">
                        <i className={`ri-arrow-${isOpen ? "down" : "right"}-s-line text-gray-400`}></i>
                        <span className="text-[12px] font-bold text-gray-800">{art.articleNumber}</span>
                        <span className="text-[10px] text-gray-500">Qty {art.plannedQuantity?.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-4 text-[11px]">
                        <span className="text-blue-600">I: {fmt(art.totals?.issued?.netWeight)} kg</span>
                        <span className="text-orange-600">R: {fmt(art.totals?.returned?.netWeight)} kg</span>
                        <span className="text-green-700 font-semibold">C: {fmt(art.totals?.consumption?.netWeight)} kg</span>
                        {art.articleId && (
                          <button
                            className="w-6 h-6 inline-flex items-center justify-center bg-blue-50 text-blue-500 border border-blue-100 rounded hover:bg-blue-100"
                            onClick={(e) => { e.stopPropagation(); openArticle(art.articleId!); }}
                            title="View article detail"
                          >
                            <i className="ri-external-link-line text-[10px]"></i>
                          </button>
                        )}
                      </div>
                    </button>

                    {/* yarn breakdown */}
                    {isOpen && (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-[11px]">
                          <thead>
                            <tr className="bg-white">
                              <th className="pl-8 pr-2 py-2 text-left font-bold text-[#495057] uppercase tracking-wider border-t border-gray-200">Yarn</th>
                              <th className="px-2 py-2 text-right font-bold text-[#495057] uppercase tracking-wider border-t border-gray-200">BOM Qty</th>
                              <th className="px-2 py-2 text-right font-bold text-[#495057] uppercase tracking-wider border-t border-gray-200">Issued</th>
                              <th className="px-2 py-2 text-right font-bold text-[#495057] uppercase tracking-wider border-t border-gray-200">Returned</th>
                              <th className="px-2 py-2 text-right font-bold text-[#495057] uppercase tracking-wider border-t border-gray-200">Consumption</th>
                            </tr>
                          </thead>
                          <tbody>
                            {art.yarns.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="px-8 py-4 text-center text-gray-400">No yarn data</td>
                              </tr>
                            ) : (
                              art.yarns.map((y, yi) => (
                                <tr key={yi} className="hover:bg-gray-50/50">
                                  <td className="pl-8 pr-2 py-1.5 text-gray-800 border-t border-gray-100">{y.yarnName}</td>
                                  <td className="px-2 py-1.5 text-right text-gray-600 border-t border-gray-100">{fmt(y.bomQuantity)}</td>
                                  <td className="px-2 py-1.5 text-right border-t border-gray-100"><WeightCell data={y.issued} /></td>
                                  <td className="px-2 py-1.5 text-right border-t border-gray-100"><WeightCell data={y.returned} /></td>
                                  <td className="px-2 py-1.5 text-right font-semibold border-t border-gray-100"><WeightCell data={y.consumption} /></td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </>
    );
  };

  // ─── Article Detail View ───
  const renderArticleDetail = () => {
    if (articleLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
          <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading article</p>
        </div>
      );
    }
    if (!articleDetail) {
      return <div className="p-6 text-center text-sm text-gray-400">No article data found.</div>;
    }

    const { articleNumber, plannedQuantity, yarns, totals } = articleDetail;
    return (
      <>
        <div className="p-[10px] flex flex-wrap items-center gap-3 border-b border-gray-100">
          <button onClick={goBack} className="flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:underline">
            <i className="ri-arrow-left-s-line text-sm"></i> Back
          </button>
          <div className="w-px h-4 bg-gray-200" />
          <span className="text-[12px] font-bold text-gray-800">{articleNumber}</span>
          <span className="text-[10px] text-gray-500">Planned Qty: {plannedQuantity?.toLocaleString()}</span>
        </div>

        <div className="p-[10px] grid grid-cols-3 gap-2">
          <div className="bg-blue-50 border border-blue-100 rounded p-2">
            <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-1">Issued</div>
            <div className="text-sm font-bold text-blue-900">{fmt(totals?.issued?.netWeight)} kg</div>
            <div className="text-[10px] text-blue-600">{fmt(totals?.issued?.cones)} cones</div>
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded p-2">
            <div className="text-[10px] font-bold text-orange-700 uppercase tracking-wide mb-1">Returned</div>
            <div className="text-sm font-bold text-orange-900">{fmt(totals?.returned?.netWeight)} kg</div>
            <div className="text-[10px] text-orange-600">{fmt(totals?.returned?.cones)} cones</div>
          </div>
          <div className="bg-green-50 border border-green-100 rounded p-2">
            <div className="text-[10px] font-bold text-green-700 uppercase tracking-wide mb-1">Consumption</div>
            <div className="text-sm font-bold text-green-900">{fmt(totals?.consumption?.netWeight)} kg</div>
            <div className="text-[10px] text-green-600">{fmt(totals?.consumption?.cones)} cones</div>
          </div>
        </div>

        <div className="px-[10px] pb-[10px] overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="pl-[10px] pr-2 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Yarn</th>
                <th className="px-2 py-2.5 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">BOM Qty</th>
                <th className="px-2 py-2.5 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Issued (kg)</th>
                <th className="px-2 py-2.5 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Issued (cones)</th>
                <th className="px-2 py-2.5 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Returned (kg)</th>
                <th className="px-2 py-2.5 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Returned (cones)</th>
                <th className="px-2 py-2.5 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Consumption (kg)</th>
                <th className="px-2 py-2.5 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Consumption (cones)</th>
              </tr>
            </thead>
            <tbody>
              {yarns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">No yarn data</td>
                </tr>
              ) : (
                yarns.map((y, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="pl-[10px] pr-2 py-2 text-[12px] font-medium text-gray-900 border border-gray-300">{y.yarnName}</td>
                    <td className="px-2 py-2 text-right text-[12px] text-gray-600 border border-gray-300">{fmt(y.bomQuantity)}</td>
                    <td className="px-2 py-2 text-right text-[12px] text-gray-700 border border-gray-300">{fmt(y.issued?.netWeight)}</td>
                    <td className="px-2 py-2 text-right text-[12px] text-gray-700 border border-gray-300">{fmt(y.issued?.cones)}</td>
                    <td className="px-2 py-2 text-right text-[12px] text-gray-700 border border-gray-300">{fmt(y.returned?.netWeight)}</td>
                    <td className="px-2 py-2 text-right text-[12px] text-gray-700 border border-gray-300">{fmt(y.returned?.cones)}</td>
                    <td className="px-2 py-2 text-right text-[12px] font-semibold text-gray-900 border border-gray-300">{fmt(y.consumption?.netWeight)}</td>
                    <td className="px-2 py-2 text-right text-[12px] font-semibold text-gray-900 border border-gray-300">{fmt(y.consumption?.cones)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  return (
    <div>
      {view === "summary" && renderSummary()}
      {view === "order" && renderOrderDetail()}
      {view === "article" && renderArticleDetail()}
    </div>
  );
};

export default YarnEstimationTab;
