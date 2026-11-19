export type RequirementStatus = "Not Issued" | "Partially Issued" | "Issued";

/** Scope issued qty to an article. `undefined` = whole order. `matchNone` = show 0 (unresolved selection). */
export type ArticleFilter =
  | { articleIds: string[]; articleNumber?: string; matchNone?: boolean }
  | undefined;

export interface IssuedQtyRequirement {
  id?: string;
  yarnName: string;
}

export interface IssuedQtyTransaction {
  yarnName: string;
  transactionType: string;
  transactionNetWeight: number;
  orderId?: unknown;
  orderno?: string;
  articleId?: unknown;
  articleNumber?: string;
  machineId?: unknown;
}

/**
 * Machine scope for issued qty on the yarn-issue screen.
 * - `undefined` — no machine filter (only non–machine-centric callers).
 * - `null` — machine context active but id missing: count 0 (never credit whole PO).
 * - `string` — only `yarn_issued` rows for this machine (legacy rows without machineId excluded).
 */
export type MachineFilter = string | null | undefined;

export interface IssuedQtyOrder {
  id: string;
  orderNumber: string;
}

interface ArticleRef {
  id: string;
  _id?: string;
  articleNumber?: string;
}

/**
 * Normalize a Mongo id or populated `{ _id | id }` ref to a string.
 */
export function normalizeRefId(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") {
    const obj = value as { _id?: unknown; id?: unknown };
    if (obj._id != null && obj._id !== "") return String(obj._id);
    if (obj.id != null && obj.id !== "") return String(obj.id);
  }
  return "";
}

/**
 * Match a transaction to a production order. Prefer orderId; orderno only when orderId is missing.
 */
export function transactionMatchesOrder(
  transaction: Pick<IssuedQtyTransaction, "orderId" | "orderno">,
  order: IssuedQtyOrder
): boolean {
  const txOrderId = normalizeRefId(transaction.orderId);
  const orderId = String(order.id ?? "");
  if (txOrderId && orderId) return txOrderId === orderId;
  if (!txOrderId && transaction.orderno && order.orderNumber) {
    return String(transaction.orderno).trim().toLowerCase() === String(order.orderNumber).trim().toLowerCase();
  }
  return false;
}

/**
 * Match a transaction to an article. If the tx has articleId, it must be in articleIds
 * (articleNumber alone must not attach another article's rows). Legacy txs with no articleId
 * may match by articleNumber.
 */
export function transactionMatchesArticle(
  transaction: Pick<IssuedQtyTransaction, "articleId" | "articleNumber">,
  articleFilter?: ArticleFilter
): boolean {
  if (!articleFilter) return true;
  if (articleFilter.matchNone) return false;

  const txArticleId = normalizeRefId(transaction.articleId);
  const allowedIds = (articleFilter.articleIds ?? []).map(String).filter(Boolean);
  if (txArticleId) return allowedIds.includes(txArticleId);

  const txNumber = String(transaction.articleNumber ?? "").trim();
  const filterNumber = String(articleFilter.articleNumber ?? "").trim();
  if (filterNumber && txNumber) {
    return txNumber.toLowerCase() === filterNumber.toLowerCase();
  }
  return false;
}

/**
 * Yarn-issue screen is machine-centric: count only `yarn_issued` rows for the selected machine.
 * Legacy transactions without machineId are omitted to avoid crediting another machine on the same PO.
 */
export function transactionMatchesMachine(
  transaction: Pick<IssuedQtyTransaction, "machineId">,
  machineFilter?: MachineFilter
): boolean {
  if (machineFilter === undefined) return true;
  if (machineFilter === null || machineFilter === "") return false;
  const txMachineId = normalizeRefId(transaction.machineId);
  if (!txMachineId) return false;
  return txMachineId === String(machineFilter);
}

/**
 * Sum issued kg for one yarn requirement, scoped to order and optional article.
 */
export function getIssuedQty(
  requirement: IssuedQtyRequirement,
  transactions: IssuedQtyTransaction[],
  order: IssuedQtyOrder,
  articleFilter?: ArticleFilter,
  machineFilter?: MachineFilter
): number {
  return transactions
    .filter(
      (t) =>
        t.yarnName === requirement.yarnName &&
        t.transactionType === "yarn_issued" &&
        transactionMatchesOrder(t, order) &&
        transactionMatchesArticle(t, articleFilter) &&
        transactionMatchesMachine(t, machineFilter)
    )
    .reduce((sum, t) => sum + (t.transactionNetWeight || 0), 0);
}

/**
 * Derive issued / partial / not-issued from kg issued vs required grams.
 */
