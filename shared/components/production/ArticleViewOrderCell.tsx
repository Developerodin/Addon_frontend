"use client";

import type { ProductionOrder } from "@/shared/services/productionService";

export interface ArticleViewOrderCellProps {
  order: Pick<ProductionOrder, "id" | "orderNumber" | "orderNote">;
}

/**
 * Renders order number/id and optional order note in Article view table cells.
 */
export function ArticleViewOrderCell({ order }: ArticleViewOrderCellProps) {
  const orderLabel = order.orderNumber ?? order.id ?? "—";
  const orderNote = order.orderNote?.trim();

  return (
    <>
      <div className="text-[12px] font-medium text-gray-800">{orderLabel}</div>
      {orderNote ? <div className="text-[10px] text-gray-500">({orderNote})</div> : null}
    </>
  );
}

/**
 * Builds a single-line order label for exports and aria labels.
 */
export function formatArticleViewOrderLabel(
  order: Pick<ProductionOrder, "id" | "orderNumber" | "orderNote">
): string {
  const orderLabel = order.orderNumber ?? order.id ?? "—";
  const orderNote = order.orderNote?.trim();
  return orderNote ? `${orderLabel} (${orderNote})` : orderLabel;
}
