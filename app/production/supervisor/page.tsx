"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import OrderViewModal from "../../../shared/components/production/OrderViewModal";
import OrderLogsModal from "../../../shared/components/production/OrderLogsModal";
import ArticleLogsModal from "../../../shared/components/production/ArticleLogsModal";
import { productionService, OrderFilters, ArticleWiseReportArticle, ArticleWiseReportResponse } from "@/shared/services/productionService";
import YarnEstimationTab from "../../../shared/components/production/YarnEstimationTab";
import SupervisorUpcomingViewTab from "@/shared/components/production/SupervisorUpcomingViewTab";
import ProductionOrderSummaryTab from "@/shared/components/production/ProductionOrderSummaryTab";
import BacklogReportTab from "@/shared/components/production/BacklogReportTab";
import DailyProductionSummaryTab from "@/shared/components/production/DailyProductionSummaryTab";

interface ProductionOrder {
  id: string;
  orderNumber?: string;
  priority: string;
  status: string;
  articles: any[];
  currentFloor?: string;
  floor?: string;
  orderNote?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  lastModifiedBy?: string;
}

interface FloorQuantity {
  floor: string;
  completed: number;
  pending: number;
  status: 'Pending' | 'In Progress' | 'Completed' | 'On Hold';
}


type SupervisorTab = 'orders' | 'article-view' | 'order-summary' | 'backlog-report' | 'daily-production-summary' | 'yarn-estimation' | 'upcoming-view';

