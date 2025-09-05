"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";

interface ArticleLog {
  id: string;
  date: string; // YYYY-MM-DD
  action: string; // e.g., "Transferred to Branding"
  quantity: number;
  fromFloor?: string;
  toFloor?: string;
  remarks?: string;
}

interface Article {
  id: string;
  articleNumber: string;
  plannedQuantity: number;
  completedQuantity: number;
  linkingType: 'Auto Linking' | 'Rosso Linking' | 'Hand Linking';
  priority: 'High' | 'Medium' | 'Low' | 'Urgent';
  status: 'Pending' | 'In Progress' | 'Completed' | 'On Hold';
  progress: number;
  currentFloor: string;
  remarks?: string;
  logs?: ArticleLog[];
  // Step 4B: Article-wise checked quantities
  m1Quantity: number; // Good quality - ready for next step
  m2Quantity: number; // Needs repair - to be reviewed
  m3Quantity: number; // Minor defects - can be fixed
  m4Quantity: number; // Major defects - needs significant repair
  // Repair sub-step tracking
  repairStatus: 'Not Required' | 'In Review' | 'Repaired' | 'Rejected';
  repairRemarks?: string;
  // Final quality confirmation
  finalQualityConfirmed?: boolean;
}

interface ProductionOrder {
  id: string;
  priority: 'High' | 'Medium' | 'Low' | 'Urgent';
  status: 'Pending' | 'In Progress' | 'Completed' | 'On Hold';
  articles: Article[];
  floor: string;
  createdAt: string;
  updatedAt: string;
  forwardedToBranding?: boolean;
}

