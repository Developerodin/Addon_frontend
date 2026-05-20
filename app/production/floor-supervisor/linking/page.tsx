"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import { productionService, ProductionOrder, FloorOrderFilters, type Article } from "@/shared/services/productionService";
import { API_BASE_URL } from "@/shared/data/utilities/api";
import { getArticleMongoId, resolveNextFloorFromProcesses } from "@/shared/utils/productionUtils";
import NumericInput from "@/shared/utils/numericInput";
import ReceivedQuantityDisplay from "@/shared/components/production/ReceivedQuantityDisplay";
import { getRepairInfo } from "@/shared/utils/repairUtils";
import ArticleViewTab from "./components/ArticleViewTab";
import MyTeamTab from "./components/MyTeamTab";
import UpcomingTab from "../components/UpcomingTab";
import { containersMasterService, type ContainerMaster, hasActiveItems, getContainerArticles } from "@/shared/services/containersMasterService";
import { teamMasterService, type TeamMaster, PRODUCTION_FLOORS } from "@/shared/services/teamMasterService";
import { parseProductionArticleQr } from "@/shared/utils/productionArticleQr";
import {
  resolveProductionArticleQrScan,
  type ArticleQrScanFeedback,
} from "@/shared/utils/productionArticleQrScanFlow";
import ArticleQrScanDrawer from "@/shared/components/production/ArticleQrScanDrawer";

const LINKING_ARTICLE_LOOKUP_LIMIT = 2000;
const LINKING_ARTICLE_VIEW_ORDER_LIMIT = 2000;

type LinkingTab = "orders" | "article-view" | "my-team" | "upcoming";

