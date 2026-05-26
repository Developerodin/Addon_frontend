"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import { productionService, ProductionOrder, FloorOrderFilters } from "@/shared/services/productionService";
import { API_BASE_URL } from "@/shared/data/utilities/api";
import NumericInput from "@/shared/utils/numericInput";
import ReceivedQuantityDisplay from "@/shared/components/production/ReceivedQuantityDisplay";
import ArticleViewTab from "./components/ArticleViewTab";
import MyTeamTab from "./components/MyTeamTab";
import UpcomingTab from "../components/UpcomingTab";
import { containersMasterService, type ContainerMaster, hasActiveItems, getContainerArticles } from "@/shared/services/containersMasterService";
import { useProductionArticleQrScan } from "@/shared/hooks/useProductionArticleQrScan";
import ArticleQrScanDrawer from "@/shared/components/production/ArticleQrScanDrawer";
import { teamMasterService, type TeamMaster, PRODUCTION_FLOORS } from "@/shared/services/teamMasterService";
import { getArticleMongoId, resolveNextFloorFromProcesses } from "@/shared/utils/productionUtils";
import type { Article } from "@/shared/services/productionService";

type BoardingTab = "orders" | "article-view" | "my-team" | "upcoming";

const FLOOR_CATALOG_LIMIT = 2000;

