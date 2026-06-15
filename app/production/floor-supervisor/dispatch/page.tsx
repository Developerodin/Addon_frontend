"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import { productionService, ProductionOrder, FloorOrderFilters, Article, type ArticleProcess } from "@/shared/services/productionService";
import { getProductsByFactoryCodes } from "@/shared/services/productService";

type ArticleWithProcesses = Article & { processes?: ArticleProcess[] };
import { API_BASE_URL } from "@/shared/data/utilities/api";
import { getArticleMongoId, resolveNextFloorFromProcesses } from "@/shared/utils/productionUtils";
import ReceivedQuantityDisplay from "@/shared/components/production/ReceivedQuantityDisplay";
import ArticleViewTab from "./components/ArticleViewTab";
import OrderDispatchBreakdownCell from "./components/OrderDispatchBreakdownCell";
import MyTeamTab from "./components/MyTeamTab";
import { TransferNotePrintModal } from "./components/TransferNotePrintModal";
import { TransferNoteHistoryTab } from "./components/TransferNoteHistoryTab";
import UpcomingTab from "../components/UpcomingTab";
import BrandTransferItemsInput from "@/shared/components/production/BrandTransferItemsInput";
import {
  buildBrandOptionsFromProduct,
  buildBrandOptionsFromRows,
  collapseLinesByBrand,
  formatBrandLine,
  getDispatchBrandDisplay,
  toBrandOnlyTransferItems,
  validateBrandTransferItems,
} from "@/shared/utils/brandTransfer.util";
import { HALF_STEP_QTY_ERROR } from "@/shared/utils/halfStepQuantity";
import {
  containersMasterService,
  hasActiveItems,
  buildStagedActiveItemsPayload,
  groupContainerArticlesForDisplay,
  type ContainerActiveItem,
} from "@/shared/services/containersMasterService";
import { useProductionArticleQrScan } from "@/shared/hooks/useProductionArticleQrScan";
import ArticleQrScanDrawer from "@/shared/components/production/ArticleQrScanDrawer";
import { teamMasterService, type TeamMaster, PRODUCTION_FLOORS } from "@/shared/services/teamMasterService";

type DispatchTab = "orders" | "article-view" | "my-team" | "upcoming" | "transfer-notes";

const FLOOR_CATALOG_LIMIT = 2000;

interface ArticleLog {
  id: string;
  date: string; // YYYY-MM-DD
  action: string; // e.g., "Transferred to Branding"
  quantity: number;
  fromFloor?: string;
  toFloor?: string;
  remarks?: string;
}