const FinalCheckingFloorSupervisorPage = () => {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [activeUpdateTabIndex, setActiveUpdateTabIndex] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [updateData, setUpdateData] = useState<{[key: string]: {
    completedQuantity: number, 
    remarks: string,
    m1Quantity: number,
    m2Quantity: number,
    m3Quantity: number,
    m4Quantity: number,
    repairStatus: 'Not Required' | 'In Review' | 'Repaired' | 'Rejected',
    repairRemarks: string
  }}>({});
  const [showLogs, setShowLogs] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    linkingType: '',
    floor: ''
  });

  // Static data for demonstration - filtered for Final Checking
  const staticOrders: ProductionOrder[] = [
    {
      id: 'ORD-001',
      priority: 'High',
      status: 'In Progress',
      floor: 'Final Checking',
      createdAt: '2024-01-15',
      updatedAt: '2024-01-20',
      articles: [
        {
          id: 'ART001',
          articleNumber: 'ART001',
          plannedQuantity: 1000,
          completedQuantity: 750,
          linkingType: 'Auto Linking',
          priority: 'High',
          status: 'In Progress',
          progress: 75,
          currentFloor: 'Final Checking',
          finalQualityConfirmed: false,
          remarks: 'Good progress, no issues',
          m1Quantity: 600,
          m2Quantity: 100,
          m3Quantity: 30,
          m4Quantity: 20,
          repairStatus: 'In Review',
          repairRemarks: 'M2 items need quality review'
        },
        {
          id: 'ART002',
          articleNumber: 'ART002',
          plannedQuantity: 500,
          completedQuantity: 200,
          linkingType: 'Rosso Linking',
          priority: 'Medium',
          status: 'In Progress',
          progress: 40,
          currentFloor: 'Final Checking',
          finalQualityConfirmed: false,
          remarks: 'Started yesterday',
          m1Quantity: 150,
          m2Quantity: 30,
          m3Quantity: 15,
          m4Quantity: 5,
          repairStatus: 'Not Required',
          repairRemarks: ''
        }
      ]
    },
    {
      id: 'ORD-003',
      priority: 'Urgent',
      status: 'In Progress',
      floor: 'Final Checking',
      createdAt: '2024-01-20',
      updatedAt: '2024-01-20',
      articles: [
        {
          id: 'ART004',
          articleNumber: 'ART004',
          plannedQuantity: 750,
          completedQuantity: 0,
          linkingType: 'Hand Linking',
          priority: 'Urgent',
          status: 'Pending',
          progress: 0,
          currentFloor: 'Final Checking',
          finalQualityConfirmed: false,
          remarks: 'Ready to start',
          m1Quantity: 0,
          m2Quantity: 0,
          m3Quantity: 0,
          m4Quantity: 0,
          repairStatus: 'Not Required',
          repairRemarks: ''
        },
        {
          id: 'ART005',
          articleNumber: 'ART005',
          plannedQuantity: 300,
          completedQuantity: 0,
          linkingType: 'Auto Linking',
          priority: 'High',
          status: 'Pending',
          progress: 0,
          currentFloor: 'Final Checking',
          finalQualityConfirmed: false,
          remarks: 'Waiting for materials',
          m1Quantity: 0,
          m2Quantity: 0,
          m3Quantity: 0,
          m4Quantity: 0,
          repairStatus: 'Not Required',
          repairRemarks: ''
        }
      ]
    },
    {
      id: 'ORD-005',
      priority: 'High',
      status: 'In Progress',
      floor: 'Final Checking',
      createdAt: '2024-01-08',
      updatedAt: '2024-01-21',
      articles: [
        {
          id: 'ART007',
          articleNumber: 'ART007',
          plannedQuantity: 800,
          completedQuantity: 720,
          linkingType: 'Rosso Linking',
          priority: 'High',
          status: 'In Progress',
          progress: 90,
          currentFloor: 'Final Checking',
          finalQualityConfirmed: true,
          remarks: 'Almost complete, quality check needed',
          m1Quantity: 650,
          m2Quantity: 50,
          m3Quantity: 15,
          m4Quantity: 5,
          repairStatus: 'Repaired',
          repairRemarks: 'M2 items successfully repaired and moved to M1'
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
    const initialData: {[key: string]: {
      completedQuantity: number, 
      remarks: string,
      m1Quantity: number,
      m2Quantity: number,
      m3Quantity: number,
      m4Quantity: number,
      repairStatus: 'Not Required' | 'In Review' | 'Repaired' | 'Rejected',
      repairRemarks: string
    }} = {};
    order.articles.forEach(article => {
      initialData[article.id] = {
        completedQuantity: article.completedQuantity,
        remarks: article.remarks || '',
        m1Quantity: article.m1Quantity,
        m2Quantity: article.m2Quantity,
        m3Quantity: article.m3Quantity,
        m4Quantity: article.m4Quantity,
        repairStatus: article.repairStatus,
        repairRemarks: article.repairRemarks || ''
      };
    });
    setUpdateData(initialData);
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

  const handleM1QuantityChange = (articleId: string, value: number) => {
    setUpdateData(prev => ({
      ...prev,
      [articleId]: {
        ...prev[articleId],
        m1Quantity: value
      }
    }));
  };

  const handleM2QuantityChange = (articleId: string, value: number) => {
    setUpdateData(prev => ({
      ...prev,
      [articleId]: {
        ...prev[articleId],
        m2Quantity: value
      }
    }));
  };

  const handleM3QuantityChange = (articleId: string, value: number) => {
    setUpdateData(prev => ({
      ...prev,
      [articleId]: {
        ...prev[articleId],
        m3Quantity: value
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

  const handleRepairStatusChange = (articleId: string, value: 'Not Required' | 'In Review' | 'Repaired' | 'Rejected') => {
    setUpdateData(prev => ({
      ...prev,
      [articleId]: {
        ...prev[articleId],
        repairStatus: value
      }
    }));
  };

  const handleRepairRemarksChange = (articleId: string, value: string) => {
    setUpdateData(prev => ({
      ...prev,
      [articleId]: {
        ...prev[articleId],
        repairRemarks: value
      }
    }));
  };

  // Function to shift M2 items to M1, M3, or M4
  const handleShiftM2Items = (articleId: string, targetCategory: 'M1' | 'M3' | 'M4', quantity: number) => {
    const currentData = updateData[articleId];
    if (!currentData || quantity > currentData.m2Quantity) return;

    setUpdateData(prev => {
      const updatedData = { ...prev[articleId] };
      updatedData.m2Quantity = updatedData.m2Quantity - quantity;
      
      if (targetCategory === 'M1') {
        updatedData.m1Quantity = updatedData.m1Quantity + quantity;
      } else if (targetCategory === 'M3') {
        updatedData.m3Quantity = updatedData.m3Quantity + quantity;
      } else if (targetCategory === 'M4') {
        updatedData.m4Quantity = updatedData.m4Quantity + quantity;
      }

      return {
        ...prev,
        [articleId]: updatedData
      };
    });
  };

  // Mark final quality for an article in the open modal
  const handleConfirmFinalQuality = (articleId: string, confirmed: boolean) => {
    if (!selectedOrder) return;
    // Update orders list
    setOrders(prev => prev.map(o => o.id === selectedOrder.id ? {
      ...o,
      articles: o.articles.map(a => a.id === articleId ? { ...a, finalQualityConfirmed: confirmed } : a)
    } : o));
    // Update selectedOrder snapshot so UI reflects instantly
    setSelectedOrder(prev => prev ? {
      ...prev,
      articles: prev.articles.map(a => a.id === articleId ? { ...a, finalQualityConfirmed: confirmed } : a)
    } : prev);
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
                
                return {
                  ...article,
                  completedQuantity: update.completedQuantity,
                  progress: newProgress,
                  status: newStatus,
                  remarks: update.remarks,
                  m1Quantity: update.m1Quantity,
                  m2Quantity: update.m2Quantity,
                  m3Quantity: update.m3Quantity,
                  m4Quantity: update.m4Quantity,
                  repairStatus: update.repairStatus,
                  repairRemarks: update.repairRemarks
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

  const handleForwardToBranding = () => {
    if (!selectedOrder) return;
    const order = orders.find(o => o.id === selectedOrder.id);
    if (!order) return;
    const allConfirmed = order.articles.every(a => a.finalQualityConfirmed);
    if (!allConfirmed) {
      toast.error('Confirm final quality for all articles before forwarding.');
      return;
    }
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, forwardedToBranding: true, status: 'Completed' } : o));
    toast.success('Forwarded to Branding successfully');
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
      <Seo title="Final Checking Supervisor Dashboard"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <h1 className="box-title text-2xl font-semibold">Final Checking Supervisor Dashboard</h1>
                <HelpIcon
                  title="Final Checking Supervisor Dashboard"
                  content={
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-lg mb-2">What is this page?</h4>
                        <p className="text-gray-700">
                          Enter article-wise checked quantities: M1, M2, M3, M4. Step 7B (Repair Sub-step): review M2 items and shift to M1/M3/M4. Confirm final quality and forward to Branding.
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-lg mb-2">What can you do here?</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li><strong>View Orders:</strong> See all orders at Final Checking</li>
                          <li><strong>Update Progress:</strong> Click "Update" to modify completed quantities and add remarks</li>
                          <li><strong>Step 7B - Quality Check:</strong> Categorize checked quantities into M1, M2, M3, M4</li>
                          <li><strong>Step 7B (Repair Sub-step):</strong> Review M2 items, shift to M1/M3/M4 if repairable</li>
                          <li><strong>Confirm & Forward:</strong> Confirm final quality and forward the order to Branding</li>
                          <li><strong>Track Articles:</strong> Monitor individual article progress and repair status</li>
                          <li><strong>Add Remarks:</strong> Add notes and comments for each article and repair process</li>
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
          <div className="mb-6">
            {/* Using shared FinalCheckingStats component */}
            {/* @ts-ignore - isolated build context may not resolve path here in editor preview */}
            {(() => {
              const FinalCheckingStats = require('@/shared/components/production/final-checking/FinalCheckingStats').default;
              return <FinalCheckingStats orders={orders} />;
            })()}
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
                      : 'No orders currently at Final Checking'
                    }
                  </p>
                </div>
              ) : (
                // Using shared FinalCheckingTable component
                // @ts-ignore - isolated build context may not resolve path here in editor preview
                (() => {
                  const FinalCheckingTable = require('@/shared/components/production/final-checking/FinalCheckingTable').default;
                  return (
                    <FinalCheckingTable
                      orders={paginatedOrders}
                      selectedOrders={selectedOrders}
                      selectAll={selectAll}
                      onToggleSelectAll={handleSelectAll}
                      onToggleSelect={handleOrderSelect}
                      onOpenUpdate={handleUpdateOrder}
                    />
                  );
                })()
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="form-label">Planned Quantity</label>
                        <div className="text-lg font-semibold text-gray-900">{article.plannedQuantity.toLocaleString()}</div>
                      </div>
                      <div>
                        <label className="form-label">Completed Quantity *</label>
                        <input
                          type="number"
                          className="form-control"
                          value={updateData[article.id]?.completedQuantity || 0}
                          onChange={(e) => handleQuantityChange(article.id, Number(e.target.value))}
                          min="0"
                          max={article.plannedQuantity}
                        />
                      </div>
                    </div>

                    {/* Step 4B: Article-wise Checked Quantities */}
                    <div className="mb-6">
                      <h6 className="text-md font-semibold text-gray-900 mb-3 border-b pb-2">Step 4B: Article-wise Checked Quantities</h6>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <label className="form-label text-green-700 font-medium">M1 - Good Quality</label>
                          <input
                            type="number"
                            className="form-control border-green-300 focus:border-green-500"
                            value={updateData[article.id]?.m1Quantity || 0}
                            onChange={(e) => handleM1QuantityChange(article.id, Number(e.target.value))}
                            min="0"
                            max={article.plannedQuantity}
                          />
                          <small className="text-green-600">Ready for next step</small>
                        </div>
                        
                        <div>
                          <label className="form-label text-yellow-700 font-medium">M2 - Needs Repair</label>
                          <input
                            type="number"
                            className="form-control border-yellow-300 focus:border-yellow-500"
                            value={updateData[article.id]?.m2Quantity || 0}
                            onChange={(e) => handleM2QuantityChange(article.id, Number(e.target.value))}
                            min="0"
                            max={article.plannedQuantity}
                          />
                          <small className="text-yellow-600">To be reviewed</small>
                        </div>
                        
                        <div>
                          <label className="form-label text-orange-700 font-medium">M3 - Minor Defects</label>
                          <input
                            type="number"
                            className="form-control border-orange-300 focus:border-orange-500"
                            value={updateData[article.id]?.m3Quantity || 0}
                            onChange={(e) => handleM3QuantityChange(article.id, Number(e.target.value))}
                            min="0"
                            max={article.plannedQuantity}
                          />
                          <small className="text-orange-600">Can be fixed</small>
                        </div>
                        
                        <div>
                          <label className="form-label text-red-700 font-medium">M4 - Major Defects</label>
                          <input
                            type="number"
                            className="form-control border-red-300 focus:border-red-500"
                            value={updateData[article.id]?.m4Quantity || 0}
                            onChange={(e) => handleM4QuantityChange(article.id, Number(e.target.value))}
                            min="0"
                            max={article.plannedQuantity}
                          />
                          <small className="text-red-600">Needs significant repair</small>
                        </div>
                      </div>

                      {/* M2 Repair Sub-step */}
                      {updateData[article.id]?.m2Quantity > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                          <h6 className="text-md font-semibold text-yellow-800 mb-3">Step 4B: M2 Items Repair Review</h6>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="form-label">Repair Status</label>
                              <select
                                className="form-select"
                                value={updateData[article.id]?.repairStatus || 'Not Required'}
                                onChange={(e) => handleRepairStatusChange(article.id, e.target.value as 'Not Required' | 'In Review' | 'Repaired' | 'Rejected')}
                              >
                                <option value="Not Required">Not Required</option>
                                <option value="In Review">In Review</option>
                                <option value="Repaired">Repaired</option>
                                <option value="Rejected">Rejected</option>
                              </select>
                            </div>
                            
                            <div>
                              <label className="form-label">M2 Items Available: {updateData[article.id]?.m2Quantity || 0}</label>
                              <div className="flex gap-2 mt-2">
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-success ti-btn-sm"
                                  onClick={() => {
                                    const shiftQty = Math.min(10, updateData[article.id]?.m2Quantity || 0);
                                    handleShiftM2Items(article.id, 'M1', shiftQty);
                                  }}
                                  disabled={!updateData[article.id]?.m2Quantity}
                                >
                                  Shift 10 to M1
                                </button>
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-warning ti-btn-sm"
                                  onClick={() => {
                                    const shiftQty = Math.min(10, updateData[article.id]?.m2Quantity || 0);
                                    handleShiftM2Items(article.id, 'M3', shiftQty);
                                  }}
                                  disabled={!updateData[article.id]?.m2Quantity}
                                >
                                  Shift 10 to M3
                                </button>
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-danger ti-btn-sm"
                                  onClick={() => {
                                    const shiftQty = Math.min(10, updateData[article.id]?.m2Quantity || 0);
                                    handleShiftM2Items(article.id, 'M4', shiftQty);
                                  }}
                                  disabled={!updateData[article.id]?.m2Quantity}
                                >
                                  Shift 10 to M4
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <label className="form-label">Repair Remarks</label>
                            <textarea
                              className="form-control"
                              rows={2}
                              placeholder="Add repair remarks for M2 items..."
                              value={updateData[article.id]?.repairRemarks || ''}
                              onChange={(e) => handleRepairRemarksChange(article.id, e.target.value)}
                            />
                          </div>
                        </div>
                      )}

                      {/* Quantity Summary */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="text-center">
                            <div className="font-medium text-green-700">M1: {updateData[article.id]?.m1Quantity || 0}</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-yellow-700">M2: {updateData[article.id]?.m2Quantity || 0}</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-orange-700">M3: {updateData[article.id]?.m3Quantity || 0}</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-red-700">M4: {updateData[article.id]?.m4Quantity || 0}</div>
                          </div>
                        </div>
                        <div className="text-center mt-2 text-xs text-gray-600">
                          Total Checked: {((updateData[article.id]?.m1Quantity || 0) + (updateData[article.id]?.m2Quantity || 0) + (updateData[article.id]?.m3Quantity || 0) + (updateData[article.id]?.m4Quantity || 0))} / {article.plannedQuantity}
                        </div>
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
                        Remaining: {(article.plannedQuantity - (updateData[article.id]?.completedQuantity || 0)).toLocaleString()}
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
                                {(log.fromFloor || 'Final Checking')} {log.action?.toLowerCase?.() || 'action'} {log.quantity.toLocaleString()} {log.toFloor ? `to ${log.toFloor}` : ''} on {log.date}
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

export default FinalCheckingFloorSupervisorPage;
