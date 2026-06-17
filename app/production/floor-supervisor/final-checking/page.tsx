"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import { productionService, ProductionOrder, FloorOrderFilters, Article } from "@/shared/services/productionService";
import { API_BASE_URL } from "@/shared/data/utilities/api";
import NumericInput from "@/shared/utils/numericInput";
import { formatProductionQty, getFirstHalfStepError, HALF_STEP_QTY_ERROR } from "@/shared/utils/halfStepQuantity";
import {
  getAvailableRemaining,
  getCumulativeQty,
  getMaxM1ForSave,
  getRemainingAfterSave,
} from "@/shared/utils/qcFloorQuantities";
import ConfirmQualitySubmitModal, { type QualityConfirmLine } from "@/shared/components/production/ConfirmQualitySubmitModal";
import { getArticleMongoId, resolveNextFloorFromProcesses } from "@/shared/utils/productionUtils";
import {
  resolveArticlesToSubmit,
  validateFinalCheckingProcessFlow,
  ensureArticlesHaveProcesses,
  type FinalCheckingSubmitSnapshot,
} from "./finalCheckingSubmit.util";
import ReceivedQuantityDisplay from "@/shared/components/production/ReceivedQuantityDisplay";
import QcM2MergeHistoryPanel, { MERGE_CASCADE_ACTION } from "@/shared/components/production/QcM2MergeHistoryPanel";
import ArticleViewTab from "./components/ArticleViewTab";
import MyTeamTab from "./components/MyTeamTab";
import UpcomingTab from "../components/UpcomingTab";
import BrandTransferItemsInput from "@/shared/components/production/BrandTransferItemsInput";
import {
  buildBrandOptionsFromRows,
  collapseLinesByBrand,
  formatBrandLine,
  prepareBrandTransferItemsForSubmit,
  validateBrandTransferItems,
  type BrandTransferLine,
} from "@/shared/utils/brandTransfer.util";
import {
  getPendingContainerHandoffQty,
  hasPendingContainerHandoff,
  resolveArticlesForContainerStaging,
} from "@/shared/utils/containerHandoff.util";
import {
  containersMasterService,
  hasActiveItems,
  buildStagedActiveItemsPayload,
  groupContainerArticlesForDisplay,
  hasDuplicateArticlesInContainer,
  isContainerAlreadyStagedForArticles,
  type ContainerActiveItem,
} from "@/shared/services/containersMasterService";
import { useProductionArticleQrScan } from "@/shared/hooks/useProductionArticleQrScan";
import ArticleQrScanDrawer from "@/shared/components/production/ArticleQrScanDrawer";
import { teamMasterService, type TeamMaster, PRODUCTION_FLOORS } from "@/shared/services/teamMasterService";

type FinalCheckingTab = "orders" | "article-view" | "my-team" | "upcoming";

const FLOOR_CATALOG_LIMIT = 2000;

/**
 * Resolve a user-visible message from a thrown Error or API failure payload.
 */
function getProductionSubmitErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }
  return "Failed to update order";
}

interface ArticleLog {
  id: string;
  date: string; // YYYY-MM-DD
  action: string; // e.g., "Transferred to Branding"
  quantity: number;
  fromFloor?: string;
  toFloor?: string;
  remarks?: string;
}

interface FloorQuantities {
  received: number;
  completed: number;
  remaining: number;
  transferred: number;
  m1Quantity?: number;
  m2Quantity?: number;
  m3Quantity?: number;
  m4Quantity?: number;
  m2Transferred?: number;
  m2Remaining?: number;
  repairReceived?: number;
  repairFromFloor?: string;
  repairStatus?: 'Not Required' | 'In Review' | 'Repaired' | 'Rejected';
  repairRemarks?: string;
}



