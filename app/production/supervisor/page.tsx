"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import OrderViewModal from "../../../shared/components/production/OrderViewModal";
import OrderLogsModal from "../../../shared/components/production/OrderLogsModal";
import ArticleLogsModal from "../../../shared/components/production/ArticleLogsModal";
import { productionService, OrderFilters } from "@/shared/services/productionService";

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


const ProductionSupervisorPage = () => {
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
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

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
        sortBy: 'createdAt',
        populate: 'articles'
      };

      const response = await productionService.getOrders(apiFilters);
      
      if (response.success) {
        console.log('Orders loaded:', response.data.results);
        let filteredOrders = response.data.results;
        
        // If we have a search query and no results from backend search, 
        // try client-side filtering by article numbers
        if (searchQuery && filteredOrders.length === 0) {
          // Get all orders without search filter to do client-side filtering
          const allOrdersResponse = await productionService.getOrders({
            page: 1,
            limit: 1000, // Get a large number to search through all orders
            ...(filters.status && { status: filters.status }),
            ...(filters.priority && { priority: filters.priority }),
            ...(filters.floor && { currentFloor: filters.floor }),
            sortBy: 'createdAt',
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
          }
        }
        
        setOrders(filteredOrders);
        setTotalPages(response.data.totalPages);
        setTotalResults(filteredOrders.length);
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

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadOrders();
    }, 500); // 500ms delay

    return () => clearTimeout(timeoutId);
  }, [currentPage, itemsPerPage, filters, searchQuery]);

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

  return (
    <div className="main-content">
      <Seo title="Production Supervisor Dashboard"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <h1 className="box-title text-2xl font-semibold">Production Supervisor Dashboard</h1>
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
                          <li><strong>Manage Priorities:</strong> Set and update order priorities (Urgent, High, Medium, Low)</li>
                          <li><strong>Filter & Search:</strong> Use filters and search to find specific orders by order number, customer name, or article number</li>
                          <li><strong>View Logs:</strong> Click the logs button to view detailed activity logs for orders and articles</li>
                          <li><strong>Bulk Operations:</strong> Select multiple orders for bulk actions</li>
                        </ul>
                      </div>
                    </div>
                  }
                />
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
                {selectedOrders.length > 0 && (
                  <button 
                    type="button" 
                    className="ti-btn ti-btn-danger"
                    onClick={handleBulkDelete}
                  >
                    <i className="ri-delete-bin-line me-2"></i> Delete Selected ({selectedOrders.length})
                  </button>
                )}
                <Link 
                  href="/production/supervisor/add"
                  className="ti-btn ti-btn-primary"
                >
                  <i className="ri-add-line me-2"></i> Add New Order
                </Link>
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
                        placeholder="Search by order number, customer name, or article number..."
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
                      : 'Get started by adding your first order'
                    }
                  </p>
                  {!hasActiveFilters && (
                    <Link 
                      href="/production/supervisor/add"
                      className="ti-btn ti-btn-primary"
                    >
                      <i className="ri-add-line me-2"></i>
                      Add First Order
                    </Link>
                  )}
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
                                Created: {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 
                                  (order.articles && order.articles.length > 0 && order.articles[0].createdAt ? 
                                    new Date(order.articles[0].createdAt).toLocaleDateString() : 'N/A')}
                              </div>
                              <div className="text-xs text-gray-400">
                                Updated: {order.updatedAt ? new Date(order.updatedAt).toLocaleDateString() : 
                                  (order.articles && order.articles.length > 0 && order.articles[0].updatedAt ? 
                                    new Date(order.articles[0].updatedAt).toLocaleDateString() : 'N/A')}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <div className="font-medium text-gray-900">
                                {order.articles.length} Article{order.articles.length > 1 ? 's' : ''}
                              </div>
                              <div className="text-sm text-gray-600">
                                Total Qty: {order.articles.reduce((sum, article) => sum + (article.plannedQuantity || 0), 0).toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                Avg Progress: {Math.round(order.articles.reduce((sum, article) => sum + (article.progress || 0), 0) / order.articles.length)}%
                              </div>
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
                                className="ti-btn ti-btn-info ti-btn-sm"
                                onClick={() => handleViewOrder(order)}
                                title="View Articles"
                              >
                                <i className="ri-eye-line"></i>
                              </button>
                              <button 
                                className="ti-btn ti-btn-secondary ti-btn-sm"
                                onClick={() => handleViewOrderLogs(order)}
                                title="View Order Logs"
                              >
                                <i className="ri-file-list-line"></i>
                              </button>
                              <Link 
                                href={`/production/supervisor/edit?id=${order.id}`}
                                className="ti-btn ti-btn-primary ti-btn-sm"
                                title="Edit Order"
                              >
                                <i className="ri-edit-line"></i>
                              </Link>
                              <button 
                                className="ti-btn ti-btn-danger ti-btn-sm"
                                onClick={() => handleDeleteOrder(order.id)}
                                title="Delete Order"
                              >
                                <i className="ri-delete-bin-line"></i>
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

      {/* View Articles Modal */}
      {showViewModal && selectedOrder && (
        <OrderViewModal order={selectedOrder} onClose={closeViewModal} />
      )}

      {/* Order Logs Modal */}
      {showOrderLogsModal && selectedOrder && (
        <OrderLogsModal 
          orderId={selectedOrder.id}
          orderNumber={selectedOrder.orderNumber}
          isOpen={showOrderLogsModal}
          onClose={closeOrderLogsModal}
        />
      )}

      {/* Article Logs Modal */}
      {showArticleLogsModal && selectedArticle && (
        <ArticleLogsModal 
          articleId={selectedArticle.id}
          articleNumber={selectedArticle.articleNumber}
          isOpen={showArticleLogsModal}
          onClose={closeArticleLogsModal}
        />
      )}

    </div>
  );
};

export default ProductionSupervisorPage;
