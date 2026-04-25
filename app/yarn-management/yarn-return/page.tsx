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

/** History drawer: rows per page (client-side slice of filtered return transactions). */
const HISTORY_PAGE_SIZE = 100;

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
  const artIdStr = preserve.articleRowId.slice(0, -suffix.length);

  const articles = order.articles?.length
    ? order.articles
    : [{ id: order.id, articleNumber: order.orderNumber, plannedQuantity: 0 } as Article];
  const firstArticleId = articles[0] ? articles[0].id || (articles[0] as { _id?: string })._id : undefined;

  const art = articles.find(
    (a) => String(a.id || (a as { _id?: string })._id) === artIdStr
  );
  if (!art) return null;

  const artId = art.id || (art as { _id?: string })._id;
  let conesForArticle = order.cones.filter((c) => {
    if (c.articleId && String(c.articleId) === String(artId)) return true;
    if (c.articleNumber && art.articleNumber && String(c.articleNumber).trim() === String(art.articleNumber).trim())
      return true;
    if (!c.articleId && !c.articleNumber) return artId === firstArticleId;
    return false;
  });
  if (conesForArticle.length === 0 && order.cones.length > 0 && articles.length === 1) {
    conesForArticle = order.cones;
  }

  const pendingCones = conesForArticle.filter((c) => c.status !== "Returned");
  if (pendingCones.length === 0) return null;

  return { orderId: order.id, articleRowId: preserve.articleRowId };
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