const BoardingFloorSupervisorPage = () => {
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
  const [activeTab, setActiveTab] = useState<BoardingTab>("article-view");
  const [showContainerScanDrawer, setShowContainerScanDrawer] = useState(false);
  const [containerScanBarcode, setContainerScanBarcode] = useState("");
  const [containerScanLoading, setContainerScanLoading] = useState(false);
  const [containerScanned, setContainerScanned] = useState<{ container: ContainerMaster; articles: Array<{ article: Article | null; quantity: number }> } | null>(null);
  const [acceptArticleLoading, setAcceptArticleLoading] = useState(false);
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [showAssignDrawer, setShowAssignDrawer] = useState(false);
  const [assignTeamMembers, setAssignTeamMembers] = useState<TeamMaster[]>([]);
  const [assignTeamLoading, setAssignTeamLoading] = useState(false);
  const [confirmAssignModal, setConfirmAssignModal] = useState<{ teamMemberName: string; teamMemberId: string; articleId: string } | null>(null);
  const [assigningInProgress, setAssigningInProgress] = useState(false);
  const [removingArticleMemberId, setRemovingArticleMemberId] = useState<string | null>(null);
  const [showUpdateContainerModal, setShowUpdateContainerModal] = useState(false);
  const [updateContainerBarcode, setUpdateContainerBarcode] = useState("");
  const [updateContainerCheckStatus, setUpdateContainerCheckStatus] = useState<"idle" | "loading" | "not-found" | "already-filled" | "ok">("idle");
  const [updateContainerFetched, setUpdateContainerFetched] = useState<{ activeItems?: Array<{ article: string | { articleNumber?: string }; quantity: number }>; activeFloor?: string } | null>(null);
  const [updateContainerArticleId, setUpdateContainerArticleId] = useState("");
  const [updateContainerQuantity, setUpdateContainerQuantity] = useState("");
  const [updateContainerNextFloor, setUpdateContainerNextFloor] = useState("Secondary Checking");
  const [updateContainerSubmitting, setUpdateContainerSubmitting] = useState(false);
  const [showAllArticles, setShowAllArticles] = useState(false);

  /** Loads boarding floor orders for both tabs; filter + paginate client-side. */
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

      const response = await productionService.getFloorOrders("Boarding", apiFilters);

      if (response.success) {
        setFloorCatalog(response.data.results);
      } else {
        console.error("Failed to load boarding floor orders:", response.error);
        toast.error("Failed to load boarding orders");
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to load boarding orders";
      console.error("Error loading boarding floor orders:", error);
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
      containersMasterService.getByBarcode(barcode)
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
    return () => { cancelled = true; clearTimeout(t); };
  }, [showUpdateContainerModal, updateContainerBarcode, updateContainerNextFloor]);

  // When article changes in modal, sync quantity and next floor from article processes
  useEffect(() => {
    if (!showUpdateContainerModal || !updateContainerArticleId || !selectedOrder) return;
    setUpdateContainerQuantity(String(updateData[updateContainerArticleId]?.completedQuantity ?? 0));
    const mongoId = getArticleMongoId(updateContainerArticleId, selectedOrder.articles);
    if (!mongoId) return;
    let cancelled = false;
    productionService.getArticleProcesses(mongoId).then((res) => {
      if (cancelled) return;
      if (res.success && res.data?.processes) {
        const next = resolveNextFloorFromProcesses(res.data.processes, "Boarding", "Secondary Checking");
        setUpdateContainerNextFloor(next);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [showUpdateContainerModal, updateContainerArticleId, selectedOrder?.articles]);

  const filterOrdersByReceivedQuantity = (orders: ProductionOrder[], showAll: boolean): ProductionOrder[] => {
    return orders.map(order => {
      const filteredArticles = order.articles.filter(article => {
        const received = article.floorQuantities?.boarding?.received || 0;
        const transferred = article.floorQuantities?.boarding?.transferred || 0;
        const remaining = article.floorQuantities?.boarding?.remaining ?? (received - transferred);
        return showAll ? received > 0 : remaining > 0;
      });
      return { ...order, articles: filteredArticles };
    }).filter(order => order.articles.length > 0);
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
    floorApiName: "Boarding",
    floorKey: "boarding",
    floorLabel: "Boarding",
    filterOrdersForLookup: (all) => filterOrdersByReceivedQuantity(all, true),
    setFloorOrderCatalog: setFloorCatalog,
    setShowAllArticles,
    onArticleFound: (id) => setActiveArticleId(id),
    goToArticleView: () => setActiveTab("article-view"),
  });
  const articleTabOrders = qrScan.qrPinnedArticleOrders ?? floorCatalog;

  const getBoardingFloorData = (article: Article) => ({ floor: "boarding" as const, data: article.floorQuantities?.boarding });

  const findArticleInOrders = useCallback((articleId: string): Article | null => {
    for (const order of floorCatalog) {
      const a = order.articles.find((ar) => (ar._id || ar.id) === articleId);
      if (a) return a as Article;
    }
    return null;
  }, [floorCatalog]);

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
    // Initialize update data with current values
    const initialData: {[key: string]: {completedQuantity: number, remarks: string}} = {};
    order.articles.forEach(article => {
      const articleId = article.id || article._id;
      if (articleId) {
        // Initialize with 0 for completed quantity
        initialData[articleId] = {
          completedQuantity: 0,
          remarks: article.remarks || ''
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
    setShowUpdateContainerModal(false);
    setUpdateContainerBarcode("");
    setUpdateContainerCheckStatus("idle");
    setUpdateContainerFetched(null);
  };

  const CURRENT_FLOOR = "Boarding";
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
      toast.success("Container accepted on Boarding.");
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
      const data = await teamMasterService.list({ workingFloor: "Boarding", limit: 200 });
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
      const data = await teamMasterService.list({ workingFloor: "Boarding", limit: 200 });
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
      const data = await teamMasterService.list({ workingFloor: "Boarding", limit: 200 });
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
      
      const received = article.floorQuantities?.boarding?.received || 0;
      const transferred = article.floorQuantities?.boarding?.transferred || 0;
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
        const boardingTransferredQuantity = article.floorQuantities?.boarding?.transferred || 0;
        if (update && (update.completedQuantity !== boardingTransferredQuantity || update.remarks !== (article.remarks || ''))) {
          const progressData = {
            completedQuantity: update.completedQuantity,
            remarks: update.remarks
          };
          
          try {
            const response = await productionService.updateArticleProgress(
              'Boarding',
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

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Boarding Supervisor Dashboard"/>
      <div className="bg-white shadow-sm border border-gray-300 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-green-600 rounded-full" />
              <h1 className="text-sm font-bold text-gray-800">Boarding Floor Supervisor</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">{filteredOrders.length}</span>
              <HelpIcon
                title="Boarding Floor Supervisor Dashboard"
                content={
                  <div className="space-y-4">
                    <div><h4 className="font-semibold text-lg mb-2">What is this page?</h4><p className="text-gray-700">Boarding Floor Supervisor Dashboard to view and update orders on the Boarding floor.</p></div>
                    <div><h4 className="font-semibold text-lg mb-2">What can you do here?</h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        <li><strong>View Orders</strong> — orders with articles on Boarding</li>
                        <li><strong>Article view</strong> — Scan container, accept article, assign to team</li>
                        <li><strong>My Team</strong> — View active articles, mark article complete</li>
                        <li><strong>Update Progress</strong> — Enter completed qty, scan container, submit and transfer to next floor</li>
                        <li><strong>Filter & Search</strong> — Find specific orders</li>
                      </ul>
                    </div>
                  </div>
                }
              />
            </div>
            <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 shadow-sm" onClick={() => void loadFloorOrdersCatalog()} disabled={catalogLoading} title="Refresh"><i className={`ri-refresh-line text-xs ${catalogLoading ? 'animate-spin' : ''}`}></i> Refresh</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <div className="bg-blue-50 border border-blue-100 rounded p-2 flex items-center justify-between"><span className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">In Progress</span><span className="text-sm font-bold text-blue-900">{floorCatalog.filter(o => o.status === 'In Progress').length}</span></div>
            <div className="bg-green-50 border border-green-100 rounded p-2 flex items-center justify-between"><span className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Completed</span><span className="text-sm font-bold text-green-900">{floorCatalog.filter(o => o.status === 'Completed').length}</span></div>
            <div className="bg-yellow-50 border border-yellow-100 rounded p-2 flex items-center justify-between"><span className="text-[10px] font-bold text-yellow-700 uppercase tracking-wide">Pending</span><span className="text-sm font-bold text-yellow-900">{floorCatalog.filter(o => o.status === 'Pending').length}</span></div>
            <div className="bg-red-50 border border-red-100 rounded p-2 flex items-center justify-between"><span className="text-[10px] font-bold text-red-700 uppercase tracking-wide">On Hold</span><span className="text-sm font-bold text-red-900">{floorCatalog.filter(o => o.status === 'On Hold').length}</span></div>
          </div>
          <div className="flex items-center justify-between border-b border-gray-300 mb-0">
            <div className="flex">
              <button type="button" className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${activeTab === "orders" ? "border-green-600 text-green-600" : "border-transparent text-gray-500 hover:text-gray-700"}`} onClick={() => setActiveTab("orders")}>Orders</button>
              <button type="button" className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${activeTab === "article-view" ? "border-green-600 text-green-600" : "border-transparent text-gray-500 hover:text-gray-700"}`} onClick={() => setActiveTab("article-view")}>Article view</button>
              <button type="button" className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${activeTab === "my-team" ? "border-green-600 text-green-600" : "border-transparent text-gray-500 hover:text-gray-700"}`} onClick={() => setActiveTab("my-team")}>My Team</button>
              <button type="button" className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${activeTab === "upcoming" ? "border-green-600 text-green-600" : "border-transparent text-gray-500 hover:text-gray-700"}`} onClick={() => setActiveTab("upcoming")}>Upcoming</button>
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
            <UpcomingTab floorName="Boarding" />
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
            <button type="button" className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border ${showFilters ? 'bg-green-600 text-white border-green-600' : 'bg-white border-gray-300 text-[#495057] hover:bg-gray-50'}`} onClick={() => setShowFilters(!showFilters)}><i className="ri-filter-3-line text-xs"></i> Filters {hasActiveFilters && <span className="ml-1">●</span>}</button>
            {hasActiveFilters && <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[11px] font-bold rounded hover:bg-gray-50" onClick={clearFilters}><i className="ri-close-line text-xs"></i> Clear</button>}
            <div className="relative flex-1 min-w-[140px] max-w-[240px]">
              <input type="text" className="bg-white border border-gray-300 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-1 focus:ring-green-300 focus:border-green-500 w-full placeholder:text-gray-400 font-medium" placeholder="Search order, article..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
            </div>
            <select className="bg-white border border-gray-300 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5" value={itemsPerPage} onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}><option value={10}>Show 10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select>
          </div>
          {showFilters && (
            <div className="p-[10px] bg-gray-50 border-b border-gray-300 flex flex-wrap gap-2">
              <select className="bg-white border border-gray-300 text-[11px] rounded px-2 py-1.5" value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}><option value="">All Status</option><option value="Pending">Pending</option><option value="In Progress">In Progress</option><option value="Completed">Completed</option><option value="On Hold">On Hold</option></select>
              <select className="bg-white border border-gray-300 text-[11px] rounded px-2 py-1.5" value={filters.priority} onChange={(e) => handleFilterChange('priority', e.target.value)}><option value="">All Priorities</option><option value="Urgent">Urgent</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select>
              <select className="bg-white border border-gray-300 text-[11px] rounded px-2 py-1.5" value={filters.linkingType} onChange={(e) => handleFilterChange('linkingType', e.target.value)}><option value="">All Types</option><option value="Auto Linking">Auto Linking</option><option value="Rosso Linking">Rosso Linking</option><option value="Hand Linking">Hand Linking</option></select>
              <input type="text" className="bg-white border border-gray-300 text-[11px] rounded px-2 py-1.5 w-28" placeholder="Floor..." value={filters.floor} onChange={(e) => handleFilterChange('floor', e.target.value)} />
            </div>
          )}
          {catalogLoading && floorCatalog.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-4 opacity-50"></div><p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading</p></div>
          ) : floorCatalog.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center"><div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4"><i className="ri-file-list-line text-xl text-gray-200"></i></div><h3 className="text-xs font-bold text-gray-400 mb-1">NO ORDERS FOUND</h3><p className="text-[10px] text-gray-500">{hasActiveFilters ? 'Try adjusting filters or search' : 'No orders on Boarding floor'}</p></div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center"><div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4"><i className="ri-file-list-line text-xl text-gray-200"></i></div><h3 className="text-xs font-bold text-gray-400 mb-1">NO ORDERS WITH REMAINING QTY</h3><p className="text-[10px] text-gray-500">Turn on Show all to include orders with zero remaining on Boarding</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead><tr className="bg-gray-50/30">
                  <th className="pl-[10px] pr-1 py-2.5 w-10 border border-gray-300"><input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="rounded border-gray-300 text-green-600 focus:ring-0 h-3.5 w-3.5" /></th>
                  <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Order Info</th>
                  <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Articles</th>
                  <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Status</th>
                  <th className="px-1.5 py-2.5 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Actions</th>
                </tr></thead>
                <tbody>
                  {paginatedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="pl-[10px] pr-1 py-2.5 border border-gray-300"><input type="checkbox" checked={selectedOrders.includes(order.id)} onChange={() => handleOrderSelect(order.id)} className="rounded border-gray-300 text-green-600 focus:ring-0 h-3.5 w-3.5" /></td>
                      <td className="px-1.5 py-2.5 border border-gray-300"><div className="text-[12px] font-bold text-gray-900">{order.orderNumber || order.id}</div>{order.orderNote && <span className="text-[10px] text-gray-500">({order.orderNote})</span>}<div className="text-[10px] text-gray-500">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : (order.articles?.[0]?.createdAt ? new Date(order.articles[0].createdAt).toLocaleDateString() : 'N/A')}</div></td>
                      <td className="px-1.5 py-2.5 border border-gray-300"><div className="text-[12px] font-medium text-gray-600">{order.articles.length} Article{order.articles.length !== 1 ? 's' : ''} · Qty {order.articles.reduce((s, a) => s + (a.plannedQuantity || 0), 0).toLocaleString()}</div>{order.articles.some(a => (a as any).floorQuantities?.boarding) && <div className="text-[10px] text-green-600 mt-0.5">R:{order.articles.reduce((s, a) => s + ((a as any).floorQuantities?.boarding?.received || 0), 0)} Trf:{order.articles.reduce((s, a) => s + ((a as any).floorQuantities?.boarding?.transferred || 0), 0)} Rem:{order.articles.reduce((s, a) => s + ((a as any).floorQuantities?.boarding?.remaining ?? 0), 0)}</div>}</td>
                      <td className="px-1.5 py-2.5 border border-gray-300"><span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${getStatusBadge(order.status)}`}>{order.status}</span><span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ml-1 ${getPriorityBadge(order.priority)}`}>{order.priority}</span></td>
                      <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-300"><div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100"><button className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-400 border border-blue-100 rounded hover:bg-blue-100" onClick={() => handleViewOrder(order)} title="View"><i className="ri-eye-line text-xs"></i></button><button className="w-7 h-7 flex items-center justify-center bg-emerald-50 text-emerald-400 border border-emerald-100 rounded hover:bg-emerald-100" onClick={() => handleUpdateOrder(order)} title="Update"><i className="ri-edit-line text-xs"></i></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filteredOrders.length > 0 && (
            <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-300">
              <div className="text-[11px] font-medium text-[#495057]">Showing {ordersPageStart} to {ordersPageEnd} of {filteredOrders.length} entries</div>
              <div className="flex items-center gap-1" role="navigation" aria-label="Orders pagination">
                <button onClick={() => handlePageChange(safeCurrentPage - 1)} disabled={safeCurrentPage <= 1} className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30">Prev</button>
                {Array.from({ length: Math.min(orderTotalPages, 7) }, (_, i) => { const pageNum = orderTotalPages <= 7 ? i + 1 : safeCurrentPage <= 4 ? i + 1 : safeCurrentPage >= orderTotalPages - 3 ? orderTotalPages - 6 + i : safeCurrentPage - 3 + i; return <button key={pageNum} onClick={() => handlePageChange(pageNum)} className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded ${safeCurrentPage === pageNum ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>{pageNum}</button>; })}
                <button onClick={() => handlePageChange(safeCurrentPage + 1)} disabled={safeCurrentPage >= orderTotalPages} className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30">Next</button>
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </div>

      {/* Update Order – right-side drawer; footer opens Scan bag/container then submit */}
      {showUpdateModal && selectedOrder && (() => {
        const modalArticles = selectedArticleId ? selectedOrder.articles.filter((a) => (a.id ?? a._id) === selectedArticleId) : selectedOrder.articles;
        return (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeUpdateModal} aria-hidden />
          <div className="fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-xl z-50 flex flex-col overflow-hidden animate-slide-in-right border-l-2 border-gray-300">
            <div className="flex items-center justify-between gap-3 px-3 py-2 border-b-2 border-gray-300 bg-gray-50 flex-shrink-0">
              <h3 className="text-sm font-bold text-gray-800 truncate min-w-0">Update Order — {selectedOrder.orderNumber}</h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={closeUpdateModal} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-gray-300 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-100 shadow-sm">Cancel</button>
                <button
                  onClick={() => {
                    if (!selectedOrder) return;
                    const invalid = modalArticles.some(article => { const articleId = article.id || article._id; if (!articleId) return false; const update = updateData[articleId]; if (!update) return false; const received = article.floorQuantities?.boarding?.received || 0; const transferred = article.floorQuantities?.boarding?.transferred || 0; const remaining = received - transferred; return update.completedQuantity > remaining; });
                    if (invalid) { toast.error("Cannot submit: Some articles have completed quantity exceeding remaining."); return; }
                    const firstWithQty = modalArticles.find((a) => { const id = a.id ?? a._id; return id && (updateData[id]?.completedQuantity ?? 0) > 0; });
                    if (!firstWithQty) { toast.error("Enter at least one article with boarding completed quantity"); return; }
                    setUpdateContainerBarcode(""); setUpdateContainerCheckStatus("idle"); setUpdateContainerFetched(null); const firstId = firstWithQty.id ?? firstWithQty._id ?? ""; setUpdateContainerArticleId(firstId); setUpdateContainerQuantity(String(updateData[firstId]?.completedQuantity ?? 0)); setUpdateContainerNextFloor("Secondary Checking"); setShowUpdateContainerModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-[11px] font-bold rounded hover:bg-green-700 shadow-sm disabled:opacity-50"
                  disabled={modalArticles.some(article => { const articleId = article.id || article._id; if (!articleId) return false; const update = updateData[articleId]; if (!update) return false; const received = article.floorQuantities?.boarding?.received || 0; const transferred = article.floorQuantities?.boarding?.transferred || 0; const remaining = received - transferred; return update.completedQuantity > remaining; }) || !modalArticles.some((a) => (updateData[a.id ?? a._id ?? ""]?.completedQuantity ?? 0) > 0)}
                ><i className="ri-save-line text-xs"></i> Update Order</button>
                <button onClick={closeUpdateModal} className="text-gray-500 hover:text-gray-800 p-1 rounded border-2 border-gray-300 hover:bg-gray-100" aria-label="Close drawer"><i className="ri-close-line text-lg"></i></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pt-3 pb-24">
            <div className="mb-4 px-3 py-2 rounded-md bg-green-50 border-2 border-green-200 text-[11px] text-green-900"><strong>How to update:</strong> Enter boarding completed quantity and remarks per article. Then click Update Order, scan the bag/container, select article and next floor, and submit.</div>
            <section className="mb-4 rounded-md border-2 border-gray-300 bg-gray-50 overflow-hidden">
              <div className="px-3 py-1.5 bg-gray-200 border-b-2 border-gray-300 text-[11px] font-bold text-gray-800 uppercase">Order</div>
              <div className="grid grid-cols-2 gap-3 p-3">
                <div><label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Priority</label><span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium border-2 border-gray-300 ${getPriorityBadge(selectedOrder.priority)}`}>{selectedOrder.priority}</span></div>
                <div><label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Status</label><span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium border-2 border-gray-300 ${getStatusBadge(selectedOrder.status)}`}>{selectedOrder.status}</span></div>
              </div>
            </section>
            <div className="border border-gray-300 rounded overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border-collapse">
                  <thead className="bg-gray-100 border-b border-gray-300">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Article</th>
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Planned</th>
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Received</th>
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Transferred</th>
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Remaining</th>
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap bg-green-50">Boarding Completed *</th>
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-700 whitespace-nowrap">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {modalArticles.map((article, idx) => {
                      const articleId = article.id || article._id;
                      if (!articleId) return null;
                      const currentUpdateData = updateData[articleId] || { completedQuantity: 0, remarks: article.remarks || '' };
                      const plannedQty = article.plannedQuantity || 0;
                      const receivedQty = article.floorQuantities?.boarding?.received || 0;
                      const transferredQty = article.floorQuantities?.boarding?.transferred || 0;
                      const remainingQty = receivedQty - transferredQty;
                      const isFullyTransferred = remainingQty <= 0;
                      return (
                        <tr key={articleId} className="hover:bg-gray-50">
                          <td className="px-2 py-1.5 border-r border-gray-300"><div className="font-medium text-gray-900">{article.articleNumber || `Article ${idx + 1}`}</div><div className="text-gray-500 text-xs mt-0.5">{article.linkingType || 'N/A'}</div></td>
                          <td className="px-2 py-1.5 text-center border-r border-gray-300 text-gray-700">{plannedQty.toLocaleString()}</td>
                          <td className="px-2 py-1.5 border-r border-gray-300 align-top min-w-[80px]"><ReceivedQuantityDisplay received={receivedQty} repairReceived={article.floorQuantities?.boarding?.repairReceived} repairFromFloor={article.floorQuantities?.boarding?.repairFromFloor} /></td>
                          <td className="px-2 py-1.5 text-center border-r border-gray-300 text-green-600 font-medium">{transferredQty.toLocaleString()}</td>
                          <td className="px-2 py-1.5 text-center border-r border-gray-300 text-orange-600 font-medium">{remainingQty.toLocaleString()}</td>
                          <td className="px-2 py-1.5 border-r border-gray-300 bg-green-50">
                            <div className="flex flex-col gap-0.5">
                              <NumericInput className={`py-1 text-xs h-7 border rounded ${isFullyTransferred ? 'bg-gray-100 border-gray-300 cursor-not-allowed' : currentUpdateData.completedQuantity > remainingQty ? 'border-red-500' : 'border-gray-300'}`} value={currentUpdateData.completedQuantity} onChange={(value) => { if (!isFullyTransferred && value <= remainingQty) handleQuantityChange(articleId, value); }} placeholder={isFullyTransferred ? 'Done' : `Max ${remainingQty}`} disabled={isFullyTransferred} allowDecimals />
                              {isFullyTransferred ? <span className="text-green-600 text-[10px] font-medium">✓ All transferred</span> : currentUpdateData.completedQuantity > remainingQty ? <span className="text-red-500 text-[10px]">Max {remainingQty}</span> : null}
                            </div>
                          </td>
                          <td className="px-2 py-1.5"><textarea className="w-full py-1 px-2 text-[11px] border border-gray-300 rounded resize-none" rows={1} placeholder="Remarks..." value={currentUpdateData.remarks} onChange={(e) => handleRemarksChange(articleId, e.target.value)} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="h-20 shrink-0" aria-hidden="true" />
            </div>
          </div>
        </>
        );
      })()}

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
        const nextFloor = firstWithQty ? (updateContainerNextFloor || "Secondary Checking") : "";
        return (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => { setShowUpdateContainerModal(false); setUpdateContainerBarcode(""); setUpdateContainerCheckStatus("idle"); setUpdateContainerFetched(null); }} aria-hidden />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl border-2 border-gray-300 max-w-md w-full p-4">
              <h4 className="text-sm font-bold text-gray-800 mb-3">Scan bag/container</h4>
              <p className="text-[11px] text-gray-600 mb-3">Scan container for boarding completed articles. All articles with completed qty will be added.</p>
              <div className="space-y-2 mb-3">
                <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Container barcode</label>
                <input type="text" className="w-full border-2 border-gray-300 rounded px-3 py-2 text-sm" placeholder="Scan or enter barcode..." value={updateContainerBarcode} onChange={(e) => setUpdateContainerBarcode(e.target.value)} />
                {updateContainerCheckStatus === "loading" && <p className="text-[11px] text-gray-500">Checking...</p>}
                {updateContainerCheckStatus === "not-found" && <p className="text-[11px] text-red-600">Container not found.</p>}
                {updateContainerCheckStatus === "already-filled" && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mt-1">
                  This container is not empty. It is assigned to <strong>{updateContainerFetched?.activeFloor ?? 'unknown'}</strong>
                  {updateContainerFetched?.activeItems?.length ? ` with ${updateContainerFetched.activeItems.length} item(s)` : ''}. Use another container.
                </p>
              )}
                {updateContainerCheckStatus === "ok" && (
                  <p className="text-[11px] text-green-600">
                    {updateContainerFetched?.activeItems?.length
                      ? `Container has items for ${updateContainerFetched.activeFloor ?? "this floor"}. You can add another article.`
                      : "Container is empty and ready."}
                  </p>
                )}
              </div>
              {articlesWithQty.length > 0 && (
                <div className={updateContainerCheckStatus !== "ok" ? "opacity-60 pointer-events-none" : ""}>
                  <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Articles to add</label>
                  <div className="p-2 bg-gray-50 rounded border border-gray-200 text-[11px] space-y-0.5">
                    {articlesWithQty.map(({ article, quantity }) => (
                      <div key={article.id ?? article._id}>{article.articleNumber ?? article.id ?? article._id}: {quantity}</div>
                    ))}
                  </div>
                </div>
              )}
              <div className={updateContainerCheckStatus !== "ok" ? "opacity-60 pointer-events-none" : ""}>
                <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Next floor</label>
                <input type="text" readOnly value={nextFloor || "—"} className="w-full border-2 border-gray-300 rounded px-3 py-1.5 text-[11px] bg-gray-100 text-gray-700 cursor-not-allowed" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                <button type="button" className="px-3 py-1.5 text-[11px] font-bold rounded border-2 border-gray-300 hover:bg-gray-50" onClick={() => { setShowUpdateContainerModal(false); setUpdateContainerBarcode(""); setUpdateContainerCheckStatus("idle"); setUpdateContainerFetched(null); }}>Cancel</button>
                <button
                  type="button"
                  disabled={updateContainerCheckStatus !== "ok" || !updateContainerBarcode.trim() || !nextFloor || articlesWithQty.length === 0 || updateContainerSubmitting}
                  className="px-3 py-1.5 text-[11px] font-bold rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  onClick={async () => {
                    const barcode = updateContainerBarcode.trim();
                    const floor = nextFloor.trim();
                    if (!barcode || !floor || articlesWithQty.length === 0) return;
                    let activeItems = articlesWithQty.map(({ article, quantity }) => ({
                      article: article._id ?? article.id ?? "",
                      quantity,
                    })).filter((i) => i.article);
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
                      if (!msg.includes("404")) toast.error(msg);
                    }
                  }}
                >{updateContainerSubmitting ? "..." : "Update & submit order"}</button>
              </div>
            </div>
          </div>
        </>
        );
      })()}

      {showContainerScanDrawer && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => { setShowContainerScanDrawer(false); setContainerScanned(null); setContainerScanBarcode(""); }} aria-hidden />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col overflow-hidden animate-slide-in-right">
            <div className="flex justify-between items-center p-[10px] border-b border-gray-200"><h3 className="text-sm font-bold text-gray-800">Scan Container</h3><button type="button" onClick={() => { setShowContainerScanDrawer(false); setContainerScanned(null); setContainerScanBarcode(""); }} className="text-gray-500 hover:text-gray-700 p-1"><i className="ri-close-line text-lg" /></button></div>
            <div className="flex-1 overflow-y-auto p-[10px]">
              {!containerScanned ? (
                <div className="space-y-3"><label className="block text-[11px] font-bold text-gray-700">Barcode</label><div className="flex gap-2"><input type="text" className="flex-1 border-2 border-gray-300 rounded px-3 py-2 text-sm" placeholder="Scan or enter barcode" value={containerScanBarcode} onChange={(e) => setContainerScanBarcode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleGetContainerByBarcode()} /><button type="button" onClick={handleGetContainerByBarcode} disabled={containerScanLoading || !containerScanBarcode.trim()} className="px-3 py-2 bg-green-600 text-white text-[11px] font-bold rounded hover:bg-green-700 disabled:opacity-50">Get</button></div>{containerScanLoading && <p className="text-[11px] text-gray-500">Loading...</p>}</div>
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
                    <button type="button" onClick={handleAcceptArticleQuantity} disabled={acceptArticleLoading || !containerBelongsToCurrentFloor} className="w-full px-3 py-2 bg-green-600 text-white text-[11px] font-bold rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">{acceptArticleLoading ? "..." : "Accept container (Boarding)"}</button>
                  ) : (
                    <p className="text-[11px] text-amber-600">No articles in container.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {showAssignDrawer && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={handleCloseAssignDrawer} aria-hidden />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col overflow-hidden animate-slide-in-right">
            <div className="flex justify-between items-center p-[10px] border-b border-gray-200"><h3 className="text-sm font-bold text-gray-800">Assign to team member (Boarding)</h3><button type="button" onClick={handleCloseAssignDrawer} className="text-gray-500 hover:text-gray-700 p-1"><i className="ri-close-line text-lg" /></button></div>
            <div className="flex-1 overflow-y-auto p-[10px]">{!activeArticleId && <p className="text-[11px] text-amber-600 mb-2">Scan container and accept article first to assign.</p>}{assignTeamLoading ? <p className="text-[11px] text-gray-500">Loading team...</p> : <ul className="space-y-2">{assignTeamMembers.map((m) => (<li key={m._id} className="flex items-center justify-between gap-2 border border-gray-200 rounded p-2"><span className="text-[12px] font-medium text-gray-900">{m.teamMemberName}</span><button type="button" onClick={() => handleAssignToMember(m)} disabled={!activeArticleId || assigningInProgress} className="px-2 py-1 text-[10px] font-bold rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">Assign</button></li>))}</ul>}</div>
          </div>
        </>
      )}

      {confirmAssignModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"><div className="bg-white rounded-lg shadow-xl p-4 max-w-sm w-full"><p className="text-sm text-gray-800 mb-4">Assign active article to <strong>{confirmAssignModal.teamMemberName}</strong>?</p><div className="flex justify-end gap-2"><button type="button" className="px-3 py-1.5 text-[11px] font-bold rounded border border-gray-300 hover:bg-gray-50" onClick={() => setConfirmAssignModal(null)}>Cancel</button><button type="button" className="px-3 py-1.5 text-[11px] font-bold rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50" onClick={handleConfirmAssign} disabled={assigningInProgress}>{assigningInProgress ? "..." : "Confirm"}</button></div></div></div>
      )}

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
              <div>
                <label className="text-xs font-medium text-gray-600">Priority</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(selectedOrder.priority)}`}>
                    {selectedOrder.priority}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(selectedOrder.status)}`}>
                    {selectedOrder.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Articles View with Table */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium text-gray-900">Article Details</h4>
                <button
                  onClick={() => setShowLogsSection(!showLogsSection)}
                  className={`ti-btn ti-btn-sm min-w-[120px] text-xs ${showLogsSection ? 'ti-btn-primary' : 'ti-btn-secondary'}`}
                >
                  <i className="ri-file-list-line me-2"></i>
                  {showLogsSection ? 'Hide Logs' : 'Logs'}
                </button>
              </div>

              {/* Excel-like Table View */}
              <div className="border border-gray-300 rounded overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs border-collapse">
                    <thead className="bg-gray-100 border-b border-gray-300">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Article</th>
                        <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Planned</th>
                        <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Received</th>
                        <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Completed</th>
                        <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Transferred</th>
                        <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Remaining</th>
                        <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Progress</th>
                        <th className="px-2 py-1.5 text-center font-semibold text-gray-700 whitespace-nowrap">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {modalArticles.map((article, idx) => {
                        const plannedQty = article.plannedQuantity || 0;
                        const receivedQty = article.floorQuantities?.boarding?.received || 0;
                        const completedQty = article.floorQuantities?.boarding?.completed || 0;
                        const transferredQty = article.floorQuantities?.boarding?.transferred || 0;
                        const remainingQty = article.floorQuantities?.boarding?.remaining || 0;
                        const progress = receivedQty > 0 ? Math.round((transferredQty / receivedQty) * 100) : 0;
                        
                        return (
                          <tr key={article.id || article._id} className="hover:bg-gray-50">
                            <td className="px-2 py-1.5 border-r border-gray-300">
                              <div className="font-medium text-gray-900">{article.articleNumber || `Article ${idx + 1}`}</div>
                              <div className="text-gray-500 text-xs mt-0.5">{article.linkingType || 'N/A'}</div>
                              {article.priority && (
                                <div className="mt-0.5">
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getPriorityBadge(article.priority)}`}>
                                    {article.priority}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-1.5 text-center border-r border-gray-300 text-gray-700">{plannedQty.toLocaleString()}</td>
                            <td className="px-2 py-1.5 border-r border-gray-300 align-top min-w-[120px]">
                              <ReceivedQuantityDisplay
                                received={receivedQty}
                                repairReceived={article.floorQuantities?.boarding?.repairReceived}
                                repairFromFloor={article.floorQuantities?.boarding?.repairFromFloor}
                              />
                            </td>
                            <td className="px-2 py-1.5 text-center border-r border-gray-300 text-green-600 font-medium">{completedQty.toLocaleString()}</td>
                            <td className="px-2 py-1.5 text-center border-r border-gray-300 text-green-600 font-medium">{transferredQty.toLocaleString()}</td>
                            <td className="px-2 py-1.5 text-center border-r border-gray-300 text-orange-600 font-medium">{remainingQty.toLocaleString()}</td>
                            <td className="px-2 py-1.5 text-center border-r border-gray-300">
                              <div className="text-gray-700 font-medium">{progress}%</div>
                            </td>
                            <td className="px-2 py-1.5">
                              {article.remarks ? (
                                <div className="text-gray-700 text-xs max-w-xs truncate" title={article.remarks}>
                                  {article.remarks}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

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
                          const receivedQty = article.floorQuantities?.boarding?.received || 0;
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

export default BoardingFloorSupervisorPage;
