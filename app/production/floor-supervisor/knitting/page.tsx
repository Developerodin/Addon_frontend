"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import TransferModal from "@/shared/components/production/TransferModal";
import { productionService, ProductionOrder, FloorOrderFilters, type Article } from "@/shared/services/productionService";
import { getNextFloor, FloorType } from "@/shared/utils/productionUtils";
import { API_BASE_URL } from "@/shared/data/utilities/api";
import NumericInput from "@/shared/utils/numericInput";
import MachineViewTab from "./components/MachineViewTab";
import ArticleViewTab from "./components/ArticleViewTab";
import MachineArticlePlanningTab from "./components/MachineArticlePlanningTab";
import {
  OrderStatus,
  updateAssignmentItemStatus,
  updateAssignmentItemYarnIssueStatus,
  type MachineOrderAssignment,
  type OrderStatusType,
  type ProductionOrderItem,
} from "@/shared/services/machineOrderAssignmentService";
import { containersMasterService, isPopulatedActiveArticle } from "@/shared/services/containersMasterService";
import { PRODUCTION_FLOORS } from "@/shared/services/teamMasterService";
type KnittingTab = "orders" | "machine-view" | "article-view" | "planning";

const ORDER_STATUS_OPTIONS: OrderStatusType[] = [
  OrderStatus.PENDING,
  OrderStatus.IN_PROGRESS,
  OrderStatus.COMPLETED,
  OrderStatus.ON_HOLD,
  OrderStatus.CANCELLED,
];

/** Only first-priority item can be In Progress / Completed; others get Pending, On Hold, Cancelled only. */
function getStatusOptionsForItem(idx: number, currentStatus?: OrderStatusType): OrderStatusType[] {
  if (idx === 0) return ORDER_STATUS_OPTIONS;
  const restricted: OrderStatusType[] = [OrderStatus.PENDING, OrderStatus.ON_HOLD, OrderStatus.CANCELLED];
  const current = currentStatus ?? OrderStatus.PENDING;
  if (current === OrderStatus.IN_PROGRESS || current === OrderStatus.COMPLETED) {
    return [current, ...restricted.filter((s) => s !== current)];
  }
  return restricted;
}