// Helper function to extract transactions from nested API response structure
const extractTransactions = (data: any): any[] => {
  if (!data) return [];
  
  // Handle paginated response
  if (data.results) {
    data = data.results;
  }
  
  // If not an array, return empty
  if (!Array.isArray(data)) {
    return [];
  }
  
  // Extract transactions from nested structure
  const transactions: any[] = [];
  data.forEach((item: any) => {
    // Check if item has a transactions array (nested structure)
    if (item.transactions && Array.isArray(item.transactions)) {
      transactions.push(...item.transactions);
    } else if (item.transactionType) {
      // If item is already a transaction, add it directly
      transactions.push(item);
    }
  });
  
  return transactions;
};

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
  /** Return by scanning cone only: order/article resolved from cone API (not from machine list). */
  const [showQuickReturnDrawer, setShowQuickReturnDrawer] = useState(false);
  const [quickReturnOrder, setQuickReturnOrder] = useState<ProductionOrder | null>(null);
  const [loadingQuickReturnOrder, setLoadingQuickReturnOrder] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [scannedBarcodes, setScannedBarcodes] = useState<string[]>([]);
  const [scannedConeData, setScannedConeData] = useState<Map<string, any>>(new Map());
  const [rackBarcodes, setRackBarcodes] = useState<Map<string, string>>(new Map()); // Map cone barcode to rack barcode
  const [scanningMode, setScanningMode] = useState<"cone" | "rack">("cone"); // Track if scanning cone or rack
  const [currentConeBarcode, setCurrentConeBarcode] = useState<string | null>(null); // Track which cone needs rack
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [storingCone, setStoringCone] = useState(false);
  const [emptyCones, setEmptyCones] = useState<Set<string>>(new Set()); // Track which cones are empty (no yarn left)
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showConeTypeModal, setShowConeTypeModal] = useState(false);
  const [pendingConeBarcode, setPendingConeBarcode] = useState<string | null>(null);
  const [pendingConeData, setPendingConeData] = useState<any>(null);
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

      const conesMap = new Map<string, Cone>();
      const coneIdToTxIds = new Map<string, string[]>();
      issuedTransactions.forEach((tx: any) => {
        if (tx.transactionType !== "yarn_issued") return;
        const txId = tx._id || tx.id;
        const coneIds = Array.isArray(tx.conesIdsArray) && tx.conesIdsArray.length > 0
          ? tx.conesIdsArray
          : [tx.coneBarcode || tx.barcode || `TX-${txId}`];
        coneIds.forEach((cid: string) => {
          if (!coneIdToTxIds.has(cid)) coneIdToTxIds.set(cid, []);
          coneIdToTxIds.get(cid)!.push(txId);
        });
      });
      issuedTransactions.forEach((tx: any) => {
        if (tx.transactionType !== "yarn_issued") return;
        const numberOfCones = tx.numberOfCones || tx.transactionConeCount || 1;
        const weightPerCone = (tx.transactionNetWeight || tx.totalNetWeight || 0) / numberOfCones;
        const articleId = txArticleId(tx);
        const articleNumber = txArticleNumber(tx);
        const coneIds = Array.isArray(tx.conesIdsArray) && tx.conesIdsArray.length > 0
          ? tx.conesIdsArray
          : [tx.coneBarcode || tx.barcode || `TX-${tx._id || tx.id}`];
        coneIds.forEach((coneId: string, idx: number) => {
          if (conesMap.has(coneId)) return;
          const txIdsForCone = coneIdToTxIds.get(coneId) || [];
          const returnedTx = returnedTransactions.find(
            (rt: any) =>
              (rt.conesIdsArray?.includes?.(coneId) || rt.coneBarcode === coneId || txIdsForCone.includes(rt.issuedTransactionId)) &&
              rt.transactionType === "yarn_returned"
          );
          const uniqueConeId = coneIds.length > 1 ? `${coneId}-${idx + 1}` : coneId;
          const catalogId = resolveYarnCatalogIdFromTransaction(tx);
          conesMap.set(coneId, {
            id: uniqueConeId,
            barcode: coneId,
            yarnCode: catalogId || (tx as { yarnCode?: string }).yarnCode || "N/A",
            yarnName: tx.yarnName || "Unknown Yarn",
            yarnType: tx.yarn?.yarnType?.name || "Unknown",
            issuedWeight: weightPerCone,
            returnedWeight: returnedTx ? (returnedTx.transactionNetWeight || returnedTx.totalNetWeight || 0) / numberOfCones : undefined,
            balanceWeight: returnedTx ? Math.max(weightPerCone - ((returnedTx.transactionNetWeight || returnedTx.totalNetWeight || 0) / numberOfCones), 0) : undefined,
            status: returnedTx ? ("Returned" as ConeStatus) : ("Awaiting" as ConeStatus),
            lastReturnedAt: returnedTx?.transactionDate || returnedTx?.createdAt,
            transactionId: tx._id || tx.id,
            yarnCatalogId: catalogId || undefined,
            articleId,
            articleNumber,
          });
        });
      });
      const cones = Array.from(conesMap.values());
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

      setOrdersLoading(true);
      const token = getAccessToken();
      try {
        const ordersWithCones = await Promise.all(
          builtOrdersMeta.map((meta) =>
            fetchOrderWithCones(token, meta.orderNumber, meta.orderId, {
              floor: meta.floor,
              articles: meta.articles,
              createdAt: meta.createdAt,
              updatedAt: meta.updatedAt,
            })
          )
        );
        const filtered = ordersWithCones.filter((o) => o.hasIssuedTransactions || o.cones.length > 0);
        setOrders(filtered);
        setHistory(filtered.map((order) => buildHistoryRecord(order)));

        const allReturnTxs: ReturnTransaction[] = [];
        await Promise.all(
          filtered.map(async (o) => {
            try {
              const res = await fetch(
                `${API_BASE_URL}/yarn-management/yarn-transactions?order_id=${o.id}`,
                { headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) } }
              );
              if (!res.ok) return;
              const data = await res.json();
              const txs = extractTransactions(data).filter((tx: any) => tx.transactionType === "yarn_returned") as ReturnTransaction[];
              allReturnTxs.push(...txs);
            } catch (err) {
              console.warn("Fetch return tx for", o.id, err);
            }
          })
        );
        setReturnTransactions(allReturnTxs);

        const restored = resolvePreservedArticleSelection(filtered, options?.preserveSelection);
        if (restored) {
          setSelectedOrderId(restored.orderId);
          setSelectedArticleRowId(restored.articleRowId);
        } else {
          const first = filtered[0];
          if (first?.id) {
            setSelectedOrderId(first.id);
            const firstArticle = first.articles?.[0];
            if (firstArticle) {
              setSelectedArticleRowId(`${firstArticle.id}-${first.id}`);
            } else {
              setSelectedArticleRowId(first.id);
            }
          } else {
            setSelectedOrderId(null);
            setSelectedArticleRowId(null);
          }
        }
      } catch (error) {
        console.error("Error loading orders for machine:", error);
        toast.error("Failed to load orders and cones");
        setOrders([]);
        setHistory([]);
      } finally {
        setOrdersLoading(false);
      }
    },
    [fetchOrderWithCones]
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

  // Default: select first machine when completed-items have loaded
  useEffect(() => {
    if (!machineAssignmentsLoading && machineAssignments.length > 0 && selectedMachineAssignmentId === null) {
      loadOrdersForMachine(machineAssignments[0]);
    }
  }, [machineAssignmentsLoading, machineAssignments, selectedMachineAssignmentId, loadOrdersForMachine]);

  // When no orders (no machines or no completed items), fetch all return transactions for history drawer
  useEffect(() => {
    if (!hasPermission) return;
    const noOrders = !ordersLoading && orders.length === 0;
    const noMachines = !machineAssignmentsLoading && machineAssignments.length === 0;
    if (!noOrders && !noMachines) return;

    const fetchAllReturnTransactions = async () => {
      const token = getAccessToken();
      try {
        const res = await fetch(
          `${API_BASE_URL}/yarn-management/yarn-transactions`,
          { headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) } }
        );
        if (!res.ok) return;
        const data = await res.json();
        const txs = extractTransactions(data).filter((tx: any) => tx.transactionType === "yarn_returned") as ReturnTransaction[];
        setReturnTransactions(txs);
      } catch (err) {
        console.warn("Fetch all return transactions for history:", err);
      }
    };
    fetchAllReturnTransactions();
  }, [hasPermission, machineAssignmentsLoading, machineAssignments.length, ordersLoading, orders.length]);

  // Filter pending orders - exclude orders where all cones have been returned
  // Check both cone status and return transaction cone counts
  const pendingOrders = useMemo(() => {
    return orders.filter((order) => {
      // If order status is already "Returned", exclude it
      if (order.status === "Returned") {
        return false;
      }

      // Check if all cones are marked as returned (most reliable check)
      const allConesReturned =
        order.cones.length > 0 &&
        order.cones.every((cone) => cone.status === "Returned");

      if (allConesReturned) {
        return false; // Exclude from pending
      }

      // Get return transactions for this order (same order number)
      const orderReturnTransactions = returnTransactions.filter(
        (tx) =>
          (txOrderno(tx) ?? tx.orderno) === productionOrderNoForApi(order) ||
          txOrderId(tx) === order.id
      );

      if (orderReturnTransactions.length === 0) {
        // No return transactions, show in pending
        return true;
      }

      // Count total cones in the order
      const totalConesInOrder = order.cones.length;

      // Count total cones returned from return transactions
      const totalConesReturned = orderReturnTransactions.reduce(
        (sum, tx) => sum + (tx.transactionConeCount || 1),
        0
      );

      // If returned cones count >= total cones, exclude from pending
      if (totalConesReturned >= totalConesInOrder) {
        return false;
      }

      // If we have some returned cones but not all, still show in pending
      return true;
    });
  }, [orders, returnTransactions]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  );

  /** Keep focus on the scan barcode field when the panel is active (portal + modal transitions need explicit focus). */
  useEffect(() => {
    if (!showScanReturnPanel && !showQuickReturnDrawer) return;
    if (showScanReturnPanel && !selectedOrderId) return;
    if (showConeTypeModal || showReturnModal) return;
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
    showConeTypeModal,
    showReturnModal,
    scanningMode,
    currentConeBarcode,
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

  // Build article rows from orders (article-wise display)
  // Each article row shows only cones belonging to that article (by cone.articleId)
  const articleRows = useMemo(() => {
    const rows: ArticleRow[] = [];
    for (const order of orders) {
      const articles = order.articles?.length ? order.articles : [{ id: order.id, articleNumber: order.orderNumber, plannedQuantity: 0 } as Article];
      const firstArticleId = articles[0] ? (articles[0].id || (articles[0] as any)._id) : undefined;
      for (const art of articles) {
        const artId = art.id || (art as any)._id;
        // Filter cones by article: match by articleId first, then articleNumber (fallback when articleId missing/mismatch)
        let conesForArticle = order.cones.filter((c) => {
          if (c.articleId && String(c.articleId) === String(artId)) return true;
          if (c.articleNumber && art.articleNumber && String(c.articleNumber).trim() === String(art.articleNumber).trim()) return true;
          if (!c.articleId && !c.articleNumber) return artId === firstArticleId; // legacy: no article info → first article
          return false;
        });
        // Fallback: single-article order gets all cones; multi-article with no match stays empty
        if (conesForArticle.length === 0 && order.cones.length > 0 && articles.length === 1) {
          conesForArticle = order.cones;
        }
        const yarnNames = Array.from(new Set(conesForArticle.map((c) => c.yarnName).filter(Boolean))).join(", ");
        rows.push({
          rowId: `${artId}-${order.id}`,
          articleId: artId,
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
  }, [orders]);

  // Pending article rows (articles whose parent order has pending cones)
  const pendingArticles = useMemo(() => {
    const pendingOrderIds = new Set(pendingOrders.map((o) => o.id));
    return articleRows.filter((row) => pendingOrderIds.has(row.orderId));
  }, [articleRows, pendingOrders]);

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
    const norm = (id: string | undefined) => String(id ?? "").trim();
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
      if (c.articleId && norm(c.articleId) === artId) return true;
      if (c.articleNumber && art?.articleNumber && String(c.articleNumber).trim() === String(art.articleNumber).trim()) return true;
      if (!c.articleId && !c.articleNumber) return norm(artId) === firstId;
      return false;
    });
    if (conesForArticle.length === 0 && order.cones.length > 0 && articles.length === 1) {
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

  // Sync selection to first pending article when current selection is not in pending list
  useEffect(() => {
    if (pendingArticles.length === 0) {
      setSelectedOrderId(null);
      setSelectedArticleRowId(null);
      return;
    }
    const isSelectedPending = selectedArticleRowId && pendingArticles.some((a) => a.rowId === selectedArticleRowId);
    if (!isSelectedPending) {
      const first = pendingArticles[0];
      setSelectedOrderId(first.orderId);
      setSelectedArticleRowId(first.rowId);
    }
  }, [pendingArticles, selectedArticleRowId]);

  // Calculate pending cones (cones that haven't been returned)
  // Count based on return transactions history, not just cone status
  const totalPendingCones = useMemo(
    () =>
      pendingOrders.reduce((sum, order) => {
        // Get return transactions for this order
        const orderReturnTransactions = returnTransactions.filter(
          (tx) =>
            (txOrderno(tx) ?? tx.orderno) === productionOrderNoForApi(order) ||
            txOrderId(tx) === order.id
        );
        
        // Count total cones returned from return transactions (from history)
        const totalConesReturnedFromHistory = orderReturnTransactions.reduce(
          (txSum, tx) => txSum + (tx.transactionConeCount || 1),
          0
        );
        
        // Total cones in the order
        const totalConesInOrder = order.cones.length;
        
        // Actual pending cones = total cones - cones returned in history
        const actualPendingCones = Math.max(0, totalConesInOrder - totalConesReturnedFromHistory);
        
        return sum + actualPendingCones;
      }, 0),
    [pendingOrders, returnTransactions]
  );

  // Calculate returned cones from return transactions
  const totalReturnedCones = useMemo(
    () =>
      returnTransactions.reduce(
        (sum, tx) => sum + (tx.transactionConeCount || 1),
        0
      ),
    [returnTransactions]
  );

  // Calculate orders where all cones have been returned
  const totalCompletedOrders = useMemo(() => {
    return orders.filter((order) => {
      // Check if order status is "Returned"
      if (order.status === "Returned") {
        return true;
      }

      // Check if all cones are marked as returned
      const allConesReturned =
        order.cones.length > 0 &&
        order.cones.every((cone) => cone.status === "Returned");

      if (allConesReturned) {
        return true;
      }

      // Get return transactions for this order
      const orderReturnTransactions = returnTransactions.filter(
        (tx) =>
          (txOrderno(tx) ?? tx.orderno) === productionOrderNoForApi(order) ||
          txOrderId(tx) === order.id
      );

      if (orderReturnTransactions.length === 0) {
        return false;
      }

      // Count total cones in the order
      const totalConesInOrder = order.cones.length;

      // Count total cones returned from return transactions
      const totalConesReturned = orderReturnTransactions.reduce(
        (sum, tx) => sum + (tx.transactionConeCount || 1),
        0
      );

      // Order is completed if returned cones >= total cones
      return totalConesReturned >= totalConesInOrder;
    }).length;
  }, [orders, returnTransactions]);

  useEffect(() => {
    if (!pendingToastShown.current && pendingOrders.length > 0) {
      pendingToastShown.current = true;
      toast("Knitting completed orders are awaiting cone return.", {
        icon: "🧵",
      });
    }
  }, [pendingOrders]);

  // Only articles whose cones are pending for return
  const filteredArticleRows = useMemo(() => pendingArticles, [pendingArticles]);

  const filteredReturnTransactions = useMemo(() => {
    return returnTransactions
      .filter((transaction) => {
        // Filter by order number or yarn name
        if (
          historySearchTerm &&
          !(txOrderno(transaction) ?? transaction.orderno ?? "")
            .toLowerCase()
            .includes(historySearchTerm.toLowerCase()) &&
          !(transaction.yarnName ?? "")
            .toLowerCase()
            .includes(historySearchTerm.toLowerCase())
        ) {
          return false;
        }

        // Filter by date range
        if (historyDateRange.from) {
          const fromDate = new Date(historyDateRange.from);
          const transactionDate = new Date(transaction.transactionDate);
          if (transactionDate < fromDate) {
            return false;
          }
        }
        if (historyDateRange.to) {
          const toDate = new Date(historyDateRange.to);
          const transactionDate = new Date(transaction.transactionDate);
          transactionDate.setHours(0, 0, 0, 0);
          if (transactionDate > toDate) {
            return false;
          }
        }
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.transactionDate || b.createdAt).getTime() -
          new Date(a.transactionDate || a.createdAt).getTime()
      );
  }, [returnTransactions, historyDateRange.from, historyDateRange.to, historySearchTerm]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearchTerm, historyDateRange.from, historyDateRange.to]);

  const historyFilteredTotal = filteredReturnTransactions.length;
  const historyTotalPages =
    historyFilteredTotal === 0 ? 0 : Math.ceil(historyFilteredTotal / HISTORY_PAGE_SIZE);

  useEffect(() => {
    if (historyTotalPages === 0) return;
    setHistoryPage((p) => (p > historyTotalPages ? historyTotalPages : p));
  }, [historyTotalPages]);

  const paginatedHistoryTransactions = useMemo(() => {
    const start = (historyPage - 1) * HISTORY_PAGE_SIZE;
    return filteredReturnTransactions.slice(start, start + HISTORY_PAGE_SIZE);
  }, [filteredReturnTransactions, historyPage]);

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
    setEmptyCones(new Set());
    setShowConeTypeModal(false);
    setPendingConeBarcode(null);
    setPendingConeData(null);
    setScanningMode("cone");
    setCurrentConeBarcode(null);
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
    setEmptyCones(new Set());
    setShowConeTypeModal(false);
    setPendingConeBarcode(null);
    setPendingConeData(null);
    setScanningMode("cone");
    setCurrentConeBarcode(null);
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
      
      // Check if all cones have been scanned and stored (or are empty)
      const numberOfCones = parseInt(transactionForm.numberOfCones) || 1;
      const conesNeedingRack = scannedBarcodes.filter(b => !emptyCones.has(b));
      const allConesScanned = scannedBarcodes.length >= numberOfCones;
      const allConesStored = newRackBarcodes.size >= conesNeedingRack.length;
      const shouldOpenModal = allConesScanned && allConesStored;
      
      console.log("🔢 Checking if all cones processed:", {
        scannedCount: scannedBarcodes.length,
        storedCount: newRackBarcodes.size,
        requiredCount: numberOfCones,
        emptyConesCount: emptyCones.size,
        conesNeedingRackCount: conesNeedingRack.length,
        scannedBarcodes: Array.from(scannedBarcodes),
        rackBarcodes: Array.from(newRackBarcodes.entries()),
        emptyCones: Array.from(emptyCones),
      });
      
      console.log("📋 Modal check:", {
        allConesScanned,
        allConesStored,
        shouldOpenModal,
      });
      
      if (shouldOpenModal) {
        // All cones scanned and stored (or empty), open modal
        console.log("✅ All cones scanned and processed, opening modal");
        
        // Auto-fill form with cone weights
        const totalConeWeight = scannedBarcodes.reduce((sum, barcode) => {
          const coneData = scannedConeData.get(barcode);
          const coneWeight = coneData?.coneWeight || coneData?.coneDetails?.coneWeight || 0;
          return sum + coneWeight;
        }, 0);
        
        setTransactionForm((prev) => ({
          ...prev,
          totalWeight: totalConeWeight > 0 ? totalConeWeight.toFixed(2) : prev.totalWeight,
          totalNetWeight: totalConeWeight > 0 ? totalConeWeight.toFixed(2) : prev.totalNetWeight,
        }));
        
        setShowReturnModal(true);
        toast.success(`All ${numberOfCones} cone(s) scanned and processed. Fill in the transaction details.`);
      } else {
        // Find next cone that needs rack barcode
        const nextConeNeedingRack = scannedBarcodes.find(b => !emptyCones.has(b) && !newRackBarcodes.has(b));
        if (nextConeNeedingRack) {
          console.log("🔄 Switching to next cone needing rack:", nextConeNeedingRack);
          setScanningMode("rack");
          setCurrentConeBarcode(nextConeNeedingRack);
          setBarcodeInput("");
        } else {
          // All cones that need rack have been stored, continue scanning more cones
          console.log("🔄 All rack cones stored, continuing to scan more cones");
          setScanningMode("cone");
          setCurrentConeBarcode(null);
          setBarcodeInput("");
        }
      }
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

  const handleConeTypeSelection = (isEmpty: boolean) => {
    if (!pendingConeBarcode || !pendingConeData) {
      toast.error("Cone data not found.");
      setShowConeTypeModal(false);
      return;
    }

    const { coneDetails, cone, coneWeight } = pendingConeData;
    const value = pendingConeBarcode;

    // Get coneWeight from coneDetails (remaining yarn weight)
    const storedConeWeight = coneDetails?.coneWeight || coneWeight || 0;

    // Add to scanned barcodes and store cone data
    const newScannedBarcodes = [...scannedBarcodes, value];
    const newScannedConeData = new Map(scannedConeData);
    newScannedConeData.set(value, { 
      ...coneDetails, 
      cone, 
      isConeEmpty: isEmpty, 
      coneWeight: storedConeWeight,
      coneDetails: coneDetails, // Keep full coneDetails for reference
    });
    
    console.log("💾 Storing cone with coneWeight:", {
      barcode: value,
      coneWeight: storedConeWeight,
      fromConeDetails: coneDetails?.coneWeight,
    });
    
    // Update empty cones set
    const newEmptyCones = new Set(emptyCones);
    if (isEmpty) {
      newEmptyCones.add(value);
    } else {
      newEmptyCones.delete(value);
    }
    setEmptyCones(newEmptyCones);
    
    console.log("💾 Storing cone data:", {
      barcode: value,
      scannedBarcodesCount: newScannedBarcodes.length,
      coneId: cone.id,
      coneStatus: cone.status,
      isConeEmpty: isEmpty,
    });
    
    setScannedBarcodes(newScannedBarcodes);
    setScannedConeData(newScannedConeData);

    // Close modal and reset pending data
    setShowConeTypeModal(false);
    setPendingConeBarcode(null);
    setPendingConeData(null);

    // If cone is empty, skip rack scanning and proceed directly
    if (isEmpty) {
      console.log("📦 Cone is empty, skipping rack scanning");
      toast.success(`Empty cone scanned. No rack barcode needed.`);
      
      // Check if all cones have been scanned
      const numberOfCones = parseInt(transactionForm.numberOfCones) || 1;
      if (newScannedBarcodes.length >= numberOfCones) {
        // All cones scanned, check if any need rack barcode
        const conesNeedingRack = newScannedBarcodes.filter(b => !newEmptyCones.has(b));
        if (conesNeedingRack.length === 0) {
          // All cones are empty, open modal directly
          console.log("✅ All cones scanned and are empty, opening modal");
          
          // Auto-fill form with 0 weights for empty cones
          setTransactionForm((prev) => ({
            ...prev,
            totalWeight: "0",
            totalTearWeight: "0",
            totalNetWeight: "0",
          }));
          
          setShowReturnModal(true);
          toast.success(`All ${numberOfCones} cone(s) scanned. Fill in the transaction details.`);
        } else {
          // Some cones need rack barcode
          setScanningMode("rack");
          setCurrentConeBarcode(conesNeedingRack[0]);
          toast.success(`Cone scanned. Now scan the rack barcode for remaining cones.`);
        }
      } else {
        // More cones to scan, continue with next cone
        setScanningMode("cone");
        setCurrentConeBarcode(null);
      }
    } else {
      // Cone has remaining yarn, require rack barcode
      console.log("🔄 Switching to rack scanning mode for cone:", value);
      setScanningMode("rack");
      setCurrentConeBarcode(value);
      toast.success(`Cone scanned. Now scan the rack barcode for this cone.`);
    }
  };

  const handleBarcodeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!showQuickReturnDrawer && !selectedOrder) {
      toast.error("Select a production order to continue.");
      return;
    }

    const value = barcodeInput.trim();
    if (!value) {
      toast.error(scanningMode === "cone" ? "Scan a cone barcode to continue." : "Scan a rack barcode to continue.");
      return;
    }

    // Handle rack barcode scanning
    if (scanningMode === "rack" && currentConeBarcode) {
      await handleStoreConeInRack(currentConeBarcode, value);
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

      // Check if cone has been issued - only issued cones can be returned
      const issueStatus = (coneDetails.issueStatus ?? coneDetails.issue_status ?? "").toString().toLowerCase();
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
      const returnedConeIds = new Set(
        orderReturnTxs.flatMap((tx) => (tx as any).conesIdsArray ?? [])
      );
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

      // Check if cone is already returned (double check)
      if (cone.status === "Returned" || coneDetails.returnStatus === "returned") {
        setScanError("This cone has already been returned and cannot be returned again.");
        return;
      }

      // Get cone weight from API response
      const coneWeight = coneDetails.coneWeight || 0;
      
      console.log("🔍 Cone scanned, showing type selection modal:", {
        barcode: value,
        coneWeight,
        issuedWeight: coneDetails.issueWeight || cone.issuedWeight || 0,
      });

      // Store pending cone data and show modal for user to select type
      setScanError(null);
      setPendingConeBarcode(value);
      setPendingConeData({ coneDetails, cone, coneWeight });
      setBarcodeInput("");
      setShowConeTypeModal(true);
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

    if (Number.isNaN(totalWeight) || totalWeight < 0) {
      toast.error("Enter a valid total weight.");
      return;
    }

    if (scannedBarcodes.length !== numberOfCones) {
      toast.error(`Number of scanned barcodes (${scannedBarcodes.length}) must match number of cones (${numberOfCones}).`);
      return;
    }

    // Check if all non-empty cones have been stored in racks
    const conesNeedingRack = scannedBarcodes.filter(barcode => !emptyCones.has(barcode));
    const allConesStored = conesNeedingRack.every(barcode => rackBarcodes.has(barcode));
    if (!allConesStored) {
      const missingRackCones = conesNeedingRack.filter(barcode => !rackBarcodes.has(barcode));
      toast.error(`All cones with remaining yarn must be stored in racks. Missing rack for: ${missingRackCones.join(", ")}`);
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

        // Check if this cone is empty
        const isConeEmpty = emptyCones.has(barcode);
        
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
        setEmptyCones(new Set());
        setScanningMode("cone");
        setCurrentConeBarcode(null);
        setActiveConeId(null);
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

            // Update cones with latest data (same logic as fetchOrderWithCones - use conesIdsArray)
            const conesMap = new Map<string, Cone>();
            const coneIdToTxIds = new Map<string, string[]>();
            issuedTransactions.forEach((tx: any) => {
              if (tx.transactionType !== "yarn_issued") return;
              const txId = tx._id || tx.id;
              const coneIds = Array.isArray(tx.conesIdsArray) && tx.conesIdsArray.length > 0
                ? tx.conesIdsArray
                : [tx.coneBarcode || tx.barcode || `TX-${txId}`];
              coneIds.forEach((cid: string) => {
                if (!coneIdToTxIds.has(cid)) coneIdToTxIds.set(cid, []);
                coneIdToTxIds.get(cid)!.push(txId);
              });
            });
            issuedTransactions.forEach((tx: any) => {
              if (tx.transactionType !== "yarn_issued") return;
              const numberOfCones = tx.numberOfCones || tx.transactionConeCount || 1;
              const weightPerCone = (tx.transactionNetWeight || tx.totalNetWeight || 0) / numberOfCones;
              const articleId = txArticleId(tx);
              const coneIds = Array.isArray(tx.conesIdsArray) && tx.conesIdsArray.length > 0
                ? tx.conesIdsArray
                : [tx.coneBarcode || tx.barcode || `TX-${tx._id || tx.id}`];
              coneIds.forEach((coneId: string, idx: number) => {
                if (conesMap.has(coneId)) return;
                const txIdsForCone = coneIdToTxIds.get(coneId) || [];
                const returnedTx = returnedTransactions.find(
                  (rt: any) =>
                    (rt.conesIdsArray?.includes?.(coneId) || rt.coneBarcode === coneId || txIdsForCone.includes(rt.issuedTransactionId)) &&
                    rt.transactionType === "yarn_returned"
                );
                const uniqueConeId = coneIds.length > 1 ? `${coneId}-${idx + 1}` : coneId;
                const catalogIdRefresh = resolveYarnCatalogIdFromTransaction(tx);
                conesMap.set(coneId, {
                  id: uniqueConeId,
                  barcode: coneId,
                  yarnCode: catalogIdRefresh || (tx as { yarnCode?: string }).yarnCode || "N/A",
                  yarnName: tx.yarnName || "Unknown Yarn",
                  yarnType: tx.yarn?.yarnType?.name || "Unknown",
                  issuedWeight: weightPerCone,
                  returnedWeight: returnedTx ? (returnedTx.transactionNetWeight || returnedTx.totalNetWeight || 0) / numberOfCones : undefined,
                  balanceWeight: returnedTx ? Math.max(weightPerCone - ((returnedTx.transactionNetWeight || returnedTx.totalNetWeight || 0) / numberOfCones), 0) : undefined,
                  status: returnedTx ? ("Returned" as ConeStatus) : ("Awaiting" as ConeStatus),
                  lastReturnedAt: returnedTx?.transactionDate || returnedTx?.createdAt,
                  transactionId: tx._id || tx.id,
                  yarnCatalogId: catalogIdRefresh || undefined,
                  articleId,
                });
              });
            });

            const updatedCones = Array.from(conesMap.values());
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
                {pendingOrders.length}
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
                onClick={() => setShowHistoryDrawer(true)}
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
                <p className="text-sm font-bold text-blue-600 truncate">{pendingOrders.length}</p>
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
                  <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2">Pending Articles Returns ({pendingArticles.length})</h3>
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
                        {pendingArticles.map((row) => {
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
                              <td className="px-1.5 py-2 text-[12px] text-gray-600 border border-gray-200">{new Date(row.knittingCompletedAt).toLocaleString()}</td>
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
                        })}
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
                setEmptyCones(new Set());
                setShowConeTypeModal(false);
                setPendingConeBarcode(null);
                setPendingConeData(null);
                setScanningMode("cone");
                setCurrentConeBarcode(null);
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
                        setEmptyCones(new Set());
                        setShowConeTypeModal(false);
                        setPendingConeBarcode(null);
                        setPendingConeData(null);
                        setScanningMode("cone");
                        setCurrentConeBarcode(null);
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
                                setEmptyCones(new Set());
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
                                <p className="text-xs font-medium text-blue-900">Scanned Cones & Racks:</p>
                                <div className="flex flex-wrap gap-1">
                                  {scannedBarcodes.map((barcode, index) => {
                                    const rackBarcode = rackBarcodes.get(barcode);
                                    const isConeEmpty = emptyCones.has(barcode);
                                    return (
                                      <span
                                        key={index}
                                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                          isConeEmpty ? "bg-gray-100 text-gray-800" : "bg-blue-100 text-blue-800"
                                        }`}
                                      >
                                        Cone: {barcode}
                                        {isConeEmpty ? (
                                          <span className="ml-1 text-gray-600">(Empty)</span>
                                        ) : rackBarcode ? (
                                          <span className="ml-1 text-green-700">→ Rack: {rackBarcode}</span>
                                        ) : (
                                          <span className="ml-1 text-orange-600">(Needs Rack)</span>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newBarcodes = scannedBarcodes.filter((_, i) => i !== index);
                                            const newConeData = new Map(scannedConeData);
                                            const newRackBarcodes = new Map(rackBarcodes);
                                            const newEmptyCones = new Set(emptyCones);
                                            newConeData.delete(barcode);
                                            newRackBarcodes.delete(barcode);
                                            newEmptyCones.delete(barcode);
                                            setScannedBarcodes(newBarcodes);
                                            setScannedConeData(newConeData);
                                            setRackBarcodes(newRackBarcodes);
                                            setEmptyCones(newEmptyCones);
                                            if (currentConeBarcode === barcode) {
                                              setCurrentConeBarcode(null);
                                              setScanningMode("cone");
                                            }
                                          }}
                                          className="ml-1 text-blue-600 hover:text-blue-800"
                                        >
                                          <i className="ri-close-line text-xs"></i>
                                        </button>
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <form onSubmit={handleBarcodeSubmit} className="space-y-2">
                          <label className="form-label text-sm font-semibold text-gray-700">
                            {scanningMode === "cone" ? "Scan Cone Barcode" : "Scan Rack Barcode (Short-Term Storage)"}
                          </label>
                          {scanningMode === "rack" && currentConeBarcode && (
                            <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                              <i className="ri-information-line me-1"></i>
                              Scanning rack for cone: <strong>{currentConeBarcode}</strong>
                            </div>
                          )}
                          <div className="relative">
                            <input
                              ref={scanBarcodeInputRef}
                              type="text"
                              className={`form-control ps-10 ${scanError ? "border-red-500 focus:border-red-500" : ""}`}
                              placeholder={scanningMode === "cone" ? "Scan or enter cone barcode" : "Scan or enter rack barcode"}
                              value={barcodeInput}
                              onChange={(event) => {
                                setBarcodeInput(event.target.value);
                                if (scanError) setScanError(null);
                              }}
                              disabled={
                                barcodeLoading ||
                                storingCone ||
                                (scanningMode === "cone" &&
                                  scannedBarcodes.length >= parseInt(transactionForm.numberOfCones || "1"))
                              }
                            />
                            <i className="ri-barcode-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                          </div>
                          {scanError && scanningMode === "cone" && (
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
                              (scanningMode === "cone" &&
                                (scannedBarcodes.length >= parseInt(transactionForm.numberOfCones || "1") ||
                                  !transactionForm.numberOfCones ||
                                  parseInt(transactionForm.numberOfCones) < 1))
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
                            ) : scanningMode === "rack" ? (
                              "Scan Rack Barcode"
                            ) : scannedBarcodes.length >= parseInt(transactionForm.numberOfCones || "1") ? (
                              "All Barcodes Scanned"
                            ) : (
                              "Scan Cone Barcode"
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
                              setEmptyCones(new Set());
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
                              <p className="text-xs font-medium text-blue-900">Scanned Cones & Racks:</p>
                              <div className="flex flex-wrap gap-1">
                                {scannedBarcodes.map((barcode, index) => {
                                  const rackBarcode = rackBarcodes.get(barcode);
                                  const isConeEmpty = emptyCones.has(barcode);
                                  return (
                                    <span
                                      key={index}
                                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                        isConeEmpty ? "bg-gray-100 text-gray-800" : "bg-blue-100 text-blue-800"
                                      }`}
                                    >
                                      Cone: {barcode}
                                      {isConeEmpty ? (
                                        <span className="ml-1 text-gray-600">(Empty)</span>
                                      ) : rackBarcode ? (
                                        <span className="ml-1 text-green-700">→ Rack: {rackBarcode}</span>
                                      ) : (
                                        <span className="ml-1 text-orange-600">(Needs Rack)</span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newBarcodes = scannedBarcodes.filter((_, i) => i !== index);
                                          const newConeData = new Map(scannedConeData);
                                          const newRackBarcodes = new Map(rackBarcodes);
                                          const newEmptyCones = new Set(emptyCones);
                                          newConeData.delete(barcode);
                                          newRackBarcodes.delete(barcode);
                                          newEmptyCones.delete(barcode);
                                          setScannedBarcodes(newBarcodes);
                                          setScannedConeData(newConeData);
                                          setRackBarcodes(newRackBarcodes);
                                          setEmptyCones(newEmptyCones);
                                          if (currentConeBarcode === barcode) {
                                            setCurrentConeBarcode(null);
                                            setScanningMode("cone");
                                          }
                                        }}
                                        className="ml-1 text-blue-600 hover:text-blue-800"
                                      >
                                        <i className="ri-close-line text-xs"></i>
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <form onSubmit={handleBarcodeSubmit} className="space-y-2">
                        <label className="form-label text-sm font-semibold text-gray-700">
                          {scanningMode === "cone" ? "Scan Cone Barcode" : "Scan Rack Barcode (Short-Term Storage)"}
                        </label>
                        {scanningMode === "rack" && currentConeBarcode && (
                          <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                            <i className="ri-information-line me-1"></i>
                            Scanning rack for cone: <strong>{currentConeBarcode}</strong>
                          </div>
                        )}
                        <div className="relative">
                          <input
                            ref={quickReturnBarcodeInputRef}
                            type="text"
                            className={`form-control ps-10 ${scanError ? "border-red-500 focus:border-red-500" : ""}`}
                            placeholder={scanningMode === "cone" ? "Scan or enter cone barcode" : "Scan or enter rack barcode"}
                            value={barcodeInput}
                            onChange={(event) => {
                              setBarcodeInput(event.target.value);
                              if (scanError) setScanError(null);
                            }}
                            disabled={
                              loadingQuickReturnOrder ||
                              barcodeLoading ||
                              storingCone ||
                              (scanningMode === "cone" &&
                                scannedBarcodes.length >= parseInt(transactionForm.numberOfCones || "1"))
                            }
                          />
                          <i className="ri-barcode-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        </div>
                        {scanError && scanningMode === "cone" && (
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
                            (scanningMode === "cone" &&
                              (scannedBarcodes.length >= parseInt(transactionForm.numberOfCones || "1") ||
                                !transactionForm.numberOfCones ||
                                parseInt(transactionForm.numberOfCones) < 1))
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
                          ) : scanningMode === "rack" ? (
                            "Scan Rack Barcode"
                          ) : scannedBarcodes.length >= parseInt(transactionForm.numberOfCones || "1") ? (
                            "All Barcodes Scanned"
                          ) : (
                            "Scan Cone Barcode"
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
                    setEmptyCones(new Set());
                    setScanningMode("cone");
                    setCurrentConeBarcode(null);
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
                        const isConeEmpty = emptyCones.has(barcode);
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
                    </div>

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
                        setEmptyCones(new Set());
                        setScanningMode("cone");
                        setCurrentConeBarcode(null);
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

      {/* Cone Type Selection Modal */}
      {showConeTypeModal && pendingConeBarcode && pendingConeData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10090]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="box-header border-b border-gray-200 px-6 py-4">
              <div className="flex justify-between items-center">
                <h3 className="box-title text-lg">Select Cone Type</h3>
                <button
                  onClick={() => {
                    setShowConeTypeModal(false);
                    setPendingConeBarcode(null);
                    setPendingConeData(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>
            <div className="box-body p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-semibold">Barcode:</span> {pendingConeBarcode}
                </p>
                {pendingConeData.cone && (
                  <>
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-semibold">Yarn Name:</span> {pendingConeData.cone.yarnName || "N/A"}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-semibold">Issued Weight:</span> {pendingConeData.cone.issuedWeight?.toFixed(2) || "N/A"} kg
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-semibold">Cone Weight:</span> {(pendingConeData.coneWeight ?? pendingConeData.coneDetails?.coneWeight ?? 0).toFixed(2)} kg
                    </p>
                  </>
                )}
              </div>
              
              <p className="text-sm font-semibold text-gray-900 mb-4">
                Is this cone empty or does it have remaining yarn?
              </p>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleConeTypeSelection(true)}
                  className="p-6 border-2 border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-center"
                >
                  <div className="text-4xl mb-2">📦</div>
                  <div className="text-lg font-semibold text-gray-900">Empty</div>
                  <div className="text-xs text-gray-500 mt-1">No yarn left</div>
                </button>
                
                <button
                  type="button"
                  onClick={() => handleConeTypeSelection(false)}
                  className="p-6 border-2 border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-center"
                >
                  <div className="text-4xl mb-2">🧵</div>
                  <div className="text-lg font-semibold text-gray-900">Remaining Yarn</div>
                  <div className="text-xs text-gray-500 mt-1">Has yarn left</div>
                </button>
              </div>
            </div>
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
                {filteredReturnTransactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <i className="ri-time-line text-4xl text-gray-300 mb-2"></i>
                    <h3 className="text-xs font-bold text-gray-400 mb-1">No Records</h3>
                    <p className="text-[11px] text-gray-500">Adjust filters or process cone returns to see records here.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-[11px] text-gray-500 mb-2">
                      {historyFilteredTotal} record{historyFilteredTotal !== 1 ? "s" : ""} · {HISTORY_PAGE_SIZE} per page
                      {historyTotalPages > 0 && (
                        <>
                          {" "}
                          · Page {historyPage} of {historyTotalPages}
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
                        {paginatedHistoryTransactions.map((transaction) => (
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
                    {historyTotalPages > 1 && (
                      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-gray-100">
                        <p className="text-[11px] text-gray-500">
                          Showing{" "}
                          {(historyPage - 1) * HISTORY_PAGE_SIZE + 1}
                          –
                          {Math.min(historyPage * HISTORY_PAGE_SIZE, historyFilteredTotal)} of {historyFilteredTotal}
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
                            onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                            disabled={historyPage >= historyTotalPages}
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