const FinalCheckingFloorSupervisorPage = () => {
  const user = useSelector((state: any) => state.auth?.user);
  const [floorCatalog, setFloorCatalog] = useState<ProductionOrder[]>([]);
  const [updateDrawerLoading, setUpdateDrawerLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [activeUpdateTabIndex, setActiveUpdateTabIndex] = useState(0);
  const [activeViewTabIndex, setActiveViewTabIndex] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  /** When set (from article view), modal shows only this article. When null (from orders tab), shows all. */
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [updateData, setUpdateData] = useState<{[key: string]: {
    remarks: string,
    m1Quantity: number,
    m2Quantity: number,
    m3Quantity: number,
    m4Quantity: number,
    repairStatus: 'Not Required' | 'In Review' | 'Repaired' | 'Rejected',
    repairRemarks: string,
    transferItems: Array<{ transferred: number; styleCode?: string; brand?: string }>;
  }}>({});
  /** Additional quantity to add to M2/M3/M4 (empty inputs). API receives additive deltas. */
  const [transferM2M3M4, setTransferM2M3M4] = useState<{[key: string]: { m2: number; m3: number; m4: number }}>({});
  const [showQualityConfirm, setShowQualityConfirm] = useState(false);
  const [qualityConfirmLines, setQualityConfirmLines] = useState<QualityConfirmLine[]>([]);
  const [pendingQualitySubmit, setPendingQualitySubmit] = useState<(() => void) | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [showLogsSection, setShowLogsSection] = useState(false);
  const [selectedLogArticleId, setSelectedLogArticleId] = useState<string>('');
  const [articleLogs, setArticleLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    linkingType: '',
    floor: ''
  });
  const [activeTab, setActiveTab] = useState<FinalCheckingTab>("article-view");
  const [showContainerScanDrawer, setShowContainerScanDrawer] = useState(false);
  const [containerScanBarcode, setContainerScanBarcode] = useState("");
  const [containerScanLoading, setContainerScanLoading] = useState(false);
  const [containerScanned, setContainerScanned] = useState<{ container: any; articles: Array<{ article: Article | null; quantity: number }> } | null>(null);
  const [acceptArticleLoading, setAcceptArticleLoading] = useState(false);
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [showAssignDrawer, setShowAssignDrawer] = useState(false);
  const [assignTeamMembers, setAssignTeamMembers] = useState<TeamMaster[]>([]);
  const [assignTeamLoading, setAssignTeamLoading] = useState(false);
  const [confirmAssignModal, setConfirmAssignModal] = useState<{ teamMemberName: string; teamMemberId: string; articleId: string } | null>(null);
  const [assigningInProgress, setAssigningInProgress] = useState(false);
  const [removingArticleMemberId, setRemovingArticleMemberId] = useState<string | null>(null);
  // Scan bag/container before submit (Update Order click opens this modal)
  const [showUpdateContainerModal, setShowUpdateContainerModal] = useState(false);
  const [updateContainerBarcode, setUpdateContainerBarcode] = useState("");
  const [updateContainerCheckStatus, setUpdateContainerCheckStatus] = useState<"idle" | "loading" | "not-found" | "already-filled" | "duplicate-article" | "ok">("idle");
  const [updateContainerFetched, setUpdateContainerFetched] = useState<{ activeItems?: Array<{ article: string | { articleNumber?: string }; quantity: number }>; activeFloor?: string } | null>(null);
  const [updateContainerArticleId, setUpdateContainerArticleId] = useState("");
  const [updateContainerQuantity, setUpdateContainerQuantity] = useState("");
  const [updateContainerNextFloor, setUpdateContainerNextFloor] = useState("Warehouse");
  const [updateContainerSubmitting, setUpdateContainerSubmitting] = useState(false);
  const [updateContainerRestageOnly, setUpdateContainerRestageOnly] = useState(false);
  /** Backend / submit errors shown inline in update drawer and container modal */
  const [updateSubmitError, setUpdateSubmitError] = useState<string | null>(null);

  /** When false (default): article view lists only articles with final checking remaining > 0. When true: all with received > 0. */
  const [showAllArticles, setShowAllArticles] = useState(false);

  /** Loads final checking floor orders for both tabs; filter + paginate client-side. */
  const loadFloorOrdersCatalog = useCallback(async (): Promise<ProductionOrder[] | null> => {
    setCatalogLoading(true);
    try {
      const apiFilters: FloorOrderFilters = {
        page: 1,
        limit: FLOOR_CATALOG_LIMIT,
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
        ...(searchQuery && { search: searchQuery }),
      };

      const response = await productionService.getFloorOrders("FinalChecking", apiFilters);

      if (response.success) {
        setFloorCatalog(response.data.results);
        return response.data.results;
      }
      console.error("Failed to load final checking orders:", response.error);
      toast.error("Failed to load final checking orders");
      return null;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to load final checking orders";
      console.error("Error loading final checking orders:", error);
      toast.error(msg);
      return null;
    } finally {
      setCatalogLoading(false);
    }
  }, [filters.status, filters.priority, searchQuery]);

  useEffect(() => {
    if (activeTab !== "orders" && activeTab !== "article-view") return;
    const timeoutId = setTimeout(() => {
      void loadFloorOrdersCatalog();
    }, searchQuery ? 300 : 0);
    return () => clearTimeout(timeoutId);
  }, [activeTab, loadFloorOrdersCatalog, searchQuery]);

  // Update container modal: debounced barcode check (multi-article allowed on same floor)
  useEffect(() => {
    if (!showUpdateContainerModal) {
      setUpdateContainerCheckStatus("idle");
      setUpdateContainerFetched(null);
      return;
    }
    const barcode = updateContainerBarcode.trim();
    if (!barcode) {
      setUpdateContainerCheckStatus("idle");
      setUpdateContainerFetched(null);
      return;
    }
    const nextFloor = (updateContainerNextFloor ?? "").trim().toLowerCase();
    let cancelled = false;
    const t = setTimeout(() => {
      setUpdateContainerCheckStatus("loading");
      setUpdateContainerFetched(null);
      containersMasterService
        .getByBarcode(barcode)
        .then((container) => {
          if (cancelled) return;
          if (hasActiveItems(container)) {
            const activeFloorNorm = (container.activeFloor ?? "").trim().toLowerCase();
            if (nextFloor && activeFloorNorm && activeFloorNorm === nextFloor) {
              setUpdateContainerCheckStatus("ok");
              setUpdateContainerFetched({ activeItems: container.activeItems, activeFloor: container.activeFloor });
            } else if (updateContainerRestageOnly) {
              setUpdateContainerCheckStatus("ok");
              setUpdateContainerFetched({ activeItems: container.activeItems, activeFloor: container.activeFloor });
            } else {
              setUpdateContainerCheckStatus("already-filled");
              setUpdateContainerFetched({ activeItems: container.activeItems, activeFloor: container.activeFloor });
            }
          } else {
            setUpdateContainerCheckStatus("ok");
            setUpdateContainerFetched(null);
          }
        })
        .catch((err) => {
          if (cancelled) return;
          const msg = err instanceof Error ? err.message : String(err);
          setUpdateContainerCheckStatus(msg.includes("404") ? "not-found" : "idle");
          setUpdateContainerFetched(null);
          if (!msg.includes("404")) toast.error(msg);
        });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [showUpdateContainerModal, updateContainerBarcode, updateContainerNextFloor, updateContainerRestageOnly]);

  // Flag when articles being transferred are already staged on the scanned container
  useEffect(() => {
    if (!showUpdateContainerModal || updateContainerCheckStatus !== "ok" || !updateContainerFetched || !selectedOrder) return;
    const modalArticles = selectedArticleId
      ? selectedOrder.articles.filter((a) => (a.id ?? a._id) === selectedArticleId)
      : selectedOrder.articles;
    const stagingRows = resolveArticlesForContainerStaging(modalArticles, updateData, getTransferTotal);
    const newRows = stagingRows
      .map(({ article, quantity }) => ({
        article: article._id ?? article.id ?? "",
        quantity,
      }))
      .filter((r): r is { article: string; quantity: number } => !!r.article && r.quantity > 0);
    const existingItems = updateContainerFetched.activeItems as ContainerActiveItem[] | undefined;
    if (
      newRows.length > 0 &&
      hasDuplicateArticlesInContainer(existingItems, newRows.map((r) => r.article)) &&
      !isContainerAlreadyStagedForArticles(existingItems, newRows)
    ) {
      setUpdateContainerCheckStatus("duplicate-article");
    }
  }, [showUpdateContainerModal, updateContainerCheckStatus, updateContainerFetched, selectedOrder, selectedArticleId, updateData]);

  // When article changes in modal, sync quantity (from transferItems) and next floor from article processes
  useEffect(() => {
    if (!showUpdateContainerModal || !updateContainerArticleId || !selectedOrder) return;
    const items = updateData[updateContainerArticleId]?.transferItems ?? [];
    setUpdateContainerQuantity(String(items.reduce((s, i) => s + (i.transferred ?? 0), 0)));
    const mongoId = getArticleMongoId(updateContainerArticleId, selectedOrder.articles);
    if (!mongoId) return;
    let cancelled = false;
    productionService.getArticleProcesses(mongoId).then((res) => {
      if (cancelled) return;
      if (res.success && res.data?.processes) {
        const next = resolveNextFloorFromProcesses(res.data.processes, "Final Checking", "Warehouse");
        setUpdateContainerNextFloor(next);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [showUpdateContainerModal, updateContainerArticleId, selectedOrder?.articles]);

  /**
   * Article view / orders list slice: default remaining > 0 on Final Checking; show-all uses received > 0.
   * @param orders - Raw floor orders
   * @param showAll - If true, include articles with finalChecking received > 0; else only remaining > 0
   */
  const filterOrdersByReceivedQuantity = (orders: ProductionOrder[], showAll: boolean): ProductionOrder[] => {
    return orders.map((order) => {
      const filteredArticles = order.articles.filter((article) => {
        const received = article.floorQuantities?.finalChecking?.received || 0;
        const transferred = article.floorQuantities?.finalChecking?.transferred || 0;
        const remaining = article.floorQuantities?.finalChecking?.remaining ?? (received - transferred);
        if (showAll) return received > 0;
        return remaining > 0;
      });
      return { ...order, articles: filteredArticles };
    }).filter((order) => order.articles.length > 0);
  };

  /** Build update drawer state from order articles (cumulative totals + zero deltas). */
  const buildUpdateStateFromOrder = (order: ProductionOrder) => {
    const initialData: {[key: string]: {
      remarks: string,
      m1Quantity: number,
      m2Quantity: number,
      m3Quantity: number,
      m4Quantity: number,
      repairStatus: 'Not Required' | 'In Review' | 'Repaired' | 'Rejected',
      repairRemarks: string,
      transferItems: Array<{ transferred: number; styleCode?: string; brand?: string }>;
    }} = {};
    const transferInit: {[key: string]: { m2: number; m3: number; m4: number }} = {};
    order.articles.forEach((article) => {
      const articleId = article.id || article._id;
      if (!articleId) return;
      const cumulative = getCumulativeQty(article, 'finalChecking');
      const fc = article.floorQuantities?.finalChecking;
      initialData[articleId] = {
        remarks: article.remarks || '',
        m1Quantity: 0,
        m2Quantity: cumulative.m2,
        m3Quantity: cumulative.m3,
        m4Quantity: cumulative.m4,
        repairStatus: (fc?.repairStatus || (article as Article & { repairStatus?: string }).repairStatus || 'Not Required') as 'Not Required' | 'In Review' | 'Repaired' | 'Rejected',
        repairRemarks: fc?.repairRemarks || (article as Article & { repairRemarks?: string }).repairRemarks || '',
        transferItems: [{ transferred: 0 }],
      };
      transferInit[articleId] = { m2: 0, m3: 0, m4: 0 };
    });
    return { initialData, transferInit };
  };

  /** Apply fresh order data to update drawer inputs (keeps drawer open after save). */
  const refreshUpdateDrawerFromOrder = (order: ProductionOrder) => {
    const { initialData, transferInit } = buildUpdateStateFromOrder(order);
    setSelectedOrder(order);
    setUpdateData(initialData);
    setTransferM2M3M4(transferInit);
  };

  const getOrderRefId = (order: Pick<ProductionOrder, 'id'> & { _id?: string }) =>
    String(order.id ?? order._id ?? '');

  const orderIdsMatch = (left: string, right: string) =>
    left.length > 0 && right.length > 0 && left === right;

  /**
   * Fetch latest order from API and patch it into the floor catalog.
   * @param orderId - Order id to reload
   * @param fallbackOrder - Used when API fetch fails
   */
  const fetchFreshOrderForDrawer = async (
    orderId: string,
    fallbackOrder?: ProductionOrder
  ): Promise<ProductionOrder | null> => {
    try {
      const response = await productionService.getOrder(orderId);
      if (response.success && response.data) {
        const freshOrder = response.data;
        setFloorCatalog((prev) =>
          prev.some((o) => orderIdsMatch(getOrderRefId(o), orderId))
            ? prev.map((o) => (orderIdsMatch(getOrderRefId(o), orderId) ? freshOrder : o))
            : prev
        );
        return freshOrder;
      }
    } catch (error) {
      console.error('Failed to fetch fresh order for update drawer:', error);
    }
    return fallbackOrder ?? null;
  };

  const openUpdateDrawerWithOrder = (order: ProductionOrder, article?: Article) => {
    setSelectedArticleId(article ? (article.id ?? article._id ?? null) : null);
    setActiveUpdateTabIndex(0);
    refreshUpdateDrawerFromOrder(order);
    setShowUpdateModal(true);
  };

  /** Max qty assignable on this save (remaining minus pending transfer + M2/M3/M4 deltas). */
  const getActualRemainingForArticle = (article: Article, articleId?: string) => {
    const cumulative = getCumulativeQty(article, 'finalChecking');
    if (!articleId) return cumulative.remaining;
    const transfer = transferM2M3M4[articleId];
    const m1FromItems = getTransferTotal(updateData[articleId]?.transferItems ?? []);
    return getAvailableRemaining(cumulative, {
      m1: m1FromItems,
      m2: transfer?.m2 ?? 0,
      m3: transfer?.m3 ?? 0,
      m4: transfer?.m4 ?? 0,
    });
  };

  /** Max M1 transfer (transferItems) for this save after M2/M3/M4 deltas. */
  const getMaxTransferForArticle = (article: Article, articleId: string) => {
    const cumulative = getCumulativeQty(article, 'finalChecking');
    const transfer = transferM2M3M4[articleId];
    return getMaxM1ForSave(cumulative, {
      m2: transfer?.m2 ?? 0,
      m3: transfer?.m3 ?? 0,
      m4: transfer?.m4 ?? 0,
    });
  };

  /** Build brand options and max qty per brand from receivedData. */
  const getArticleBrandTransferOptions = (article: Article) => {
    const fc = article.floorQuantities?.finalChecking;
    const receivedData = (fc?.receivedData as Array<{ transferred?: number; styleCode?: string; brand?: string }>) ?? [];
    const transferredData = (fc?.transferredData as Array<{ transferred?: number; styleCode?: string; brand?: string }>) ?? [];
    return buildBrandOptionsFromRows(receivedData, transferredData);
  };

  const filteredOrders = useMemo(
    () => filterOrdersByReceivedQuantity(floorCatalog, showAllArticles),
    [floorCatalog, showAllArticles]
  );

  const orderTotalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), orderTotalPages);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedOrders([]);
    setSelectAll(false);
  }, [showAllArticles]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(Math.max(1, p), orderTotalPages));
  }, [orderTotalPages, filteredOrders.length, itemsPerPage]);

  const paginatedOrders = useMemo(() => {
    const start = (safeCurrentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, safeCurrentPage, itemsPerPage]);

  const ordersPageStart = paginatedOrders.length === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1;
  const ordersPageEnd =
    paginatedOrders.length === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + paginatedOrders.length;

  const qrScan = useProductionArticleQrScan({
    floorApiName: "Final Checking",
    floorKey: "finalChecking",
    floorLabel: "Final Checking",
    filterOrdersForLookup: (all) => filterOrdersByReceivedQuantity(all, true),
    setFloorOrderCatalog: setFloorCatalog,
    setShowAllArticles,
    onArticleFound: (id) => setActiveArticleId(id),
    goToArticleView: () => setActiveTab("article-view"),
  });
  const articleTabOrders = qrScan.qrPinnedArticleOrders ?? floorCatalog;

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(paginatedOrders.map(order => order.id));
    }
    setSelectAll(!selectAll);
  };

  const handleOrderSelect = (orderId: string) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    } else {
      setSelectedOrders([...selectedOrders, orderId]);
    }
  };

  const handleViewOrder = (order: ProductionOrder, article?: Article) => {
    setSelectedOrder(order);
    setSelectedArticleId(article ? (article.id ?? article._id ?? null) : null);
    setActiveViewTabIndex(0);
    setShowViewModal(true);
  };

  const handleUpdateOrder = async (order: ProductionOrder, article?: Article) => {
    const orderId = getOrderRefId(order);
    if (!orderId) return;
    openUpdateDrawerWithOrder(order, article);
    setUpdateDrawerLoading(true);
    try {
      const freshOrder = await fetchFreshOrderForDrawer(orderId, order);
      if (freshOrder) {
        refreshUpdateDrawerFromOrder(freshOrder);
      }
    } finally {
      setUpdateDrawerLoading(false);
    }
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedOrder(null);
    setSelectedArticleId(null);
    setShowLogsSection(false);
    setSelectedLogArticleId('');
    setArticleLogs([]);
  };

  // Load article logs
  const loadArticleLogs = async (articleId: string) => {
    setLogsLoading(true);
    try {
      console.log('Loading logs for article ID:', articleId);
      console.log('API URL will be:', `${API_BASE_URL}/production/logs/article/${articleId}`);
      
      const response = await productionService.getArticleLogs(articleId);
      
      console.log('Article logs response:', response);
      
      if (response.success) {
        console.log('Article logs data:', response.data);
        setArticleLogs(response.data.results || []);
      } else {
        console.error('Failed to load article logs:', response.error);
        toast.error('Failed to load article logs');
        setArticleLogs([]);
      }
    } catch (error: any) {
      console.error('Error loading article logs:', error);
      toast.error(error.message || 'Failed to load article logs');
      setArticleLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleLogsArticleSelect = (articleId: string) => {
    console.log('Selected article ID for logs:', articleId);
    setSelectedLogArticleId(articleId);
    loadArticleLogs(articleId);
  };

  const closeUpdateModal = () => {
    setShowUpdateModal(false);
    setSelectedOrder(null);
    setSelectedArticleId(null);
    setUpdateData({});
    setTransferM2M3M4({});
    setUpdateSubmitError(null);
  };

  /** Surface submit/API errors in the drawer/modal and as a toast. */
  const reportSubmitError = (message: string) => {
    const msg = message.trim() || "Failed to update order";
    setUpdateSubmitError(msg);
    toast.error(msg);
  };

  /**
   * Undo article transfers after container staging fails (compensating transaction).
   */
  const revertSubmitSnapshots = async (snapshots: FinalCheckingSubmitSnapshot[]): Promise<void> => {
    for (const snap of snapshots) {
      if (snap.transferItems.length === 0) continue;
      const response = await productionService.revertFloorTransfer(snap.articleId, {
        floor: "Final Checking",
        transferItems: snap.transferItems,
        ...(snap.m1Quantity > 0 ? { m1Quantity: snap.m1Quantity } : {}),
        ...(snap.m2Quantity > 0 ? { m2Quantity: snap.m2Quantity } : {}),
        ...(snap.m3Quantity > 0 ? { m3Quantity: snap.m3Quantity } : {}),
        ...(snap.m4Quantity > 0 ? { m4Quantity: snap.m4Quantity } : {}),
      });
      if (!response.success) {
        throw new Error(response.error?.message || `Failed to revert transfer for article ${snap.articleId}`);
      }
    }
  };

  /** Reset and hide the scan-bag modal shown before M1 transfer. */
  const closeContainerStagingModal = () => {
    setShowUpdateContainerModal(false);
    setUpdateContainerBarcode("");
    setUpdateContainerArticleId("");
    setUpdateContainerQuantity("");
    setUpdateContainerNextFloor("Warehouse");
    setUpdateContainerCheckStatus("idle");
    setUpdateContainerFetched(null);
    setUpdateContainerRestageOnly(false);
    setUpdateSubmitError(null);
  };

  const handleRemarksChange = (articleId: string, value: string) => {
    setUpdateData(prev => ({
      ...prev,
      [articleId]: {
        ...prev[articleId],
        remarks: value
      }
    }));
  };

  const handleM1QuantityChange = (articleId: string, value: number) => {
    setUpdateData(prev => ({
      ...prev,
      [articleId]: {
        ...prev[articleId],
        m1Quantity: value
      }
    }));
  };

  const getTransferTotal = (items: Array<{ transferred?: number }>) =>
    (items ?? []).reduce((s, i) => s + (i.transferred ?? 0), 0);

  /** Check if transfer items exceed per-brand received for an article. */
  const hasTransferItemsExceedingBrandMax = (article: Article, items: Array<{ transferred?: number; brand?: string }>) => {
    const { brandMaxQuantities } = getArticleBrandTransferOptions(article);
    const { brandValid } = validateBrandTransferItems(items as any, Infinity, brandMaxQuantities);
    return !brandValid;
  };

  const handleTransferItemsChange = (articleId: string, items: Array<{ transferred: number; styleCode?: string; brand?: string }>) => {
    setUpdateData(prev => ({
      ...prev,
      [articleId]: {
        ...prev[articleId],
        transferItems: items.length > 0 ? items : [{ transferred: 0 }],
        m1Quantity: items.reduce((s, i) => s + (i.transferred ?? 0), 0)
      }
    }));
  };

  const handleM2QuantityChange = (articleId: string, value: number) => {
    setUpdateData(prev => ({
      ...prev,
      [articleId]: {
        ...prev[articleId],
        m2Quantity: value
      }
    }));
  };

  const handleM3QuantityChange = (articleId: string, value: number) => {
    setUpdateData(prev => ({
      ...prev,
      [articleId]: {
        ...prev[articleId],
        m3Quantity: value
      }
    }));
  };

  const handleM4QuantityChange = (articleId: string, value: number) => {
    setUpdateData(prev => ({
      ...prev,
      [articleId]: {
        ...prev[articleId],
        m4Quantity: value
      }
    }));
  };

  /** Change additional transfer quantity for M2/M3/M4 (added to previous value in API). */
  const handleTransferM2M3M4Change = (articleId: string, field: 'm2' | 'm3' | 'm4', value: number) => {
    setTransferM2M3M4(prev => ({
      ...prev,
      [articleId]: {
        ...prev[articleId],
        [field]: Math.max(0, value)
      }
    }));
  };

  /** Build confirm modal lines from current modal article deltas. */
  const buildQualityConfirmLines = (articles: Article[]): QualityConfirmLine[] => {
    return articles
      .map((article) => {
        const articleId = (article.id || article._id) as string;
        if (!articleId) return null;
        const update = updateData[articleId];
        const transfer = transferM2M3M4[articleId];
        const m1 = update?.m1Quantity ?? 0;
        const m2 = transfer?.m2 ?? 0;
        const m3 = transfer?.m3 ?? 0;
        const m4 = transfer?.m4 ?? 0;
        if (m1 + m2 + m3 + m4 <= 0) return null;
        return {
          articleId,
          articleNumber: article.articleNumber,
          m1,
          m2,
          m3,
          m4,
        };
      })
      .filter(Boolean) as QualityConfirmLine[];
  };

  /** Show confirmation modal then run submit (optionally after container step). */
  const requestQualityConfirm = (afterConfirm: () => void, articles: Article[]) => {
    const lines = buildQualityConfirmLines(articles);
    if (lines.length === 0) {
      void handleUpdateSubmit({ articles });
      return;
    }
    setQualityConfirmLines(lines);
    setPendingQualitySubmit(() => afterConfirm);
    setShowQualityConfirm(true);
  };

  // Mark final quality for an article in the open modal
  const handleConfirmFinalQuality = (articleId: string, confirmed: boolean) => {
    if (!selectedOrder) return;
    // Update orders list
    setFloorCatalog(prev => prev.map(o => o.id === selectedOrder.id ? {
      ...o,
      articles: o.articles.map(a => a.id === articleId ? { ...a, finalQualityConfirmed: confirmed } : a)
    } : o));
    // Update selectedOrder snapshot so UI reflects instantly
    setSelectedOrder(prev => prev ? {
      ...prev,
      articles: prev.articles.map(a => a.id === articleId ? { ...a, finalQualityConfirmed: confirmed } : a)
    } : prev);
  };

  /**
   * Persist QC / transfer changes for the open update drawer.
   * @param options.closeDrawer - Close drawer after success (direct submit only)
   * @param options.articles - Scope submit to these articles (defaults to drawer filter)
   * @returns Snapshots of successful transfers for compensation if container staging fails
   */
  const handleUpdateSubmit = async (options?: {
    closeDrawer?: boolean;
    articles?: Article[];
  }): Promise<FinalCheckingSubmitSnapshot[]> => {
    if (!selectedOrder) return [];

    const articlesToSubmit = resolveArticlesToSubmit(
      selectedOrder.articles,
      selectedArticleId,
      options?.articles
    );

    const articlesWithProcesses = await ensureArticlesHaveProcesses(
      articlesToSubmit,
      async (articleId) => {
        const response = await productionService.getArticleProcesses(articleId);
        if (!response.success || !response.data?.processes?.length) return null;
        return response.data.processes;
      }
    );

    const processFlowError = validateFinalCheckingProcessFlow(
      articlesWithProcesses,
      updateData,
      transferM2M3M4,
      getTransferTotal
    );
    if (processFlowError) {
      reportSubmitError(processFlowError);
      throw new Error(processFlowError);
    }

    for (const article of articlesToSubmit) {
      const articleId = article.id || article._id;
      if (!articleId) continue;
      const update = updateData[articleId];
      if (!update) continue;
      const transfer = transferM2M3M4[articleId];
      const transferTotal = getTransferTotal(update.transferItems ?? []);
      const m1QcDelta = transferTotal > 0 ? transferTotal : (update.m1Quantity ?? 0);
      const m2Delta = transfer?.m2 ?? 0;
      const m3Delta = transfer?.m3 ?? 0;
      const m4Delta = transfer?.m4 ?? 0;
      const batchTotal = m1QcDelta + m2Delta + m3Delta + m4Delta;
      const halfStepError = getFirstHalfStepError([
        { value: m1QcDelta, label: "M1", skipZero: true },
        { value: m2Delta, label: "M2", skipZero: true },
        { value: m3Delta, label: "M3", skipZero: true },
        { value: m4Delta, label: "M4", skipZero: true },
      ]);
      if (halfStepError) {
        toast.error(`${article.articleNumber ?? articleId}: ${HALF_STEP_QTY_ERROR}`);
        throw new Error(halfStepError);
      }
      if (batchTotal > 0) {
        const cumulative = getCumulativeQty(article, "finalChecking");
        if (batchTotal > cumulative.remaining) {
          const msg = `${article.articleNumber ?? articleId}: batch total (${batchTotal}) exceeds remaining (${cumulative.remaining})`;
          toast.error(msg);
          throw new Error(msg);
        }
      }
      if (transferTotal > 0) {
        const cumulative = getCumulativeQty(article, "finalChecking");
        if (cumulative.completed + transferTotal > cumulative.received) {
          const msg = `${article.articleNumber ?? articleId}: M1 transfer (${transferTotal}) exceeds inspectable received (${cumulative.received - cumulative.completed} left)`;
          toast.error(msg);
          throw new Error(msg);
        }
      }
    }

    const articlesWithTransfer = articlesToSubmit.filter((a) => {
      const total = getTransferTotal(updateData[a.id || a._id || ""]?.transferItems ?? []);
      return total > 0;
    });
    let freshArticles = new Map<string, Article>();
    if (articlesWithTransfer.length > 0) {
      try {
        const results = await Promise.allSettled(
          articlesWithTransfer.map((a) => productionService.getArticle(a._id || a.id))
        );
        results.forEach((r, i) => {
          const art = articlesWithTransfer[i];
          const id = art?.id || art?._id;
          if (id && r.status === "fulfilled" && r.value.success && r.value.data) {
            freshArticles.set(id, r.value.data as Article);
          }
        });
      } catch {
        // Fallback to selectedOrder articles if fetch fails
      }
    }

    const getArticleForValidation = (article: Article) =>
      freshArticles.get(article.id || article._id || "") ?? article;

    const invalidArticles = articlesToSubmit.filter((article) => {
      const fresh = getArticleForValidation(article);
      const articleId = article.id || article._id;
      if (!articleId) return false;
      const update = updateData[articleId];
      if (!update) return false;
      const actualRemaining = getMaxTransferForArticle(fresh, articleId);
      const total = getTransferTotal(update.transferItems ?? []);
      if (total > actualRemaining) return true;
      return hasTransferItemsExceedingBrandMax(fresh, update.transferItems ?? []);
    });

    if (invalidArticles.length > 0) {
      toast.error("Cannot submit: Some articles have transfer quantity exceeding remaining or received per brand");
      throw new Error("Transfer validation failed");
    }

    const snapshots: FinalCheckingSubmitSnapshot[] = [];

    try {
      setIsLoading(true);
      setUpdateSubmitError(null);

      for (const article of articlesToSubmit) {
        const articleId = article.id || article._id;
        if (!articleId) continue;
        const fresh = getArticleForValidation(article);
        const update = updateData[articleId];
        if (!update) continue;

        const transferTotal = getTransferTotal(update.transferItems ?? []);
        const m1QcDelta = transferTotal > 0 ? transferTotal : (update.m1Quantity ?? 0);
        const m2Delta = transferM2M3M4[articleId]?.m2 ?? 0;
        const m3Delta = transferM2M3M4[articleId]?.m3 ?? 0;
        const m4Delta = transferM2M3M4[articleId]?.m4 ?? 0;
        const hasQtyChange = m1QcDelta > 0 || m2Delta > 0 || m3Delta > 0 || m4Delta > 0;
        const validItems = prepareBrandTransferItemsForSubmit(
          update.transferItems ?? [],
          transferTotal,
          fresh.floorQuantities?.finalChecking?.receivedData as BrandTransferLine[],
          fresh.floorQuantities?.finalChecking?.transferredData as BrandTransferLine[]
        );
        if (transferTotal > 0 && validItems.length === 0) {
          toast.error("Transfer requires a brand. Select brand or ensure received brand breakdown exists.");
          throw new Error("Missing brand for transfer");
        }
        const hasTransfer = validItems.length > 0;
        const hasProgressChange =
          update.remarks !== (fresh.remarks || "") ||
          hasTransfer ||
          update.repairStatus !== fresh.repairStatus ||
          update.repairRemarks !== (fresh.repairRemarks || "");

        if (!hasProgressChange && !hasQtyChange) continue;

        const userId = user?.id ?? user?._id;
        const floorSupervisorId = user?.id ?? user?._id;
        if (!userId || !floorSupervisorId) {
          toast.error("User session required for update. Please log in again.");
          throw new Error("User session required");
        }
        if (hasTransfer) {
          const received = fresh.floorQuantities?.finalChecking?.received ?? 0;
          if (received <= 0) {
            toast.error("Transfer requires received work. Accept the container first (scan container → Accept Article Quantity).");
            throw new Error("No received work for transfer");
          }
        }

        const progressData = {
          remarks: update.remarks,
          repairStatus: update.repairStatus,
          repairRemarks: update.repairRemarks,
          ...(hasTransfer ? { transferredData: validItems } : {}),
          ...(hasQtyChange && m1QcDelta > 0 ? { m1Quantity: m1QcDelta } : {}),
          ...(hasQtyChange && m2Delta > 0 ? { m2Quantity: m2Delta } : {}),
          ...(hasQtyChange && m3Delta > 0 ? { m3Quantity: m3Delta } : {}),
          ...(hasQtyChange && m4Delta > 0 ? { m4Quantity: m4Delta } : {}),
          ...(userId ? { userId } : {}),
          ...(floorSupervisorId ? { floorSupervisorId } : {}),
        };

        const response = await productionService.updateArticleProgress(
          "FinalChecking",
          getOrderRefId(selectedOrder),
          article._id || article.id,
          progressData
        );
        if (!response.success) {
          throw new Error(response.error?.message || "Failed to update article");
        }

        if (hasTransfer) {
          snapshots.push({
            articleId: String(article._id || article.id),
            transferItems: validItems,
            m1Quantity: m1QcDelta,
            m2Quantity: m2Delta,
            m3Quantity: m3Delta,
            m4Quantity: m4Delta,
          });
        }
      }

      setUpdateSubmitError(null);

      if (!options?.closeDrawer) {
        toast.success("Order updated successfully");
      }
      const orderId = getOrderRefId(selectedOrder);
      void loadFloorOrdersCatalog();
      if (options?.closeDrawer) {
        closeUpdateModal();
      } else {
        try {
          const freshOrder = await fetchFreshOrderForDrawer(orderId, selectedOrder);
          if (freshOrder) {
            refreshUpdateDrawerFromOrder(freshOrder);
          }
        } catch (refreshErr) {
          console.error("Failed to refresh update drawer after save:", refreshErr);
        }
      }
      return snapshots;
    } catch (error: unknown) {
      console.error("Error updating order:", error);
      if (snapshots.length > 0) {
        try {
          await revertSubmitSnapshots(snapshots);
        } catch (revertErr) {
          console.error("Failed to revert partial article submit:", revertErr);
        }
      }
      const msg = getProductionSubmitErrorMessage(error);
      if (msg.includes("exceeds transferable") || msg.includes("transferable (0)")) {
        reportSubmitError("Transfer requires received work. Accept the container first (scan container → Accept Article Quantity).");
      } else if (msg.includes("No received work")) {
        reportSubmitError("Transfer requires received work. Accept the container first (scan container → Accept Article Quantity).");
      } else if (msg.includes("User session")) {
        reportSubmitError("User session required for transfer. Please log in again.");
      } else if (
        !msg.includes("Transfer validation failed") &&
        !msg.includes("half step") &&
        !msg.includes("exceeds remaining") &&
        !msg.includes("inspectable received") &&
        !msg.includes("Missing brand") &&
        !msg.includes("not in this product's process flow")
      ) {
        reportSubmitError(msg);
      }
      void loadFloorOrdersCatalog();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleForwardToBranding = () => {
    if (!selectedOrder) return;
    const order = floorCatalog.find(o => o.id === selectedOrder.id);
    if (!order) return;
    const allConfirmed = order.articles.every(a => a.finalQualityConfirmed);
    if (!allConfirmed) {
      toast.error('Confirm final quality for all articles before forwarding.');
      return;
    }
    setFloorCatalog(prev => prev.map(o => o.id === order.id ? { ...o, forwardedToBranding: true, status: 'Completed' } : o));
    toast.success('Forwarded to Branding successfully');
    closeUpdateModal();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedOrders([]);
    setSelectAll(false);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
    setSelectedOrders([]);
    setSelectAll(false);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
    setSelectedOrders([]);
    setSelectAll(false);
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      priority: '',
      linkingType: '',
      floor: ''
    });
    setSearchQuery('');
    setCurrentPage(1);
    setSelectedOrders([]);
    setSelectAll(false);
  };

  const hasActiveFilters = searchQuery || Object.values(filters).some(value => value !== '');

  const findArticleInOrders = useCallback((articleId: string): Article | null => {
    for (const order of floorCatalog) {
      const art = order.articles.find((a) => (a._id || a.id) === articleId);
      if (art) return art;
    }
    return null;
  }, [floorCatalog]);

  const CURRENT_FLOOR = "Final Checking";
  const normalizeFloor = (f: string | undefined) => (f ?? "").replace(/\s+/g, "").toLowerCase();
  const containerBelongsToCurrentFloor =
    containerScanned && normalizeFloor(containerScanned.container.activeFloor) === normalizeFloor(CURRENT_FLOOR);

  const handleScanContainerClick = () => {
    setContainerScanned(null);
    setContainerScanBarcode("");
    setShowContainerScanDrawer(true);
  };

  const handleGetContainerByBarcode = async () => {
    const barcode = containerScanBarcode.trim();
    if (!barcode) return;

        if (await qrScan.tryScanFromContainerInput(barcode)) {
      setContainerScanLoading(false);
      setShowContainerScanDrawer(false);
      setContainerScanBarcode("");
      return;
    }



    setContainerScanLoading(true);
    setContainerScanned(null);
    try {
      const container = await containersMasterService.getByBarcode(barcode);
      const grouped = groupContainerArticlesForDisplay(container);
      const articlePromises = grouped.map((g) => {
        const art = findArticleInOrders(g.articleId);
        if (art) return Promise.resolve({ article: art, quantity: g.quantity });
        return productionService.getArticle(g.articleId).then((r) =>
          r.success && r.data ? { article: r.data as Article, quantity: g.quantity } : { article: null, quantity: g.quantity }
        );
      });
      const resolved = await Promise.all(articlePromises);
      setContainerScanned({ container, articles: resolved });
      if (normalizeFloor(container.activeFloor) !== normalizeFloor(CURRENT_FLOOR)) {
        toast.error(`This container belongs to "${container.activeFloor ?? "unknown"}", not ${CURRENT_FLOOR}. Accept Article disabled.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("404")) toast.error("Container not found for this barcode.");
      else toast.error(msg);
    } finally {
      setContainerScanLoading(false);
    }
  };

  const handleAcceptArticleQuantity = async () => {
    if (!containerScanned?.container?.barcode) return;
    if (!hasActiveItems(containerScanned.container)) return;
    setAcceptArticleLoading(true);
    try {
      const barcode = containerScanned.container.barcode;
      const acceptResult = await containersMasterService.acceptByBarcode(barcode);
      const updatedCount = Array.isArray((acceptResult as { articles?: unknown[] })?.articles)
        ? (acceptResult as { articles: unknown[] }).articles.length
        : 0;
      if (updatedCount === 0) {
        throw new Error('Container accept did not update any articles');
      }
      const first = containerScanned.articles.find((a) => a.article);
      if (first?.article) setActiveArticleId(String((first.article as any)._id ?? (first.article as any).id ?? ""));
      toast.success("Article quantity accepted on Final Checking.");
      setShowContainerScanDrawer(false);
      setContainerScanned(null);
      setContainerScanBarcode("");
      void loadFloorOrdersCatalog();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept");
    } finally {
      setAcceptArticleLoading(false);
    }
  };

  const handleOpenAssignDrawer = useCallback(async () => {
    setShowAssignDrawer(true);
    setAssignTeamLoading(true);
    try {
      const data = await teamMasterService.list({ workingFloor: "Final Checking", limit: 200 });
      setAssignTeamMembers(data.results);
    } catch {
      toast.error("Failed to load team members");
      setAssignTeamMembers([]);
    } finally {
      setAssignTeamLoading(false);
    }
  }, []);

  const handleAssignToMember = (member: TeamMaster) => {
    if (!activeArticleId) {
      toast.error("No active article selected. Scan container and accept article first.");
      return;
    }
    setConfirmAssignModal({ teamMemberName: member.teamMemberName, teamMemberId: member._id, articleId: activeArticleId });
  };

  const handleConfirmAssign = async () => {
    if (!confirmAssignModal?.articleId) return;
    setAssigningInProgress(true);
    try {
      await teamMasterService.addActiveArticle(confirmAssignModal.teamMemberId, confirmAssignModal.articleId);
      toast.success(`Article assigned to ${confirmAssignModal.teamMemberName}`);
      setConfirmAssignModal(null);
      const data = await teamMasterService.list({ workingFloor: "Final Checking", limit: 200 });
      setAssignTeamMembers(data.results);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign article");
    } finally {
      setAssigningInProgress(false);
    }
  };

  const handleArticleReceived = async (member: TeamMaster) => {
    if (!activeArticleId) return;
    setRemovingArticleMemberId(member._id);
    try {
      await teamMasterService.removeActiveArticle(member._id, activeArticleId);
      toast.success("Article received recorded.");
      const data = await teamMasterService.list({ workingFloor: "Final Checking", limit: 200 });
      setAssignTeamMembers(data.results);
      void loadFloorOrdersCatalog();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove active article");
    } finally {
      setRemovingArticleMemberId(null);
    }
  };

  const handleCloseAssignDrawer = () => {
    setShowAssignDrawer(false);
    setConfirmAssignModal(null);
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'In Progress': 'bg-blue-100 text-blue-800',
      'Completed': 'bg-green-100 text-green-800',
      'On Hold': 'bg-red-100 text-red-800'
    };
    return statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityBadge = (priority: string) => {
    const priorityClasses = {
      'Urgent': 'bg-red-100 text-red-800',
      'High': 'bg-orange-100 text-orange-800',
      'Medium': 'bg-yellow-100 text-yellow-800',
      'Low': 'bg-green-100 text-green-800'
    };
    return priorityClasses[priority as keyof typeof priorityClasses] || 'bg-gray-100 text-gray-800';
  };

  const handlePrintList = async () => {
    try {
      const response = await fetch('/templates/stock-transfer-note.html');
      let htmlTemplate = await response.text();

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlTemplate);
        printWindow.document.close();
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };
      } else {
        toast.error('Please allow popups to print list');
      }
    } catch (error) {
      console.error('Error printing list:', error);
      toast.error('Failed to load print template');
    }
  };

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Final Checking Supervisor Dashboard" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-teal-600 rounded-full" />
              <h1 className="text-sm font-bold text-gray-800">Final Checking Floor Supervisor</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {filteredOrders.length}
              </span>
              <HelpIcon
                title="Final Checking Supervisor Dashboard"
                content={
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-lg mb-2">What is this page?</h4>
                      <p className="text-gray-700">
                        Enter article-wise checked quantities: M1, M2, M3, M4. Step 7B (Repair Sub-step): review M2 items and shift to M1/M3/M4. Confirm final quality and forward to Branding.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-2">What can you do here?</h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        <li><strong>Orders:</strong> View and filter orders at Final Checking</li>
                        <li><strong>Article view:</strong> See articles by received quantity</li>
                        <li><strong>My Team:</strong> View team members and active articles</li>
                        <li><strong>Update:</strong> Modify M1–M4, repair sub-step, confirm final quality, forward to Branding</li>
                        <li><strong>Filter & Search:</strong> Use filters and search to find orders</li>
                      </ul>
                    </div>
                  </div>
                }
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 transition-colors shadow-sm"
                onClick={handlePrintList}
                title="Print List"
              >
                <i className="ri-printer-line text-xs"></i> Print List
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 transition-colors shadow-sm"
                onClick={() => void loadFloorOrdersCatalog()}
                disabled={catalogLoading}
                title="Refresh Orders"
              >
                <i className={`ri-refresh-line text-xs ${catalogLoading ? "animate-spin" : ""}`}></i> Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <div className="bg-teal-50 border border-teal-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wide">In Progress</span>
              <span className="text-sm font-bold text-teal-900">{floorCatalog.filter((o) => o.status === "In Progress").length}</span>
            </div>
            <div className="bg-green-50 border border-green-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-green-700 uppercase tracking-wide">M1 Good</span>
              <span className="text-sm font-bold text-green-900">
                {formatProductionQty(
                  floorCatalog.reduce((sum, order) => sum + order.articles.reduce((articleSum, article) => articleSum + (article.floorQuantities?.finalChecking?.m1Quantity || article.m1Quantity || 0), 0), 0)
                )}
              </span>
            </div>
            <div className="bg-yellow-50 border border-yellow-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-yellow-700 uppercase tracking-wide">M2 Repair</span>
              <span className="text-sm font-bold text-yellow-900">
                {formatProductionQty(
                  floorCatalog.reduce((sum, order) => sum + order.articles.reduce((articleSum, article) => articleSum + (article.floorQuantities?.finalChecking?.m2Quantity || article.m2Quantity || 0), 0), 0)
                )}
              </span>
            </div>
            <div className="bg-red-50 border border-red-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-red-700 uppercase tracking-wide">M3+M4</span>
              <span className="text-sm font-bold text-red-900">
                {formatProductionQty(
                  floorCatalog.reduce((sum, order) => sum + order.articles.reduce((articleSum, article) => articleSum + (article.floorQuantities?.finalChecking?.m3Quantity || article.m3Quantity || 0) + (article.floorQuantities?.finalChecking?.m4Quantity || article.m4Quantity || 0), 0), 0)
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-gray-300 mb-0">
            <div className="flex">
              <button
                type="button"
                className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${activeTab === "orders" ? "border-teal-600 text-teal-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                onClick={() => setActiveTab("orders")}
              >
                Orders
              </button>
              <button
                type="button"
                className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${activeTab === "article-view" ? "border-teal-600 text-teal-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                onClick={() => setActiveTab("article-view")}
              >
                Article view
              </button>
              <button
                type="button"
                className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${activeTab === "my-team" ? "border-teal-600 text-teal-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                onClick={() => setActiveTab("my-team")}
              >
                My Team
              </button>
              <button
                type="button"
                className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${activeTab === "upcoming" ? "border-teal-600 text-teal-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                onClick={() => setActiveTab("upcoming")}
              >
                Upcoming
              </button>
            </div>
            <label className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-gray-700 border border-gray-200 rounded bg-white cursor-pointer hover:bg-gray-50 mr-2">
              <input type="checkbox" checked={showAllArticles} onChange={(e) => {
                setShowAllArticles(e.target.checked);
                if (!e.target.checked) qrScan.clearQrPin();
              }} className="rounded border-gray-300" />
              Show all
            </label>
          </div>
        </div>

        <div className="min-h-[300px]">
          {activeTab === "my-team" ? (
            <MyTeamTab />
          ) : activeTab === "upcoming" ? (
            <UpcomingTab floorName="Final Checking" />
          ) : activeTab === "article-view" ? (
            <ArticleViewTab
              orders={articleTabOrders}
              isLoading={catalogLoading}
              onViewOrder={handleViewOrder}
              onUpdateOrder={handleUpdateOrder}
              getStatusBadge={getStatusBadge}
              getPriorityBadge={getPriorityBadge}
              activeArticleId={activeArticleId}
              onAssignClick={handleOpenAssignDrawer}
              onScanContainerClick={handleScanContainerClick}
              onScanLabelQrClick={qrScan.openDrawer}
              showAllArticles={showAllArticles}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={handleItemsPerPageChange}
              qrScanPinned={Boolean(qrScan.qrPinnedArticleOrders)}
              onClearQrScanFilter={qrScan.clearQrPin}
            />
          ) : (
            <>
          <div className="p-[10px] flex flex-wrap items-center gap-2 border-b border-gray-300">
            <button
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border transition-colors ${showFilters ? "bg-teal-600 text-white border-teal-600" : "bg-white border-gray-200 text-[#495057] hover:bg-gray-50"}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <i className="ri-filter-3-line text-xs"></i> Filters {hasActiveFilters && <span className="ml-1">●</span>}
            </button>
            {hasActiveFilters && (
              <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[11px] font-bold rounded hover:bg-gray-50" onClick={clearFilters}>
                <i className="ri-close-line text-xs"></i> Clear
              </button>
            )}
            <div className="relative flex-1 min-w-[140px] max-w-[240px]">
              <input
                type="text"
                className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-teal-300 w-full placeholder:text-gray-400 font-medium"
                placeholder="Search order, article..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
            </div>
            <select
              className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5"
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
            >
              <option value={10}>Show 10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {showFilters && (
            <div className="p-[10px] bg-gray-50 border-b border-gray-300 flex flex-wrap gap-2">
              <select className="bg-white border border-gray-300 text-[11px] rounded px-2 py-1.5" value={filters.status} onChange={(e) => handleFilterChange("status", e.target.value)}>
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
              </select>
              <select className="bg-white border border-gray-300 text-[11px] rounded px-2 py-1.5" value={filters.priority} onChange={(e) => handleFilterChange("priority", e.target.value)}>
                <option value="">All Priorities</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <select className="bg-white border border-gray-300 text-[11px] rounded px-2 py-1.5" value={filters.linkingType} onChange={(e) => handleFilterChange("linkingType", e.target.value)}>
                <option value="">All Types</option>
                <option value="Auto Linking">Auto Linking</option>
                <option value="Rosso Linking">Rosso Linking</option>
                <option value="Hand Linking">Hand Linking</option>
              </select>
              <input type="text" className="bg-white border border-gray-300 text-[11px] rounded px-2 py-1.5 w-28" placeholder="Floor..." value={filters.floor} onChange={(e) => handleFilterChange("floor", e.target.value)} />
            </div>
          )}

          {catalogLoading && floorCatalog.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-4 opacity-50"></div>
              <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading</p>
            </div>
          ) : floorCatalog.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-file-list-line text-xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">NO ORDERS FOUND</h3>
              <p className="text-[10px] text-gray-500">
                {hasActiveFilters ? "Try adjusting filters or search" : "No orders at Final Checking"}
              </p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-file-list-line text-xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">NO ORDERS WITH REMAINING QTY</h3>
              <p className="text-[10px] text-gray-500">Turn on Show all to include orders with zero remaining on Final Checking</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50/30">
                    <th className="pl-[10px] pr-1 py-2.5 w-10 border border-gray-200">
                      <input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="rounded border-gray-200 text-teal-600 focus:ring-0 h-3.5 w-3.5" />
                    </th>
                    <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Order Info</th>
                    <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Articles</th>
                    <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                    <th className="px-1.5 py-2.5 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="pl-[10px] pr-1 py-2.5 border border-gray-200">
                        <input type="checkbox" checked={selectedOrders.includes(order.id)} onChange={() => handleOrderSelect(order.id)} className="rounded border-gray-200 text-teal-600 focus:ring-0 h-3.5 w-3.5" />
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-200">
                        <div className="text-[12px] font-bold text-gray-900">{order.orderNumber || order.id}</div>
                        {order.orderNote && <span className="text-[10px] text-gray-500">({order.orderNote})</span>}
                        <div className="text-[10px] text-gray-500">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : (order.articles?.[0]?.createdAt ? new Date(order.articles[0].createdAt).toLocaleDateString() : "N/A")}</div>
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-200">
                        <div className="text-[12px] font-medium text-gray-600">{order.articles.length} Article{order.articles.length !== 1 ? "s" : ""} · Qty {order.articles.reduce((s, a) => s + (a.plannedQuantity || 0), 0).toLocaleString()}</div>
                        {order.articles.some((a) => a.floorQuantities?.finalChecking) && (
                          <div className="text-[10px] text-teal-600 mt-0.5">
                            R:{order.articles.reduce((s, a) => s + (a.floorQuantities?.finalChecking?.received || 0), 0)} Trf:{order.articles.reduce((s, a) => s + (a.floorQuantities?.finalChecking?.transferred || 0), 0)} Rem:{order.articles.reduce((s, a) => s + (a.floorQuantities?.finalChecking?.remaining ?? 0), 0)}
                          </div>
                        )}
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-200">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${getStatusBadge(order.status)}`}>{order.status}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ml-1 ${getPriorityBadge(order.priority)}`}>{order.priority}</span>
                      </td>
                      <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100">
                          <button className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-400 border border-blue-100 rounded hover:bg-blue-100" onClick={() => handleViewOrder(order)} title="View"><i className="ri-eye-line text-xs"></i></button>
                          <button className="w-7 h-7 flex items-center justify-center bg-emerald-50 text-emerald-400 border border-emerald-100 rounded hover:bg-emerald-100" onClick={() => handleUpdateOrder(order)} title="Update"><i className="ri-edit-line text-xs"></i></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredOrders.length > 0 && (
            <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200">
              <div className="text-[11px] font-medium text-[#495057]">
                Showing {ordersPageStart} to {ordersPageEnd} of {filteredOrders.length} entries
              </div>
              <div className="flex items-center gap-1" role="navigation" aria-label="Orders pagination">
                <button onClick={() => handlePageChange(safeCurrentPage - 1)} disabled={safeCurrentPage <= 1} className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30">Prev</button>
                {Array.from({ length: Math.min(orderTotalPages, 7) }, (_, i) => {
                  const pageNum = orderTotalPages <= 7 ? i + 1 : safeCurrentPage <= 4 ? i + 1 : safeCurrentPage >= orderTotalPages - 3 ? orderTotalPages - 6 + i : safeCurrentPage - 3 + i;
                  return (
                    <button key={pageNum} onClick={() => handlePageChange(pageNum)} className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded ${safeCurrentPage === pageNum ? "bg-teal-600 text-white shadow-md" : "text-gray-400 hover:bg-gray-50"}`}>{pageNum}</button>
                  );
                })}
                <button onClick={() => handlePageChange(safeCurrentPage + 1)} disabled={safeCurrentPage >= orderTotalPages} className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30">Next</button>
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </div>

      {/* Scan Container drawer */}
      {showContainerScanDrawer && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => { setShowContainerScanDrawer(false); setContainerScanned(null); setContainerScanBarcode(""); setActiveArticleId(null); }} aria-hidden />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col overflow-hidden animate-slide-in-right">
            <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-800">Scan Container</h3>
              <button type="button" onClick={() => { setShowContainerScanDrawer(false); setContainerScanned(null); setContainerScanBarcode(""); setActiveArticleId(null); }} className="text-gray-500 hover:text-gray-700 p-1">
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-[10px]">
              {!containerScanned ? (
                <div className="space-y-3">
                  <label className="block text-[11px] font-medium text-[#495057]">Container barcode</label>
                  <input
                    type="text"
                    placeholder="Scan or enter barcode"
                    value={containerScanBarcode}
                    onChange={(e) => setContainerScanBarcode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGetContainerByBarcode()}
                    className="w-full border border-gray-200 rounded pl-3 pr-3 py-1.5 text-[11px] font-medium focus:ring-0 focus:border-teal-300 placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    disabled={!containerScanBarcode.trim() || containerScanLoading}
                    onClick={handleGetContainerByBarcode}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-teal-600 text-white hover:bg-teal-700 shadow-sm w-full"
                  >
                    {containerScanLoading ? <span className="animate-spin">...</span> : "Get container"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Container details from API */}
                  <div className="p-2 bg-slate-50 rounded border border-slate-200 text-[12px] text-gray-900 space-y-1">
                    <h4 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider mb-2">Container</h4>
                    <div><span className="font-bold text-[#495057]">Name:</span> {containerScanned.container.containerName ?? containerScanned.container.barcode ?? "—"}</div>
                    <div><span className="font-bold text-[#495057]">Barcode:</span> {containerScanned.container.barcode}</div>
                    <div><span className="font-bold text-[#495057]">Status:</span> {containerScanned.container.status ?? "—"}</div>
                    <div><span className="font-bold text-[#495057]">Active floor:</span> {containerScanned.container.activeFloor ?? "—"}</div>
                  </div>
                  <h4 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider">Items</h4>
                  <div className="p-2 bg-gray-50 rounded border border-gray-200 text-[12px] text-gray-900 space-y-1">
                    {containerScanned.articles.map((item, i) => {
                      const art = item.article as Article | null;
                      const rowKey = art ? String(art._id ?? art.id ?? i) : String(i);
                      return (
                      <div key={rowKey}>
                        <span className="font-bold text-[#495057]">{art?.articleNumber ?? "—"}</span>
                        <span className="text-gray-600"> × {item.quantity}</span>
                      </div>
                      );
                    })}
                    <div className="pt-1 border-t border-gray-200 mt-1">
                      <span className="font-bold text-[#495057]">Total:</span> {containerScanned.container.quantity ?? "—"}
                    </div>
                  </div>
                  {hasActiveItems(containerScanned.container) ? (
                    <>
                      {!containerBelongsToCurrentFloor && (
                        <div className="p-2 rounded border-2 border-red-400 bg-red-50 text-[11px] text-red-800">
                          This container is assigned to <strong>{containerScanned.container.activeFloor || "unknown"}</strong>, not {CURRENT_FLOOR}. Accept Article is disabled.
                        </div>
                      )}
                      <button
                        type="button"
                        disabled={acceptArticleLoading || !containerBelongsToCurrentFloor}
                        onClick={handleAcceptArticleQuantity}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 w-full disabled:opacity-50 disabled:cursor-not-allowed mt-3"
                      >
                        {acceptArticleLoading ? "Accepting..." : "Accept Article Quantity"}
                      </button>
                    </>
                  ) : (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                      No active items in container.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Assign drawer */}
      {showAssignDrawer && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={handleCloseAssignDrawer} aria-hidden />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col overflow-hidden animate-slide-in-right">
            <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-800">Assign article to team member</h3>
              <button type="button" onClick={handleCloseAssignDrawer} className="text-gray-500 hover:text-gray-700 p-1">
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-[10px]">
              {assignTeamLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-4 opacity-50" />
                  <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading</p>
                </div>
              ) : assignTeamMembers.length === 0 ? (
                <p className="text-[11px] text-[#495057]">No team members on Final Checking floor.</p>
              ) : (
                <ul className="space-y-2">
                  {assignTeamMembers.map((member) => {
                    const hasActiveArticle = Boolean(activeArticleId && member.articleData?.some((d) => d.activeArticle === activeArticleId));
                    return (
                      <li key={member._id} className="flex items-center justify-between gap-2 p-2 border border-gray-200 rounded hover:bg-gray-50">
                        <div>
                          <span className="text-[12px] font-medium text-gray-900">{member.teamMemberName}</span>
                          <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold ${member.role === "Supervisor" ? "bg-teal-50 text-teal-700 border border-teal-100" : "bg-gray-50 text-gray-600 border border-gray-200"}`}>{member.role}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {hasActiveArticle ? (
                            <button type="button" onClick={() => handleArticleReceived(member)} disabled={removingArticleMemberId === member._id} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm disabled:opacity-50">
                              {removingArticleMemberId === member._id ? "..." : "Article received"}
                            </button>
                          ) : (
                            <button type="button" onClick={() => handleAssignToMember(member)} disabled={!activeArticleId} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-teal-600 text-white hover:bg-teal-700 shadow-sm disabled:opacity-50">Assign</button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      {/* Confirm assign modal */}
      {confirmAssignModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={() => setConfirmAssignModal(null)}>
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-[10px] border-b border-gray-200">
              <h4 className="text-sm font-bold text-gray-800">Confirm assign</h4>
            </div>
            <p className="p-[10px] text-[11px] text-[#495057]">
              Assigning this article to <strong>{confirmAssignModal.teamMemberName}</strong>?
            </p>
            <div className="flex justify-end gap-2 p-[10px] border-t border-gray-200">
              <button type="button" onClick={() => setConfirmAssignModal(null)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 shadow-sm">Cancel</button>
              <button type="button" onClick={handleConfirmAssign} disabled={assigningInProgress} className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-[11px] font-bold rounded hover:bg-teal-700 shadow-sm">
                {assigningInProgress ? "Assigning..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scan bag/container before update order – modal (opened when user clicks Update Order) */}
      {showUpdateContainerModal && selectedOrder && (() => {
        const modalArticles = selectedArticleId ? selectedOrder.articles.filter((a) => (a.id ?? a._id) === selectedArticleId) : selectedOrder.articles;
        const stagingArticles = resolveArticlesForContainerStaging(modalArticles, updateData, getTransferTotal);
        const articlesWithQty = stagingArticles.map(({ article, quantity }) => ({ article, quantity }));
        const isRestageOnly = stagingArticles.length > 0 && stagingArticles.every((s) => s.fromPendingHandoff);
        const floor = updateContainerNextFloor.trim() || resolveNextFloorFromProcesses(modalArticles[0]?.processes ?? [], "Final Checking", "Warehouse");
        return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={closeContainerStagingModal} aria-hidden>
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-sm p-[10px] flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-2">Scan bag / container</h4>
            <p className="text-[11px] text-[#495057]">
              {isRestageOnly
                ? "Transfer is already recorded but the bag is empty. Scan a container to re-stage for Dispatch accept."
                : "Scan or enter the container/bag code for final checking articles (M1 good) for transfer to next floor. Quantity comes from M1 quantity."}
            </p>
            {updateSubmitError && (
              <div
                role="alert"
                aria-live="assertive"
                className="text-[11px] text-red-800 bg-red-50 border border-red-300 rounded px-2 py-2"
              >
                <strong className="font-bold block mb-0.5">Could not save order</strong>
                {updateSubmitError}
              </div>
            )}
            {isRestageOnly && (
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                Recovery mode: staging pending handoff only (no new transfer).
              </p>
            )}
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Container barcode</label>
              <input
                type="text"
                placeholder="Scan or enter barcode"
                value={updateContainerBarcode}
                onChange={(e) => {
                  setUpdateContainerBarcode(e.target.value);
                  if (updateSubmitError) setUpdateSubmitError(null);
                }}
                className="w-full border border-gray-200 rounded px-3 py-1.5 text-[11px] focus:ring-0 focus:border-teal-300"
              />
              {updateContainerCheckStatus === "loading" && <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1"><span className="animate-spin rounded-full h-3 w-3 border-2 border-gray-400 border-t-transparent" /> Checking...</p>}
              {updateContainerCheckStatus === "not-found" && <p className="text-[11px] text-red-600 mt-1">Container not found.</p>}
              {updateContainerCheckStatus === "already-filled" && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mt-1">
                  This container is not empty. It is assigned to <strong>{updateContainerFetched?.activeFloor ?? "unknown"}</strong>
                  {updateContainerFetched?.activeItems?.length ? ` with ${updateContainerFetched.activeItems.length} item(s)` : ""}. Use another container.
                </p>
              )}
              {updateContainerCheckStatus === "ok" && (
                <p className="text-[11px] text-green-600 mt-1">
                  {updateContainerFetched?.activeItems?.length
                    ? (() => {
                        const retryRows = stagingArticles
                          .map(({ article, quantity }) => ({
                            article: article._id ?? article.id ?? "",
                            quantity,
                          }))
                          .filter((r): r is { article: string; quantity: number } => !!r.article);
                        const retryReady = isContainerAlreadyStagedForArticles(
                          updateContainerFetched.activeItems as ContainerActiveItem[] | undefined,
                          retryRows,
                        );
                        return retryReady
                          ? "Container already staged. Click to complete."
                          : `Container has items for ${updateContainerFetched.activeFloor ?? "this floor"}. You can add a different article.`;
                      })()
                    : "Container available."}
                </p>
              )}
              {updateContainerCheckStatus === "duplicate-article" && (
                <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5 mt-1">
                  One or more articles in this transfer are already in the container. Use another container or clear it first.
                </p>
              )}
            </div>
            {articlesWithQty.length > 0 && (
              <div className={updateContainerCheckStatus !== "ok" ? "opacity-60 pointer-events-none" : ""}>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Articles (transfer qty)</label>
                <div className="p-2 bg-gray-50 rounded border border-gray-200 text-[11px] space-y-1">
                  {articlesWithQty.map(({ article, quantity }) => (
                    <div key={article.id ?? article._id}>{article.articleNumber ?? article.id ?? article._id}: {quantity}</div>
                  ))}
                </div>
              </div>
            )}
            <div className={updateContainerCheckStatus !== "ok" ? "opacity-60 pointer-events-none" : ""}>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Next floor (from article process)</label>
              <input type="text" readOnly value={floor || "—"} className="w-full border border-gray-200 rounded px-3 py-1.5 text-[11px] bg-gray-100 text-gray-700 cursor-not-allowed" />
              <p className="text-[10px] text-gray-500 mt-0.5">Set automatically from article process flow</p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={closeContainerStagingModal} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50">Cancel</button>
              <button
                type="button"
                disabled={updateContainerCheckStatus !== "ok" || !updateContainerBarcode.trim() || articlesWithQty.length === 0 || !floor || updateContainerSubmitting}
                onClick={async () => {
                  const barcode = updateContainerBarcode.trim();
                  if (!barcode || !floor) return;
                  const newRows = articlesWithQty
                    .map(({ article, quantity }) => ({ article: article._id ?? article.id ?? "", quantity }))
                    .filter((i) => i.article);
                  if (newRows.some((i) => !i.article)) { toast.error("Invalid article id"); return; }
                  setUpdateContainerSubmitting(true);
                  setUpdateSubmitError(null);
                  let orderSubmitAttempted = isRestageOnly;
                  let submitSnapshots: FinalCheckingSubmitSnapshot[] = [];
                  try {
                    const containerNow = await containersMasterService.getByBarcode(barcode);
                    const existingItems = containerNow.activeItems as ContainerActiveItem[] | undefined;
                    setUpdateContainerFetched({
                      activeItems: containerNow.activeItems,
                      activeFloor: containerNow.activeFloor,
                    });
                    const containerReplace =
                      isRestageOnly || !(existingItems?.length);
                    const staged = buildStagedActiveItemsPayload(existingItems, newRows, {
                      replace: containerReplace,
                    });
                    const alreadyStaged = isContainerAlreadyStagedForArticles(existingItems, newRows);
                    if (!staged.ok && !alreadyStaged) {
                      if (staged.reason === 'duplicate-article') {
                        reportSubmitError("Article already in this container with different qty. Clear the container or use another.");
                      } else {
                        reportSubmitError("Invalid container items");
                      }
                      return;
                    }
                    const activeFloorNorm = (containerNow.activeFloor ?? "").trim().toLowerCase();
                    const skipContainerPatch =
                      alreadyStaged && activeFloorNorm === floor.trim().toLowerCase();

                    if (!isRestageOnly) {
                      orderSubmitAttempted = true;
                      submitSnapshots = await handleUpdateSubmit({
                        closeDrawer: false,
                        articles: modalArticles,
                      });
                    }

                    if (!skipContainerPatch) {
                      if (!staged.ok || !staged.activeItems) {
                        reportSubmitError("Invalid container items");
                        if (submitSnapshots.length > 0) {
                          await revertSubmitSnapshots(submitSnapshots);
                        }
                        return;
                      }
                      await containersMasterService.updateByBarcode(barcode, {
                        activeFloor: floor,
                        activeItems: staged.activeItems,
                      });
                    }

                    closeContainerStagingModal();
                    closeUpdateModal();
                    toast.success(
                      isRestageOnly
                        ? "Container staged for Dispatch — scan same barcode on Dispatch and accept"
                        : "Order updated and container staged"
                    );
                  } catch (err) {
                    const msg = getProductionSubmitErrorMessage(err);
                    if (submitSnapshots.length > 0) {
                      try {
                        await revertSubmitSnapshots(submitSnapshots);
                        if (orderSubmitAttempted && !isRestageOnly) {
                          reportSubmitError(
                            "Transfer rolled back — container could not be staged. Fix the issue and retry."
                          );
                        }
                      } catch (revertErr) {
                        reportSubmitError(
                          getProductionSubmitErrorMessage(revertErr) ||
                            "Transfer recorded but rollback failed — contact support"
                        );
                      }
                    } else if (!orderSubmitAttempted) {
                      reportSubmitError(msg.includes("404") ? "Container not found" : msg || "Failed to load container");
                    }
                    void loadFloorOrdersCatalog();
                  } finally {
                    setUpdateContainerSubmitting(false);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-[11px] font-bold rounded hover:bg-teal-700 disabled:opacity-50"
              >
                {updateContainerSubmitting ? <span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" /> : <i className="ri-save-line text-xs" />}
                {isRestageOnly ? "Stage container" : "Update & submit order"}
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Update Order – drawer, clear sections & user guidance */}
      {showUpdateModal && selectedOrder && (() => {
        const modalArticles = selectedArticleId ? selectedOrder.articles.filter((a) => (a.id ?? a._id) === selectedArticleId) : selectedOrder.articles;
        return (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeUpdateModal} aria-hidden />
          <div className="fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-xl z-50 flex flex-col overflow-hidden animate-slide-in-right border-l-2 border-gray-300">
            <div className="flex items-center justify-between gap-3 px-3 py-2 border-b-2 border-gray-300 bg-gray-50 flex-shrink-0">
              <h3 className="text-sm font-bold text-gray-800 truncate min-w-0">
                Update Order — {selectedOrder.orderNumber}
                {updateDrawerLoading ? <span className="ml-2 text-[10px] font-normal text-gray-500">Refreshing…</span> : null}
              </h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button type="button" onClick={closeUpdateModal} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-gray-300 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-100 shadow-sm">Cancel</button>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedOrder) return;
                    const invalid = modalArticles.some((article) => {
                      const articleId = article.id || article._id;
                      if (!articleId) return false;
                      const update = updateData[articleId];
                      if (!update) return false;
                      const maxTransfer = getMaxTransferForArticle(article, articleId);
                      const total = getTransferTotal(update.transferItems ?? []);
                      if (total > maxTransfer) return true;
                      return hasTransferItemsExceedingBrandMax(article, update.transferItems ?? []);
                    });
                    if (invalid) {
                      toast.error("Cannot submit: Some articles have transfer quantity exceeding remaining or received per brand");
                      return;
                    }
                    const hasTransferButNoReceived = modalArticles.some(article => {
                      const aid = article.id || article._id;
                      const total = getTransferTotal(updateData[aid]?.transferItems ?? []);
                      const received = article.floorQuantities?.finalChecking?.received ?? 0;
                      return total > 0 && received <= 0;
                    });
                    if (hasTransferButNoReceived) {
                      toast.error("Transfer requires received work. Accept the container first (scan container → Accept Article Quantity).");
                      return;
                    }
                    const hasAnyM1 = modalArticles.some(article => {
                      const articleId = article.id || article._id;
                      const total = getTransferTotal(updateData[articleId]?.transferItems ?? []);
                      return articleId && total > 0;
                    });
                    const hasPendingHandoff = hasPendingContainerHandoff(modalArticles);
                    if (!hasAnyM1 && !hasPendingHandoff) {
                      requestQualityConfirm(() => { void handleUpdateSubmit({ articles: modalArticles }); }, modalArticles);
                      return;
                    }
                    const stagingForModal = resolveArticlesForContainerStaging(
                      modalArticles,
                      updateData,
                      getTransferTotal
                    );
                    setUpdateContainerRestageOnly(
                      stagingForModal.length > 0 && stagingForModal.every((s) => s.fromPendingHandoff)
                    );
                    setUpdateContainerBarcode("");
                    setUpdateContainerCheckStatus("idle");
                    setUpdateContainerFetched(null);
                    setUpdateSubmitError(null);
                    const firstWithQty = stagingForModal[0]?.article ?? modalArticles.find((a) => {
                      const id = a.id ?? a._id;
                      return id && getTransferTotal(updateData[id]?.transferItems ?? []) > 0;
                    });
                    if (firstWithQty) {
                      const firstId = (firstWithQty as Article).id ?? (firstWithQty as Article)._id ?? "";
                      setUpdateContainerArticleId(firstId);
                      setUpdateContainerNextFloor(
                        resolveNextFloorFromProcesses(
                          (firstWithQty as Article).processes ?? [],
                          "Final Checking",
                          "Warehouse"
                        )
                      );
                    }
                    setShowUpdateContainerModal(true);
                  }}
                  disabled={modalArticles.some((article) => {
                    const articleId = article.id || article._id;
                    if (!articleId) return false;
                    const update = updateData[articleId];
                    if (!update) return false;
                    const maxTransfer = getMaxTransferForArticle(article, articleId);
                    const total = getTransferTotal(update.transferItems ?? []);
                    if (total > maxTransfer) return true;
                    return hasTransferItemsExceedingBrandMax(article, update.transferItems ?? []);
                  })}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-[11px] font-bold rounded hover:bg-teal-700 shadow-sm disabled:opacity-50"
                >
                  <i className="ri-save-line text-xs"></i> Update Order
                </button>
                <button type="button" onClick={closeUpdateModal} className="text-gray-500 hover:text-gray-800 p-1 rounded border-2 border-gray-300 hover:bg-gray-100" aria-label="Close drawer">
                  <i className="ri-close-line text-lg"></i>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pt-3 pb-24">
            {updateSubmitError && (
              <div
                role="alert"
                aria-live="assertive"
                className="mb-4 px-3 py-2 rounded-md bg-red-50 border-2 border-red-300 text-[11px] text-red-900"
              >
                <strong className="font-bold block mb-0.5">Update failed</strong>
                {updateSubmitError}
              </div>
            )}
            {/* Short intro so user knows what to do */}
            <div className="mb-4 px-3 py-2 rounded-md bg-teal-50 border-2 border-teal-200 text-[11px] text-teal-900">
              <strong>How to update:</strong> Enter M1 (good → next floor), M2/M3/M4 for this save. M2 creates entries in <strong>M2 Management</strong>. Resolve repairs there (cascade merge to all floors).
            </div>
            {hasPendingContainerHandoff(modalArticles) && (
              <div className="mb-4 px-3 py-2 rounded-md bg-orange-50 border-2 border-orange-200 text-[11px] text-orange-900">
                <strong>Container missing:</strong> Transfer is recorded but the bag is empty for Dispatch.
                Click <strong>Update Order</strong> to re-stage the container (recovery mode — no new transfer).
                {modalArticles
                  .map((a) => {
                    const pending = getPendingContainerHandoffQty(a);
                    return pending > 0 ? `${a.articleNumber ?? "Article"}: ${pending} pending` : null;
                  })
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            )}
            {modalArticles.some((a) => (a.floorQuantities?.finalChecking?.received ?? 0) <= 0) && (
              <div className="mb-4 px-3 py-2 rounded-md bg-amber-50 border-2 border-amber-200 text-[11px] text-amber-900">
                <strong>Accept before transfer:</strong> To transfer M1 to Warehouse, you must first accept the container (Scan Container → Accept Article Quantity). Transfer is disabled until <code>received</code> &gt; 0.
              </div>
            )}
            <section className="mb-4 rounded-md border-2 border-gray-300 bg-gray-50 overflow-hidden">
              <div className="px-3 py-1.5 bg-gray-200 border-b-2 border-gray-300 text-[11px] font-bold text-gray-800 uppercase">1. Order info</div>
              <div className="grid grid-cols-2 gap-3 p-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Priority</label>
                  <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium border-2 border-gray-300 ${getPriorityBadge(selectedOrder.priority)}`}>{selectedOrder.priority}</span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Status</label>
                  <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium border-2 border-gray-300 ${getStatusBadge(selectedOrder.status)}`}>{selectedOrder.status}</span>
                </div>
              </div>
            </section>
            <section className="mb-4 rounded-md border-2 border-gray-300 overflow-hidden">
              <div className="px-3 py-1.5 bg-gray-200 border-b-2 border-gray-300 text-[11px] font-bold text-gray-800 uppercase">2. Choose article to update</div>
              <div className="p-2 flex gap-1.5 flex-wrap">
                {modalArticles.map((article, idx) => (
                  <button
                    key={article.id}
                    type="button"
                    className={`px-3 py-1.5 text-[11px] font-bold rounded border-2 ${
                      idx === activeUpdateTabIndex ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-700 border-gray-300 hover:border-teal-400"
                    }`}
                    onClick={() => { setActiveUpdateTabIndex(idx); setShowLogs(false); }}
                    title={article.articleNumber}
                  >
                    {article.articleNumber || `Art ${idx + 1}`}
                  </button>
                ))}
              </div>
            </section>
              {(() => {
                const article = modalArticles[activeUpdateTabIndex];
                if (!article) return null;
                const articleId = article.id || article._id;
                if (!articleId) return null;
                const fc = article.floorQuantities?.finalChecking;
                const cumulative = getCumulativeQty(article, 'finalChecking');
                const currentUpdateData = updateData[articleId] || {
                  remarks: article.remarks || "",
                  m1Quantity: 0,
                  m2Quantity: cumulative.m2,
                  m3Quantity: cumulative.m3,
                  m4Quantity: cumulative.m4,
                  repairStatus: (fc?.repairStatus || (article as Article & { repairStatus?: string }).repairStatus || "Not Required") as "Not Required" | "In Review" | "Repaired" | "Rejected",
                  repairRemarks: fc?.repairRemarks || (article as Article & { repairRemarks?: string }).repairRemarks || "",
                  transferItems: [{ transferred: 0 }],
                };
                const saveDeltas = {
                  m1: getTransferTotal(currentUpdateData.transferItems ?? []),
                  m2: transferM2M3M4[articleId]?.m2 ?? 0,
                  m3: transferM2M3M4[articleId]?.m3 ?? 0,
                  m4: transferM2M3M4[articleId]?.m4 ?? 0,
                };
                const maxTransfer = getMaxM1ForSave(cumulative, saveDeltas);
                const availableAfterSave = getRemainingAfterSave(cumulative, saveDeltas);
                return (
                  <>
            <QcM2MergeHistoryPanel
              articleId={articleId}
              floorLabel="Final Checking"
              compact
            />
            <section className="mb-4 rounded-md border-2 border-gray-300 overflow-hidden">
              <div className="px-3 py-1.5 bg-gray-200 border-b-2 border-gray-300 text-[11px] font-bold text-gray-800 uppercase">3. Current quantities for this article</div>
              <p className="px-3 py-1 text-[10px] text-gray-500 bg-gray-50 border-b border-gray-200"><span className="font-semibold text-gray-700">Article: {article.articleNumber}</span> — Remaining = qty still available to assign (M1 transfer or M2/M3/M4).</p>
              <div className="p-2">
                <table className="w-full border-collapse text-[11px] border-2 border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border-2 border-gray-300 px-2 py-1 text-left font-bold text-gray-700">Planned</th>
                      <th className="border-2 border-gray-300 px-2 py-1 text-left font-bold text-gray-700">Received</th>
                      <th className="border-2 border-gray-300 px-2 py-1 text-left font-bold text-gray-700">M1 Trf</th>
                      <th className="border-2 border-gray-300 px-2 py-1 text-left font-bold text-gray-700">M2</th>
                      <th className="border-2 border-gray-300 px-2 py-1 text-left font-bold text-gray-700">M3</th>
                      <th className="border-2 border-gray-300 px-2 py-1 text-left font-bold text-gray-700">M4</th>
                      <th className="border-2 border-gray-300 px-2 py-1 text-left font-bold text-gray-700">Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border-2 border-gray-300 px-2 py-1">{(article.plannedQuantity || 0).toLocaleString()}</td>
                      <td className="border-2 border-gray-300 px-2 py-1"><ReceivedQuantityDisplay received={fc?.received || 0} repairReceived={fc?.repairReceived} repairFromFloor={fc?.repairFromFloor} className="text-[11px]" /></td>
                      <td className="border-2 border-gray-300 px-2 py-1 text-green-700 font-medium">{formatProductionQty(cumulative.m1Transferred)}</td>
                      <td className="border-2 border-gray-300 px-2 py-1 text-yellow-700 font-medium">{formatProductionQty(cumulative.m2)}</td>
                      <td className="border-2 border-gray-300 px-2 py-1 text-orange-700 font-medium">{formatProductionQty(cumulative.m3)}</td>
                      <td className="border-2 border-gray-300 px-2 py-1 text-red-700 font-medium">{formatProductionQty(cumulative.m4)}</td>
                      <td className="border-2 border-gray-300 px-2 py-1 text-orange-700 font-medium">{formatProductionQty(cumulative.remaining)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {(fc?.receivedData as Array<{ transferred?: number }>)?.some((d) => (d.transferred ?? 0) > 0) && (
                <div className="px-3 py-2 border-t border-gray-200 bg-sky-50/50">
                  <label className="block text-[10px] font-bold text-sky-800 mb-1">Received breakdown (Qty · Brand)</label>
                  <div className="space-y-0.5 text-[11px] text-gray-700">
                    {collapseLinesByBrand((fc?.receivedData as Array<{ transferred?: number; brand?: string }>)?.filter((d) => (d.transferred ?? 0) > 0)).map((d, i) => (
                      <div key={i}>{formatBrandLine(d)}</div>
                    ))}
                  </div>
                </div>
              )}
              <p className="px-3 py-1 text-[10px] text-gray-600 bg-amber-50 border-t border-gray-200">
                Max M1 this save = <strong>{formatProductionQty(maxTransfer)}</strong>
                {saveDeltas.m1 + saveDeltas.m2 + saveDeltas.m3 + saveDeltas.m4 > 0 ? (
                  <> · Available after this save = <strong>{formatProductionQty(availableAfterSave)}</strong></>
                ) : null}
              </p>
            </section>
            <section className="mb-4 rounded-md border-2 border-green-300 overflow-hidden">
              <div className="px-3 py-1.5 bg-green-100 border-b-2 border-green-300 text-[11px] font-bold text-green-900">4. Good quality (M1) — transfer to next floor (Qty · Brand)</div>
              {(fc?.transferredData as Array<{ transferred?: number; brand?: string }>)?.length > 0 && (
                <div className="px-3 py-2 border-b border-gray-200 bg-gray-50/50">
                  <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wide mb-1">Previously transferred</label>
                  <div className="space-y-0.5 text-[11px] text-gray-700">
                    {collapseLinesByBrand(fc?.transferredData as Array<{ transferred?: number; brand?: string }>).map((d, i) => (
                      <div key={i}>{formatBrandLine(d)}</div>
                    ))}
                  </div>
                </div>
              )}
              <p className="px-3 py-1 text-[10px] text-gray-600 bg-green-50/50 border-b border-green-200">Enter <strong>new</strong> transfer below. Max = remaining minus M2/M3/M4 entered below.</p>
              <div className="p-2 border-t-2 border-green-200 bg-green-50/30">
                {(() => {
                  const isFullyTransferred = maxTransfer <= 0 && cumulative.remaining <= 0;
                  return (
                    <>
                      {(() => {
                        const { options, brandMaxQuantities } = getArticleBrandTransferOptions(article);
                        const noReceived = options.length === 0;
                        return (
                          <BrandTransferItemsInput
                            value={currentUpdateData.transferItems ?? [{ transferred: 0, styleCode: "", brand: "" }]}
                            onChange={(items) => handleTransferItemsChange(articleId, items)}
                            maxTotal={maxTransfer}
                            disabled={isFullyTransferred || noReceived}
                            brandOptions={options}
                            brandMaxQuantities={noReceived ? undefined : brandMaxQuantities}
                            placeholder={noReceived ? "No received breakdown — accept article first" : "Add new transfer lines (max: remaining)"}
                          />
                        );
                      })()}
                      {isFullyTransferred && (
                        <div className="text-[10px] text-green-600 mt-1 font-medium">✓ No quantity left to transfer</div>
                      )}
                    </>
                  );
                })()}
              </div>
            </section>
            <section className="mb-4 rounded-md border-2 border-gray-400 overflow-hidden">
              <div className="px-3 py-1.5 bg-gray-300 border-b-2 border-gray-400 text-[11px] font-bold text-gray-900">5. Quality categories — how many in each?</div>
              <p className="px-3 py-1.5 text-[10px] text-gray-600 bg-gray-50 border-b-2 border-gray-300">M2 = Repair (M2 Management). M3/M4 = defects. Enter quantities for this save only.</p>
              <div className="p-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="border-2 border-yellow-400 rounded p-2 bg-yellow-50/50">
                  <label className="block text-[10px] font-bold text-yellow-800 mb-0.5">M2 Repair</label>
                  <p className="text-[9px] text-yellow-800 mb-1">On floor: {formatProductionQty(cumulative.m2)} · saves to M2 Management</p>
                  <p className="text-[9px] text-yellow-700 mb-1">This save:</p>
                  <NumericInput className="py-1.5 px-2 text-[12px] w-full border-2 border-yellow-300 rounded" value={transferM2M3M4[articleId]?.m2 ?? 0} onChange={(v) => handleTransferM2M3M4Change(articleId, 'm2', v)} allowDecimals placeholder="0" />
                  <p className="text-[9px] text-yellow-900 mt-1 font-medium">After save: {formatProductionQty(cumulative.m2 + (transferM2M3M4[articleId]?.m2 ?? 0))}</p>
                </div>
                <div className="border-2 border-orange-300 rounded p-2 bg-orange-50/50">
                  <label className="block text-[10px] font-bold text-orange-800 mb-0.5">M3 Minor</label>
                  <p className="text-[9px] text-orange-800 mb-1">On floor: {formatProductionQty(cumulative.m3)}</p>
                  <p className="text-[9px] text-orange-700 mb-1">This save:</p>
                  <NumericInput className="py-1.5 px-2 text-[12px] w-full border-2 border-orange-200 rounded" value={transferM2M3M4[articleId]?.m3 ?? 0} onChange={(v) => handleTransferM2M3M4Change(articleId, 'm3', v)} allowDecimals placeholder="0" />
                  <p className="text-[9px] text-orange-900 mt-1 font-medium">After save: {formatProductionQty(cumulative.m3 + (transferM2M3M4[articleId]?.m3 ?? 0))}</p>
                </div>
                <div className="border-2 border-red-300 rounded p-2 bg-red-50/50">
                  <label className="block text-[10px] font-bold text-red-800 mb-0.5">M4 Major</label>
                  <p className="text-[9px] text-red-800 mb-1">On floor: {formatProductionQty(cumulative.m4)}</p>
                  <p className="text-[9px] text-red-700 mb-1">This save:</p>
                  <NumericInput className="py-1.5 px-2 text-[12px] w-full border-2 border-red-200 rounded" value={transferM2M3M4[articleId]?.m4 ?? 0} onChange={(v) => handleTransferM2M3M4Change(articleId, 'm4', v)} allowDecimals placeholder="0" />
                  <p className="text-[9px] text-red-900 mt-1 font-medium">After save: {formatProductionQty(cumulative.m4 + (transferM2M3M4[articleId]?.m4 ?? 0))}</p>
                </div>
              </div>
            </section>

            <section className="mb-4 rounded-md border-2 border-gray-300 overflow-hidden">
              <div className="px-3 py-1.5 bg-gray-200 border-b-2 border-gray-300 text-[11px] font-bold text-gray-800">6. Summary — then click Update Order</div>
              <p className="px-3 py-1 text-[10px] text-gray-500 bg-gray-50 border-b border-gray-200">Totals on floor vs this save. M2 → M2 Management ledger.</p>
              <div className="p-2">
                <p className="text-[10px] font-bold text-gray-700 mb-1">Totals on floor</p>
                <div className="grid grid-cols-4 gap-2 text-center mb-3">
                  <div className="border-2 border-green-300 rounded py-1.5 bg-green-50 text-[10px] font-bold text-green-800">M1 trf: {formatProductionQty(cumulative.m1Transferred)}</div>
                  <div className="border-2 border-yellow-300 rounded py-1.5 bg-yellow-50 text-[10px] font-bold text-yellow-800">M2: {formatProductionQty(cumulative.m2)}</div>
                  <div className="border-2 border-orange-300 rounded py-1.5 bg-orange-50 text-[10px] font-bold text-orange-800">M3: {formatProductionQty(cumulative.m3)}</div>
                  <div className="border-2 border-red-300 rounded py-1.5 bg-red-50 text-[10px] font-bold text-red-800">M4: {formatProductionQty(cumulative.m4)}</div>
                </div>
                <p className="text-[10px] font-bold text-gray-700 mb-1">This save</p>
                <div className="grid grid-cols-4 gap-2 text-center mb-2">
                  <div className="border-2 border-green-200 rounded py-1.5 bg-green-50/50 text-[10px] font-bold text-green-800">M1: {formatProductionQty(saveDeltas.m1)}</div>
                  <div className="border-2 border-yellow-200 rounded py-1.5 bg-yellow-50/50 text-[10px] font-bold text-yellow-800">M2: {formatProductionQty(saveDeltas.m2)}</div>
                  <div className="border-2 border-orange-200 rounded py-1.5 bg-orange-50/50 text-[10px] font-bold text-orange-800">M3: {formatProductionQty(saveDeltas.m3)}</div>
                  <div className="border-2 border-red-200 rounded py-1.5 bg-red-50/50 text-[10px] font-bold text-red-800">M4: {formatProductionQty(saveDeltas.m4)}</div>
                </div>
                <div className="text-center text-[11px] text-gray-700 border-t-2 border-gray-200 pt-1.5 font-medium">
                  Available for M1 after save: {formatProductionQty(availableAfterSave)}
                </div>
                <div className="mt-2">
                  <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Remarks</label>
                  <textarea className="w-full py-1.5 px-2 text-[11px] border-2 border-gray-300 rounded resize-none" rows={2} placeholder="Remarks for this article..." value={currentUpdateData.remarks} onChange={(e) => handleRemarksChange(articleId, e.target.value)} />
                </div>
              </div>
            </section>
            <div className="h-20 shrink-0" aria-hidden="true" />
                  </>
                );
              })()}
            </div>
          </div>
        </>
        );
      })()}

      {/* View Order Modal */}
      {showViewModal && selectedOrder && (() => {
        const modalArticles = selectedArticleId ? selectedOrder.articles.filter((a) => (a.id ?? a._id) === selectedArticleId) : selectedOrder.articles;
        return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">View Order - {selectedOrder.orderNumber}</h3>
              <button
                onClick={closeViewModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            {/* Order Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-600">Priority</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(selectedOrder.priority)}`}>
                    {selectedOrder.priority}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(selectedOrder.status)}`}>
                    {selectedOrder.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Articles View with Tabs */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-medium text-gray-900">Article Details</h4>
                <button
                  onClick={() => setShowLogsSection(!showLogsSection)}
                  className={`ti-btn ti-btn-sm min-w-[120px] ${showLogsSection ? 'ti-btn-primary' : 'ti-btn-secondary'}`}
                >
                  <i className="ri-file-list-line me-2"></i>
                  {showLogsSection ? 'Hide Logs' : 'Logs'}
                </button>
              </div>

              {/* Article Tabs */}
              <div className="mb-4">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {modalArticles.map((article, idx) => (
                    <button
                      key={article.id}
                      className={`px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap focus:outline-none ${
                        idx === activeViewTabIndex ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                      onClick={() => {
                        setActiveViewTabIndex(idx);
                      }}
                      title={article.articleNumber}
                    >
                      {article.articleNumber || `Article ${idx + 1}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Article Details */}
              {(() => {
                const article = modalArticles[activeViewTabIndex];
                if (!article) return null;
                
                return (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h5 className="text-md font-medium text-gray-900">{article.articleNumber || 'Unknown Article'}</h5>
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Linking Type:</span> {article.linkingType || 'Not specified'}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(article.priority)}`}>
                          {article.priority || 'Unknown'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="form-label">Planned Quantity</label>
                        <div className="text-lg font-semibold text-gray-900">{(article.plannedQuantity || 0).toLocaleString()}</div>
                      </div>
                      <div>
                        <label className="form-label">Received from Branding</label>
                        <ReceivedQuantityDisplay
                          received={article.floorQuantities?.finalChecking?.received || 0}
                          repairReceived={article.floorQuantities?.finalChecking?.repairReceived}
                          repairFromFloor={article.floorQuantities?.finalChecking?.repairFromFloor}
                          className="text-lg"
                        />
                      </div>
                      <div>
                        <label className="form-label">Final Checking Completed Quantity (M1 - Good Quality)</label>
                        <div className="text-lg font-semibold text-green-600">
                          {article.floorQuantities?.finalChecking?.m1Quantity || article.m1Quantity || 0}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Only M1 items pass to warehouse
                        </div>
                      </div>
                    </div>

                    {(article.floorQuantities?.finalChecking as any)?.receivedData?.some((d: any) => (d.transferred ?? 0) > 0) && (
                      <div className="mb-4 p-3 bg-sky-50 rounded-lg border border-sky-200">
                        <label className="form-label text-sky-800 font-semibold">Received breakdown (Style / Brand)</label>
                        <div className="mt-2 space-y-1 text-sm text-gray-700">
                          {collapseLinesByBrand((article.floorQuantities?.finalChecking as any).receivedData).map((d, i) => (
                            <div key={i}>{formatBrandLine(d)}</div>
                          ))}
                        </div>
                      </div>
                    )}
                    {(article.floorQuantities?.finalChecking as any)?.transferredData?.length > 0 && (
                      <div className="mb-4 p-3 bg-teal-50 rounded-lg border border-teal-200">
                        <label className="form-label text-teal-800 font-semibold">Transferred breakdown (Brand)</label>
                        <div className="mt-2 space-y-1 text-sm text-gray-700">
                          {collapseLinesByBrand((article.floorQuantities?.finalChecking as any).transferredData).map((d, i) => (
                            <div key={i}>{formatBrandLine(d)}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="form-label">M1 Transferred</label>
                        <div className="text-lg font-semibold text-purple-600">
                          {formatProductionQty(
                            article.floorQuantities?.finalChecking?.m1Transferred ??
                              article.floorQuantities?.finalChecking?.transferred ??
                              0
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="form-label">M1 Remaining</label>
                        <div className="text-lg font-semibold text-blue-600">
                          {formatProductionQty(
                            Math.max(
                              0,
                              (article.floorQuantities?.finalChecking?.m1Quantity ?? article.m1Quantity ?? 0) -
                                (article.floorQuantities?.finalChecking?.m1Transferred ??
                                  article.floorQuantities?.finalChecking?.transferred ??
                                  0)
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    <QcM2MergeHistoryPanel
                      articleId={article.id || article._id}
                      floorLabel="Final Checking"
                    />

                    {/* Quality Check Results */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className="form-label">M1 (Good Quality)</label>
                        <div className="text-lg font-semibold text-green-600">{article.floorQuantities?.finalChecking?.m1Quantity || article.m1Quantity || 0}</div>
                      </div>
                      <div>
                        <label className="form-label">M2 (Needs Repair)</label>
                        <div className="text-lg font-semibold text-yellow-600">{article.floorQuantities?.finalChecking?.m2Quantity || article.m2Quantity || 0}</div>
                      </div>
                      <div>
                        <label className="form-label">M3 (Minor Defects)</label>
                        <div className="text-lg font-semibold text-orange-600">{article.floorQuantities?.finalChecking?.m3Quantity || article.m3Quantity || 0}</div>
                      </div>
                      <div>
                        <label className="form-label">M4 (Major Defects)</label>
                        <div className="text-lg font-semibold text-red-600">{article.floorQuantities?.finalChecking?.m4Quantity || article.m4Quantity || 0}</div>
                      </div>
                    </div>

                    {article.finalQualityConfirmed && (
                      <div className="mb-4">
                        <label className="form-label">Final Quality Status</label>
                        <div className="p-3 bg-green-50 rounded-md text-sm text-green-700">
                          ✓ Quality Confirmed
                        </div>
                      </div>
                    )}

                    {((article as any).floorQuantities?.finalChecking?.repairStatus || (article as any).repairStatus) && ((article as any).floorQuantities?.finalChecking?.repairStatus || (article as any).repairStatus) !== 'Not Required' && (
                      <div className="mb-4">
                        <label className="form-label">Repair Status</label>
                        <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                          {(article as any).floorQuantities?.finalChecking?.repairStatus || (article as any).repairStatus}
                        </div>
                      </div>
                    )}

                    {((article as any).floorQuantities?.finalChecking?.repairRemarks || (article as any).repairRemarks) && (
                      <div className="mb-4">
                        <label className="form-label">Repair Remarks</label>
                        <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                          {(article as any).floorQuantities?.finalChecking?.repairRemarks || (article as any).repairRemarks}
                        </div>
                      </div>
                    )}

                    {article.remarks && (
                      <div className="mb-4">
                        <label className="form-label">Remarks</label>
                        <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                          {article.remarks}
                        </div>
                      </div>
                    )}

                    {article.floorQuantities?.knitting?.m4Quantity && article.floorQuantities.knitting.m4Quantity > 0 && (
                      <div className="text-xs text-red-600 mt-1">
                        M4 Quantity In Knitting: {article.floorQuantities.knitting.m4Quantity}
                      </div>
                    )}

                    <div className="flex justify-between items-center text-sm text-gray-600">
                      <div>
                        Remaining: {(article.floorQuantities?.finalChecking?.remaining || 0).toLocaleString()}
                      </div>
                      <div>
                        Progress: {Math.round(((article.floorQuantities?.finalChecking?.m1Quantity || article.m1Quantity || 0) / (article.floorQuantities?.finalChecking?.received || 1)) * 100)}%
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Logs Section */}
              {showLogsSection && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h5 className="text-md font-medium text-gray-900">
                      Article Logs {articleLogs.length > 0 && `(${articleLogs.length} found)`}
                    </h5>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Select Article:</label>
                      <select
                        className="form-select form-select-sm w-48"
                        value={selectedLogArticleId}
                        onChange={(e) => handleLogsArticleSelect(e.target.value)}
                      >
                        <option value="">Choose an article...</option>
                        {modalArticles.map((article) => {
                          const articleId = article._id || article.id;
                          const receivedQty = article.floorQuantities?.finalChecking?.received || 0;
                          return (
                            <option key={articleId} value={articleId}>
                              {article.articleNumber || `Article ${articleId}`} (R:{receivedQty})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  {logsLoading ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-gray-600 text-sm">Loading logs...</p>
                      </div>
                    </div>
                  ) : selectedLogArticleId && articleLogs.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {articleLogs.map((log, index) => (
                        <div key={log._id || log.id || index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                log.action === 'Quality Inspection' ? 'bg-yellow-100 text-yellow-800' :
                                log.action === 'Transferred to Final Checking' ? 'bg-purple-100 text-purple-800' :
                                log.action === 'Transferred to Washing' ? 'bg-blue-100 text-blue-800' :
                                log.action === 'M1 Quantity Updated' ? 'bg-green-100 text-green-800' :
                                log.action === 'M2 Quantity Updated' ? 'bg-orange-100 text-orange-800' :
                                log.action === 'M3 Quantity Updated' ? 'bg-red-100 text-red-800' :
                                log.action === 'M4 Quantity Updated' ? 'bg-red-100 text-red-800' :
                                log.action === MERGE_CASCADE_ACTION ? 'bg-yellow-100 text-yellow-900' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {log.action || 'ACTION'}
                              </span>
                              {log.fromFloor && log.toFloor && (
                                <span className="text-sm text-gray-600">
                                  {log.fromFloor} → {log.toFloor}
                                </span>
                              )}
                              {log.quantity && log.quantity > 0 && (
                                <span className="text-sm text-gray-600">
                                  Qty: {log.quantity}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              {log.timestamp ? new Date(log.timestamp).toLocaleString() : 
                               log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Unknown time'}
                            </span>
                          </div>
                          
                          {log.remarks && (
                            <div className="text-sm text-gray-700 mb-2">
                              {log.remarks}
                            </div>
                          )}
                          
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                            {log.previousValue && (
                              <div>
                                <strong>Previous:</strong> {log.previousValue}
                              </div>
                            )}
                            {log.newValue && (
                              <div>
                                <strong>New:</strong> {log.newValue}
                              </div>
                            )}
                            {log.changeReason && (
                              <div className="col-span-2">
                                <strong>Reason:</strong> {log.changeReason}
                              </div>
                            )}
                            {log.qualityStatus && (
                              <div className="col-span-2">
                                <strong>Quality Status:</strong> {log.qualityStatus}
                              </div>
                            )}
                          </div>
                          
                          <div className="text-xs text-gray-500 mt-2 flex justify-between">
                            <div>
                              <i className="ri-user-line me-1"></i>
                              {log.userId || 'System'}
                            </div>
                            {log.floorSupervisorId && (
                              <div>
                                <i className="ri-user-settings-line me-1"></i>
                                Supervisor: {log.floorSupervisorId}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : selectedLogArticleId && articleLogs.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-gray-400 mb-2">
                        <i className="ri-file-list-line text-3xl"></i>
                      </div>
                      <p className="text-gray-600">No logs found for this article</p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-400 mb-2">
                        <i className="ri-file-list-line text-3xl"></i>
                      </div>
                      <p className="text-gray-600">Select an article to view its logs</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
              <button
                onClick={closeViewModal}
                className="ti-btn ti-btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Quality confirm modal */}
      <ConfirmQualitySubmitModal
        orderNumber={selectedOrder?.orderNumber ?? ""}
        lines={qualityConfirmLines}
        isOpen={showQualityConfirm}
        isSubmitting={isLoading}
        onCancel={() => {
          setShowQualityConfirm(false);
          setPendingQualitySubmit(null);
        }}
        onConfirm={() => {
          setShowQualityConfirm(false);
          const next = pendingQualitySubmit;
          setPendingQualitySubmit(null);
          if (next) next();
          else if (selectedOrder) {
            void handleUpdateSubmit({
              articles: resolveArticlesToSubmit(selectedOrder.articles, selectedArticleId),
            });
          }
        }}
      />

      <ArticleQrScanDrawer
        open={qrScan.showDrawer}
        floorLabel={qrScan.floorLabel}
        loading={qrScan.loading}
        feedback={qrScan.feedback}
        onClose={qrScan.closeDrawer}
        onScan={qrScan.handleScan}
      />
    </div>
  );
};

export default FinalCheckingFloorSupervisorPage;
