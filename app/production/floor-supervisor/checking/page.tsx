"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import FloorProgression from "@/shared/components/production/FloorProgression";
import { productionService, ProductionOrder, FloorOrderFilters, type Article } from "@/shared/services/productionService";
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
import ReceivedQuantityDisplay from "@/shared/components/production/ReceivedQuantityDisplay";
import QcM2MergeHistoryPanel, { MERGE_CASCADE_ACTION } from "@/shared/components/production/QcM2MergeHistoryPanel";
import ArticleViewTab from "./components/ArticleViewTab";
import MyTeamTab from "./components/MyTeamTab";
import UpcomingTab from "../components/UpcomingTab";
import { containersMasterService, type ContainerMaster, hasActiveItems, getContainerArticles } from "@/shared/services/containersMasterService";
import { useProductionArticleQrScan } from "@/shared/hooks/useProductionArticleQrScan";
import ArticleQrScanDrawer from "@/shared/components/production/ArticleQrScanDrawer";
import { teamMasterService, type TeamMaster, PRODUCTION_FLOORS } from "@/shared/services/teamMasterService";

type CheckingTab = "orders" | "article-view" | "my-team" | "upcoming";

const FLOOR_CATALOG_LIMIT = 2000;

interface ArticleLog {
  id: string;
  date: string; // YYYY-MM-DD
  action: string; // e.g., "Transferred to Washing"
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

interface Article {
  id: string;
  _id?: string;
  articleNumber: string;
  plannedQuantity: number;
  completedQuantity: number;
  linkingType: 'Auto Linking' | 'Rosso Linking' | 'Hand Linking';
  priority: 'High' | 'Medium' | 'Low' | 'Urgent';
  status: 'Pending' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';
  progress: number;
  currentFloor: string;
  remarks?: string;
  logs?: ArticleLog[];
  // Floor quantities tracking
  floorQuantities?: {
    knitting?: FloorQuantities;
    linking?: FloorQuantities;
    checking?: FloorQuantities;
    washing?: FloorQuantities;
    boarding?: FloorQuantities;
    branding?: FloorQuantities;
    finalChecking?: FloorQuantities;
    warehouse?: FloorQuantities;
  };
  // Step 4B: Article-wise checked quantities
  m1Quantity: number; // Good quality - ready for next step
  m2Quantity: number; // Needs repair - to be reviewed
  m3Quantity: number; // Minor defects - can be fixed
  m4Quantity: number; // Major defects - needs significant repair
  // Repair sub-step tracking
  repairStatus: 'Not Required' | 'In Review' | 'Repaired' | 'Rejected';
  repairRemarks?: string;
  finalQualityConfirmed?: boolean;
  startedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

const CheckingFloorSupervisorPage = () => {
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
    repairRemarks: string
  }}>({});
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
  /** Wide fetch shared by Orders + Article tabs. */
  const [floorCatalog, setFloorCatalog] = useState<ProductionOrder[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [updateDrawerLoading, setUpdateDrawerLoading] = useState(false);

  // Tabs: Orders | Article view | My Team (like linking)
  const [activeTab, setActiveTab] = useState<CheckingTab>("article-view");
  // Scan container flow (Article view): barcode -> get container -> Accept Article Quantity for Checking
  const [showContainerScanDrawer, setShowContainerScanDrawer] = useState(false);
  const [containerScanBarcode, setContainerScanBarcode] = useState("");
  const [containerScanLoading, setContainerScanLoading] = useState(false);
  const [containerScanned, setContainerScanned] = useState<{ container: ContainerMaster; articles: Array<{ article: Article | null; quantity: number }> } | null>(null);
  const [acceptArticleLoading, setAcceptArticleLoading] = useState(false);
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  // Assign drawer
  const [showAssignDrawer, setShowAssignDrawer] = useState(false);
  const [assignTeamMembers, setAssignTeamMembers] = useState<TeamMaster[]>([]);
  const [assignTeamLoading, setAssignTeamLoading] = useState(false);
  const [confirmAssignModal, setConfirmAssignModal] = useState<{ teamMemberName: string; teamMemberId: string; articleId: string } | null>(null);
  const [assigningInProgress, setAssigningInProgress] = useState(false);
  const [removingArticleMemberId, setRemovingArticleMemberId] = useState<string | null>(null);
  // Update order: scan container/bag before submit (like linking)
  const [showUpdateContainerModal, setShowUpdateContainerModal] = useState(false);
  const [updateContainerBarcode, setUpdateContainerBarcode] = useState("");
  const [updateContainerCheckStatus, setUpdateContainerCheckStatus] = useState<"idle" | "loading" | "not-found" | "already-filled" | "ok">("idle");
  const [updateContainerFetched, setUpdateContainerFetched] = useState<{ activeItems?: Array<{ article: string | { articleNumber?: string }; quantity: number }>; activeFloor?: string } | null>(null);
  const [updateContainerArticleId, setUpdateContainerArticleId] = useState("");
  const [updateContainerQuantity, setUpdateContainerQuantity] = useState("");
  const [updateContainerNextFloor, setUpdateContainerNextFloor] = useState("Washing");
  const [updateContainerSubmitting, setUpdateContainerSubmitting] = useState(false);

  /** When false (default): article view lists only checking articles with remaining > 0. When true: all with received > 0. */
  const [showAllArticles, setShowAllArticles] = useState(false);

  /**
   * Loads checking floor orders for both tabs; filter + paginate client-side like Article view.
   */
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
      const response = await productionService.getFloorOrders("Checking", apiFilters);
      if (response.success) {
        setFloorCatalog(response.data.results);
        return response.data.results;
      }
      console.error("Failed to load checking floor orders:", response.error);
      toast.error("Failed to load checking orders");
      return null;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to load checking orders";
      console.error("Error loading checking floor orders:", error);
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
  }, [showUpdateContainerModal, updateContainerBarcode, updateContainerNextFloor]);

  // When article changes in modal, sync quantity and next floor from article processes
  useEffect(() => {
    if (!showUpdateContainerModal || !updateContainerArticleId || !selectedOrder) return;
    setUpdateContainerQuantity(String(updateData[updateContainerArticleId]?.m1Quantity ?? 0));
    const mongoId = getArticleMongoId(updateContainerArticleId, selectedOrder.articles);
    if (!mongoId) return;
    let cancelled = false;
    productionService.getArticleProcesses(mongoId).then((res) => {
      if (cancelled) return;
      if (res.success && res.data?.processes) {
        const next = resolveNextFloorFromProcesses(res.data.processes, "Checking", "Washing");
        setUpdateContainerNextFloor(next);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [showUpdateContainerModal, updateContainerArticleId, selectedOrder?.articles]);

  /**
   * Article view / shared order list: default only articles still in play on Checking; optional show-all for history.
   * @param orders - Raw floor orders
   * @param showAll - If true, include any article with checking received > 0; else only remaining > 0
   */
  const filterOrdersByReceivedQuantity = (orders: ProductionOrder[], showAll: boolean): ProductionOrder[] => {
    return orders.map((order) => {
      const filteredArticles = order.articles.filter((article) => {
        const received = article.floorQuantities?.checking?.received || 0;
        const transferred = article.floorQuantities?.checking?.transferred || 0;
        const remaining = article.floorQuantities?.checking?.remaining ?? (received - transferred);
        if (showAll) return received > 0;
        return remaining > 0;
      });
      return { ...order, articles: filteredArticles };
    }).filter((order) => order.articles.length > 0);
  };

  // Helper function to get checking floor data
  const getCheckingFloorData = (article: Article) => {
    return {
      floor: 'checking',
      data: article.floorQuantities?.checking
    };
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
      repairRemarks: string
    }} = {};
    const transferInit: {[key: string]: { m2: number; m3: number; m4: number }} = {};
    order.articles.forEach((article) => {
      const articleId = article.id || article._id;
      if (!articleId) return;
      const cumulative = getCumulativeQty(article, 'checking');
      const checkingFloor = getCheckingFloorData(article);
      initialData[articleId] = {
        remarks: article.remarks || '',
        m1Quantity: 0,
        m2Quantity: cumulative.m2,
        m3Quantity: cumulative.m3,
        m4Quantity: cumulative.m4,
        repairStatus: checkingFloor.data?.repairStatus || article.repairStatus || 'Not Required',
        repairRemarks: checkingFloor.data?.repairRemarks || article.repairRemarks || ''
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

  /** Resolve stable order id from API/local shape. */
  const getOrderRefId = (order: Pick<ProductionOrder, 'id'> & { _id?: string }) =>
    String(order.id ?? order._id ?? '');

  /** Match orders across id / _id shapes. */
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

  /** Open update drawer with order snapshot (after optional fresh fetch). */
  const openUpdateDrawerWithOrder = (order: ProductionOrder, article?: Article) => {
    setSelectedArticleId(article ? (article.id ?? article._id ?? null) : null);
    setActiveUpdateTabIndex(0);
    refreshUpdateDrawerFromOrder(order);
    setShowLogs(false);
    setShowUpdateModal(true);
  };

  /** Max qty assignable on this save (remaining minus pending deltas). */
  const getActualRemainingForArticle = (article: Article, articleId?: string) => {
    const cumulative = getCumulativeQty(article, 'checking');
    if (!articleId) return cumulative.remaining;
    const update = updateData[articleId];
    const transfer = transferM2M3M4[articleId];
    return getAvailableRemaining(cumulative, {
      m1: update?.m1Quantity ?? 0,
      m2: transfer?.m2 ?? 0,
      m3: transfer?.m3 ?? 0,
      m4: transfer?.m4 ?? 0,
    });
  };

  /** Max M1 for this save after M2/M3/M4 deltas. */
  const getMaxM1ForArticle = (article: Article, articleId: string) => {
    const cumulative = getCumulativeQty(article, 'checking');
    const transfer = transferM2M3M4[articleId];
    return getMaxM1ForSave(cumulative, {
      m2: transfer?.m2 ?? 0,
      m3: transfer?.m3 ?? 0,
      m4: transfer?.m4 ?? 0,
    });
  };

  // Apply filtering to orders (default remaining > 0; show all = received > 0)
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
    floorApiName: "Checking",
    floorKey: "checking",
    floorLabel: "Checking",
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
    setShowUpdateContainerModal(false);
    setUpdateContainerBarcode("");
    setUpdateContainerCheckStatus("idle");
    setUpdateContainerFetched(null);
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

  const handleRepairStatusChange = (articleId: string, value: 'Not Required' | 'In Review' | 'Repaired' | 'Rejected') => {
    setUpdateData(prev => ({
      ...prev,
      [articleId]: {
        ...prev[articleId],
        repairStatus: value
      }
    }));
  };

  const handleRepairRemarksChange = (articleId: string, value: string) => {
    setUpdateData(prev => ({
      ...prev,
      [articleId]: {
        ...prev[articleId],
        repairRemarks: value
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
      void handleUpdateSubmit();
      return;
    }
    setQualityConfirmLines(lines);
    setPendingQualitySubmit(() => afterConfirm);
    setShowQualityConfirm(true);
  };

  const handleUpdateSubmit = async () => {
    if (!selectedOrder) return;

    for (const article of selectedOrder.articles) {
      const articleId = article.id || article._id;
      if (!articleId) continue;
      const update = updateData[articleId];
      if (!update) continue;
      const transfer = transferM2M3M4[articleId];
      const m1Delta = update.m1Quantity ?? 0;
      const m2Delta = transfer?.m2 ?? 0;
      const m3Delta = transfer?.m3 ?? 0;
      const m4Delta = transfer?.m4 ?? 0;
      const batchTotal = m1Delta + m2Delta + m3Delta + m4Delta;
      const halfStepError = getFirstHalfStepError([
        { value: m1Delta, label: 'M1', skipZero: true },
        { value: m2Delta, label: 'M2', skipZero: true },
        { value: m3Delta, label: 'M3', skipZero: true },
        { value: m4Delta, label: 'M4', skipZero: true },
      ]);
      if (halfStepError) {
        toast.error(`${article.articleNumber ?? articleId}: ${HALF_STEP_QTY_ERROR}`);
        return;
      }
      if (batchTotal > 0) {
        const cumulative = getCumulativeQty(article, 'checking');
        if (batchTotal > cumulative.remaining) {
          toast.error(`${article.articleNumber ?? articleId}: batch total (${batchTotal}) exceeds remaining (${cumulative.remaining})`);
          return;
        }
      }
    }

    // Validate M1 quantities: cannot exceed max M1 for this save
    const invalidArticles = selectedOrder.articles.filter(article => {
      const articleId = article.id || article._id;
      if (!articleId) return false;
      const update = updateData[articleId];
      if (!update) return false;
      const maxM1 = getMaxM1ForArticle(article, articleId);
      return update.m1Quantity > maxM1;
    });

    if (invalidArticles.length > 0) {
      toast.error('Cannot submit: Some articles have M1 exceeding remaining');
      return;
    }

    try {
      setIsLoading(true);
      
      // Update each article that has changes
      const updatePromises = selectedOrder.articles.map(async (article) => {
        const articleId = article.id || article._id;
        if (!articleId) return null;
        
        const update = updateData[articleId];
        const m1Delta = update?.m1Quantity ?? 0;
        const m2Delta = transferM2M3M4[articleId]?.m2 ?? 0;
        const m3Delta = transferM2M3M4[articleId]?.m3 ?? 0;
        const m4Delta = transferM2M3M4[articleId]?.m4 ?? 0;
        const hasQtyChange = m1Delta > 0 || m2Delta > 0 || m3Delta > 0 || m4Delta > 0;
        if (update && (update.remarks !== (article.remarks || '') || hasQtyChange)) {
          if (hasQtyChange) {
            const inspectedQuantity = m1Delta + m2Delta + m3Delta + m4Delta;
            try {
              const qualityResponse = await productionService.updateQualityInspection(
                article._id || article.id,
                {
                  inspectedQuantity,
                  m1Quantity: m1Delta,
                  m2Quantity: m2Delta,
                  m3Quantity: m3Delta,
                  m4Quantity: m4Delta,
                  remarks: update.remarks,
                  floor: "Checking"
                }
              );
              
              if (!qualityResponse.success) {
                throw new Error(qualityResponse.error?.message || 'Failed to update quality inspection');
              }
            } catch (error) {
              console.error(`Error updating quality inspection for article ${articleId}:`, error);
              throw error;
            }
          }
          
          if (update.remarks !== (article.remarks || '')) {
            try {
              const response = await productionService.updateArticleProgress(
                'Checking',
                selectedOrder.id,
                article._id || article.id,
                { remarks: update.remarks }
              );
              
              if (!response.success) {
                throw new Error(response.error?.message || 'Failed to update article');
              }
              
              return response.data;
            } catch (error) {
              console.error(`Error updating article ${articleId}:`, error);
              throw error;
            }
          }
        }
        return null;
      }).filter(Boolean);

      const results = await Promise.allSettled(updatePromises);
      
      // Check if any updates failed
      const failedUpdates = results.filter(result => result.status === 'rejected');
      if (failedUpdates.length > 0) {
        console.error('Some updates failed:', failedUpdates);
        toast.error(`${failedUpdates.length} article(s) failed to update`);
      } else {
        toast.success('Order updated successfully');
        const orderId = getOrderRefId(selectedOrder);
        void loadFloorOrdersCatalog();
        const freshOrder = await fetchFreshOrderForDrawer(orderId, selectedOrder);
        if (freshOrder) {
          refreshUpdateDrawerFromOrder(freshOrder);
        }
      }
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast.error(error.message || 'Failed to update order');
    } finally {
      setIsLoading(false);
    }
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
      const a = order.articles.find((ar) => (ar._id || ar.id) === articleId);
      if (a) return a as Article;
    }
    return null;
  }, [floorCatalog]);

  const handleScanContainerClick = () => {
    setContainerScanned(null);
    setContainerScanBarcode("");
    setShowContainerScanDrawer(true);
  };

  const CURRENT_FLOOR = "Checking";
  const normalizeFloor = (f: string | undefined) => (f ?? "").replace(/\s+/g, "").toLowerCase();
  const containerBelongsToCurrentFloor =
    containerScanned && normalizeFloor(containerScanned.container.activeFloor) === normalizeFloor(CURRENT_FLOOR);

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
      let articles: Array<{ article: Article | null; quantity: number }> = [];
      if (container.activeItems?.length) {
        articles = container.activeItems.map((item) => {
          let art: Article | null = null;
          if (typeof item.article === 'object' && 'articleNumber' in item.article) {
            art = item.article as unknown as Article;
          } else {
            const id = typeof item.article === 'string' ? item.article : '';
            art = id ? findArticleInOrders(id) ?? null : null;
          }
          return { article: art, quantity: item.quantity ?? 0 };
        });
      } else {
        const items = getContainerArticles(container);
        articles = items.map(({ articleId, quantity }) => ({ article: findArticleInOrders(articleId) ?? null, quantity }));
      }
      setContainerScanned({ container, articles });
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
    if (!containerScanned?.articles?.length) return;
    setAcceptArticleLoading(true);
    try {
      const barcode = containerScanned.container.barcode;
      await containersMasterService.acceptByBarcode(barcode);
      try {
        await containersMasterService.clearActiveByBarcode(barcode);
      } catch {
        // accept succeeded; clear is best-effort
      }
      const firstId = containerScanned.articles[0]?.article?._id ?? containerScanned.articles[0]?.article?.id;
      if (firstId) setActiveArticleId(String(firstId));
      toast.success("Container accepted.");
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
      const data = await teamMasterService.list({ workingFloor: "Checking", limit: 200 });
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
      setAssignTeamMembers((prev) =>
        prev.map((m) =>
          m._id === confirmAssignModal.teamMemberId
            ? { ...m, articleData: [...(m.articleData || []), { activeArticle: confirmAssignModal.articleId }] }
            : m
        )
      );
      const data = await teamMasterService.list({ workingFloor: "Checking", limit: 200 });
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
      const data = await teamMasterService.list({ workingFloor: "Checking", limit: 200 });
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

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Checking Floor Supervisor Dashboard"/>

      <div className="bg-white shadow-sm border border-gray-300 overflow-hidden mx-0">
        <div className="p-[10px]">
          {/* Page Header - design spec like linking */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-blue-600 rounded-full" />
              <h1 className="text-sm font-bold text-gray-800">Checking Floor Supervisor</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {filteredOrders.length}
              </span>
              <HelpIcon
                title="Checking Floor Supervisor Dashboard"
                content={
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-lg mb-2">What is this page?</h4>
                      <p className="text-gray-700">
                        This is the Checking Floor Supervisor Dashboard where you can view and update production orders that are currently on the Checking floor.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-2">What can you do here?</h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        <li><strong>View Orders:</strong> See all orders with articles on the Checking floor</li>
                        <li><strong>Article view:</strong> Scan container, accept article, assign to team member</li>
                        <li><strong>My Team:</strong> View active articles and mark article complete</li>
                        <li><strong>Update Progress:</strong> Scan container then update M1-M4 and transfer to next floor</li>
                        <li><strong>Filter & Search:</strong> Use filters and search to find specific orders</li>
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
                onClick={() => void loadFloorOrdersCatalog()}
                disabled={catalogLoading}
                title="Refresh Orders"
              >
                <i className={`ri-refresh-line text-xs ${catalogLoading ? 'animate-spin' : ''}`}></i> Refresh
              </button>
            </div>
          </div>

          {/* Small stat cards - design spec */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <div className="bg-blue-50 border border-blue-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">In Progress</span>
              <span className="text-sm font-bold text-blue-900">{floorCatalog.filter(o => o.status === 'In Progress').length}</span>
            </div>
            <div className="bg-green-50 border border-green-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-green-700 uppercase tracking-wide">M1 Good</span>
              <span className="text-sm font-bold text-green-900">
                {formatProductionQty(
                  floorCatalog.reduce((sum, order) => sum + order.articles.reduce((articleSum, article) => {
                    const cf = getCheckingFloorData(article);
                    return articleSum + (cf.data?.m1Quantity ?? (article as any).m1Quantity ?? 0);
                  }, 0), 0)
                )}
              </span>
            </div>
            <div className="bg-yellow-50 border border-yellow-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-yellow-700 uppercase tracking-wide">M2 Repair</span>
              <span className="text-sm font-bold text-yellow-900">
                {formatProductionQty(
                  floorCatalog.reduce((sum, order) => sum + order.articles.reduce((articleSum, article) => {
                    const cf = getCheckingFloorData(article);
                    return articleSum + (cf.data?.m2Quantity ?? (article as any).m2Quantity ?? 0);
                  }, 0), 0)
                )}
              </span>
            </div>
            <div className="bg-red-50 border border-red-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-red-700 uppercase tracking-wide">M3+M4</span>
              <span className="text-sm font-bold text-red-900">
                {formatProductionQty(
                  floorCatalog.reduce((sum, order) => sum + order.articles.reduce((articleSum, article) => {
                    const cf = getCheckingFloorData(article);
                    return articleSum + (cf.data?.m3Quantity ?? (article as any).m3Quantity ?? 0) + (cf.data?.m4Quantity ?? (article as any).m4Quantity ?? 0);
                  }, 0), 0)
                )}
              </span>
            </div>
          </div>

          {/* Tabs: Orders | Article view | My Team */}
          <div className="flex items-center justify-between border-b border-gray-300 mb-0">
            <div className="flex">
              <button
                type="button"
                className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${activeTab === "orders" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                onClick={() => setActiveTab("orders")}
              >
                Orders
              </button>
              <button
                type="button"
                className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${activeTab === "article-view" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                onClick={() => setActiveTab("article-view")}
              >
                Article view
              </button>
              <button
                type="button"
                className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${activeTab === "my-team" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                onClick={() => setActiveTab("my-team")}
              >
                My Team
              </button>
              <button
                type="button"
                className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${activeTab === "upcoming" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                onClick={() => setActiveTab("upcoming")}
              >
                Upcoming
              </button>
            </div>
            <label className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-gray-700 border border-gray-300 rounded bg-white cursor-pointer hover:bg-gray-50 mr-2">
              <input type="checkbox" checked={showAllArticles} onChange={(e) => {
                setShowAllArticles(e.target.checked);
                if (!e.target.checked) qrScan.clearQrPin();
              }} className="rounded border-gray-300" />
              Show all
            </label>
          </div>
        </div>

        {/* Content */}
        <div className="min-h-[300px]">
          {activeTab === "my-team" ? (
            <MyTeamTab />
          ) : activeTab === "upcoming" ? (
            <UpcomingTab floorName="Checking" />
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
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border transition-colors ${showFilters ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 text-[#495057] hover:bg-gray-50'}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <i className="ri-filter-3-line text-xs"></i> Filters {hasActiveFilters && <span className="ml-1">●</span>}
            </button>
            {hasActiveFilters && (
              <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[11px] font-bold rounded hover:bg-gray-50" onClick={clearFilters}>
                <i className="ri-close-line text-xs"></i> Clear
              </button>
            )}
            <div className="relative flex-1 min-w-[140px] max-w-[240px]">
              <input
                type="text"
                className="bg-white border border-gray-300 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-1 focus:ring-blue-300 focus:border-blue-500 w-full placeholder:text-gray-400 font-medium"
                placeholder="Search order, article..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
            </div>
            <select
              className="bg-white border border-gray-300 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5"
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
              <select className="bg-white border border-gray-300 text-[11px] rounded px-2 py-1.5" value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
              </select>
              <select className="bg-white border border-gray-300 text-[11px] rounded px-2 py-1.5" value={filters.priority} onChange={(e) => handleFilterChange('priority', e.target.value)}>
                <option value="">All Priorities</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <select className="bg-white border border-gray-300 text-[11px] rounded px-2 py-1.5" value={filters.linkingType} onChange={(e) => handleFilterChange('linkingType', e.target.value)}>
                <option value="">All Types</option>
                <option value="Auto Linking">Auto Linking</option>
                <option value="Rosso Linking">Rosso Linking</option>
                <option value="Hand Linking">Hand Linking</option>
              </select>
              <input type="text" className="bg-white border border-gray-300 text-[11px] rounded px-2 py-1.5 w-28" placeholder="Floor..." value={filters.floor} onChange={(e) => handleFilterChange('floor', e.target.value)} />
            </div>
          )}

          {catalogLoading && floorCatalog.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4 opacity-50"></div>
              <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading</p>
            </div>
          ) : floorCatalog.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-file-list-line text-xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">NO ORDERS FOUND</h3>
              <p className="text-[10px] text-gray-500">
                {hasActiveFilters ? 'Try adjusting filters or search' : 'No orders on Checking floor'}
              </p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-file-list-line text-xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">NO ORDERS WITH REMAINING QTY</h3>
              <p className="text-[10px] text-gray-500">Turn on Show all to include orders with zero remaining on Checking</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50/30">
                    <th className="pl-[10px] pr-1 py-2.5 w-10 border border-gray-300">
                      <input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="rounded border-gray-300 text-blue-600 focus:ring-0 h-3.5 w-3.5" />
                    </th>
                    <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Order Info</th>
                    <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Articles</th>
                    <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Status</th>
                    <th className="px-1.5 py-2.5 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="pl-[10px] pr-1 py-2.5 border border-gray-300">
                        <input type="checkbox" checked={selectedOrders.includes(order.id)} onChange={() => handleOrderSelect(order.id)} className="rounded border-gray-300 text-blue-600 focus:ring-0 h-3.5 w-3.5" />
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-300">
                        <div className="text-[12px] font-bold text-gray-900">{order.orderNumber || order.id}</div>
                        {order.orderNote && <span className="text-[10px] text-gray-500">({order.orderNote})</span>}
                        <div className="text-[10px] text-gray-500">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : (order.articles?.[0]?.createdAt ? new Date(order.articles[0].createdAt).toLocaleDateString() : 'N/A')}</div>
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-300">
                        <div className="text-[12px] font-medium text-gray-600">{order.articles.length} Article{order.articles.length !== 1 ? 's' : ''} · Qty {order.articles.reduce((s, a) => s + (a.plannedQuantity || 0), 0).toLocaleString()}</div>
                        {order.articles.some(a => (a as any).floorQuantities?.checking) && (
                          <div className="text-[10px] text-blue-600 mt-0.5">
                            R:{order.articles.reduce((s, a) => s + ((a as any).floorQuantities?.checking?.received || 0), 0)} Trf:{order.articles.reduce((s, a) => s + ((a as any).floorQuantities?.checking?.transferred || 0), 0)} Rem:{order.articles.reduce((s, a) => s + ((a as any).floorQuantities?.checking?.remaining ?? 0), 0)}
                          </div>
                        )}
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-300">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${getStatusBadge(order.status)}`}>{order.status}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ml-1 ${getPriorityBadge(order.priority)}`}>{order.priority}</span>
                      </td>
                      <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-300">
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
            <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-300">
              <div className="text-[11px] font-medium text-[#495057]">
                Showing {ordersPageStart} to {ordersPageEnd} of {filteredOrders.length} entries
              </div>
              <div className="flex items-center gap-1" role="navigation" aria-label="Orders pagination">
                <button onClick={() => handlePageChange(safeCurrentPage - 1)} disabled={safeCurrentPage <= 1} className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30">Prev</button>
                {Array.from({ length: Math.min(orderTotalPages, 7) }, (_, i) => {
                  const pageNum = orderTotalPages <= 7 ? i + 1 : safeCurrentPage <= 4 ? i + 1 : safeCurrentPage >= orderTotalPages - 3 ? orderTotalPages - 6 + i : safeCurrentPage - 3 + i;
                  return (
                    <button key={pageNum} onClick={() => handlePageChange(pageNum)} className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded ${safeCurrentPage === pageNum ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>{pageNum}</button>
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
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => { setShowContainerScanDrawer(false); setContainerScanned(null); setContainerScanBarcode(""); }} aria-hidden />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col overflow-hidden animate-slide-in-right">
            <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-800">Scan Container</h3>
              <button type="button" onClick={() => { setShowContainerScanDrawer(false); setContainerScanned(null); setContainerScanBarcode(""); }} className="text-gray-500 hover:text-gray-700 p-1">
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
                    className="w-full border border-gray-200 rounded pl-3 pr-3 py-1.5 text-[11px] font-medium focus:ring-0 focus:border-blue-300 placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    disabled={!containerScanBarcode.trim() || containerScanLoading}
                    onClick={handleGetContainerByBarcode}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-blue-600 text-white hover:bg-blue-700 shadow-sm w-full"
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
                  <h4 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider">Items in container</h4>
                  <div className="p-2 bg-gray-50 rounded border border-gray-200 text-[12px] text-gray-900 space-y-1">
                    {containerScanned.articles.map((item, i) => (
                      <div key={i}><span className="font-bold text-[#495057]">{item.article?.articleNumber ?? "—"}:</span> {item.quantity}</div>
                    ))}
                    <div><span className="font-bold text-[#495057]">Total:</span> {containerScanned.container.quantity ?? containerScanned.articles.reduce((s, i) => s + i.quantity, 0)}</div>
                  </div>
                  {!containerBelongsToCurrentFloor && (
                    <div className="p-2 rounded border-2 border-red-400 bg-red-50 text-[11px] text-red-800">
                      This container is assigned to <strong>{containerScanned.container.activeFloor || "unknown"}</strong>, not {CURRENT_FLOOR}. Accept Article is disabled.
                    </div>
                  )}
                  {containerScanned.articles.length > 0 ? (
                    <>
                      <button
                        type="button"
                        disabled={acceptArticleLoading || !containerBelongsToCurrentFloor}
                        onClick={handleAcceptArticleQuantity}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {acceptArticleLoading ? "Accepting..." : "Accept Article Quantity"}
                      </button>
                    </>
                  ) : (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                      No articles in container.
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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4 opacity-50" />
                  <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading</p>
                </div>
              ) : assignTeamMembers.length === 0 ? (
                <p className="text-[11px] text-[#495057]">No team members on Checking floor.</p>
              ) : (
                <ul className="space-y-2">
                  {assignTeamMembers.map((member) => {
                    const hasActiveArticle = Boolean(activeArticleId && member.articleData?.some((d) => d.activeArticle === activeArticleId));
                    return (
                      <li key={member._id} className="flex items-center justify-between gap-2 p-2 border border-gray-200 rounded hover:bg-gray-50">
                        <div>
                          <span className="text-[12px] font-medium text-gray-900">{member.teamMemberName}</span>
                          <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold ${member.role === "Supervisor" ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-gray-50 text-gray-600 border border-gray-200"}`}>{member.role}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {hasActiveArticle ? (
                            <button type="button" onClick={() => handleArticleReceived(member)} disabled={removingArticleMemberId === member._id} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm disabled:opacity-50">
                              {removingArticleMemberId === member._id ? "..." : "Article received"}
                            </button>
                          ) : (
                            <button type="button" onClick={() => handleAssignToMember(member)} disabled={!activeArticleId} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-blue-600 text-white hover:bg-blue-700 shadow-sm disabled:opacity-50">Assign</button>
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
              <button type="button" onClick={handleConfirmAssign} disabled={assigningInProgress} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[11px] font-bold rounded hover:bg-blue-700 shadow-sm">
                {assigningInProgress ? "Assigning..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scan container/bag before update order – modal */}
      {showUpdateContainerModal && selectedOrder && (() => {
        const modalArticles = selectedArticleId ? selectedOrder.articles.filter((a) => (a.id ?? a._id) === selectedArticleId) : selectedOrder.articles;
        const articlesWithQty = modalArticles
          .map((a) => {
            const id = a.id ?? a._id;
            if (!id) return null;
            const qty = updateData[id]?.m1Quantity ?? 0;
            return qty > 0 ? { article: a, quantity: qty } : null;
          })
          .filter((x): x is { article: Article; quantity: number } => Boolean(x));
        const firstWithQty = articlesWithQty[0];
        const nextFloor = firstWithQty ? (updateContainerNextFloor || "Washing") : "";
        return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={() => { setShowUpdateContainerModal(false); setUpdateContainerCheckStatus("idle"); setUpdateContainerFetched(null); }} aria-hidden>
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-sm p-[10px] flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-2">Scan bag / container</h4>
            <p className="text-[11px] text-[#495057]">Scan container for checking articles (M1 good). All articles with M1 qty will be added.</p>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Container barcode</label>
              <input type="text" placeholder="Scan or enter barcode" value={updateContainerBarcode} onChange={(e) => setUpdateContainerBarcode(e.target.value)} className="w-full border border-gray-200 rounded px-3 py-1.5 text-[11px] focus:ring-0 focus:border-blue-300" />
              {updateContainerCheckStatus === "loading" && <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1"><span className="animate-spin rounded-full h-3 w-3 border-2 border-gray-400 border-t-transparent" /> Checking...</p>}
              {updateContainerCheckStatus === "not-found" && <p className="text-[11px] text-red-600 mt-1">Container not found.</p>}
              {updateContainerCheckStatus === "already-filled" && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mt-1">
                  This container is not empty. It is assigned to <strong>{updateContainerFetched?.activeFloor ?? 'unknown'}</strong>
                  {updateContainerFetched?.activeItems?.length ? ` with ${updateContainerFetched.activeItems.length} item(s)` : ''}. Use another container.
                </p>
              )}
              {updateContainerCheckStatus === "ok" && (
                <p className="text-[11px] text-green-600 mt-1">
                  {updateContainerFetched?.activeItems?.length
                    ? `Container has items for ${updateContainerFetched.activeFloor ?? "this floor"}. You can add another article.`
                    : "Container available."}
                </p>
              )}
            </div>
            {articlesWithQty.length > 0 && (
              <div className={updateContainerCheckStatus !== "ok" ? "opacity-60 pointer-events-none" : ""}>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Articles to add (M1 good)</label>
                <div className="p-2 bg-gray-50 rounded border border-gray-200 text-[11px] space-y-0.5">
                  {articlesWithQty.map(({ article, quantity }) => (
                    <div key={article.id ?? article._id}>{article.articleNumber ?? article.id ?? article._id}: {quantity}</div>
                  ))}
                </div>
              </div>
            )}
            <div className={updateContainerCheckStatus !== "ok" ? "opacity-60 pointer-events-none" : ""}>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Next floor</label>
              <input type="text" readOnly value={nextFloor || "—"} className="w-full border border-gray-200 rounded px-3 py-1.5 text-[11px] bg-gray-100 text-gray-700 cursor-not-allowed" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => { setShowUpdateContainerModal(false); setUpdateContainerCheckStatus("idle"); setUpdateContainerFetched(null); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50">Cancel</button>
              <button
                type="button"
                disabled={updateContainerCheckStatus !== "ok" || !updateContainerBarcode.trim() || !nextFloor || articlesWithQty.length === 0 || updateContainerSubmitting}
                onClick={async () => {
                  const barcode = updateContainerBarcode.trim();
                  const floor = nextFloor.trim();
                  if (!barcode || !floor || articlesWithQty.length === 0) return;
                  let activeItems = articlesWithQty.map(({ article, quantity }) => ({ article: article._id ?? article.id ?? "", quantity })).filter((i) => i.article);
                  if (activeItems.some((i) => !i.article)) { toast.error("Invalid article id"); return; }
                  if (updateContainerFetched?.activeItems?.length) {
                    const existing = (updateContainerFetched.activeItems ?? []).map((item) => ({
                      article: typeof item.article === "string" ? item.article : (item.article as { _id?: string; id?: string })._id ?? (item.article as { _id?: string; id?: string }).id ?? "",
                      quantity: item.quantity ?? 0,
                    })).filter((x) => x.article);
                    activeItems = [...existing, ...activeItems];
                  }
                  setUpdateContainerSubmitting(true);
                  try {
                    await containersMasterService.updateByBarcode(barcode, { activeFloor: floor, activeItems });
                    toast.success("Container updated");
                    setShowUpdateContainerModal(false);
                    setUpdateContainerBarcode("");
                    setUpdateContainerCheckStatus("idle");
                    setUpdateContainerFetched(null);
                    setUpdateContainerSubmitting(false);
                    handleUpdateSubmit();
                  } catch (err) {
                    setUpdateContainerSubmitting(false);
                    const msg = err instanceof Error ? err.message : String(err);
                    if (msg.includes("404")) toast.error("Container not found");
                    else toast.error(msg);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[11px] font-bold rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {updateContainerSubmitting ? <span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" /> : <i className="ri-save-line text-xs" />}
                Update & submit order
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
                <button onClick={closeUpdateModal} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-gray-300 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-100 shadow-sm">Cancel</button>
                <button
                  onClick={() => {
                    if (!selectedOrder) return;
                    const invalid = modalArticles.some(article => {
                      const articleId = article.id || article._id;
                      if (!articleId) return false;
                      const update = updateData[articleId];
                      if (!update) return false;
                      return update.m1Quantity > getMaxM1ForArticle(article, articleId);
                    });
                    if (invalid) {
                      toast.error("Cannot submit: Some articles have M1 quantities exceeding remaining");
                      return;
                    }
                    const hasAnyM1 = modalArticles.some(article => {
                      const articleId = article.id || article._id;
                      return articleId && (updateData[articleId]?.m1Quantity ?? 0) > 0;
                    });
                    if (!hasAnyM1) {
                      requestQualityConfirm(() => { void handleUpdateSubmit(); }, modalArticles);
                      return;
                    }
                    setUpdateContainerBarcode("");
                    setUpdateContainerCheckStatus("idle");
                    setUpdateContainerFetched(null);
                    const firstWithQty = modalArticles.find((a) => { const id = a.id ?? a._id; return id && (updateData[id]?.m1Quantity ?? 0) > 0; });
                    if (!firstWithQty) { requestQualityConfirm(() => { void handleUpdateSubmit(); }, modalArticles); return; }
                    const firstId = firstWithQty.id ?? firstWithQty._id ?? "";
                    setUpdateContainerArticleId(firstId);
                    setUpdateContainerQuantity(String(updateData[firstId]?.m1Quantity ?? 0));
                    setUpdateContainerNextFloor("Washing");
                    setShowUpdateContainerModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[11px] font-bold rounded hover:bg-blue-700 shadow-sm disabled:opacity-50"
                  disabled={
                    modalArticles.some(article => {
                      const articleId = article.id || article._id;
                      if (!articleId) return false;
                      const update = updateData[articleId];
                      if (!update) return false;
                      return update.m1Quantity > getMaxM1ForArticle(article, articleId);
                    })
                  }
                >
                  <i className="ri-save-line text-xs"></i> Update Order
                </button>
                <button onClick={closeUpdateModal} className="text-gray-500 hover:text-gray-800 p-1 rounded border-2 border-gray-300 hover:bg-gray-100" aria-label="Close drawer">
                  <i className="ri-close-line text-lg"></i>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pt-3 pb-24">
            {/* Short intro so user knows what to do */}
            <div className="mb-4 px-3 py-2 rounded-md bg-blue-50 border-2 border-blue-200 text-[11px] text-blue-900">
              <strong>How to update:</strong> Enter M1 (good → next floor), M2/M3/M4 for this save. M2 creates entries in <strong>M2 Management</strong>. Resolve repairs there (cascade merge to all floors).
            </div>
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
                    className={`px-3 py-1.5 text-[11px] font-bold rounded border-2 ${
                      idx === activeUpdateTabIndex ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
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
                const checkingFloor = getCheckingFloorData(article);
                const cumulative = getCumulativeQty(article, 'checking');
                const currentUpdateData = updateData[articleId] || { 
                  remarks: article.remarks || '',
                  m1Quantity: 0,
                  m2Quantity: cumulative.m2,
                  m3Quantity: cumulative.m3,
                  m4Quantity: cumulative.m4,
                  repairStatus: checkingFloor.data?.repairStatus || article.repairStatus || 'Not Required',
                  repairRemarks: checkingFloor.data?.repairRemarks || article.repairRemarks || ''
                };
                const saveDeltas = {
                  m1: currentUpdateData.m1Quantity,
                  m2: transferM2M3M4[articleId]?.m2 ?? 0,
                  m3: transferM2M3M4[articleId]?.m3 ?? 0,
                  m4: transferM2M3M4[articleId]?.m4 ?? 0,
                };
                const maxM1 = getMaxM1ForSave(cumulative, saveDeltas);
                const availableAfterSave = getRemainingAfterSave(cumulative, saveDeltas);
                return (
                  <>
            <QcM2MergeHistoryPanel
              articleId={articleId}
              floorLabel="Checking"
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
                      <td className="border-2 border-gray-300 px-2 py-1"><ReceivedQuantityDisplay received={checkingFloor.data?.received || 0} repairReceived={checkingFloor.data?.repairReceived} repairFromFloor={checkingFloor.data?.repairFromFloor} className="text-[11px]" /></td>
                      <td className="border-2 border-gray-300 px-2 py-1 text-green-700 font-medium">{formatProductionQty(cumulative.m1Transferred)}</td>
                      <td className="border-2 border-gray-300 px-2 py-1 text-yellow-700 font-medium">{formatProductionQty(cumulative.m2)}</td>
                      <td className="border-2 border-gray-300 px-2 py-1 text-orange-700 font-medium">{formatProductionQty(cumulative.m3)}</td>
                      <td className="border-2 border-gray-300 px-2 py-1 text-red-700 font-medium">{formatProductionQty(cumulative.m4)}</td>
                      <td className="border-2 border-gray-300 px-2 py-1 text-orange-700 font-medium">{formatProductionQty(cumulative.remaining)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="px-3 py-1 text-[10px] text-gray-600 bg-amber-50 border-t border-gray-200">
                Max M1 this save = <strong>{formatProductionQty(maxM1)}</strong>
                {saveDeltas.m2 + saveDeltas.m3 + saveDeltas.m4 + saveDeltas.m1 > 0 ? (
                  <> · Available after this save = <strong>{formatProductionQty(availableAfterSave)}</strong></>
                ) : null}
              </p>
            </section>
            {/* 4. M1 — quantity to send to next floor */}
            <section className="mb-4 rounded-md border-2 border-green-300 overflow-hidden">
              <div className="px-3 py-1.5 bg-green-100 border-b-2 border-green-300 text-[11px] font-bold text-green-900">4. Good quality (M1) — how many to send to next floor?</div>
              <p className="px-3 py-1 text-[10px] text-gray-600 bg-green-50/50 border-b border-green-200">Only good-quality pieces (M1) go to the next floor. Max = remaining minus M2/M3/M4 entered below.</p>
              <div className="p-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-green-800 block mb-0.5">Quantity to transfer</label>
                        {(() => {
                          const isFullyTransferred = maxM1 <= 0 && cumulative.remaining <= 0;
                          return (
                            <>
                              <span className="text-[10px] text-gray-500 block mb-0.5">(Max: {formatProductionQty(maxM1)})</span>
                              <NumericInput
                                className={`py-1.5 px-2 text-[12px] w-24 border-2 rounded ${isFullyTransferred ? 'bg-gray-100 border-gray-300 cursor-not-allowed' : currentUpdateData.m1Quantity > maxM1 ? 'border-red-500' : 'border-gray-300'}`}
                                value={currentUpdateData.m1Quantity}
                                onChange={(value) => { if (!isFullyTransferred && value <= maxM1) handleM1QuantityChange(articleId, value); }}
                                placeholder={isFullyTransferred ? 'Done' : `Max ${formatProductionQty(maxM1)}`}
                                disabled={isFullyTransferred}
                                allowDecimals
                              />
                              {isFullyTransferred ? <div className="text-[10px] text-green-600 mt-0.5 font-medium">✓ No quantity left to transfer</div> : currentUpdateData.m1Quantity > maxM1 ? <div className="text-[10px] text-red-600 font-medium">Max {formatProductionQty(maxM1)}</div> : null}
                            </>
                          );
                        })()}
                      </div>
                    </div>
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
                
                const checkingFloor = getCheckingFloorData(article);
                
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

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className="form-label">Planned Quantity</label>
                        <div className="text-lg font-semibold text-gray-900">{(article.plannedQuantity || 0).toLocaleString()}</div>
                      </div>
                      <div>
                        <label className="form-label">
                          {article.linkingType === 'Auto Linking' ? 'Received from Knitting' : 'Received from Linking'}
                        </label>
                        <ReceivedQuantityDisplay
                          received={checkingFloor.data?.received || 0}
                          repairReceived={checkingFloor.data?.repairReceived}
                          repairFromFloor={checkingFloor.data?.repairFromFloor}
                          className="text-lg"
                        />
                      </div>
                      <div>
                        <label className="form-label">Checking Completed Quantity (M1 - Good Quality)</label>
                        <div className="text-lg font-semibold text-green-600">
                          {checkingFloor.data?.m1Quantity || article.m1Quantity || 0}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Only M1 items pass to next floor
                        </div>
                        {article.floorQuantities?.knitting?.m4Quantity && article.floorQuantities.knitting.m4Quantity > 0 && (
                          <div className="text-xs text-red-600 mt-1">
                            M4 Quantity In Knitting: {article.floorQuantities.knitting.m4Quantity}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="form-label">M1 Transferred</label>
                        <div className="text-lg font-semibold text-purple-600">
                          {formatProductionQty(checkingFloor.data?.m1Transferred ?? checkingFloor.data?.transferred ?? 0)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Transferred to next floor (Washing)
                        </div>
                      </div>
                      <div>
                        <label className="form-label">M1 Remaining</label>
                        <div className="text-lg font-semibold text-blue-600">
                          {formatProductionQty(
                            Math.max(
                              0,
                              (checkingFloor.data?.m1Quantity ?? article.m1Quantity ?? 0) -
                                (checkingFloor.data?.m1Transferred ?? checkingFloor.data?.transferred ?? 0)
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    <QcM2MergeHistoryPanel
                      articleId={article.id || article._id}
                      floorLabel="Checking"
                    />

                    {/* Quality Check Results */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className="form-label">M1 (Good Quality)</label>
                        <div className="text-lg font-semibold text-green-600">{checkingFloor.data?.m1Quantity || article.m1Quantity || 0}</div>
                      </div>
                      <div>
                        <label className="form-label">M2 (Needs Repair)</label>
                        <div className="text-lg font-semibold text-yellow-600">{checkingFloor.data?.m2Quantity || article.m2Quantity || 0}</div>
                      </div>
                      <div>
                        <label className="form-label">M3 (Minor Defects)</label>
                        <div className="text-lg font-semibold text-orange-600">{checkingFloor.data?.m3Quantity || article.m3Quantity || 0}</div>
                      </div>
                      <div>
                        <label className="form-label">M4 (Major Defects)</label>
                        <div className="text-lg font-semibold text-red-600">{checkingFloor.data?.m4Quantity || article.m4Quantity || 0}</div>
                      </div>
                    </div>

                    {(checkingFloor.data?.repairStatus || article.repairStatus) && (checkingFloor.data?.repairStatus || article.repairStatus) !== 'Not Required' && (
                      <div className="mb-4">
                        <label className="form-label">Repair Status</label>
                        <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                          {checkingFloor.data?.repairStatus || article.repairStatus}
                        </div>
                      </div>
                    )}

                    {(checkingFloor.data?.repairRemarks || article.repairRemarks) && (
                      <div className="mb-4">
                        <label className="form-label">Repair Remarks</label>
                        <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                          {checkingFloor.data?.repairRemarks || article.repairRemarks}
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

                    <div className="flex justify-between items-center text-sm text-gray-600">
                      <div>
                        Remaining: {(checkingFloor.data?.remaining || 0).toLocaleString()}
                      </div>
                      <div>
                        Progress: {Math.round(((checkingFloor.data?.m1Quantity || article.m1Quantity || 0) / (checkingFloor.data?.received || 1)) * 100)}%
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
                          const receivedQty = article.floorQuantities?.checking?.received || 0;
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
          else void handleUpdateSubmit();
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

export default CheckingFloorSupervisorPage;