const LinkingFloorSupervisorPage = () => {
  const [activeTab, setActiveTab] = useState<LinkingTab>("article-view");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  /** When set (from article view), modal shows only this article. When null (from orders tab), shows all. */
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [activeUpdateTabIndex, setActiveUpdateTabIndex] = useState(0);
  const [activeViewTabIndex, setActiveViewTabIndex] = useState(0);
  const [updateData, setUpdateData] = useState<{[key: string]: {completedQuantity: number, remarks: string}}>({});
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    linkingType: '',
    floor: ''
  });
  const [showLogsSection, setShowLogsSection] = useState(false);
  const [selectedLogArticleId, setSelectedLogArticleId] = useState<string>('');
  const [articleLogs, setArticleLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  /** Wide linking-floor order fetch shared by Orders + Article tabs. */
  const [articleViewOrders, setArticleViewOrders] = useState<ProductionOrder[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Scan container flow (Article view): barcode -> get container -> show article details -> Accept Article Quantity
  const [showContainerScanDrawer, setShowContainerScanDrawer] = useState(false);
  const [containerScanBarcode, setContainerScanBarcode] = useState("");
  const [containerScanLoading, setContainerScanLoading] = useState(false);
  const [containerScanned, setContainerScanned] = useState<{ container: ContainerMaster; articles: Array<{ article: Article | null; quantity: number }> } | null>(null);
  const [acceptArticleLoading, setAcceptArticleLoading] = useState(false);

  // Active article row (after Accept Article Quantity) – blue border + Assign button
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);

  const [showArticleQrScanDrawer, setShowArticleQrScanDrawer] = useState(false);
  const [articleQrScanLoading, setArticleQrScanLoading] = useState(false);
  const [articleQrScanFeedback, setArticleQrScanFeedback] = useState<ArticleQrScanFeedback | null>(null);
  /** When set, Article view shows only the QR-matched line. */
  const [qrPinnedArticleOrders, setQrPinnedArticleOrders] = useState<ProductionOrder[] | null>(null);

  // Assign drawer: team members (Linking floor), assign to member
  const [showAssignDrawer, setShowAssignDrawer] = useState(false);
  const [assignTeamMembers, setAssignTeamMembers] = useState<TeamMaster[]>([]);
  const [assignTeamLoading, setAssignTeamLoading] = useState(false);
  const [confirmAssignModal, setConfirmAssignModal] = useState<{ teamMemberName: string; teamMemberId: string; articleId: string } | null>(null);
  const [assigningInProgress, setAssigningInProgress] = useState(false);
  const [removingArticleMemberId, setRemovingArticleMemberId] = useState<string | null>(null);

  // Update order: scan container/bag before submit (like knitting)
  const [showUpdateContainerModal, setShowUpdateContainerModal] = useState(false);
  const [updateContainerBarcode, setUpdateContainerBarcode] = useState("");
  const [updateContainerCheckStatus, setUpdateContainerCheckStatus] = useState<"idle" | "loading" | "not-found" | "already-filled" | "ok">("idle");
  const [updateContainerFetched, setUpdateContainerFetched] = useState<{ activeItems?: Array<{ article: string | { articleNumber?: string }; quantity: number }>; activeFloor?: string } | null>(null);
  const [updateContainerArticleId, setUpdateContainerArticleId] = useState("");
  const [updateContainerQuantity, setUpdateContainerQuantity] = useState<string>("");
  const [updateContainerNextFloor, setUpdateContainerNextFloor] = useState("Checking");
  const [updateContainerSubmitting, setUpdateContainerSubmitting] = useState(false);

  /** When false (default): show only articles with remaining > 0. When true: show all with received > 0. */
  const [showAllArticles, setShowAllArticles] = useState(false);

  /**
   * Loads linking floor orders for both tabs; client-side filter/pagination matches Article view rules.
   */
  const loadFloorOrdersCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const apiFilters: FloorOrderFilters = {
        page: 1,
        limit: LINKING_ARTICLE_VIEW_ORDER_LIMIT,
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
        ...(searchQuery && { search: searchQuery }),
      };
      const response = await productionService.getFloorOrders("Linking", apiFilters);
      if (response.success) {
        setArticleViewOrders(response.data.results);
      } else {
        console.error("Failed to load linking floor orders:", response.error);
        toast.error(
          typeof response.error === "object" && response.error && "message" in response.error
            ? String((response.error as { message?: string }).message)
            : "Failed to load linking orders"
        );
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to load linking orders";
      console.error("Error loading linking floor orders:", error);
      toast.error(msg);
    } finally {
      setCatalogLoading(false);
    }
  }, [filters.status, filters.priority, searchQuery]);

  // Reload catalog when Orders or Article tab is active (filters / search)
  useEffect(() => {
    if (activeTab !== "orders" && activeTab !== "article-view") return;
    const timeoutId = setTimeout(() => {
      void loadFloorOrdersCatalog();
    }, searchQuery ? 300 : 0);
    return () => clearTimeout(timeoutId);
  }, [activeTab, loadFloorOrdersCatalog, searchQuery]);

  // When user enters/scans barcode in update container modal, fetch container (multi-article allowed on same floor)
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

  // When article changes in update container modal, pre-fill quantity and next floor from article processes
  useEffect(() => {
    if (!showUpdateContainerModal || !updateContainerArticleId || !selectedOrder) return;
    setUpdateContainerQuantity(String(updateData[updateContainerArticleId]?.completedQuantity ?? 0));
    const mongoId = getArticleMongoId(updateContainerArticleId, selectedOrder.articles);
    if (!mongoId) return;
    let cancelled = false;
    productionService.getArticleProcesses(mongoId).then((res) => {
      if (cancelled) return;
      if (res.success && res.data?.processes) {
        const next = resolveNextFloorFromProcesses(res.data.processes, "Linking", "Checking");
        setUpdateContainerNextFloor(next);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [showUpdateContainerModal, updateContainerArticleId, selectedOrder?.articles]);

  /** Default: remaining > 0. Show all: received > 0 (includes zero remaining). */
  const filterOrdersByReceivedQuantity = (orderList: ProductionOrder[], showAll: boolean): ProductionOrder[] => {
    return orderList.map(order => {
      const filteredArticles = order.articles.filter(article => {
        const received = article.floorQuantities?.linking?.received || 0;
        const transferred = article.floorQuantities?.linking?.transferred || 0;
        const remaining = article.floorQuantities?.linking?.remaining ?? (received - transferred);
        if (showAll) return received > 0;
        return remaining > 0;
      });
      return { ...order, articles: filteredArticles };
    }).filter(order => order.articles.length > 0);
  };

  const filteredOrders = useMemo(
    () => filterOrdersByReceivedQuantity(articleViewOrders, showAllArticles),
    [articleViewOrders, showAllArticles]
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

  const articleTabOrders = qrPinnedArticleOrders ?? articleViewOrders;
  const ordersPageStart = paginatedOrders.length === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1;
  const ordersPageEnd =
    paginatedOrders.length === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + paginatedOrders.length;

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
    setShowUpdateModal(false);
    setShowViewModal(true);
  };

  const handleUpdateOrder = (order: ProductionOrder, article?: Article) => {
    setSelectedOrder(order);
    setSelectedArticleId(article ? (article.id ?? article._id ?? null) : null);
    setActiveUpdateTabIndex(0);
    // Initialize update data with current values
    const initialData: {[key: string]: {completedQuantity: number, remarks: string}} = {};
    order.articles.forEach(article => {
      const articleId = article.id || article._id;
      if (articleId) {
        // Initialize with current completed quantity for cumulative updates
        initialData[articleId] = {
          completedQuantity: article.completedQuantity || 0,
          remarks: article.remarks || ''
        };
      }
    });
    setUpdateData(initialData);
    setShowViewModal(false);
    setShowUpdateModal(true);
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
    setShowUpdateContainerModal(false);
    setUpdateContainerBarcode("");
    setUpdateContainerQuantity("");
    setUpdateContainerCheckStatus("idle");
    setUpdateContainerFetched(null);
  };

  const handleQuantityChange = (articleId: string, value: number) => {
    setUpdateData(prev => ({
      ...prev,
      [articleId]: {
        ...prev[articleId],
        completedQuantity: value
      }
    }));
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

  const handleUpdateSubmit = async () => {
    if (!selectedOrder) return;

    // Validate all quantities before submission
    const invalidArticles = selectedOrder.articles.filter(article => {
      const articleId = article.id || article._id;
      if (!articleId) return false;
      
      const update = updateData[articleId];
      if (!update) return false;
      
      const received = article.floorQuantities?.linking?.received || 0;
      const transferred = article.floorQuantities?.linking?.transferred || 0;
      const remaining = received - transferred;
      
      return update.completedQuantity > remaining;
    });

    if (invalidArticles.length > 0) {
      toast.error('Cannot submit: Some articles have completed quantities exceeding remaining quantities');
      return;
    }

    try {
      setIsLoading(true);
      
      // Update each article that has changes
      const updatePromises = selectedOrder.articles.map(async (article) => {
        const articleId = article.id || article._id;
        if (!articleId) return null;
        
        const update = updateData[articleId];
        if (update && (
          update.completedQuantity !== article.completedQuantity ||
          update.remarks !== (article.remarks || '')
        )) {
          const progressData = {
            completedQuantity: update.completedQuantity,
            remarks: update.remarks
          };
          
          try {
            const response = await productionService.updateArticleProgress(
              'Linking',
              selectedOrder.id,
              article._id || article.id,
              progressData
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
      }
      
      closeUpdateModal();
      
      // Reload orders to get updated data
      void loadFloorOrdersCatalog();
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

  const findArticleInOrders = useCallback((articleId: string): Article | null => {
    const sources = articleViewOrders;
    for (const order of sources) {
      const a = order.articles.find((ar) => (ar._id || ar.id) === articleId);
      if (a) return a;
    }
    return null;
  }, [articleViewOrders]);

  const handleScanContainerClick = () => {
    setContainerScanned(null);
    setContainerScanBarcode("");
    setShowContainerScanDrawer(true);
  };

  const openArticleQrScanDrawer = useCallback(() => {
    setArticleQrScanFeedback(null);
    setShowArticleQrScanDrawer(true);
  }, []);

  const clearQrArticlePin = useCallback(() => {
    setQrPinnedArticleOrders(null);
  }, []);

  const handleArticleQrScan = useCallback(
    async (raw: string): Promise<ArticleQrScanFeedback> => {
      setArticleQrScanLoading(true);
      setArticleQrScanFeedback({ type: "info", message: "Loading Linking orders…" });
      try {
        const response = await productionService.getFloorOrders(
          "Linking",
          { page: 1, limit: LINKING_ARTICLE_LOOKUP_LIMIT },
          { cache: "no-store" }
        );

        if (!response.success) {
          const message =
            response.error?.message ??
            "Could not load Linking orders. Check API connection and try again.";
          setArticleQrScanFeedback({ type: "error", message });
          toast.error(message, { duration: 6000 });
          return { type: "error", message };
        }

        const allOrders = response.data.results ?? [];
        if (allOrders.length === 0) {
          const message =
            "No orders returned for Linking. The article may not be on this floor yet.";
          setArticleQrScanFeedback({ type: "error", message });
          toast.error(message, { duration: 6000 });
          return { type: "error", message };
        }

        setArticleViewOrders(allOrders);
        const lookupOrders = filterOrdersByReceivedQuantity(allOrders, true);
        const resolved = resolveProductionArticleQrScan(
          raw,
          allOrders,
          lookupOrders,
          "linking",
          "Linking"
        );

        setArticleQrScanFeedback(resolved.feedback);

        if (resolved.status !== "found") {
          toast.error(resolved.feedback.message, { duration: 6000 });
          return resolved.feedback;
        }

        setQrPinnedArticleOrders(resolved.singleArticleOrders);
        setShowAllArticles(true);
        setActiveTab("article-view");
        setActiveArticleId(String(resolved.article._id ?? resolved.article.id));
        toast.success(resolved.feedback.message, { duration: 4000 });
        window.setTimeout(() => setShowArticleQrScanDrawer(false), 500);
        return resolved.feedback;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to look up article from QR scan.";
        const feedback: ArticleQrScanFeedback = { type: "error", message };
        setArticleQrScanFeedback(feedback);
        toast.error(message, { duration: 6000 });
        return feedback;
      } finally {
        setArticleQrScanLoading(false);
      }
    },
    []
  );

  const normalizeFloor = (f: string | undefined) => (f ?? "").replace(/\s+/g, "").toLowerCase();
  const containerBelongsToCurrentFloor =
    containerScanned && normalizeFloor(containerScanned.container.activeFloor) === normalizeFloor("Linking");

  const handleGetContainerByBarcode = async () => {
    const barcode = containerScanBarcode.trim();
    if (!barcode) return;

    if (parseProductionArticleQr(barcode)) {
      setContainerScanLoading(true);
      setArticleQrScanFeedback(null);
      const feedback = await handleArticleQrScan(barcode);
      setContainerScanLoading(false);
      if (feedback.type === "success") {
        setShowContainerScanDrawer(false);
        setContainerScanBarcode("");
      }
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
      if (normalizeFloor(container.activeFloor) !== normalizeFloor("Linking")) {
        toast.error(`This container belongs to "${container.activeFloor ?? "unknown"}", not Linking. Accept Article disabled.`);
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
      const data = await teamMasterService.list({ workingFloor: "Linking", limit: 200 });
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
      // Optimistic update so "Article received" shows even if list doesn't return articleData
      setAssignTeamMembers((prev) =>
        prev.map((m) =>
          m._id === confirmAssignModal.teamMemberId
            ? { ...m, articleData: [...(m.articleData || []), { activeArticle: confirmAssignModal.articleId }] }
            : m
        )
      );
      // Refetch to stay in sync with backend
      const data = await teamMasterService.list({ workingFloor: "Linking", limit: 200 });
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
      const data = await teamMasterService.list({ workingFloor: "Linking", limit: 200 });
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

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Linking Floor Supervisor Dashboard"/>

      <div className="bg-white shadow-sm border border-gray-300 overflow-hidden mx-0">
        <div className="p-[10px]">
          {/* Page Header - design spec + knitting style */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
              <h1 className="text-sm font-bold text-gray-800">Linking Floor Supervisor</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {filteredOrders.length}
              </span>
              <HelpIcon
                title="Linking Floor Supervisor Dashboard"
                content={
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-lg mb-2">What is this page?</h4>
                      <p className="text-gray-700">
                        This is the Linking Floor Supervisor Dashboard where you can view and update production orders that are currently on the Linking floor.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-2">What can you do here?</h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        <li><strong>View Orders:</strong> See all orders with articles on the Linking floor</li>
                        <li><strong>Track Quantities:</strong> Monitor planned, received from knitting, and completed quantities</li>
                        <li><strong>Update Progress:</strong> Click &quot;Update&quot; to modify completed quantities and add remarks</li>
                        <li><strong>Add Remarks:</strong> Add notes and comments for each article</li>
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
              <span className="text-sm font-bold text-blue-900">{articleViewOrders.filter(o => o.status === 'In Progress').length}</span>
            </div>
            <div className="bg-green-50 border border-green-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Completed</span>
              <span className="text-sm font-bold text-green-900">{articleViewOrders.filter(o => o.status === 'Completed').length}</span>
            </div>
            <div className="bg-yellow-50 border border-yellow-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-yellow-700 uppercase tracking-wide">Pending</span>
              <span className="text-sm font-bold text-yellow-900">{articleViewOrders.filter(o => o.status === 'Pending').length}</span>
            </div>
            <div className="bg-red-50 border border-red-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-red-700 uppercase tracking-wide">On Hold</span>
              <span className="text-sm font-bold text-red-900">{articleViewOrders.filter(o => o.status === 'On Hold').length}</span>
            </div>
          </div>

          {/* Tabs: Orders | Article view | My Team */}
          <div className="flex items-center justify-between border-b border-gray-300 mb-0">
            <div className="flex">
              <button
                type="button"
                className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${activeTab === "orders" ? "border-purple-600 text-purple-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                onClick={() => setActiveTab("orders")}
              >
                Orders
              </button>
              <button
                type="button"
                className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${activeTab === "article-view" ? "border-purple-600 text-purple-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                onClick={() => setActiveTab("article-view")}
              >
                Article view
              </button>
              <button
                type="button"
                className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${activeTab === "my-team" ? "border-purple-600 text-purple-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                onClick={() => setActiveTab("my-team")}
              >
                My Team
              </button>
              <button
                type="button"
                className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${activeTab === "upcoming" ? "border-purple-600 text-purple-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                onClick={() => setActiveTab("upcoming")}
              >
                Upcoming
              </button>
            </div>
            <label className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-gray-700 border border-gray-200 rounded bg-white cursor-pointer hover:bg-gray-50 mr-2">
              <input
                type="checkbox"
                checked={showAllArticles}
                onChange={(e) => {
                  setShowAllArticles(e.target.checked);
                  if (!e.target.checked) clearQrArticlePin();
                }}
                className="rounded border-gray-300"
              />
              Show all
            </label>
          </div>
        </div>

        {/* Content */}
        <div className="min-h-[300px]">
          {activeTab === "my-team" ? (
            <MyTeamTab />
          ) : activeTab === "upcoming" ? (
            <UpcomingTab floorName="Linking" />
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
              onScanLabelQrClick={openArticleQrScanDrawer}
              showAllArticles={showAllArticles}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={handleItemsPerPageChange}
              qrScanPinned={Boolean(qrPinnedArticleOrders)}
              onClearQrScanFilter={clearQrArticlePin}
            />
          ) : (
            <>
          <div className="p-[10px] flex flex-wrap items-center gap-2 border-b border-gray-300">
            <button
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border transition-colors ${showFilters ? 'bg-purple-600 text-white border-purple-600' : 'bg-white border-gray-300 text-[#495057] hover:bg-gray-50'}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <i className="ri-filter-3-line text-xs"></i> Filters {hasActiveFilters && <span className="ml-1">●</span>}
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[11px] font-bold rounded hover:bg-gray-50"
                onClick={clearFilters}
              >
                <i className="ri-close-line text-xs"></i> Clear
              </button>
            )}
            <div className="relative flex-1 min-w-[140px] max-w-[240px]">
              <input
                type="text"
                className="bg-white border border-gray-300 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-1 focus:ring-purple-300 focus:border-purple-500 w-full placeholder:text-gray-400 font-medium"
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

          {catalogLoading && articleViewOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50"></div>
              <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading</p>
            </div>
          ) : articleViewOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-file-list-line text-xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">NO ORDERS FOUND</h3>
              <p className="text-[10px] text-gray-500">
                {hasActiveFilters ? 'Try adjusting filters or search' : 'No orders on Linking floor'}
              </p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-file-list-line text-xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">NO ORDERS WITH REMAINING QTY</h3>
              <p className="text-[10px] text-gray-500">Turn on Show all to include orders with zero remaining on Linking</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50/30">
                    <th className="pl-[10px] pr-1 py-2.5 w-10 border border-gray-300">
                      <input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="rounded border-gray-300 text-purple-600 focus:ring-0 h-3.5 w-3.5" />
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
                        <input type="checkbox" checked={selectedOrders.includes(order.id)} onChange={() => handleOrderSelect(order.id)} className="rounded border-gray-300 text-purple-600 focus:ring-0 h-3.5 w-3.5" />
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-300">
                        <div className="text-[12px] font-bold text-gray-900">{order.orderNumber || order.id}</div>
                        {order.orderNote && <span className="text-[10px] text-gray-500">({order.orderNote})</span>}
                        <div className="text-[10px] text-gray-500">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : (order.articles?.[0]?.createdAt ? new Date(order.articles[0].createdAt).toLocaleDateString() : 'N/A')}</div>
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-300">
                        <div className="text-[12px] font-medium text-gray-600">{order.articles.length} Article{order.articles.length !== 1 ? 's' : ''} · Qty {order.articles.reduce((s, a) => s + (a.plannedQuantity || 0), 0).toLocaleString()}</div>
                        {order.articles.some(a => a.floorQuantities?.linking) && (
                          <div className="text-[10px] text-blue-600 mt-0.5">
                            R:{order.articles.reduce((s, a) => s + (a.floorQuantities?.linking?.received || 0), 0)} Trf:{order.articles.reduce((s, a) => s + (a.floorQuantities?.linking?.transferred || 0), 0)} Rem:{order.articles.reduce((s, a) => s + (a.floorQuantities?.linking?.remaining || 0), 0)}
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
                    <button key={pageNum} onClick={() => handlePageChange(pageNum)} className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded ${safeCurrentPage === pageNum ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>{pageNum}</button>
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

      {/* Container scan drawer – design spec: 10px padding, text-sm title */}
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
                  <label className="block text-[11px] font-medium text-[#495057]">Label QR or container barcode</label>
                  <input
                    type="text"
                    placeholder="Scan article label QR or container barcode"
                    value={containerScanBarcode}
                    onChange={(e) => setContainerScanBarcode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGetContainerByBarcode()}
                    className="w-full border border-gray-200 rounded pl-3 pr-3 py-1.5 text-[11px] font-medium focus:ring-0 focus:border-purple-300 placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    disabled={!containerScanBarcode.trim() || containerScanLoading}
                    onClick={handleGetContainerByBarcode}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm w-full"
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
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                      Container belongs to another floor. Accept disabled.
                    </p>
                  )}
                  {containerScanned.articles.length > 0 ? (
                    <button
                      type="button"
                      disabled={acceptArticleLoading || !containerBelongsToCurrentFloor}
                      onClick={handleAcceptArticleQuantity}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {acceptArticleLoading ? "Accepting..." : "Accept container"}
                    </button>
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

      {/* Assign drawer – design spec */}
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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
                  <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading</p>
                </div>
              ) : assignTeamMembers.length === 0 ? (
                <p className="text-[11px] text-[#495057]">No team members on Linking floor.</p>
              ) : (
                <ul className="space-y-2">
                  {assignTeamMembers.map((member) => {
                    const hasActiveArticle = Boolean(
                      activeArticleId && member.articleData?.some((d) => d.activeArticle === activeArticleId)
                    );
                    return (
                      <li key={member._id} className="flex items-center justify-between gap-2 p-2 border border-gray-200 rounded hover:bg-gray-50">
                        <div>
                          <span className="text-[12px] font-medium text-gray-900">{member.teamMemberName}</span>
                          <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold ${member.role === "Supervisor" ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-gray-50 text-gray-600 border border-gray-200"}`}>{member.role}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {hasActiveArticle ? (
                            <button
                              type="button"
                              onClick={() => handleArticleReceived(member)}
                              disabled={removingArticleMemberId === member._id}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm disabled:opacity-50"
                            >
                              {removingArticleMemberId === member._id ? "..." : "Article received"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAssignToMember(member)}
                              disabled={!activeArticleId}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm disabled:opacity-50"
                            >
                              Assign
                            </button>
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

      {/* Confirm assign modal – design spec */}
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
              <button type="button" onClick={handleConfirmAssign} disabled={assigningInProgress} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 shadow-sm">
                {assigningInProgress ? "Assigning..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order drawer (Update / View) — design spec: 10px padding, text-sm title, same table/button styles */}
      {(showUpdateModal || showViewModal) && selectedOrder && (() => {
        const modalArticles = selectedArticleId
          ? selectedOrder.articles.filter((a) => (a.id ?? a._id) === selectedArticleId)
          : selectedOrder.articles;
        return (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => { closeUpdateModal(); closeViewModal(); }} aria-hidden />
          <div className="fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-xl z-50 flex flex-col overflow-hidden animate-slide-in-right">
            <div className="flex-1 overflow-y-auto flex flex-col">
              {showUpdateModal && (
                <>
            <div className="flex items-center justify-between p-[10px] border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-800">Update Order — {selectedOrder.orderNumber}</h3>
              <button onClick={closeUpdateModal} className="text-gray-500 hover:text-gray-700 p-1">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="p-[10px] overflow-auto">
            <div className="grid grid-cols-2 gap-2 mb-3 p-2 bg-gray-50 rounded border border-gray-200">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Priority</label>
                <div className="mt-0.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${getPriorityBadge(selectedOrder.priority)}`}>{selectedOrder.priority}</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Status</label>
                <div className="mt-0.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${getStatusBadge(selectedOrder.status)}`}>{selectedOrder.status}</span>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-3 text-[11px] text-blue-800">
              <i className="ri-information-line me-1"></i>
              <strong>Note:</strong> Enter the total cumulative completed quantity. The system will calculate the difference from the previous amount.
            </div>
            <div className="border border-gray-200 rounded overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200 text-[12px]">
                  <thead className="bg-gray-50/30">
                    <tr>
                      <th className="pl-[10px] pr-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 whitespace-nowrap">Article</th>
                      <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase border border-gray-200 whitespace-nowrap">Planned</th>
                      <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase border border-gray-200 whitespace-nowrap">Received</th>
                      <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase border border-gray-200 whitespace-nowrap">Transferred</th>
                      <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase border border-gray-200 whitespace-nowrap">Remaining</th>
                      <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase border border-gray-200 whitespace-nowrap bg-yellow-50">Linking Completed *</th>
                      <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase border border-gray-200 pr-[10px] whitespace-nowrap">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {modalArticles.map((article, idx) => {
                      const articleId = article.id || article._id;
                      if (!articleId) return null;
                      const currentUpdateData = updateData[articleId] || { completedQuantity: article.completedQuantity || 0, remarks: article.remarks || '' };
                      const plannedQty = article.plannedQuantity || 0;
                      const receivedQty = article.floorQuantities?.linking?.received || 0;
                      const transferredQty = article.floorQuantities?.linking?.transferred || 0;
                      const remainingQty = receivedQty - transferredQty;
                      const isFullyTransferred = remainingQty <= 0;
                      const availableLogs = (selectedLogArticleId === articleId && articleLogs.length > 0) ? articleLogs : ((article as any).logs || []);
                      const repairInfo = getRepairInfo(article.floorQuantities?.linking, availableLogs, 'Linking');
                      return (
                        <tr key={articleId} className="hover:bg-gray-50/50">
                          <td className="pl-[10px] pr-1.5 py-2 border border-gray-200">
                            <div className="text-[12px] font-medium text-gray-900">{article.articleNumber || `Article ${idx + 1}`}</div>
                            <div className="text-[10px] text-gray-500 mt-0.5">{article.linkingType || 'N/A'}</div>
                          </td>
                          <td className="px-1.5 py-2 text-center border border-gray-200 text-[12px] text-gray-700">{plannedQty.toLocaleString()}</td>
                          <td className="px-1.5 py-2 border border-gray-200 align-top min-w-[100px]">
                            <ReceivedQuantityDisplay received={receivedQty} repairReceived={repairInfo.repairReceived} repairFromFloor={repairInfo.repairFromFloor || undefined} />
                          </td>
                          <td className="px-1.5 py-2 text-center border border-gray-200 text-[12px] text-green-600 font-medium">{transferredQty.toLocaleString()}</td>
                          <td className="px-1.5 py-2 text-center border border-gray-200 text-[12px] text-orange-600 font-medium">{remainingQty.toLocaleString()}</td>
                          <td className="px-1.5 py-2 border border-gray-200 bg-yellow-50">
                            <div className="flex flex-col gap-1">
                              <NumericInput
                                className={`py-1 text-[11px] h-7 border border-gray-200 rounded focus:ring-0 focus:border-purple-300 ${isFullyTransferred ? 'bg-gray-100 cursor-not-allowed' : currentUpdateData.completedQuantity > remainingQty ? 'border-red-500 focus:border-red-500' : ''}`}
                                value={currentUpdateData.completedQuantity}
                                onChange={(value) => { if (!isFullyTransferred && value <= remainingQty) handleQuantityChange(articleId, value); }}
                                placeholder={isFullyTransferred ? 'Fully Transferred' : `Max: ${remainingQty}`}
                                disabled={isFullyTransferred}
                                allowDecimals
                              />
                              {isFullyTransferred ? <div className="text-green-600 text-[10px] font-medium">✓ All transferred</div> : currentUpdateData.completedQuantity > remainingQty ? <div className="text-red-500 text-[10px]">Max: {remainingQty}</div> : null}
                            </div>
                          </td>
                          <td className="px-1.5 py-2 pr-[10px] border border-gray-200">
                            <textarea className="w-full py-1 px-2 text-[11px] border border-gray-200 rounded focus:ring-0 focus:border-purple-300 h-7 resize-none" rows={1} placeholder="Remarks..." value={currentUpdateData.remarks} onChange={(e) => handleRemarksChange(articleId, e.target.value)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-200 p-[10px]">
              <button onClick={closeUpdateModal} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 shadow-sm" disabled={isLoading}>Cancel</button>
              <button
                onClick={() => {
                  if (!selectedOrder) return;
                  const invalid = modalArticles.some(article => {
                    const articleId = article.id || article._id;
                    if (!articleId) return false;
                    const update = updateData[articleId];
                    if (!update) return false;
                    const received = article.floorQuantities?.linking?.received || 0;
                    const transferred = article.floorQuantities?.linking?.transferred || 0;
                    const remaining = received - transferred;
                    return update.completedQuantity > remaining;
                  });
                  if (invalid) {
                    toast.error("Cannot submit: Some articles have completed quantities exceeding remaining quantities");
                    return;
                  }
                  const firstWithQty = modalArticles.find((a) => { const id = a.id ?? a._id; return id && (updateData[id]?.completedQuantity ?? 0) > 0; });
                  if (!firstWithQty) { toast.error("Enter at least one article with linking completed quantity"); return; }
                  setUpdateContainerBarcode("");
                  setUpdateContainerCheckStatus("idle");
                  setUpdateContainerFetched(null);
                  const firstId = firstWithQty.id ?? firstWithQty._id ?? "";
                  setUpdateContainerArticleId(firstId);
                  setUpdateContainerQuantity(String(updateData[firstId]?.completedQuantity ?? 0));
                  setUpdateContainerNextFloor("Checking");
                  setShowUpdateContainerModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 shadow-sm"
                disabled={isLoading || modalArticles.some(article => {
                  const articleId = article.id || article._id;
                  if (!articleId) return false;
                  const update = updateData[articleId];
                  if (!update) return false;
                  const received = article.floorQuantities?.linking?.received || 0;
                  const transferred = article.floorQuantities?.linking?.transferred || 0;
                  const remaining = received - transferred;
                  return update.completedQuantity > remaining;
                }) || !modalArticles.some((a) => (updateData[a.id ?? a._id ?? ""]?.completedQuantity ?? 0) > 0)}
              >
                <i className="ri-save-line text-xs"></i>
                Update Order
              </button>
            </div>
            </div>
                </>
              )}
              {showViewModal && (
                <>
            <div className="flex items-center justify-between p-[10px] border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-800">View Order — {selectedOrder.orderNumber}</h3>
              <button onClick={closeViewModal} className="text-gray-500 hover:text-gray-700 p-1">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="p-[10px] overflow-auto">
            <div className="grid grid-cols-2 gap-2 mb-3 p-2 bg-gray-50 rounded border border-gray-200">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Priority</label>
                <div className="mt-0.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${getPriorityBadge(selectedOrder.priority)}`}>{selectedOrder.priority}</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Status</label>
                <div className="mt-0.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${getStatusBadge(selectedOrder.status)}`}>{selectedOrder.status}</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider">Article Details</h4>
                <button onClick={() => setShowLogsSection(!showLogsSection)} className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded min-w-[100px] ${showLogsSection ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-white border border-gray-200 text-[#495057] hover:bg-gray-50'}`}>
                  <i className="ri-file-list-line text-xs me-1"></i>{showLogsSection ? 'Hide Logs' : 'Logs'}
                </button>
              </div>
              <div className="border border-gray-200 rounded overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200 text-[12px]">
                    <thead className="bg-gray-50/30">
                      <tr>
                        <th className="pl-[10px] pr-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 whitespace-nowrap">Article</th>
                        <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase border border-gray-200 whitespace-nowrap">Planned</th>
                        <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase border border-gray-200 whitespace-nowrap">Received</th>
                        <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase border border-gray-200 whitespace-nowrap">Completed</th>
                        <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase border border-gray-200 whitespace-nowrap">Transferred</th>
                        <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase border border-gray-200 whitespace-nowrap">Remaining</th>
                        <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase border border-gray-200 whitespace-nowrap">Progress</th>
                        <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase border border-gray-200 pr-[10px] whitespace-nowrap">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {modalArticles.map((article, idx) => {
                        const plannedQty = article.plannedQuantity || 0;
                        const receivedQty = article.floorQuantities?.linking?.received || 0;
                        const completedQty = article.completedQuantity || 0;
                        const transferredQty = article.floorQuantities?.linking?.transferred || 0;
                        const remainingQty = article.floorQuantities?.linking?.remaining ?? (receivedQty - transferredQty);
                        const progress = receivedQty > 0 ? Math.round((completedQty / receivedQty) * 100) : 0;
                        const articleId = article.id || article._id;
                        const availableLogs = (selectedLogArticleId === articleId && articleLogs.length > 0) ? articleLogs : ((article as any).logs || []);
                        const repairInfo = getRepairInfo(article.floorQuantities?.linking, availableLogs, 'Linking');
                        return (
                          <tr key={article.id || article._id} className="hover:bg-gray-50/50">
                            <td className="pl-[10px] pr-1.5 py-2 border border-gray-200">
                              <div className="text-[12px] font-medium text-gray-900">{article.articleNumber || `Article ${idx + 1}`}</div>
                              <div className="text-[10px] text-gray-500 mt-0.5">{article.linkingType || 'N/A'}</div>
                              {article.priority && <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium mt-0.5 ${getPriorityBadge(article.priority)}`}>{article.priority}</span>}
                            </td>
                            <td className="px-1.5 py-2 text-center border border-gray-200 text-[12px] text-gray-700">{plannedQty.toLocaleString()}</td>
                            <td className="px-1.5 py-2 border border-gray-200 align-top min-w-[100px]">
                              <ReceivedQuantityDisplay received={receivedQty} repairReceived={repairInfo.repairReceived} repairFromFloor={repairInfo.repairFromFloor || undefined} />
                            </td>
                            <td className="px-1.5 py-2 text-center border border-gray-200 text-[12px] text-green-600 font-medium">{completedQty.toLocaleString()}</td>
                            <td className="px-1.5 py-2 text-center border border-gray-200 text-[12px] text-green-600 font-medium">{transferredQty.toLocaleString()}</td>
                            <td className="px-1.5 py-2 text-center border border-gray-200 text-[12px] text-orange-600 font-medium">{remainingQty.toLocaleString()}</td>
                            <td className="px-1.5 py-2 text-center border border-gray-200 text-[12px]">{progress}%</td>
                            <td className="px-1.5 py-2 pr-[10px] border border-gray-200">{article.remarks ? <div className="text-[12px] text-gray-700 max-w-xs truncate" title={article.remarks}>{article.remarks}</div> : <span className="text-gray-400 text-[11px]">-</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              {showLogsSection && (
                <div className="border border-gray-200 rounded p-2 bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="text-[11px] font-bold text-gray-800">Article Logs {articleLogs.length > 0 && `(${articleLogs.length})`}</h5>
                    <select className="bg-white border border-gray-200 text-[11px] font-medium rounded px-2 py-1.5 w-48" value={selectedLogArticleId} onChange={(e) => handleLogsArticleSelect(e.target.value)}>
                      <option value="">Choose article...</option>
                      {modalArticles.map((article) => {
                        const aid = article._id || article.id;
                        const r = article.floorQuantities?.linking?.received || 0;
                        return <option key={aid} value={aid}>{article.articleNumber || `Article ${aid}`} (R:{r})</option>;
                      })}
                    </select>
                  </div>
                  {logsLoading ? (
                    <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50"></div></div>
                  ) : selectedLogArticleId && articleLogs.length > 0 ? (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {articleLogs.map((log, index) => (
                        <div key={log._id || log.id || index} className="border border-gray-200 rounded p-2 bg-white text-[11px]">
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded font-medium text-[10px] ${log.action === 'Quality Inspection' ? 'bg-yellow-100 text-yellow-800' : log.action === 'Transferred to Final Checking' ? 'bg-purple-100 text-purple-800' : log.action === 'Transferred to Washing' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{log.action || 'ACTION'}</span>
                            <span className="text-gray-500 text-[10px]">{log.timestamp ? new Date(log.timestamp).toLocaleString() : log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}</span>
                          </div>
                          {log.fromFloor && log.toFloor && <div className="text-gray-600 text-[11px]">{log.fromFloor} → {log.toFloor}</div>}
                          {log.quantity > 0 && <div className="text-gray-600 text-[11px]">Qty: {log.quantity}</div>}
                          {log.remarks && <div className="text-gray-700 mt-1 text-[11px]">{log.remarks}</div>}
                          <div className="text-gray-500 mt-1 text-[10px]">{log.userId || 'System'}</div>
                        </div>
                      ))}
                    </div>
                  ) : selectedLogArticleId && articleLogs.length === 0 ? (
                    <div className="text-center py-6 text-[11px] text-gray-500">No logs for this article</div>
                  ) : (
                    <div className="text-center py-6 text-[11px] text-gray-500">Select an article to view logs</div>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end p-[10px] border-t border-gray-200">
              <button onClick={closeViewModal} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 shadow-sm">Close</button>
            </div>
            </div>
                </>
              )}
            </div>
          </div>
        </>
        );
      })()}

      {/* Scan container/bag before update – like knitting */}
      {showUpdateContainerModal && selectedOrder && (() => {
        const modalArticles = selectedArticleId ? selectedOrder.articles.filter((a) => (a.id ?? a._id) === selectedArticleId) : selectedOrder.articles;
        const articlesWithQty = modalArticles
          .map((a) => {
            const id = a.id ?? a._id;
            if (!id) return null;
            const qty = updateData[id]?.completedQuantity ?? 0;
            return qty > 0 ? { article: a, quantity: qty } : null;
          })
          .filter((x): x is { article: Article; quantity: number } => Boolean(x));
        const firstWithQty = articlesWithQty[0];
        const nextFloor = firstWithQty ? (updateContainerNextFloor || "Checking") : "";
        return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={() => { setShowUpdateContainerModal(false); setUpdateContainerCheckStatus("idle"); setUpdateContainerFetched(null); }} aria-hidden>
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-sm p-[10px] flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-2">Scan bag / container</h4>
            <p className="text-[11px] text-[#495057]">Scan container for linking completed articles. All articles with completed qty will be added.</p>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Container barcode</label>
              <input type="text" placeholder="Scan or enter barcode" value={updateContainerBarcode} onChange={(e) => setUpdateContainerBarcode(e.target.value)} className="w-full border border-gray-200 rounded px-3 py-1.5 text-[11px] focus:ring-0 focus:border-purple-300" />
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
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Articles to add</label>
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
              <button type="button" disabled={updateContainerCheckStatus !== "ok" || !updateContainerBarcode.trim() || !nextFloor || articlesWithQty.length === 0 || updateContainerSubmitting} onClick={async () => {
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
              }} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 disabled:opacity-50">
                {updateContainerSubmitting ? <span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" /> : <i className="ri-save-line text-xs" />}
                Update & submit order
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      <ArticleQrScanDrawer
        open={showArticleQrScanDrawer}
        floorLabel="Linking"
        loading={articleQrScanLoading}
        feedback={articleQrScanFeedback}
        onClose={() => {
          setShowArticleQrScanDrawer(false);
          setArticleQrScanFeedback(null);
        }}
        onScan={handleArticleQrScan}
      />

    </div>
  );
};

export default LinkingFloorSupervisorPage;
