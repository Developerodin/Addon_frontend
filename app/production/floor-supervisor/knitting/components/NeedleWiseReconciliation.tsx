"use client";

import React from "react";
import type {
  NeedleWiseReconciliation as Reconciliation,
} from "../utils/needleWiseProduction";
import type { UnplannedKnitArticle } from "@/shared/services/productionService";

export interface NeedleWiseReconciliationProps {
  reconciliation: Reconciliation;
  /** Every unplanned article, largest qty first. */
  unplannedArticles: UnplannedKnitArticle[];
  /** Leftover on articles whose production order was deleted. Not pending. */
  orphanPendingQty?: number;
  orphanArticleCount?: number;
  /** Articles dropped from order.articles but still carrying leftover remaining. */
  droppedFromOrderPendingQty?: number;
  droppedFromOrderArticleCount?: number;
}

/** One label / value line of the reconciliation. */
function Line({
  label,
  value,
  hint,
  tone = "text-gray-800",
  bold = false,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <span className={`text-[11px] ${bold ? "font-bold text-gray-900" : "font-medium text-gray-600"}`}>
        {label}
        {hint ? <span className="ml-1.5 text-[10px] font-normal text-gray-400">{hint}</span> : null}
      </span>
      <span className={`text-[12px] tabular-nums ${bold ? "font-bold" : "font-medium"} ${tone}`}>
        {value}
      </span>
    </div>
  );
}

/**
 * Full unplanned-article table so a supervisor can tick each row against the
 * Production Order Summary (article + order number + order name).
 */