export function getRequirementStatus(
  requirement: IssuedQtyRequirement & { requiredQty: number },
  transactions: IssuedQtyTransaction[],
  order: IssuedQtyOrder,
  articleFilter?: ArticleFilter,
  machineFilter?: MachineFilter
): RequirementStatus {
  const issued = getIssuedQty(requirement, transactions, order, articleFilter, machineFilter);
  const issuedInGrams = issued * 1000;
  if (issuedInGrams === 0) return "Not Issued";
  if (issuedInGrams + 0.0001 < requirement.requiredQty) return "Partially Issued";
  return "Issued";
}

/**
 * Article id embedded in yarn-requirement row id (`req-{bomId}-{articleKey}-{index}`).
 */
export function articleKeyFromRequirementId(requirementId: string): string | null {
  const m = String(requirementId).match(/^req-[0-9a-fA-F]{24}-(.+)-\d+$/);
  return m?.[1] ?? null;
}

/**
 * Mongo `_id` for APIs that store `articleId` as ObjectId (e.g. yarn issue submit, cone barcode).
 * UI selection uses business `article.id` (ART…); resolve via `articles[]` when possible.
 */
export function resolveArticleMongoId(
  articleKey: string | null | undefined,
  articles?: ArticleRef[] | null
): string | null {
  if (!articleKey || articleKey === "all") return null;
  const article = articles?.find((a) => String(a.id || a._id) === String(articleKey));
  const mongo = article?._id ? String(article._id).trim() : "";
  if (/^[0-9a-fA-F]{24}$/.test(mongo)) return mongo;
  const key = String(articleKey).trim();
  if (/^[0-9a-fA-F]{24}$/.test(key)) return key;
  return null;
}

/**
 * Build unique article ids used when matching issue transactions.
 */
function articleFilterIds(article: ArticleRef, extraId?: string): string[] {
  const ids = [article._id, article.id, extraId].filter(Boolean).map(String);
  return [...new Set(ids)];
}

/**
 * Article filter for a BOM row. Unresolved specific-article selection returns matchNone (0 issued),
 * never an omitted filter (which would sum the whole order).
 */
export function getArticleFilterForRequirement(
  requirement: IssuedQtyRequirement,
  selectedArticleId: string | null,
  selectedOrder: { articles?: ArticleRef[] } | null
): ArticleFilter {
  const specific = Boolean(selectedArticleId && selectedArticleId !== "all");

  if (!selectedOrder?.articles) {
    return specific ? { articleIds: [], matchNone: true } : undefined;
  }

  if (specific) {
    const article = selectedOrder.articles.find(
      (a) => String(a.id || a._id) === String(selectedArticleId)
    );
    if (!article) return { articleIds: [], matchNone: true };
    return {
      articleIds: articleFilterIds(article, selectedArticleId ?? undefined),
      articleNumber: article.articleNumber,
    };
  }

  const articleIdFromReq = requirement.id ? requirement.id.split("-")[0] : "";
  if (!articleIdFromReq) return { articleIds: [], matchNone: true };
  const article = selectedOrder.articles.find(
    (a) => String(a.id || a._id) === String(articleIdFromReq)
  );
  if (!article) return { articleIds: [articleIdFromReq] };
  return {
    articleIds: articleFilterIds(article, articleIdFromReq),
    articleNumber: article.articleNumber,
  };
}

/**
 * BOM rows for one article id, trying chip id then article.id / _id map keys.
 */
export function getArticleBomFromMap<T extends { id: string }>(
  articleBoms: Map<string, T[]>,
  selectedArticleId: string,
  articles?: ArticleRef[]
): T[] {
  const direct = articleBoms.get(selectedArticleId);
  if (direct) return direct;
  const article = articles?.find((a) => String(a.id || a._id) === String(selectedArticleId));
  if (!article) return [];
  return articleBoms.get(article.id) ?? (article._id ? articleBoms.get(String(article._id)) : undefined) ?? [];
}

/**
 * Combine per-article BOM rows for the All view without aggregating quantities.
 */
export function buildCombinedArticleBoms<T extends { id: string }>(
  articleBoms: Map<string, T[]>
): T[] {
  const allBoms: T[] = [];
  articleBoms.forEach((articleBom, articleId) => {
    articleBom.forEach((requirement) => {
      allBoms.push({ ...requirement, id: `${articleId}-${requirement.id}` });
    });
  });
  return allBoms;
}

/**
 * BOM slice to render for the current article chip. Missing specific article → empty, never All.
 */
export function resolveDisplayedBom<T extends { id: string }>(
  articleBoms: Map<string, T[]>,
  selectedArticleId: string | null,
  articles?: ArticleRef[]
): T[] {
  if (!selectedArticleId || selectedArticleId === "all") {
    return buildCombinedArticleBoms(articleBoms);
  }
  return getArticleBomFromMap(articleBoms, selectedArticleId, articles);
}
