"use client";
import React, { useState, useEffect, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import { productionService, FloorOrderFilters, ProductionOrder, Article } from "@/shared/services/productionService";
import { API_BASE_URL } from "@/shared/data/utilities/api";
import NumericInput from "@/shared/utils/numericInput";
import { containersMasterService, hasActiveItems, getContainerArticles } from "@/shared/services/containersMasterService";
import ReceivedQuantityDisplay from "@/shared/components/production/ReceivedQuantityDisplay";
import WarehouseOrderBreakdownCell from "./WarehouseOrderBreakdownCell";
import WarehouseQtyStyleBrandLines from "./WarehouseQtyStyleBrandLines";
import WarehouseArticleViewTab from "./WarehouseArticleViewTab";
import WarehouseMyTeamTab from "./WarehouseMyTeamTab";
import UpcomingTab from "@/app/production/floor-supervisor/components/UpcomingTab";
import { teamMasterService, type TeamMaster } from "@/shared/services/teamMasterService";

type WarehouseFloorTab = "orders" | "article-view" | "my-team" | "upcoming";

/**
 * When true: only Article view is shown; Orders / My Team / Upcoming tabs are hidden.
 * Set to `false` to restore the full tab bar and tab switching.
 */
const WAREHOUSE_FLOOR_HIDE_ORDERS_MY_TEAM_UPCOMING_TABS = true;

export interface WarehouseFloorSupervisorDashboardProps {
  /** Browser tab / SEO title */
  seoTitle?: string;
  /** Main H1 on the page */
  pageHeading?: string;
  /** Help popover title */
  helpTitle?: string;
}

export default function WarehouseFloorSupervisorDashboard({
  seoTitle = "Warehouse Floor Supervisor Dashboard",
  pageHeading = "Warehouse Floor Supervisor Dashboard",
  helpTitle = "Warehouse Floor Supervisor Dashboard",
}: WarehouseFloorSupervisorDashboardProps = {}) {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
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
  const [activeUpdateTabIndex, setActiveUpdateTabIndex] = useState(0);
  const [activeViewTabIndex, setActiveViewTabIndex] = useState(0);
  const [updateData, setUpdateData] = useState<{ [key: string]: { completedQuantity: number; remarks: string } }>({});
  const [showContainerScanDrawer, setShowContainerScanDrawer] = useState(false);
  const [containerScanBarcode, setContainerScanBarcode] = useState("");
  const [containerScanLoading, setContainerScanLoading] = useState(false);
  const [containerScanned, setContainerScanned] = useState<{
    container: any;
    articles: Array<{ article: Article | null; quantity: number }>;
  } | null>(null);
  const [acceptArticleLoading, setAcceptArticleLoading] = useState(false);
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
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
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [activeTab, setActiveTab] = useState<WarehouseFloorTab>("article-view");
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [showAssignDrawer, setShowAssignDrawer] = useState(false);
  const [assignTeamMembers, setAssignTeamMembers] = useState<TeamMaster[]>([]);
  const [assignTeamLoading, setAssignTeamLoading] = useState(false);
  const [confirmAssignModal, setConfirmAssignModal] = useState<{
    teamMemberName: string;
    teamMemberId: string;
    articleId: string;
  } | null>(null);
  const [assigningInProgress, setAssigningInProgress] = useState(false);
  const [removingArticleMemberId, setRemovingArticleMemberId] = useState<string | null>(null);

  // Load warehouse floor orders from API
  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const apiFilters: FloorOrderFilters = {
        page: currentPage,
        limit: itemsPerPage,
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
        ...(searchQuery && { search: searchQuery })
      };

      const response = await productionService.getFloorOrders('Warehouse', apiFilters);
      
      if (response.success) {
        console.log('Warehouse orders loaded:', response.data.results);
        setOrders(response.data.results);
        setTotalPages(response.data.totalPages);
        setTotalResults(response.data.totalResults);
      } else {
        console.error('Failed to load warehouse orders:', response.error);
        toast.error('Failed to load warehouse orders');
      }
    } catch (error: any) {
      console.error('Error loading warehouse orders:', error);
      toast.error(error.message || 'Failed to load warehouse orders');
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadOrders();
    }, 500); // 500ms delay

    return () => clearTimeout(timeoutId);
  }, [currentPage, itemsPerPage, filters, searchQuery]);

  const filterOrdersByReceivedQuantity = (orderList: ProductionOrder[]): ProductionOrder[] => {
    return orderList
      .map((order) => {
        const filteredArticles = order.articles.filter((article) => {
          const receivedQuantity = article.floorQuantities?.warehouse?.received || 0;
          return receivedQuantity > 0;
        });
        return { ...order, articles: filteredArticles };
      })
      .filter((order) => order.articles.length > 0);
  };

  const paginatedOrders = filterOrdersByReceivedQuantity(orders);

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
    const aid = article?.id ?? article?._id;
    setSelectedArticleId(article && aid != null ? String(aid) : null);
    setActiveViewTabIndex(0);
    setShowViewModal(true);
  };

  const handleUpdateOrder = (order: ProductionOrder, article?: Article) => {
    setSelectedOrder(order);
    const aid = article?.id ?? article?._id;
    setSelectedArticleId(article && aid != null ? String(aid) : null);
    setActiveUpdateTabIndex(0);
    const articlesScope = article
      ? order.articles.filter((a) => String(a.id ?? a._id) === String(article.id ?? article._id))
      : order.articles;
    const initialData: { [key: string]: { completedQuantity: number; remarks: string } } = {};
    articlesScope.forEach((a) => {
      const articleId = a.id || a._id;
      if (articleId) {
        initialData[articleId] = {
          completedQuantity: a.floorQuantities?.warehouse?.completed ?? 0,
          remarks: a.remarks || "",
        };
      }
    });
    setUpdateData(initialData);
    setShowLogsSection(false);
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

  const handleCompletedQuantityChange = (articleId: string, value: number) => {
    setUpdateData((prev) => ({
      ...prev,
      [articleId]: {
        ...prev[articleId],
        completedQuantity: Math.max(0, value),
      },
    }));
  };

  const handleRemarksChange = (articleId: string, value: string) => {
    setUpdateData((prev) => ({
      ...prev,
      [articleId]: {
        remarks: value,
        completedQuantity: prev[articleId]?.completedQuantity ?? 0,
      },
    }));
  };

  const handleUpdateSubmit = async () => {
    if (!selectedOrder) return;

    const articlesToUpdate = selectedArticleId
      ? selectedOrder.articles.filter((a) => String(a.id ?? a._id) === String(selectedArticleId))
      : selectedOrder.articles;

    const invalidArticles = articlesToUpdate.filter((article) => {
      const articleId = article.id || article._id;
      if (!articleId) return false;
      const update = updateData[articleId];
      if (!update) return false;
      const received = article.floorQuantities?.warehouse?.received || 0;
      return update.completedQuantity > received;
    });

    if (invalidArticles.length > 0) {
      toast.error("Warehouse completed quantity cannot exceed received quantity for some articles");
      return;
    }

    try {
      setIsLoading(true);

      const updatePromises = articlesToUpdate.map(async (article) => {
        const articleId = article.id || article._id;
        if (!articleId) return null;
        
        const update = updateData[articleId];
        const prevCompleted = article.floorQuantities?.warehouse?.completed ?? 0;
        if (update && (update.completedQuantity !== prevCompleted || update.remarks !== (article.remarks || ""))) {
          const progressData = {
            completedQuantity: update.completedQuantity,
            remarks: update.remarks,
          };
          
          try {
            const response = await productionService.updateArticleProgress(
              'Warehouse',
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
      loadOrders();
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

  const hasActiveFilters = searchQuery || Object.values(filters).some((value) => value !== "");

  /** Articles shown in view/update modals when opened from article view with a single article. */
  const selectedOrderModalArticles = React.useMemo(() => {
    if (!selectedOrder) return [];
    if (!selectedArticleId) return selectedOrder.articles;
    return selectedOrder.articles.filter((a) => String(a.id ?? a._id) === String(selectedArticleId));
  }, [selectedOrder, selectedArticleId]);

  const findArticleInOrders = useCallback(
    (articleId: string): Article | null => {
      for (const order of orders) {
        const art = order.articles.find((a) => (a._id || a.id) === articleId);
        if (art) return art;
      }
      return null;
    },
    [orders]
  );

  const CURRENT_FLOOR = "Warehouse";
  const normalizeFloor = (f: string | undefined) => (f ?? "").replace(/\s+/g, "").toLowerCase();
  const containerBelongsToCurrentFloor =
    Boolean(containerScanned) &&
    normalizeFloor(containerScanned?.container?.activeFloor) === normalizeFloor(CURRENT_FLOOR);

  const handleScanContainerClick = () => {
    setContainerScanned(null);
    setContainerScanBarcode("");
    setShowContainerScanDrawer(true);
  };

  const handleGetContainerByBarcode = async () => {
    const barcode = containerScanBarcode.trim();
    if (!barcode) return;
    setContainerScanLoading(true);
    setContainerScanned(null);
    try {
      const container = await containersMasterService.getByBarcode(barcode);
      const articlesRaw = getContainerArticles(container);
      const articlePromises = articlesRaw.map((a) => {
        const art = findArticleInOrders(a.articleId);
        if (art) return Promise.resolve({ article: art, quantity: a.quantity });
        return productionService.getArticle(a.articleId).then((r) =>
          r.success && r.data ? { article: r.data as Article, quantity: a.quantity } : { article: null, quantity: a.quantity }
        );
      });
      const resolved = await Promise.all(articlePromises);
      setContainerScanned({ container, articles: resolved });
      if (normalizeFloor(container.activeFloor) !== normalizeFloor(CURRENT_FLOOR)) {
        toast.error(
          `This container belongs to "${container.activeFloor ?? "unknown"}", not ${CURRENT_FLOOR}. Accept is disabled until the container is assigned to Warehouse.`
        );
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
      await containersMasterService.acceptByBarcode(barcode);
      try {
        await containersMasterService.clearActiveByBarcode(barcode);
      } catch {
        /* best-effort */
      }
      const first = containerScanned.articles.find((a) => a.article);
      if (first?.article) setActiveArticleId(String((first.article as Article)._id ?? first.article.id ?? ""));
      toast.success("Article quantity accepted on Warehouse. Received lines (style / brand) appear after refresh.");
      setShowContainerScanDrawer(false);
      setContainerScanned(null);
      setContainerScanBarcode("");
      loadOrders();
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
      const data = await teamMasterService.list({ workingFloor: "Warehouse", limit: 200 });
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
    setConfirmAssignModal({
      teamMemberName: member.teamMemberName,
      teamMemberId: member._id,
      articleId: activeArticleId,
    });
  };

  const handleConfirmAssign = async () => {
    if (!confirmAssignModal?.articleId) return;
    setAssigningInProgress(true);
    try {
      await teamMasterService.addActiveArticle(confirmAssignModal.teamMemberId, confirmAssignModal.articleId);
      toast.success(`Article assigned to ${confirmAssignModal.teamMemberName}`);
      setConfirmAssignModal(null);
      const data = await teamMasterService.list({ workingFloor: "Warehouse", limit: 200 });
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
      const data = await teamMasterService.list({ workingFloor: "Warehouse", limit: 200 });
      setAssignTeamMembers(data.results);
      loadOrders();
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
      'On Hold': 'bg-red-100 text-red-800',
      'Cancelled': 'bg-gray-100 text-gray-800'
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
      <Seo title={seoTitle} />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-teal-600 rounded-full" />
              <h1 className="text-sm font-bold text-gray-800">{pageHeading}</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">{totalResults}</span>
              <HelpIcon
                title={helpTitle}
                content={
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-lg mb-2">What is this page?</h4>
                      <p className="text-gray-700">
                        Production articles on the <strong>Warehouse</strong> floor: scan a container assigned to Warehouse,{" "}
                        <strong>Accept Article Quantity</strong> (same flow as Dispatch). Backend stores <code>warehouse.receivedData</code> and
                        aggregates <code>received</code> / <code>completed</code> / <code>transferred</code>.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-2">What can you do here?</h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        <li>
                          <strong>Article view / Orders:</strong> Same layout as Dispatch — filters, search, WH line breakdown
                        </li>
                        <li>
                          <strong>Scan container:</strong> Accept qty; Dispatch <code>transferredData</code> preview when present
                        </li>
                        <li>
                          <strong>Update:</strong> Completed qty (≤ received) and remarks
                        </li>
                        <li>
                          <strong>My Team / Upcoming:</strong> Warehouse floor team and active containers
                        </li>
                      </ul>
                    </div>
                  </div>
                }
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
                onClick={handleScanContainerClick}
                title="Scan container"
              >
                <i className="ri-barcode-line text-xs" />
                Scan Container
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 transition-colors shadow-sm"
                onClick={loadOrders}
                disabled={isLoading}
                title="Refresh"
              >
                <i className={`ri-refresh-line text-xs ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <div className="bg-teal-50 border border-teal-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wide">In Progress</span>
              <span className="text-sm font-bold text-teal-900">
                {orders.filter((o) => o.status === "In Progress").length}
              </span>
            </div>
            <div className="bg-green-50 border border-green-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Received</span>
              <span className="text-sm font-bold text-green-900">
                {orders.reduce(
                  (sum, order) =>
                    sum + order.articles.reduce((articleSum, article) => articleSum + (article.floorQuantities?.warehouse?.received || 0), 0),
                  0
                )}
              </span>
            </div>
            <div className="bg-yellow-50 border border-yellow-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-yellow-700 uppercase tracking-wide">Transferred</span>
              <span className="text-sm font-bold text-yellow-900">
                {orders.reduce(
                  (sum, order) =>
                    sum + order.articles.reduce((articleSum, article) => articleSum + (article.floorQuantities?.warehouse?.transferred || 0), 0),
                  0
                )}
              </span>
            </div>
            <div className="bg-red-50 border border-red-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-red-700 uppercase tracking-wide">Repair in</span>
              <span className="text-sm font-bold text-red-900">
                {orders.reduce(
                  (sum, order) =>
                    sum +
                    order.articles.reduce((articleSum, article) => articleSum + (article.floorQuantities?.warehouse?.repairReceived || 0), 0),
                  0
                )}
              </span>
            </div>
          </div>

          {!WAREHOUSE_FLOOR_HIDE_ORDERS_MY_TEAM_UPCOMING_TABS && (
            <div className="flex border-b border-gray-300 mb-0">
              <button
                type="button"
                className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
                  activeTab === "orders" ? "border-teal-600 text-teal-600" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("orders")}
              >
                Orders
              </button>
              <button
                type="button"
                className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
                  activeTab === "article-view" ? "border-teal-600 text-teal-600" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("article-view")}
              >
                Article view
              </button>
              <button
                type="button"
                className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
                  activeTab === "my-team" ? "border-teal-600 text-teal-600" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("my-team")}
              >
                My Team
              </button>
              <button
                type="button"
                className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
                  activeTab === "upcoming" ? "border-teal-600 text-teal-600" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("upcoming")}
              >
                Upcoming
              </button>
            </div>
          )}
        </div>

        <div className="min-h-[300px]">
          {WAREHOUSE_FLOOR_HIDE_ORDERS_MY_TEAM_UPCOMING_TABS ? (
            <WarehouseArticleViewTab
              orders={paginatedOrders}
              onViewOrder={handleViewOrder}
              onUpdateOrder={handleUpdateOrder}
              getStatusBadge={getStatusBadge}
              getPriorityBadge={getPriorityBadge}
              activeArticleId={activeArticleId}
              onAssignClick={handleOpenAssignDrawer}
              onScanContainerClick={handleScanContainerClick}
            />
          ) : activeTab === "my-team" ? (
            <WarehouseMyTeamTab />
          ) : activeTab === "upcoming" ? (
            <UpcomingTab floorName="Warehouse" />
          ) : activeTab === "article-view" ? (
            <WarehouseArticleViewTab
              orders={paginatedOrders}
              onViewOrder={handleViewOrder}
              onUpdateOrder={handleUpdateOrder}
              getStatusBadge={getStatusBadge}
              getPriorityBadge={getPriorityBadge}
              activeArticleId={activeArticleId}
              onAssignClick={handleOpenAssignDrawer}
              onScanContainerClick={handleScanContainerClick}
            />
          ) : (
            <>
              <div className="p-[10px] flex flex-wrap items-center gap-2 border-b border-gray-300">
                <button
                  type="button"
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border transition-colors ${
                    showFilters ? "bg-teal-600 text-white border-teal-600" : "bg-white border-gray-200 text-[#495057] hover:bg-gray-50"
                  }`}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <i className="ri-filter-3-line text-xs" /> Filters {hasActiveFilters && <span className="ml-1">●</span>}
                </button>
                {hasActiveFilters && (
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[11px] font-bold rounded hover:bg-gray-50"
                    onClick={clearFilters}
                  >
                    <i className="ri-close-line text-xs" /> Clear
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
                  <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
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
                  <select
                    className="bg-white border border-gray-300 text-[11px] rounded px-2 py-1.5"
                    value={filters.status}
                    onChange={(e) => handleFilterChange("status", e.target.value)}
                  >
                    <option value="">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                  <select
                    className="bg-white border border-gray-300 text-[11px] rounded px-2 py-1.5"
                    value={filters.priority}
                    onChange={(e) => handleFilterChange("priority", e.target.value)}
                  >
                    <option value="">All Priorities</option>
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                  <select
                    className="bg-white border border-gray-300 text-[11px] rounded px-2 py-1.5"
                    value={filters.linkingType}
                    onChange={(e) => handleFilterChange("linkingType", e.target.value)}
                  >
                    <option value="">All Types</option>
                    <option value="Auto Linking">Auto Linking</option>
                    <option value="Rosso Linking">Rosso Linking</option>
                    <option value="Hand Linking">Hand Linking</option>
                  </select>
                  <input
                    type="text"
                    className="bg-white border border-gray-300 text-[11px] rounded px-2 py-1.5 w-28"
                    placeholder="Floor..."
                    value={filters.floor}
                    onChange={(e) => handleFilterChange("floor", e.target.value)}
                  />
                </div>
              )}

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-4 opacity-50" />
                  <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <i className="ri-file-list-line text-xl text-gray-200" />
                  </div>
                  <h3 className="text-xs font-bold text-gray-400 mb-1">NO ORDERS FOUND</h3>
                  <p className="text-[10px] text-gray-500">
                    {hasActiveFilters ? "Try adjusting filters or search" : "No orders at Warehouse"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50/30">
                        <th className="pl-[10px] pr-1 py-2.5 w-10 border border-gray-200">
                          <input
                            type="checkbox"
                            checked={selectAll}
                            onChange={handleSelectAll}
                            className="rounded border-gray-200 text-teal-600 focus:ring-0 h-3.5 w-3.5"
                          />
                        </th>
                        <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                          Order Info
                        </th>
                        <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                          Articles
                        </th>
                        <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 min-w-[200px]">
                          WH lines
                        </th>
                        <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                          Status
                        </th>
                        <th className="px-1.5 py-2.5 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="pl-[10px] pr-1 py-2.5 border border-gray-200">
                            <input
                              type="checkbox"
                              checked={selectedOrders.includes(order.id)}
                              onChange={() => handleOrderSelect(order.id)}
                              className="rounded border-gray-200 text-teal-600 focus:ring-0 h-3.5 w-3.5"
                            />
                          </td>
                          <td className="px-1.5 py-2.5 border border-gray-200">
                            <div className="text-[12px] font-bold text-gray-900">{order.orderNumber || order.id}</div>
                            <div className="text-[10px] text-gray-500">
                              {order.createdAt
                                ? new Date(order.createdAt).toLocaleDateString()
                                : order.articles?.[0]?.createdAt
                                  ? new Date(order.articles[0].createdAt).toLocaleDateString()
                                  : "N/A"}
                            </div>
                          </td>
                          <td className="px-1.5 py-2.5 border border-gray-200">
                            <div className="text-[12px] font-medium text-gray-600">
                              {order.articles.length} Article{order.articles.length !== 1 ? "s" : ""} · Qty{" "}
                              {order.articles.reduce((s, a) => s + (a.plannedQuantity || 0), 0).toLocaleString()}
                            </div>
                            {order.articles.some((a) => a.floorQuantities?.warehouse) && (
                              <div className="text-[10px] text-teal-600 mt-0.5">
                                R:
                                {order.articles.reduce((s, a) => s + (a.floorQuantities?.warehouse?.received || 0), 0)} Cmp:
                                {order.articles.reduce((s, a) => s + (a.floorQuantities?.warehouse?.completed || 0), 0)} Trf:
                                {order.articles.reduce((s, a) => s + (a.floorQuantities?.warehouse?.transferred || 0), 0)} Rem:
                                {order.articles.reduce((s, a) => s + (a.floorQuantities?.warehouse?.remaining ?? 0), 0)}
                              </div>
                            )}
                          </td>
                          <td className="px-1.5 py-2.5 border border-gray-200 align-top">
                            <WarehouseOrderBreakdownCell order={order} />
                          </td>
                          <td className="px-1.5 py-2.5 border border-gray-200">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${getStatusBadge(order.status)}`}>
                              {order.status}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ml-1 ${getPriorityBadge(order.priority)}`}>
                              {order.priority}
                            </span>
                          </td>
                          <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                            <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100">
                              <button
                                className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-400 border border-blue-100 rounded hover:bg-blue-100"
                                onClick={() => handleViewOrder(order)}
                                title="View"
                              >
                                <i className="ri-eye-line text-xs" />
                              </button>
                              <button
                                className="w-7 h-7 flex items-center justify-center bg-emerald-50 text-emerald-400 border border-emerald-100 rounded hover:bg-emerald-100"
                                onClick={() => handleUpdateOrder(order)}
                                title="Update"
                              >
                                <i className="ri-edit-line text-xs" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!isLoading && orders.length > 0 && (
                <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200">
                  <div className="text-[11px] font-medium text-[#495057]">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalResults)} of {totalResults}{" "}
                    entries
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      Prev
                    </button>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      const pageNum =
                        totalPages <= 7 ? i + 1 : currentPage <= 4 ? i + 1 : currentPage >= totalPages - 3 ? totalPages - 6 + i : currentPage - 3 + i;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded ${
                            currentPage === pageNum ? "bg-teal-600 text-white shadow-md" : "text-gray-400 hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                      className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {/* Update Order Modal */}
      {showUpdateModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Update Order - {selectedOrder.orderNumber || selectedOrder.id}</h3>
              <button
                onClick={closeUpdateModal}
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

            {/* Info Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-4">
              <p className="text-xs text-blue-800">
                <i className="ri-information-line me-1"></i>
                <strong>Note:</strong> <strong>Completed</strong> is cumulative processing on Warehouse and cannot exceed <strong>received</strong> (from container accept). Line-level <strong>receivedData</strong> / <strong>transferredData</strong> (style · brand · qty) is shown in the WH lines column and below.
              </p>
            </div>
            {(selectedOrderModalArticles.some((a) => (a.floorQuantities?.warehouse?.receivedData?.length ?? 0) > 0) ||
              selectedOrderModalArticles.some((a) => (a.floorQuantities?.warehouse?.transferredData?.length ?? 0) > 0)) && (
              <div className="mb-4 border border-slate-200 rounded-lg p-3 bg-slate-50/80">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">Warehouse line breakdown (this order)</h4>
                <WarehouseOrderBreakdownCell order={{ ...selectedOrder, articles: selectedOrderModalArticles }} />
              </div>
            )}

            {/* Excel-like Table Form */}
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
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap bg-yellow-50">Completed (≤ received)</th>
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-700 whitespace-nowrap">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedOrderModalArticles.map((article, idx) => {
                      const articleId = article.id || article._id;
                      if (!articleId) return null;

                      const currentUpdateData = updateData[articleId] || {
                        completedQuantity: article.floorQuantities?.warehouse?.completed ?? 0,
                        remarks: article.remarks || "",
                      };

                      const plannedQty = article.plannedQuantity || 0;
                      const receivedQty = article.floorQuantities?.warehouse?.received || 0;
                      const transferredQty = article.floorQuantities?.warehouse?.transferred || 0;
                      const remainingQty = article.floorQuantities?.warehouse?.remaining ?? Math.max(0, receivedQty - transferredQty);
                      const noReceivedYet = receivedQty <= 0;

                      return (
                        <tr key={articleId} className="hover:bg-gray-50">
                          <td className="px-2 py-1.5 border-r border-gray-300 align-top">
                            <WarehouseQtyStyleBrandLines lines={article.floorQuantities?.warehouse?.receivedData} variant="panel" tone="received" />
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <div className="text-[9px] font-bold uppercase tracking-wide text-gray-400">Article (ref)</div>
                              <div className="text-xs text-gray-600">{article.articleNumber || `Article ${idx + 1}`}</div>
                              <div className="text-[10px] text-gray-400">{article.linkingType || "N/A"}</div>
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-center border-r border-gray-300 text-gray-700">{plannedQty.toLocaleString()}</td>
                          <td className="px-2 py-1.5 text-center border-r border-gray-300 text-blue-600 font-medium">{receivedQty.toLocaleString()}</td>
                          <td className="px-2 py-1.5 text-center border-r border-gray-300 text-green-600 font-medium">{transferredQty.toLocaleString()}</td>
                          <td className="px-2 py-1.5 text-center border-r border-gray-300 text-orange-600 font-medium">{remainingQty.toLocaleString()}</td>
                          <td className="px-2 py-1.5 border-r border-gray-300 bg-yellow-50">
                            <div className="flex flex-col gap-1">
                              <NumericInput
                                className={`py-1 text-xs h-7 ${
                                  noReceivedYet
                                    ? "bg-gray-100 border-gray-300 cursor-not-allowed"
                                    : currentUpdateData.completedQuantity > receivedQty
                                      ? "border-red-500 focus:border-red-500"
                                      : ""
                                }`}
                                value={currentUpdateData.completedQuantity}
                                onChange={(value) => {
                                  if (noReceivedYet) return;
                                  if (value <= receivedQty) {
                                    handleCompletedQuantityChange(articleId, value);
                                  }
                                }}
                                placeholder={noReceivedYet ? "Accept container first" : `Max: ${receivedQty}`}
                                disabled={noReceivedYet}
                                allowDecimals
                              />
                              {noReceivedYet ? (
                                <div className="text-amber-600 text-xs font-medium">Scan container → Accept first</div>
                              ) : currentUpdateData.completedQuantity > receivedQty ? (
                                <div className="text-red-500 text-xs">Max: {receivedQty}</div>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-2 py-1.5">
                            <textarea
                              className="form-control text-xs py-1 px-2 h-7 resize-none"
                              rows={1}
                              placeholder="Remarks..."
                              value={currentUpdateData.remarks}
                              onChange={(e) => handleRemarksChange(articleId, e.target.value)}
                              onFocus={(e) => {
                                e.target.rows = 2;
                                e.target.style.height = 'auto';
                              }}
                              onBlur={(e) => {
                                e.target.rows = 1;
                                e.target.style.height = '1.75rem';
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
              <button
                onClick={closeUpdateModal}
                className="ti-btn ti-btn-secondary"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSubmit}
                className="ti-btn ti-btn-primary"
                disabled={isLoading || selectedOrderModalArticles.some((article) => {
                  const articleId = article.id || article._id;
                  if (!articleId) return false;
                  const update = updateData[articleId];
                  if (!update) return false;
                  const received = article.floorQuantities?.warehouse?.received || 0;
                  return update.completedQuantity > received;
                })}
              >
                <i className={`ri-save-line me-2 ${isLoading ? 'animate-spin' : ''}`}></i>
                {isLoading ? 'Updating...' : 'Update Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Order Modal */}
      {showViewModal && selectedOrder && (
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
                      {selectedOrderModalArticles.map((article, idx) => {
                        const plannedQty = article.plannedQuantity || 0;
                        const receivedQty = article.floorQuantities?.warehouse?.received || 0;
                        const completedQty = article.floorQuantities?.warehouse?.completed ?? 0;
                        const transferredQty = article.floorQuantities?.warehouse?.transferred || 0;
                        const remainingQty = article.floorQuantities?.warehouse?.remaining ?? 0;
                        const progress = receivedQty > 0 ? Math.round((transferredQty / receivedQty) * 100) : 0;

                        return (
                          <tr key={article.id || article._id} className="hover:bg-gray-50">
                            <td className="px-2 py-1.5 border-r border-gray-300 align-top">
                              <WarehouseQtyStyleBrandLines lines={article.floorQuantities?.warehouse?.receivedData} variant="panel" tone="received" />
                              {(article.floorQuantities?.warehouse?.transferredData?.length ?? 0) > 0 && (
                                <div className="mt-2">
                                  <div className="text-[9px] font-bold uppercase tracking-wide text-gray-500 mb-1">Transferred</div>
                                  <WarehouseQtyStyleBrandLines lines={article.floorQuantities?.warehouse?.transferredData} variant="panel" tone="transferred" />
                                </div>
                              )}
                              <div className="mt-2 pt-2 border-t border-gray-100">
                                <div className="text-[9px] font-bold uppercase tracking-wide text-gray-400">Article (ref)</div>
                                <div className="text-xs text-gray-600">{article.articleNumber || `Article ${idx + 1}`}</div>
                                <div className="text-[10px] text-gray-400">{article.linkingType || "N/A"}</div>
                                {article.priority && (
                                  <div className="mt-0.5">
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getPriorityBadge(article.priority)}`}>
                                      {article.priority}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-1.5 text-center border-r border-gray-300 text-gray-700">{plannedQty.toLocaleString()}</td>
                            <td className="px-2 py-1.5 text-center border-r border-gray-300 text-blue-600 font-medium align-top">
                              <ReceivedQuantityDisplay
                                received={receivedQty}
                                repairReceived={article.floorQuantities?.warehouse?.repairReceived}
                                repairFromFloor={article.floorQuantities?.warehouse?.repairFromFloor}
                                className="text-xs justify-center"
                              />
                            </td>
                            <td className="px-2 py-1.5 text-center border-r border-gray-300 text-violet-700 font-medium">{completedQty.toLocaleString()}</td>
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

              <div className="mt-4 border border-slate-200 rounded-lg p-3 bg-slate-50/80">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">All warehouse lines (order)</h4>
                <WarehouseOrderBreakdownCell order={{ ...selectedOrder, articles: selectedOrderModalArticles }} />
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
                        {selectedOrderModalArticles.map((article) => {
                          const articleId = article._id || article.id;
                          const receivedQty = article.floorQuantities?.warehouse?.received || 0;
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
      )}

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
                <p className="text-[11px] text-[#495057]">No team members on Warehouse floor.</p>
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
                          <span
                            className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              member.role === "Supervisor"
                                ? "bg-teal-50 text-teal-700 border border-teal-100"
                                : "bg-gray-50 text-gray-600 border border-gray-200"
                            }`}
                          >
                            {member.role}
                          </span>
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
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-teal-600 text-white hover:bg-teal-700 shadow-sm disabled:opacity-50"
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

      {confirmAssignModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={() => setConfirmAssignModal(null)}>
          <div
            className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-[10px] border-b border-gray-200">
              <h4 className="text-sm font-bold text-gray-800">Confirm assign</h4>
            </div>
            <p className="p-[10px] text-[11px] text-[#495057]">
              Assigning this article to <strong>{confirmAssignModal.teamMemberName}</strong>?
            </p>
            <div className="flex justify-end gap-2 p-[10px] border-t border-gray-200">
              <button
                type="button"
                onClick={() => setConfirmAssignModal(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 shadow-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAssign}
                disabled={assigningInProgress}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-[11px] font-bold rounded hover:bg-teal-700 shadow-sm"
              >
                {assigningInProgress ? "Assigning..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scan container — accept onto Warehouse (same API pattern as Dispatch / Final Checking) */}
      {showContainerScanDrawer && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => {
              setShowContainerScanDrawer(false);
              setContainerScanned(null);
              setContainerScanBarcode("");
              setActiveArticleId(null);
            }}
            aria-hidden
          />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col overflow-hidden animate-slide-in-right">
            <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-800">Scan Container</h3>
              <button
                type="button"
                onClick={() => {
                  setShowContainerScanDrawer(false);
                  setContainerScanned(null);
                  setContainerScanBarcode("");
                  setActiveArticleId(null);
                }}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
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
                  <div className="p-2 bg-slate-50 rounded border border-slate-200 text-[12px] text-gray-900 space-y-1">
                    <h4 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider mb-2">Container</h4>
                    <div>
                      <span className="font-bold text-[#495057]">Name:</span>{" "}
                      {containerScanned.container.containerName ?? containerScanned.container.barcode ?? "—"}
                    </div>
                    <div>
                      <span className="font-bold text-[#495057]">Barcode:</span> {containerScanned.container.barcode}
                    </div>
                    <div>
                      <span className="font-bold text-[#495057]">Status:</span> {containerScanned.container.status ?? "—"}
                    </div>
                    <div>
                      <span className="font-bold text-[#495057]">Active floor:</span> {containerScanned.container.activeFloor ?? "—"}
                    </div>
                  </div>
                  <h4 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider">Items</h4>
                  <div className="p-2 bg-gray-50 rounded border border-gray-200 text-[12px] text-gray-900 space-y-1">
                    {containerScanned.articles.map((item, i) => (
                      <div key={i} className={i > 0 ? "pt-1 border-t border-gray-200 mt-1" : ""}>
                        <div>
                          <span className="font-bold text-[#495057]">{(item.article as Article | null)?.articleNumber ?? "—"}</span>
                          <span className="text-gray-600"> × {item.quantity}</span>
                        </div>
                        {item.article && (item.article.floorQuantities?.dispatch?.transferredData?.length ?? 0) > 0 ? (
                          <div className="mt-1 text-[11px] text-amber-900 bg-amber-50 border border-amber-100 rounded p-1.5">
                            <span className="font-semibold">From Dispatch (style · brand · qty):</span>
                            <ul className="mt-0.5 list-disc list-inside space-y-0.5">
                              {(item.article.floorQuantities?.dispatch?.transferredData ?? []).map((d, di) => (
                                <li key={di}>
                                  {d.transferred} · {d.styleCode || "—"} · {d.brand || "—"}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p className="mt-1 text-[10px] text-gray-500">No Dispatch line breakdown on article — accept uses container quantity; backend fills receivedData.</p>
                        )}
                      </div>
                    ))}
                    <div className="pt-1 border-t border-gray-200 mt-1">
                      <span className="font-bold text-[#495057]">Total:</span> {containerScanned.container.quantity ?? "—"}
                    </div>
                  </div>
                  {hasActiveItems(containerScanned.container) ? (
                    <>
                      {!containerBelongsToCurrentFloor && (
                        <div className="p-2 rounded border-2 border-red-400 bg-red-50 text-[11px] text-red-800">
                          This container is assigned to <strong>{containerScanned.container.activeFloor || "unknown"}</strong>, not{" "}
                          {CURRENT_FLOOR}. Accept Article is disabled.
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
    </div>
  );
}

