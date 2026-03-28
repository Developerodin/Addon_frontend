"use client";

import React from "react";
import type { ProductionArticleDetail, ArticleOrderRef, ArticleMachineRef } from "@/shared/services/productionService";

/** Active-article drawer block for Dispatch floor (dispatch floor quantities). */
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
  const machine =
    typeof art.machineId === "object" && art.machineId && "machineCode" in art.machineId
      ? (art.machineId as ArticleMachineRef)
      : null;
  const fc = (art as any).floorQuantities?.dispatch;

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
          {fc != null && (
            <>
              <tr>
                <td className="border border-gray-200 px-1.5 py-0.5 font-medium text-gray-600 bg-gray-100">Dispatch Rcv</td>
                <td className="border border-gray-200 px-1.5 py-0.5">{fc.received}</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-1.5 py-0.5 font-medium text-gray-600 bg-gray-100">Dispatch Rem</td>
                <td className="border border-gray-200 px-1.5 py-0.5">{fc.remaining ?? (fc.received - (fc.transferred ?? 0))}</td>
              </tr>
              {fc.m1Quantity != null && (
                <tr>
                  <td className="border border-gray-200 px-1.5 py-0.5 font-medium text-gray-600 bg-gray-100">M1 (Good)</td>
                  <td className="border border-gray-200 px-1.5 py-0.5">{fc.m1Quantity}</td>
                </tr>
              )}
            </>
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
          {machine && (
            <>
              <tr>
                <td colSpan={2} className="border border-gray-200 px-1.5 py-0.5 bg-gray-100 font-bold text-gray-700">Machine</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-1.5 py-0.5 font-medium text-gray-600 bg-gray-100">Code</td>
                <td className="border border-gray-200 px-1.5 py-0.5">{machine.machineCode ?? "—"}</td>
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
