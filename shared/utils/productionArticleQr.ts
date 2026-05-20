import type { Article, ProductionOrder } from "@/shared/services/productionService";

/** Prefix for production floor article label QR payloads. */
export const PRODUCTION_ARTICLE_QR_PREFIX = "PA";

/** Floor keys under `article.floorQuantities`. */
export type ProductionArticleFloorKey =
  | "knitting"
  | "linking"
  | "checking"
  | "washing"
  | "silicon"
  | "secondaryChecking"
  | "boarding"
  | "branding"
  | "finalChecking"
  | "dispatch";

/**
 * Encode order + article ids for thermal label QR (scannable on any production floor).
 */
export function encodeProductionArticleQr(orderId: string, articleId: string): string {
  const o = String(orderId ?? "").trim();
  const a = String(articleId ?? "").trim();
  if (!o || !a) throw new Error("orderId and articleId are required for article QR");
  return `${PRODUCTION_ARTICLE_QR_PREFIX}|${o}|${a}`;
}

/**
 * Parse a scanned production article QR string.
 */
export function parseProductionArticleQr(
  raw: string
): { orderId: string; articleId: string } | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;

  if (value.startsWith(`${PRODUCTION_ARTICLE_QR_PREFIX}|`)) {
    const parts = value.split("|");
    if (parts.length >= 3 && parts[1]?.trim() && parts[2]?.trim()) {
      return { orderId: parts[1].trim(), articleId: parts[2].trim() };
    }
  }

  if (value.startsWith("{")) {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      const orderId = parsed.orderId ?? parsed.o ?? parsed.order;
      const articleId = parsed.articleId ?? parsed.a ?? parsed.article;
      if (orderId && articleId) {
        return { orderId: String(orderId).trim(), articleId: String(articleId).trim() };
      }
    } catch {
      // not JSON
    }
  }

  return null;
}

/**
 * Canonical row key — always prefer Mongo `_id` so it matches printed QR payloads.
 */
export function productionArticleRowKey(order: ProductionOrder, article: Article): string;
export function productionArticleRowKey(orderId: string, articleId: string): string;
export function productionArticleRowKey(
  orderOrId: ProductionOrder | string,
  articleOrId: Article | string
): string {
  if (typeof orderOrId === "string" && typeof articleOrId === "string") {
    return `${normId(orderOrId)}|${normId(articleOrId)}`;
  }
  const order = orderOrId as ProductionOrder;
  const article = articleOrId as Article;
  return `${normId(order._id ?? order.id)}|${normId(article._id ?? article.id)}`;
}

/**
 * Normalize Mongo/string ids for comparison.
 */
function normId(value: unknown): string {
  return String(value ?? "").trim();
}

/**
 * Find an order line in the current floor order list.
 */
export function findProductionArticleInOrders(
  orders: ProductionOrder[],
  orderId: string,
  articleId: string
): { order: ProductionOrder; article: Article } | null {
  const wantOrder = normId(orderId);
  const wantArticle = normId(articleId);
  if (!wantOrder || !wantArticle) return null;

  for (const order of orders) {
    const orderIds = [order.id, order._id].map(normId).filter(Boolean);
    if (!orderIds.some((oid) => oid === wantOrder)) continue;
    for (const article of order.articles) {
      const articleIds = [article._id, article.id].map(normId).filter(Boolean);
      if (articleIds.some((aid) => aid === wantArticle)) return { order, article };
    }
  }
  return null;
}

/**
 * Whether the article has work visible on a floor (received or remaining > 0).
 */
export function isArticleAvailableOnFloor(
  article: Article,
  floorKey: ProductionArticleFloorKey
): boolean {
  const fq = article.floorQuantities?.[floorKey];
  if (!fq) return false;
  const received = fq.received ?? 0;
  if (received > 0) return true;
  const remaining =
    typeof fq.remaining === "number"
      ? fq.remaining
      : Math.max(0, received - (fq.transferred ?? 0));
  return remaining > 0;
}

export type ArticleQrScanResult =
  | {
      handled: true;
      order: ProductionOrder;
      article: Article;
      rowKey: string;
    }
  | {
      handled: false;
      reason: "empty" | "not_article_qr" | "not_found" | "not_on_floor";
    };

/**
 * Resolve a scanned string as a production article QR for the current floor list.
 */
export function tryHandleProductionArticleQrScan(
  raw: string,
  orders: ProductionOrder[],
  floorKey: ProductionArticleFloorKey
): ArticleQrScanResult {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return { handled: false, reason: "empty" };

  const parsed = parseProductionArticleQr(trimmed);
  if (!parsed) return { handled: false, reason: "not_article_qr" };

  const found = findProductionArticleInOrders(orders, parsed.orderId, parsed.articleId);
  if (!found) return { handled: false, reason: "not_found" };

  if (!isArticleAvailableOnFloor(found.article, floorKey)) {
    return { handled: false, reason: "not_on_floor" };
  }

  return {
    handled: true,
    order: found.order,
    article: found.article,
    rowKey: productionArticleRowKey(found.order, found.article),
  };
}