const DispatchFloorSupervisorPage = () => {
  const user = useSelector((state: any) => state.auth?.user);
  const [floorCatalog, setFloorCatalog] = useState<ProductionOrder[]>([]);
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
  const [updateData, setUpdateData] = useState<{
    [key: string]: {
      remarks: string;
      transferItems: Array<{ transferred: number; styleCode?: string; brand?: string }>;
    };
  }>({});
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
  const [activeTab, setActiveTab] = useState<DispatchTab>("article-view");
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

  // Print modal state
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [transferNoteRefreshKey, setTransferNoteRefreshKey] = useState(0);

  /** Per-article product catalog brands (fallback when dispatch receivedData has no brand breakdown) */
  const [articleProductBrandOptions, setArticleProductBrandOptions] = useState<Record<string, Array<{ brand: string }>>>({});
  const [articleProductBrandsLoading, setArticleProductBrandsLoading] = useState(false);

  const productBrandsByArticleId = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const [articleId, opts] of Object.entries(articleProductBrandOptions)) {
      map[articleId] = opts.map((o) => o.brand);
    }
    return map;
  }, [articleProductBrandOptions]);

  /** Batch-load product catalog brands for all articles on the dispatch floor. */
  const loadProductBrandsForCatalog = useCallback(async (orders: ProductionOrder[]) => {
    const articles = orders.flatMap((o) => o.articles);
    const factoryCodes = Array.from(
      new Set(articles.map((a) => a.articleNumber?.trim()).filter(Boolean) as string[])
    );
    if (!factoryCodes.length) {
      setArticleProductBrandOptions({});
      return;
    }

    setArticleProductBrandsLoading(true);
    try {
      const brandsByFactory = new Map<string, Array<{ brand: string }>>();
      const CHUNK_SIZE = 500;
      for (let i = 0; i < factoryCodes.length; i += CHUNK_SIZE) {
        const chunk = factoryCodes.slice(i, i + CHUNK_SIZE);
        const products = await getProductsByFactoryCodes(chunk);
        for (const product of products) {
          const fc = String(product.factoryCode ?? "").trim().toLowerCase();
          const opts = buildBrandOptionsFromProduct(
            (product as { styleCodes?: unknown[] }).styleCodes
          );
          if (fc && opts.length > 0) brandsByFactory.set(fc, opts);
        }
      }

      const opts: Record<string, Array<{ brand: string }>> = {};
      for (const article of articles) {
        const articleId = article.id || article._id;
        const fc = String(article.articleNumber ?? "").trim().toLowerCase();
        if (articleId && fc && brandsByFactory.has(fc)) {
          opts[articleId] = brandsByFactory.get(fc)!;
        }
      }
      setArticleProductBrandOptions(opts);
    } catch (error) {
      console.error("Failed to load product catalog brands:", error);
    } finally {
      setArticleProductBrandsLoading(false);
    }
  }, []);

  /** When false (default): article view lists only articles with dispatch remaining > 0. When true: all with received > 0. */
  const [showAllArticles, setShowAllArticles] = useState(false);

  /** Loads dispatch floor orders for both tabs; filter + paginate client-side. */
  const loadFloorOrdersCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const apiFilters: FloorOrderFilters = {
        page: 1,
        limit: FLOOR_CATALOG_LIMIT,
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
        ...(searchQuery && { search: searchQuery }),
      };

      const response = await productionService.getFloorOrders("Dispatch", apiFilters);

      if (response.success) {
        setFloorCatalog(response.data.results);
      } else {
        console.error("Failed to load dispatch orders:", response.error);
        toast.error("Failed to load dispatch orders");
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to load dispatch orders";
      console.error("Error loading dispatch orders:", error);
      toast.error(msg);
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

  useEffect(() => {
    if (activeTab !== "orders" && activeTab !== "article-view") return;
    if (floorCatalog.length === 0) {
      setArticleProductBrandOptions({});
      return;
    }
    void loadProductBrandsForCatalog(floorCatalog);
  }, [floorCatalog, activeTab, loadProductBrandsForCatalog]);

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
        const next = resolveNextFloorFromProcesses(res.data.processes, "Dispatch", "Warehouse");
        setUpdateContainerNextFloor(next);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [showUpdateContainerModal, updateContainerArticleId, selectedOrder?.articles]);

  /**
   * Article view / orders list slice: default remaining > 0 on Dispatch; show-all uses received > 0.
   * @param orders - Raw floor orders
   * @param showAll - If true, include articles with dispatch received > 0; else only remaining > 0
   */
  const filterOrdersByReceivedQuantity = (orders: ProductionOrder[], showAll: boolean): ProductionOrder[] => {
    return orders.map((order) => {
      const filteredArticles = order.articles.filter((article) => {
        const received = article.floorQuantities?.dispatch?.received || 0;
        const transferred = article.floorQuantities?.dispatch?.transferred || 0;
        const remaining = article.floorQuantities?.dispatch?.remaining ?? (received - transferred);
        if (showAll) return received > 0;
        return remaining > 0;
      });
      return { ...order, articles: filteredArticles };
    }).filter((order) => order.articles.length > 0);
  };

  /** Max M1 user can transfer = remaining (from backend). */
  const getActualRemainingForArticle = (article: Article): number => {
    const fc = article.floorQuantities?.dispatch;
    const received = fc?.received || 0;
    const transferred = fc?.transferred || 0;
    return Math.max(0, fc?.remaining ?? (received - transferred));
  };

  /**
   * Brand options and per-brand caps from dispatch receivedData vs already transferred.
   * Falls back to product catalog brands when received qty exists but no line breakdown.
   */
  const getDispatchBrandTransferOptions = (article: Article) => {
    const fc = article.floorQuantities?.dispatch;
    const receivedData = fc?.receivedData ?? [];
    const transferredData = fc?.transferredData ?? [];
    const fromRows = buildBrandOptionsFromRows(receivedData, transferredData);
    const remaining = getActualRemainingForArticle(article);

    if (fromRows.options.length === 0 && (fc?.received ?? 0) > 0 && remaining > 0) {
      const articleId = article.id || article._id || "";
      const productBrands = articleProductBrandOptions[articleId] ?? [];
      if (productBrands.length > 0) {
        const brandMaxQuantities: Record<string, number> = {};
        for (const o of productBrands) {
          brandMaxQuantities[o.brand] = remaining;
        }
        return { options: productBrands, brandMaxQuantities, usesProductFallback: true };
      }
    }

    return { ...fromRows, usesProductFallback: false };
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
    floorApiName: "Dispatch",
    floorKey: "dispatch",
    floorLabel: "Dispatch",
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

  const handleUpdateOrder = (order: ProductionOrder, article?: Article) => {
    setSelectedOrder(order);
    setSelectedArticleId(article ? (article.id ?? article._id ?? null) : null);
    setActiveUpdateTabIndex(0);
    const initialData: {
      [key: string]: {
        remarks: string;
        transferItems: Array<{ transferred: number; styleCode?: string; brand?: string }>;
      };
    } = {};
    order.articles.forEach((art) => {
      const articleId = art.id || art._id;
      if (articleId) {
        initialData[articleId] = {
          remarks: art.remarks || "",
          transferItems: [{ transferred: 0 }],
        };
      }
    });
    setUpdateData(initialData);
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
  };


  const handleRemarksChange = (articleId: string, value: string) => {
    setUpdateData((prev) => ({
      ...prev,
      [articleId]: {
        remarks: value,
        transferItems: prev[articleId]?.transferItems ?? [{ transferred: 0 }],
      },
    }));
  };

  const getTransferTotal = (items: Array<{ transferred?: number }>) =>
    (items ?? []).reduce((s, i) => s + (i.transferred ?? 0), 0);

  /** Check if transfer items exceed per-brand received for an article. */
  const hasTransferItemsExceedingBrandMax = (article: Article, items: Array<{ transferred?: number; brand?: string }>) => {
    const { brandMaxQuantities } = getDispatchBrandTransferOptions(article);
    const { brandValid } = validateBrandTransferItems(items as any, Infinity, brandMaxQuantities);
    return !brandValid;
  };

  const handleTransferItemsChange = (articleId: string, items: Array<{ transferred: number; styleCode?: string; brand?: string }>) => {
    setUpdateData((prev) => ({
      ...prev,
      [articleId]: {
        remarks: prev[articleId]?.remarks ?? "",
        transferItems: items.length > 0 ? items : [{ transferred: 0 }],
      },
    }));
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

  const handleUpdateSubmit = async () => {
    if (!selectedOrder) return;

    // Fetch fresh article data to avoid stale remaining (transferable) validation
    const articlesWithTransfer = selectedOrder.articles.filter((a) => {
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

    // Validate M1 (sum of transferItems, per-style-code) before submission - use fresh data
    const invalidArticles = selectedOrder.articles.filter(article => {
      const fresh = getArticleForValidation(article);
      const articleId = article.id || article._id;
      if (!articleId) return false;
      const update = updateData[articleId];
      if (!update) return false;
      const actualRemaining = getActualRemainingForArticle(fresh);
      const total = getTransferTotal(update.transferItems ?? []);
      if (total > actualRemaining) return true;
      return hasTransferItemsExceedingBrandMax(fresh, update.transferItems ?? []);
    });

    if (invalidArticles.length > 0) {
      toast.error('Cannot submit: Some articles have transfer quantity exceeding remaining or received per brand');
      return;
    }

    const invalidHalfStep = selectedOrder.articles.find((article) => {
      const fresh = getArticleForValidation(article);
      const articleId = article.id || article._id;
      if (!articleId) return false;
      const update = updateData[articleId];
      if (!update) return false;
      const actualRemaining = getActualRemainingForArticle(fresh);
      const { brandMaxQuantities } = getDispatchBrandTransferOptions(fresh);
      const { halfStepValid } = validateBrandTransferItems(
        update.transferItems ?? [],
        actualRemaining,
        brandMaxQuantities
      );
      return !halfStepValid;
    });

    if (invalidHalfStep) {
      toast.error(`${invalidHalfStep.articleNumber ?? invalidHalfStep.id}: ${HALF_STEP_QTY_ERROR}`);
      return;
    }

    try {
      setIsLoading(true);
      
      const userId = user?.id ?? user?._id;
      const floorSupervisorId = user?.id ?? user?._id;

      const updatePromises = selectedOrder.articles.map(async (article) => {
        const articleId = article.id || article._id;
        if (!articleId) return null;
        const fresh = getArticleForValidation(article);
        const update = updateData[articleId];
        if (!update) return null;

        const validItems = toBrandOnlyTransferItems(update.transferItems ?? []);
        const remarksChanged = update.remarks !== (fresh.remarks || "");

        if (validItems.length === 0 && !remarksChanged) {
          return null;
        }

        if (!userId || !floorSupervisorId) {
          toast.error("User session required. Please log in again.");
          return null;
        }

        if (validItems.length > 0) {
          const received = fresh.floorQuantities?.dispatch?.received ?? 0;
          if (received <= 0) {
            toast.error("Transfer requires received work. Accept the container first (scan container → Accept Article Quantity).");
            return null;
          }
        }

        const progressData = {
          remarks: update.remarks,
          ...(validItems.length > 0
            ? { transferredData: validItems, userId, floorSupervisorId }
            : { userId, floorSupervisorId }),
        };

        try {
          const response = await productionService.updateArticleProgress(
            "Dispatch",
            selectedOrder.id,
            article._id || article.id,
            progressData
          );
          if (!response.success) {
            throw new Error(response.error?.message || "Failed to update article");
          }
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          if (msg.includes("exceeds transferable") || msg.includes("transferable (0)")) {
            toast.error("Transfer quantity exceeds remaining. Refresh and enter only the new amount to transfer (max: remaining).");
          } else {
            toast.error(msg);
          }
          throw error;
        }

        return (await productionService.getArticle(article._id || article.id))?.data ?? null;
      }).filter(Boolean);

      const results = await Promise.allSettled(updatePromises);
      
      // Check if any updates failed
      const failedUpdates = results.filter(result => result.status === 'rejected');
      if (failedUpdates.length > 0) {
        console.error('Some updates failed:', failedUpdates);
        const firstReason = (failedUpdates[0] as PromiseRejectedResult)?.reason;
        const firstMsg = firstReason instanceof Error ? firstReason.message : String(firstReason ?? '');
        if (firstMsg.includes("exceeds transferable") || firstMsg.includes("transferable (0)")) {
          toast.error("Transfer requires received work. Accept the container first (scan container → Accept Article Quantity).");
        } else {
          toast.error(`${failedUpdates.length} article(s) failed to update`);
        }
        throw firstReason instanceof Error ? firstReason : new Error(firstMsg || 'Update failed');
      }

      toast.success('Order updated successfully');
      closeUpdateModal();
      void loadFloorOrdersCatalog();
    } catch (error: unknown) {
      console.error('Error updating order:', error);
      const msg = error instanceof Error ? error.message : 'Failed to update order';
      if (msg.includes("exceeds transferable") || msg.includes("transferable (0)")) {
        toast.error("Transfer requires received work. Accept the container first (scan container → Accept Article Quantity).");
      } else if (!msg.includes('Update failed')) {
        toast.error(msg);
      }
      throw error;
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
      const art = order.articles.find((a) => (a._id || a.id) === articleId);
      if (art) return art;
    }
    return null;
  }, [floorCatalog]);

  const CURRENT_FLOOR = "Dispatch";
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
      toast.success("Article quantity accepted on Dispatch.");
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
      const data = await teamMasterService.list({ workingFloor: "Dispatch", limit: 200 });
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
      const data = await teamMasterService.list({ workingFloor: "Dispatch", limit: 200 });
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
      const data = await teamMasterService.list({ workingFloor: "Dispatch", limit: 200 });
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

  const printFilters = useMemo<FloorOrderFilters>(() => ({
    ...(filters.status && { status: filters.status }),
    ...(filters.priority && { priority: filters.priority }),
    ...(searchQuery && { search: searchQuery }),
  }), [filters.status, filters.priority, searchQuery]);

  const handleTransferNoteCreated = useCallback(() => {
    setTransferNoteRefreshKey((k) => k + 1);
    void loadFloorOrdersCatalog();
  }, [loadFloorOrdersCatalog]);

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Dispatch Floor Supervisor Dashboard" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-teal-600 rounded-full" />
              <h1 className="text-sm font-bold text-gray-800">Dispatch Floor Supervisor</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {filteredOrders.length}
              </span>
              <HelpIcon
                title="Dispatch Floor Supervisor Dashboard"
                content={
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-lg mb-2">What is this page?</h4>
                      <p className="text-gray-700">
                        Dispatch receives work from the previous floor, tracks <strong>received / transferred / remaining</strong> by style and brand, and moves quantity to the next floor (often Warehouse) via container scan — API <span className="font-mono text-xs">/floors/Dispatch/...</span>. No M1–M4 quality grid on this floor.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-2">What can you do here?</h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        <li><strong>Orders:</strong> View and filter orders at Dispatch</li>
                        <li><strong>Article view:</strong> See articles by received quantity</li>
                        <li><strong>My Team:</strong> View team members and active articles</li>
                        <li><strong>Update:</strong> From Article view — transfer lines (qty · style · brand), remarks, container scan (per process)</li>
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
                onClick={() => setShowPrintModal(true)}
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
              <span className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Received</span>
              <span className="text-sm font-bold text-green-900">
                {floorCatalog.reduce((sum, order) => sum + order.articles.reduce((articleSum, article) => articleSum + (article.floorQuantities?.dispatch?.received || 0), 0), 0)}
              </span>
            </div>
            <div className="bg-yellow-50 border border-yellow-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-yellow-700 uppercase tracking-wide">Transferred</span>
              <span className="text-sm font-bold text-yellow-900">
                {floorCatalog.reduce((sum, order) => sum + order.articles.reduce((articleSum, article) => articleSum + (article.floorQuantities?.dispatch?.transferred || 0), 0), 0)}
              </span>
            </div>
            <div className="bg-red-50 border border-red-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-red-700 uppercase tracking-wide">Repair in</span>
              <span className="text-sm font-bold text-red-900">
                {floorCatalog.reduce((sum, order) => sum + order.articles.reduce((articleSum, article) => articleSum + (article.floorQuantities?.dispatch?.repairReceived || 0), 0), 0)}
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
              <button
                type="button"
                className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${activeTab === "transfer-notes" ? "border-teal-600 text-teal-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                onClick={() => setActiveTab("transfer-notes")}
              >
                Transfer Notes
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
            <UpcomingTab floorName="Dispatch" />
          ) : activeTab === "transfer-notes" ? (
            <TransferNoteHistoryTab refreshKey={transferNoteRefreshKey} />
          ) : activeTab === "article-view" ? (
            <ArticleViewTab
              orders={articleTabOrders}
              isLoading={catalogLoading || articleProductBrandsLoading}
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
              productBrandsByArticleId={productBrandsByArticleId}
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
                {hasActiveFilters ? "Try adjusting filters or search" : "No orders at Dispatch"}
              </p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-file-list-line text-xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">NO ORDERS WITH REMAINING QTY</h3>
              <p className="text-[10px] text-gray-500">Turn on Show all to include orders with zero remaining on Dispatch</p>
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
                    <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 min-w-[200px]">Dispatch lines</th>
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
                        {order.articles.some((a) => a.floorQuantities?.dispatch) && (
                          <div className="text-[10px] text-teal-600 mt-0.5">
                            R:{order.articles.reduce((s, a) => s + (a.floorQuantities?.dispatch?.received || 0), 0)} Trf:{order.articles.reduce((s, a) => s + (a.floorQuantities?.dispatch?.transferred || 0), 0)} Rem:{order.articles.reduce((s, a) => s + (a.floorQuantities?.dispatch?.remaining ?? 0), 0)}
                          </div>
                        )}
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-200 align-top">
                        <OrderDispatchBreakdownCell order={order} productBrandsByArticleId={productBrandsByArticleId} />
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-200">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${getStatusBadge(order.status)}`}>{order.status}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ml-1 ${getPriorityBadge(order.priority)}`}>{order.priority}</span>
                      </td>
                      <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100">
                          <button className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-400 border border-blue-100 rounded hover:bg-blue-100" onClick={() => handleViewOrder(order)} title="View"><i className="ri-eye-line text-xs"></i></button>
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
                <p className="text-[11px] text-[#495057]">No team members on Dispatch floor.</p>
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
        const articlesWithQty = modalArticles
          .map((a) => {
            const id = a.id ?? a._id;
            if (!id) return null;
            const qty = getTransferTotal(updateData[id]?.transferItems ?? []);
            return qty > 0 ? { article: a, quantity: qty } : null;
          })
          .filter((x): x is { article: Article; quantity: number } => x != null);
        const floor = updateContainerNextFloor.trim() || resolveNextFloorFromProcesses((modalArticles[0] as ArticleWithProcesses | undefined)?.processes ?? [], "Dispatch", "Warehouse");
        return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={() => { setShowUpdateContainerModal(false); setUpdateContainerCheckStatus("idle"); setUpdateContainerFetched(null); setUpdateContainerQuantity(""); }} aria-hidden>
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-sm p-[10px] flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-2">Scan bag / container</h4>
            <p className="text-[11px] text-[#495057]">Scan or enter the container/bag for this transfer. Quantity is the sum of the transfer lines you entered in the update drawer.</p>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Container barcode</label>
              <input type="text" placeholder="Scan or enter barcode" value={updateContainerBarcode} onChange={(e) => setUpdateContainerBarcode(e.target.value)} className="w-full border border-gray-200 rounded px-3 py-1.5 text-[11px] focus:ring-0 focus:border-teal-300" />
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
                    ? `Container has items for ${updateContainerFetched.activeFloor ?? "this floor"}. You can add a different article.`
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
              <button type="button" onClick={() => { setShowUpdateContainerModal(false); setUpdateContainerCheckStatus("idle"); setUpdateContainerFetched(null); setUpdateContainerQuantity(""); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50">Cancel</button>
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
                  try {
                    const existingItems = updateContainerFetched?.activeItems as ContainerActiveItem[] | undefined;
                    const containerReplace = !(existingItems?.length);
                    const stagedPayload = buildStagedActiveItemsPayload(existingItems, newRows, {
                      replace: containerReplace,
                    });
                    if (!stagedPayload.ok) {
                      toast.error(
                        stagedPayload.reason === "duplicate-article"
                          ? "Article already in this container. Use another container or clear it first."
                          : "Invalid container items",
                      );
                      return;
                    }
                    await handleUpdateSubmit();
                    await containersMasterService.updateByBarcode(barcode, {
                      activeFloor: floor,
                      activeItems: stagedPayload.activeItems,
                    });
                    toast.success("Order updated and container staged");
                    setShowUpdateContainerModal(false);
                    setUpdateContainerBarcode("");
                    setUpdateContainerArticleId("");
                    setUpdateContainerQuantity("");
                    setUpdateContainerNextFloor("Warehouse");
                    setUpdateContainerCheckStatus("idle");
                    setUpdateContainerFetched(null);
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    if (msg.includes("404")) toast.error("Container not found");
                    else toast.error(msg);
                  } finally {
                    setUpdateContainerSubmitting(false);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-[11px] font-bold rounded hover:bg-teal-700 disabled:opacity-50"
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
              <h3 className="text-sm font-bold text-gray-800 truncate min-w-0">Update Order — {selectedOrder.orderNumber}</h3>
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
                      const actualRemaining = getActualRemainingForArticle(article);
                      const total = getTransferTotal(update.transferItems ?? []);
                      if (total > actualRemaining) return true;
                      return hasTransferItemsExceedingBrandMax(article, update.transferItems ?? []);
                    });
                    if (invalid) {
                      toast.error("Cannot submit: Some articles have transfer quantity exceeding remaining or received per style code");
                      return;
                    }
                    const hasTransferButNoReceived = modalArticles.some((article) => {
                      const aid = article.id ?? article._id;
                      if (!aid) return false;
                      const total = getTransferTotal(updateData[aid]?.transferItems ?? []);
                      const received = article.floorQuantities?.dispatch?.received ?? 0;
                      return total > 0 && received <= 0;
                    });
                    if (hasTransferButNoReceived) {
                      toast.error("Transfer requires received work. Accept the container first (scan container → Accept Article Quantity).");
                      return;
                    }
                    const hasAnyTransferQty = modalArticles.some((article) => {
                      const articleId = article.id ?? article._id;
                      if (!articleId) return false;
                      const total = getTransferTotal(updateData[articleId]?.transferItems ?? []);
                      return total > 0;
                    });
                    if (!hasAnyTransferQty) {
                      handleUpdateSubmit();
                      return;
                    }
                    setUpdateContainerBarcode("");
                    setUpdateContainerCheckStatus("idle");
                    setUpdateContainerFetched(null);
                    const firstWithQty = modalArticles.find((a) => {
                      const id = a.id ?? a._id;
                      return id && getTransferTotal(updateData[id]?.transferItems ?? []) > 0;
                    });
                    if (firstWithQty) {
                      const firstId = firstWithQty.id ?? firstWithQty._id ?? "";
                      setUpdateContainerArticleId(firstId);
                      setUpdateContainerNextFloor(resolveNextFloorFromProcesses((firstWithQty as ArticleWithProcesses).processes ?? [], "Dispatch", "Warehouse"));
                    }
                    setShowUpdateContainerModal(true);
                  }}
                  disabled={modalArticles.some((article) => {
                    const articleId = article.id || article._id;
                    if (!articleId) return false;
                    const update = updateData[articleId];
                    if (!update) return false;
                    const actualRemaining = getActualRemainingForArticle(article);
                    const total = getTransferTotal(update.transferItems ?? []);
                    if (total > actualRemaining) return true;
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
            <div className="mb-4 px-3 py-2 rounded-md bg-teal-50 border-2 border-teal-200 text-[11px] text-teal-900">
              <strong>How to update:</strong> Pick an article tab, add <strong>new</strong> transfer lines (qty · brand), optional remarks, then <strong>Update Order</strong>. You will scan a container/bag before submit. Dispatch does not use M1–M4 quality buckets.
            </div>
            {modalArticles.some((a) => (a.floorQuantities?.dispatch?.received ?? 0) <= 0) && (
              <div className="mb-4 px-3 py-2 rounded-md bg-amber-50 border-2 border-amber-200 text-[11px] text-amber-900">
                <strong>Accept before transfer:</strong> Scan container and accept quantity first so <code>received</code> &gt; 0. Transfer to the next floor (e.g. Warehouse) is disabled until then.
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
                const fc = article.floorQuantities?.dispatch;
                const currentUpdateData = updateData[articleId] || {
                  remarks: article.remarks || "",
                  transferItems: [{ transferred: 0 }],
                };
                const received = fc?.received || 0;
                const transferred = fc?.transferred || 0;
                const remaining = fc?.remaining ?? (received - transferred);
                return (
                  <>
            <section className="mb-4 rounded-md border-2 border-gray-300 overflow-hidden">
              <div className="px-3 py-1.5 bg-gray-200 border-b-2 border-gray-300 text-[11px] font-bold text-gray-800 uppercase">3. Current quantities for this article</div>
              <p className="px-3 py-1 text-[10px] text-gray-500 bg-gray-50 border-b border-gray-200"><span className="font-semibold text-gray-700">Article: {article.articleNumber}</span> — Planned · Received on Dispatch · Transferred out · Remaining to move.</p>
              <div className="p-2">
                <table className="w-full border-collapse text-[11px] border-2 border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border-2 border-gray-300 px-2 py-1 text-left font-bold text-gray-700">Planned</th>
                      <th className="border-2 border-gray-300 px-2 py-1 text-left font-bold text-gray-700">Received</th>
                      <th className="border-2 border-gray-300 px-2 py-1 text-left font-bold text-gray-700">Transferred</th>
                      <th className="border-2 border-gray-300 px-2 py-1 text-left font-bold text-gray-700">Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border-2 border-gray-300 px-2 py-1">{(article.plannedQuantity || 0).toLocaleString()}</td>
                      <td className="border-2 border-gray-300 px-2 py-1"><ReceivedQuantityDisplay received={received} repairReceived={fc?.repairReceived} repairFromFloor={fc?.repairFromFloor} className="text-[11px]" /></td>
                      <td className="border-2 border-gray-300 px-2 py-1 text-green-700 font-medium">{transferred}</td>
                      <td className="border-2 border-gray-300 px-2 py-1 text-orange-700 font-medium">{remaining}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {(fc?.receivedData as any[])?.some((d: any) => (d.transferred ?? 0) > 0) ? (
                <div className="px-3 py-2 border-t border-gray-200 bg-sky-50/50">
                  <label className="block text-[10px] font-bold text-sky-800 mb-1">Received breakdown (Qty · Brand)</label>
                  <div className="space-y-0.5 text-[11px] text-gray-700">
                    {collapseLinesByBrand((fc?.receivedData as any[])?.filter((d: any) => (d.transferred ?? 0) > 0)).map((d, i) => (
                      <div key={i}>{formatBrandLine(d)}</div>
                    ))}
                  </div>
                </div>
              ) : (articleProductBrandOptions[articleId]?.length ?? 0) > 0 ? (
                <div className="px-3 py-2 border-t border-gray-200 bg-indigo-50/50">
                  <label className="block text-[10px] font-bold text-indigo-800 mb-1">Product brand (catalog)</label>
                  <div className="text-[11px] text-indigo-900 font-medium">
                    {getDispatchBrandDisplay(undefined, productBrandsByArticleId[articleId]).text}
                  </div>
                </div>
              ) : null}
              <p className="px-3 py-1 text-[10px] text-gray-600 bg-amber-50 border-t border-gray-200">Max total to transfer this submit = <strong>{remaining}</strong></p>
            </section>
            <section className="mb-4 rounded-md border-2 border-green-300 overflow-hidden">
              <div className="px-3 py-1.5 bg-green-100 border-b-2 border-green-300 text-[11px] font-bold text-green-900">4. Transfer to next floor (Qty · Brand)</div>
              {(fc?.transferredData as any[])?.length > 0 && (
                <div className="px-3 py-2 border-b border-gray-200 bg-gray-50/50">
                  <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wide mb-1">Previously transferred</label>
                  <div className="space-y-0.5 text-[11px] text-gray-700">
                    {collapseLinesByBrand(fc?.transferredData as any[]).map((d, i) => (
                      <div key={i}>{formatBrandLine(d)}</div>
                    ))}
                  </div>
                </div>
              )}
              <p className="px-3 py-1 text-[10px] text-gray-600 bg-green-50/50 border-b border-green-200">Enter <strong>new</strong> transfer below. Total must not exceed remaining.</p>
              <div className="p-2 border-t-2 border-green-200 bg-green-50/30">
                {(() => {
                  const actualRemaining = getActualRemainingForArticle(article);
                  const isFullyTransferred = actualRemaining <= 0;
                  return (
                    <>
                      {(() => {
                        const { options, brandMaxQuantities, usesProductFallback } = getDispatchBrandTransferOptions(article);
                        const productBrands = articleProductBrandOptions[articleId] ?? [];
                        const noReceived =
                          options.length === 0 &&
                          !((fc?.received ?? 0) > 0 && getActualRemainingForArticle(article) > 0 && productBrands.length > 0);
                        const brandOpts =
                          options.length > 0
                            ? options
                            : (fc?.received ?? 0) > 0 && productBrands.length > 0
                              ? productBrands
                              : [];
                        const brandCaps =
                          brandMaxQuantities ??
                          (usesProductFallback || (options.length === 0 && productBrands.length > 0)
                            ? Object.fromEntries(productBrands.map((o) => [o.brand, getActualRemainingForArticle(article)]))
                            : undefined);
                        return (
                          <BrandTransferItemsInput
                            value={currentUpdateData.transferItems ?? [{ transferred: 0, styleCode: "", brand: "" }]}
                            onChange={(items) => handleTransferItemsChange(articleId, items)}
                            maxTotal={actualRemaining}
                            disabled={isFullyTransferred || noReceived || articleProductBrandsLoading}
                            brandOptions={brandOpts}
                            brandMaxQuantities={noReceived ? undefined : brandCaps}
                            placeholder={
                              articleProductBrandsLoading
                                ? "Loading brands..."
                                : noReceived
                                  ? "Nothing to transfer — accept article / check received first"
                                  : usesProductFallback || (options.length === 0 && productBrands.length > 0)
                                    ? "Assign qty by product brand (max: remaining)"
                                    : "Add new transfer lines (max: remaining)"
                            }
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
            <section className="mb-4 rounded-md border-2 border-gray-300 overflow-hidden">
              <div className="px-3 py-1.5 bg-gray-200 border-b-2 border-gray-300 text-[11px] font-bold text-gray-800">5. Remarks</div>
              <div className="p-2">
                <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Article remarks</label>
                <textarea className="w-full py-1.5 px-2 text-[11px] border-2 border-gray-300 rounded resize-none" rows={2} placeholder="Remarks for this article..." value={currentUpdateData.remarks} onChange={(e) => handleRemarksChange(articleId, e.target.value)} />
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
                        <label className="form-label">Received on Dispatch</label>
                        <ReceivedQuantityDisplay
                          received={article.floorQuantities?.dispatch?.received || 0}
                          repairReceived={article.floorQuantities?.dispatch?.repairReceived}
                          repairFromFloor={article.floorQuantities?.dispatch?.repairFromFloor}
                          className="text-lg"
                        />
                      </div>
                      <div>
                        <label className="form-label">Transferred out / Remaining</label>
                        <div className="text-lg font-semibold text-green-600">
                          {(article.floorQuantities?.dispatch?.transferred || 0).toLocaleString()}
                          <span className="text-gray-500 font-normal text-base"> / </span>
                          <span className="text-orange-700">{(article.floorQuantities?.dispatch?.remaining ?? 0).toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">By brand via transfer lines + container</div>
                      </div>
                    </div>

                    {(article.floorQuantities?.dispatch?.receivedData?.length ?? 0) > 0 ? (
                      <div className="mb-4 p-3 bg-sky-50 rounded-lg border border-sky-200">
                        <label className="form-label text-sky-800 font-semibold">Received lines (qty · brand)</label>
                        <div className="mt-2 space-y-1 text-sm text-gray-700">
                          {collapseLinesByBrand(article.floorQuantities?.dispatch?.receivedData).map((d, i) => (
                            <div key={i}>{formatBrandLine(d)}</div>
                          ))}
                        </div>
                      </div>
                    ) : (() => {
                      const aid = article.id ?? article._id ?? "";
                      const catalogBrands = productBrandsByArticleId[aid];
                      if (!catalogBrands?.length) return null;
                      return (
                        <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                          <label className="form-label text-indigo-800 font-semibold">Product brand (catalog)</label>
                          <div className="mt-2 text-sm text-indigo-900 font-medium">
                            {getDispatchBrandDisplay(undefined, catalogBrands).text}
                          </div>
                          <p className="text-xs text-indigo-600 mt-1">Article skipped branding — brand from product master</p>
                        </div>
                      );
                    })()}
                    {(article.floorQuantities?.dispatch?.transferredData?.length ?? 0) > 0 && (
                      <div className="mb-4 p-3 bg-teal-50 rounded-lg border border-teal-200">
                        <label className="form-label text-teal-800 font-semibold">Transferred breakdown (Brand)</label>
                        <div className="mt-2 space-y-1 text-sm text-gray-700">
                          {collapseLinesByBrand(article.floorQuantities?.dispatch?.transferredData).map((d, i) => (
                            <div key={i}>{formatBrandLine(d)}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {article.finalQualityConfirmed && (
                      <div className="mb-4">
                        <label className="form-label">Final Quality Status</label>
                        <div className="p-3 bg-green-50 rounded-md text-sm text-green-700">
                          ✓ Quality Confirmed
                        </div>
                      </div>
                    )}

                    {article.repairStatus && article.repairStatus !== "Not Required" && (
                      <div className="mb-4">
                        <label className="form-label">Article repair status</label>
                        <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-700">{article.repairStatus}</div>
                      </div>
                    )}

                    {article.repairRemarks && (
                      <div className="mb-4">
                        <label className="form-label">Article repair remarks</label>
                        <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-700">{article.repairRemarks}</div>
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
                        Remaining: {(article.floorQuantities?.dispatch?.remaining || 0).toLocaleString()}
                      </div>
                      <div>
                        Sent: {Math.round(((article.floorQuantities?.dispatch?.transferred || 0) / Math.max(article.floorQuantities?.dispatch?.received || 1, 1)) * 100)}% of received
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
                          const receivedQty = article.floorQuantities?.dispatch?.received || 0;
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
                                log.action === 'Transferred to Dispatch' ? 'bg-purple-100 text-purple-800' :
                                log.action === 'Transferred to Washing' ? 'bg-blue-100 text-blue-800' :
                                log.action === 'M1 Quantity Updated' ? 'bg-green-100 text-green-800' :
                                log.action === 'M2 Quantity Updated' ? 'bg-orange-100 text-orange-800' :
                                log.action === 'M3 Quantity Updated' ? 'bg-red-100 text-red-800' :
                                log.action === 'M4 Quantity Updated' ? 'bg-red-100 text-red-800' :
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

      <TransferNotePrintModal
        open={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        printFilters={printFilters}
        onCreated={handleTransferNoteCreated}
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

export default DispatchFloorSupervisorPage;
