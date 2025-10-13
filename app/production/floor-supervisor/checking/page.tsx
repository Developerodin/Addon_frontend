"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import FloorProgression from "@/shared/components/production/FloorProgression";
import { productionService, ProductionOrder, FloorOrderFilters } from "@/shared/services/productionService";
import { API_BASE_URL } from "@/shared/data/utilities/api";
import NumericInput from "@/shared/utils/numericInput";

interface ArticleLog {
  id: string;
  date: string; // YYYY-MM-DD
  action: string; // e.g., "Transferred to Washing"
  quantity: number;
  fromFloor?: string;
  toFloor?: string;
  remarks?: string;
}

interface FloorQuantities {
  received: number;
  completed: number;
  remaining: number;
  transferred: number;
  m1Quantity?: number;
  m2Quantity?: number;
  m3Quantity?: number;
  m4Quantity?: number;
  repairStatus?: 'Not Required' | 'In Review' | 'Repaired' | 'Rejected';
  repairRemarks?: string;
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
  logs?: ArticleLog[];
  // Floor quantities tracking
  floorQuantities?: {
    knitting?: FloorQuantities;
    linking?: FloorQuantities;
    checking?: FloorQuantities;
    washing?: FloorQuantities;
    boarding?: FloorQuantities;
    branding?: FloorQuantities;
    finalChecking?: FloorQuantities;
    warehouse?: FloorQuantities;
  };
  // Step 4B: Article-wise checked quantities
  m1Quantity: number; // Good quality - ready for next step
  m2Quantity: number; // Needs repair - to be reviewed
  m3Quantity: number; // Minor defects - can be fixed
  m4Quantity: number; // Major defects - needs significant repair
  // Repair sub-step tracking
  repairStatus: 'Not Required' | 'In Review' | 'Repaired' | 'Rejected';
  repairRemarks?: string;
  finalQualityConfirmed?: boolean;
  startedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

const CheckingFloorSupervisorPage = () => {
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
  const [activeUpdateTabIndex, setActiveUpdateTabIndex] = useState(0);
  const [activeViewTabIndex, setActiveViewTabIndex] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [updateData, setUpdateData] = useState<{[key: string]: {
    remarks: string,
    m1Quantity: number,
    m2Quantity: number,
    m3Quantity: number,
    m4Quantity: number,
    repairStatus: 'Not Required' | 'In Review' | 'Repaired' | 'Rejected',
    repairRemarks: string
  }}>({});
  const [shiftInputs, setShiftInputs] = useState<{[key: string]: {
    m2ToM1: number,
    m2ToM3: number,
    m2ToM4: number,
    m3ToM2: number,
    m4ToM3: number
  }}>({});
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
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  // Load checking floor orders from API
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

      const response = await productionService.getFloorOrders('Checking', apiFilters);
      
      if (response.success) {
        console.log('Checking orders loaded:', response.data.results);
        setOrders(response.data.results);
        setTotalPages(response.data.totalPages);
        setTotalResults(response.data.totalResults);
      } else {
        console.error('Failed to load checking orders:', response.error);
        toast.error('Failed to load checking orders');
      }
    } catch (error: any) {
      console.error('Error loading checking orders:', error);
      toast.error(error.message || 'Failed to load checking orders');
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

  // Filter orders and articles based on received quantity for checking floor only
  const filterOrdersByReceivedQuantity = (orders: ProductionOrder[]): ProductionOrder[] => {
    return orders.map(order => {
      // Filter articles that have received quantity > 0 on checking floor only
      const filteredArticles = order.articles.filter(article => {
        const checkingReceived = article.floorQuantities?.checking?.received || 0;
        return checkingReceived > 0;
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

  // Helper function to get checking floor data
  const getCheckingFloorData = (article: Article) => {
    return {
      floor: 'checking',
      data: article.floorQuantities?.checking
    };
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
    const initialData: {[key: string]: {
      remarks: string,
      m1Quantity: number,
      m2Quantity: number,
      m3Quantity: number,
      m4Quantity: number,
      repairStatus: 'Not Required' | 'In Review' | 'Repaired' | 'Rejected',
      repairRemarks: string
    }} = {};
    order.articles.forEach(article => {
      const articleId = article.id || article._id;
      if (articleId) {
        const checkingFloor = getCheckingFloorData(article);
        initialData[articleId] = {
          remarks: article.remarks || '',
          m1Quantity: 0, // Always start with 0 for user input
          m2Quantity: checkingFloor.data?.m2Quantity ?? article.m2Quantity ?? 0,
          m3Quantity: checkingFloor.data?.m3Quantity ?? article.m3Quantity ?? 0,
          m4Quantity: checkingFloor.data?.m4Quantity ?? article.m4Quantity ?? 0,
          repairStatus: checkingFloor.data?.repairStatus || article.repairStatus || 'Not Required',
          repairRemarks: checkingFloor.data?.repairRemarks || article.repairRemarks || ''
        };
      }
    });
    setUpdateData(initialData);
    setShowLogs(false);
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
    setShiftInputs({});
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

  // Handle shift input changes
  const handleShiftInputChange = (articleId: string, shiftType: 'm2ToM1' | 'm2ToM3' | 'm2ToM4' | 'm3ToM2' | 'm4ToM3', value: number) => {
    setShiftInputs(prev => ({
      ...prev,
      [articleId]: {
        ...prev[articleId],
        [shiftType]: value
      }
    }));
  };

  // Apply shift from input
  const applyShift = (articleId: string, shiftType: 'm2ToM1' | 'm2ToM3' | 'm2ToM4' | 'm3ToM2' | 'm4ToM3') => {
    const currentData = updateData[articleId];
    const shiftValue = shiftInputs[articleId]?.[shiftType] || 0;
    
    if (!currentData || shiftValue <= 0) return;

    setUpdateData(prev => {
      const updatedData = { ...prev[articleId] };
      
      switch (shiftType) {
        case 'm2ToM1':
          if (shiftValue <= updatedData.m2Quantity) {
            updatedData.m2Quantity -= shiftValue;
            updatedData.m1Quantity += shiftValue;
          }
          break;
        case 'm2ToM3':
          if (shiftValue <= updatedData.m2Quantity) {
            updatedData.m2Quantity -= shiftValue;
            updatedData.m3Quantity += shiftValue;
          }
          break;
        case 'm2ToM4':
          if (shiftValue <= updatedData.m2Quantity) {
            updatedData.m2Quantity -= shiftValue;
            updatedData.m4Quantity += shiftValue;
          }
          break;
        case 'm3ToM2':
          if (shiftValue <= updatedData.m3Quantity) {
            updatedData.m3Quantity -= shiftValue;
            updatedData.m2Quantity += shiftValue;
          }
          break;
        case 'm4ToM3':
          if (shiftValue <= updatedData.m4Quantity) {
            updatedData.m4Quantity -= shiftValue;
            updatedData.m3Quantity += shiftValue;
          }
          break;
      }

      return {
        ...prev,
        [articleId]: updatedData
      };
    });

    // Clear the input after applying
    setShiftInputs(prev => ({
      ...prev,
      [articleId]: {
        ...prev[articleId],
        [shiftType]: 0
      }
    }));
  };

  const handleUpdateSubmit = async () => {
    if (!selectedOrder) return;

    // Validate M1 quantities before submission
    const invalidArticles = selectedOrder.articles.filter(article => {
      const articleId = article.id || article._id;
      if (!articleId) return false;
      
      const update = updateData[articleId];
      if (!update) return false;
      
      const checkingFloor = getCheckingFloorData(article);
      const received = checkingFloor.data?.received || 0;
      const transferred = checkingFloor.data?.transferred || 0;
      const remaining = received - transferred; // Use transferred instead of current M1
      
      return update.m1Quantity > remaining;
    });

    if (invalidArticles.length > 0) {
      toast.error('Cannot submit: Some articles have M1 quantities exceeding remaining quantities');
      return;
    }

    try {
      setIsLoading(true);
      
      // Update each article that has changes
      const updatePromises = selectedOrder.articles.map(async (article) => {
        const articleId = article.id || article._id;
        if (!articleId) return null;
        
        const update = updateData[articleId];
        if (update && (
          update.remarks !== (article.remarks || '') ||
          update.m1Quantity !== article.m1Quantity ||
          update.m2Quantity !== article.m2Quantity ||
          update.m3Quantity !== article.m3Quantity ||
          update.m4Quantity !== article.m4Quantity ||
          update.repairStatus !== article.repairStatus ||
          update.repairRemarks !== (article.repairRemarks || '')
        )) {
          // Use new bulk quality inspection API for M1-M4 updates
          if (update.m1Quantity !== article.m1Quantity || 
              update.m2Quantity !== article.m2Quantity || 
              update.m3Quantity !== article.m3Quantity || 
              update.m4Quantity !== article.m4Quantity) {
            
            const inspectedQuantity = update.m1Quantity + update.m2Quantity + update.m3Quantity + update.m4Quantity;
            
            try {
              const qualityResponse = await productionService.updateQualityInspection(
                article._id || article.id,
                {
                  inspectedQuantity,
                  m1Quantity: update.m1Quantity,
                  m2Quantity: update.m2Quantity,
                  m3Quantity: update.m3Quantity,
                  m4Quantity: update.m4Quantity,
                  remarks: update.remarks,
                  floor: "Checking"
                }
              );
              
              if (!qualityResponse.success) {
                throw new Error(qualityResponse.error?.message || 'Failed to update quality inspection');
              }
            } catch (error) {
              console.error(`Error updating quality inspection for article ${articleId}:`, error);
              throw error;
            }
          }
          
          // Update other progress data
          const progressData = {
            remarks: update.remarks,
            repairStatus: update.repairStatus,
            repairRemarks: update.repairRemarks
          };
          
          try {
            const response = await productionService.updateArticleProgress(
              'Checking',
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
      <Seo title="Checking Floor Supervisor Dashboard"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <h1 className="box-title text-2xl font-semibold">Checking Floor Supervisor Dashboard</h1>
                <HelpIcon
                  title="Checking Floor Supervisor Dashboard"
                  content={
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-lg mb-2">What is this page?</h4>
                        <p className="text-gray-700">
                          This is the Checking Floor Supervisor Dashboard where you can view and update production orders that are currently on the Checking floor.
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-lg mb-2">What can you do here?</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li><strong>View Orders:</strong> See all orders with articles on the Checking floor</li>
                          <li><strong>Track Quantities:</strong> Monitor planned, received from linking, and M1 quantities (good quality items that pass to next floor)</li>
                          <li><strong>Update Progress:</strong> Click "Update" to modify quality categories (M1-M4) and add remarks</li>
                          <li><strong>Step 4B - Quality Check:</strong> Categorize checked quantities into M1, M2, M3, M4</li>
                          <li><strong>M2 Repair Review:</strong> Review M2 items and shift them to M1, M3, or M4 as needed</li>
                          <li><strong>Track Articles:</strong> Monitor individual article progress and repair status</li>
                          <li><strong>Add Remarks:</strong> Add notes and comments for each article and repair process</li>
                          <li><strong>Filter & Search:</strong> Use filters and search to find specific orders</li>
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
              </div>
            </div>
            
            {/* Floor Progression */}
            {/* <div className="mt-4">
              <FloorProgression 
                linkingType="Auto Linking" 
                currentFloor="Checking"
                className="mb-4"
              />
            </div> */}
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
                    <p className="text-green-100 text-sm font-medium">M1 - Good Quality</p>
                    <p className="text-2xl font-bold text-white">
                      {orders.reduce((sum, order) => 
                        sum + order.articles.reduce((articleSum, article) => {
                          const checkingFloor = getCheckingFloorData(article);
                          return articleSum + (checkingFloor.data?.m1Quantity || article.m1Quantity || 0);
                        }, 0), 0
                      )}
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
                    <p className="text-yellow-100 text-sm font-medium">M2 - Needs Repair</p>
                    <p className="text-2xl font-bold text-white">
                      {orders.reduce((sum, order) => 
                        sum + order.articles.reduce((articleSum, article) => {
                          const checkingFloor = getCheckingFloorData(article);
                          return articleSum + (checkingFloor.data?.m2Quantity || article.m2Quantity || 0);
                        }, 0), 0
                      )}
                    </p>
                  </div>
                  <div className="text-yellow-200">
                    <i className="ri-tools-line text-3xl"></i>
                  </div>
                </div>
              </div>
            </div>

            <div className="box bg-gradient-to-r from-red-500 to-red-600 text-white">
              <div className="box-body p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-sm font-medium">M3+M4 - Defects</p>
                    <p className="text-2xl font-bold text-white">
                      {orders.reduce((sum, order) => 
                        sum + order.articles.reduce((articleSum, article) => {
                          const checkingFloor = getCheckingFloorData(article);
                          return articleSum + (checkingFloor.data?.m3Quantity || article.m3Quantity || 0) + (checkingFloor.data?.m4Quantity || article.m4Quantity || 0);
                        }, 0), 0
                      )}
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
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <i className="ri-file-list-line text-6xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                  <p className="text-gray-500 mb-4">
                    {hasActiveFilters 
                      ? 'Try adjusting your filters or search terms' 
                      : 'No orders currently on Checking floor'
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
                                Total Qty: {order.articles.reduce((sum, article) => sum + article.plannedQuantity, 0).toLocaleString()}
                              </div>
                              {order.articles.some(article => article.floorQuantities?.checking) && (
                                <div className="text-xs text-blue-600">
                                  Checking: R:{order.articles.reduce((sum, article) => sum + (article.floorQuantities?.checking?.received || 0), 0)} | 
                                  Rem:{order.articles.reduce((sum, article) => sum + (article.floorQuantities?.checking?.remaining || 0), 0)}
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
              <h3 className="text-xl font-semibold">Update Order - {selectedOrder.orderNumber}</h3>
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
                
                const articleId = article.id || article._id;
                if (!articleId) return null;
                
                const checkingFloor = getCheckingFloorData(article);
                const currentUpdateData = updateData[articleId] || { 
                  remarks: article.remarks || '',
                  m1Quantity: 0, // Always start with 0 for user input
                  m2Quantity: checkingFloor.data?.m2Quantity ?? article.m2Quantity ?? 0,
                  m3Quantity: checkingFloor.data?.m3Quantity ?? article.m3Quantity ?? 0,
                  m4Quantity: checkingFloor.data?.m4Quantity ?? article.m4Quantity ?? 0,
                  repairStatus: checkingFloor.data?.repairStatus || article.repairStatus || 'Not Required',
                  repairRemarks: checkingFloor.data?.repairRemarks || article.repairRemarks || ''
                };
                
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

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                      <div>
                        <label className="form-label">Planned Quantity</label>
                        <div className="text-lg font-semibold text-gray-900">{(article.plannedQuantity || 0).toLocaleString()}</div>
                      </div>
                      <div>
                        <label className="form-label">
                          {article.linkingType === 'Auto Linking' ? 'Received from Knitting' : 'Received from Linking'}
                        </label>
                        <div className="text-lg font-semibold text-blue-600">
                          {checkingFloor.data?.received || 0}
                        </div>
                      </div>
                      <div>
                        <label className="form-label">M1 Completed Quantity *</label>
                        {(() => {
                          const received = checkingFloor.data?.received || 0;
                          const transferred = checkingFloor.data?.transferred || 0;
                          const remaining = received - transferred; // Use transferred instead of current M1
                          const isFullyTransferred = remaining <= 0;
                          
                          return (
                            <>
                              <NumericInput
                                className={`${
                                  isFullyTransferred 
                                    ? 'bg-gray-100 border-gray-300 cursor-not-allowed' 
                                    : currentUpdateData.m1Quantity > remaining 
                                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                                      : ''
                                }`}
                                value={currentUpdateData.m1Quantity}
                                onChange={(value) => {
                                  if (isFullyTransferred) return;
                                  if (value <= remaining) {
                                    handleM1QuantityChange(articleId, value);
                                  }
                                }}
                                placeholder={isFullyTransferred ? 'Fully Transferred' : `Max: ${remaining}`}
                                disabled={isFullyTransferred}
                              />
                              {isFullyTransferred ? (
                                <div className="text-xs text-green-600 mt-1 font-medium">
                                  ✓ All quantity has been transferred to next floor
                                </div>
                              ) : currentUpdateData.m1Quantity > remaining ? (
                                <div className="text-xs text-red-500 mt-1">
                                  Cannot exceed remaining quantity ({remaining})
                                </div>
                              ) : null}
                              <div className="text-xs text-green-600 mt-1">
                                Only M1 (Good Quality) passes to next floor
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <div>
                        <label className="form-label">Transferred to Next Floor</label>
                        <div className="text-lg font-semibold text-green-600">
                          {checkingFloor.data?.transferred || 0}
                        </div>
                      </div>
                      <div>
                        <label className="form-label">Remaining</label>
                        <div className="text-lg font-semibold text-orange-600">
                          {(() => {
                            const received = checkingFloor.data?.received || 0;
                            const transferred = checkingFloor.data?.transferred || 0;
                            return (received - transferred).toLocaleString();
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Step 4B: Article-wise Checked Quantities */}
                    <div className="mb-6">
                      <h6 className="text-md font-semibold text-gray-900 mb-3 border-b pb-2">Step 4B: Article-wise Checked Quantities</h6>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="form-label text-yellow-700 font-medium">M2 - Needs Repair</label>
                          <NumericInput
                            className="border-yellow-300 focus:border-yellow-500"
                            value={currentUpdateData.m2Quantity}
                            onChange={(value) => handleM2QuantityChange(articleId, value)}
                          />
                          <small className="text-yellow-600">To be reviewed</small>
                        </div>
                        
                        <div>
                          <label className="form-label text-orange-700 font-medium">M3 - Minor Defects</label>
                          <NumericInput
                            className="border-orange-300 focus:border-orange-500"
                            value={currentUpdateData.m3Quantity}
                            onChange={(value) => handleM3QuantityChange(articleId, value)}
                          />
                          <small className="text-orange-600">Can be fixed</small>
                        </div>
                        
                        <div>
                          <label className="form-label text-red-700 font-medium">M4 - Major Defects</label>
                          <NumericInput
                            className="border-red-300 focus:border-red-500"
                            value={currentUpdateData.m4Quantity}
                            onChange={(value) => handleM4QuantityChange(articleId, value)}
                          />
                          <small className="text-red-600">Needs significant repair</small>
                        </div>
                      </div>

                      {/* Quantity Shifting Options */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <h6 className="text-md font-semibold text-blue-800 mb-3">Quantity Shifting Options</h6>
                        <p className="text-sm text-blue-700 mb-4">Use these options to shift quantities between categories when needed</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* M2 to M1 Shift */}
                          {currentUpdateData.m2Quantity > 0 && (
                            <div className="bg-white border border-yellow-200 rounded-lg p-3">
                              <label className="form-label text-yellow-700 font-medium">M2 → M1 (Good Quality)</label>
                              <div className="flex gap-2 mb-2">
                                <NumericInput
                                  className="flex-1"
                                  placeholder="Qty to shift"
                                  min={0}
                                  max={currentUpdateData.m2Quantity}
                                  value={shiftInputs[articleId]?.m2ToM1 || 0}
                                  onChange={(value) => handleShiftInputChange(articleId, 'm2ToM1', value)}
                                />
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-success ti-btn-sm"
                                  onClick={() => applyShift(articleId, 'm2ToM1')}
                                  disabled={!shiftInputs[articleId]?.m2ToM1 || shiftInputs[articleId].m2ToM1 <= 0}
                                >
                                  Apply
                                </button>
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-primary ti-btn-sm"
                                  onClick={() => {
                                    const shiftQty = Math.min(currentUpdateData.m2Quantity, 1);
                                    handleShiftM2Items(articleId, 'M1', shiftQty);
                                  }}
                                  disabled={currentUpdateData.m2Quantity === 0}
                                >
                                  +1
                                </button>
                              </div>
                              <small className="text-yellow-600">Available: {currentUpdateData.m2Quantity}</small>
                            </div>
                          )}

                          {/* M2 to M3 Shift */}
                          {currentUpdateData.m2Quantity > 0 && (
                            <div className="bg-white border border-orange-200 rounded-lg p-3">
                              <label className="form-label text-orange-700 font-medium">M2 → M3 (Minor Defects)</label>
                              <div className="flex gap-2 mb-2">
                                <NumericInput
                                  className="flex-1"
                                  placeholder="Qty to shift"
                                  min={0}
                                  max={currentUpdateData.m2Quantity}
                                  value={shiftInputs[articleId]?.m2ToM3 || 0}
                                  onChange={(value) => handleShiftInputChange(articleId, 'm2ToM3', value)}
                                />
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-warning ti-btn-sm"
                                  onClick={() => applyShift(articleId, 'm2ToM3')}
                                  disabled={!shiftInputs[articleId]?.m2ToM3 || shiftInputs[articleId].m2ToM3 <= 0}
                                >
                                  Apply
                                </button>
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-primary ti-btn-sm"
                                  onClick={() => {
                                    const shiftQty = Math.min(currentUpdateData.m2Quantity, 1);
                                    handleShiftM2Items(articleId, 'M3', shiftQty);
                                  }}
                                  disabled={currentUpdateData.m2Quantity === 0}
                                >
                                  +1
                                </button>
                              </div>
                              <small className="text-orange-600">Available: {currentUpdateData.m2Quantity}</small>
                            </div>
                          )}

                          {/* M2 to M4 Shift */}
                          {currentUpdateData.m2Quantity > 0 && (
                            <div className="bg-white border border-red-200 rounded-lg p-3">
                              <label className="form-label text-red-700 font-medium">M2 → M4 (Major Defects)</label>
                              <div className="flex gap-2 mb-2">
                                <NumericInput
                                  className="flex-1"
                                  placeholder="Qty to shift"
                                  min={0}
                                  max={currentUpdateData.m2Quantity}
                                  value={shiftInputs[articleId]?.m2ToM4 || 0}
                                  onChange={(value) => handleShiftInputChange(articleId, 'm2ToM4', value)}
                                />
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-danger ti-btn-sm"
                                  onClick={() => applyShift(articleId, 'm2ToM4')}
                                  disabled={!shiftInputs[articleId]?.m2ToM4 || shiftInputs[articleId].m2ToM4 <= 0}
                                >
                                  Apply
                                </button>
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-primary ti-btn-sm"
                                  onClick={() => {
                                    const shiftQty = Math.min(currentUpdateData.m2Quantity, 1);
                                    handleShiftM2Items(articleId, 'M4', shiftQty);
                                  }}
                                  disabled={currentUpdateData.m2Quantity === 0}
                                >
                                  +1
                                </button>
                              </div>
                              <small className="text-red-600">Available: {currentUpdateData.m2Quantity}</small>
                            </div>
                          )}
                        </div>

                        {/* Additional shifting options for M3 and M4 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          {/* M3 to M2 Shift */}
                          {currentUpdateData.m3Quantity > 0 && (
                            <div className="bg-white border border-orange-200 rounded-lg p-3">
                              <label className="form-label text-orange-700 font-medium">M3 → M2 (Needs Repair)</label>
                              <div className="flex gap-2 mb-2">
                                <NumericInput
                                  className="flex-1"
                                  placeholder="Qty to shift"
                                  min={0}
                                  max={currentUpdateData.m3Quantity}
                                  value={shiftInputs[articleId]?.m3ToM2 || 0}
                                  onChange={(value) => handleShiftInputChange(articleId, 'm3ToM2', value)}
                                />
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-warning ti-btn-sm"
                                  onClick={() => applyShift(articleId, 'm3ToM2')}
                                  disabled={!shiftInputs[articleId]?.m3ToM2 || shiftInputs[articleId].m3ToM2 <= 0}
                                >
                                  Apply
                                </button>
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-primary ti-btn-sm"
                                  onClick={() => {
                                    const shiftQty = Math.min(currentUpdateData.m3Quantity, 1);
                                    setUpdateData(prev => {
                                      const updatedData = { ...prev[articleId] };
                                      updatedData.m3Quantity = updatedData.m3Quantity - shiftQty;
                                      updatedData.m2Quantity = updatedData.m2Quantity + shiftQty;
                                      return {
                                        ...prev,
                                        [articleId]: updatedData
                                      };
                                    });
                                  }}
                                  disabled={currentUpdateData.m3Quantity === 0}
                                >
                                  +1
                                </button>
                              </div>
                              <small className="text-orange-600">Available: {currentUpdateData.m3Quantity}</small>
                            </div>
                          )}

                          {/* M4 to M3 Shift */}
                          {currentUpdateData.m4Quantity > 0 && (
                            <div className="bg-white border border-red-200 rounded-lg p-3">
                              <label className="form-label text-red-700 font-medium">M4 → M3 (Minor Defects)</label>
                              <div className="flex gap-2 mb-2">
                                <NumericInput
                                  className="flex-1"
                                  placeholder="Qty to shift"
                                  min={0}
                                  max={currentUpdateData.m4Quantity}
                                  value={shiftInputs[articleId]?.m4ToM3 || 0}
                                  onChange={(value) => handleShiftInputChange(articleId, 'm4ToM3', value)}
                                />
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-danger ti-btn-sm"
                                  onClick={() => applyShift(articleId, 'm4ToM3')}
                                  disabled={!shiftInputs[articleId]?.m4ToM3 || shiftInputs[articleId].m4ToM3 <= 0}
                                >
                                  Apply
                                </button>
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-primary ti-btn-sm"
                                  onClick={() => {
                                    const shiftQty = Math.min(currentUpdateData.m4Quantity, 1);
                                    setUpdateData(prev => {
                                      const updatedData = { ...prev[articleId] };
                                      updatedData.m4Quantity = updatedData.m4Quantity - shiftQty;
                                      updatedData.m3Quantity = updatedData.m3Quantity + shiftQty;
                                      return {
                                        ...prev,
                                        [articleId]: updatedData
                                      };
                                    });
                                  }}
                                  disabled={currentUpdateData.m4Quantity === 0}
                                >
                                  +1
                                </button>
                              </div>
                              <small className="text-red-600">Available: {currentUpdateData.m4Quantity}</small>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* M2 Repair Sub-step */}
                      {currentUpdateData.m2Quantity > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                          <h6 className="text-md font-semibold text-yellow-800 mb-3">Step 4B: M2 Items Repair Review</h6>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="form-label">Repair Status</label>
                              <select
                                className="form-select"
                                value={currentUpdateData.repairStatus}
                                onChange={(e) => handleRepairStatusChange(articleId, e.target.value as 'Not Required' | 'In Review' | 'Repaired' | 'Rejected')}
                              >
                                <option value="Not Required">Not Required</option>
                                <option value="In Review">In Review</option>
                                <option value="Repaired">Repaired</option>
                                <option value="Rejected">Rejected</option>
                              </select>
                            </div>
                          </div>
                          
                          <div>
                            <label className="form-label">Repair Remarks</label>
                            <textarea
                              className="form-control"
                              rows={2}
                              placeholder="Add repair remarks for M2 items..."
                              value={currentUpdateData.repairRemarks}
                              onChange={(e) => handleRepairRemarksChange(articleId, e.target.value)}
                            />
                          </div>
                        </div>
                      )}


                      {/* Quantity Summary */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="text-center">
                            <div className="font-medium text-green-700">M1: {currentUpdateData.m1Quantity}</div>
                            <div className="text-xs text-gray-500">(User input)</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-yellow-700">M2: {currentUpdateData.m2Quantity}</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-orange-700">M3: {currentUpdateData.m3Quantity}</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-red-700">M4: {currentUpdateData.m4Quantity}</div>
                          </div>
                        </div>
                        <div className="text-center mt-2 text-xs text-gray-600">
                          Total Checked: {(currentUpdateData.m1Quantity + currentUpdateData.m2Quantity + currentUpdateData.m3Quantity + currentUpdateData.m4Quantity)} / {article.plannedQuantity}
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="form-label">Remarks</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        placeholder="Add remarks for this article..."
                        value={currentUpdateData.remarks}
                        onChange={(e) => handleRemarksChange(articleId, e.target.value)}
                      />
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
                disabled={
                  selectedOrder.articles.some(article => {
                    const articleId = article.id || article._id;
                    if (!articleId) return false;
                    const update = updateData[articleId];
                    if (!update) return false;
                    
                    const checkingFloor = getCheckingFloorData(article);
                    const received = checkingFloor.data?.received || 0;
                    const transferred = checkingFloor.data?.transferred || 0;
                    const remaining = received - transferred; // Use transferred instead of current M1
                    
                    return update.m1Quantity > remaining;
                  })
                }
              >
                <i className="ri-save-line me-2"></i>
                Update Order
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
                  {selectedOrder.articles.map((article, idx) => (
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
                const article = selectedOrder.articles[activeViewTabIndex];
                if (!article) return null;
                
                const checkingFloor = getCheckingFloorData(article);
                
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

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className="form-label">Planned Quantity</label>
                        <div className="text-lg font-semibold text-gray-900">{(article.plannedQuantity || 0).toLocaleString()}</div>
                      </div>
                      <div>
                        <label className="form-label">
                          {article.linkingType === 'Auto Linking' ? 'Received from Knitting' : 'Received from Linking'}
                        </label>
                        <div className="text-lg font-semibold text-blue-600">
                          {checkingFloor.data?.received || 0}
                        </div>
                      </div>
                      <div>
                        <label className="form-label">Checking Completed Quantity (M1 - Good Quality)</label>
                        <div className="text-lg font-semibold text-green-600">
                          {checkingFloor.data?.m1Quantity || article.m1Quantity || 0}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Only M1 items pass to next floor
                        </div>
                        {article.floorQuantities?.knitting?.m4Quantity && article.floorQuantities.knitting.m4Quantity > 0 && (
                          <div className="text-xs text-red-600 mt-1">
                            M4 Quantity In Knitting: {article.floorQuantities.knitting.m4Quantity}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="form-label">Transferred Quantity</label>
                        <div className="text-lg font-semibold text-purple-600">
                          {checkingFloor.data?.transferred || 0}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Transferred to next floor (Washing)
                        </div>
                      </div>
                    </div>

                    {/* Quality Check Results */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className="form-label">M1 (Good Quality)</label>
                        <div className="text-lg font-semibold text-green-600">{checkingFloor.data?.m1Quantity || article.m1Quantity || 0}</div>
                      </div>
                      <div>
                        <label className="form-label">M2 (Needs Repair)</label>
                        <div className="text-lg font-semibold text-yellow-600">{checkingFloor.data?.m2Quantity || article.m2Quantity || 0}</div>
                      </div>
                      <div>
                        <label className="form-label">M3 (Minor Defects)</label>
                        <div className="text-lg font-semibold text-orange-600">{checkingFloor.data?.m3Quantity || article.m3Quantity || 0}</div>
                      </div>
                      <div>
                        <label className="form-label">M4 (Major Defects)</label>
                        <div className="text-lg font-semibold text-red-600">{checkingFloor.data?.m4Quantity || article.m4Quantity || 0}</div>
                      </div>
                    </div>

                    {(checkingFloor.data?.repairStatus || article.repairStatus) && (checkingFloor.data?.repairStatus || article.repairStatus) !== 'Not Required' && (
                      <div className="mb-4">
                        <label className="form-label">Repair Status</label>
                        <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                          {checkingFloor.data?.repairStatus || article.repairStatus}
                        </div>
                      </div>
                    )}

                    {(checkingFloor.data?.repairRemarks || article.repairRemarks) && (
                      <div className="mb-4">
                        <label className="form-label">Repair Remarks</label>
                        <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                          {checkingFloor.data?.repairRemarks || article.repairRemarks}
                        </div>
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

                    <div className="flex justify-between items-center text-sm text-gray-600">
                      <div>
                        Remaining: {(checkingFloor.data?.remaining || 0).toLocaleString()}
                      </div>
                      <div>
                        Progress: {Math.round(((checkingFloor.data?.m1Quantity || article.m1Quantity || 0) / (checkingFloor.data?.received || 1)) * 100)}%
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
                        {selectedOrder.articles.map((article) => {
                          const articleId = article._id || article.id;
                          const receivedQty = article.floorQuantities?.checking?.received || 0;
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

export default CheckingFloorSupervisorPage;