const ProductionSupervisorPage = () => {
  const [activeTab, setActiveTab] = useState<SupervisorTab>('orders');
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [showOrderLogsModal, setShowOrderLogsModal] = useState(false);
  const [showArticleLogsModal, setShowArticleLogsModal] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    linkingType: '',
    floor: ''
  });
  const [sortBy, setSortBy] = useState('createdAt:desc');
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  // Article view state
  const [articleViewResults, setArticleViewResults] = useState<ArticleWiseReportArticle[]>([]);
  const [articleViewLoading, setArticleViewLoading] = useState(false);
  const [articleViewPage, setArticleViewPage] = useState(1);
  const [articleViewLimit, setArticleViewLimit] = useState(10);
  const [articleViewTotalPages, setArticleViewTotalPages] = useState(1);
  const [articleViewTotal, setArticleViewTotal] = useState(0);
  const [articleFilter, setArticleFilter] = useState('');
  const [orderSummaryRefreshNonce, setOrderSummaryRefreshNonce] = useState(0);
  const [orderSummaryLoading, setOrderSummaryLoading] = useState(false);
  const [backlogReportRefreshNonce, setBacklogReportRefreshNonce] = useState(0);
  const [backlogReportLoading, setBacklogReportLoading] = useState(false);
  const [dailyProductionRefreshNonce, setDailyProductionRefreshNonce] = useState(0);
  const [dailyProductionLoading, setDailyProductionLoading] = useState(false);

  // Load orders from API
  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const apiFilters: OrderFilters = {
        page: currentPage,
        limit: itemsPerPage,
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.floor && { currentFloor: filters.floor }),
        ...(searchQuery && { search: searchQuery }),
        sortBy,
        populate: 'articles'
      };

      const response = await productionService.getOrders(apiFilters);
      
      if (response.success) {
        console.log('Orders loaded:', response.data.results);
        let filteredOrders = response.data.results;
        
        // If we have a search query and no results from backend search,
        // try client-side filtering by article numbers
        let effectiveTotalPages = response.data.totalPages;
        let effectiveTotalResults = response.data.totalResults ?? filteredOrders.length;

        if (searchQuery && filteredOrders.length === 0) {
          // Get all orders without search filter to do client-side filtering
          const allOrdersResponse = await productionService.getOrders({
            page: 1,
            limit: 1000, // Get a large number to search through all orders
            ...(filters.status && { status: filters.status }),
            ...(filters.priority && { priority: filters.priority }),
            ...(filters.floor && { currentFloor: filters.floor }),
            sortBy,
            populate: 'articles'
          });

          if (allOrdersResponse.success) {
            // Filter orders that contain articles with matching article numbers
            filteredOrders = allOrdersResponse.data.results.filter(order => {
              return order.articles.some(article =>
                article.articleNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                order.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                order.id.toLowerCase().includes(searchQuery.toLowerCase())
              );
            });
            effectiveTotalResults = filteredOrders.length;
            effectiveTotalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
          }
        }

        setOrders(filteredOrders);
        setTotalPages(effectiveTotalPages);
        setTotalResults(effectiveTotalResults);
      } else {
        console.error('Failed to load orders:', response.error);
        toast.error('Failed to load orders');
      }
    } catch (error: any) {
      console.error('Error loading orders:', error);
      toast.error(error.message || 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  // Load orders only on Orders tab (Article view uses its own API — not tied to order pagination)
  useEffect(() => {
    if (activeTab !== 'orders') return;
    const timeoutId = setTimeout(() => {
      loadOrders();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [activeTab, currentPage, itemsPerPage, filters, searchQuery, sortBy]);

  // Load article-wise report when on Article view tab
  const loadArticleView = async () => {
    setArticleViewLoading(true);
    try {
      const response = await productionService.getArticleWiseReport({
        page: articleViewPage,
        limit: Math.min(articleViewLimit, 100),
        logsPerArticle: 0,
        ...(articleFilter.trim() && { search: articleFilter.trim() }),
      });
      if (response.success && response.data) {
        const data = response.data as ArticleWiseReportResponse;
        setArticleViewResults(data.results || []);
        const total = data.total ?? 0;
        const tp = data.totalPages ?? 0;
        const safeTotalPages = total === 0 ? 1 : Math.max(1, tp);
        setArticleViewTotalPages(safeTotalPages);
        setArticleViewTotal(total);
        if (articleViewPage > safeTotalPages) {
          setArticleViewPage(safeTotalPages);
        }
      } else {
        toast.error(response.error?.message || 'Failed to load article report');
        setArticleViewResults([]);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load article report');
      setArticleViewResults([]);
    } finally {
      setArticleViewLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'article-view') return;
    const t = setTimeout(() => loadArticleView(), articleFilter ? 400 : 0);
    return () => clearTimeout(t);
  }, [activeTab, articleViewPage, articleViewLimit, articleFilter]);

  /** Changes article-view page and scrolls the list into view. */
  const handleArticleViewPageChange = (page: number) => {
    const next = Math.max(1, Math.min(page, articleViewTotalPages));
    setArticleViewPage(next);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // No client-side filtering needed since we're using API filtering
  const paginatedOrders = orders;

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

  const handleDeleteOrder = async (orderId: string) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      try {
        setIsLoading(true);
        const response = await productionService.deleteOrder(orderId);
        
        if (response.success) {
          toast.success('Order deleted successfully');
          // Remove the deleted order from the current state immediately
          setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
          setTotalResults(prev => prev - 1);
          // Also remove from selected orders if it was selected
          setSelectedOrders(prev => prev.filter(id => id !== orderId));
        } else {
          toast.error(response.error?.message || 'Failed to delete order');
        }
      } catch (error: any) {
        console.error('Error deleting order:', error);
        toast.error(error.message || 'Failed to delete order');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedOrders.length === 0) {
      toast.error('Please select orders to delete');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedOrders.length} orders?`)) {
      try {
        setIsLoading(true);
        // Delete orders one by one
        const deletePromises = selectedOrders.map(orderId => productionService.deleteOrder(orderId));
        const results = await Promise.allSettled(deletePromises);
        
        // Check which deletions were successful
        const successfulDeletions = results.filter(result => 
          result.status === 'fulfilled' && result.value.success
        );
        const failedDeletions = results.filter(result => 
          result.status === 'rejected' || !result.value.success
        );
        
        if (successfulDeletions.length > 0) {
          // Remove successfully deleted orders from state
          setOrders(prevOrders => 
            prevOrders.filter(order => !selectedOrders.includes(order.id))
          );
          setTotalResults(prev => prev - successfulDeletions.length);
          toast.success(`${successfulDeletions.length} orders deleted successfully`);
        }
        
        if (failedDeletions.length > 0) {
          toast.error(`${failedDeletions.length} orders failed to delete`);
        }
        
        setSelectedOrders([]);
        setSelectAll(false);
      } catch (error: any) {
        console.error('Error in bulk delete:', error);
        toast.error(error.message || 'Failed to delete orders');
      } finally {
        setIsLoading(false);
      }
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

  /** Updates order list sort (newest/oldest) and resets pagination. */
  const handleSortChange = (value: string) => {
    setSortBy(value);
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

  const handleViewOrder = (order: ProductionOrder) => {
    setSelectedOrder(order);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedOrder(null);
  };

  const handleViewOrderLogs = (order: ProductionOrder) => {
    setSelectedOrder(order);
    setShowOrderLogsModal(true);
  };

  const closeOrderLogsModal = () => {
    setShowOrderLogsModal(false);
    setSelectedOrder(null);
  };

  const handleViewArticleLogs = (article: any) => {
    setSelectedArticle(article);
    setShowArticleLogsModal(true);
  };

  const closeArticleLogsModal = () => {
    setShowArticleLogsModal(false);
    setSelectedArticle(null);
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

  const isDrawerOpen = showViewModal || showOrderLogsModal || showArticleLogsModal;

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Production Supervisor Dashboard"/>

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          {/* Header - items page style */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Production Supervisor</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {totalResults}
              </span>
              <HelpIcon
                title="Production Supervisor Dashboard"
                content={
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-lg mb-2">What is this page?</h4>
                      <p className="text-gray-700">
                        This is the Production Supervisor Dashboard where you can manage production orders, track progress, and oversee manufacturing operations.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-2">What can you do here?</h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        <li><strong>View Orders:</strong> Browse all production orders with real-time status</li>
                        <li><strong>Add New Order:</strong> Click "Add New Order" to create a new production order</li>
                        <li><strong>Track Progress:</strong> Monitor order progress and completion status</li>
                        <li><strong>Filter & Search:</strong> Use filters and search to find specific orders</li>
                        <li><strong>View Logs:</strong> Click the logs button to view detailed activity logs</li>
                        <li><strong>Bulk Operations:</strong> Select multiple orders for bulk actions</li>
                      </ul>
                    </div>
                  </div>
                }
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 transition-colors shadow-sm"
                onClick={() => {
                  if (activeTab === 'article-view') void loadArticleView();
                  else if (activeTab === 'orders') void loadOrders();
                  else if (activeTab === 'order-summary') setOrderSummaryRefreshNonce((n) => n + 1);
                  else if (activeTab === 'backlog-report') setBacklogReportRefreshNonce((n) => n + 1);
                  else if (activeTab === 'daily-production-summary') setDailyProductionRefreshNonce((n) => n + 1);
                }}
                disabled={
                  activeTab === 'upcoming-view' || activeTab === 'yarn-estimation'
                    ? false
                    : activeTab === 'article-view'
                      ? articleViewLoading
                      : activeTab === 'order-summary'
                        ? orderSummaryLoading
                        : activeTab === 'backlog-report'
                          ? backlogReportLoading
                        : activeTab === 'daily-production-summary'
                          ? dailyProductionLoading
                        : isLoading
                }
                title={
                  activeTab === 'article-view'
                    ? 'Refresh Article view'
                    : activeTab === 'order-summary'
                      ? 'Refresh Production order summary'
                      : activeTab === 'backlog-report'
                      ? 'Refresh Backlog report'
                      : activeTab === 'daily-production-summary'
                      ? 'Refresh Daily production summary'
                      : activeTab === 'upcoming-view'
                      ? 'Use Refresh inside Upcoming view'
                      : 'Refresh Orders'
                }
              >
                <i className={`ri-refresh-line text-xs ${(
                  activeTab === 'article-view'
                    ? articleViewLoading
                    : activeTab === 'order-summary'
                      ? orderSummaryLoading
                      : activeTab === 'backlog-report'
                        ? backlogReportLoading
                      : activeTab === 'daily-production-summary'
                        ? dailyProductionLoading
                      : isLoading
                ) ? 'animate-spin' : ''}`}></i> Refresh
              </button>
              {selectedOrders.length > 0 && (
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 text-[11px] font-bold rounded hover:bg-red-100 shadow-sm"
                  onClick={handleBulkDelete}
                >
                  <i className="ri-delete-bin-line text-xs"></i> Delete ({selectedOrders.length})
                </button>
              )}
              <Link
                href="/production/supervisor/add"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              >
                <i className="ri-add-line text-xs"></i> Add New Order
              </Link>
            </div>
          </div>

          {/* Small stat cards - items page style */}
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

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-0">
            <button
              type="button"
              className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
                activeTab === 'orders' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('orders')}
            >
              Orders
            </button>
            <button
              type="button"
              className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
                activeTab === 'article-view' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('article-view')}
            >
              Article view
            </button>
            <button
              type="button"
              className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
                activeTab === 'order-summary' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('order-summary')}
            >
              Production order summary
            </button>
            <button
              type="button"
              className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
                activeTab === 'backlog-report' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('backlog-report')}
            >
              Backlog report
            </button>
            <button
              type="button"
              className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
                activeTab === 'daily-production-summary' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('daily-production-summary')}
            >
              Daily production summary
            </button>
            <button
              type="button"
              className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
                activeTab === 'yarn-estimation' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('yarn-estimation')}
            >
              Yarn Estimation
            </button>
            <button
              type="button"
              className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
                activeTab === 'upcoming-view' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('upcoming-view')}
            >
              Upcoming view
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="min-h-[300px]">
              {activeTab === 'yarn-estimation' ? (
                <YarnEstimationTab />
              ) : activeTab === 'upcoming-view' ? (
                <SupervisorUpcomingViewTab />
              ) : activeTab === 'order-summary' ? (
                <ProductionOrderSummaryTab
                  refreshNonce={orderSummaryRefreshNonce}
                  onLoadingChange={setOrderSummaryLoading}
                />
              ) : activeTab === 'backlog-report' ? (
                <BacklogReportTab
                  refreshNonce={backlogReportRefreshNonce}
                  onLoadingChange={setBacklogReportLoading}
                />
              ) : activeTab === 'daily-production-summary' ? (
                <DailyProductionSummaryTab
                  refreshNonce={dailyProductionRefreshNonce}
                  onLoadingChange={setDailyProductionLoading}
                />
              ) : activeTab === 'article-view' ? (
                <>
                  <div className="p-[10px] mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <label className="relative flex items-center">
                      <span className="sr-only">Search articles</span>
                      <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" aria-hidden="true" />
                      <input
                        type="text"
                        className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-48 placeholder:text-gray-400 font-medium"
                        placeholder="Search article or knitting code..."
                        value={articleFilter}
                        onChange={(e) => {
                          setArticleFilter(e.target.value);
                          setArticleViewPage(1);
                        }}
                        aria-label="Search all articles by article number or knitting code"
                      />
                    </label>
                    <div className="flex items-center gap-1.5">
                      <label htmlFor="article-view-page-size" className="text-[11px] font-medium text-gray-600 whitespace-nowrap">
                        Articles / page
                      </label>
                      <select
                        id="article-view-page-size"
                        className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5"
                        value={articleViewLimit}
                        onChange={(e) => { setArticleViewLimit(Number(e.target.value)); setArticleViewPage(1); }}
                        aria-label="How many distinct articles to show per page"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700"
                      onClick={loadArticleView}
                      disabled={articleViewLoading}
                    >
                      <i className={`ri-refresh-line text-xs ${articleViewLoading ? 'animate-spin' : ''}`}></i> Refresh
                    </button>
                  </div>
                  {articleViewLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50"></div>
                      <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading</p>
                    </div>
                  ) : articleViewResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <i className="ri-inbox-line text-xl text-gray-200"></i>
                      </div>
                      <h3 className="text-xs font-bold text-gray-400 mb-1">NO ARTICLE DATA</h3>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300 [border-spacing:0]">
                          <thead>
                            <tr className="bg-gray-50/80">
                              <th className="pl-[10px] pr-1 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Article</th>
                              <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">PO NO</th>
                              <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Qty</th>
                              <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Status</th>
                              <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Progress</th>
                              <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Priority</th>
                              <th className="px-1.5 py-2.5 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {articleViewResults.map((row, rowIndex) =>
                              row.orders.length === 0 ? (
                                <tr key={row.factoryCode} className="hover:bg-gray-50/50">
                                  <td className={`pl-[10px] pr-1 py-2.5 text-[12px] font-medium text-gray-900 border border-gray-300 ${rowIndex > 0 ? 'border-t border-t-gray-400' : ''}`}>{row.articleNumber || row.factoryCode}</td>
                                  <td className={`px-1.5 py-2.5 text-[12px] text-gray-500 border border-gray-300 ${rowIndex > 0 ? 'border-t border-t-gray-400' : ''}`}>—</td>
                                  <td className={`px-1.5 py-2.5 text-[12px] text-gray-500 border border-gray-300 ${rowIndex > 0 ? 'border-t border-t-gray-400' : ''}`}>—</td>
                                  <td className={`px-1.5 py-2.5 text-[12px] text-gray-500 border border-gray-300 ${rowIndex > 0 ? 'border-t border-t-gray-400' : ''}`}>—</td>
                                  <td className={`px-1.5 py-2.5 text-[12px] text-gray-500 border border-gray-300 ${rowIndex > 0 ? 'border-t border-t-gray-400' : ''}`}>—</td>
                                  <td className={`px-1.5 py-2.5 text-[12px] text-gray-500 border border-gray-300 ${rowIndex > 0 ? 'border-t border-t-gray-400' : ''}`}>—</td>
                                  <td className={`px-1.5 py-2.5 text-right pr-[10px] border border-gray-300 ${rowIndex > 0 ? 'border-t border-t-gray-400' : ''}`}>—</td>
                                </tr>
                              ) : (
                                row.orders.map((ord, idx) => (
                                  <tr key={`${row.factoryCode}-${ord.articleId}-${ord.orderId ?? idx}`} className="hover:bg-gray-50/50">
                                    {idx === 0 && (
                                      <td rowSpan={row.orders.length} className={`pl-[10px] pr-1 py-2.5 text-[12px] font-medium text-gray-900 align-top border border-gray-300 border-r-2 border-r-gray-400 bg-gray-50/70 ${rowIndex > 0 ? 'border-t border-t-gray-400' : ''}`}>{row.articleNumber || row.factoryCode}</td>
                                    )}
                                    <td className={`px-1.5 py-2.5 text-[12px] text-gray-700 border border-gray-300 ${rowIndex > 0 && idx === 0 ? 'border-t border-t-gray-400' : ''}`}>
                                      <div>{ord.orderNumber ?? '—'}</div>
                                      {ord.orderNote && (
                                        <div className="text-[10px] text-gray-500 font-medium truncate max-w-[180px]" title={ord.orderNote}>
                                          {ord.orderNote}
                                        </div>
                                      )}
                                    </td>
                                    <td className={`px-1.5 py-2.5 text-[12px] border border-gray-300 ${rowIndex > 0 && idx === 0 ? 'border-t border-t-gray-400' : ''}`}>{ord.plannedQuantity != null ? ord.plannedQuantity.toLocaleString() : '—'}</td>
                                    <td className={`px-1.5 py-2.5 border border-gray-300 ${rowIndex > 0 && idx === 0 ? 'border-t border-t-gray-400' : ''}`}>
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${getStatusBadge(ord.orderStatus ?? ord.status ?? '')}`}>{ord.orderStatus ?? ord.status ?? '—'}</span>
                                    </td>
                                    <td className={`px-1.5 py-2.5 text-[12px] border border-gray-300 ${rowIndex > 0 && idx === 0 ? 'border-t border-t-gray-400' : ''}`}>{ord.progress != null ? `${ord.progress}%` : '—'}</td>
                                    <td className={`px-1.5 py-2.5 border border-gray-300 ${rowIndex > 0 && idx === 0 ? 'border-t border-t-gray-400' : ''}`}>
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${getPriorityBadge(ord.orderPriority ?? ord.priority ?? '')}`}>{ord.orderPriority ?? ord.priority ?? '—'}</span>
                                    </td>
                                    <td className={`px-1.5 py-2.5 text-right pr-[10px] border border-gray-300 ${rowIndex > 0 && idx === 0 ? 'border-t border-t-gray-400' : ''}`}>
                                      {ord.articleId ? (
                                        <button
                                          type="button"
                                          className="w-7 h-7 inline-flex items-center justify-center bg-gray-50 text-gray-500 border border-gray-200 rounded hover:bg-gray-100"
                                          onClick={() => handleViewArticleLogs({
                                            id: ord.articleId,
                                            articleNumber: row.articleNumber || row.factoryCode,
                                            orderId: ord.orderId ? String(ord.orderId) : undefined,
                                          })}
                                          title="View floor and quantity activity logs"
                                          aria-label={`View logs for article ${row.articleNumber || row.factoryCode}`}
                                        >
                                          <i className="ri-file-list-line text-xs" aria-hidden="true" />
                                        </button>
                                      ) : (
                                        '—'
                                      )}
                                    </td>
                                  </tr>
                                ))
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100">
                        <div className="text-[11px] font-medium text-[#495057]">Showing {articleViewTotal === 0 ? 0 : (articleViewPage - 1) * articleViewLimit + 1} to {Math.min(articleViewPage * articleViewLimit, articleViewTotal)} of {articleViewTotal} article(s)</div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            onClick={() => handleArticleViewPageChange(articleViewPage - 1)}
                            disabled={articleViewPage <= 1 || articleViewLoading}
                          >
                            Prev
                          </button>
                          {Array.from({ length: Math.min(articleViewTotalPages, 7) }, (_, i) => {
                            const pageNum =
                              articleViewTotalPages <= 7
                                ? i + 1
                                : articleViewPage <= 4
                                  ? i + 1
                                  : articleViewPage >= articleViewTotalPages - 3
                                    ? articleViewTotalPages - 6 + i
                                    : articleViewPage - 3 + i;
                            return (
                              <button
                                key={pageNum}
                                type="button"
                                onClick={() => handleArticleViewPageChange(pageNum)}
                                disabled={articleViewLoading}
                                className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded ${
                                  articleViewPage === pageNum ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            onClick={() => handleArticleViewPageChange(articleViewPage + 1)}
                            disabled={articleViewPage >= articleViewTotalPages || articleViewLoading}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="p-[10px] flex flex-wrap items-center gap-2 border-b border-gray-100">
                    <button
                      type="button"
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border transition-colors ${showFilters ? 'bg-purple-600 text-white border-purple-600' : 'bg-white border-gray-200 text-[#495057] hover:bg-gray-50'}`}
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <i className="ri-filter-3-line text-xs"></i> Filters {hasActiveFilters && <span className="ml-1">●</span>}
                    </button>
                    <label className="relative flex items-center">
                      <span className="sr-only">Sort orders</span>
                      <i className="ri-sort-desc absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" aria-hidden="true"></i>
                      <select
                        className="appearance-none bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded pl-7 pr-6 py-1.5 hover:bg-gray-50 focus:ring-0 focus:border-purple-300 cursor-pointer"
                        value={sortBy}
                        onChange={(e) => handleSortChange(e.target.value)}
                        aria-label="Sort orders"
                      >
                        <option value="createdAt:desc">Newest first</option>
                        <option value="createdAt:asc">Oldest first</option>
                      </select>
                      <i className="ri-arrow-down-s-line absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" aria-hidden="true"></i>
                    </label>
                    {hasActiveFilters && (
                      <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[11px] font-bold rounded hover:bg-gray-50" onClick={clearFilters}>
                        <i className="ri-close-line text-xs"></i> Clear
                      </button>
                    )}
                    <div className="relative flex-1 min-w-[140px] max-w-[240px]">
                      <input
                        type="text"
                        className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-full placeholder:text-gray-400 font-medium"
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
                    <div className="p-[10px] bg-gray-50 border-b border-gray-100 flex flex-wrap gap-2">
                      <select className="bg-white border border-gray-200 text-[11px] rounded px-2 py-1.5" value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
                        <option value="">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="On Hold">On Hold</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                      <select className="bg-white border border-gray-200 text-[11px] rounded px-2 py-1.5" value={filters.priority} onChange={(e) => handleFilterChange('priority', e.target.value)}>
                        <option value="">All Priorities</option>
                        <option value="Urgent">Urgent</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                      <input type="text" className="bg-white border border-gray-200 text-[11px] rounded px-2 py-1.5 w-28" placeholder="Floor..." value={filters.floor} onChange={(e) => handleFilterChange('floor', e.target.value)} />
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
                      {!hasActiveFilters && (
                        <Link href="/production/supervisor/add" className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700">
                          <i className="ri-add-line text-xs"></i> Add First Order
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-200">
                        <thead>
                          <tr className="bg-gray-50/30">
                            <th className="pl-[10px] pr-1 py-2.5 w-10 border border-gray-200">
                              <input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" />
                            </th>
                            <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Order</th>
                            <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Articles</th>
                            <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                            <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Priority</th>
                            <th className="px-1.5 py-2.5 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedOrders.map((order) => (
                            <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                              <td className="pl-[10px] pr-1 py-2.5 border border-gray-200">
                                <input type="checkbox" checked={selectedOrders.includes(order.id)} onChange={() => handleOrderSelect(order.id)} className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" />
                              </td>
                              <td className="px-1.5 py-2.5 border border-gray-200">
                                <div className="text-[12px] font-bold text-gray-900">{order.orderNumber || order.id}</div>
                                {order.orderNote && (
                                  <div className="text-[11px] text-gray-700 font-medium truncate max-w-[240px]" title={order.orderNote}>
                                    {order.orderNote}
                                  </div>
                                )}
                                <div className="text-[10px] text-gray-500">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</div>
                              </td>
                              <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{order.articles.length} · Qty {order.articles.reduce((s, a) => s + (a.plannedQuantity || 0), 0).toLocaleString()}</td>
                              <td className="px-1.5 py-2.5 border border-gray-200">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${getStatusBadge(order.status)}`}>{order.status}</span>
                              </td>
                              <td className="px-1.5 py-2.5 border border-gray-200">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${getPriorityBadge(order.priority)}`}>{order.priority}</span>
                              </td>
                              <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                                <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100">
                                  <button className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-400 border border-blue-100 rounded hover:bg-blue-100" onClick={() => handleViewOrder(order)} title="View"><i className="ri-eye-line text-xs"></i></button>
                                  <button className="w-7 h-7 flex items-center justify-center bg-gray-50 text-gray-500 border border-gray-200 rounded hover:bg-gray-100" onClick={() => handleViewOrderLogs(order)} title="Logs"><i className="ri-file-list-line text-xs"></i></button>
                                  <Link href={`/production/supervisor/edit?id=${order.id}`} className="w-7 h-7 flex items-center justify-center bg-emerald-50 text-emerald-400 border border-emerald-100 rounded hover:bg-emerald-100" title="Edit"><i className="ri-pencil-line text-xs"></i></Link>
                                  {/* <button className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-400 border border-red-100 rounded hover:bg-red-100" onClick={() => handleDeleteOrder(order.id)} title="Delete"><i className="ri-delete-bin-line text-xs"></i></button> */}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {!isLoading && orders.length > 0 && (
                    <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100">
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

      {/* Side drawer for modals - opens from right */}
      {isDrawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => { closeViewModal(); closeOrderLogsModal(); closeArticleLogsModal(); }} aria-hidden />
          <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right">
            <div className="flex-1 overflow-hidden flex flex-col">
              {showViewModal && selectedOrder && <OrderViewModal order={selectedOrder} onClose={closeViewModal} embedInDrawer />}
              {showOrderLogsModal && selectedOrder && <OrderLogsModal orderId={selectedOrder.id} orderNumber={selectedOrder.orderNumber} isOpen onClose={closeOrderLogsModal} embedInDrawer />}
              {showArticleLogsModal && selectedArticle?.id && (
                <ArticleLogsModal
                  articleId={selectedArticle.id}
                  articleNumber={selectedArticle.articleNumber}
                  orderId={selectedArticle.orderId}
                  isOpen
                  onClose={closeArticleLogsModal}
                  embedInDrawer
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProductionSupervisorPage;
