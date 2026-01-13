"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import { productionService, FloorOrderFilters } from "@/shared/services/productionService";
import { API_BASE_URL } from "@/shared/data/utilities/api";
import ReceivedQuantityDisplay from "@/shared/components/production/ReceivedQuantityDisplay";
import NumericInput from "@/shared/utils/numericInput";

interface ArticleLog {
  id: string;
  date: string; // YYYY-MM-DD
  action: string; // e.g., "Transferred to Final Checking"
  quantity: number;
  fromFloor?: string;
  toFloor?: string;
  remarks?: string;
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
  brandingType?: 'Heat Transfer' | 'Embroidery';
  floorQuantities?: {
    branding?: {
      received?: number;
      transferred?: number;
      remaining?: number;
    };
  };
  logs?: ArticleLog[];
}

interface ProductionOrder {
  id: string;
  orderNumber?: string;
  priority: 'High' | 'Medium' | 'Low' | 'Urgent';
  status: 'Pending' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';
  articles: Article[];
  floor?: string;
  currentFloor?: string;
  createdAt?: string;
  updatedAt?: string;
}

const BrandingFloorSupervisorPage = () => {
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
  const [updateData, setUpdateData] = useState<{[key: string]: {brandingQuantity: number; brandingType: 'Heat Transfer' | 'Embroidery'; remarks: string}} >({});
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

  // Load branding floor orders from API
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

      const response = await productionService.getFloorOrders('Branding', apiFilters);
      
      if (response.success) {
        console.log('Branding orders loaded:', response.data.results);
        setOrders(response.data.results);
        setTotalPages(response.data.totalPages);
        setTotalResults(response.data.totalResults);
      } else {
        console.error('Failed to load branding orders:', response.error);
        toast.error('Failed to load branding orders');
      }
    } catch (error: any) {
      console.error('Error loading branding orders:', error);
      toast.error(error.message || 'Failed to load branding orders');
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
        const receivedQuantity = article.floorQuantities?.branding?.received || 0;
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
    setSelectedOrder(order);
    setActiveViewTabIndex(0);
    setShowViewModal(true);
  };

  const handleUpdateOrder = (order: ProductionOrder) => {
    setSelectedOrder(order);
    setActiveUpdateTabIndex(0);
    // Initialize update data with current values
    const initialData: {[key: string]: {brandingQuantity: number; brandingType: 'Heat Transfer' | 'Embroidery'; remarks: string}} = {};
    order.articles.forEach(article => {
      const articleId = article.id || article._id;
      if (articleId) {
        // Initialize with 0 for completed quantity
        initialData[articleId] = {
          brandingQuantity: 0,
          brandingType: article.brandingType || 'Heat Transfer',
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
    setUpdateData({});
  };

  const handleBrandingQuantityChange = (articleId: string, value: number) => {
    setUpdateData(prev => ({
      ...prev,
      [articleId]: {
        ...prev[articleId],
        brandingQuantity: Math.max(0, value)
      }
    }));
  };

  const handleBrandingTypeChange = (articleId: string, value: 'Heat Transfer' | 'Embroidery') => {
    setUpdateData(prev => ({
      ...prev,
      [articleId]: {
        ...prev[articleId],
        brandingType: value
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
      
      const received = article.floorQuantities?.branding?.received || 0;
      const transferred = article.floorQuantities?.branding?.transferred || 0;
      const remaining = received - transferred;
      
      return update.brandingQuantity > remaining;
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
        const brandingTransferredQuantity = article.floorQuantities?.branding?.transferred || 0;
        if (update && (update.brandingQuantity !== brandingTransferredQuantity || update.remarks !== (article.remarks || ''))) {
          const progressData = {
            completedQuantity: update.brandingQuantity,
            brandingType: update.brandingType,
            remarks: update.remarks
          };
          
          try {
            const response = await productionService.updateArticleProgress(
              'Branding',
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

  const hasActiveFilters = searchQuery || Object.values(filters).some(value => value !== '');

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
    <div className="main-content">
      <Seo title="Branding Floor Supervisor Dashboard"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <h1 className="box-title text-2xl font-semibold">Branding Floor Supervisor Dashboard</h1>
               
              </div>
              <div className="box-tools flex items-center space-x-2">
                <button 
                  type="button" 
                  className="ti-btn ti-btn-light"
                  onClick={loadOrders}
                  disabled={isLoading}
                  title="Refresh Orders"
                >
                  <i className={`ri-refresh-line me-2 ${isLoading ? 'animate-spin' : ''}`}></i> Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="box bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <div className="box-body p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Active Orders</p>
                    <p className="text-2xl font-bold text-white">
                      {orders.filter(order => order.status === 'In Progress').length}
                    </p>
                  </div>
                  <div className="text-blue-200">
                    <i className="ri-cog-line text-3xl"></i>
                  </div>
                </div>
              </div>
            </div>

            <div className="box bg-gradient-to-r from-green-500 to-green-600 text-white">
              <div className="box-body p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Completed Today</p>
                    <p className="text-2xl font-bold text-white">
                      {orders.filter(order => order.status === 'Completed').length}
                    </p>
                  </div>
                  <div className="text-green-200">
                    <i className="ri-check-line text-3xl"></i>
                  </div>
                </div>
              </div>
            </div>

            <div className="box bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
              <div className="box-body p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-100 text-sm font-medium">Pending Orders</p>
                    <p className="text-2xl font-bold text-white">
                      {orders.filter(order => order.status === 'Pending').length}
                    </p>
                  </div>
                  <div className="text-yellow-200">
                    <i className="ri-time-line text-3xl"></i>
                  </div>
                </div>
              </div>
            </div>

            <div className="box bg-gradient-to-r from-red-500 to-red-600 text-white">
              <div className="box-body p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-sm font-medium">On Hold</p>
                    <p className="text-2xl font-bold text-white">
                      {orders.filter(order => order.status === 'On Hold').length}
                    </p>
                  </div>
                  <div className="text-red-200">
                    <i className="ri-error-warning-line text-3xl"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Box */}
          <div className="box">
            <div className="box-body">
              {/* Search and Filters Header */}
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  {/* Filter Toggle and Actions */}
                  <div className="flex items-center gap-3 flex-shrink-0 order-2 sm:order-1">
                    <button
                      type="button"
                      className={`ti-btn ${showFilters ? 'ti-btn-primary' : 'ti-btn-secondary'}`}
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <i className="ri-filter-3-line me-2"></i>
                      Filters {hasActiveFilters && <span className="badge bg-white text-primary ml-1">●</span>}
                    </button>
                    
                    {hasActiveFilters && (
                      <button
                        type="button"
                        className="ti-btn ti-btn-light"
                        onClick={clearFilters}
                      >
                        <i className="ri-close-line me-1"></i>
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Search Bar */}
                  <div className="w-full sm:w-80 lg:w-96 order-1 sm:order-2">
                    <div className="relative">
                      <input
                        type="text"
                        className="form-control py-3 pl-10 pr-4 w-full"
                        placeholder="Search orders by article number or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <i className="ri-search-line text-lg absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    </div>
                  </div>

                  {/* Rows per page selector */}
                  <div className="flex items-center gap-2 order-3">
                    <label className="text-sm text-gray-600 whitespace-nowrap">Show:</label>
                    <select
                      className="form-select form-select-sm w-20"
                      value={itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span className="text-sm text-gray-600 whitespace-nowrap">per page</span>
                  </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Status Filter */}
                      <div>
                        <label className="form-label text-sm font-medium">Status</label>
                        <select
                          className="form-select"
                          value={filters.status}
                          onChange={(e) => handleFilterChange('status', e.target.value)}
                        >
                          <option value="">All Status</option>
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="On Hold">On Hold</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>

                      {/* Priority Filter */}
                      <div>
                        <label className="form-label text-sm font-medium">Priority</label>
                        <select
                          className="form-select"
                          value={filters.priority}
                          onChange={(e) => handleFilterChange('priority', e.target.value)}
                        >
                          <option value="">All Priorities</option>
                          <option value="Urgent">Urgent</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </div>

                      {/* Linking Type Filter */}
                      <div>
                        <label className="form-label text-sm font-medium">Linking Type</label>
                        <select
                          className="form-select"
                          value={filters.linkingType}
                          onChange={(e) => handleFilterChange('linkingType', e.target.value)}
                        >
                          <option value="">All Types</option>
                          <option value="Auto Linking">Auto Linking</option>
                          <option value="Rosso Linking">Rosso Linking</option>
                          <option value="Hand Linking">Hand Linking</option>
                        </select>
                      </div>

                      {/* Floor Filter */}
                      <div>
                        <label className="form-label text-sm font-medium">Floor</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Filter by floor..."
                          value={filters.floor}
                          onChange={(e) => handleFilterChange('floor', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading orders...</p>
                  </div>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <i className="ri-file-list-line text-6xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                  <p className="text-gray-500 mb-4">
                    {hasActiveFilters 
                      ? 'Try adjusting your filters or search terms' 
                      : 'No orders currently on Branding floor'
                    }
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table whitespace-nowrap min-w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">
                          <input 
                            type="checkbox" 
                            className="form-check-input" 
                            checked={selectAll}
                            onChange={handleSelectAll}
                          />
                        </th>
                        <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Order Info</th>
                        <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Articles</th>
                        <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Status</th>
                        <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedOrders.map((order) => (
                        <tr 
                          key={order.id}
                          className="hover:bg-gray-50 transition-colors duration-150"
                        >
                          <td className="px-4 py-4">
                            <input 
                              type="checkbox" 
                              className="form-check-input" 
                              checked={selectedOrders.includes(order.id)}
                              onChange={() => handleOrderSelect(order.id)}
                            />
                          </td>
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <div className="font-medium text-gray-900">
                                {order.orderNumber || order.id}
                                {order.orderNote && (
                                  <span className="text-sm text-gray-500 ml-2">
                                    ({order.orderNote})
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                Created: {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : (order.articles[0]?.createdAt ? new Date(order.articles[0].createdAt).toLocaleDateString() : 'N/A')}
                              </div>
                              <div className="text-xs text-gray-400">
                                Updated: {order.updatedAt ? new Date(order.updatedAt).toLocaleDateString() : (order.articles[0]?.updatedAt ? new Date(order.articles[0].updatedAt).toLocaleDateString() : 'N/A')}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <div className="font-medium text-gray-900">
                                {order.articles.length} Article{order.articles.length > 1 ? 's' : ''}
                              </div>
                              <div className="text-sm text-gray-600">
                                Total Qty: {order.articles.reduce((sum, article) => sum + article.plannedQuantity, 0).toLocaleString()}
                              </div>
                              {order.articles.some(article => article.floorQuantities?.branding) && (
                                <div className="text-xs text-blue-600">
                                  Branding: R:{order.articles.reduce((sum, article) => sum + (article.floorQuantities?.branding?.received || 0), 0)} | 
                                  Rem:{order.articles.reduce((sum, article) => sum + (article.floorQuantities?.branding?.remaining || 0), 0)}
                                </div>
                              )}
                              {order.articles.some(article => article.floorQuantities?.knitting?.m4Quantity) && (
                                <div className="text-xs text-red-600">
                                  M4 Quantity In Knitting: {order.articles.reduce((sum, article) => sum + (article.floorQuantities?.knitting?.m4Quantity || 0), 0)}
                                </div>
                              )}
                            </div>
                          </td>
                          
                          <td className="px-4 py-4">
                            <div className="space-y-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(order.status)}`}>
                                {order.status}
                              </span>
                              <div>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(order.priority)}`}>
                                  {order.priority}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center space-x-2">
                              <button 
                                className="ti-btn ti-btn-primary ti-btn-sm"
                                onClick={() => handleViewOrder(order)}
                                title="View Order"
                              >
                                <i className="ri-eye-line"></i>
                              </button>
                              <button 
                                className="ti-btn ti-btn-success ti-btn-sm"
                                onClick={() => handleUpdateOrder(order)}
                                title="Update Order"
                              >
                                <i className="ri-edit-line"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {!isLoading && orders.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-6 border-t border-gray-200">
                  <div className="text-sm text-gray-700 mb-4 sm:mb-0">
                    <span className="font-medium">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalResults)} 
                    </span>
                    <span className="text-gray-500"> of {totalResults.toLocaleString()} orders</span>
                  </div>
                  
                  <nav aria-label="Page navigation" className="flex items-center space-x-1">
                    <button
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        currentPage > 1
                          ? 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700'
                          : 'text-gray-300 bg-gray-100 border border-gray-200 cursor-not-allowed'
                      }`}
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                    >
                      <i className="ri-arrow-left-s-line"></i>
                    </button>
                    
                    {/* Page Numbers */}
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 7) {
                        pageNum = i + 1;
                      } else if (currentPage <= 4) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 3) {
                        pageNum = totalPages - 6 + i;
                      } else {
                        pageNum = currentPage - 3 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          className={`px-3 py-2 text-sm font-medium rounded-md ${
                            currentPage === pageNum
                              ? 'bg-primary text-white border border-primary'
                              : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700'
                          }`}
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        currentPage < totalPages
                          ? 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700'
                          : 'text-gray-300 bg-gray-100 border border-gray-200 cursor-not-allowed'
                      }`}
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                    >
                      <i className="ri-arrow-right-s-line"></i>
                    </button>
                  </nav>
                </div>
              )}
            </div>
          </div>
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
                <strong>Note:</strong> Enter the total cumulative completed quantity. The system will automatically calculate the difference from the previous amount.
              </p>
            </div>

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
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap bg-yellow-50">Branding Completed *</th>
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Branding Type</th>
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-700 whitespace-nowrap">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedOrder.articles.map((article, idx) => {
                      const articleId = article.id || article._id;
                      if (!articleId) return null;
                      
                      const currentUpdateData = updateData[articleId] || { 
                        brandingQuantity: 0, 
                        brandingType: article.brandingType || 'Heat Transfer',
                        remarks: article.remarks || '' 
                      };
                      
                      const plannedQty = article.plannedQuantity || 0;
                      const receivedQty = article.floorQuantities?.branding?.received || 0;
                      const transferredQty = article.floorQuantities?.branding?.transferred || 0;
                      const remainingQty = receivedQty - transferredQty;
                      const isFullyTransferred = remainingQty <= 0;
                      
                      return (
                        <tr key={articleId} className="hover:bg-gray-50">
                          <td className="px-2 py-1.5 border-r border-gray-300">
                            <div className="font-medium text-gray-900">{article.articleNumber || `Article ${idx + 1}`}</div>
                            <div className="text-gray-500 text-xs mt-0.5">{article.linkingType || 'N/A'}</div>
                          </td>
                          <td className="px-2 py-1.5 text-center border-r border-gray-300 text-gray-700">{plannedQty.toLocaleString()}</td>
                          <td className="px-2 py-1.5 border-r border-gray-300 align-top min-w-[120px]">
                            <ReceivedQuantityDisplay
                              received={receivedQty}
                              repairReceived={article.floorQuantities?.branding?.repairReceived}
                              repairFromFloor={article.floorQuantities?.branding?.repairFromFloor}
                            />
                          </td>
                          <td className="px-2 py-1.5 text-center border-r border-gray-300 text-green-600 font-medium">{transferredQty.toLocaleString()}</td>
                          <td className="px-2 py-1.5 text-center border-r border-gray-300 text-orange-600 font-medium">{remainingQty.toLocaleString()}</td>
                          <td className="px-2 py-1.5 border-r border-gray-300 bg-yellow-50">
                            <div className="flex flex-col gap-1">
                              <NumericInput
                                className={`py-1 text-xs h-7 ${
                                  isFullyTransferred 
                                    ? 'bg-gray-100 border-gray-300 cursor-not-allowed' 
                                    : currentUpdateData.brandingQuantity > remainingQty 
                                      ? 'border-red-500 focus:border-red-500' 
                                      : ''
                                }`}
                                value={currentUpdateData.brandingQuantity}
                                onChange={(value) => {
                                  if (isFullyTransferred) return;
                                  if (value <= remainingQty) {
                                    handleBrandingQuantityChange(articleId, value);
                                  }
                                }}
                                placeholder={isFullyTransferred ? 'Fully Transferred' : `Max: ${remainingQty}`}
                                disabled={isFullyTransferred}
                              />
                              {isFullyTransferred ? (
                                <div className="text-green-600 text-xs font-medium">✓ All transferred</div>
                              ) : currentUpdateData.brandingQuantity > remainingQty ? (
                                <div className="text-red-500 text-xs">Max: {remainingQty}</div>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 border-r border-gray-300">
                            <select
                              className="form-select text-xs py-1 px-2 h-7"
                              value={currentUpdateData.brandingType}
                              onChange={(e) => handleBrandingTypeChange(articleId, e.target.value as 'Heat Transfer' | 'Embroidery')}
                            >
                              <option value="Heat Transfer">Heat Transfer</option>
                              <option value="Embroidery">Embroidery</option>
                            </select>
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
                disabled={
                  isLoading ||
                  selectedOrder.articles.some(article => {
                    const articleId = article.id || article._id;
                    if (!articleId) return false;
                    const update = updateData[articleId];
                    if (!update) return false;
                    
                    const received = article.floorQuantities?.branding?.received || 0;
                    const transferred = article.floorQuantities?.branding?.transferred || 0;
                    const remaining = received - transferred;
                    
                    return update.brandingQuantity > remaining;
                  })
                }
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
                        <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Branding Type</th>
                        <th className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">Progress</th>
                        <th className="px-2 py-1.5 text-center font-semibold text-gray-700 whitespace-nowrap">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedOrder.articles.map((article, idx) => {
                        const plannedQty = article.plannedQuantity || 0;
                        const receivedQty = article.floorQuantities?.branding?.received || 0;
                        const completedQty = article.floorQuantities?.branding?.completed || 0;
                        const transferredQty = article.floorQuantities?.branding?.transferred || 0;
                        const remainingQty = article.floorQuantities?.branding?.remaining || 0;
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
                                repairReceived={article.floorQuantities?.branding?.repairReceived}
                                repairFromFloor={article.floorQuantities?.branding?.repairFromFloor}
                              />
                            </td>
                            <td className="px-2 py-1.5 text-center border-r border-gray-300 text-green-600 font-medium">{completedQty.toLocaleString()}</td>
                            <td className="px-2 py-1.5 text-center border-r border-gray-300 text-green-600 font-medium">{transferredQty.toLocaleString()}</td>
                            <td className="px-2 py-1.5 text-center border-r border-gray-300 text-orange-600 font-medium">{remainingQty.toLocaleString()}</td>
                            <td className="px-2 py-1.5 text-center border-r border-gray-300">
                              {article.brandingType ? (
                                <span className="text-gray-700 text-xs">{article.brandingType}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
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
                        {selectedOrder.articles.map((article) => {
                          const articleId = article._id || article.id;
                          const receivedQty = article.floorQuantities?.branding?.received || 0;
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
    </div>
  );
};

export default BrandingFloorSupervisorPage;
