"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";

interface Article {
  id: string;
  articleNumber: string;
  plannedQuantity: number;
  quantityFromKnitting: number;
  completedQuantity: number;
  linkingType: 'Auto Linking' | 'Rosso Linking' | 'Hand Linking';
  priority: 'High' | 'Medium' | 'Low' | 'Urgent';
  status: 'Pending' | 'In Progress' | 'Completed' | 'On Hold';
  progress: number;
  currentFloor: string;
  remarks?: string;
  logs?: {
    id: string;
    date: string;
    action: string;
    quantity: number;
    fromFloor?: string;
    toFloor?: string;
    remarks?: string;
  }[];
}

interface ProductionOrder {
  id: string;
  priority: 'High' | 'Medium' | 'Low' | 'Urgent';
  status: 'Pending' | 'In Progress' | 'Completed' | 'On Hold';
  articles: Article[];
  floor: string;
  createdAt: string;
  updatedAt: string;
}

const LinkingFloorSupervisorPage = () => {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [activeUpdateTabIndex, setActiveUpdateTabIndex] = useState(0);
  const [updateData, setUpdateData] = useState<{[key: string]: {completedQuantity: number, remarks: string}}>({});
  const [showLogs, setShowLogs] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    linkingType: '',
    floor: ''
  });

  // Static data for demonstration - filtered for Linking floor
  const staticOrders: ProductionOrder[] = [
    {
      id: 'ORD-001',
      priority: 'High',
      status: 'In Progress',
      floor: 'Linking',
      createdAt: '2024-01-15',
      updatedAt: '2024-01-20',
      articles: [
        {
          id: 'ART001',
          articleNumber: 'ART001',
          plannedQuantity: 1000,
          quantityFromKnitting: 750,
          completedQuantity: 300,
          linkingType: 'Auto Linking',
          priority: 'High',
          status: 'In Progress',
          progress: 40,
          currentFloor: 'Linking',
          remarks: 'Received from knitting, good quality'
        },
        {
          id: 'ART002',
          articleNumber: 'ART002',
          plannedQuantity: 500,
          quantityFromKnitting: 200,
          completedQuantity: 150,
          linkingType: 'Rosso Linking',
          priority: 'Medium',
          status: 'In Progress',
          progress: 75,
          currentFloor: 'Linking',
          remarks: 'Partial quantity received, working on it'
        }
      ]
    },
    {
      id: 'ORD-003',
      priority: 'Urgent',
      status: 'In Progress',
      floor: 'Linking',
      createdAt: '2024-01-20',
      updatedAt: '2024-01-20',
      articles: [
        {
          id: 'ART004',
          articleNumber: 'ART004',
          plannedQuantity: 750,
          quantityFromKnitting: 0,
          completedQuantity: 0,
          linkingType: 'Hand Linking',
          priority: 'Urgent',
          status: 'Pending',
          progress: 0,
          currentFloor: 'Linking',
          remarks: 'Waiting for knitting to complete'
        },
        {
          id: 'ART005',
          articleNumber: 'ART005',
          plannedQuantity: 300,
          quantityFromKnitting: 0,
          completedQuantity: 0,
          linkingType: 'Auto Linking',
          priority: 'High',
          status: 'Pending',
          progress: 0,
          currentFloor: 'Linking',
          remarks: 'Materials not yet received from knitting'
        }
      ]
    },
    {
      id: 'ORD-006',
      priority: 'Medium',
      status: 'In Progress',
      floor: 'Linking',
      createdAt: '2024-01-18',
      updatedAt: '2024-01-22',
      articles: [
        {
          id: 'ART008',
          articleNumber: 'ART008',
          plannedQuantity: 400,
          quantityFromKnitting: 100,
          completedQuantity: 80,
          linkingType: 'Hand Linking',
          priority: 'Medium',
          status: 'In Progress',
          progress: 80,
          currentFloor: 'Linking',
          remarks: 'Almost complete, quality check pending'
        }
      ]
    }
  ];

  useEffect(() => {
    // Simulate loading
    setIsLoading(true);
    setTimeout(() => {
      setOrders(staticOrders);
      setIsLoading(false);
    }, 500);
  }, []);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.articles.some(article => 
      article.articleNumber.toLowerCase().includes(searchQuery.toLowerCase())
    ) || order.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !filters.status || order.status === filters.status;
    const matchesPriority = !filters.priority || order.priority === filters.priority;
    const matchesLinkingType = !filters.linkingType || order.articles.some(article => article.linkingType === filters.linkingType);
    const matchesFloor = !filters.floor || order.floor.toLowerCase().includes(filters.floor.toLowerCase());

    return matchesSearch && matchesStatus && matchesPriority && matchesLinkingType && matchesFloor;
  });

  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

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

  const handleUpdateOrder = (order: ProductionOrder) => {
    setSelectedOrder(order);
    setActiveUpdateTabIndex(0);
    // Initialize update data with current values
    const initialData: {[key: string]: {completedQuantity: number, remarks: string}} = {};
    order.articles.forEach(article => {
      initialData[article.id] = {
        completedQuantity: article.completedQuantity,
        remarks: article.remarks || ''
      };
    });
    setUpdateData(initialData);
    setShowLogs(false);
    setShowUpdateModal(true);
  };

  const closeUpdateModal = () => {
    setShowUpdateModal(false);
    setSelectedOrder(null);
    setUpdateData({});
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

  const handleUpdateSubmit = () => {
    if (!selectedOrder) return;

    // Update the order with new data
    setOrders(prev => prev.map(order => 
      order.id === selectedOrder.id 
        ? {
            ...order,
            articles: order.articles.map(article => {
              const update = updateData[article.id];
              if (update) {
                const newProgress = Math.round((update.completedQuantity / article.plannedQuantity) * 100);
                const newStatus = update.completedQuantity >= article.plannedQuantity ? 'Completed' : 
                                 update.completedQuantity > 0 ? 'In Progress' : 'Pending';
                // Log transfers from Linking to Checking when completed increases
                const previousCompleted = article.completedQuantity || 0;
                const deltaTransferred = Math.max(0, update.completedQuantity - previousCompleted);
                let newLogs = article.logs ? [...article.logs] : [] as NonNullable<Article['logs']>;
                if (deltaTransferred > 0) {
                  const today = new Date();
                  const isoDate = today.toISOString().split('T')[0];
                  newLogs.push({
                    id: `${article.id}-${Date.now()}`,
                    date: isoDate,
                    action: 'Transferred to Checking',
                    quantity: deltaTransferred,
                    fromFloor: 'Linking',
                    toFloor: 'Checking',
                    remarks: update.remarks || ''
                  });
                }

                return {
                  ...article,
                  completedQuantity: update.completedQuantity,
                  progress: newProgress,
                  status: newStatus,
                  remarks: update.remarks,
                  logs: newLogs
                };
              }
              return article;
            })
          }
        : order
    ));

    toast.success('Order updated successfully');
    closeUpdateModal();
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
    <div className="main-content">
      <Seo title="Linking Floor Supervisor Dashboard"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <h1 className="box-title text-2xl font-semibold">Linking Floor Supervisor Dashboard</h1>
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
                          <li><strong>Update Progress:</strong> Click "Update" to modify completed quantities and add remarks</li>
                          <li><strong>Add Remarks:</strong> Add notes and comments for each article</li>
                          <li><strong>Filter & Search:</strong> Use filters and search to find specific orders</li>
                        </ul>
                      </div>
                    </div>
                  }
                />
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
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <i className="ri-file-list-line text-6xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                  <p className="text-gray-500 mb-4">
                    {hasActiveFilters 
                      ? 'Try adjusting your filters or search terms' 
                      : 'No orders currently on Linking floor'
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
                              <div className="font-medium text-gray-900">{order.id}</div>
                              <div className="text-sm text-gray-500">
                                Created: {order.createdAt}
                              </div>
                              <div className="text-xs text-gray-400">
                                Updated: {order.updatedAt}
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
                              <div className="text-xs text-gray-500">
                                Completed: {order.articles.reduce((sum, article) => sum + article.completedQuantity, 0).toLocaleString()}
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
              {!isLoading && filteredOrders.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-6 border-t border-gray-200">
                  <div className="text-sm text-gray-700 mb-4 sm:mb-0">
                    <span className="font-medium">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredOrders.length)} 
                    </span>
                    <span className="text-gray-500"> of {filteredOrders.length.toLocaleString()} orders</span>
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
              <h3 className="text-xl font-semibold">Update Order - {selectedOrder.id}</h3>
              <button
                onClick={closeUpdateModal}
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

            {/* Articles Update Form with Tabs */}
            <div className="space-y-6">
              <h4 className="text-lg font-medium text-gray-900">Update Article Progress</h4>

              {/* Blue Article Tabs */}
              <div className="mb-4">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {selectedOrder.articles.map((article, idx) => (
                    <button
                      key={article.id}
                      className={`px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap focus:outline-none ${
                        idx === activeUpdateTabIndex ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                      onClick={() => {
                        setActiveUpdateTabIndex(idx);
                        setShowLogs(false);
                      }}
                      title={article.articleNumber}
                    >
                      {article.articleNumber || `Article ${idx + 1}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Article Form */}
              {(() => {
                const article = selectedOrder.articles[activeUpdateTabIndex];
                if (!article) return null;
                return (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h5 className="text-md font-medium text-gray-900">{article.articleNumber}</h5>
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Linking Type:</span> {article.linkingType}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(article.priority)}`}>
                          {article.priority}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="form-label">Planned Quantity</label>
                        <div className="text-lg font-semibold text-gray-900">{article.plannedQuantity.toLocaleString()}</div>
                      </div>
                      <div>
                        <label className="form-label">Received from Knitting</label>
                        <div className="text-lg font-semibold text-blue-600">{article.quantityFromKnitting.toLocaleString()}</div>
                      </div>
                      <div>
                        <label className="form-label">Completed Quantity *</label>
                        <input
                          type="number"
                          className="form-control"
                          value={updateData[article.id]?.completedQuantity || 0}
                          onChange={(e) => handleQuantityChange(article.id, Number(e.target.value))}
                          min="0"
                          max={article.quantityFromKnitting}
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="form-label">Remarks</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        placeholder="Add remarks for this article..."
                        value={updateData[article.id]?.remarks || ''}
                        onChange={(e) => handleRemarksChange(article.id, e.target.value)}
                      />
                    </div>

                    <div className="flex justify-between items-center text-sm text-gray-600">
                      <div>
                        Remaining: {(article.quantityFromKnitting - (updateData[article.id]?.completedQuantity || 0)).toLocaleString()}
                      </div>
                      <div>
                        Progress: {Math.round(((updateData[article.id]?.completedQuantity || 0) / article.plannedQuantity) * 100)}%
                      </div>
                    </div>

                    {/* View Logs Button and panel */}
                    <div className="mt-4">
                      <button
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap"
                        onClick={() => setShowLogs(!showLogs)}
                        title="View Article Logs"
                        type="button"
                      >
                        <i className="ri-file-list-3-line"></i>
                        {showLogs ? 'Hide Logs' : 'View Logs'}
                      </button>
                      {showLogs && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded max-w-full overflow-x-auto">
                          <ul className="list-disc list-inside text-sm text-blue-900 space-y-1 break-words">
                            {(
                              (article.logs || [])
                                .slice()
                                .sort((a, b) => (a.date > b.date ? -1 : 1))
                            ).map((log) => (
                              <li key={log.id}>
                                {(log.fromFloor || 'Linking')} {log.action?.toLowerCase?.() || 'action'} {log.quantity.toLocaleString()} {log.toFloor ? `to ${log.toFloor}` : ''} on {log.date}
                                {log.remarks ? ` — ${log.remarks}` : ''}
                              </li>
                            ))}
                            {(article.logs?.length || 0) === 0 && <li>No logs yet</li>}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
              <button
                onClick={closeUpdateModal}
                className="ti-btn ti-btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSubmit}
                className="ti-btn ti-btn-primary"
              >
                <i className="ri-save-line me-2"></i>
                Update Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LinkingFloorSupervisorPage;