function UnplannedArticlesTable({
  articles,
  totalQty,
}: {
  articles: UnplannedKnitArticle[];
  totalQty: number;
}) {
  if (articles.length === 0) {
    return (
      <p className="text-[11px] font-medium text-emerald-700">
        <i className="ri-check-line mr-1" aria-hidden="true" />
        Every pending article is assigned to a machine.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto overflow-y-auto max-h-[420px] border border-indigo-200 rounded">
      <table className="w-full border-collapse min-w-full">
        <caption className="sr-only">
          Articles with knitting remaining that are not assigned to any machine
        </caption>
        <thead className="sticky top-0 bg-indigo-100">
          <tr>
            <th
              scope="col"
              className="px-2 py-1.5 text-left text-[10px] font-bold text-indigo-900 uppercase tracking-wider border-b border-indigo-200"
            >
              Article
            </th>
            <th
              scope="col"
              className="px-2 py-1.5 text-left text-[10px] font-bold text-indigo-900 uppercase tracking-wider border-b border-indigo-200"
            >
              Order no
            </th>
            <th
              scope="col"
              className="px-2 py-1.5 text-left text-[10px] font-bold text-indigo-900 uppercase tracking-wider border-b border-indigo-200"
            >
              Order name
            </th>
            <th
              scope="col"
              className="px-2 py-1.5 text-right text-[10px] font-bold text-indigo-900 uppercase tracking-wider border-b border-indigo-200"
            >
              Qty
            </th>
          </tr>
        </thead>
        <tbody>
          {articles.map((article) => (
            <tr key={article.articleId} className="odd:bg-white even:bg-indigo-50/40">
              <th
                scope="row"
                className="px-2 py-1.5 text-left text-[11px] font-bold text-gray-800 whitespace-nowrap"
              >
                {article.articleNumber || article.articleId}
              </th>
              <td className="px-2 py-1.5 text-[11px] font-medium text-gray-800 whitespace-nowrap">
                {article.orderNumber || "—"}
              </td>
              <td
                className="px-2 py-1.5 text-[11px] text-gray-700 max-w-[220px] truncate"
                title={article.orderNote || undefined}
              >
                {article.orderNote || "—"}
              </td>
              <td className="px-2 py-1.5 text-right text-[11px] font-bold tabular-nums text-indigo-800 whitespace-nowrap">
                {article.qty.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-indigo-100 font-bold">
            <th
              scope="row"
              colSpan={3}
              className="px-2 py-1.5 text-left text-[11px] text-indigo-900"
            >
              Total ({articles.length} article{articles.length === 1 ? "" : "s"})
            </th>
            <td className="px-2 py-1.5 text-right text-[11px] tabular-nums text-indigo-900">
              {totalQty.toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/**
 * Explains why this tab's needle-row total is lower than the Production Order
 * Summary, and lists every unplanned article for a row-by-row check.
 */
export default function NeedleWiseReconciliation({
  reconciliation,
  unplannedArticles,
  orphanPendingQty = 0,
  orphanArticleCount = 0,
  droppedFromOrderPendingQty = 0,
  droppedFromOrderArticleCount = 0,
}: NeedleWiseReconciliationProps) {
  const { onMachineQty, unplannedQty, totalPendingQty, unplannedArticleCount, hasUnplannedData } =
    reconciliation;

  if (!hasUnplannedData) {
    return (
      <div
        className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2"
        role="status"
        aria-live="polite"
      >
        <p className="text-[11px] font-medium text-amber-800">
          <i className="ri-error-warning-line mr-1" aria-hidden="true" />
          Unplanned pending qty could not be loaded, so this table shows only work already on a machine.
          It will read lower than the Production Order Summary.
        </p>
      </div>
    );
  }

  return (
    <section className="mt-3 grid gap-3" aria-labelledby="needle-wise-recon-title">
      <div className="rounded border border-gray-300 bg-white p-3">
        <h4 id="needle-wise-recon-title" className="mb-1 text-[11px] font-bold text-gray-800">
          Reconciliation with Production Order Summary
        </h4>
        <Line label="On machines" value={onMachineQty.toLocaleString()} hint="sum of needle rows above" />
        <Line
          label="Unplanned"
          value={unplannedQty.toLocaleString()}
          hint={`${unplannedArticleCount} article${unplannedArticleCount === 1 ? "" : "s"}, no machine yet`}
          tone="text-indigo-700"
        />
        <div className="mt-1 border-t border-gray-200 pt-1">
          <Line
            label="Total knit pending"
            value={totalPendingQty.toLocaleString()}
            hint="matches Order Summary"
            tone="text-amber-800"
            bold
          />
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-gray-500">
          Unplanned work has no needle, so it cannot appear in the table above. Assign it to a machine and
          it moves into the matching needle row.
        </p>
        {orphanArticleCount > 0 ? (
          <p className="mt-2 text-[10px] leading-relaxed text-amber-800" role="note">
            Excluded {orphanArticleCount} article{orphanArticleCount === 1 ? "" : "s"} (
            {orphanPendingQty.toLocaleString()} pcs) whose production order no longer exists — same
            population as Order Summary.
          </p>
        ) : null}
        {droppedFromOrderArticleCount > 0 ? (
          <p className="mt-2 text-[10px] leading-relaxed text-amber-800" role="note">
            Excluded {droppedFromOrderArticleCount} article
            {droppedFromOrderArticleCount === 1 ? "" : "s"} (
            {droppedFromOrderPendingQty.toLocaleString()} pcs) that still have an orderId but were
            removed from the order&apos;s article list (they do not appear on the order screen).
          </p>
        ) : null}
      </div>

      <div className="rounded border border-indigo-200 bg-indigo-50/40 p-3">
        <h4 className="mb-1.5 text-[11px] font-bold text-indigo-900">
          Needs planning
          {unplannedArticleCount > 0 ? (
            <span className="ml-1.5 font-medium text-indigo-600">
              ({unplannedArticleCount} article{unplannedArticleCount === 1 ? "" : "s"})
            </span>
          ) : null}
        </h4>
        <UnplannedArticlesTable articles={unplannedArticles} totalQty={unplannedQty} />
      </div>
    </section>
  );
}
