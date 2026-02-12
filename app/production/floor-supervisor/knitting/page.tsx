"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import TransferModal from "@/shared/components/production/TransferModal";
import { productionService, ProductionOrder, FloorOrderFilters } from "@/shared/services/productionService";
import { getNextFloor, FloorType } from "@/shared/utils/productionUtils";
import { API_BASE_URL } from "@/shared/data/utilities/api";
import NumericInput from "@/shared/utils/numericInput";
import MachineViewTab from "./components/MachineViewTab";

type KnittingTab = "orders" | "machine-view";

const KnittingFloorSupervisorPage = () => {
  const [activeTab, setActiveTab] = useState<KnittingTab>("orders");
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
  const [activeUpdateTabIndex, setActiveUpdateTabIndex] = useState(0);
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

  const handleUpdateSubmit = async () => {
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

        const progressData = {
          completedQuantity: update.completedQuantity,
          remarks: update.remarks,
          m4Quantity: m4QuantityToSend
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

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 transition-colors shadow-sm"
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
          <div className="flex border-b border-gray-200 mb-0">
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
          </div>
        </div>

        {/* Content: Orders tab or Machine view tab */}
        <div className="min-h-[300px]">
          {activeTab === "machine-view" ? (
            <MachineViewTab />
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
              </select>
              <select className="bg-white border border-gray-200 text-[11px] rounded px-2 py-1.5" value={filters.priority} onChange={(e) => handleFilterChange('priority', e.target.value)}>
                <option value="">All Priorities</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <select className="bg-white border border-gray-200 text-[11px] rounded px-2 py-1.5" value={filters.linkingType} onChange={(e) => handleFilterChange('linkingType', e.target.value)}>
                <option value="">All Types</option>
                <option value="Auto Linking">Auto Linking</option>
                <option value="Rosso Linking">Rosso Linking</option>
                <option value="Hand Linking">Hand Linking</option>
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
              <p className="text-[10px] text-gray-500">
                {hasActiveFilters ? 'Try adjusting filters or search' : 'No orders on Knitting floor'}
              </p>
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
                        {order.orderNote && <span className="text-[10px] text-gray-500">({order.orderNote})</span>}
                        <div className="text-[10px] text-gray-500">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : (order.articles?.[0]?.createdAt ? new Date(order.articles[0].createdAt).toLocaleDateString() : 'N/A')}</div>
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-200">
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
            <div className="grid grid-cols-2 gap-2 mb-3 p-2 bg-gray-50 rounded border border-gray-100">
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

            {/* Excel-like Table Form */}
            <div className="border border-gray-200 rounded overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th className="pl-2 pr-1 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 whitespace-nowrap">Article</th>
                      <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Planned</th>
                      <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Received</th>
                      <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Transferred</th>
                      <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Remaining</th>
                      <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 bg-yellow-50">Knitting Completed *</th>
                      <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 bg-red-50">M4 (Current)</th>
                      <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 bg-red-50">M4 (Add)</th>
                      <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {selectedOrder.articles.map((article, idx) => {
                      const articleId = article.id || article._id;
                      if (!articleId) return null;
                      const currentUpdateData = updateData[articleId] || { completedQuantity: 0, remarks: article.remarks || '', m4Quantity: 0 };
                      const currentM4FromArticle = article.floorQuantities?.knitting?.m4Quantity || 0;
                      const plannedQty = article.plannedQuantity || 0;
                      const receivedQty = article.floorQuantities?.knitting?.received || 0;
                      const transferredQty = article.floorQuantities?.knitting?.transferred || 0;
                      const remainingQty = article.floorQuantities?.knitting?.remaining || 0;
                      const isOverproduction = currentUpdateData.completedQuantity > plannedQty;
                      return (
                        <tr key={articleId} className="hover:bg-gray-50/50">
                          <td className="pl-2 pr-1 py-2 border border-gray-200">
                            <div className="text-[12px] font-bold text-gray-900">{article.articleNumber || `Article ${idx + 1}`}</div>
                            <div className="text-[10px] text-gray-500">{article.linkingType || 'N/A'}</div>
                          </td>
                          <td className="px-1.5 py-2 text-center text-[12px] text-gray-700 border border-gray-200">{plannedQty.toLocaleString()}</td>
                          <td className="px-1.5 py-2 text-center text-[12px] text-blue-600 font-medium border border-gray-200">{receivedQty.toLocaleString()}</td>
                          <td className="px-1.5 py-2 text-center text-[12px] text-green-600 font-medium border border-gray-200">{transferredQty.toLocaleString()}</td>
                          <td className="px-1.5 py-2 text-center text-[12px] text-orange-600 font-medium border border-gray-200">{remainingQty.toLocaleString()}</td>
                          <td className="px-1.5 py-2 border border-gray-200 bg-yellow-50">
                            <div className="flex flex-col gap-0.5">
                              <NumericInput className="py-1 text-[11px] h-6 border border-gray-200 rounded focus:border-purple-300 w-full" value={currentUpdateData.completedQuantity} onChange={(v) => handleQuantityChange(articleId, v)} allowDecimals />
                              {isOverproduction && <div className="text-[10px] text-orange-600 font-medium">+{currentUpdateData.completedQuantity - plannedQty}</div>}
                            </div>
                          </td>
                          <td className="px-1.5 py-2 text-center text-[12px] text-red-700 font-medium border border-gray-200 bg-red-50">{currentM4FromArticle.toLocaleString()}</td>
                          <td className="px-1.5 py-2 border border-gray-200 bg-red-50">
                            <NumericInput className="py-1 text-[11px] h-6 border border-red-200 rounded focus:border-red-400 w-full" value={currentUpdateData.m4Quantity} onChange={(v) => handleM4QuantityChange(articleId, v)} placeholder="0" allowDecimals />
                          </td>
                          <td className="px-1.5 py-2 border border-gray-200">
                            <textarea className="w-full text-[11px] py-1 px-2 h-6 border border-gray-200 rounded resize-none focus:ring-0 focus:border-purple-300" rows={1} placeholder="Remarks..." value={currentUpdateData.remarks} onChange={(e) => handleRemarksChange(articleId, e.target.value)} onFocus={(e) => { e.target.rows = 2; e.target.style.height = 'auto'; }} onBlur={(e) => { e.target.rows = 1; e.target.style.height = '1.5rem'; }} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
              <button onClick={closeUpdateModal} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50">Cancel</button>
              <button onClick={handleUpdateSubmit} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700">
                <i className="ri-save-line text-xs"></i> Update Order
              </button>
            </div>
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
            <div className="grid grid-cols-2 gap-2 mb-3 p-2 bg-gray-50 rounded border border-gray-100">
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border ${showLogsSection ? 'bg-purple-600 text-white border-purple-600' : 'bg-white border-gray-200 text-[#495057] hover:bg-gray-50'}`}
                >
                  <i className="ri-file-list-line text-xs"></i> {showLogsSection ? 'Hide Logs' : 'Logs'}
                </button>
              </div>

              <div className="border border-gray-200 rounded overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead className="bg-gray-50/80">
                      <tr>
                        <th className="pl-2 pr-1 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Article</th>
                        <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Planned</th>
                        <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Received</th>
                        <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Completed</th>
                        <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Transferred</th>
                        <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Remaining</th>
                        <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 bg-red-50">M4</th>
                        <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Progress</th>
                        <th className="px-1.5 py-2 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Remarks</th>
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
                            <td className="pl-2 pr-1 py-2 border border-gray-200">
                              <div className="text-[12px] font-bold text-gray-900">{article.articleNumber || `Article ${idx + 1}`}</div>
                              <div className="text-[10px] text-gray-500">{article.linkingType || 'N/A'}</div>
                              {article.priority && <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium mt-0.5 ${getPriorityBadge(article.priority)}`}>{article.priority}</span>}
                            </td>
                            <td className="px-1.5 py-2 text-center text-[12px] text-gray-700 border border-gray-200">{plannedQty.toLocaleString()}</td>
                            <td className="px-1.5 py-2 text-center text-[12px] text-blue-600 font-medium border border-gray-200">{receivedQty.toLocaleString()}</td>
                            <td className="px-1.5 py-2 text-center border border-gray-200">
                              <div className="text-[12px] text-green-600 font-medium">{completedQty.toLocaleString()}</div>
                              {isOverproduction && <div className="text-[10px] text-orange-600">+{completedQty - plannedQty}</div>}
                            </td>
                            <td className="px-1.5 py-2 text-center text-[12px] text-green-600 font-medium border border-gray-200">{transferredQty.toLocaleString()}</td>
                            <td className="px-1.5 py-2 text-center text-[12px] text-orange-600 font-medium border border-gray-200">{remainingQty.toLocaleString()}</td>
                            <td className="px-1.5 py-2 text-center border border-gray-200 bg-red-50">{m4Qty > 0 ? <span className="text-[12px] text-red-600 font-medium">{m4Qty.toLocaleString()}</span> : <span className="text-gray-400">—</span>}</td>
                            <td className="px-1.5 py-2 text-center text-[12px] font-medium border border-gray-200">{progress}%</td>
                            <td className="px-1.5 py-2 text-[12px] border border-gray-200">{article.remarks ? <span className="max-w-xs truncate block" title={article.remarks}>{article.remarks}</span> : <span className="text-gray-400">—</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {showLogsSection && (
                <div className="border border-gray-200 rounded p-3 bg-gray-50/50">
                  <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                    <h5 className="text-[11px] font-bold text-gray-800 uppercase tracking-wide">Article Logs {articleLogs.length > 0 && `(${articleLogs.length})`}</h5>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-medium text-gray-600">Article:</label>
                      <select className="bg-white border border-gray-200 text-[11px] rounded px-2 py-1.5 w-40" value={selectedLogArticleId} onChange={(e) => handleLogsArticleSelect(e.target.value)}>
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
                        <div key={log._id || log.id || index} className="border border-gray-200 rounded p-2 bg-white">
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

            <div className="flex justify-end mt-4 pt-3 border-t border-gray-100">
              <button onClick={closeViewModal} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50">Close</button>
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