const KnittingFloorSupervisorPage = () => {
  const [activeTab, setActiveTab] = useState<KnittingTab>("machine-view");
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
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [updateData, setUpdateData] = useState<{[key: string]: {completedQuantity: number, remarks: string, m4Quantity: number}}>({});
  /** Snapshot when update modal opened – used to detect changes and disable Update Order until dirty. */
  const [initialUpdateData, setInitialUpdateData] = useState<{[key: string]: {completedQuantity: number, remarks: string, m4Quantity: number}}>({});
  const [activeUpdateTabIndex, setActiveUpdateTabIndex] = useState(0);
  /** Weight modal: shown when user clicks Update Order; capture weight then call update API. */
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState<string>('');
  /** After weight, show container modal: barcode, article, next floor; then PATCH container and call handleUpdateSubmit. */
  const [showContainerModal, setShowContainerModal] = useState(false);
  const [containerBarcode, setContainerBarcode] = useState('');
  const [containerArticleId, setContainerArticleId] = useState('');
  const [containerQuantity, setContainerQuantity] = useState<string>('');
  const [containerNextFloor, setContainerNextFloor] = useState('');
  const [pendingWeightForContainer, setPendingWeightForContainer] = useState<number | undefined>(undefined);
  const [containerSubmitting, setContainerSubmitting] = useState(false);
  /** After barcode enter/scan: idle | loading | not-found | already-filled | ok. Only allow update when ok. */
  const [containerCheckStatus, setContainerCheckStatus] = useState<'idle' | 'loading' | 'not-found' | 'already-filled' | 'ok'>('idle');
  const [containerFetched, setContainerFetched] = useState<{ activeArticle?: string | { articleNumber?: string; [k: string]: unknown }; activeFloor?: string } | null>(null);
  /** Complete confirmation: show article summary and "Do you really want to complete?" before marking status Completed. */
  const [showCompleteConfirmModal, setShowCompleteConfirmModal] = useState(false);
  const [completeConfirmData, setCompleteConfirmData] = useState<{
    articleNumber: string;
    orderNumber: string;
    transferredWeight: number | null;
    m4Qty: number;
    transferQty: number;
    remainingQty: number;
    receivedQty: number;
    itemId: string;
  } | null>(null);
  const [completingStatus, setCompletingStatus] = useState(false);
  const [machineViewRefreshTrigger, setMachineViewRefreshTrigger] = useState(0);
  const [activeViewTabIndex, setActiveViewTabIndex] = useState(0);
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
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  /** When set (e.g. 1), only articles before this index are editable in update modal (machine-edit: first row editable, rest read-only). */
  const [updateModalReadOnlyFromIndex, setUpdateModalReadOnlyFromIndex] = useState<number | undefined>(undefined);
  /** When update modal opened from machine view: assignment + items so we can call status/yarn APIs. */
  const [updateModalAssignment, setUpdateModalAssignment] = useState<MachineOrderAssignment | null>(null);
  const [updateModalAssignmentItems, setUpdateModalAssignmentItems] = useState<ProductionOrderItem[] | null>(null);
  const [updatingStatusItemId, setUpdatingStatusItemId] = useState<string | null>(null);
  const [updatingYarnItemId, setUpdatingYarnItemId] = useState<string | null>(null);

  // Load knitting floor orders from API
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

      const response = await productionService.getFloorOrders('Knitting', apiFilters);
      
      if (response.success) {
        console.log('Knitting orders loaded:', response.data.results);
        setOrders(response.data.results);
        setTotalPages(response.data.totalPages);
        setTotalResults(response.data.totalResults);
      } else {
        console.error('Failed to load knitting orders:', response.error);
        toast.error('Failed to load knitting orders');
      }
    } catch (error: any) {
      console.error('Error loading knitting orders:', error);
      toast.error(error.message || 'Failed to load knitting orders');
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

  // When user enters/scans barcode in container modal, fetch container and check if already filled
  useEffect(() => {
    if (!showContainerModal) {
      setContainerCheckStatus('idle');
      setContainerFetched(null);
      return;
    }
    const barcode = containerBarcode.trim();
    if (!barcode) {
      setContainerCheckStatus('idle');
      setContainerFetched(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      setContainerCheckStatus('loading');
      setContainerFetched(null);
      containersMasterService
        .getByBarcode(barcode)
        .then((container) => {
          if (cancelled) return;
          const hasActive = !!(
            container.activeFloor?.trim() ||
            isPopulatedActiveArticle(container.activeArticle) ||
            (typeof container.activeArticle === 'string' && container.activeArticle.trim())
          );
          if (hasActive) {
            setContainerCheckStatus('already-filled');
            setContainerFetched({ activeArticle: container.activeArticle, activeFloor: container.activeFloor });
          } else {
            setContainerCheckStatus('ok');
            setContainerFetched(null);
          }
        })
        .catch((err) => {
          if (cancelled) return;
          const msg = err instanceof Error ? err.message : String(err);
          setContainerCheckStatus(msg.includes('404') ? 'not-found' : 'idle');
          setContainerFetched(null);
          if (!msg.includes('404')) toast.error(msg);
        });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [showContainerModal, containerBarcode]);

  // When article changes in container modal, pre-fill quantity from that article's knitting done (updateData)
  useEffect(() => {
    if (!showContainerModal || !containerArticleId) return;
    setContainerQuantity(String(updateData[containerArticleId]?.completedQuantity ?? 0));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only sync when article selection changes, not when updateData ref changes
  }, [showContainerModal, containerArticleId]);

  // Filter orders and articles based on received quantity
  const filterOrdersByReceivedQuantity = (orders: ProductionOrder[]): ProductionOrder[] => {
    return orders.map(order => {
      // Filter articles that have received quantity > 0
      const filteredArticles = order.articles.filter(article => {
        const receivedQuantity = article.floorQuantities?.knitting?.received || 0;
        return receivedQuantity > 0;
      });
      
      return {
        ...order,
        articles: filteredArticles
      };
    }).filter(order => {
      // Only show orders that have at least one article with received quantity > 0
      return order.articles.length > 0;
    });
  };

  // Apply filtering to orders
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

  const handleViewOrder = (order: ProductionOrder) => {
    console.log('Opening view modal for order:', order);
    console.log('Order articles:', order.articles.map(article => ({
      id: article.id,
      _id: article._id,
      articleNumber: article.articleNumber
    })));
    setSelectedOrder(order);
    setActiveViewTabIndex(0);
    setShowViewModal(true);
  };

  const handleUpdateOrder = (order: ProductionOrder) => {
    setSelectedOrder(order);
    setActiveUpdateTabIndex(0);
    setUpdateModalAssignment(null);
    setUpdateModalAssignmentItems(null);
    // Initialize update data with current values; M4 input starts empty (user enters increment)
    const initialData: {[key: string]: {completedQuantity: number, remarks: string, m4Quantity: number}} = {};
    order.articles.forEach(article => {
      const articleId = article.id || article._id;
      if (articleId) {
        initialData[articleId] = {
          completedQuantity: 0,
          remarks: article.remarks || '',
          m4Quantity: 0  // input empty; we send previous + this value to backend
        };
      }
    });
    setUpdateData(initialData);
    setInitialUpdateData(JSON.parse(JSON.stringify(initialData)));
    setShowUpdateModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedOrder(null);
    setShowLogsSection(false);
    setSelectedLogArticleId('');
    setArticleLogs([]);
  };

  const closeUpdateModal = () => {
    setShowUpdateModal(false);
    setSelectedOrder(null);
    setUpdateData({});
    setInitialUpdateData({});
    setUpdateModalReadOnlyFromIndex(undefined);
    setUpdateModalAssignment(null);
    setUpdateModalAssignmentItems(null);
    setUpdatingStatusItemId(null);
    setUpdatingYarnItemId(null);
    setShowWeightModal(false);
    setWeightInput('');
    setShowContainerModal(false);
    setContainerBarcode('');
    setContainerQuantity('');
    setContainerArticleId('');
    setContainerNextFloor('');
    setPendingWeightForContainer(undefined);
    setContainerCheckStatus('idle');
    setContainerFetched(null);
  };

  /** Open the same data-entry (update) modal from machine view: only priority orders, first editable, rest read-only. */
  const handleOpenUpdateModalFromMachine = async (assignment: MachineOrderAssignment) => {
    const items = (assignment.productionOrderItems ?? [])
      .filter((i) => i.priority != null && i.status !== OrderStatus.ON_HOLD)
      .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999))
      .slice(0, 2);
    if (items.length === 0) {
      toast.error("No priority orders for this machine");
      return;
    }
    const orderIds = [...new Set(items.map((i) => i.productionOrder))];
    const orders: ProductionOrder[] = [];
    for (const oid of orderIds) {
      const res = await productionService.getOrder(oid);
      if (res.success && res.data) orders.push(res.data);
    }
    const articles: Article[] = [];
    for (const item of items) {
      const order = orders.find((o) => o.id === item.productionOrder);
      if (!order) continue;
      const article = order.articles.find((a) => (a.id || a._id) === item.article);
      if (article) articles.push(article);
    }
    if (articles.length === 0) {
      toast.error("Could not load order/article data");
      return;
    }
    const firstOrder = orders.find((o) => o.id === items[0].productionOrder);
    if (!firstOrder) return;
    const syntheticOrder: ProductionOrder = {
      ...firstOrder,
      id: firstOrder.id,
      articles,
    };
    setSelectedOrder(syntheticOrder);
    const initialData: { [key: string]: { completedQuantity: number; remarks: string; m4Quantity: number } } = {};
    const firstArticleId = articles[0].id || articles[0]._id;
    if (firstArticleId) {
      initialData[firstArticleId] = {
        completedQuantity: 0,
        remarks: articles[0].remarks || "",
        m4Quantity: 0,
      };
    }
    setUpdateData(initialData);
    setUpdateModalReadOnlyFromIndex(1);
    setUpdateModalAssignment(assignment);
    setUpdateModalAssignmentItems(items);
    setInitialUpdateData(JSON.parse(JSON.stringify(initialData)));
    setShowUpdateModal(true);
  };

  /** Update item status from update modal (when opened from machine view). */
  const handleModalItemStatusChange = async (itemId: string, newStatus: OrderStatusType) => {
    if (!updateModalAssignment?.id || !itemId) return;
    setUpdatingStatusItemId(itemId);
    try {
      const updated = await updateAssignmentItemStatus(updateModalAssignment.id, itemId, newStatus);
      setUpdateModalAssignment(updated);
      setUpdateModalAssignmentItems((prev) =>
        prev?.map((p) => updated.productionOrderItems?.find((i) => (i.itemId ?? (i as any).id) === p.itemId) ?? p) ?? prev
      );
      toast.success("Status updated");
    } catch (e) {
      const msg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? "Failed to update status";
      toast.error(msg);
      alert(msg);
    } finally {
      setUpdatingStatusItemId(null);
    }
  };

  /** Open complete-confirm modal with article summary; on Yes, mark status Completed then close drawer and refresh. */
  const openCompleteConfirmModal = (data: {
    articleNumber: string;
    orderNumber: string;
    transferredWeight: number | null;
    m4Qty: number;
    transferQty: number;
    remainingQty: number;
    receivedQty: number;
    itemId: string;
  }) => {
    setCompleteConfirmData(data);
    setShowCompleteConfirmModal(true);
  };

  const handleCompleteConfirmYes = async () => {
    if (!completeConfirmData || !updateModalAssignment?.id) return;
    setCompletingStatus(true);
    try {
      await updateAssignmentItemStatus(updateModalAssignment.id, completeConfirmData.itemId, OrderStatus.COMPLETED);
      setUpdateModalAssignment(null);
      setUpdateModalAssignmentItems(null);
      setUpdateModalReadOnlyFromIndex(undefined);
      setShowCompleteConfirmModal(false);
      setCompleteConfirmData(null);
      setShowUpdateModal(false);
      setSelectedOrder(null);
      setUpdateData({});
      setInitialUpdateData({});
      toast.success("Article marked as Completed");
      loadOrders();
      setMachineViewRefreshTrigger((t) => t + 1);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update status";
      toast.error(msg);
    } finally {
      setCompletingStatus(false);
    }
  };

  /** Ask for yarn from update modal (when opened from machine view). */
  const handleModalAskForYarn = async (itemId: string) => {
    if (!updateModalAssignment?.id || !itemId) return;
    setUpdatingYarnItemId(itemId);
    try {
      const updated = await updateAssignmentItemYarnIssueStatus(updateModalAssignment.id, itemId, "In Progress");
      setUpdateModalAssignment(updated);
      setUpdateModalAssignmentItems((prev) =>
        prev?.map((p) => updated.productionOrderItems?.find((i) => (i.itemId ?? (i as any).id) === p.itemId) ?? p) ?? prev
      );
      toast.success("Yarn issue status set to In Progress");
    } catch (e) {
      const msg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? "Failed to update yarn status";
      toast.error(msg);
      alert(msg);
    } finally {
      setUpdatingYarnItemId(null);
    }
  };

  const handleTransferArticle = (article: any) => {
    setSelectedArticle(article);
    setShowTransferModal(true);
  };

  const closeTransferModal = () => {
    setShowTransferModal(false);
    setSelectedArticle(null);
  };

  const handleTransferSuccess = () => {
    // Reload orders to get updated data
    loadOrders();
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

  const handleM4QuantityChange = (articleId: string, value: number) => {
    setUpdateData(prev => ({
      ...prev,
      [articleId]: {
        ...prev[articleId],
        m4Quantity: value
      }
    }));
  };

  /** True if any editable article has different data than initial (so Update Order button should be enabled). */
  const hasUpdateDataChanges = React.useMemo(() => {
    if (!selectedOrder) return false;
    const readOnlyFrom = updateModalReadOnlyFromIndex ?? selectedOrder.articles.length;
    for (let idx = 0; idx < readOnlyFrom; idx++) {
      const article = selectedOrder.articles[idx];
      const articleId = article?.id || article?._id;
      if (!articleId) continue;
      const current = updateData[articleId];
      const initial = initialUpdateData[articleId];
      if (!current) continue;
      const init = initial ?? { completedQuantity: 0, remarks: article.remarks ?? '', m4Quantity: 0 };
      if (
        current.completedQuantity !== init.completedQuantity ||
        current.remarks !== init.remarks ||
        current.m4Quantity !== init.m4Quantity
      ) {
        return true;
      }
    }
    return false;
  }, [selectedOrder, updateData, initialUpdateData, updateModalReadOnlyFromIndex]);

  const handleUpdateSubmit = async (weight?: number) => {
    if (!selectedOrder) return;

    console.log('Update button clicked');
    console.log('Current updateData:', updateData);
    console.log('Selected order:', selectedOrder);

    // Validate that at least one article has completed quantity > 0
    let hasValidCompletedQuantity = false;
    
    for (const article of selectedOrder.articles) {
      const articleId = article.id || article._id;
      if (articleId && updateData[articleId]) {
        const completedQty = updateData[articleId].completedQuantity;
        console.log(`Article ${articleId} completed quantity:`, completedQty);
        if (completedQty > 0) {
          hasValidCompletedQuantity = true;
          break;
        }
      }
    }

    console.log('Has valid completed quantity:', hasValidCompletedQuantity);

    if (!hasValidCompletedQuantity) {
      console.log('Validation failed - showing error');
      toast.error('Knitting completed quantity cannot be empty. Please enter a value greater than 0 for at least one article.');
      return;
    }

    try {
      setIsLoading(true);
      
      // Update each article that has changes
      const updatePromises = selectedOrder.articles.map(async (article) => {
        const articleId = article.id || article._id;
        if (!articleId) return null;
        
        const update = updateData[articleId];
        if (!update) return null;
        const currentM4Quantity = article.floorQuantities?.knitting?.m4Quantity || 0;
        // Send previous M4 + new input combined to backend
        const m4QuantityToSend = currentM4Quantity + (update.m4Quantity ?? 0);
        // Send previous weight + user-entered weight as cumulative weight
        const previousWeight = article.floorQuantities?.knitting?.weight ?? 0;
        const userEnteredWeight = weight != null && !Number.isNaN(weight) ? weight : 0;
        const totalWeightToSend = previousWeight + userEnteredWeight;

        const progressData = {
          completedQuantity: update.completedQuantity,
          remarks: update.remarks,
          m4Quantity: m4QuantityToSend,
          weight: totalWeightToSend
        };
          
          try {
            const response = await productionService.updateArticleProgress(
              'Knitting',
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

      // Reload orders list and refresh machine view so both show updated data
      loadOrders();
      setMachineViewRefreshTrigger((prev) => prev + 1);
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
      <Seo title="Knitting Floor Supervisor Dashboard"/>

      <div className="bg-white shadow-sm border border-gray-300 overflow-hidden mx-0">
        <div className="p-[10px]">
          {/* Header - items page style (match supervisor) */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Knitting Floor Supervisor</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {totalResults}
              </span>
              <HelpIcon
                title="Knitting Floor Supervisor Dashboard"
                content={
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-lg mb-2">What is this page?</h4>
                      <p className="text-gray-700">
                        This is the Knitting Floor Supervisor Dashboard where you can view and update production orders that are currently on the Knitting floor.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-2">What can you do here?</h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        <li><strong>View Orders:</strong> See all orders with articles on the Knitting floor</li>
                        <li><strong>Update Progress:</strong> Click "Update" to modify completed quantities and add remarks</li>
                        <li><strong>Track Articles:</strong> Monitor individual article progress and status</li>
                        <li><strong>Add Remarks:</strong> Add notes and comments for each article</li>
                        <li><strong>Filter & Search:</strong> Use filters and search to find specific orders</li>
                        <li><strong>Overproduction:</strong> Allow knitting to produce more than planned quantity</li>
                        <li><strong>M4 Defect Tracking:</strong> Track major defects from knitting machine</li>
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
                onClick={loadOrders}
                disabled={isLoading}
                title="Refresh Orders"
              >
                <i className={`ri-refresh-line text-xs ${isLoading ? 'animate-spin' : ''}`}></i> Refresh
              </button>
            </div>
          </div>

          {/* Small stat cards - items page style (match supervisor) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <div className="bg-blue-50 border border-blue-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">In Progress</span>
              <span className="text-sm font-bold text-blue-900">{orders.filter(o => o.status === 'In Progress').length}</span>
            </div>
            <div className="bg-green-50 border border-green-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Completed</span>
              <span className="text-sm font-bold text-green-900">{orders.filter(o => o.status === 'Completed').length}</span>
            </div>
            <div className="bg-yellow-50 border border-yellow-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-yellow-700 uppercase tracking-wide">Pending</span>
              <span className="text-sm font-bold text-yellow-900">{orders.filter(o => o.status === 'Pending').length}</span>
            </div>
            <div className="bg-red-50 border border-red-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-red-700 uppercase tracking-wide">On Hold</span>
              <span className="text-sm font-bold text-red-900">{orders.filter(o => o.status === 'On Hold').length}</span>
            </div>
          </div>

          {/* Tabs: Orders | Machine view */}
          <div className="flex border-b border-gray-300 mb-0">
            <button
              type="button"
              className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${activeTab === "orders" ? "border-purple-600 text-purple-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              onClick={() => setActiveTab("orders")}
            >
              Orders
            </button>
            <button
              type="button"
              className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${activeTab === "machine-view" ? "border-purple-600 text-purple-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              onClick={() => setActiveTab("machine-view")}
            >
              Machine view
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
              className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${activeTab === "planning" ? "border-purple-600 text-purple-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              onClick={() => setActiveTab("planning")}
            >
              Planning
            </button>
          </div>
        </div>

        {/* Content: Orders | Machine view | Article view */}
        <div className="min-h-[300px]">
          {activeTab === "machine-view" ? (
            <MachineViewTab onOpenEditModal={handleOpenUpdateModalFromMachine} refreshTrigger={machineViewRefreshTrigger} />
          ) : activeTab === "planning" ? (
            <MachineArticlePlanningTab refreshTrigger={machineViewRefreshTrigger} />
          ) : activeTab === "article-view" ? (
            <ArticleViewTab
              orders={paginatedOrders}
              onViewOrder={handleViewOrder}
              onUpdateOrder={handleUpdateOrder}
              getStatusBadge={getStatusBadge}
              getPriorityBadge={getPriorityBadge}
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
              <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[11px] font-bold rounded hover:bg-gray-50" onClick={clearFilters}>
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

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50"></div>
              <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-file-list-line text-xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">NO ORDERS FOUND</h3>
              <p className="text-[10px] text-gray-500">
                {hasActiveFilters ? 'Try adjusting filters or search' : 'No orders on Knitting floor'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50/30">
                    <th className="pl-[10px] pr-1 py-2.5 w-10 border border-gray-300">
                      <input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="rounded border-gray-300 text-purple-600 focus:ring-0 h-3.5 w-3.5" />
                    </th>
                    <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Order</th>
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
                        {order.articles.some(a => a.floorQuantities?.knitting) && (
                          <div className="text-[10px] text-blue-600 mt-0.5">
                            R:{order.articles.reduce((s, a) => s + (a.floorQuantities?.knitting?.received || 0), 0)} Trf:{order.articles.reduce((s, a) => s + (a.floorQuantities?.knitting?.transferred || 0), 0)} Rem:{order.articles.reduce((s, a) => s + (a.floorQuantities?.knitting?.remaining || 0), 0)}
                          </div>
                        )}
                        {order.articles.some(a => a.floorQuantities?.knitting?.m4Quantity) && (
                          <div className="text-[10px] text-red-600">M4: {order.articles.reduce((s, a) => s + (a.floorQuantities?.knitting?.m4Quantity || 0), 0)}</div>
                        )}
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-300">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${getStatusBadge(order.status)}`}>{order.status}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ml-1 ${getPriorityBadge(order.priority)}`}>{order.priority}</span>
                      </td>
                      <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-300">
                        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100">
                          <button className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-400 border border-blue-100 rounded hover:bg-blue-100" onClick={() => handleViewOrder(order)} title="View"><i className="ri-eye-line text-xs"></i></button>
                          {/* <button className="w-7 h-7 flex items-center justify-center bg-emerald-50 text-emerald-400 border border-emerald-100 rounded hover:bg-emerald-100" onClick={() => handleUpdateOrder(order)} title="Update"><i className="ri-edit-line text-xs"></i></button> */}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && orders.length > 0 && (
            <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-300">
              <div className="text-[11px] font-medium text-[#495057]">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalResults)} of {totalResults} entries
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1} className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30">Prev</button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const pageNum = totalPages <= 7 ? i + 1 : currentPage <= 4 ? i + 1 : currentPage >= totalPages - 3 ? totalPages - 6 + i : currentPage - 3 + i;
                  return (
                    <button key={pageNum} onClick={() => handlePageChange(pageNum)} className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded ${currentPage === pageNum ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>{pageNum}</button>
                  );
                })}
                <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages} className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30">Next</button>
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </div>

      {/* Right-side drawer: Update + View modals */}
      {(showUpdateModal || showViewModal) && selectedOrder && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => { closeUpdateModal(); closeViewModal(); }} aria-hidden />
          <div className="fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right overflow-hidden">
            <div className="flex-1 overflow-y-auto flex flex-col p-4">
              {/* Update Order content */}
              {showUpdateModal && (
                <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-800">Update Order — {selectedOrder.orderNumber}</h3>
              <button onClick={closeUpdateModal} className="text-gray-400 hover:text-gray-600 p-1">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            {/* Order Summary */}
            <div className="grid grid-cols-2 gap-2 mb-3 p-2 bg-gray-50 rounded border border-gray-300">
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

            {/* When from machine view, order can only be updated when first article is In Progress. */}
            {selectedOrder && updateModalAssignmentItems?.[0]?.status === OrderStatus.PENDING && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3">
                Mark the article in progress to update the quantity or update the order.
              </p>
            )}
            {/* Main row 8 cols; second row = Remarks (full height) + Status / Yarn when from machine */}
            <div className="border border-gray-300 rounded overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 text-[10px] table-fixed">
                  <colgroup>
                    <col className="w-[16%]" />
                    <col className="w-[8%]" />
                    <col className="w-[8%]" />
                    <col className="w-[8%]" />
                    <col className="w-[8%]" />
                    <col className="w-[12%]" />
                    <col className="w-[8%]" />
                    <col className="w-[10%]" />
                  </colgroup>
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th className="pl-1.5 pr-1 py-1 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300 whitespace-nowrap">Article</th>
                      <th className="px-1 py-1 text-center text-[10px] font-bold text-[#495057] uppercase border border-gray-300">Planned</th>
                      <th className="px-1 py-1 text-center text-[10px] font-bold text-[#495057] uppercase border border-gray-300">Rcv</th>
                      <th className="px-1 py-1 text-center text-[10px] font-bold text-[#495057] uppercase border border-gray-300">Trf</th>
                      <th className="px-1 py-1 text-center text-[10px] font-bold text-[#495057] uppercase border border-gray-300">Rem</th>
                      <th className="px-1 py-1 text-center text-[10px] font-bold text-[#495057] uppercase border border-gray-300 bg-yellow-50">Knit Done *</th>
                      <th className="px-1 py-1 text-center text-[10px] font-bold text-[#495057] uppercase border border-gray-300 bg-red-50">M4</th>
                      <th className="px-1 py-1 text-center text-[10px] font-bold text-[#495057] uppercase border border-gray-300 bg-red-50">M4 +</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {selectedOrder.articles.map((article, idx) => {
                      const articleId = article.id || article._id;
                      if (!articleId) return null;
                      const assignmentItem = updateModalAssignmentItems?.[idx];
                      const hasStatusYarn = Boolean(updateModalAssignment && assignmentItem?.itemId);
                      const isReadOnly = updateModalReadOnlyFromIndex !== undefined && idx >= updateModalReadOnlyFromIndex;
                      const currentUpdateData = updateData[articleId] || { completedQuantity: 0, remarks: article.remarks || '', m4Quantity: 0 };
                      const currentM4FromArticle = article.floorQuantities?.knitting?.m4Quantity || 0;
                      const completedQty = article.floorQuantities?.knitting?.completed ?? 0;
                      const plannedQty = article.plannedQuantity || 0;
                      const receivedQty = article.floorQuantities?.knitting?.received || 0;
                      const transferredQty = article.floorQuantities?.knitting?.transferred || 0;
                      const remainingQty = article.floorQuantities?.knitting?.remaining || 0;
                      const displayCompleted = isReadOnly ? completedQty : (currentUpdateData.completedQuantity || 0);
                      const isOverproduction = displayCompleted > plannedQty;
                      const isFirstReadOnly = isReadOnly && idx === updateModalReadOnlyFromIndex;
                      /** When opened from machine view, first article must be In Progress before editing quantity/remarks or updating order. */
                      const isLockedByPendingStatus = !isReadOnly && idx === 0 && (assignmentItem?.status ?? OrderStatus.PENDING) === OrderStatus.PENDING;
                      return (
                        <React.Fragment key={articleId}>
                          {/* Action buttons + Upcoming Article heading above first read-only article */}
                          {isFirstReadOnly && (
                            <tr>
                              <td colSpan={8} className="p-3 border border-gray-300 bg-gray-50 align-top">
                                <div className="flex justify-end gap-2 mb-3">
                                  <button type="button" onClick={closeUpdateModal} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50">Cancel</button>
                                  <button type="button" disabled={!hasUpdateDataChanges || updateModalAssignmentItems?.[0]?.status === OrderStatus.PENDING} onClick={() => setShowWeightModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <i className="ri-save-line text-xs"></i> Update Order
                                  </button>
                                </div>
                                <h4 className="text-[11px] font-bold text-gray-600 uppercase tracking-wide border-b border-gray-300 pb-1.5">Upcoming Article</h4>
                              </td>
                            </tr>
                          )}
                          <tr className={isReadOnly ? "bg-gray-50/50" : "hover:bg-gray-50/50"}>
                            <td className="pl-1.5 pr-1 py-1 border border-gray-300 overflow-hidden">
                              <div className="text-[10px] font-bold text-gray-900 truncate" title={article.articleNumber}>{article.articleNumber || `Art ${idx + 1}`}</div>
                              <div className="text-[9px] text-gray-500">{article.linkingType || "N/A"}</div>
                              {article.knittingCode && (
                                <div className="text-[9px] text-gray-500 truncate" title={article.knittingCode}>Knitting: {article.knittingCode}</div>
                              )}
                              {isReadOnly && <span className="text-[8px] text-gray-400 uppercase">Upcoming</span>}
                            </td>
                            <td className="px-1 py-1 text-center text-[10px] text-gray-700 border border-gray-300">{plannedQty.toLocaleString()}</td>
                            <td className="px-1 py-1 text-center text-[10px] text-blue-600 font-medium border border-gray-300">{receivedQty.toLocaleString()}</td>
                            <td className="px-1 py-1 text-center text-[10px] text-green-600 font-medium border border-gray-300">{transferredQty.toLocaleString()}</td>
                            <td className="px-1 py-1 text-center text-[10px] text-orange-600 font-medium border border-gray-300">{remainingQty.toLocaleString()}</td>
                            <td className="px-1 py-1 border border-gray-300 bg-yellow-50 min-w-0">
                              {isReadOnly ? (
                                <span className="text-[10px] text-gray-700">{completedQty.toLocaleString()}{isOverproduction ? ` (+${completedQty - plannedQty})` : ""}</span>
                              ) : (
                                <div className="flex flex-col gap-0.5">
                                  <NumericInput disabled={isLockedByPendingStatus} className="py-0.5 text-[10px] h-5 border border-gray-300 rounded focus:border-purple-500 focus:ring-1 focus:ring-purple-300 w-full min-w-0 disabled:bg-gray-100 disabled:cursor-not-allowed" value={currentUpdateData.completedQuantity} onChange={(v) => handleQuantityChange(articleId, v)} allowDecimals />
                                  {isOverproduction && <div className="text-[9px] text-orange-600">+{currentUpdateData.completedQuantity - plannedQty}</div>}
                                </div>
                              )}
                            </td>
                            <td className="px-1 py-1 text-center text-[10px] text-red-700 font-medium border border-gray-300 bg-red-50">{currentM4FromArticle.toLocaleString()}</td>
                            <td className="px-1 py-1 border border-gray-300 bg-red-50 min-w-0">
                              {isReadOnly ? (
                                <span className="text-[10px] text-gray-500">—</span>
                              ) : (
                                <NumericInput disabled={isLockedByPendingStatus} className="py-0.5 text-[10px] h-5 border border-red-300 rounded focus:border-red-400 w-full min-w-0 disabled:bg-gray-100 disabled:cursor-not-allowed" value={currentUpdateData.m4Quantity} onChange={(v) => handleM4QuantityChange(articleId, v)} placeholder="0" allowDecimals />
                              )}
                            </td>
                          </tr>
                          {/* Next row: Remarks (takes height) + Status / Yarn when from machine */}
                          <tr className={isReadOnly ? "bg-gray-50/50" : "bg-gray-50/30"}>
                            <td colSpan={8} className="p-2 border border-gray-300 align-top">
                              <div className="flex flex-wrap items-start gap-4">
                                <div className="flex-1 min-w-[200px]">
                                  <label className="block text-[10px] font-semibold text-gray-600 mb-1">Remarks</label>
                                  {isReadOnly ? (
                                    <div className="min-h-[56px] py-2 px-2 text-[11px] text-gray-700 bg-white border border-gray-300 rounded" title={article.remarks || ""}>
                                      {article.remarks || "—"}
                                    </div>
                                  ) : (
                                    <textarea
                                      disabled={isLockedByPendingStatus}
                                      className="w-full min-h-[56px] py-2 px-2 text-[11px] border border-gray-300 rounded focus:ring-1 focus:ring-purple-400 focus:border-purple-500 resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
                                      rows={3}
                                      placeholder="Add remarks..."
                                      value={currentUpdateData.remarks}
                                      onChange={(e) => handleRemarksChange(articleId, e.target.value)}
                                    />
                                  )}
                                  {(() => {
                                    const weightTransferred = article.floorQuantities?.knitting?.weight;
                                    if (weightTransferred == null) return null;
                                    return (
                                      <p className="text-[10px] text-gray-600 mt-1.5">
                                        Weight transferred: <span className="font-semibold">{typeof weightTransferred === 'number' ? weightTransferred.toLocaleString() : String(weightTransferred)}</span>
                                      </p>
                                    );
                                  })()}
                                </div>
                                {updateModalAssignment && updateModalAssignmentItems && !isReadOnly && (
                                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                                    <div>
                                      <label className="block text-[10px] font-semibold text-gray-600 mb-1">Status</label>
                                      {hasStatusYarn ? (() => {
                                        const currentStatus = assignmentItem?.status ?? OrderStatus.PENDING;
                                        const isPending = currentStatus === OrderStatus.PENDING;
                                        const isInProgress = currentStatus === OrderStatus.IN_PROGRESS;
                                        const isDisabled = updatingStatusItemId === assignmentItem?.itemId;
                                        const yarnIssueCompleted = (assignmentItem?.yarnIssueStatus ?? "") === "Completed";
                                        const markInProgressDisabled = isDisabled || !yarnIssueCompleted;
                                        if (isPending) {
                                          return (
                                            <div className="space-y-1">

                                              <button
                                                type="button"
                                                onClick={() => handleModalItemStatusChange(assignmentItem!.itemId!, OrderStatus.IN_PROGRESS)}
                                                disabled={markInProgressDisabled}
                                                title={!yarnIssueCompleted ? "Complete yarn issue first" : undefined}
                                                className="px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                              >
                                                Mark In Progress
                                              </button>
                                            </div>
                                          );
                                        }
                                        if (isInProgress) {
                                          const trfPlusM4 = transferredQty + currentM4FromArticle;
                                          const showCompleted = trfPlusM4 >= receivedQty;
                                          return (
                                            <div className="flex flex-wrap gap-1.5">
                                              {showCompleted && (
                                                <button
                                                  type="button"
                                                  onClick={() => openCompleteConfirmModal({
                                                    articleNumber: article.articleNumber || `Article ${idx + 1}`,
                                                    orderNumber: selectedOrder?.orderNumber ?? "",
                                                    transferredWeight: article.floorQuantities?.knitting?.weight ?? null,
                                                    m4Qty: currentM4FromArticle,
                                                    transferQty: transferredQty,
                                                    remainingQty: remainingQty,
                                                    receivedQty: receivedQty,
                                                    itemId: assignmentItem!.itemId!,
                                                  })}
                                                  disabled={isDisabled}
                                                  className="px-3 py-1.5 text-[11px] font-bold rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                                                >
                                                  Completed
                                                </button>
                                              )}
                                              <button
                                                type="button"
                                                onClick={() => handleModalItemStatusChange(assignmentItem!.itemId!, OrderStatus.ON_HOLD)}
                                                disabled={isDisabled}
                                                className="px-3 py-1.5 text-[11px] font-bold rounded bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60"
                                              >
                                                On Hold
                                              </button>
                                            </div>
                                          );
                                        }
                                        return (
                                          <span className="text-[11px] font-medium text-gray-600 py-1.5 block">{currentStatus}</span>
                                        );
                                      })() : (
                                        <span className="text-[11px] text-gray-400 py-1.5 block">—</span>
                                      )}
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-semibold text-gray-600 mb-1">Yarn issue</label>
                                      {hasStatusYarn ? (() => {
                                        const yarnStatus = assignmentItem?.yarnIssueStatus ? String(assignmentItem.yarnIssueStatus) : "";
                                        const isInProgressOrCompleted = yarnStatus === "In Progress" || yarnStatus === "Completed";
                                        if (isInProgressOrCompleted) {
                                          return (
                                            <button
                                              type="button"
                                              disabled
                                              className="px-3 py-1.5 text-[11px] font-bold rounded bg-green-600 text-white cursor-not-allowed opacity-90"
                                            >
                                              {yarnStatus}
                                            </button>
                                          );
                                        }
                                        if (idx <= 1) {
                                          return (
                                            <button
                                              type="button"
                                              onClick={() => handleModalAskForYarn(assignmentItem!.itemId!)}
                                              disabled={updatingYarnItemId === assignmentItem?.itemId}
                                              className="px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60"
                                            >
                                              Ask for yarn
                                            </button>
                                          );
                                        }
                                        return (
                                          <span className="text-[11px] text-gray-500 py-1.5 block">{yarnStatus || "Not Started"}</span>
                                        );
                                      })() : (
                                        <span className="text-[11px] text-gray-400 py-1.5 block">—</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Always show actions at bottom */}
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-300">
              <button type="button" onClick={closeUpdateModal} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50">Cancel</button>
              <button type="button" disabled={!hasUpdateDataChanges || updateModalAssignmentItems?.[0]?.status === OrderStatus.PENDING} onClick={() => setShowWeightModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed">
                <i className="ri-save-line text-xs"></i> Update Order
              </button>
            </div>

            {/* Complete confirmation modal – show article summary, then mark Completed and close drawer on Yes */}
            {showCompleteConfirmModal && completeConfirmData && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40" onClick={() => { if (!completingStatus) { setShowCompleteConfirmModal(false); setCompleteConfirmData(null); } }} aria-hidden>
                <div className="bg-white rounded-lg shadow-xl border border-gray-300 w-full max-w-sm p-4 flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
                  <h4 className="text-[13px] font-bold text-gray-800 border-b border-gray-200 pb-2">Complete article</h4>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                    <span className="text-gray-500">Article number</span>
                    <span className="font-medium text-gray-900">{completeConfirmData.articleNumber}</span>
                    <span className="text-gray-500">Transferred weight</span>
                    <span className="font-medium text-gray-900">{completeConfirmData.transferredWeight != null ? String(completeConfirmData.transferredWeight) : "—"}</span>
                    <span className="text-gray-500">M4 quantity</span>
                    <span className="font-medium text-gray-900">{completeConfirmData.m4Qty.toLocaleString()}</span>
                    <span className="text-gray-500">Transfer quantity</span>
                    <span className="font-medium text-gray-900">{completeConfirmData.transferQty.toLocaleString()}</span>
                    <span className="text-gray-500">Remaining quantity</span>
                    <span className="font-medium text-gray-900">{completeConfirmData.remainingQty.toLocaleString()}</span>
                    <span className="text-gray-500">Received quantity</span>
                    <span className="font-medium text-gray-900">{completeConfirmData.receivedQty.toLocaleString()}</span>
                  </div>
                  <p className="text-[12px] text-gray-700 pt-1">
                    Do you really want to complete this article for order <strong>{completeConfirmData.orderNumber}</strong>?
                  </p>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => { setShowCompleteConfirmModal(false); setCompleteConfirmData(null); }}
                      disabled={completingStatus}
                      className="px-3 py-1.5 text-[11px] font-bold text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={handleCompleteConfirmYes}
                      disabled={completingStatus}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-[11px] font-bold rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {completingStatus ? (
                        <>
                          <span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                          Completing…
                        </>
                      ) : (
                        "Yes, mark Completed"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Weight capture modal – shown when user clicks Update Order; then container modal then update API */}
            {showWeightModal && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40" onClick={() => setShowWeightModal(false)} aria-hidden>
                <div className="bg-white rounded-lg shadow-xl border border-gray-300 w-full max-w-sm p-4 flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
                  <p className="text-[12px] text-gray-700">
                    Put article quantity on weight scale to capture weight.
                  </p>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Weight</label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      placeholder="Enter weight"
                      value={weightInput}
                      onChange={(e) => setWeightInput(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-[12px] focus:ring-1 focus:ring-purple-300 focus:border-purple-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => { setShowWeightModal(false); setWeightInput(''); }} className="px-3 py-1.5 text-[11px] font-bold text-gray-600 border border-gray-300 rounded hover:bg-gray-50">
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const w = weightInput.trim() ? parseFloat(weightInput) : undefined;
                        setShowWeightModal(false);
                        setWeightInput('');
                        setPendingWeightForContainer(w);
                        if (selectedOrder?.articles?.length) {
                          const first = selectedOrder.articles[0];
                          const firstId = first.id || first._id || '';
                          setContainerArticleId(firstId);
                          setContainerQuantity(String(updateData[firstId]?.completedQuantity ?? 0));
                        }
                        setContainerNextFloor('Linking');
                        setShowContainerModal(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700"
                    >
                      <i className="ri-save-line text-xs"></i> Next
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Container modal – after weight: barcode, article, next floor; then PATCH container and submit order update */}
            {showContainerModal && selectedOrder && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40" onClick={() => { setShowContainerModal(false); setPendingWeightForContainer(undefined); setContainerCheckStatus('idle'); setContainerFetched(null); setContainerQuantity(''); }} aria-hidden>
                <div className="bg-white rounded-lg shadow-xl border border-gray-300 w-full max-w-sm p-4 flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
                  <h4 className="text-[13px] font-bold text-gray-800 border-b border-gray-200 pb-2">Container & transfer floor</h4>
                  <p className="text-[11px] text-gray-600">Enter or scan container barcode. We will check if it is free before allowing update.</p>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Container barcode</label>
                    <input
                      type="text"
                      placeholder="Scan or enter barcode"
                      value={containerBarcode}
                      onChange={(e) => setContainerBarcode(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-[12px] focus:ring-1 focus:ring-purple-300 focus:border-purple-500"
                    />
                    {containerCheckStatus === 'loading' && (
                      <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1"><span className="animate-spin rounded-full h-3 w-3 border-2 border-gray-400 border-t-transparent" /> Checking container...</p>
                    )}
                    {containerCheckStatus === 'not-found' && (
                      <p className="text-[11px] text-red-600 mt-1">Container not found for this barcode.</p>
                    )}
                    {containerCheckStatus === 'already-filled' && (
                      <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mt-1">
                        This container is not empty. It is assigned to <strong>{containerFetched?.activeFloor ?? 'unknown'}</strong>
                        {containerFetched?.activeArticle && typeof containerFetched.activeArticle === 'object' && 'articleNumber' in containerFetched.activeArticle
                          ? ` with article <strong>${containerFetched.activeArticle.articleNumber}</strong>`
                          : ''}
                        . Use another container.
                      </p>
                    )}
                    {containerCheckStatus === 'ok' && (
                      <p className="text-[11px] text-green-600 mt-1">Container is available. Select floor below.</p>
                    )}
                  </div>
                  <div className={containerCheckStatus !== 'ok' ? 'opacity-60 pointer-events-none' : ''}>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Article</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedOrder.articles.find((a) => a._id === containerArticleId || a.id === containerArticleId)?.articleNumber ?? (selectedOrder.articles[0]?.articleNumber ?? '—')}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-[12px] bg-gray-100 text-gray-700 cursor-not-allowed"
                    />
                  </div>
                  <div className={containerCheckStatus !== 'ok' ? 'opacity-60 pointer-events-none' : ''}>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Quantity</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="From knitting done"
                      value={containerQuantity}
                      onChange={(e) => setContainerQuantity(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-[12px] focus:ring-1 focus:ring-purple-300 focus:border-purple-500"
                    />
                    <p className="text-[10px] text-gray-500 mt-0.5">Pre-filled from knitting done (editable)</p>
                  </div>
                  <div className={containerCheckStatus !== 'ok' ? 'opacity-60 pointer-events-none' : ''}>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Next floor (transferring to)</label>
                    <select
                      value={containerNextFloor}
                      onChange={(e) => setContainerNextFloor(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-[12px] focus:ring-1 focus:ring-purple-300 focus:border-purple-500"
                    >
                      {PRODUCTION_FLOORS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => { setShowContainerModal(false); setPendingWeightForContainer(undefined); setContainerCheckStatus('idle'); setContainerFetched(null); setContainerQuantity(''); }}
                      className="px-3 py-1.5 text-[11px] font-bold text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={containerCheckStatus !== 'ok' || !containerBarcode.trim() || !containerArticleId || !containerNextFloor.trim() || containerSubmitting}
                      onClick={async () => {
                        const barcode = containerBarcode.trim();
                        const articleId = containerArticleId;
                        const floor = containerNextFloor.trim();
                        if (!barcode || !articleId || !floor) return;
                        const article = selectedOrder?.articles?.find((a) => a._id === articleId || a.id === articleId);
                        const activeArticleMongoId = article?._id ?? articleId;
                        const qtyNum = containerQuantity.trim() ? parseInt(containerQuantity.trim(), 10) : NaN;
                        const qty = containerQuantity.trim() === '' ? (updateData[articleId]?.completedQuantity ?? 0) : (Number.isFinite(qtyNum) && qtyNum >= 0 ? qtyNum : NaN);
                        if (!Number.isFinite(qty) || qty < 0) {
                          toast.error('Please enter a valid quantity (0 or greater)');
                          return;
                        }
                        setContainerSubmitting(true);
                        try {
                          await containersMasterService.updateByBarcode(barcode, {
                            activeArticle: activeArticleMongoId,
                            activeFloor: floor,
                            quantity: qty,
                          });
                          toast.success('Container updated');
                          setShowContainerModal(false);
                          setContainerBarcode('');
                          setContainerQuantity('');
                          setContainerArticleId('');
                          setContainerNextFloor('');
                          setContainerCheckStatus('idle');
                          setContainerFetched(null);
                          const w = pendingWeightForContainer;
                          setPendingWeightForContainer(undefined);
                          setContainerSubmitting(false);
                          handleUpdateSubmit(w);
                        } catch (err) {
                          setContainerSubmitting(false);
                          const msg = err instanceof Error ? err.message : String(err);
                          if (msg.includes('404') || msg.includes('not found')) toast.error('Container not found for this barcode');
                          else if (msg.includes('400') || msg.includes('Validation')) toast.error('Invalid data (check article id and floor)');
                          else toast.error(msg);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {containerSubmitting ? <span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" /> : <i className="ri-save-line text-xs" />}
                      Update & submit order
                    </button>
                  </div>
                </div>
              </div>
            )}
                </>
              )}

              {/* View Order content */}
              {showViewModal && (
                <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-800">View Order — {selectedOrder.orderNumber}</h3>
              <button onClick={closeViewModal} className="text-gray-400 hover:text-gray-600 p-1">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            {/* Order Summary */}
            <div className="grid grid-cols-2 gap-2 mb-3 p-2 bg-gray-50 rounded border border-gray-300">
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

            {/* Articles View with Table */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-[11px] font-bold text-gray-800 uppercase tracking-wide">Article Details</h4>
                <button
                  onClick={() => setShowLogsSection(!showLogsSection)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border ${showLogsSection ? 'bg-purple-600 text-white border-purple-600' : 'bg-white border-gray-300 text-[#495057] hover:bg-gray-50'}`}
                >
                  <i className="ri-file-list-line text-xs"></i> {showLogsSection ? 'Hide Logs' : 'Logs'}
                </button>
              </div>

              <div className="border border-gray-300 rounded overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead className="bg-gray-50/80">
                      <tr>
                        <th className="pl-2 pr-1 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Article</th>
                        <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Planned</th>
                        <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Received</th>
                        <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Completed</th>
                        <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Transferred</th>
                        <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Remaining</th>
                        <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300 bg-red-50">M4</th>
                        <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Progress</th>
                        <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {selectedOrder.articles.map((article, idx) => {
                        const plannedQty = article.plannedQuantity || 0;
                        const receivedQty = article.floorQuantities?.knitting?.received || 0;
                        const completedQty = article.floorQuantities?.knitting?.completed || 0;
                        const transferredQty = article.floorQuantities?.knitting?.transferred || 0;
                        const remainingQty = article.floorQuantities?.knitting?.remaining || 0;
                        const m4Qty = article.floorQuantities?.knitting?.m4Quantity || 0;
                        const progress = receivedQty > 0 ? Math.round((transferredQty / receivedQty) * 100) : 0;
                        const isOverproduction = completedQty > plannedQty;
                        return (
                          <tr key={article.id || article._id} className="hover:bg-gray-50/50">
                            <td className="pl-2 pr-1 py-2 border border-gray-300">
                              <div className="text-[12px] font-bold text-gray-900">{article.articleNumber || `Article ${idx + 1}`}</div>
                              <div className="text-[10px] text-gray-500">{article.linkingType || 'N/A'}</div>
                              {article.priority && <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium mt-0.5 ${getPriorityBadge(article.priority)}`}>{article.priority}</span>}
                            </td>
                            <td className="px-1.5 py-2 text-center text-[12px] text-gray-700 border border-gray-300">{plannedQty.toLocaleString()}</td>
                            <td className="px-1.5 py-2 text-center text-[12px] text-blue-600 font-medium border border-gray-300">{receivedQty.toLocaleString()}</td>
                            <td className="px-1.5 py-2 text-center border border-gray-300">
                              <div className="text-[12px] text-green-600 font-medium">{completedQty.toLocaleString()}</div>
                              {isOverproduction && <div className="text-[10px] text-orange-600">+{completedQty - plannedQty}</div>}
                            </td>
                            <td className="px-1.5 py-2 text-center text-[12px] text-green-600 font-medium border border-gray-300">{transferredQty.toLocaleString()}</td>
                            <td className="px-1.5 py-2 text-center text-[12px] text-orange-600 font-medium border border-gray-300">{remainingQty.toLocaleString()}</td>
                            <td className="px-1.5 py-2 text-center border border-gray-300 bg-red-50">{m4Qty > 0 ? <span className="text-[12px] text-red-600 font-medium">{m4Qty.toLocaleString()}</span> : <span className="text-gray-400">—</span>}</td>
                            <td className="px-1.5 py-2 text-center text-[12px] font-medium border border-gray-300">{progress}%</td>
                            <td className="px-1.5 py-2 text-[12px] border border-gray-300">{article.remarks ? <span className="max-w-xs truncate block" title={article.remarks}>{article.remarks}</span> : <span className="text-gray-400">—</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {showLogsSection && (
                <div className="border border-gray-300 rounded p-3 bg-gray-50/50">
                  <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                    <h5 className="text-[11px] font-bold text-gray-800 uppercase tracking-wide">Article Logs {articleLogs.length > 0 && `(${articleLogs.length})`}</h5>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-medium text-gray-600">Article:</label>
                      <select className="bg-white border border-gray-300 text-[11px] rounded px-2 py-1.5 w-40" value={selectedLogArticleId} onChange={(e) => handleLogsArticleSelect(e.target.value)}>
                        <option value="">Choose...</option>
                        {selectedOrder.articles.map((article) => {
                          const articleId = article._id || article.id;
                          const receivedQty = article.floorQuantities?.knitting?.received || 0;
                          return <option key={articleId} value={articleId}>{article.articleNumber || `Article ${articleId}`} (R:{receivedQty})</option>;
                        })}
                      </select>
                    </div>
                  </div>
                  {logsLoading ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mb-2"></div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Loading</p>
                    </div>
                  ) : selectedLogArticleId && articleLogs.length > 0 ? (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {articleLogs.map((log, index) => (
                        <div key={log._id || log.id || index} className="border border-gray-300 rounded p-2 bg-white">
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${log.action === 'Quality Inspection' ? 'bg-yellow-100 text-yellow-800' : log.action === 'Transferred to Branding' ? 'bg-purple-100 text-purple-800' : log.action === 'Transferred to Washing' ? 'bg-blue-100 text-blue-800' : log.action?.includes('M') ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{log.action || 'ACTION'}</span>
                            <span className="text-[10px] text-gray-500 shrink-0">{log.timestamp ? new Date(log.timestamp).toLocaleString() : log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}</span>
                          </div>
                          {(log.fromFloor && log.toFloor) && <div className="text-[10px] text-gray-600">{log.fromFloor} → {log.toFloor}</div>}
                          {log.quantity > 0 && <div className="text-[10px] text-gray-600">Qty: {log.quantity}</div>}
                          {log.remarks && <div className="text-[11px] text-gray-700 mt-1">{log.remarks}</div>}
                          <div className="text-[10px] text-gray-500 mt-1">{log.userId || 'System'}</div>
                        </div>
                      ))}
                    </div>
                  ) : selectedLogArticleId && articleLogs.length === 0 ? (
                    <div className="text-center py-6">
                      <i className="ri-file-list-line text-2xl text-gray-300 block mb-1"></i>
                      <p className="text-[11px] text-gray-500">No logs for this article</p>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <i className="ri-file-list-line text-2xl text-gray-300 block mb-1"></i>
                      <p className="text-[11px] text-gray-500">Select an article to view logs</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end mt-4 pt-3 border-t border-gray-300">
              <button onClick={closeViewModal} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50">Close</button>
            </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Transfer Modal */}
      {showTransferModal && selectedArticle && (
        <TransferModal
          isOpen={showTransferModal}
          onClose={closeTransferModal}
          articleId={selectedArticle._id || selectedArticle.id}
          articleNumber={selectedArticle.articleNumber}
          maxQuantity={selectedArticle.floorQuantities?.knitting?.completed || 0}
          currentFloor="Knitting"
          nextFloor={getNextFloor('Knitting' as FloorType, selectedArticle.linkingType) || 'Next Floor'}
          onSuccess={handleTransferSuccess}
        />
      )}
    </div>
  );
};

export default KnittingFloorSupervisorPage;