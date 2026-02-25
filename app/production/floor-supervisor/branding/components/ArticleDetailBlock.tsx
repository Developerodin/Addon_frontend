"use client";

import React from "react";
import type { ProductionArticleDetail, ArticleOrderRef } from "@/shared/services/productionService";

/**
 * Single article block for "View active article" drawer on Branding floor.
 * Shows branding floor quantities and type; Article complete button calls DELETE active-article.
 */
export default function ArticleDetailBlock({
  art,
  idx,
  onArticleComplete,
  completingArticleId,
}: {
  art: ProductionArticleDetail;
  idx: number;
  onArticleComplete?: (articleId: string) => void;
  completingArticleId?: string | null;
}) {
  const articleId = art._id ?? art.id ?? "";
  const isCompleting = completingArticleId === articleId;
  const order =
    typeof art.orderId === "object" && art.orderId && "orderNumber" in art.orderId
      ? (art.orderId as ArticleOrderRef)
      : null;
  const br = (art as any).floorQuantities?.branding;

  return (
    <div className="border border-gray-200 rounded overflow-hidden bg-gray-50/50">
      <div className="bg-gray-100 border-b border-gray-200 px-2 py-1">
        <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">Article #{idx + 1}</span>
        <span className="ml-2 text-[10px] text-gray-600">{art.articleNumber}</span>
      </div>
      <table className="w-full border-collapse text-[10px]">
        <tbody>
          <tr>
            <td className="border border-gray-200 px-1.5 py-0.5 w-24 font-medium text-gray-600 bg-gray-100">Article #</td>
            <td className="border border-gray-200 px-1.5 py-0.5">{art.articleNumber}</td>
          </tr>
          <tr>
            <td className="border border-gray-200 px-1.5 py-0.5 font-medium text-gray-600 bg-gray-100">Planned</td>
            <td className="border border-gray-200 px-1.5 py-0.5">{art.plannedQuantity}</td>
          </tr>
          <tr>
            <td className="border border-gray-200 px-1.5 py-0.5 font-medium text-gray-600 bg-gray-100">Linking type</td>
            <td className="border border-gray-200 px-1.5 py-0.5">{art.linkingType}</td>
          </tr>
          <tr>
            <td className="border border-gray-200 px-1.5 py-0.5 font-medium text-gray-600 bg-gray-100">Priority</td>
            <td className="border border-gray-200 px-1.5 py-0.5">{art.priority}</td>
          </tr>
          <tr>
            <td className="border border-gray-200 px-1.5 py-0.5 font-medium text-gray-600 bg-gray-100">Status</td>
            <td className="border border-gray-200 px-1.5 py-0.5">{art.status}</td>
          </tr>
          {br != null && (
            <>
              <tr>
                <td className="border border-gray-200 px-1.5 py-0.5 font-medium text-gray-600 bg-gray-100">Branding Rcv</td>
                <td className="border border-gray-200 px-1.5 py-0.5">{br.received ?? 0}</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-1.5 py-0.5 font-medium text-gray-600 bg-gray-100">Branding Trf</td>
                <td className="border border-gray-200 px-1.5 py-0.5">{br.transferred ?? 0}</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-1.5 py-0.5 font-medium text-gray-600 bg-gray-100">Branding Rem</td>
                <td className="border border-gray-200 px-1.5 py-0.5">{br.remaining ?? (br.received ?? 0) - (br.transferred ?? 0)}</td>
              </tr>
            </>
          )}
          {(art as any).brandingType && (
            <tr>
              <td className="border border-gray-200 px-1.5 py-0.5 font-medium text-gray-600 bg-gray-100">Branding type</td>
              <td className="border border-gray-200 px-1.5 py-0.5">{(art as any).brandingType}</td>
            </tr>
          )}
          {order && (
            <>
              <tr>
                <td colSpan={2} className="border border-gray-200 px-1.5 py-0.5 bg-gray-100 font-bold text-gray-700">Order</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-1.5 py-0.5 font-medium text-gray-600 bg-gray-100">Order #</td>
                <td className="border border-gray-200 px-1.5 py-0.5">{order.orderNumber ?? "—"}</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-1.5 py-0.5 font-medium text-gray-600 bg-gray-100">Priority</td>
                <td className="border border-gray-200 px-1.5 py-0.5">{order.priority ?? "—"}</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-1.5 py-0.5 font-medium text-gray-600 bg-gray-100">Status</td>
                <td className="border border-gray-200 px-1.5 py-0.5">{order.status ?? "—"}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>
      {onArticleComplete && articleId && (
        <div className="p-2 border-t border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => onArticleComplete(articleId)}
            disabled={isCompleting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isCompleting ? "..." : "Article complete"}
          </button>
        </div>
      )}
    </div>
  );
}
