"use client";
import React, {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";
import { API_BASE_URL } from "@/shared/data/utilities/api";
import { fetchWeightLatest } from "@/shared/data/utilities/weightApi";
import Cookies from "js-cookie";
import yarnConeService from "@/shared/services/yarnConeService";
import storageSlotService from "@/shared/services/storageSlotService";
import {
  getCompletedItemsAssignments,
  updateAssignmentItemYarnReturnStatus,
  type MachineOrderAssignmentTopItems,
  type PopulatedOrderRef,
  type PopulatedArticleRef,
} from "@/shared/services/machineOrderAssignmentService";
import AssignmentsCards from "@/app/catalog/needle-configuration/components/AssignmentsCards";
import {
  resolveYarnCatalogId,
  resolveYarnCatalogIdFromTransaction,
} from "./resolveYarnCatalogId";
import {
  fetchArticleReturnSlice,
  type ArticleReturnSliceCone,
  type ArticleReturnSliceResponse,
} from "@/shared/services/yarnTransactionsArticleReturnSliceService";

type ConeStatus = "Awaiting" | "Returned";
type OrderStatus = "Awaiting Return" | "In Progress" | "Partial" | "Returned";
type ReturnStatus = "Awaiting" | "Partial" | "Returned";

interface Cone {
  id: string;
  barcode: string;
  yarnCode: string;
  yarnName: string;
  yarnType: string;
  issuedWeight: number;
  returnedWeight?: number;
  balanceWeight?: number;
  status: ConeStatus;
  lastReturnedAt?: string;
  transactionId?: string; // ID of the issued transaction
  yarnCatalogId?: string; // Yarn catalog ID for return transaction
  articleId?: string; // Article this cone belongs to (from issued tx)
  articleNumber?: string; // Article number from issued tx – fallback when articleId missing
}

interface Article {
  id: string;
  _id?: string;
  articleNumber: string;
  plannedQuantity: number;
  linkingType: string;
  priority: string;
  status: string;
  machineId?: any;
  remarks?: string;
}

interface ApiProductionOrder {
  id: string;
  orderNumber: string;
  status: string;
  priority: string;
  currentFloor: string;
  orderNote?: string;
  articles: Article[];
  createdAt?: string;
  updatedAt?: string;
}

interface ProductionOrder {
  id: string;
  productionOrder: string;
  orderNumber: string;
  floor: string;
  knittingSupervisor: string;
  knittingCompletedAt: string;
  status: OrderStatus;
  cones: Cone[];
  lastUpdated: string;
  articles?: Article[];
  hasIssuedTransactions?: boolean; // Track if order has issued transactions
}

/** Knitting production order number for yarn APIs and transaction `orderno` (not yarn purchase PO). */
function productionOrderNoForApi(order: ProductionOrder): string {
  return String(order.productionOrder ?? order.orderNumber ?? "").trim();
}

/** Gross scale weight at or below this (kg) treats the batch as empty return (no short-term rack). */
const EMPTY_CONE_MAX_GROSS_WEIGHT_KG = 0.125;

/** Article row for article-wise display. Links to parent order for cones. */
interface ArticleRow {
  rowId: string;
  articleId: string;
  articleNumber: string;
  orderId: string;
  orderNumber: string;
  productionOrder: string;
  floor: string;
  knittingSupervisor: string;
  knittingCompletedAt: string;
  status: OrderStatus;
  cones: Cone[];
  plannedQuantity: number;
  yarnNames: string; // Comma-separated unique yarn names from cones
  /** Lazy machine mode: raw ids for GET article-return-slice (may be code in id field). */
  sliceFetchArticleId?: string;
  sliceFetchArticleNumber?: string;
}

function mapSliceStatusToOrderStatus(s: ArticleReturnSliceResponse["status"]): OrderStatus {
  if (s === "Returned") return "Returned";
  if (s === "Partial") return "Partial";
  return "Awaiting Return";
}

function mapSliceConeToPageCone(sc: ArticleReturnSliceCone): Cone {
  const st: ConeStatus = sc.status === "Returned" ? "Returned" : "Awaiting";
  return {
    id: String(sc.id),
    barcode: String(sc.barcode ?? sc.id),
    yarnCode: "N/A",
    yarnName: sc.yarnName?.trim() || "Unknown Yarn",
    yarnType: "Unknown",
    issuedWeight: 0,
    status: st,
    articleId: sc.articleId,
    articleNumber: sc.articleNumber,
  };
}

/**
 * Yarn-cones barcode GET returns issueWeight / returnWeight; order cones from article-return-slice use issuedWeight stub 0 — merge API onto cone for Scan & Return UI.
 */
function mergeConeWithYarnConeApiResponse(cone: Cone, coneDetails: Record<string, unknown>): Cone {
  const detailIssue =
    coneDetails.issueWeight ?? coneDetails.issue_weight;
  const detailReturn =
    coneDetails.returnWeight ?? coneDetails.return_weight;
  const parsedIssue =
    detailIssue != null && detailIssue !== "" ? Number(detailIssue) : NaN;
  const parsedReturn =
    detailReturn != null && detailReturn !== "" ? Number(detailReturn) : NaN;

  const issuedWeight = Number.isFinite(parsedIssue) ? parsedIssue : cone.issuedWeight ?? 0;
  const returnedWeight = Number.isFinite(parsedReturn) ? parsedReturn : cone.returnedWeight;

  const yc = coneDetails.yarnCatalogId;
  const yarnTypeFromCatalog =
    yc && typeof yc === "object"
      ? (yc as { yarnType?: { name?: string } }).yarnType?.name
      : undefined;
  const yarnFromDetails = coneDetails.yarn as { yarnType?: { name?: string } } | undefined;
  const yarnType = yarnTypeFromCatalog || yarnFromDetails?.yarnType?.name || cone.yarnType;

  const catId = resolveYarnCatalogId(coneDetails as Parameters<typeof resolveYarnCatalogId>[0]);
  const balanceWeight =
    Number.isFinite(parsedIssue) && Number.isFinite(parsedReturn)
      ? Math.max(parsedIssue - parsedReturn, 0)
      : cone.balanceWeight;

  return {
    ...cone,
    issuedWeight,
    returnedWeight:
      returnedWeight !== undefined ? returnedWeight : cone.returnedWeight,
    balanceWeight,
    yarnName: String(coneDetails.yarnName ?? cone.yarnName ?? "Unknown Yarn"),
    yarnType: String(yarnTypeFromCatalog || yarnType || cone.yarnType || "Unknown"),
    ...(catId && catId !== "N/A" ? { yarnCatalogId: catId } : {}),
    yarnCode: catId && catId !== "N/A" ? catId : cone.yarnCode,
  };
}

function articleRowFromSlice(
  slice: ArticleReturnSliceResponse,
  orderNumber: string,
  plannedQuantity: number
): ArticleRow {
  const rowPrefix =
    normalizeArticleRefId(slice.articleId) || String(slice.articleNumber || "").trim() || "article";
  return {
    rowId: `${rowPrefix}-${slice.orderId}`,
    articleId: normalizeArticleRefId(slice.articleId) || slice.articleNumber,
    articleNumber: slice.articleNumber,
    orderId: slice.orderId,
    orderNumber,
    productionOrder: slice.productionOrder,
    floor: slice.floor,
    knittingSupervisor: slice.knittingSupervisor,
    knittingCompletedAt: slice.knittingCompletedAt ?? "",
    status: mapSliceStatusToOrderStatus(slice.status),
    cones: slice.cones.map(mapSliceConeToPageCone),
    plannedQuantity,
    yarnNames: slice.yarnNames,
  };
}

function buildMachineCatalogArticleRow(
  meta: { orderId: string; orderNumber: string; floor: string },
  art: Article,
  articleIndex: number
): ArticleRow {
  const artId = art.id || (art as { _id?: string })._id;
  const artNorm = normalizeArticleRefId(artId);
  const artNum = String(art.articleNumber ?? "").trim();
  const rowPrefix = artNorm || artNum || `slot${articleIndex}`;
  const rawAid = String(art.id || (art as { _id?: string })._id || "").trim();
  const rawNum = String(art.articleNumber || "").trim();
  return {
    rowId: `${rowPrefix}-${meta.orderId}`,
    articleId: artNorm || rawNum || rowPrefix,
    articleNumber: art.articleNumber,
    orderId: meta.orderId,
    orderNumber: meta.orderNumber,
    productionOrder: meta.orderNumber,
    floor: meta.floor,
    knittingSupervisor: "N/A",
    knittingCompletedAt: "",
    status: "Awaiting Return",
    cones: [],
    plannedQuantity: art.plannedQuantity ?? 0,
    yarnNames: "",
    sliceFetchArticleId: rawAid || undefined,
    sliceFetchArticleNumber: rawNum || undefined,
  };
}

interface ReturnRecord {
  id: string;
  orderId: string;
  productionOrder: string;
  knittingCompletedAt: string;
  status: ReturnStatus;
  returnedCones: number;
  pendingCones: number;
  lastUpdated: string;
}

/** History drawer: API max page size for `GET …/yarn-transactions` (backend rejects limit > 100). */
const YARN_RETURN_HISTORY_API_LIMIT = 100;

interface ReturnTransaction {
  _id: string;
  orderno?: string;
  orderId?: string;
  yarnName: string;
  transactionType: string;
  transactionDate: string;
  transactionNetWeight: number;
  transactionTotalWeight: number;
  transactionTearWeight: number;
  transactionConeCount: number;
  createdAt: string;
  updatedAt: string;
  yarn?: {
    _id: string;
    yarnName: string;
    yarnType?: {
      name: string;
    };
  };
}

const getOrderStatusFromCones = (cones: Cone[]): OrderStatus => {
  if (cones.length === 0) return "Awaiting Return";
  const returned = cones.filter((cone) => cone.status === "Returned").length;
  if (returned === cones.length) {
    return "Returned";
  }
  if (returned > 0) {
    return "Partial";
  }
  return "Awaiting Return";
};

const buildHistoryRecord = (order: ProductionOrder): ReturnRecord => {
  const returnedCones = order.cones.filter(
    (cone) => cone.status === "Returned"
  ).length;
  const pendingCones = order.cones.length - returnedCones;
  let status: ReturnStatus = "Awaiting";
  if (order.status === "Returned") {
    status = "Returned";
  } else if (returnedCones > 0) {
    status = "Partial";
  }
  return {
    id: order.id,
    orderId: order.id,
    productionOrder: order.productionOrder || order.orderNumber,
    knittingCompletedAt: order.knittingCompletedAt,
    status,
    returnedCones,
    pendingCones,
    lastUpdated: order.lastUpdated,
  };
};

/**
 * After reloading orders, keep the user's article selection if that article still has pending cones.
 * Mirrors `articleRows` cone–article matching so rowId stays stable.
 */
function resolvePreservedArticleSelection(
  filtered: ProductionOrder[],
  preserve: { orderId: string; articleRowId: string } | undefined
): { orderId: string; articleRowId: string } | null {
  if (!preserve || filtered.length === 0) return null;
  const order = filtered.find((o) => String(o.id) === String(preserve.orderId));
  if (!order) return null;

  const suffix = `-${order.id}`;
  if (!preserve.articleRowId.endsWith(suffix)) return null;
  const rowPrefix = preserve.articleRowId.slice(0, -suffix.length);

  const articles = order.articles?.length
    ? order.articles
    : [{ id: order.id, articleNumber: order.orderNumber, plannedQuantity: 0 } as Article];
  const soleArticle = articles.length === 1;
  const firstArticleId = articles[0] ? articles[0].id || (articles[0] as { _id?: string })._id : undefined;
  const firstNorm = normalizeArticleRefId(firstArticleId);

  const art = articles.find((a) => {
    const n = normalizeArticleRefId(a.id || (a as { _id?: string })._id);
    const num = String(a.articleNumber ?? "").trim();
    return (n && n === rowPrefix) || (num && num === rowPrefix);
  });
  if (!art) return null;

  const artId = art.id || (art as { _id?: string })._id;
  const artNorm = normalizeArticleRefId(artId);
  const artNum = String(art.articleNumber ?? "").trim();

  let conesForArticle = order.cones.filter((c) => {
    const cid = normalizeArticleRefId(c.articleId);
    if (cid && artNorm && cid === artNorm) return true;
    const cnum = String(c.articleNumber ?? "").trim();
    if (cnum && artNum && cnum === artNum) return true;
    const orphan = !normalizeArticleRefId(c.articleId) && !String(c.articleNumber ?? "").trim();
    if (orphan && soleArticle && artNorm && firstNorm && artNorm === firstNorm) return true;
    return false;
  });
  if (conesForArticle.length === 0 && order.cones.length > 0 && soleArticle) {
    conesForArticle = order.cones;
  }

  const pendingCones = conesForArticle.filter((c) => c.status !== "Returned");
  if (pendingCones.length === 0) return null;

  return { orderId: order.id, articleRowId: preserve.articleRowId };
}

/** Preserve machine article pick across reload when orders have no cones yet (lazy slice). */
function resolvePreservedCatalogSelection(
  catalogRows: ArticleRow[],
  preserve: { orderId: string; articleRowId: string } | undefined
): { orderId: string; articleRowId: string } | null {
  if (!preserve || catalogRows.length === 0) return null;
  const row = catalogRows.find(
    (r) => String(r.orderId) === String(preserve.orderId) && r.rowId === preserve.articleRowId
  );
  return row ? { orderId: preserve.orderId, articleRowId: preserve.articleRowId } : null;
}

const getAccessToken = (): string | null => {
  if (typeof document === "undefined") return null;
  try {
    const tokenFromCookie = Cookies.get("accessToken");
    if (tokenFromCookie) return tokenFromCookie;
    const tokenFromStorage = localStorage.getItem("token");
    return tokenFromStorage;
  } catch {
    return null;
  }
};

/** Machine label for display (code or name). Same as yarn-issue. */
function machineLabel(a: MachineOrderAssignmentTopItems): string {
  const m = a.machine;
  if (typeof m === "object" && m) {
    return (m as { machineCode?: string; name?: string; id?: string }).machineCode ?? (m as { name?: string }).name ?? (m as { id?: string }).id ?? "—";
  }
  return typeof m === "string" ? m : "—";
}

/** Extract order ID from tx - handles populated object { _id, orderNumber } or string. */
const txOrderId = (tx: any): string | undefined => {
  const o = tx.orderId ?? tx.order;
  if (!o) return undefined;
  if (typeof o === "string") return o;
  return (o as any)._id ?? (o as any).id ?? undefined;
};

/** Get display order number from tx - handles orderno or populated orderId. */
const txOrderno = (tx: any): string | undefined => {
  if (tx.orderno) return tx.orderno;
  const o = tx.orderId ?? tx.order;
  if (typeof o === "string") return undefined;
  return (o as any)?.orderNumber;
};

/** Extract article ID from tx - handles populated object or string. */
const txArticleId = (tx: any): string | undefined => {
  const a = tx.articleId ?? tx.article;
  if (!a) return undefined;
  if (typeof a === "string") return a;
  return (a as any)._id ?? (a as any).id ?? undefined;
};

/** Extract article number from tx – used when articleId missing or doesn't match. */
const txArticleNumber = (tx: any): string | undefined => {
  const n = tx.articleNumber ?? tx.article?.articleNumber;
  return typeof n === "string" ? n.trim() : undefined;
};

/** Compare assignment ↔ cone refs (ObjectId string vs populated object mismatch). */
function normalizeArticleRefId(id: unknown): string {
  if (id == null || id === "") return "";
  if (typeof id === "object" && id !== null) {
    const o = id as Record<string, unknown>;
    return String(o._id ?? o.id ?? "").trim();
  }
  return String(id).trim();
}

/** Best-effort article fields from yarn_issued txn (populated article / nested ids). */
function issuedArticleFieldsFromTx(tx: any): { articleId?: string; articleNumber?: string } {
  let articleId = txArticleId(tx);
  let articleNumber = txArticleNumber(tx);
  const pop = tx.article;
  if (pop && typeof pop === "object") {
    const po = pop as Record<string, unknown>;
    if (!articleId) {
      const id = po._id ?? po.id;
      if (id != null) articleId = String(id).trim();
    }
    const pn = po.articleNumber;
    if (!articleNumber && typeof pn === "string" && pn.trim()) articleNumber = pn.trim();
  }
  const rawAid = tx.articleId;
  if (!articleId && rawAid && typeof rawAid === "object") {
    const id = (rawAid as any)._id ?? (rawAid as any).id;
    if (id != null) articleId = String(id).trim();
    const pn = (rawAid as any).articleNumber;
    if (!articleNumber && typeof pn === "string" && pn.trim()) articleNumber = pn.trim();
  }
  return {
    articleId: articleId?.trim() || undefined,
    articleNumber: articleNumber || undefined,
  };
}

/** YarnCone-shaped ids in Mongo ObjectId form (24 hex chars). */
const OBJECT_ID_LIKE = /^[a-f0-9]{24}$/i;

type TxnGroup = { transactions?: unknown[] };

/** Flatten grouped yarn API buckets (article groups, NO_ARTICLE, etc.). */
function flattenGroupedTransactions(body: unknown): any[] {
  if (!Array.isArray(body)) return [];
  const out: any[] = [];
  for (const group of body as TxnGroup[]) {
    const txs = group?.transactions;
    if (Array.isArray(txs)) out.push(...txs);
  }
  return out;
}

/**
 * Canonical ref strings for a cone on a txn: conesIdsArray may be ObjectIds or
 * `{ _id, barcode, boxId, yarnName }` from the backend.
 */
function txnConeRefStrings(tx: any): string[] {
  const arr = tx?.conesIdsArray;
  if (!Array.isArray(arr)) return [];
  const out = new Set<string>();
  for (const c of arr) {
    if (c != null && typeof c === "object" && !Array.isArray(c)) {
      const o = c as Record<string, unknown>;
      if (o._id != null) out.add(String(o._id).trim());
      if (o.id != null) out.add(String(o.id).trim());
      if (o.barcode != null && String(o.barcode).trim()) out.add(String(o.barcode).trim());
      if (o.boxId != null && String(o.boxId).trim()) out.add(String(o.boxId).trim());
    } else if (c != null && String(c).trim()) {
      out.add(String(c).trim());
    }
  }
  return Array.from(out).filter(Boolean);
}

/** Every cone identity returned for an order (flattened yarn_returned tx list). */
function returnedConeIdSet(allTxnsFlattened: any[]): Set<string> {
  const s = new Set<string>();
  for (const tx of allTxnsFlattened) {
    if (tx?.transactionType !== "yarn_returned") continue;
    for (const id of txnConeRefStrings(tx)) s.add(id);
    const cb = tx?.coneBarcode;
    if (cb != null && String(cb).trim()) s.add(String(cb).trim());
  }
  return s;
}

function primaryConeMapKey(refStrings: string[]): string {
  const mongo = refStrings.find((k) => OBJECT_ID_LIKE.test(k));
  return mongo ?? refStrings[0] ?? "";
}

function fallbackIssuedConeKeys(tx: any): string[] {
  const txId = tx?._id ?? tx?.id;
  const keys = [tx?.coneBarcode, tx?.barcode, txId != null ? `TX-${txId}` : undefined]
    .filter(Boolean)
    .map((x) => String(x).trim())
    .filter(Boolean);
  return Array.from(new Set(keys));
}

/**
 * One logical cone slot per conesIdsArray element when populated; otherwise legacy fallbacks.
 */
function issuedConeSlots(tx: any): { refStrings: string[]; labelBarcode: string }[] {
  const arr = tx?.conesIdsArray;
  if (Array.isArray(arr) && arr.length > 0) {
    const slots: { refStrings: string[]; labelBarcode: string }[] = [];
    arr.forEach((c: any, i: number) => {
      if (c != null && typeof c === "object" && !Array.isArray(c)) {
        const refStrings = txnConeRefStrings({ conesIdsArray: [c] });
        const o = c as Record<string, unknown>;
        const bc =
          (typeof o.barcode === "string" && o.barcode.trim()) ||
          refStrings.find((k) => !OBJECT_ID_LIKE.test(k)) ||
          refStrings[0] ||
          `cone-${i}`;
        if (refStrings.length > 0) slots.push({ refStrings, labelBarcode: String(bc) });
      } else if (c != null && String(c).trim()) {
        const k = String(c).trim();
        slots.push({ refStrings: [k], labelBarcode: k });
      }
    });
    return slots;
  }
  const fb = fallbackIssuedConeKeys(tx);
  const numberOfCones = Math.max(1, Number(tx?.numberOfCones || tx?.transactionConeCount || 1) || 1);
  if (fb.length === 0) {
    const txKey = tx?._id ?? tx?.id ?? "x";
    return Array.from({ length: numberOfCones }, (_, i) => ({
      refStrings: [`TX-${txKey}-${i + 1}`],
      labelBarcode: `TX-${txKey}-${i + 1}`,
    }));
  }
  return fb.map((k) => ({ refStrings: [k], labelBarcode: k }));
}

function findLatestReturnTxForConeKeys(keys: string[], returnedTransactions: any[]): any | undefined {
  let match: any;
  let latest = 0;
  for (const rt of returnedTransactions) {
    if (rt?.transactionType !== "yarn_returned") continue;
    const rtKeys = new Set<string>(txnConeRefStrings(rt));
    const cb = rt?.coneBarcode;
    if (cb != null && String(cb).trim()) rtKeys.add(String(cb).trim());
    const hit = keys.some((k) => rtKeys.has(k));
    if (!hit) continue;
    const t = new Date(rt.transactionDate || rt.createdAt || rt.updatedAt || 0).getTime();
    if (!match || t >= latest) {
      match = rt;
      latest = t;
    }
  }
  return match;
}

/** Build merged cones for one PO from flattened yarn_issued + yarn_returned lists (same rules everywhere). */
function buildConesFromIssuedAndReturned(
  issuedTransactions: any[],
  returnedTransactions: any[]
): Cone[] {
  const issued = issuedTransactions.filter((t) => t?.transactionType === "yarn_issued");
  const returnedFlat = returnedTransactions.filter((t) => t?.transactionType === "yarn_returned");
  const returnedIds = returnedConeIdSet(returnedFlat);
  const conesMap = new Map<string, Cone>();

  for (const tx of issued) {
    const issuedNC = Math.max(1, Number(tx.numberOfCones || tx.transactionConeCount || 1) || 1);
    const weightPerCone = (tx.transactionNetWeight || tx.totalNetWeight || 0) / issuedNC;
    const { articleId, articleNumber } = issuedArticleFieldsFromTx(tx);
    const slots = issuedConeSlots(tx);
    const issuedTxKey = String(tx._id ?? tx.id ?? "");

    slots.forEach((slot, idx) => {
      const keys = slot.refStrings;
      const mapKey = primaryConeMapKey(keys) || `slot-${idx}`;
      const dedupeKey = `${issuedTxKey}:${mapKey}`;
      if (!dedupeKey || conesMap.has(dedupeKey)) return;

      const isReturned = keys.some((k) => returnedIds.has(k));
      const returnedTx = isReturned ? findLatestReturnTxForConeKeys(keys, returnedFlat) : undefined;
      const uniqueConeId = slots.length > 1 ? `${mapKey}-${idx + 1}` : mapKey;
      const catalogId = resolveYarnCatalogIdFromTransaction(tx);

      conesMap.set(dedupeKey, {
        id: uniqueConeId,
        barcode: slot.labelBarcode,
        yarnCode: catalogId || (tx as { yarnCode?: string }).yarnCode || "N/A",
        yarnName: tx.yarnName || "Unknown Yarn",
        yarnType: tx.yarn?.yarnType?.name || "Unknown",
        issuedWeight: weightPerCone,
        returnedWeight: returnedTx
          ? (returnedTx.transactionNetWeight || returnedTx.totalNetWeight || 0) / issuedNC
          : undefined,
        balanceWeight: returnedTx
          ? Math.max(
              weightPerCone -
                (returnedTx.transactionNetWeight || returnedTx.totalNetWeight || 0) / issuedNC,
              0
            )
          : undefined,
        status: returnedTx ? ("Returned" as ConeStatus) : ("Awaiting" as ConeStatus),
        lastReturnedAt: returnedTx?.transactionDate || returnedTx?.createdAt,
        transactionId: tx._id || tx.id,
        yarnCatalogId: catalogId || undefined,
        articleId,
        articleNumber,
      });
    });
  }

  return Array.from(conesMap.values());
}

/**
 * Yarn transactions API shapes (contract):
 * - GET …/yarn-issued-by-order/{orderNumber}: yarn-first buckets `{ yarnName?, yarnCatalogId?, transactions[] }`.
 *   Same yarn bucket may mix articles; each txn still carries articleId/articleNumber — cones inherit that for row filtering.
 * - GET …/yarn-transactions?order_id=: may be grouped by article `{ articleNumber?, transactions[] }` or nested under
 *   `results` / `data` / `articles`. Returns for a cone must still be merged by YarnCone id from `conesIdsArray`, not by
 *   which article bucket the backend grouped the row under (mis-grouped yarn_returned would otherwise show 0 returns).
 */
function unwrapTransactionsRoot(data: unknown): unknown {
  let root: unknown = data;
  for (let step = 0; step < 10; step++) {
    if (root == null) break;
    if (Array.isArray(root)) break;
    if (typeof root !== "object") break;
    const o = root as Record<string, unknown>;
    let next: unknown;
    if (Array.isArray(o.results)) next = o.results;
    else if (typeof o.results === "object" && o.results !== null && !Array.isArray(o.results)) next = o.results;
    else if (Array.isArray(o.data)) next = o.data;
    else if (typeof o.data === "object" && o.data !== null && !Array.isArray(o.data)) next = o.data;
    else if (Array.isArray(o.articles)) next = o.articles;
    else break;
    root = next;
  }
  return root;
}

/** Depth-first collect of leaf transactions from yarn/article/group wrappers. */
function walkTransactionBuckets(node: unknown, depth = 0): any[] {
  if (depth > 20 || node == null) return [];
  if (Array.isArray(node)) {
    return node.flatMap((n) => walkTransactionBuckets(n, depth + 1));
  }
  if (typeof node !== "object") return [];
  const o = node as Record<string, unknown>;
  const txKind = o.transactionType ?? o.transaction_type;
  if (typeof txKind === "string") return [node];

  const txs = o.transactions;
  if (Array.isArray(txs)) {
    const fromChildren = txs.flatMap((t) => walkTransactionBuckets(t, depth + 1));
    if (fromChildren.length > 0) return fromChildren;
  }

  for (const k of ["articles", "groups", "yarns", "buckets", "items", "children"] as const) {
    const arr = o[k];
    if (Array.isArray(arr)) return arr.flatMap((x) => walkTransactionBuckets(x, depth + 1));
  }

  return [];
}

// Helper: unwrap pagination / grouped buckets / flat tx arrays from yarn-transactions APIs.
const extractTransactions = (data: any): any[] => {
  if (data == null) return [];

  const root = unwrapTransactionsRoot(data);
  const walked = walkTransactionBuckets(root, 0);
  const filtered = walked.filter((t) => {
    const typ =
      (t as any)?.transactionType ?? (t as any)?.transaction_type;
    return t && typeof t === "object" && typeof typ === "string";
  });
  if (filtered.length > 0) return filtered;

  if (Array.isArray(root)) {
    const fallback = flattenGroupedTransactions(root);
    if (fallback.length > 0) return fallback;
  }

  return [];
};

/** Map list API payloads (mixed keys) into ReturnTransaction rows for the history drawer. */
function normalizeReturnTransactionForHistory(raw: Record<string, unknown>): ReturnTransaction {
  const yarnRaw = raw.yarn;
  const yarn =
    yarnRaw && typeof yarnRaw === "object"
      ? (yarnRaw as ReturnTransaction["yarn"])
      : undefined;
  const yarnName =
    (typeof raw.yarnName === "string" && raw.yarnName.trim())
      ? raw.yarnName.trim()
      : yarn?.yarnName || "Unknown";
  const id = String(raw._id ?? raw.id ?? "").trim();
  const txnType = String(raw.transactionType ?? raw.transaction_type ?? "yarn_returned");
  const net = Number(raw.transactionNetWeight ?? raw.totalNetWeight ?? raw.netWeight ?? 0);
  const total = Number(raw.transactionTotalWeight ?? raw.totalWeight ?? 0);
  const tear = Number(raw.transactionTearWeight ?? raw.totalTearWeight ?? 0);
  const coneCt =
    Number(raw.transactionConeCount ?? raw.numberOfCones ?? raw.conesCount ?? 1) || 1;
  const dateRaw = raw.transactionDate ?? raw.createdAt ?? raw.updatedAt;
  const transactionDate =
    typeof dateRaw === "string" || typeof dateRaw === "number"
      ? new Date(dateRaw).toISOString()
      : new Date().toISOString();
  const createdAt =
    typeof raw.createdAt === "string"
      ? raw.createdAt
      : transactionDate;
  const updatedAt =
    typeof raw.updatedAt === "string"
      ? raw.updatedAt
      : transactionDate;

  const oidRaw = raw.orderId;
  let orderIdStr: string | undefined;
  if (typeof oidRaw === "string") orderIdStr = oidRaw;
  else if (oidRaw && typeof oidRaw === "object") {
    const o = oidRaw as { _id?: unknown; id?: unknown };
    orderIdStr =
      typeof o._id === "string" ? o._id : typeof o.id === "string" ? o.id : undefined;
  }

  return {
    _id: id || `tx-${transactionDate}-${Math.random().toString(36).slice(2)}`,
    orderno:
      typeof raw.orderno === "string"
        ? raw.orderno
        : typeof (raw as { orderNo?: string }).orderNo === "string"
          ? (raw as { orderNo: string }).orderNo
          : undefined,
    orderId: orderIdStr,
    yarnName,
    transactionType: txnType,
    transactionDate,
    transactionNetWeight: Number.isFinite(net) ? net : 0,
    transactionTotalWeight: Number.isFinite(total) ? total : 0,
    transactionTearWeight: Number.isFinite(tear) ? tear : 0,
    transactionConeCount: coneCt,
    createdAt,
    updatedAt,
    yarn,
  };
}

type YarnReturnedHistoryPageOptions = {
  yarnName?: string;
  startDate?: string;
  endDate?: string;
};

type YarnReturnedHistoryPageResult = {
  rows: ReturnTransaction[];
  page: number;
  limit: number;
  totalResults: number;
  totalPages: number;
};

function historyTransactionTypeOf(t: { transactionType?: string; transaction_type?: string }): string {
  return String(t?.transactionType ?? t?.transaction_type ?? "").toLowerCase();
}

/** Parse paged `GET …/yarn-transactions` envelope + return rows (same filters as floor-issue history). */
function normalizeYarnReturnedHistoryPage(
  data: unknown,
  requestedPage: number,
  limit: number
): YarnReturnedHistoryPageResult {
  const empty: YarnReturnedHistoryPageResult = {
    rows: [],
    page: Math.max(1, requestedPage),
    limit,
    totalResults: 0,
    totalPages: 0,
  };
  if (data == null) return empty;

  let page = Math.max(1, requestedPage);
  let totalResults = 0;
  let totalPages = 0;
  let rawList: unknown[] = [];

  if (typeof data === "object" && !Array.isArray(data)) {
    const o = data as Record<string, unknown>;
    const p = o.page;
    if (typeof p === "number" && Number.isFinite(p)) page = Math.max(1, p);
    else if (typeof p === "string") {
      const n = Number(p);
      if (Number.isFinite(n)) page = Math.max(1, n);
    }
    const tr = o.totalResults ?? o.total;
    if (typeof tr === "number" && Number.isFinite(tr)) totalResults = tr;
    else if (typeof tr === "string") {
      const n = Number(tr);
      if (Number.isFinite(n)) totalResults = n;
    }
    const tp = o.totalPages;
    if (typeof tp === "number" && Number.isFinite(tp)) totalPages = Math.max(0, tp);
    else if (typeof tp === "string") {
      const n = Number(tp);
      if (Number.isFinite(n)) totalPages = Math.max(0, n);
    }
    if (Array.isArray(o.results)) rawList = o.results;
  }

  const typeOf = historyTransactionTypeOf;
  let items: unknown[] = rawList;
  if (items.length === 0) {
    items = extractTransactions(data);
  }
  items = items.filter(
    (t) => t && typeof t === "object" && typeOf(t as { transactionType?: string; transaction_type?: string }) === "yarn_returned"
  );

  const seen = new Set<string>();
  const rows: ReturnTransaction[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const row = normalizeReturnTransactionForHistory(item as Record<string, unknown>);
    if (!row._id || seen.has(row._id)) continue;
    seen.add(row._id);
    rows.push(row);
  }

  const effLimit = Math.min(Math.max(limit, 1), YARN_RETURN_HISTORY_API_LIMIT);
  let effTotal = totalResults > 0 ? totalResults : rows.length;
  let effPages = totalPages > 0 ? totalPages : effTotal > 0 ? Math.ceil(effTotal / effLimit) : 0;
  if (effPages === 0 && rows.length > 0) effPages = 1;
  if (effTotal === 0 && rows.length > 0) effTotal = rows.length;

  return {
    rows,
    page,
    limit: effLimit,
    totalResults: effTotal,
    totalPages: effPages,
  };
}

/**
 * Paged yarn_returned list (limit capped at 100). Optional filters match linking/sampling history query names.
 */
async function fetchYarnReturnedHistoryPage(
  token: string | null,
  page: number,
  options?: YarnReturnedHistoryPageOptions
): Promise<YarnReturnedHistoryPageResult> {
  const pageNum = Math.max(1, Math.floor(page) || 1);
  const limit = YARN_RETURN_HISTORY_API_LIMIT;
  const empty: YarnReturnedHistoryPageResult = {
    rows: [],
    page: pageNum,
    limit,
    totalResults: 0,
    totalPages: 0,
  };

  const buildSearch = (includeOptionFilters: boolean) => {
    const search = new URLSearchParams({
      paged: "1",
      page: String(pageNum),
      limit: String(limit),
      transaction_type: "yarn_returned",
    });
    if (includeOptionFilters && options) {
      const y = options.yarnName?.trim();
      if (y) search.set("yarn_name", y);
      const sd = options.startDate?.trim();
      const ed = options.endDate?.trim();
      if (sd) search.set("start_date", sd);
      if (ed) search.set("end_date", ed);
    }
    return search;
  };

  let res = await fetch(
    `${API_BASE_URL}/yarn-management/yarn-transactions?${buildSearch(true).toString()}`,
    {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  // Retry without optional filters if the server rejects unknown filter combinations.
  if (!res.ok) {
    res = await fetch(
      `${API_BASE_URL}/yarn-management/yarn-transactions?${buildSearch(false).toString()}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );
  }

  if (!res.ok) return empty;

  const data = await res.json();
  return normalizeYarnReturnedHistoryPage(data, pageNum, limit);
}

/** Production order Mongo id from cone (`orderId` or populated `order`). Cones often only store this + `articleId`. */
function productionOrderIdFromCone(cd: any): string | null {
  const normalizeId = (id: any): string =>
    String(
      typeof id === "object" && id !== null ? id._id || id.id || "" : id ?? ""
    ).trim();
  const rawOrder = cd?.orderId ?? cd?.order;
  const orderId = normalizeId(rawOrder);
  return orderId || null;
}

/** Optional knitting order number if present on cone or populated order (never yarn purchase `poNumber`). */
function productionOrderNumberFromConeFields(cd: any): string | null {
  const rawOrder = cd?.orderId ?? cd?.order;
  const pop = typeof rawOrder === "object" && rawOrder ? (rawOrder as Record<string, unknown>) : null;
  const s = (
    cd?.productionOrder ??
    cd?.productionOrderNumber ??
    pop?.productionOrder ??
    pop?.productionOrderNumber ??
    pop?.orderNumber ??
    cd?.orderno ??
    cd?.orderNumber ??
    ""
  )
    .toString()
    .trim();
  return s || null;
}

/**
 * Resolve `orderId` + knitting `orderNumber` for quick return.
 * When the cone only has ids, load `orderNumber` from GET /production/orders/:orderId.
 */
async function resolveQuickReturnOrderRefs(
  cd: any,
  token: string | null
): Promise<{ orderId: string; orderNumber: string } | null> {
  const orderId = productionOrderIdFromCone(cd);
  if (!orderId) return null;

  let orderNumber = productionOrderNumberFromConeFields(cd);
  if (!orderNumber) {
    try {
      const res = await fetch(`${API_BASE_URL}/production/orders/${orderId}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (res.ok) {
        const data = await res.json();
        const body = data?.data ?? data;
        orderNumber = String(body?.orderNumber ?? "").trim();
      }
    } catch (e) {
      console.warn("resolveQuickReturnOrderRefs: production order fetch failed", e);
    }
  }

  if (!orderNumber) return null;
  return { orderId, orderNumber };
}

/** Minimal article row for fetchOrderWithCones when only cone data exists (quick return). */
const articleStubFromConeDetails = (cd: any): Article[] => {
  const normalizeId = (id: any): string =>
    String(
      typeof id === "object" && id !== null ? id._id || id.id || "" : id ?? ""
    ).trim();
  const artId = normalizeId(cd?.articleId ?? cd?.article);
  if (!artId) return [];
  const n = cd?.articleNumber ?? cd?.article?.articleNumber;
  const articleNumber = typeof n === "string" ? n.trim() : "";
  return [
    {
      id: artId,
      _id: artId,
      articleNumber: articleNumber || "—",
      plannedQuantity: 0,
      linkingType: "Auto Linking",
      priority: "Medium",
      status: "Pending",
    },
  ];
};

const statusBadgeColor = (status: ReturnStatus | OrderStatus) => {
  switch (status) {
    case "Awaiting":
    case "Awaiting Return":
      return "bg-yellow-100 text-yellow-800";
    case "In Progress":
      return "bg-blue-100 text-blue-800";
    case "Partial":
      return "bg-orange-100 text-orange-800";
    case "Returned":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

/** One line per distinct yarn; repeats as `name*count` (scan panel + yarn names drawer). Only pending (not yet returned) cones. */
const yarnSummaryLinesFromCones = (cones: Cone[]): string[] => {
  const pending = cones.filter((c) => c.status !== "Returned");
  const counts = new Map<string, number>();
  for (const c of pending) {
    const name = (c.yarnName || "").trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const c of pending) {
    const name = (c.yarnName || "").trim();
    if (!name) continue;
    if (seen.has(name)) continue;
    seen.add(name);
    const n = counts.get(name) ?? 1;
    lines.push(n > 1 ? `${name}*${n}` : name);
  }
  return lines;
};

const YarnReturnPage = () => {
  const { hasSubPermission, isLoading } = useNavigation();

  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [history, setHistory] = useState<ReturnRecord[]>([]);
  const [returnTransactions, setReturnTransactions] = useState<ReturnTransaction[]>([]);
  const [articleSliceCache, setArticleSliceCache] = useState<Record<string, ArticleRow>>({});
  /** Article rows from completed-items only (no slice); merged with `articleSliceCache` for display. */
  const [machineArticleCatalogRows, setMachineArticleCatalogRows] = useState<ArticleRow[]>([]);
  const [articleSliceLoadingRowId, setArticleSliceLoadingRowId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedArticleRowId, setSelectedArticleRowId] = useState<string | null>(null);
  const [activeConeId, setActiveConeId] = useState<string | null>(null);
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [historyDateRange, setHistoryDateRange] = useState<{
    from: string;
    to: string;
  }>({ from: "", to: "" });
  const [historyPage, setHistoryPage] = useState(1);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [machineAssignments, setMachineAssignments] = useState<MachineOrderAssignmentTopItems[]>([]);
  const [machineAssignmentsLoading, setMachineAssignmentsLoading] = useState(true);
  const [selectedMachineAssignmentId, setSelectedMachineAssignmentId] = useState<string | null>(null);
  const [selectedMachineAssignment, setSelectedMachineAssignment] = useState<MachineOrderAssignmentTopItems | null>(null);
  const [machineSearchTerm, setMachineSearchTerm] = useState("");
  const [orderSelectOpen, setOrderSelectOpen] = useState(true);
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [showScanReturnPanel, setShowScanReturnPanel] = useState(false);
  /** Scan drawer dashed summary: collapsed by default; expand for yarn / floor / cones. */
  const [scanPanelSummaryOpen, setScanPanelSummaryOpen] = useState(false);
  /** Yarn/floor summary accordion in Quick return drawer only (separate from main Scan & Return). */
  const [quickReturnSummaryOpen, setQuickReturnSummaryOpen] = useState(false);
  const [yarnNamesDrawerRow, setYarnNamesDrawerRow] = useState<ArticleRow | null>(null);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [historyDrawerLoading, setHistoryDrawerLoading] = useState(false);
  const [historyDrawerRows, setHistoryDrawerRows] = useState<ReturnTransaction[]>([]);
  const [historyDrawerTotalResults, setHistoryDrawerTotalResults] = useState(0);
  const [historyDrawerTotalPages, setHistoryDrawerTotalPages] = useState(0);
  const [historySearchDebounced, setHistorySearchDebounced] = useState("");
  const historyLastFiltersRef = useRef<string>("__init__");
  /** Return by scanning cone only: order/article resolved from cone API (not from machine list). */
  const [showQuickReturnDrawer, setShowQuickReturnDrawer] = useState(false);
  const [quickReturnOrder, setQuickReturnOrder] = useState<ProductionOrder | null>(null);
  const [loadingQuickReturnOrder, setLoadingQuickReturnOrder] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [scannedBarcodes, setScannedBarcodes] = useState<string[]>([]);
  const [scannedConeData, setScannedConeData] = useState<Map<string, any>>(new Map());
  const [rackBarcodes, setRackBarcodes] = useState<Map<string, string>>(new Map()); // Map cone barcode to rack barcode
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [storingCone, setStoringCone] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  /** Draft rack barcode typed in the Return modal before Apply (keyed by cone barcode). */
  const [rackInputByCone, setRackInputByCone] = useState<Record<string, string>>({});
  const [transactionForm, setTransactionForm] = useState({
    totalWeight: "",
    numberOfCones: "1",
    totalTearWeight: "0",
    totalNetWeight: "",
  });

  const pendingToastShown = useRef(false);
  const scanBarcodeInputRef = useRef<HTMLInputElement>(null);
  const quickReturnBarcodeInputRef = useRef<HTMLInputElement>(null);
  const returnModalPrimaryInputRef = useRef<HTMLInputElement>(null);
  const [fetchingWeight, setFetchingWeight] = useState(false);
  const [markingAllReturned, setMarkingAllReturned] = useState(false);
  const hasPermission = hasSubPermission("/yarn-management", "Yarn Return");

  // When return modal opens:
  // - auto-fill Tear Weight from scanned cone data (if available)
  // - fetch latest weight from return scale (shared/data/utilities/weightApi) and pre-fill Total/Net
  useEffect(() => {
    if (!showReturnModal) return;
    let cancelled = false;
    (async () => {
      // Prefer tearWeight from scanned cone(s). We treat modal values as per-cone,
      // so only auto-fill when there's exactly 1 cone, or when all scanned cones
      // have the same tearWeight.
      const tearCandidates = scannedBarcodes
        .map((b) => {
          const cd = scannedConeData.get(b);
          const tw = cd?.coneDetails?.tearWeight ?? cd?.tearWeight;
          return typeof tw === "number" && Number.isFinite(tw) ? tw : null;
        })
        .filter((x): x is number => x !== null);

      const shouldAutofillTear =
        tearCandidates.length > 0 &&
        (scannedBarcodes.length === 1 ||
          (tearCandidates.length === scannedBarcodes.length &&
            tearCandidates.every((tw) => tw === tearCandidates[0])));

      const tearFromCone = shouldAutofillTear ? tearCandidates[0] : null;

      if (tearFromCone != null) {
        setTransactionForm((prev) => {
          // Don't override if user already entered a value
          const existing = parseFloat(prev.totalTearWeight);
          if (!Number.isNaN(existing) && existing > 0) return prev;
          return {
            ...prev,
            totalTearWeight: tearFromCone.toFixed(2),
            // keep totalNetWeight consistent if totalWeight already exists
            totalNetWeight: prev.totalWeight
              ? (Math.max(0, (parseFloat(prev.totalWeight) || 0) - tearFromCone)).toFixed(2)
              : prev.totalNetWeight,
          };
        });
      }

      const w = await fetchWeightLatest("return");
      if (cancelled || w == null || w <= 0) return;
      // Use three decimal places from scale without rounding (truncate)
      setTransactionForm((prev) => {
        const tear = parseFloat(prev.totalTearWeight) || 0;
        const truncatedWeight = Math.trunc(w * 1000) / 1000;
        const net = Math.max(0, truncatedWeight - tear);
        const truncatedNet = Math.trunc(net * 1000) / 1000;
        return {
          ...prev,
          totalWeight: truncatedWeight.toFixed(3),
          totalNetWeight: truncatedNet.toFixed(3),
        };
      });
    })();
    return () => { cancelled = true; };
  }, [showReturnModal, scannedBarcodes, scannedConeData]);

  /** Parsed gross total weight (kg) from the Return modal scale field; invalid/blank counts as 0. */
  const grossReturnBatchWeight = useMemo(() => {
    const g = parseFloat(transactionForm.totalWeight);
    return Number.isFinite(g) ? g : 0;
  }, [transactionForm.totalWeight]);

  const batchIsEmptyByGross = grossReturnBatchWeight <= EMPTY_CONE_MAX_GROSS_WEIGHT_KG;

  /** Clear rack assignments when gross weight indicates an empty batch (no ST storage). */
  useEffect(() => {
    if (!showReturnModal) return;
    if (grossReturnBatchWeight > EMPTY_CONE_MAX_GROSS_WEIGHT_KG) return;
    setRackBarcodes((prev) => (prev.size > 0 ? new Map() : prev));
  }, [showReturnModal, grossReturnBatchWeight]);

  /** Fetch cones + return tx for one order. Used when loading orders from completed-items. */
  const fetchOrderWithCones = useCallback(
    async (
      token: string | null,
      orderNumber: string,
      orderId: string,
      meta: { floor: string; articles: Article[]; createdAt?: string; updatedAt?: string }
    ): Promise<ProductionOrder> => {
      let issuedTransactions: any[] = [];
      let returnedTransactions: any[] = [];
      try {
        const [issuedRes, allRes] = await Promise.all([
          fetch(
            `${API_BASE_URL}/yarn-management/yarn-transactions/yarn-issued-by-order/${encodeURIComponent(orderNumber)}`,
            { headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) } }
          ),
          fetch(
            `${API_BASE_URL}/yarn-management/yarn-transactions?order_id=${orderId}`,
            { headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) } }
          ),
        ]);
        if (issuedRes.ok) {
          const d = await issuedRes.json();
          issuedTransactions = extractTransactions(d).filter((tx: any) => tx.transactionType === "yarn_issued");
        }
        if (allRes.ok) {
          const d = await allRes.json();
          returnedTransactions = extractTransactions(d).filter((tx: any) => tx.transactionType === "yarn_returned");
        }
      } catch (err) {
        console.warn("Fetch transactions for order", orderNumber, err);
      }

      // Filter by orderId: API returns all tx for orderno, but multiple production orders can share same orderno
      issuedTransactions = issuedTransactions.filter((tx: any) => {
        const oid = txOrderId(tx);
        return !oid || String(oid) === String(orderId);
      });
      returnedTransactions = returnedTransactions.filter((tx: any) => {
        const oid = txOrderId(tx);
        return !oid || String(oid) === String(orderId);
      });

      const cones = buildConesFromIssuedAndReturned(issuedTransactions, returnedTransactions);
      const lastUpdated = meta.updatedAt || meta.createdAt || new Date().toISOString();
      return {
        id: orderId,
        productionOrder: orderNumber,
        orderNumber,
        floor: meta.floor,
        knittingSupervisor: "N/A",
        knittingCompletedAt: meta.createdAt || lastUpdated,
        status: getOrderStatusFromCones(cones),
        cones,
        lastUpdated,
        articles: meta.articles,
        hasIssuedTransactions: issuedTransactions.length > 0,
      };
    },
    []
  );

  // Fetch completed-items (machines with completed PO items) – same pattern as yarn-issue top-items
  useEffect(() => {
    const fetchCompleted = async () => {
      if (!hasPermission) return;
      setMachineAssignmentsLoading(true);
      try {
        const list = await getCompletedItemsAssignments();
        setMachineAssignments(list);
        // Empty list: no machine to select → never call loadOrdersForMachine, so clear orders loading
        if (list.length === 0) setOrdersLoading(false);
      } catch (error) {
        console.error("Error fetching completed-items:", error);
        toast.error("Failed to load machines (completed items)");
        setMachineAssignments([]);
        setOrdersLoading(false);
      } finally {
        setMachineAssignmentsLoading(false);
      }
    };
    fetchCompleted();
  }, [hasPermission]);

  /** Build orders from assignment and fetch cones for each (like yarn-issue loadOrdersForMachine). */
  const loadOrdersForMachine = useCallback(
    async (
      assignment: MachineOrderAssignmentTopItems,
      options?: { preserveSelection?: { orderId: string; articleRowId: string } }
    ) => {
      const items = assignment.productionOrderItems ?? [];
      if (items.length === 0) {
        setOrders([]);
        setHistory([]);
        setReturnTransactions((prev) => prev);
        setMachineArticleCatalogRows([]);
        setArticleSliceCache({});
        setSelectedOrderId(null);
        setSelectedArticleRowId(null);
        setSelectedMachineAssignmentId(assignment.id);
        setSelectedMachineAssignment(assignment);
        setOrdersLoading(false);
        return;
      }
      setSelectedMachineAssignmentId(assignment.id);
      setSelectedMachineAssignment(assignment);

      const orderMap = new Map<
        string,
        { order: PopulatedOrderRef | null; articles: { article: PopulatedArticleRef; item: (typeof items)[0] }[] }
      >();
      for (const item of items) {
        const po = item.productionOrder;
        const art = item.article;
        const orderId = typeof po === "string" ? po : (po?.id ?? po?._id ?? "");
        const orderObj = typeof po === "object" ? po : null;
        const articleObj = typeof art === "object" ? art : null;
        if (!orderId || !articleObj) continue;
        if (!orderMap.has(orderId)) {
          orderMap.set(orderId, { order: orderObj ?? null, articles: [] });
        }
        orderMap.get(orderId)!.articles.push({ article: articleObj, item });
      }

      const builtOrdersMeta: { orderId: string; orderNumber: string; floor: string; articles: Article[]; createdAt?: string; updatedAt?: string }[] = [];
      orderMap.forEach((value, orderId) => {
        const { order, articles } = value;
        const firstItem = articles[0]?.item;
        const orderNumber = order?.orderNumber ?? firstItem?.orderNumber ?? "";
        builtOrdersMeta.push({
          orderId,
          orderNumber,
          floor: order?.currentFloor ?? "N/A",
          articles: articles.map(({ article, item: it }) => ({
            id: article?.id ?? article?._id ?? "",
            _id: article?._id,
            articleNumber: article?.articleNumber ?? it?.articleNumber ?? "",
            plannedQuantity: article?.plannedQuantity ?? 0,
            linkingType: (article?.linkingType as string) ?? "Auto Linking",
            priority: (article?.priority as string) ?? "Medium",
            status: (article?.status as string) ?? "Pending",
            machineId: undefined,
            remarks: article?.remarks as string | undefined,
          })),
          createdAt: order?.createdAt as string | undefined,
          updatedAt: order?.updatedAt as string | undefined,
        });
      });

      setMachineArticleCatalogRows([]);
      setArticleSliceCache({});
      setOrdersLoading(true);
      try {
        const catalogRows: ArticleRow[] = [];
        for (const meta of builtOrdersMeta) {
          meta.articles.forEach((art, ai) => {
            const rawAid = String(art.id || (art as { _id?: string })._id || "").trim();
            const rawNum = String(art.articleNumber || "").trim();
            if (!rawAid && !rawNum) return;
            catalogRows.push(buildMachineCatalogArticleRow(meta, art, ai));
          });
        }

        const catalogOrders: ProductionOrder[] = builtOrdersMeta.map((meta) => {
          const lastUpdated = new Date().toISOString();
          return {
            id: meta.orderId,
            productionOrder: meta.orderNumber,
            orderNumber: meta.orderNumber,
            floor: meta.floor,
            knittingSupervisor: "N/A",
            knittingCompletedAt: meta.updatedAt || meta.createdAt || lastUpdated,
            status: "Awaiting Return" as OrderStatus,
            cones: [],
            lastUpdated,
            articles: meta.articles,
            hasIssuedTransactions: true,
          };
        });

        setMachineArticleCatalogRows(catalogRows);
        setOrders(catalogOrders);
        setHistory(catalogOrders.map((order) => buildHistoryRecord(order)));
        setReturnTransactions([]);

        const restored = resolvePreservedCatalogSelection(catalogRows, options?.preserveSelection);
        if (restored) {
          setSelectedOrderId(restored.orderId);
          setSelectedArticleRowId(restored.articleRowId);
        } else if (catalogRows[0]) {
          setSelectedOrderId(catalogRows[0].orderId);
          setSelectedArticleRowId(catalogRows[0].rowId);
        } else {
          setSelectedOrderId(null);
          setSelectedArticleRowId(null);
        }

        if (builtOrdersMeta.length > 0 && catalogRows.length === 0) {
          toast.error("No articles found for this machine.");
        }
      } catch (error) {
        console.error("Error loading orders for machine:", error);
        toast.error("Failed to load orders and cones");
        setOrders([]);
        setHistory([]);
        setMachineArticleCatalogRows([]);
        setArticleSliceCache({});
      } finally {
        setOrdersLoading(false);
      }
    },
    []
  );

  /** Mark yarn return status as Completed for all items across all machines shown. */
  const handleMarkAllReturned = useCallback(async () => {
    if (machineAssignments.length === 0) {
      toast.error("No machines to update.");
      return;
    }
    setMarkingAllReturned(true);
    try {
      let updatedCount = 0;
      for (const assignment of machineAssignments) {
        const assignmentId = assignment.id ?? assignment._id;
        if (!assignmentId) continue;
        const items = assignment.productionOrderItems ?? [];
        for (const item of items) {
          const itemId = item.itemId ?? (item as { id?: string; _id?: string }).id ?? (item as { _id?: string })._id;
          if (!itemId) continue;
          await updateAssignmentItemYarnReturnStatus(assignmentId, itemId, "Completed");
          updatedCount += 1;
        }
      }
      if (updatedCount > 0) {
        toast.success(`Marked ${updatedCount} item(s) as yarn return completed.`);
        const list = await getCompletedItemsAssignments();
        setMachineAssignments(list);
        if (list.length === 0) {
          setOrders([]);
          setSelectedMachineAssignmentId(null);
          setSelectedMachineAssignment(null);
        } else if (selectedMachineAssignmentId) {
          const stillSelected = list.find((a) => (a.id ?? a._id) === selectedMachineAssignmentId);
          if (stillSelected) {
            loadOrdersForMachine(stillSelected);
          } else {
            loadOrdersForMachine(list[0]);
          }
        }
      } else {
        toast("No items to update.");
      }
    } catch (err) {
      console.error("Mark all returned failed:", err);
      toast.error(err instanceof Error ? err.message : "Failed to mark all as returned.");
    } finally {
      setMarkingAllReturned(false);
    }
  }, [machineAssignments, selectedMachineAssignmentId, loadOrdersForMachine]);

  // Debounce history search so we do not refetch on every keystroke.
  useEffect(() => {
    const id = window.setTimeout(() => setHistorySearchDebounced(historySearchTerm), 400);
    return () => window.clearTimeout(id);
  }, [historySearchTerm]);

  // Default: select first machine when completed-items have loaded
  useEffect(() => {
    if (!machineAssignmentsLoading && machineAssignments.length > 0 && selectedMachineAssignmentId === null) {
      loadOrdersForMachine(machineAssignments[0]);
    }
  }, [machineAssignmentsLoading, machineAssignments, selectedMachineAssignmentId, loadOrdersForMachine]);

  useEffect(() => {
    if (!showHistoryDrawer) {
      historyLastFiltersRef.current = "__init__";
    }
  }, [showHistoryDrawer]);

  // Keep current page in range when total pages changes.
  useEffect(() => {
    if (!Number.isFinite(historyDrawerTotalPages) || historyDrawerTotalPages <= 0) return;
    setHistoryPage((p) => Math.min(Math.max(1, p), historyDrawerTotalPages));
  }, [historyDrawerTotalPages]);

  // History drawer: server-paged yarn_returned list (limit ≤ 100 per API contract).
  useEffect(() => {
    if (!showHistoryDrawer || !hasPermission) return;

    const filtersKey = `${historySearchDebounced}|${historyDateRange.from}|${historyDateRange.to}`;
    const filtersChanged = historyLastFiltersRef.current !== filtersKey;
    historyLastFiltersRef.current = filtersKey;

    const pageToFetch = filtersChanged ? 1 : historyPage;
    if (filtersChanged && historyPage !== 1) {
      setHistoryPage(1);
    }

    let cancelled = false;
    setHistoryDrawerLoading(true);
    const loadHistory = async () => {
      const token = getAccessToken();
      try {
        const r = await fetchYarnReturnedHistoryPage(token, pageToFetch, {
          yarnName: historySearchDebounced.trim() || undefined,
          startDate: historyDateRange.from || undefined,
          endDate: historyDateRange.to || undefined,
        });
        if (!cancelled) {
          setHistoryDrawerRows(r.rows);
          setHistoryDrawerTotalResults(r.totalResults);
          setHistoryDrawerTotalPages(r.totalPages);
        }
      } catch (err) {
        if (!cancelled) console.warn("Fetch return transactions for history:", err);
      } finally {
        if (!cancelled) setHistoryDrawerLoading(false);
      }
    };
    loadHistory();
    return () => {
      cancelled = true;
      setHistoryDrawerLoading(false);
    };
  }, [
    showHistoryDrawer,
    hasPermission,
    historyPage,
    historySearchDebounced,
    historyDateRange.from,
    historyDateRange.to,
  ]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  );

  // Lazy-load GET article-return-slice for the selected machine article (default: first after machine pick).
  useEffect(() => {
    if (quickReturnOrder) return;
    if (!selectedArticleRowId || machineArticleCatalogRows.length === 0) return;

    const catalogRow = machineArticleCatalogRows.find((r) => r.rowId === selectedArticleRowId);
    if (!catalogRow) return;

    let cancelled = false;
    setArticleSliceLoadingRowId(selectedArticleRowId);

    (async () => {
      try {
        const slice = await fetchArticleReturnSlice({
          orderId: catalogRow.orderId,
          ...(catalogRow.sliceFetchArticleId ? { articleId: catalogRow.sliceFetchArticleId } : {}),
          ...(catalogRow.sliceFetchArticleNumber
            ? { articleNumber: catalogRow.sliceFetchArticleNumber }
            : {}),
        });
        if (cancelled) return;

        const mergedFromApi = articleRowFromSlice(
          slice,
          catalogRow.orderNumber,
          catalogRow.plannedQuantity ?? 0
        );
        // Keep catalog rowId/articleId so selection and pending filters stay stable (API may use different id shape).
        const mergedRow: ArticleRow = {
          ...mergedFromApi,
          rowId: catalogRow.rowId,
          articleId: catalogRow.articleId,
          articleNumber: catalogRow.articleNumber,
        };
        setArticleSliceCache((prev) => ({ ...prev, [catalogRow.rowId]: mergedRow }));

        setOrders((prev) =>
          prev.map((o) => {
            if (o.id !== catalogRow.orderId) return o;
            return {
              ...o,
              productionOrder: slice.productionOrder,
              floor: slice.floor,
              knittingSupervisor: slice.knittingSupervisor,
              knittingCompletedAt: slice.knittingCompletedAt ?? o.knittingCompletedAt,
              status: mapSliceStatusToOrderStatus(slice.status),
              cones: slice.cones.map(mapSliceConeToPageCone),
              hasIssuedTransactions: slice.cones.length > 0,
            };
          })
        );
      } catch (e) {
        if (cancelled) return;
        console.warn("article-return-slice:", e);
        toast.error(e instanceof Error ? e.message : "Failed to load article data");
      } finally {
        if (!cancelled) {
          setArticleSliceLoadingRowId((cur) => (cur === selectedArticleRowId ? null : cur));
        }
      }
    })();

    return () => {
      cancelled = true;
      setArticleSliceLoadingRowId(null);
    };
  }, [selectedArticleRowId, machineArticleCatalogRows, quickReturnOrder]);

  /** Keep focus on the scan barcode field when the panel is active (portal + modal transitions need explicit focus). */
  useEffect(() => {
    if (!showScanReturnPanel && !showQuickReturnDrawer) return;
    if (showScanReturnPanel && !selectedOrderId) return;
    if (showReturnModal) return;
    if (barcodeLoading || storingCone || loadingQuickReturnOrder) return;
    const ref = showQuickReturnDrawer ? quickReturnBarcodeInputRef : scanBarcodeInputRef;
    const t = window.setTimeout(() => {
      ref.current?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(t);
  }, [
    showScanReturnPanel,
    showQuickReturnDrawer,
    selectedOrderId,
    showReturnModal,
    scannedBarcodes.length,
    barcodeLoading,
    storingCone,
    loadingQuickReturnOrder,
  ]);

  /** When the return modal opens, focus the first weight field so Enter can submit without clicking. */
  useEffect(() => {
    if (!showReturnModal) return;
    const t = window.setTimeout(() => {
      returnModalPrimaryInputRef.current?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(t);
  }, [showReturnModal]);

  // Build article rows: lazy machine catalog + per-article slice cache, or from orders (quick return / legacy).
  const articleRows = useMemo(() => {
    if (!quickReturnOrder && machineArticleCatalogRows.length > 0) {
      return machineArticleCatalogRows.map((r) => articleSliceCache[r.rowId] ?? r);
    }
    const sourceOrders = quickReturnOrder ? [quickReturnOrder] : orders;
    const rows: ArticleRow[] = [];
    for (const order of sourceOrders) {
      const articles = order.articles?.length ? order.articles : [{ id: order.id, articleNumber: order.orderNumber, plannedQuantity: 0 } as Article];
      const soleArticle = articles.length === 1;
      const firstArticleId = articles[0] ? articles[0].id || (articles[0] as any)._id : undefined;
      const firstNorm = normalizeArticleRefId(firstArticleId);
      for (let ai = 0; ai < articles.length; ai++) {
        const art = articles[ai];
        const artId = art.id || (art as any)._id;
        const artNorm = normalizeArticleRefId(artId);
        const artNum = String(art.articleNumber ?? "").trim();
        const rowPrefix = artNorm || artNum || `slot${ai}`;
        let conesForArticle = order.cones.filter((c) => {
          const cid = normalizeArticleRefId(c.articleId);
          if (cid && artNorm && cid === artNorm) return true;
          const cnum = String(c.articleNumber ?? "").trim();
          if (cnum && artNum && cnum === artNum) return true;
          // Legacy orphan cones: only when this PO truly has one article row (never pin orphans to "first" on multi-article orders).
          const orphan = !normalizeArticleRefId(c.articleId) && !String(c.articleNumber ?? "").trim();
          if (orphan && soleArticle && artNorm && firstNorm && artNorm === firstNorm) return true;
          return false;
        });
        if (conesForArticle.length === 0 && order.cones.length > 0 && soleArticle) {
          conesForArticle = order.cones;
        }
        const yarnNames = Array.from(new Set(conesForArticle.map((c) => c.yarnName).filter(Boolean))).join(", ");
        rows.push({
          rowId: `${rowPrefix}-${order.id}`,
          articleId: artNorm || String(artId ?? "").trim() || rowPrefix,
          articleNumber: art.articleNumber,
          orderId: order.id,
          orderNumber: order.orderNumber,
          productionOrder: order.productionOrder || order.orderNumber,
          floor: order.floor,
          knittingSupervisor: order.knittingSupervisor,
          knittingCompletedAt: order.knittingCompletedAt,
          status: order.status,
          cones: conesForArticle,
          plannedQuantity: art.plannedQuantity ?? 0,
          yarnNames,
        });
      }
    }
    return rows;
  }, [articleSliceCache, machineArticleCatalogRows, orders, quickReturnOrder]);

  // Pending article rows: include unloaded catalog rows; exclude fully returned once slice is loaded.
  const pendingArticles = useMemo(() => {
    return articleRows.filter((row) => {
      if (row.cones.length === 0) return true;
      return row.cones.some((cone) => cone.status !== "Returned");
    });
  }, [articleRows]);

  const totalPendingCones = useMemo(
    () =>
      articleRows.reduce(
        (sum, row) => sum + row.cones.filter((c) => c.status !== "Returned").length,
        0
      ),
    [articleRows]
  );

  const totalReturnedCones = useMemo(
    () =>
      articleRows.reduce((sum, row) => sum + row.cones.filter((c) => c.status === "Returned").length, 0),
    [articleRows]
  );

  /** Article lines fully returned (slice loaded, all cones Returned). */
  const totalCompletedOrders = useMemo(() => {
    return articleRows.filter(
      (row) => row.cones.length > 0 && row.cones.every((cone) => cone.status === "Returned")
    ).length;
  }, [articleRows]);

  const selectedArticleRow = useMemo(
    () => articleRows.find((r) => r.rowId === selectedArticleRowId) ?? null,
    [articleRows, selectedArticleRowId]
  );

  /** Order context for scan + return: machine flow uses selected order; quick return uses cone-resolved order. */
  const effectiveReturnOrder = useMemo((): ProductionOrder | null => {
    if (showQuickReturnDrawer) return quickReturnOrder;
    return selectedOrder;
  }, [showQuickReturnDrawer, quickReturnOrder, selectedOrder]);

  /** Article row for scan panel summary in quick mode (derive from resolved order + cone article). */
  const effectiveArticleRowForScan = useMemo((): ArticleRow | null => {
    if (!showQuickReturnDrawer || !quickReturnOrder) return selectedArticleRow;
    const order = quickReturnOrder;
    const articles = order.articles?.length
      ? order.articles
      : [{ id: order.id, articleNumber: order.orderNumber, plannedQuantity: 0 } as Article];
    const norm = normalizeArticleRefId;
    const soleArticle = articles.length === 1;
    const firstId = articles[0] ? norm(articles[0].id || (articles[0] as any)._id) : "";
    let art = articles[0];
    for (const a of articles) {
      const aid = norm(a.id || (a as any)._id);
      if (aid && order.cones.some((c) => norm(c.articleId) === aid)) {
        art = a;
        break;
      }
    }
    const artId = norm(art?.id ?? (art as any)?._id) || firstId;
    let conesForArticle = order.cones.filter((c) => {
      if (norm(c.articleId) && norm(c.articleId) === artId) return true;
      if (c.articleNumber && art?.articleNumber && String(c.articleNumber).trim() === String(art.articleNumber).trim()) return true;
      const orphan = !norm(c.articleId) && !String(c.articleNumber ?? "").trim();
      if (orphan && soleArticle && artId && firstId && artId === firstId) return true;
      return false;
    });
    if (conesForArticle.length === 0 && order.cones.length > 0 && soleArticle) {
      conesForArticle = order.cones;
    }
    const yarnNames = Array.from(new Set(conesForArticle.map((c) => c.yarnName).filter(Boolean))).join(", ");
    return {
      rowId: `${artId}-${order.id}`,
      articleId: artId,
      articleNumber: art?.articleNumber ?? "—",
      orderId: order.id,
      orderNumber: order.orderNumber,
      productionOrder: order.productionOrder || order.orderNumber,
      floor: order.floor,
      knittingSupervisor: order.knittingSupervisor,
      knittingCompletedAt: order.knittingCompletedAt,
      status: order.status,
      cones: conesForArticle,
      plannedQuantity: art?.plannedQuantity ?? 0,
      yarnNames,
    };
  }, [showQuickReturnDrawer, quickReturnOrder, selectedArticleRow]);

  const scanPanelYarnSummaryLines = useMemo(() => {
    const cones =
      showQuickReturnDrawer
        ? effectiveArticleRowForScan?.cones ?? quickReturnOrder?.cones ?? []
        : selectedArticleRow?.cones ?? selectedOrder?.cones ?? [];
    return yarnSummaryLinesFromCones(cones);
  }, [
    showQuickReturnDrawer,
    effectiveArticleRowForScan,
    quickReturnOrder,
    selectedOrder,
    selectedArticleRow,
  ]);

  const yarnNamesDrawerLines = useMemo(
    () => (yarnNamesDrawerRow ? yarnSummaryLinesFromCones(yarnNamesDrawerRow.cones) : []),
    [yarnNamesDrawerRow]
  );

  // Keep selection stable on machine+catalog flow: slice rowId must match catalog (see lazy fetch).
  useEffect(() => {
    const machineCatalogUi =
      !quickReturnOrder && machineArticleCatalogRows.length > 0;

    const selectionInCatalog = (id: string | null) =>
      Boolean(id && machineArticleCatalogRows.some((r) => r.rowId === id));

    if (machineCatalogUi) {
      if (
        selectedArticleRowId &&
        articleSliceLoadingRowId === selectedArticleRowId
      ) {
        return;
      }

      if (pendingArticles.length === 0) {
        if (!selectionInCatalog(selectedArticleRowId)) {
          setSelectedOrderId(null);
          setSelectedArticleRowId(null);
        }
        return;
      }

      const isSelectedPending =
        Boolean(selectedArticleRowId) &&
        pendingArticles.some((a) => a.rowId === selectedArticleRowId);
      if (isSelectedPending) return;
      if (selectionInCatalog(selectedArticleRowId)) return;

      const first = pendingArticles[0];
      setSelectedOrderId(first.orderId);
      setSelectedArticleRowId(first.rowId);
      return;
    }

    if (pendingArticles.length === 0) {
      setSelectedOrderId(null);
      setSelectedArticleRowId(null);
      return;
    }
    const isSelectedPending =
      selectedArticleRowId && pendingArticles.some((a) => a.rowId === selectedArticleRowId);
    if (!isSelectedPending) {
      const first = pendingArticles[0];
      setSelectedOrderId(first.orderId);
      setSelectedArticleRowId(first.rowId);
    }
  }, [
    pendingArticles,
    selectedArticleRowId,
    machineArticleCatalogRows,
    articleSliceLoadingRowId,
    quickReturnOrder,
  ]);

  useEffect(() => {
    if (!pendingToastShown.current && pendingArticles.length > 0) {
      pendingToastShown.current = true;
      toast("Knitting completed orders are awaiting cone return.", {
        icon: "🧵",
      });
    }
  }, [pendingArticles]);

  // Only articles whose cones are pending for return
  const filteredArticleRows = useMemo(() => pendingArticles, [pendingArticles]);

  /** Data table lists only the article selected in “Select Article”. */
  const selectedTableArticleRows = useMemo(() => {
    if (!selectedArticleRowId) return [];
    const row = articleRows.find((r) => r.rowId === selectedArticleRowId);
    return row ? [row] : [];
  }, [articleRows, selectedArticleRowId]);

  const isSelectedArticleSliceLoading = useMemo(
    () =>
      Boolean(
        selectedArticleRowId &&
          machineArticleCatalogRows.length > 0 &&
          articleSliceLoadingRowId === selectedArticleRowId
      ),
    [selectedArticleRowId, machineArticleCatalogRows.length, articleSliceLoadingRowId]
  );

  /** Find machine assignment row that contains this production order (for yarn-return status when not on selected machine). */
  const findMachineAssignmentForOrderId = useCallback(
    (orderId: string): MachineOrderAssignmentTopItems | null => {
      for (const a of machineAssignments) {
        const items = a.productionOrderItems ?? [];
        for (const it of items) {
          const po = it.productionOrder;
          const oid =
            typeof po === "string" ? po : po?.id ?? (po as { _id?: string })?._id ?? "";
          if (String(oid) === String(orderId)) return a;
        }
      }
      return null;
    },
    [machineAssignments]
  );

  /** Get assignment item ids and article numbers for an order (for yarn-return-status API). Must be before any early return (hooks order). */
  const getAssignmentItemsForOrder = useCallback(
    (
      orderId: string,
      assignmentOverride?: MachineOrderAssignmentTopItems | null
    ): { itemId: string; articleNumber: string; articleId: string }[] => {
      const assignment = assignmentOverride ?? selectedMachineAssignment;
      const assignmentKey = assignment?.id ?? (assignment as { _id?: string } | null)?._id;
      if (!assignment || !assignmentKey || !assignment.productionOrderItems?.length) return [];
      return assignment.productionOrderItems
        .filter((item) => {
          const po = item.productionOrder;
          const oid = typeof po === "string" ? po : (po?.id ?? (po as { _id?: string })?._id ?? "");
          return String(oid) === String(orderId);
        })
        .map((item) => {
          const art = item.article;
          const aid = typeof art === "string" ? art : (art as { id?: string; _id?: string })?.id ?? (art as { _id?: string })?._id ?? "";
          return {
            itemId: item.itemId ?? (item as { id?: string; _id?: string }).id ?? (item as { _id?: string })._id ?? "",
            articleNumber: item.articleNumber ?? (typeof art === "object" && art ? (art as { articleNumber?: string }).articleNumber ?? "" : ""),
            articleId: aid,
          };
        })
        .filter((x) => x.itemId);
    },
    [selectedMachineAssignment]
  );

  /** Normalize id for comparison (handles ObjectId vs string). */
  const normId = (id: string | undefined): string => String(id ?? "").trim();

  /** Get assignment item for a specific (order, article) pair. Returns single item or null. */
  const getAssignmentItemForArticle = useCallback(
    (
      orderId: string,
      articleId: string,
      assignmentOverride?: MachineOrderAssignmentTopItems | null
    ): { itemId: string; articleNumber: string } | null => {
      const items = getAssignmentItemsForOrder(orderId, assignmentOverride);
      const item = items.find((i) => normId(i.articleId) === normId(articleId));
      return item ? { itemId: item.itemId, articleNumber: item.articleNumber } : null;
    },
    [getAssignmentItemsForOrder]
  );

  /** Check if all cones for a specific article are returned. Matches by articleId or articleNumber. */
  const isArticleAllConesReturned = useCallback(
    (order: ProductionOrder, articleId: string | undefined): boolean => {
      const art = order.articles?.find((a) => normId(a.id ?? (a as any)._id) === normId(articleId));
      const artNumber = art?.articleNumber?.trim();
      const hasArticleInfo = order.cones.some((c) => c.articleId || c.articleNumber);
      const conesForArticle = hasArticleInfo
        ? order.cones.filter(
            (c) =>
              normId(c.articleId) === normId(articleId) ||
              (artNumber && c.articleNumber && String(c.articleNumber).trim() === artNumber)
          )
        : order.cones;
      if (conesForArticle.length === 0) return false;
      return conesForArticle.every((c) => c.status === "Returned");
    },
    []
  );

  const isInitialLoad = machineAssignmentsLoading || (ordersLoading && orders.length === 0);
  if (isLoading || isInitialLoad) {
    return (
      <div className="main-content !p-[10px]">
        <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 p-[10px]">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50"></div>
            <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading Data</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="main-content !p-[10px]">
        <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 p-[10px]">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-gray-400 mb-4">
              <i className="ri-lock-line text-5xl"></i>
            </div>
            <h3 className="text-xs font-bold text-gray-400 mb-1">Access Restricted</h3>
            <p className="text-[11px] text-gray-500 mb-4">You don&apos;t have permission to access Yarn Return.</p>
            <Link href="/yarn-management" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700">
              <i className="ri-arrow-left-line"></i> Back to Yarn Management
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const upsertHistoryRecord = (order: ProductionOrder) => {
    const record = buildHistoryRecord(order);
    setHistory((prev) => {
      const index = prev.findIndex((item) => item.orderId === order.id);
      if (index === -1) {
        return [...prev, record];
      }
      const copy = [...prev];
      copy[index] = record;
      return copy;
    });
  };

  const handleReturnConesClick = (orderId: string, articleRowId?: string) => {
    setSelectedOrderId(orderId);
    if (articleRowId) setSelectedArticleRowId(articleRowId);
    setShowQuickReturnDrawer(false);
    setQuickReturnOrder(null);
    setShowScanReturnPanel(true);
    setScanPanelSummaryOpen(false);
    setBarcodeInput("");
    setScannedBarcodes([]);
    setScannedConeData(new Map());
    setRackBarcodes(new Map());
    setRackInputByCone({});
    setActiveConeId(null);
    setTransactionForm({
      totalWeight: "",
      numberOfCones: "1",
      totalTearWeight: "0",
      totalNetWeight: "",
    });
  };

  const resetQuickReturnScanState = () => {
    setQuickReturnSummaryOpen(false);
    setScanPanelSummaryOpen(false);
    setBarcodeInput("");
    setScanError(null);
    setScannedBarcodes([]);
    setScannedConeData(new Map());
    setRackBarcodes(new Map());
    setRackInputByCone({});
    setActiveConeId(null);
    setTransactionForm({
      totalWeight: "",
      numberOfCones: "1",
      totalTearWeight: "0",
      totalNetWeight: "",
    });
  };

  // const handleOpenQuickReturnDrawer = () => {
  //   setShowScanReturnPanel(false);
  //   setShowQuickReturnDrawer(true);
  //   setQuickReturnOrder(null);
  //   resetQuickReturnScanState();
  // };

  const handleCloseQuickReturnDrawer = () => {
    setShowQuickReturnDrawer(false);
    setQuickReturnOrder(null);
    resetQuickReturnScanState();
  };

  /**
   * Validates short-term (ST) rack slot, updates the cone storage id, and stores the mapping for submit.
   */
  const handleStoreConeInRack = async (coneBarcode: string, rackBarcode: string) => {
    console.log("🏪 Storing cone in rack:", {
      coneBarcode,
      rackBarcode,
    });
    
    setStoringCone(true);
    try {
      const token = getAccessToken();
      
      // First, get the cone details to get the cone ID
      console.log("🔍 Fetching cone details for storage:", coneBarcode);
      const coneResponse = await fetch(
        `${API_BASE_URL}/yarn-management/yarn-cones/barcode/${coneBarcode}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      console.log("📡 Cone fetch response status:", coneResponse.status, coneResponse.ok);

      if (!coneResponse.ok) {
        console.error("❌ Failed to fetch cone details:", coneResponse.status);
        throw new Error("Failed to fetch cone details");
      }

      const coneDetails = await coneResponse.json();
      const coneId = coneDetails._id || coneDetails.id;

      console.log("📦 Cone details retrieved:", {
        coneId,
        coneBarcode: coneDetails.barcode,
        coneDetails,
      });

      if (!coneId) {
        console.error("❌ Cone ID not found in response:", coneDetails);
        throw new Error("Cone ID not found");
      }

      // Validate rack barcode by fetching slot details
      console.log("🔍 Validating rack barcode:", rackBarcode);
      const slotDetails = await storageSlotService.getSlotDetailsByBarcode(rackBarcode);
      
      console.log("🏷️ Slot details:", {
        zoneType: slotDetails?.zoneType,
        zoneCode: slotDetails?.storageSlot?.zoneCode,
        slotLabel: slotDetails?.storageSlot?.label,
        slotBarcode: slotDetails?.storageSlot?.barcode,
        hasSlotDetails: !!slotDetails,
      });
      
      // Check if it's a short-term storage rack (zoneType can be "SHORT_TERM" or zoneCode can be "ST")
      const isShortTerm = slotDetails && (
        slotDetails.zoneType === "SHORT_TERM" || 
        slotDetails.zoneType === "ST" ||
        slotDetails.storageSlot?.zoneCode === "ST"
      );
      
      if (!slotDetails || !isShortTerm) {
        console.error("❌ Invalid rack - not ST zone:", {
          zoneType: slotDetails?.zoneType,
          zoneCode: slotDetails?.storageSlot?.zoneCode,
          hasSlotDetails: !!slotDetails,
        });
        throw new Error("Invalid rack barcode. Must be a short-term storage rack.");
      }

      // Update cone with rack storage location
      console.log("💾 Updating cone with storage location:", {
        coneId,
        coneStorageId: rackBarcode,
      });
      
      await yarnConeService.updateYarnCone(coneId, {
        coneStorageId: rackBarcode,
      });

      console.log("✅ Cone updated with storage location");

      // Update stored cone data with latest coneWeight from API response
      const updatedConeData = new Map(scannedConeData);
      const existingConeData = updatedConeData.get(coneBarcode);
      if (existingConeData) {
        // Get the latest coneWeight from the API response (remaining yarn weight)
        const latestConeWeight = coneDetails.coneWeight || 0;
        updatedConeData.set(coneBarcode, {
          ...existingConeData,
          coneDetails: {
            ...existingConeData.coneDetails,
            ...coneDetails, // Update with latest API response including coneWeight
          },
          coneWeight: latestConeWeight, // Update top-level coneWeight with latest value
        });
        setScannedConeData(updatedConeData);
        console.log("📦 Updated cone data with latest coneWeight:", {
          barcode: coneBarcode,
          coneWeight: latestConeWeight,
          coneDetailsConeWeight: coneDetails.coneWeight,
        });
      }

      // Store rack barcode mapping
      const newRackBarcodes = new Map(rackBarcodes);
      newRackBarcodes.set(coneBarcode, rackBarcode);
      setRackBarcodes(newRackBarcodes);

      console.log("📊 Rack barcodes mapping:", {
        totalScanned: scannedBarcodes.length,
        totalStored: newRackBarcodes.size,
        mapping: Array.from(newRackBarcodes.entries()),
      });

      toast.success(`Cone stored in rack ${rackBarcode}`);
    } catch (error) {
      console.error("❌ Error storing cone in rack:", {
        error,
        coneBarcode,
        rackBarcode,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      toast.error(error instanceof Error ? error.message : "Failed to store cone in rack");
    } finally {
      setStoringCone(false);
    }
  };

  /**
   * Applies a short-term rack barcode from the Return modal draft field for the given cone.
   */
  const applyRackFromModalDraft = async (coneBarcode: string) => {
    const raw = (rackInputByCone[coneBarcode] ?? "").trim();
    if (!raw) {
      toast.error("Enter or scan a rack barcode.");
      return;
    }
    if (batchIsEmptyByGross) {
      toast.error(
        `Gross weight is at or below ${EMPTY_CONE_MAX_GROSS_WEIGHT_KG} kg (empty batch); rack is not used.`
      );
      return;
    }
    await handleStoreConeInRack(coneBarcode, raw);
    setRackInputByCone((prev) => {
      const next = { ...prev };
      delete next[coneBarcode];
      return next;
    });
  };

  const handleBarcodeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!showQuickReturnDrawer && !selectedOrder) {
      toast.error("Select a production order to continue.");
      return;
    }

    const value = barcodeInput.trim();
    if (!value) {
      toast.error("Scan or enter a cone barcode to continue.");
      return;
    }

    // Handle cone barcode scanning
    setScanError(null);
    // Check if barcode is already scanned
    if (scannedBarcodes.includes(value)) {
      setScanError("This barcode has already been scanned.");
      return;
    }

    setBarcodeLoading(true);
    try {
      const token = getAccessToken();
      const response = await fetch(
        `${API_BASE_URL}/yarn-management/yarn-cones/barcode/${value}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch cone details");
      }

      const coneDetails = await response.json();

      // ORDER + ARTICLE VALIDATION (from cone / transaction side):
      const normalizeId = (id: any): string =>
        String(
          typeof id === "object" && id !== null
            ? id._id || id.id || ""
            : id ?? ""
        ).trim();

      // Check if cone has been issued - only issued cones can be returned.
      // 'used' cones have already been returned empty and cannot be returned again.
      const issueStatus = (coneDetails.issueStatus ?? coneDetails.issue_status ?? "").toString().toLowerCase();
      if (issueStatus === "used") {
        setScanError(
          "This cone has already been used (returned empty previously) and cannot be returned again."
        );
        return;
      }
      if (issueStatus !== "issued") {
        setScanError("This cone has not been issued and cannot be returned. Only issued cones can be returned.");
        return;
      }

      // Check if cone is already returned (from API response)
      if (coneDetails.returnStatus === "returned") {
        setScanError("This cone has already been returned and cannot be returned again.");
        return;
      }

      /** Resolve production order from transactions when using quick return (no machine/article pick). */
      let orderCtx: ProductionOrder | null = showQuickReturnDrawer ? quickReturnOrder : selectedOrder;

      if (showQuickReturnDrawer && !orderCtx) {
        const ids = await resolveQuickReturnOrderRefs(coneDetails, token);
        if (!ids) {
          setScanError(
            "Could not resolve production order from this cone. Need a valid orderId, or the production order could not be loaded."
          );
          return;
        }
        setLoadingQuickReturnOrder(true);
        try {
          const stubArticles = articleStubFromConeDetails(coneDetails);
          const fallbackArticle: Article =
            stubArticles[0] ?? {
              id: normalizeId(coneDetails.articleId) || ids.orderId,
              articleNumber: (coneDetails.articleNumber as string) || "—",
              plannedQuantity: 0,
              linkingType: "Auto Linking",
              priority: "Medium",
              status: "Pending",
            };
          const loaded = await fetchOrderWithCones(token, ids.orderNumber, ids.orderId, {
            floor: (coneDetails as { floor?: string }).floor ?? "N/A",
            articles: stubArticles.length ? stubArticles : [fallbackArticle],
          });
          orderCtx = loaded;
          setQuickReturnOrder(loaded);
          try {
            const res = await fetch(
              `${API_BASE_URL}/yarn-management/yarn-transactions?order_id=${ids.orderId}`,
              { headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) } }
            );
            if (res.ok) {
              const data = await res.json();
              const txs = extractTransactions(data).filter(
                (tx: any) => tx.transactionType === "yarn_returned"
              ) as ReturnTransaction[];
              setReturnTransactions((prev) => {
                const rest = prev.filter(
                  (tx) =>
                    txOrderId(tx) !== ids.orderId &&
                    (txOrderno(tx) ?? tx.orderno) !== ids.orderNumber
                );
                return [...rest, ...txs];
              });
            }
          } catch {
            /* ignore */
          }
        } finally {
          setLoadingQuickReturnOrder(false);
        }
        if (!orderCtx) {
          setScanError("Could not load order data for this cone. Try again or use the main return flow.");
          return;
        }
      }

      if (!orderCtx) {
        toast.error("Select a production order to continue.");
        return;
      }

      console.log("🔍 Cone Details from API:", {
        barcode: value,
        coneDetails,
        selectedOrderNumber: productionOrderNoForApi(orderCtx),
        orderConesCount: orderCtx.cones.length,
        orderConesBarcodes: orderCtx.cones.map((c) => c.barcode),
        quickReturn: showQuickReturnDrawer,
      });

      // 1) Order check
      if (coneDetails.orderId) {
        const coneOrderId = normalizeId(coneDetails.orderId);
        const currentOrderId = normalizeId(orderCtx.id);

        console.log("🔎 Order validation:", {
          coneOrderId,
          currentOrderId,
        });

        if (coneOrderId && currentOrderId && coneOrderId !== currentOrderId) {
          console.log("🔎 Order mismatch detected, blocking cone scan.", {
            coneOrderId,
            currentOrderId,
          });
          setScanError(
            "This cone belongs to a different production order and cannot be returned here."
          );
          return;
        }
      }

      // 2) Article check
      if (coneDetails.articleId) {
        const coneArticleId = normalizeId(coneDetails.articleId);
        if (coneArticleId) {
          const matchesAnyArticleInOrder =
            Array.isArray(orderCtx.articles) &&
            orderCtx.articles.length > 0 &&
            orderCtx.articles.some(
              (a) => normalizeId((a as any)._id ?? a.id) === coneArticleId
            );
          const matchesConeRow = orderCtx.cones.some(
            (c) => normalizeId(c.articleId) === coneArticleId
          );

          console.log("🔎 Article validation:", {
            coneArticleId,
            orderArticles: orderCtx.articles?.map((a) => ({
              backendId: (a as any)._id,
              frontendId: a.id,
              articleNumber: a.articleNumber,
              matches: normalizeId((a as any)._id ?? a.id) === coneArticleId,
            })),
            matchesAnyArticleInOrder,
            matchesConeRow,
            quickReturn: showQuickReturnDrawer,
          });

          if (!matchesAnyArticleInOrder && !matchesConeRow) {
            setScanError(
              showQuickReturnDrawer
                ? "This cone does not match the articles/yarn issued for this production order."
                : "This cone belongs to a different article than the one selected."
            );
            return;
          }
        }
      }

      // Check if cone was already returned for this order/article (from return transactions).
      // Important: treat cone API status as source of truth. Some historical tx payloads can
      // contain ids that don't represent a true "already returned" state for this cone.
      const orderReturnTxs = returnTransactions.filter(
        (tx) =>
          (txOrderno(tx) ?? tx.orderno) === productionOrderNoForApi(orderCtx) ||
          txOrderId(tx) === orderCtx.id
      );
      const returnedConeIds = new Set<string>();
      for (const tx of orderReturnTxs) {
        for (const id of txnConeRefStrings(tx)) returnedConeIds.add(id);
      }
      const returnedConeBarcodes = new Set(
        orderReturnTxs
          .map((tx) => ((tx as any).coneBarcode ?? "").toString().trim())
          .filter(Boolean)
      );
      const coneIdToCheck = String(coneDetails._id ?? coneDetails.id ?? value);
      const coneIdRaw = coneIdToCheck.replace(/-\d+$/, "");
      const coneBarcodeToCheck = String(coneDetails.barcode ?? value).trim();
      const appearsReturnedInHistory =
        returnedConeIds.has(coneIdToCheck) ||
        returnedConeIds.has(coneIdRaw) ||
        returnedConeBarcodes.has(coneBarcodeToCheck);
      const coneApiReturnStatus = String(coneDetails.returnStatus ?? "").toLowerCase();

      // Only block from history when cone API does not explicitly say "not_returned".
      if (appearsReturnedInHistory && coneApiReturnStatus !== "not_returned") {
        setScanError("This cone has already been returned for this order and cannot be returned again.");
        return;
      }

      // Find the cone in the selected order (try multiple matching strategies)
      // Only search in pending cones (not returned ones) - this prevents showing returned cones
      const pendingCones = orderCtx.cones.filter(
        (item) => item.status !== "Returned"
      );

      // If no pending cones, this order has no cones to return (quick return: still allow API-built cone)
      if (pendingCones.length === 0 && !showQuickReturnDrawer) {
        setScanError("This order has no pending cones to return.");
        return;
      }

      console.log("🔎 Attempting to find cone in order by barcode:", value);
      console.log("📊 Order cones:", {
        total: orderCtx.cones.length,
        pending: pendingCones.length,
        returned: orderCtx.cones.length - pendingCones.length,
      });
      
      let cone = pendingCones.find(
        (item) => item.barcode.toLowerCase() === value.toLowerCase()
      );

      if (cone) {
        console.log("✅ Cone found in order by barcode:", {
          coneId: cone.id,
          coneBarcode: cone.barcode,
          coneStatus: cone.status,
        });
      } else {
        console.log("❌ Cone not found by barcode, trying _id match...");
        // If not found by barcode, try matching by _id
        if (coneDetails._id) {
          cone = pendingCones.find(
            (item) => item.id === coneDetails._id || item.id === coneDetails.id
          );

          if (cone) {
            console.log("✅ Cone found in order by _id:", {
              coneId: cone.id,
              coneBarcode: cone.barcode,
              searchedId: coneDetails._id,
            });
          } else {
            console.log("❌ Cone not found by _id either");
          }
        }
      }

      // If still not found, create a cone object from the API response
      if (!cone) {
        console.log("📦 Creating cone object from API response:", {
          coneDetailsId: coneDetails._id,
          coneDetailsBarcode: coneDetails.barcode,
          issueWeight: coneDetails.issueWeight,
          returnStatus: coneDetails.returnStatus,
        });
        
        // Create a cone object from the API response (use selectedArticleRow.articleId when user selected article for return)
        const scannedCatalogId = resolveYarnCatalogId(coneDetails);
        cone = {
          id: coneDetails._id || coneDetails.id || value,
          barcode: coneDetails.barcode || value,
          yarnCode: scannedCatalogId || (coneDetails as { yarnCode?: string }).yarnCode || "N/A",
          yarnName: coneDetails.yarnName || "Unknown Yarn",
          yarnType: coneDetails.yarn?.yarnType?.name || "Unknown",
          issuedWeight: coneDetails.issueWeight || 0,
          returnedWeight: coneDetails.returnWeight,
          balanceWeight: coneDetails.issueWeight && coneDetails.returnWeight
            ? Math.max(coneDetails.issueWeight - coneDetails.returnWeight, 0)
            : undefined,
          status: coneDetails.returnStatus === "returned" ? "Returned" as ConeStatus : "Awaiting" as ConeStatus,
          lastReturnedAt: coneDetails.returnDate,
          transactionId: coneDetails.transactionId,
          yarnCatalogId: scannedCatalogId || undefined,
          articleId: coneDetails.articleId ?? selectedArticleRow?.articleId,
          articleNumber: coneDetails.articleNumber ?? selectedArticleRow?.articleNumber,
        };
        
        console.log("✅ Created cone object:", {
          id: cone.id,
          barcode: cone.barcode,
          status: cone.status,
          issuedWeight: cone.issuedWeight,
        });
      }

      cone = mergeConeWithYarnConeApiResponse(cone, coneDetails as Record<string, unknown>);

      // Check if cone is already returned (double check)
      if (cone.status === "Returned" || coneDetails.returnStatus === "returned") {
        setScanError("This cone has already been returned and cannot be returned again.");
        return;
      }

      // Get cone weight from API response
      const coneWeight = coneDetails.coneWeight || 0;
      
      console.log("🔍 Cone scanned, opening Return flow when quota met:", {
        barcode: value,
        coneWeight,
        issuedWeight: coneDetails.issueWeight || cone.issuedWeight || 0,
      });

      const storedConeWeight = coneDetails?.coneWeight || coneWeight || 0;
      const newScannedBarcodes = [...scannedBarcodes, value];
      const newScannedConeData = new Map(scannedConeData);
      newScannedConeData.set(value, {
        ...coneDetails,
        cone,
        coneWeight: storedConeWeight,
        coneDetails,
      });

      setScanError(null);
      setScannedBarcodes(newScannedBarcodes);
      setScannedConeData(newScannedConeData);
      setBarcodeInput("");

      const numCones = parseInt(transactionForm.numberOfCones || "1", 10) || 1;
      if (newScannedBarcodes.length >= numCones) {
        setShowReturnModal(true);
        toast.success(
          `All ${numCones} cone(s) scanned. Enter gross weight — empty batch if ≤ ${EMPTY_CONE_MAX_GROSS_WEIGHT_KG} kg, otherwise assign short-term racks.`
        );
      } else {
        toast.success(`Cone scanned (${newScannedBarcodes.length}/${numCones}).`);
      }
    } catch (error) {
      console.error("Error fetching cone:", error);
      setScanError("Failed to fetch cone details. Please check the barcode.");
    } finally {
      setBarcodeLoading(false);
    }
  };

  const handleTransactionFormChange = (field: string, value: string) => {
    setTransactionForm((prev) => {
      const updated = { ...prev, [field]: value };
      
      // Calculate totalNetWeight when totalWeight or totalTearWeight changes
      if (field === "totalWeight" || field === "totalTearWeight") {
        const totalWeight = parseFloat(updated.totalWeight) || 0;
        const totalTearWeight = parseFloat(updated.totalTearWeight) || 0;
        updated.totalNetWeight = (totalWeight - totalTearWeight).toFixed(2);
      }
      
      return updated;
    });
  };

  const handleReturnSubmit = async () => {
    const orderForSubmit = effectiveReturnOrder;
    if (!orderForSubmit || scannedBarcodes.length === 0) {
      toast.error("Missing required information.");
      return;
    }

    // Validate form
    const totalWeight = parseFloat(transactionForm.totalWeight);
    const numberOfCones = parseInt(transactionForm.numberOfCones);
    const totalTearWeight = parseFloat(transactionForm.totalTearWeight) || 0;
    const totalNetWeight = parseFloat(transactionForm.totalNetWeight) || 0;

    /** Same rule as Return modal UX: gross weight at or below threshold means empty batch (no racks). */
    const batchEmptyByThreshold =
      Number.isFinite(totalWeight) && totalWeight <= EMPTY_CONE_MAX_GROSS_WEIGHT_KG;

    if (Number.isNaN(totalWeight) || totalWeight < 0) {
      toast.error("Enter a valid total weight.");
      return;
    }

    if (scannedBarcodes.length !== numberOfCones) {
      toast.error(`Number of scanned barcodes (${scannedBarcodes.length}) must match number of cones (${numberOfCones}).`);
      return;
    }

    const conesNeedingRack = batchEmptyByThreshold ? [] : scannedBarcodes;
    const allConesStored = conesNeedingRack.every((barcode) => rackBarcodes.has(barcode));
    if (!allConesStored) {
      const missingRackCones = conesNeedingRack.filter((barcode) => !rackBarcodes.has(barcode));
      toast.error(
        `Enter gross weight above ${EMPTY_CONE_MAX_GROSS_WEIGHT_KG} kg and assign short-term racks for each cone. Missing rack for: ${missingRackCones.join(", ")}`
      );
      return;
    }

    setSubmittingReturn(true);
    try {
      const token = getAccessToken();
      const transactionDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

      // Create a transaction for each scanned barcode
      const transactionPromises = scannedBarcodes.map(async (barcode) => {
        const coneDataFromMap = scannedConeData.get(barcode);
        const cone = coneDataFromMap?.cone;
        
        if (!cone) {
          throw new Error(`Cone data not found for barcode: ${barcode}`);
        }

        const isConeEmpty = batchEmptyByThreshold;
        
        // Get original cone weight, issued weight, and tear weight
        const originalConeWeight = coneDataFromMap?.coneWeight || 
                                   coneDataFromMap?.coneDetails?.coneWeight || 
                                   0;
        const issuedWeight = cone.issuedWeight || 
                            coneDataFromMap?.coneDetails?.issueWeight || 
                            0;
        // Use tearWeight from cone details (already on cone) or from user input
        const coneTearWeight = coneDataFromMap?.coneDetails?.tearWeight || 0;
        const userTearWeight = parseFloat(transactionForm.totalTearWeight) || 0;
        const tearWeight = coneTearWeight || userTearWeight; // Prefer cone's tearWeight, fallback to user input
        
        // IMPORTANT: do not auto‑distribute by numberOfCones.
        // Whatever user enters in the modal is per‑cone weight.
        // We just pass those values through to:
        // - the transaction payload, and
        // - the cone PATCH payload.
        let weightPerCone = totalNetWeight;      // modal "Total Net Weight"
        let tearWeightPerCone = totalTearWeight; // modal "Total Tear Weight"
        const totalWeightPerCone = totalWeight;  // modal "Total Weight"

        // For empty cones we force everything to zero regardless of form values.
        if (isConeEmpty) {
          weightPerCone = 0;
          tearWeightPerCone = 0;
          console.log("📦 Empty cone detected, setting per-cone weights to 0:", barcode);
        }

        // YarnCatalog _id only (not YarnInventory, box/cone/tx/order ids).
        let yarnId: string | null = null;

        if (coneDataFromMap) {
          yarnId = resolveYarnCatalogId({
            yarnCatalogId:
              coneDataFromMap.yarnCatalogId ?? coneDataFromMap.coneDetails?.yarnCatalogId,
            yarn: coneDataFromMap.yarn ?? coneDataFromMap.coneDetails?.yarn,
            inventory: coneDataFromMap.inventory ?? coneDataFromMap.coneDetails?.inventory,
          });
        }

        if (!yarnId || yarnId === "N/A") {
          yarnId = resolveYarnCatalogId({ yarnCatalogId: cone.yarnCatalogId });
        }

        if ((!yarnId || yarnId === "N/A") && orderForSubmit) {
          const orderCone = orderForSubmit.cones.find(
            (c) => c.barcode.toLowerCase() === barcode.toLowerCase() || c.id === cone.id
          );
          if (orderCone && orderCone.yarnCatalogId && orderCone.yarnCatalogId !== "N/A") {
            yarnId = orderCone.yarnCatalogId;
            console.log("✅ Got yarn catalog id from order cone:", yarnId);
          }
        }

        if ((!yarnId || yarnId === "N/A") && cone.transactionId) {
          console.log("🔍 Fetching yarn catalog id from issued transaction:", cone.transactionId);
          try {
            const txResponse = await fetch(
              `${API_BASE_URL}/yarn-management/yarn-transactions/${cone.transactionId}`,
              {
                headers: {
                  "Content-Type": "application/json",
                  ...(token && { Authorization: `Bearer ${token}` }),
                },
              }
            );

            if (txResponse.ok) {
              const txData = await txResponse.json();
              yarnId = resolveYarnCatalogId(txData);
              console.log("✅ Resolved yarn catalog id from transaction:", yarnId);
            } else {
              console.warn("⚠️ Transaction fetch failed:", txResponse.status);
            }
          } catch (txError) {
            console.error("❌ Failed to fetch transaction:", txError);
          }
        }

        if ((!yarnId || yarnId === "N/A") && orderForSubmit && cone.yarnName) {
          console.log("🔍 Querying issued transactions for order:", productionOrderNoForApi(orderForSubmit));
          try {
            const txListResponse = await fetch(
              `${API_BASE_URL}/yarn-management/yarn-transactions/yarn-issued-by-order/${encodeURIComponent(
                productionOrderNoForApi(orderForSubmit)
              )}`,
              {
                headers: {
                  "Content-Type": "application/json",
                  ...(token && { Authorization: `Bearer ${token}` }),
                },
              }
            );

            if (txListResponse.ok) {
              const txListData = await txListResponse.json();
              let issuedTransactions = extractTransactions(txListData);
              issuedTransactions = issuedTransactions.filter((tx: any) => tx.transactionType === "yarn_issued");

              console.log("📋 Found issued transactions:", issuedTransactions.length);

              let matchingTx = issuedTransactions.find(
                (tx: any) =>
                  tx.coneBarcode === barcode || tx.coneBarcode?.toLowerCase() === barcode.toLowerCase()
              );

              if (!matchingTx && cone.yarnName) {
                matchingTx = issuedTransactions.find(
                  (tx: any) =>
                    tx.yarnName === cone.yarnName ||
                    tx.yarnName?.toLowerCase() === cone.yarnName.toLowerCase()
                );
                console.log("🔍 Matching by yarnName:", cone.yarnName, matchingTx ? "Found" : "Not found");
              }

              if (!matchingTx && issuedTransactions.length === 1) {
                matchingTx = issuedTransactions[0];
                console.log("🔍 Using single transaction as fallback");
              }

              if (matchingTx) {
                yarnId = resolveYarnCatalogIdFromTransaction(matchingTx);
                console.log("✅ Resolved yarn catalog id from matching transaction:", {
                  yarnId,
                  transactionId: matchingTx._id,
                  yarnName: matchingTx.yarnName,
                });
              } else {
                console.warn("⚠️ No matching transaction found:", {
                  searchedBarcode: barcode,
                  searchedYarnName: cone.yarnName,
                  availableTransactions: issuedTransactions.map((tx: any) => ({
                    id: tx._id,
                    yarnName: tx.yarnName,
                    coneBarcode: tx.coneBarcode,
                  })),
                });
              }
            }
          } catch (txListError) {
            console.error("❌ Failed to query transactions:", txListError);
          }
        }
        
        if (!yarnId || yarnId === "N/A") {
          console.error("❌ Invalid yarn ID after all attempts:", {
            yarnId,
            coneDataYarn: coneDataFromMap?.yarn,
            coneYarnCatalogId: cone.yarnCatalogId,
            coneYarnCode: cone.yarnCode,
            transactionId: cone.transactionId,
          });
          throw new Error(
            `Invalid yarn ID for cone ${barcode}. Cannot create return transaction. Please ensure the cone was properly issued.`
          );
        }

        // Plain string for POST (catalog id only; do not unwrap random object._id)
        const yarnIdString = String(yarnId).trim();

        console.log("[yarn-return] POST yarn catalog id (verify: db.yarncatalogs.findOne({ _id: ObjectId(...) }) ):", {
          yarnCatalogId: yarnIdString,
          yarnName: cone.yarnName,
          barcode,
        });

        const returnArticleId = cone.articleId ?? effectiveArticleRowForScan?.articleId;
        let rawArticleNumber = cone.articleNumber ?? effectiveArticleRowForScan?.articleNumber;
        if ((!rawArticleNumber || rawArticleNumber === "—") && returnArticleId && orderForSubmit?.articles?.length) {
          const matchedArt = orderForSubmit.articles.find(
            (a) => String(a.id || (a as any)._id).trim() === String(returnArticleId).trim()
          );
          if (matchedArt?.articleNumber) rawArticleNumber = matchedArt.articleNumber;
        }
        const returnArticleNumber = rawArticleNumber && rawArticleNumber !== "—" ? rawArticleNumber : undefined;

        const transactionData = {
          yarn: yarnIdString, // legacy: YarnCatalog _id
          yarnCatalogId: yarnIdString,
          yarnName: cone.yarnName,
          transactionType: "yarn_returned",
          transactionDate: transactionDate,
          totalWeight: totalWeightPerCone,
          totalTearWeight: tearWeightPerCone,
          totalNetWeight: weightPerCone,
          numberOfCones: 1,
          orderno: productionOrderNoForApi(orderForSubmit),
          orderId: orderForSubmit.id,
          conesIdsArray: [String(cone.id).replace(/-\d+$/, "") || cone.id],
          ...(returnArticleId && {
            articleId: returnArticleId,
            articleNumber: returnArticleNumber,
          }),
        };

        const response = await fetch(`${API_BASE_URL}/yarn-management/yarn-transactions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(transactionData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to create return transaction for ${barcode}`);
        }

        const createdTx = await response.json().catch(() => null);

        // Update cone return status after successful transaction
        const coneId = coneDataFromMap?._id || coneDataFromMap?.id;
        
        if (!coneId) {
          throw new Error(`Cone ID not found for barcode: ${barcode}`);
        }

        // Prepare cone update data based on whether it's empty or has remaining yarn
        const coneUpdateData: any = {
          returnStatus: "returned",
          // Business rule: the same net weight that is entered in the modal
          // (per cone) should be sent as both `returnWeight` and `coneWeight`.
          // Example: if total net weight is 2kg for one cone, we PATCH
          // { coneWeight: 2, returnWeight: 2 }.
          returnWeight: weightPerCone,
          coneWeight: weightPerCone,
          tearWeight: tearWeightPerCone,
        };

        if (isConeEmpty) {
          // Empty cone: keep coneWeight/returnWeight/tearWeight at 0
          // and don't update storage.
          console.log("📦 Updating empty cone:", {
            coneId,
            barcode,
            coneWeight: 0,
            tearWeight: 0,
            returnWeight: 0,
          });
        } else {
          // Update storage location with rack barcode
          const rackBarcode = rackBarcodes.get(barcode);
          if (rackBarcode) {
            coneUpdateData.coneStorageId = rackBarcode;
          }
          
          console.log("📦 Updating cone with remaining yarn:", {
            coneId,
            barcode,
            originalConeWeight,
            issuedWeight,
            coneTearWeight: tearWeight,
            coneWeight: coneUpdateData.coneWeight,
            transactionTearWeight: tearWeightPerCone,
            returnWeight: coneUpdateData.returnWeight,
            coneStorageId: rackBarcode,
          });
        }

        // Update cone return status via separate API call
        const updateConeResponse = await fetch(`${API_BASE_URL}/yarn-management/yarn-cones/${coneId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(coneUpdateData),
        });

        if (!updateConeResponse.ok) {
          const errorData = await updateConeResponse.json().catch(() => ({}));
          console.error(`Failed to update cone return status for ${barcode}:`, errorData);
          // Continue even if status update fails, but log the error
        }

        return { barcode, cone, coneId, weightPerCone, createdTx };
      });

      // Wait for all transactions to complete
      const results = await Promise.all(transactionPromises);

      // Add created return transactions to history immediately
      const createdTxs = results.map((r) => r.createdTx).filter(Boolean);
      if (createdTxs.length > 0) {
        const normalized = createdTxs.map((tx: any) => ({
          ...tx,
          orderno: tx.orderno ?? tx.orderId?.orderNumber ?? (typeof tx.orderId === "object" ? (tx.orderId as any)?.orderNumber : undefined),
        })) as ReturnTransaction[];
        setReturnTransactions((prev) => [...prev, ...normalized]);
      }

      // Update local state for all returned cones
      const updatedCones = orderForSubmit.cones.map((cone) => {
        const returnedResult = results.find(
          (r) => r.cone.id === cone.id || r.cone.barcode === cone.barcode
        );
        if (returnedResult) {
          return {
            ...cone,
            returnedWeight: returnedResult.weightPerCone,
            balanceWeight: Math.max(cone.issuedWeight - returnedResult.weightPerCone, 0),
            status: "Returned" as ConeStatus,
            lastReturnedAt: new Date().toISOString(),
          };
        }
        return cone;
      });
      const updatedOrder: ProductionOrder = {
        ...orderForSubmit,
        cones: updatedCones,
        status: getOrderStatusFromCones(updatedCones),
        lastUpdated: new Date().toISOString(),
      };

      setOrders((prev) => {
        const idx = prev.findIndex((o) => o.id === orderForSubmit.id);
        if (idx === -1) return prev;
        const copy = [...prev];
        copy[idx] = updatedOrder;
        return copy;
      });
      // Quick return: clear resolved order after success so the next scan re-resolves
      // from the cone (otherwise the previous orderId stays in state and a different
      // order's cone incorrectly fails validation).
      if (showQuickReturnDrawer) {
        setQuickReturnOrder(null);
        setQuickReturnSummaryOpen(false);
      }

      if (updatedOrder) {
        upsertHistoryRecord(updatedOrder);

        const preserveArticleSelection =
          !showQuickReturnDrawer && selectedArticleRow
            ? { orderId: selectedArticleRow.orderId, articleRowId: selectedArticleRow.rowId }
            : undefined;

        toast.success(`${results.length} cone(s) marked returned successfully.`);

        // Close modal and reset
        setShowReturnModal(false);
        setBarcodeInput("");
        setScannedBarcodes([]);
        setScannedConeData(new Map());
        setRackBarcodes(new Map());
        setRackInputByCone({});
        setTransactionForm({
          totalWeight: "",
          numberOfCones: "1",
          totalTearWeight: "0",
          totalNetWeight: "",
        });

        if (updatedOrder.status === "Returned") {
          toast.success(
            `All cones returned for ${updatedOrder.productionOrder}. Production order is now cleared.`
          );
        }

        // After return API 200: update assignment item yarn-return status per ARTICLE (not whole order)
        const assignmentForReturn =
          findMachineAssignmentForOrderId(updatedOrder.id) ?? selectedMachineAssignment;
        const assignmentIdForReturn =
          assignmentForReturn?.id ?? (assignmentForReturn as { _id?: string } | null)?._id;

        if (assignmentIdForReturn) {
          const allItems = getAssignmentItemsForOrder(updatedOrder.id, assignmentForReturn);
          const articleIdsToUpdate = Array.from(
            new Set(
              [
                ...results.map((r) => r.cone.articleId).filter(Boolean),
                ...(selectedArticleRow?.articleId ? [selectedArticleRow.articleId] : []),
                ...allItems.map((i) => i.articleId).filter(Boolean),
              ].map(String)
            )
          );
          const itemsToUpdate =
            articleIdsToUpdate.length > 0
              ? articleIdsToUpdate
                  .map((aid) =>
                    getAssignmentItemForArticle(updatedOrder.id, aid, assignmentForReturn)
                  )
                  .filter((x): x is NonNullable<typeof x> => x != null)
              : allItems
                  .map((i) => ({ itemId: i.itemId, articleNumber: i.articleNumber }))
                  .filter((x) => !!x.itemId);
          const pendingBefore = orderForSubmit.cones.filter((c) => c.status !== "Returned").length;
          const justReturnedLastBatch = results.length >= pendingBefore;
          if (itemsToUpdate.length > 0) {
            try {
              for (const item of itemsToUpdate) {
                const articleId = allItems.find((i) => i.itemId === item.itemId)?.articleId;
                const allReturned =
                  justReturnedLastBatch ||
                  isArticleAllConesReturned(updatedOrder, articleId) ||
                  updatedOrder.status === "Returned";
                const yarnReturnStatus = allReturned ? "Completed" : "In Progress";
                await updateAssignmentItemYarnReturnStatus(
                  assignmentIdForReturn,
                  item.itemId,
                  yarnReturnStatus
                );
              }
              const anyCompleted =
                justReturnedLastBatch || updatedOrder.status === "Returned";
              toast.success(
                anyCompleted
                  ? "Assignment item return status updated."
                  : "Assignment item marked in progress."
              );
              if (!showQuickReturnDrawer && selectedMachineAssignment) {
                await loadOrdersForMachine(selectedMachineAssignment, {
                  preserveSelection: preserveArticleSelection,
                });
              }
            } catch (err) {
              console.error("Assignment yarn-return status update failed:", err);
              toast.error("Cones returned, but failed to update assignment yarn-return status.");
            }
          } else {
            console.warn("Assignment yarn-return status not updated: no items for order", productionOrderNoForApi(updatedOrder));
          }
        } else {
          console.warn("Assignment yarn-return status not updated: no machine assignment for this order");
        }

        // Refetch transactions to ensure we have the latest data
        try {
          const token = getAccessToken();
          const transactionsResponse = await fetch(
            `${API_BASE_URL}/yarn-management/yarn-transactions/yarn-issued-by-order/${encodeURIComponent(
              productionOrderNoForApi(orderForSubmit)
            )}`,
            {
              headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` }),
              },
            }
          );

          if (transactionsResponse.ok) {
            const issuedData = await transactionsResponse.json();
            let issuedTransactions = extractTransactions(issuedData);
            issuedTransactions = issuedTransactions.filter((tx: any) => tx.transactionType === "yarn_issued");
            
            // Fetch returned transactions
            let returnedTransactions: any[] = [];
            try {
              const allTransactionsResponse = await fetch(
                `${API_BASE_URL}/yarn-management/yarn-transactions?order_id=${orderForSubmit.id}`,
                {
                  headers: {
                    "Content-Type": "application/json",
                    ...(token && { Authorization: `Bearer ${token}` }),
                  },
                }
              );
              if (allTransactionsResponse.ok) {
                const allTransactions = await allTransactionsResponse.json();
                returnedTransactions = extractTransactions(allTransactions);
                returnedTransactions = returnedTransactions.filter((tx: any) => tx.transactionType === "yarn_returned");
              }
            } catch (err) {
              console.warn("Could not fetch returned transactions:", err);
            }

            issuedTransactions = issuedTransactions.filter((tx: any) => {
              const oid = txOrderId(tx);
              return !oid || String(oid) === String(orderForSubmit.id);
            });
            returnedTransactions = returnedTransactions.filter((tx: any) => {
              const oid = txOrderId(tx);
              return !oid || String(oid) === String(orderForSubmit.id);
            });

            const updatedCones = buildConesFromIssuedAndReturned(
              issuedTransactions,
              returnedTransactions
            );
            setOrders((prev) =>
              prev.map((order) => {
                if (order.id !== orderForSubmit.id) {
                  return order;
                }
                return {
                  ...order,
                  cones: updatedCones,
                  status: getOrderStatusFromCones(updatedCones),
                  lastUpdated: new Date().toISOString(),
                };
              })
            );
            // Do not set quickReturnOrder here: after a successful quick return we keep it
            // null so the next cone scan starts fresh (see setQuickReturnOrder above).

            // Refresh return transactions for this order (merge API response with just-created txs in case of race)
            const fromApi = (returnedTransactions as any[]).map((tx) => ({
              ...tx,
              orderno: tx.orderno ?? tx.orderId?.orderNumber ?? (typeof tx.orderId === "object" ? (tx.orderId as any)?.orderNumber : undefined),
            })) as ReturnTransaction[];
            const merged = [
              ...createdTxs.filter((c) => !fromApi.some((f) => f._id === c._id)),
              ...fromApi,
            ];
            setReturnTransactions((prev) => {
              const orderno = productionOrderNoForApi(orderForSubmit);
              const filtered = prev.filter(
                (tx) =>
                  (txOrderno(tx) ?? tx.orderno) !== orderno && txOrderId(tx) !== orderForSubmit.id
              );
              return [...filtered, ...merged];
            });
          }
        } catch (error) {
          console.error("Error refetching transactions:", error);
          // Don't show error to user, local state is already updated
        }

        // Also refresh all return transactions to ensure we have the latest data
        try {
          const token = getAccessToken();
          const allOrderIds = Array.from(
            new Set(
              [...orders.map((o) => o.id), orderForSubmit.id].filter(Boolean) as string[]
            )
          );
          const allReturnTransactions: ReturnTransaction[] = [];
          
          await Promise.all(
            allOrderIds.map(async (orderId) => {
              try {
                const transactionsResponse = await fetch(
                  `${API_BASE_URL}/yarn-management/yarn-transactions?order_id=${orderId}`,
                  {
                    headers: {
                      "Content-Type": "application/json",
                      ...(token && { Authorization: `Bearer ${token}` }),
                    },
                  }
                );

                if (transactionsResponse.ok) {
                  const transactionsData = await transactionsResponse.json();
                  const transactions = extractTransactions(transactionsData);
                  const returnedTxs = transactions.filter(
                    (tx: any) => tx.transactionType === "yarn_returned"
                  ) as ReturnTransaction[];
                  allReturnTransactions.push(...returnedTxs);
                }
              } catch (err) {
                console.warn(`Failed to refresh return transactions for order ${orderId}:`, err);
              }
            })
          );

          setReturnTransactions(allReturnTransactions);
        } catch (error) {
          console.error("Error refreshing return transactions:", error);
        }

        // Reload orders and return transactions from API so pending counts (Orders Awaiting, Cones Pending, etc.) are correct
        if (!showQuickReturnDrawer && selectedMachineAssignment) {
          await loadOrdersForMachine(selectedMachineAssignment, {
            preserveSelection: preserveArticleSelection,
          });
        }
      }
    } catch (error) {
      console.error("Error creating return transaction:", error);
      toast.error(error instanceof Error ? error.message : "Failed to return cone. Please try again.");
    } finally {
      setSubmittingReturn(false);
    }
  };

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Yarn Return" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px] border-b border-gray-100">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Yarn Return</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {pendingArticles.length}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* <button
                type="button"
                onClick={handleOpenQuickReturnDrawer}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-purple-200 text-purple-700 text-[11px] font-bold rounded hover:bg-purple-50 transition-colors"
                title="Return cones when the order is not on the list — order comes from the scanned cone"
              >
                <i className="ri-scan-2-line text-sm"></i>
                Quick return
              </button> */}
              <button
                type="button"
                onClick={() => {
                  setHistoryPage(1);
                  setShowHistoryDrawer(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors"
              >
                <i className="ri-history-line text-sm"></i>
                History
              </button>
            </div>
          </div>
        </div>

        <div className="px-[10px] pb-[10px] pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <div className="flex items-center justify-between p-3 rounded border-l-4 border-blue-200 bg-blue-50 border border-gray-100">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Orders Awaiting</p>
                <p className="text-sm font-bold text-blue-600 truncate">{pendingArticles.length}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded border-l-4 border-orange-200 bg-orange-50 border border-gray-100">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Cones Pending</p>
                <p className="text-sm font-bold text-orange-600 truncate">{totalPendingCones}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded border-l-4 border-purple-200 bg-purple-50 border border-gray-100">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Cones Returned</p>
                <p className="text-sm font-bold text-purple-600 truncate">{totalReturnedCones}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded border-l-4 border-green-200 bg-green-50 border border-gray-100">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Orders Cleared</p>
                <p className="text-sm font-bold text-green-600 truncate">{totalCompletedOrders}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 p-[10px] pt-0">
          <div className="xl:col-span-1 flex flex-col border border-gray-200 rounded overflow-hidden bg-gray-50/30">
            <div className="p-[10px] border-b border-gray-200 bg-white">
              <h2 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Machines (completed items)</h2>
              {/* <button
                type="button"
                onClick={handleMarkAllReturned}
                disabled={markingAllReturned || machineAssignments.length === 0}
                className="inline-flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-[10px] font-bold rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {markingAllReturned ? (
                  <>
                    <span className="animate-spin">⟳</span>
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="ri-check-double-line text-xs"></i>
                    Mark All Returned
                  </>
                )}
              </button> */}
            </div>
            <div className="p-[10px] flex-1 min-h-0 overflow-auto">
              <div className="relative mb-3">
                <input
                  type="text"
                  className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-full placeholder:text-gray-400 font-medium"
                  placeholder="Search machine..."
                  value={machineSearchTerm}
                  onChange={(e) => setMachineSearchTerm(e.target.value)}
                />
                <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              </div>
              {machineAssignmentsLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent mb-2" />
                  <p className="text-[11px] text-gray-500">Loading machines...</p>
                </div>
              ) : (
                <AssignmentsCards
                  rows={
                    machineSearchTerm.trim()
                      ? machineAssignments.filter((a) =>
                          machineLabel(a).toLowerCase().includes(machineSearchTerm.trim().toLowerCase())
                        )
                      : machineAssignments
                  }
                  page={1}
                  limit={machineAssignments.length || 20}
                  totalResults={
                    machineSearchTerm.trim()
                      ? machineAssignments.filter((a) =>
                          machineLabel(a).toLowerCase().includes(machineSearchTerm.trim().toLowerCase())
                        ).length
                      : machineAssignments.length
                  }
                  totalPages={1}
                  isLoading={false}
                  onPageChange={() => {}}
                  readOnly
                  compact
                  nameOnly
                  onCardClick={(a) => loadOrdersForMachine(a as MachineOrderAssignmentTopItems)}
                />
              )}
            </div>
          </div>

          <div className="xl:col-span-2 space-y-4">
            {!selectedMachineAssignment ? (
              <div className="border border-gray-200 rounded overflow-hidden bg-white p-[10px]">
                <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
                  <i className="ri-settings-3-line text-5xl text-gray-300 mb-4"></i>
                  <p className="text-[11px]">Select a machine to view its articles and cone returns.</p>
                </div>
              </div>
            ) : ordersLoading ? (
              <div className="border border-gray-200 rounded overflow-hidden bg-white p-[10px]">
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent mb-2" />
                  <p className="text-[11px] text-gray-500">Loading articles and cones...</p>
                </div>
              </div>
            ) : (
              <>
                {pendingArticles.length > 0 && (
                <div className="border border-gray-200 rounded overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={() => setOrderSelectOpen((o) => !o)}
                    className="w-full p-[10px] flex justify-between items-center border-b border-gray-100 bg-gray-50/50 hover:bg-gray-50 text-left"
                  >
                    <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Select Article</h3>
                    <span className="text-gray-500 text-sm">
                      {selectedArticleRow?.articleNumber ?? "—"} · {filteredArticleRows.length} article{filteredArticleRows.length !== 1 ? "s" : ""}
                    </span>
                    <i className={`ri-arrow-down-s-line text-lg text-gray-500 transition-transform ${orderSelectOpen ? "rotate-180" : ""}`} />
                  </button>
                  {orderSelectOpen && (
                    <div className="p-[10px] border-b border-gray-100">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[200px] overflow-y-auto">
                        {filteredArticleRows.map((row) => {
                          const actualPendingCones = row.cones.filter((c) => c.status !== "Returned").length;
                          const isSelected = selectedArticleRowId === row.rowId;
                          return (
                            <button
                              key={row.rowId}
                              type="button"
                              onClick={() => {
                                setSelectedOrderId(row.orderId);
                                setSelectedArticleRowId(row.rowId);
                              }}
                              className={`text-left rounded-lg border-2 p-2.5 transition-all ${
                                isSelected
                                  ? "border-purple-500 bg-purple-50 shadow-sm ring-1 ring-purple-200"
                                  : "border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50"
                              }`}
                            >
                              <div className="text-[12px] font-bold text-gray-900 truncate">{row.articleNumber}</div>
                              <div className="text-[10px] text-gray-500 mt-0.5 truncate" title={row.yarnNames || undefined}>{row.yarnNames || "—"}</div>
                              <div className="text-[10px] text-gray-500 mt-0.5 truncate">Prod: {row.productionOrder}</div>
                              <div className="text-[10px] text-gray-600 mt-1 font-medium">{actualPendingCones} pending</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                )}

                {selectedMachineAssignment && pendingArticles.length > 0 && (
                  <div className="border border-gray-200 rounded overflow-hidden bg-white">
                    <div className="p-[10px] flex justify-between items-start gap-4 border-b border-gray-100">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium text-purple-600 uppercase tracking-wider mb-0.5">
                          Machine: {machineLabel(selectedMachineAssignment)}
                        </p>
                        {(selectedOrder || selectedArticleRowId) && (
                          <>
                            <h2 className="text-sm font-bold text-gray-800">
                              {selectedArticleRow?.articleNumber ?? selectedOrder?.orderNumber ?? "—"}
                            </h2>
                            <p className="text-[11px] text-gray-500">
                              Prod. order: {selectedOrder ? productionOrderNoForApi(selectedOrder) : "—"} · {selectedOrder?.floor ?? "—"}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-[10px] pt-0">
                  <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Selected article — return details
                    {pendingArticles.length > 0 && (
                      <span className="text-gray-400 font-semibold normal-case ml-1">
                        ({filteredArticleRows.length} to choose · showing 1 row)
                      </span>
                    )}
                  </h3>
                </div>
                <div className="overflow-x-auto min-h-[200px]">
                  {pendingArticles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="text-gray-400 mb-4">
                        <i className="ri-checkbox-circle-line text-5xl"></i>
                      </div>
                      <h3 className="text-xs font-bold text-gray-400 mb-1">All caught up!</h3>
                      <p className="text-[11px] text-gray-500">No knitting-complete articles awaiting cone return for this machine.</p>
                    </div>
                  ) : (
                    <table className="w-full border-collapse border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50/30">
                          <th className="pl-[10px] pr-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Article</th>
                          <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Yarn Name</th>
                          <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Production Order</th>
                          <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Floor</th>
                          <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Knitting Completed</th>
                          <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Supervisor</th>
                          <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Cones</th>
                          <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                          <th className="px-1.5 py-2.5 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isSelectedArticleSliceLoading ? (
                          <tr>
                            <td colSpan={9} className="border border-gray-200 py-16 text-center align-middle">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
                                <p className="text-[11px] font-medium text-gray-500">Loading article data…</p>
                              </div>
                            </td>
                          </tr>
                        ) : selectedTableArticleRows.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="border border-gray-200 py-12 text-center text-[11px] text-gray-500">
                              Select an article above to view return details.
                            </td>
                          </tr>
                        ) : (
                          selectedTableArticleRows.map((row) => {
                            const actualPendingCones = row.cones.filter((c) => c.status !== "Returned").length;
                            return (
                              <tr key={row.rowId} className="hover:bg-gray-50/50 transition-colors">
                                <td className="pl-[10px] pr-1.5 py-2 border border-gray-200 text-[12px] font-bold text-gray-900">{row.articleNumber}</td>
                                <td className="px-1.5 py-2 border border-gray-200 text-center">
                                  {row.cones.some((c) => (c.yarnName || "").trim()) ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setYarnNamesDrawerRow(row);
                                      }}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-purple-600 transition-colors hover:border-purple-300 hover:bg-purple-50"
                                      title="View yarn names"
                                      aria-label={`View yarn names for article ${row.articleNumber}`}
                                    >
                                      <i className="ri-eye-line text-lg" />
                                    </button>
                                  ) : (
                                    <span className="text-[12px] text-gray-400">—</span>
                                  )}
                                </td>
                                <td className="px-1.5 py-2 text-[12px] text-gray-900 border border-gray-200">{row.productionOrder}</td>
                                <td className="px-1.5 py-2 text-[12px] text-gray-900 border border-gray-200">{row.floor}</td>
                                <td className="px-1.5 py-2 text-[12px] text-gray-600 border border-gray-200">
                                  {row.knittingCompletedAt?.trim()
                                    ? new Date(row.knittingCompletedAt).toLocaleString()
                                    : "—"}
                                </td>
                                <td className="px-1.5 py-2 text-[12px] text-gray-900 border border-gray-200">{row.knittingSupervisor}</td>
                                <td className="px-1.5 py-2 text-[12px] text-gray-900 border border-gray-200">{actualPendingCones} pending</td>
                                <td className="px-1.5 py-2 border border-gray-200">
                                  <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${statusBadgeColor(row.status)}`}>{row.status}</span>
                                </td>
                                <td className="px-1.5 py-2 text-right pr-[10px] border border-gray-200">
                                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                    <button type="button" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors" onClick={() => handleReturnConesClick(row.orderId, row.rowId)}>
                                      <i className="ri-reply-line text-sm"></i> Return Cones
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

      {/* Main: Scan & Return — separate portal from Quick return */}
      {showScanReturnPanel &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[10040] bg-black/50 transition-opacity"
              onClick={() => {
                setShowScanReturnPanel(false);
                setScanPanelSummaryOpen(false);
                setBarcodeInput("");
                setScanError(null);
                setScannedBarcodes([]);
                setScannedConeData(new Map());
                setRackBarcodes(new Map());
                setRackInputByCone({});
              }}
            />
            <div
              className="fixed top-0 right-0 z-[10050] flex h-[100dvh] max-h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="yarn-return-main-scan-title"
            >
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex-shrink-0 border-b border-gray-200 bg-white px-4 py-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 id="yarn-return-main-scan-title" className="text-lg font-bold text-gray-800">
                        Scan &amp; Return
                      </h3>
                      {(selectedOrder || selectedArticleRowId) && (
                        <p className="text-xs text-gray-500 mt-1">
                          {selectedArticleRow?.articleNumber ?? selectedOrder?.productionOrder ?? "—"}
                          {selectedOrder &&
                            productionOrderNoForApi(selectedOrder) &&
                            ` · Prod. order: ${productionOrderNoForApi(selectedOrder)}`}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowScanReturnPanel(false);
                        setScanPanelSummaryOpen(false);
                        setBarcodeInput("");
                        setScanError(null);
                        setScannedBarcodes([]);
                        setScannedConeData(new Map());
                        setRackBarcodes(new Map());
                        setRackInputByCone({});
                        setActiveConeId(null);
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="Close Scan and Return"
                    >
                      <i className="ri-close-line text-xl"></i>
                    </button>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-4 pb-6 pt-2 text-[0.813rem] text-defaulttextcolor [scrollbar-gutter:stable]">
                  {!selectedOrder ? (
                    <div className="text-center py-12 text-sm text-gray-500">
                      <i className="ri-focus-2-line text-4xl text-gray-300 mb-2"></i>
                      <p>Select an article to start returning cones.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedOrder && (
                        <div className="border border-dashed border-primary/40 rounded-md bg-primary/5 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setScanPanelSummaryOpen((o) => !o)}
                            className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-primary/[0.07] transition-colors"
                            aria-expanded={scanPanelSummaryOpen}
                            aria-label={scanPanelSummaryOpen ? "Hide yarn and floor details" : "Show yarn and floor details"}
                          >
                            <span className="text-sm font-semibold text-gray-900 truncate min-w-0">
                              {selectedArticleRow?.articleNumber ?? selectedOrder.productionOrder}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadgeColor(
                                  selectedOrder.status
                                )}`}
                              >
                                {selectedOrder.status}
                              </span>
                              <i
                                className={`ri-arrow-down-s-line text-lg text-gray-500 transition-transform ${scanPanelSummaryOpen ? "rotate-180" : ""}`}
                                aria-hidden={true}
                              />
                            </div>
                          </button>
                          {scanPanelSummaryOpen && (
                            <div className="px-3 pb-3 pt-0 border-t border-dashed border-primary/25 space-y-2">
                              {scanPanelYarnSummaryLines.length > 0 && (
                                <div
                                  className="max-h-[min(40vh,11rem)] overflow-y-auto overflow-x-hidden overscroll-y-contain rounded border border-gray-200/80 bg-white/60 px-2 py-1.5 [scrollbar-gutter:stable]"
                                  aria-label="Yarn list"
                                >
                                  <div className="text-xs text-gray-500 space-y-0.5">
                                    {scanPanelYarnSummaryLines.map((line, i) => (
                                      <div key={`main-${line}-${i}`} className="break-words">
                                        {line}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <p className="text-xs text-gray-500">Floor: {selectedOrder.floor}</p>
                              <p className="text-xs text-gray-500">
                                Cones:{" "}
                                {(selectedArticleRow ? selectedArticleRow.cones : selectedOrder.cones).filter(
                                  (c) => c.status !== "Returned"
                                ).length}{" "}
                                pending
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-4">
                        <div>
                          <label className="form-label text-sm font-semibold text-gray-700">
                            Number of Cones to Return
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            className="form-control"
                            placeholder="Enter number of cones"
                            value={transactionForm.numberOfCones}
                            onChange={(e) => {
                              const numCones = e.target.value;
                              setTransactionForm((prev) => ({
                                ...prev,
                                numberOfCones: numCones,
                              }));
                              if (scannedBarcodes.length > 0) {
                                setScannedBarcodes([]);
                                setScannedConeData(new Map());
                                setRackBarcodes(new Map());
                                setRackInputByCone({});
                              }
                            }}
                            disabled={scannedBarcodes.length > 0}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {scannedBarcodes.length > 0
                              ? "Cannot change number of cones after scanning has started. Clear scanned barcodes first."
                              : "Enter how many cones you want to return in this transaction."}
                          </p>
                        </div>

                        {parseInt(transactionForm.numberOfCones) > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-blue-900">Scanning Progress</span>
                              <span className="text-sm text-blue-700">
                                {scannedBarcodes.length} / {transactionForm.numberOfCones}
                              </span>
                            </div>
                            <div className="w-full bg-blue-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{
                                  width: `${(scannedBarcodes.length / parseInt(transactionForm.numberOfCones || "1")) * 100}%`,
                                }}
                              />
                            </div>
                            {scannedBarcodes.length > 0 && (
                              <div className="mt-2 space-y-1">
                                <p className="text-xs font-medium text-blue-900">Scanned cones:</p>
                                <div className="flex flex-wrap gap-1">
                                  {scannedBarcodes.map((barcode, index) => (
                                      <span
                                        key={index}
                                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                      >
                                        Cone: {barcode}
                                        <button
                                          type="button"
                                          aria-label={`Remove scanned cone ${barcode}`}
                                          onClick={() => {
                                            const newBarcodes = scannedBarcodes.filter((_, i) => i !== index);
                                            const newConeData = new Map(scannedConeData);
                                            const newRackBarcodes = new Map(rackBarcodes);
                                            newConeData.delete(barcode);
                                            newRackBarcodes.delete(barcode);
                                            setScannedBarcodes(newBarcodes);
                                            setScannedConeData(newConeData);
                                            setRackBarcodes(newRackBarcodes);
                                            setRackInputByCone((prev) => {
                                              const next = { ...prev };
                                              delete next[barcode];
                                              return next;
                                            });
                                          }}
                                          className="ml-1 text-blue-600 hover:text-blue-800"
                                        >
                                          <i className="ri-close-line text-xs"></i>
                                        </button>
                                      </span>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <form onSubmit={handleBarcodeSubmit} className="space-y-2">
                          <label className="form-label text-sm font-semibold text-gray-700">
                            Scan cone barcode
                          </label>
                          <div className="relative">
                            <input
                              ref={scanBarcodeInputRef}
                              type="text"
                              aria-label="Scan or enter cone barcode"
                              className={`form-control ps-10 ${scanError ? "border-red-500 focus:border-red-500" : ""}`}
                              placeholder="Scan or enter cone barcode"
                              value={barcodeInput}
                              onChange={(event) => {
                                setBarcodeInput(event.target.value);
                                if (scanError) setScanError(null);
                              }}
                              disabled={
                                barcodeLoading ||
                                storingCone ||
                                scannedBarcodes.length >= parseInt(transactionForm.numberOfCones || "1")
                              }
                            />
                            <i className="ri-barcode-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                          </div>
                          {scanError && (
                            <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
                              <i className="ri-error-warning-line text-base"></i>
                              {scanError}
                            </div>
                          )}
                          <button
                            type="submit"
                            className="ti-btn ti-btn-primary w-full whitespace-normal break-words leading-tight px-4 py-2 text-sm"
                            disabled={
                              barcodeLoading ||
                              storingCone ||
                              scannedBarcodes.length >= parseInt(transactionForm.numberOfCones || "1") ||
                              !transactionForm.numberOfCones ||
                              parseInt(transactionForm.numberOfCones) < 1
                            }
                          >
                            {barcodeLoading ? (
                              <>
                                <span className="animate-spin inline-block mr-2">⟳</span>
                                Loading...
                              </>
                            ) : storingCone ? (
                              <>
                                <span className="animate-spin inline-block mr-2">⟳</span>
                                Storing Cone...
                              </>
                            ) : scannedBarcodes.length >= parseInt(transactionForm.numberOfCones || "1") ? (
                              "All barcodes scanned"
                            ) : (
                              "Scan cone barcode"
                            )}
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>,
          document.body
        )}

      {/* Quick return — separate portal (cone-driven order); not mixed with main Scan & Return */}
      {showQuickReturnDrawer &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[10042] bg-black/50 transition-opacity"
              onClick={handleCloseQuickReturnDrawer}
            />
            <div
              className="fixed top-0 right-0 z-[10052] flex h-[100dvh] max-h-[100dvh] w-full max-w-md flex-col overflow-hidden border-l border-purple-100 bg-white shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="yarn-return-quick-drawer-title"
            >
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex-shrink-0 border-b border-purple-100 bg-purple-50/50 px-4 py-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 id="yarn-return-quick-drawer-title" className="text-lg font-bold text-gray-800">
                        Quick return
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">
                        {quickReturnOrder
                          ? `Prod. order: ${productionOrderNoForApi(quickReturnOrder)} · ${quickReturnOrder.floor ?? "—"}`
                          : "Scan a cone first — order and article come from the cone."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCloseQuickReturnDrawer}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="Close Quick return"
                    >
                      <i className="ri-close-line text-xl"></i>
                    </button>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-4 pb-6 pt-2 text-[0.813rem] text-defaulttextcolor [scrollbar-gutter:stable]">
                  <div className="space-y-4">
                    {!quickReturnOrder && (
                      <div className="rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
                        Set how many cones to return, then scan a cone — the production order and article are loaded from the cone (no article pick needed).
                      </div>
                    )}
                    {quickReturnOrder && (
                      <div className="border border-dashed border-purple-300/60 rounded-md bg-purple-50/30 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setQuickReturnSummaryOpen((o) => !o)}
                          className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-purple-50/80 transition-colors"
                          aria-expanded={quickReturnSummaryOpen}
                          aria-label={quickReturnSummaryOpen ? "Hide yarn and floor details" : "Show yarn and floor details"}
                        >
                          <span className="text-sm font-semibold text-gray-900 truncate min-w-0">
                            {effectiveArticleRowForScan?.articleNumber ?? quickReturnOrder.productionOrder}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadgeColor(
                                quickReturnOrder.status
                              )}`}
                            >
                              {quickReturnOrder.status}
                            </span>
                            <i
                              className={`ri-arrow-down-s-line text-lg text-gray-500 transition-transform ${quickReturnSummaryOpen ? "rotate-180" : ""}`}
                              aria-hidden={true}
                            />
                          </div>
                        </button>
                        {quickReturnSummaryOpen && (
                          <div className="px-3 pb-3 pt-0 border-t border-dashed border-purple-200/80 space-y-2">
                            {scanPanelYarnSummaryLines.length > 0 && (
                              <div
                                className="max-h-[min(40vh,11rem)] overflow-y-auto overflow-x-hidden overscroll-y-contain rounded border border-gray-200/80 bg-white/60 px-2 py-1.5 [scrollbar-gutter:stable]"
                                aria-label="Yarn list"
                              >
                                <div className="text-xs text-gray-500 space-y-0.5">
                                  {scanPanelYarnSummaryLines.map((line, i) => (
                                    <div key={`quick-${line}-${i}`} className="break-words">
                                      {line}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            <p className="text-xs text-gray-500">Floor: {quickReturnOrder.floor}</p>
                            <p className="text-xs text-gray-500">
                              Cones:{" "}
                              {(effectiveArticleRowForScan
                                ? effectiveArticleRowForScan.cones
                                : quickReturnOrder.cones
                              ).filter((c) => c.status !== "Returned").length}{" "}
                              pending
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <label className="form-label text-sm font-semibold text-gray-700">
                          Number of Cones to Return
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          className="form-control"
                          placeholder="Enter number of cones"
                          value={transactionForm.numberOfCones}
                          onChange={(e) => {
                            const numCones = e.target.value;
                            setTransactionForm((prev) => ({
                              ...prev,
                              numberOfCones: numCones,
                            }));
                            if (scannedBarcodes.length > 0) {
                              setScannedBarcodes([]);
                              setScannedConeData(new Map());
                              setRackBarcodes(new Map());
                              setRackInputByCone({});
                            }
                          }}
                          disabled={scannedBarcodes.length > 0}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {scannedBarcodes.length > 0
                            ? "Cannot change number of cones after scanning has started. Clear scanned barcodes first."
                            : "Enter how many cones you want to return in this transaction."}
                        </p>
                      </div>

                      {parseInt(transactionForm.numberOfCones) > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-blue-900">Scanning Progress</span>
                            <span className="text-sm text-blue-700">
                              {scannedBarcodes.length} / {transactionForm.numberOfCones}
                            </span>
                          </div>
                          <div className="w-full bg-blue-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{
                                width: `${(scannedBarcodes.length / parseInt(transactionForm.numberOfCones || "1")) * 100}%`,
                              }}
                            />
                          </div>
                          {scannedBarcodes.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs font-medium text-blue-900">Scanned cones:</p>
                              <div className="flex flex-wrap gap-1">
                                {scannedBarcodes.map((barcode, index) => (
                                    <span
                                      key={index}
                                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                    >
                                      Cone: {barcode}
                                      <button
                                        type="button"
                                        aria-label={`Remove scanned cone ${barcode}`}
                                        onClick={() => {
                                          const newBarcodes = scannedBarcodes.filter((_, i) => i !== index);
                                          const newConeData = new Map(scannedConeData);
                                          const newRackBarcodes = new Map(rackBarcodes);
                                          newConeData.delete(barcode);
                                          newRackBarcodes.delete(barcode);
                                          setScannedBarcodes(newBarcodes);
                                          setScannedConeData(newConeData);
                                          setRackBarcodes(newRackBarcodes);
                                          setRackInputByCone((prev) => {
                                            const next = { ...prev };
                                            delete next[barcode];
                                            return next;
                                          });
                                        }}
                                        className="ml-1 text-blue-600 hover:text-blue-800"
                                      >
                                        <i className="ri-close-line text-xs"></i>
                                      </button>
                                    </span>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <form onSubmit={handleBarcodeSubmit} className="space-y-2">
                        <label className="form-label text-sm font-semibold text-gray-700">
                          Scan cone barcode
                        </label>
                        <div className="relative">
                          <input
                            ref={quickReturnBarcodeInputRef}
                            type="text"
                            aria-label="Scan or enter cone barcode"
                            className={`form-control ps-10 ${scanError ? "border-red-500 focus:border-red-500" : ""}`}
                            placeholder="Scan or enter cone barcode"
                            value={barcodeInput}
                            onChange={(event) => {
                              setBarcodeInput(event.target.value);
                              if (scanError) setScanError(null);
                            }}
                            disabled={
                              loadingQuickReturnOrder ||
                              barcodeLoading ||
                              storingCone ||
                              scannedBarcodes.length >= parseInt(transactionForm.numberOfCones || "1")
                            }
                          />
                          <i className="ri-barcode-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        </div>
                        {scanError && (
                          <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
                            <i className="ri-error-warning-line text-base"></i>
                            {scanError}
                          </div>
                        )}
                        <button
                          type="submit"
                          className="ti-btn ti-btn-primary w-full whitespace-normal break-words leading-tight px-4 py-2 text-sm"
                          disabled={
                            loadingQuickReturnOrder ||
                            barcodeLoading ||
                            storingCone ||
                            scannedBarcodes.length >= parseInt(transactionForm.numberOfCones || "1") ||
                            !transactionForm.numberOfCones ||
                            parseInt(transactionForm.numberOfCones) < 1
                          }
                        >
                          {loadingQuickReturnOrder ? (
                            <>
                              <span className="animate-spin inline-block mr-2">⟳</span>
                              Loading order…
                            </>
                          ) : barcodeLoading ? (
                            <>
                              <span className="animate-spin inline-block mr-2">⟳</span>
                              Loading...
                            </>
                          ) : storingCone ? (
                            <>
                              <span className="animate-spin inline-block mr-2">⟳</span>
                              Storing Cone...
                            </>
                          ) : scannedBarcodes.length >= parseInt(transactionForm.numberOfCones || "1") ? (
                            "All barcodes scanned"
                          ) : (
                            "Scan cone barcode"
                          )}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}

      {/* Return Modal — z above scan panel so focus and stacking match */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10090]">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="box-header border-b border-gray-200 px-6 py-4">
              <div className="flex justify-between items-center">
                <h3 className="box-title text-lg">Return Yarn</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowReturnModal(false);
                    setScannedBarcodes([]);
                    setScannedConeData(new Map());
                    setRackBarcodes(new Map());
                    setRackInputByCone({});
                    setActiveConeId(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>
            <form
              className="box-body p-6"
              onSubmit={(e) => {
                e.preventDefault();
                if (!submittingReturn) void handleReturnSubmit();
              }}
            >
              {scannedBarcodes.length > 0 && effectiveReturnOrder && (
                <>
                  <div className="mb-6 p-4 bg-gray-50 rounded-md">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      Scanned Barcodes ({scannedBarcodes.length})
                    </h4>
                    <div className="space-y-2">
                      {scannedBarcodes.map((barcode, index) => {
                        const coneData = scannedConeData.get(barcode);
                        const cone = coneData?.cone;
                        const rackBarcode = rackBarcodes.get(barcode);
                        const isConeEmpty = batchIsEmptyByGross;
                        return (
                          <div key={index} className={`border rounded p-3 ${
                            isConeEmpty ? "bg-gray-50 border-gray-300" : "bg-white border-gray-200"
                          }`}>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-gray-500">Barcode:</span>
                                <span className="ml-2 font-medium">{barcode}</span>
                                {isConeEmpty && (
                                  <span className="ml-2 px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-700">
                                    Empty
                                  </span>
                                )}
                              </div>
                              <div>
                                <span className="text-gray-500">Yarn Name:</span>
                                <span className="ml-2 font-medium">
                                  {cone?.yarnName || coneData?.yarnName || "N/A"}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Issued Weight:</span>
                                <span className="ml-2 font-medium">
                                  {cone?.issuedWeight?.toFixed(2) || "N/A"} kg
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Cone Weight:</span>
                                <span className="ml-2 font-medium">
                                  {(() => {
                                    // Get coneWeight - check top level first, then coneDetails
                                    const coneWeight = coneData?.coneWeight ?? 
                                                      coneData?.coneDetails?.coneWeight ?? 
                                                      0;
                                    return typeof coneWeight === 'number' && coneWeight >= 0 
                                      ? coneWeight.toFixed(2) 
                                      : "0.00";
                                  })()} kg
                                </span>
                              </div>
                              {!isConeEmpty && rackBarcode && (
                                <div>
                                  <span className="text-gray-500">Storage Rack:</span>
                                  <span className="ml-2 font-medium text-green-700">{rackBarcode}</span>
                                </div>
                              )}
                              {isConeEmpty && (
                                <div>
                                  <span className="text-gray-500">Status:</span>
                                  <span className="ml-2 font-medium text-gray-600">No storage needed</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="form-label text-sm font-semibold text-gray-700">
                        Total Weight (kg) <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          ref={returnModalPrimaryInputRef}
                          type="text"
                          inputMode="decimal"
                          className="form-control flex-1"
                          placeholder="Enter total weight"
                          aria-describedby="yarn-return-gross-hint"
                          value={transactionForm.totalWeight}
                          onChange={(e) => handleTransactionFormChange("totalWeight", e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            setFetchingWeight(true);
                            try {
                              const w = await fetchWeightLatest("return");
                              if (w != null && w > 0) {
                                // Use three decimal places from scale without rounding (truncate)
                                const truncatedWeight = Math.trunc(w * 1000) / 1000;
                                setTransactionForm((prev) => {
                                  const tear = parseFloat(prev.totalTearWeight) || 0;
                                  const net = Math.max(0, truncatedWeight - tear);
                                  const truncatedNet = Math.trunc(net * 1000) / 1000;
                                  return {
                                    ...prev,
                                    totalWeight: truncatedWeight.toFixed(3),
                                    totalNetWeight: truncatedNet.toFixed(3),
                                  };
                                });
                                toast.success(`Weight from scale: ${ (Math.trunc(w * 1000) / 1000).toFixed(3) } kg`);
                              } else {
                                toast.error("Could not get weight from scale.");
                              }
                            } finally {
                              setFetchingWeight(false);
                            }
                          }}
                          className="ti-btn ti-btn-outline-primary whitespace-nowrap"
                          disabled={fetchingWeight}
                          title="Get weight from connected scale"
                        >
                          {fetchingWeight ? "…" : "From scale"}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2" id="yarn-return-gross-hint">
                        Gross total weight ≤ {EMPTY_CONE_MAX_GROSS_WEIGHT_KG} kg is treated as an empty batch (no short-term
                        rack). Above that, assign one validated ST-zone rack per cone below.
                      </p>
                    </div>

                    {!batchIsEmptyByGross && (
                      <div
                        className="rounded-md border border-amber-200 bg-amber-50/95 p-4 space-y-3"
                        role="region"
                        aria-label="Short-term rack assignments"
                      >
                        <p className="text-sm font-semibold text-gray-900">Short-term storage rack</p>
                        <p className="text-xs text-gray-600">
                          Enter or scan a short-term rack barcode for each cone, then Apply. Required when gross weight is
                          above {EMPTY_CONE_MAX_GROSS_WEIGHT_KG} kg.
                        </p>
                        <ul className="space-y-3 list-none m-0 p-0">
                          {scannedBarcodes.map((barcode) => {
                            const mapped = rackBarcodes.get(barcode);
                            const draftVal = rackInputByCone[barcode] ?? "";
                            return (
                              <li key={barcode} className="rounded border border-amber-100 bg-white p-3">
                                <p className="text-xs font-medium text-gray-700 mb-2">
                                  Cone <span className="font-mono">{barcode}</span>
                                  {mapped ? (
                                    <span className="ml-2 text-green-700">
                                      Stored: <span className="font-mono">{mapped}</span>
                                    </span>
                                  ) : (
                                    <span className="ml-2 text-amber-800">Rack pending</span>
                                  )}
                                </p>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                  <input
                                    type="text"
                                    className="form-control flex-1 font-mono text-sm"
                                    placeholder="Scan or enter rack barcode"
                                    aria-label={`Rack barcode for cone ${barcode}`}
                                    value={draftVal}
                                    onChange={(e) =>
                                      setRackInputByCone((prev) => ({
                                        ...prev,
                                        [barcode]: e.target.value,
                                      }))
                                    }
                                    disabled={storingCone}
                                  />
                                  <button
                                    type="button"
                                    className="ti-btn ti-btn-outline-primary shrink-0"
                                    disabled={storingCone || submittingReturn}
                                    onClick={() => void applyRackFromModalDraft(barcode)}
                                  >
                                    {storingCone ? "…" : "Apply rack"}
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    <div>
                      <label className="form-label text-sm font-semibold text-gray-700">
                        Number of Cones <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="form-control"
                        placeholder="Enter number of cones"
                        value={transactionForm.numberOfCones}
                        onChange={(e) => handleTransactionFormChange("numberOfCones", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="form-label text-sm font-semibold text-gray-700">
                        Total Tear Weight (kg)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="form-control"
                        placeholder="Enter tear weight"
                        value={transactionForm.totalTearWeight}
                        onChange={(e) => handleTransactionFormChange("totalTearWeight", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="form-label text-sm font-semibold text-gray-700">
                        Total Net Weight (kg)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="form-control bg-gray-50"
                        placeholder="Auto-calculated"
                        value={transactionForm.totalNetWeight}
                        readOnly
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Calculated as: Total Weight - Total Tear Weight
                      </p>
                    </div>

                    {effectiveReturnOrder && (
                      <div className="p-3 bg-blue-50 rounded-md">
                        <p className="text-xs text-gray-600">
                          <span className="font-semibold">Production order:</span>{" "}
                          {productionOrderNoForApi(effectiveReturnOrder)}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          <span className="font-semibold">Number of Cones:</span> {scannedBarcodes.length}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          <span className="font-semibold">Total Net Weight:</span>{" "}
                          {transactionForm.totalNetWeight || "0"} kg
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowReturnModal(false);
                        setScannedBarcodes([]);
                        setScannedConeData(new Map());
                        setRackBarcodes(new Map());
                        setRackInputByCone({});
                        setActiveConeId(null);
                      }}
                      className="ti-btn ti-btn-outline"
                      disabled={submittingReturn}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="ti-btn ti-btn-primary"
                      disabled={submittingReturn}
                    >
                      {submittingReturn ? (
                        <>
                          <span className="animate-spin inline-block mr-2">⟳</span>
                          Processing...
                        </>
                      ) : (
                        "Return Yarn"
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* History Drawer - always accessible via top History button */}
      {showHistoryDrawer && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
            onClick={() => setShowHistoryDrawer(false)}
            aria-hidden="true"
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-hidden flex flex-col">
            <div className="flex-shrink-0 p-[10px] border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-base font-bold text-gray-800">Return History &amp; Tracking</h3>
              <button
                type="button"
                onClick={() => setShowHistoryDrawer(false)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                aria-label="Close"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-[10px]">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <input
                  type="text"
                  className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-40 min-w-[100px] placeholder:text-gray-400 font-medium"
                  placeholder="Search order or yarn..."
                  value={historySearchTerm}
                  onChange={(event) => setHistorySearchTerm(event.target.value)}
                />
                <input
                  type="date"
                  className="bg-white border border-gray-200 text-[11px] font-medium rounded px-2 py-1.5 focus:ring-0 focus:border-purple-300 w-32"
                  value={historyDateRange.from}
                  onChange={(event) => setHistoryDateRange((prev) => ({ ...prev, from: event.target.value }))}
                />
                <input
                  type="date"
                  className="bg-white border border-gray-200 text-[11px] font-medium rounded px-2 py-1.5 focus:ring-0 focus:border-purple-300 w-32"
                  value={historyDateRange.to}
                  onChange={(event) => setHistoryDateRange((prev) => ({ ...prev, to: event.target.value }))}
                />
              </div>
              <div className="overflow-x-auto">
                {historyDrawerLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent mb-3" />
                    <p className="text-[11px] font-medium text-gray-500">Loading return history…</p>
                  </div>
                ) : historyDrawerRows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <i className="ri-time-line text-4xl text-gray-300 mb-2"></i>
                    <h3 className="text-xs font-bold text-gray-400 mb-1">No Records</h3>
                    <p className="text-[11px] text-gray-500">Adjust filters or process cone returns to see records here.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-[11px] text-gray-500 mb-2">
                      {historyDrawerTotalResults.toLocaleString()} record
                      {historyDrawerTotalResults !== 1 ? "s" : ""} total · up to {YARN_RETURN_HISTORY_API_LIMIT} per page
                      {historyDrawerTotalPages > 0 && (
                        <>
                          {" "}
                          · Page {historyPage} of {historyDrawerTotalPages}
                        </>
                      )}
                    </p>
                    <table className="w-full border-collapse border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50/30">
                          <th className="pl-[10px] pr-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Production Order</th>
                          <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Transaction Date</th>
                          <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Yarn Name</th>
                          <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Net (kg)</th>
                          <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Total (kg)</th>
                          <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Tear (kg)</th>
                          <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Cones</th>
                          <th className="px-1.5 py-2.5 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Created At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyDrawerRows.map((transaction) => (
                          <tr key={transaction._id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="pl-[10px] pr-1.5 py-2 text-[12px] font-bold text-gray-900 border border-gray-200">{txOrderno(transaction) ?? transaction.orderno ?? transaction.orderId ?? "-"}</td>
                            <td className="px-1.5 py-2 text-[12px] text-gray-600 border border-gray-200">{new Date(transaction.transactionDate).toLocaleDateString()}</td>
                            <td className="px-1.5 py-2 text-[12px] text-gray-900 border border-gray-200">{transaction.yarnName}</td>
                            <td className="px-1.5 py-2 text-[12px] text-gray-900 border border-gray-200">{transaction.transactionNetWeight?.toFixed(2) || "0.00"}</td>
                            <td className="px-1.5 py-2 text-[12px] text-gray-900 border border-gray-200">{transaction.transactionTotalWeight?.toFixed(2) || "0.00"}</td>
                            <td className="px-1.5 py-2 text-[12px] text-gray-900 border border-gray-200">{transaction.transactionTearWeight?.toFixed(2) || "0.00"}</td>
                            <td className="px-1.5 py-2 text-[12px] text-gray-900 border border-gray-200">{transaction.transactionConeCount || 1}</td>
                            <td className="px-1.5 py-2 text-right pr-[10px] text-[12px] text-gray-600 border border-gray-200">{new Date(transaction.createdAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {historyDrawerTotalPages > 1 && (
                      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-gray-100">
                        <p className="text-[11px] text-gray-500">
                          Showing{" "}
                          {historyDrawerTotalResults === 0
                            ? 0
                            : (historyPage - 1) * YARN_RETURN_HISTORY_API_LIMIT + 1}
                          –
                          {Math.min(historyPage * YARN_RETURN_HISTORY_API_LIMIT, historyDrawerTotalResults)} of{" "}
                          {historyDrawerTotalResults.toLocaleString()}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                            disabled={historyPage <= 1}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <i className="ri-arrow-left-s-line" />
                            Previous
                          </button>
                          <button
                            type="button"
                            onClick={() => setHistoryPage((p) => Math.min(historyDrawerTotalPages, p + 1))}
                            disabled={historyPage >= historyDrawerTotalPages}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Next
                            <i className="ri-arrow-right-s-line" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Pending table: yarn names — eye icon opens right drawer (portal) */}
      {yarnNamesDrawerRow &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[10060] bg-black/50 transition-opacity"
              onClick={() => setYarnNamesDrawerRow(null)}
              aria-hidden={true}
            />
            <div
              className="fixed top-0 right-0 z-[10070] flex h-[100dvh] max-h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="yarn-names-drawer-title"
            >
              <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <h3 id="yarn-names-drawer-title" className="text-lg font-bold text-gray-800">
                    Yarn names
                  </h3>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {yarnNamesDrawerRow.articleNumber} · {yarnNamesDrawerRow.productionOrder}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setYarnNamesDrawerRow(null)}
                  className="rounded p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Close"
                >
                  <i className="ri-close-line text-xl" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-3 [scrollbar-gutter:stable]">
                {yarnNamesDrawerLines.length === 0 ? (
                  <p className="text-sm text-gray-500">No yarn names for this article.</p>
                ) : (
                  <ul className="space-y-0">
                    {yarnNamesDrawerLines.map((line, i) => (
                      <li
                        key={`${line}-${i}`}
                        className="break-words border-b border-gray-100 py-2.5 text-sm text-gray-800 last:border-b-0"
                      >
                        {line}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
    </div>
  );
};

export default YarnReturnPage;

