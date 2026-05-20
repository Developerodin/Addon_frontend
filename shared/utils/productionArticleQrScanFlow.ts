import { toast } from "react-hot-toast";
import type { Article, ProductionOrder } from "@/shared/services/productionService";
import {
  findProductionArticleInOrders,
  isArticleAvailableOnFloor,
  parseProductionArticleQr,
  productionArticleRowKey,
  tryHandleProductionArticleQrScan,
  type ArticleQrScanResult,
  type ProductionArticleFloorKey,
} from "@/shared/utils/productionArticleQr";

export type ArticleQrScanHighlightPayload = Extract<
  ArticleQrScanResult,
  { handled: true }
>;

export type ArticleQrScanFeedbackType = "success" | "error" | "info";

export interface ArticleQrScanFeedback {
  type: ArticleQrScanFeedbackType;
  message: string;
}

export type ArticleQrResolveResult =
  | { status: "invalid_qr"; feedback: ArticleQrScanFeedback }
  | { status: "api_error"; feedback: ArticleQrScanFeedback }
  | { status: "not_found"; feedback: ArticleQrScanFeedback }
  | { status: "not_on_floor"; feedback: ArticleQrScanFeedback }
  | {
      status: "found";
      feedback: ArticleQrScanFeedback;
      order: ProductionOrder;
      article: Article;
      rowKey: string;
      /** Orders list with only the matched line (for Article view). */
      singleArticleOrders: ProductionOrder[];
    };

/**
 * User-facing error for article QR scan failures on a floor.
 */
export function productionArticleQrScanErrorMessage(
  result: Extract<ArticleQrScanResult, { handled: false }>,
  floorLabel: string
): string {
  switch (result.reason) {
    case "empty":
      return "Scan or enter a label QR code.";
    case "not_article_qr":
      return "Not a production article label QR. Expected format: PA|orderId|articleId";
    case "not_found":
      return `Order/article not found on ${floorLabel}. It may still be on another floor or not received here yet.`;
    case "not_on_floor":
      return `Article is not available on ${floorLabel} (no received quantity on this floor).`;
    default:
      return "Could not find article.";
  }
}

/**
 * Resolve scanned QR against order lists (no network).
 */
export function resolveProductionArticleQrScan(
  raw: string,
  allOrders: ProductionOrder[],
  lookupOrders: ProductionOrder[],
  floorKey: ProductionArticleFloorKey,
  floorLabel: string
): ArticleQrResolveResult {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) {
    return {
      status: "invalid_qr",
      feedback: { type: "error", message: "Scan or enter a label QR code." },
    };
  }

  const parsed = parseProductionArticleQr(trimmed);
  if (!parsed) {
    return {
      status: "invalid_qr",
      feedback: {
        type: "error",
        message: "Not a production article label QR. Expected format: PA|orderId|articleId",
      },
    };
  }

  const foundAnywhere = findProductionArticleInOrders(
    allOrders,
    parsed.orderId,
    parsed.articleId
  );

  if (!foundAnywhere) {
    return {
      status: "not_found",
      feedback: {
        type: "error",
        message: `Order/article not found on ${floorLabel}. It may still be on another floor or not in the system list.`,
      },
    };
  }

  if (!isArticleAvailableOnFloor(foundAnywhere.article, floorKey)) {
    const label =
      foundAnywhere.article.articleNumber ??
      foundAnywhere.article.factoryCode ??
      "Article";
    const received = foundAnywhere.article.floorQuantities?.[floorKey]?.received ?? 0;
    return {
      status: "not_on_floor",
      feedback: {
        type: "error",
        message: `${label} is on this order but has no received quantity on ${floorLabel} yet (received: ${received}). Transfer or accept from the previous floor first.`,
      },
    };
  }

  const hit = tryHandleProductionArticleQrScan(trimmed, lookupOrders, floorKey);
  if (!hit.handled) {
    const message = productionArticleQrScanErrorMessage(hit, floorLabel);
    return {
      status: hit.reason === "not_found" ? "not_found" : "not_on_floor",
      feedback: { type: "error", message },
    };
  }

  const label = hit.article.articleNumber ?? hit.article.factoryCode ?? "Article";
  const orderNo = hit.order.orderNumber ?? hit.order.id ?? "order";
  return {
    status: "found",
    feedback: {
      type: "success",
      message: `Found ${label} (${orderNo}). Showing this article on ${floorLabel}.`,
    },
    order: hit.order,
    article: hit.article,
    rowKey: hit.rowKey,
    singleArticleOrders: [
      {
        ...hit.order,
        articles: [hit.article],
      },
    ],
  };
}

/**
 * Run article QR scan against floor orders; toast + return highlight payload when found.
 */
export function runProductionArticleQrScanOnFloor(
  raw: string,
  orders: ProductionOrder[],
  floorKey: ProductionArticleFloorKey,
  floorLabel: string
): ArticleQrScanHighlightPayload | null {
  const result = resolveProductionArticleQrScan(raw, orders, orders, floorKey, floorLabel);
  if (result.status === "found") {
    toast.success(result.feedback.message, { duration: 4000 });
    return {
      handled: true,
      order: result.order,
      article: result.article,
      rowKey: result.rowKey,
    };
  }
  toast.error(result.feedback.message, { duration: 5000 });
  return null;
}
