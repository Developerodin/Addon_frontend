"use client";
import React, { useState, useEffect, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import { productionService, ProductionOrder, FloorOrderFilters, Article } from "@/shared/services/productionService";
import { API_BASE_URL } from "@/shared/data/utilities/api";
import NumericInput from "@/shared/utils/numericInput";
import RepairTransferModal from "@/shared/components/production/RepairTransferModal";
import { getPreviousFloor } from "@/shared/utils/productionUtils";
import ReceivedQuantityDisplay from "@/shared/components/production/ReceivedQuantityDisplay";
import ArticleViewTab from "./components/ArticleViewTab";
import MyTeamTab from "./components/MyTeamTab";
import { containersMasterService } from "@/shared/services/containersMasterService";

type FinalCheckingTab = "orders" | "article-view" | "my-team";

interface ArticleLog {
  id: string;
  date: string; // YYYY-MM-DD
  action: string; // e.g., "Transferred to Branding"
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
  m2Transferred?: number;
  m2Remaining?: number;
  repairReceived?: number;
  repairFromFloor?: string;
  repairStatus?: 'Not Required' | 'In Review' | 'Repaired' | 'Rejected';
  repairRemarks?: string;
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
  const [activeTab, setActiveTab] = useState<FinalCheckingTab>("article-view");
  const [showContainerScanDrawer, setShowContainerScanDrawer] = useState(false);
  const [containerScanBarcode, setContainerScanBarcode] = useState("");
  const [containerScanLoading, setContainerScanLoading] = useState(false);
  const [containerScanned, setContainerScanned] = useState<{ container: any; article: any } | null>(null);
  const [acceptArticleLoading, setAcceptArticleLoading] = useState(false);
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [selectedRepairArticle, setSelectedRepairArticle] = useState<{
    articleId: string;
    articleNumber: string;
    orderId: string;
    linkingType: 'Auto Linking' | 'Rosso Linking' | 'Hand Linking';
  } | null>(null);

  // Load final checking floor orders from API
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

      const response = await productionService.getFloorOrders('FinalChecking', apiFilters);
      
      if (response.success) {
        console.log('Final checking orders loaded:', response.data.results);
        setOrders(response.data.results);
        setTotalPages(response.data.totalPages);
        setTotalResults(response.data.totalResults);
      } else {
        console.error('Failed to load final checking orders:', response.error);
        toast.error('Failed to load final checking orders');
      }
    } catch (error: any) {
      console.error('Error loading final checking orders:', error);
      toast.error(error.message || 'Failed to load final checking orders');
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
        const receivedQuantity = article.floorQuantities?.finalChecking?.received || 0;
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
        initialData[articleId] = {
          remarks: article.remarks || '',
          m1Quantity: 0, // Always start with 0 for user input
          m2Quantity: article.floorQuantities?.finalChecking?.m2Quantity || article.m2Quantity || 0,
          m3Quantity: article.floorQuantities?.finalChecking?.m3Quantity || article.m3Quantity || 0,
          m4Quantity: article.floorQuantities?.finalChecking?.m4Quantity || article.m4Quantity || 0,
          repairStatus: (article as any).floorQuantities?.finalChecking?.repairStatus || (article as any).repairStatus || 'Not Required',
          repairRemarks: (article as any).floorQuantities?.finalChecking?.repairRemarks || (article as any).repairRemarks || ''
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

  const handleUpdateSubmit = async () => {
    if (!selectedOrder) return;

    // Validate M1 quantities before submission
    const invalidArticles = selectedOrder.articles.filter(article => {
      const articleId = article.id || article._id;
      if (!articleId) return false;
      const update = updateData[articleId];
      if (!update) return false;
      const received = article.floorQuantities?.finalChecking?.received || 0;
      const transferred = article.floorQuantities?.finalChecking?.transferred || 0;
      const remaining = received - transferred; // Use transferred instead of current M1
      return update.m1Quantity > remaining;
    });

    if (invalidArticles.length > 0) {
      toast.error('M1 quantity cannot exceed received quantity for some articles');
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
                  floor: "Final Checking"
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
              'FinalChecking',
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

  const findArticleInOrders = useCallback((articleId: string): Article | null => {
    for (const order of orders) {
      const art = order.articles.find((a) => (a._id || a.id) === articleId);
      if (art) return art;
    }
    return null;
  }, [orders]);

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
      const articleId = container.activeArticle?.trim();
      const article = articleId ? findArticleInOrders(articleId) ?? null : null;
      setContainerScanned({ container, article });
      if (!article && articleId) toast.error("Article not found in current orders.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("404")) toast.error("Container not found for this barcode.");
      else toast.error(msg);
    } finally {
      setContainerScanLoading(false);
    }
  };

  const handleAcceptArticleQuantity = async () => {
    if (!containerScanned?.article) return;
    const articleId = containerScanned.article._id || containerScanned.article.id;
    if (!articleId) return;
    setAcceptArticleLoading(true);
    try {
      const res = await productionService.updateArticleFloorReceivedData(articleId, {
        floor: "Final Checking",
        receivedData: {
          receivedStatusFromPreviousFloor: "Completed",
          receivedInContainerId: containerScanned.container._id ?? null,
          receivedTimestamp: new Date().toISOString(),
        },
      });
      if (res.success) {
        toast.success("Article quantity accepted on Final Checking.");
        setShowContainerScanDrawer(false);
        setContainerScanned(null);
        setContainerScanBarcode("");
        loadOrders();
      } else {
        toast.error(res.error?.message ?? "Failed to accept article quantity");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept");
    } finally {
      setAcceptArticleLoading(false);
    }
  };

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
      <Seo title="Final Checking Supervisor Dashboard" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-teal-600 rounded-full" />
              <h1 className="text-sm font-bold text-gray-800">Final Checking Floor Supervisor</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {totalResults}
              </span>
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
                        <li><strong>Orders:</strong> View and filter orders at Final Checking</li>
                        <li><strong>Article view:</strong> See articles by received quantity</li>
                        <li><strong>My Team:</strong> View team members and active articles</li>
                        <li><strong>Update:</strong> Modify M1–M4, repair sub-step, confirm final quality, forward to Branding</li>
                        <li><strong>Filter & Search:</strong> Use filters and search to find orders</li>
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
                <i className={`ri-refresh-line text-xs ${isLoading ? "animate-spin" : ""}`}></i> Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <div className="bg-teal-50 border border-teal-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wide">In Progress</span>
              <span className="text-sm font-bold text-teal-900">{orders.filter((o) => o.status === "In Progress").length}</span>
            </div>
            <div className="bg-green-50 border border-green-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-green-700 uppercase tracking-wide">M1 Good</span>
              <span className="text-sm font-bold text-green-900">
                {orders.reduce((sum, order) => sum + order.articles.reduce((articleSum, article) => articleSum + (article.floorQuantities?.finalChecking?.m1Quantity || article.m1Quantity || 0), 0), 0)}
              </span>
            </div>
            <div className="bg-yellow-50 border border-yellow-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-yellow-700 uppercase tracking-wide">M2 Repair</span>
              <span className="text-sm font-bold text-yellow-900">
                {orders.reduce((sum, order) => sum + order.articles.reduce((articleSum, article) => articleSum + (article.floorQuantities?.finalChecking?.m2Quantity || article.m2Quantity || 0), 0), 0)}
              </span>
            </div>
            <div className="bg-red-50 border border-red-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-red-700 uppercase tracking-wide">M3+M4</span>
              <span className="text-sm font-bold text-red-900">
                {orders.reduce((sum, order) => sum + order.articles.reduce((articleSum, article) => articleSum + (article.floorQuantities?.finalChecking?.m3Quantity || article.m3Quantity || 0) + (article.floorQuantities?.finalChecking?.m4Quantity || article.m4Quantity || 0), 0), 0)}
              </span>
            </div>
          </div>

          <div className="flex border-b border-gray-300 mb-0">
            <button
              type="button"
              className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${activeTab === "orders" ? "border-teal-600 text-teal-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              onClick={() => setActiveTab("orders")}
            >
              Orders
            </button>
            <button
              type="button"
              className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${activeTab === "article-view" ? "border-teal-600 text-teal-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              onClick={() => setActiveTab("article-view")}
            >
              Article view
            </button>
            <button
              type="button"
              className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${activeTab === "my-team" ? "border-teal-600 text-teal-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              onClick={() => setActiveTab("my-team")}
            >
              My Team
            </button>
          </div>
        </div>

        <div className="min-h-[300px]">
          {activeTab === "my-team" ? (
            <MyTeamTab />
          ) : activeTab === "article-view" ? (
            <ArticleViewTab
              orders={paginatedOrders}
              onViewOrder={handleViewOrder}
              onUpdateOrder={handleUpdateOrder}
              getStatusBadge={getStatusBadge}
              getPriorityBadge={getPriorityBadge}
              onScanContainerClick={handleScanContainerClick}
            />
          ) : (
            <>
          <div className="p-[10px] flex flex-wrap items-center gap-2 border-b border-gray-300">
            <button
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border transition-colors ${showFilters ? "bg-teal-600 text-white border-teal-600" : "bg-white border-gray-200 text-[#495057] hover:bg-gray-50"}`}
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
                className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-teal-300 w-full placeholder:text-gray-400 font-medium"
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
            <div className="p-[10px] bg-gray-50 border-b border-gray-300 flex flex-wrap gap-2">
              <select className="bg-white border border-gray-300 text-[11px] rounded px-2 py-1.5" value={filters.status} onChange={(e) => handleFilterChange("status", e.target.value)}>
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
              </select>
              <select className="bg-white border border-gray-300 text-[11px] rounded px-2 py-1.5" value={filters.priority} onChange={(e) => handleFilterChange("priority", e.target.value)}>
                <option value="">All Priorities</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <select className="bg-white border border-gray-300 text-[11px] rounded px-2 py-1.5" value={filters.linkingType} onChange={(e) => handleFilterChange("linkingType", e.target.value)}>
                <option value="">All Types</option>
                <option value="Auto Linking">Auto Linking</option>
                <option value="Rosso Linking">Rosso Linking</option>
                <option value="Hand Linking">Hand Linking</option>
              </select>
              <input type="text" className="bg-white border border-gray-300 text-[11px] rounded px-2 py-1.5 w-28" placeholder="Floor..." value={filters.floor} onChange={(e) => handleFilterChange("floor", e.target.value)} />
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-4 opacity-50"></div>
              <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-file-list-line text-xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">NO ORDERS FOUND</h3>
              <p className="text-[10px] text-gray-500">
                {hasActiveFilters ? "Try adjusting filters or search" : "No orders at Final Checking"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50/30">
                    <th className="pl-[10px] pr-1 py-2.5 w-10 border border-gray-200">
                      <input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="rounded border-gray-200 text-teal-600 focus:ring-0 h-3.5 w-3.5" />
                    </th>
                    <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Order Info</th>
                    <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Articles</th>
                    <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                    <th className="px-1.5 py-2.5 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="pl-[10px] pr-1 py-2.5 border border-gray-200">
                        <input type="checkbox" checked={selectedOrders.includes(order.id)} onChange={() => handleOrderSelect(order.id)} className="rounded border-gray-200 text-teal-600 focus:ring-0 h-3.5 w-3.5" />
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-200">
                        <div className="text-[12px] font-bold text-gray-900">{order.orderNumber || order.id}</div>
                        <div className="text-[10px] text-gray-500">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : (order.articles?.[0]?.createdAt ? new Date(order.articles[0].createdAt).toLocaleDateString() : "N/A")}</div>
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-200">
                        <div className="text-[12px] font-medium text-gray-600">{order.articles.length} Article{order.articles.length !== 1 ? "s" : ""} · Qty {order.articles.reduce((s, a) => s + (a.plannedQuantity || 0), 0).toLocaleString()}</div>
                        {order.articles.some((a) => a.floorQuantities?.finalChecking) && (
                          <div className="text-[10px] text-teal-600 mt-0.5">
                            R:{order.articles.reduce((s, a) => s + (a.floorQuantities?.finalChecking?.received || 0), 0)} Trf:{order.articles.reduce((s, a) => s + (a.floorQuantities?.finalChecking?.transferred || 0), 0)} Rem:{order.articles.reduce((s, a) => s + (a.floorQuantities?.finalChecking?.remaining ?? Math.max(0, (a.floorQuantities?.finalChecking?.received ?? 0) - (a.floorQuantities?.finalChecking?.transferred ?? 0))), 0)}
                          </div>
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
            <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200">
              <div className="text-[11px] font-medium text-[#495057]">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalResults)} of {totalResults} entries
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1} className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30">Prev</button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const pageNum = totalPages <= 7 ? i + 1 : currentPage <= 4 ? i + 1 : currentPage >= totalPages - 3 ? totalPages - 6 + i : currentPage - 3 + i;
                  return (
                    <button key={pageNum} onClick={() => handlePageChange(pageNum)} className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded ${currentPage === pageNum ? "bg-teal-600 text-white shadow-md" : "text-gray-400 hover:bg-gray-50"}`}>{pageNum}</button>
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

      {/* Scan Container drawer */}
      {showContainerScanDrawer && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => { setShowContainerScanDrawer(false); setContainerScanned(null); setContainerScanBarcode(""); }} aria-hidden />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col overflow-hidden animate-slide-in-right border-l border-gray-200">
            <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-800">Scan Container</h3>
              <button type="button" onClick={() => { setShowContainerScanDrawer(false); setContainerScanned(null); setContainerScanBarcode(""); }} className="text-gray-500 hover:text-gray-700 p-1">
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
                  <h4 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider">Article details</h4>
                  {containerScanned.article ? (
                    <>
                      <div className="p-2 bg-gray-50 rounded border border-gray-200 text-[12px] text-gray-900">
                        <div><span className="font-bold text-[#495057]">Article:</span> {containerScanned.article.articleNumber}</div>
                        <div><span className="font-bold text-[#495057]">Order:</span> {containerScanned.article.orderId ?? "—"}</div>
                        <div><span className="font-bold text-[#495057]">Planned:</span> {containerScanned.article.plannedQuantity}</div>
                        <div><span className="font-bold text-[#495057]">Final Check received:</span> {(containerScanned.article as any).floorQuantities?.finalChecking?.received ?? 0}</div>
                      </div>
                      <button
                        type="button"
                        disabled={acceptArticleLoading}
                        onClick={handleAcceptArticleQuantity}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 w-full"
                      >
                        {acceptArticleLoading ? "Accepting..." : "Accept article quantity (Final Checking)"}
                      </button>
                    </>
                  ) : (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                      Article not in current orders. Use another container or go to the order that contains this article.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Update Order – right-side drawer */}
      {showUpdateModal && selectedOrder && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeUpdateModal} aria-hidden />
          <div className="fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-xl z-50 flex flex-col overflow-hidden animate-slide-in-right border-l border-gray-200">
            <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-800">Update Order — {selectedOrder.orderNumber}</h3>
              <button onClick={closeUpdateModal} className="text-gray-500 hover:text-gray-800 p-1 rounded border border-gray-200 hover:bg-gray-100">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-[10px]">
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
                
                const currentUpdateData = updateData[articleId] || { 
                  remarks: article.remarks || '',
                  m1Quantity: 0, // Always start with 0 for user input
                  m2Quantity: article.floorQuantities?.finalChecking?.m2Quantity || article.m2Quantity || 0,
                  m3Quantity: article.floorQuantities?.finalChecking?.m3Quantity || article.m3Quantity || 0,
                  m4Quantity: article.floorQuantities?.finalChecking?.m4Quantity || article.m4Quantity || 0,
                  repairStatus: (article as any).floorQuantities?.finalChecking?.repairStatus || (article as any).repairStatus || 'Not Required',
                  repairRemarks: (article as any).floorQuantities?.finalChecking?.repairRemarks || (article as any).repairRemarks || ''
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
                        <label className="form-label">Received from Branding</label>
                        <ReceivedQuantityDisplay
                          received={article.floorQuantities?.finalChecking?.received || 0}
                          repairReceived={article.floorQuantities?.finalChecking?.repairReceived}
                          repairFromFloor={article.floorQuantities?.finalChecking?.repairFromFloor}
                          className="text-lg"
                        />
                      </div>
                      <div>
                        <label className="form-label">M1 Completed Quantity *</label>
                        {(() => {
                          const received = article.floorQuantities?.finalChecking?.received || 0;
                          const transferred = article.floorQuantities?.finalChecking?.transferred || 0;
                          const remaining = received - transferred; // Use transferred instead of current M1
                          const isFullyTransferred = remaining <= 0;
                          
                          return (
                            <>
                              <NumericInput
                                className={`${
                                  isFullyTransferred 
                                    ? 'bg-gray-100 border-gray-300 cursor-not-allowed' 
                                    : currentUpdateData.m1Quantity > received 
                                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                                      : ''
                                }`}
                                value={currentUpdateData.m1Quantity}
                                onChange={(value) => {
                                  if (isFullyTransferred) return;
                                  if (value <= received) {
                                    handleM1QuantityChange(articleId, value);
                                  }
                                }}
                                placeholder={isFullyTransferred ? 'Fully Transferred' : `Max: ${received}`}
                                disabled={isFullyTransferred}
                                allowDecimals
                              />
                              {isFullyTransferred ? (
                                <div className="text-xs text-green-600 mt-1 font-medium">
                                  ✓ All quantity has been transferred to next floor
                                </div>
                              ) : currentUpdateData.m1Quantity > received ? (
                                <div className="text-xs text-red-500 mt-1">
                                  Cannot exceed received quantity ({received})
                                </div>
                              ) : null}
                              <div className="text-xs text-green-600 mt-1">
                                Only M1 (Good Quality) passes to warehouse
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <div>
                        <label className="form-label">Transferred to Next Floor</label>
                        <div className="text-lg font-semibold text-green-600">
                          {article.floorQuantities?.finalChecking?.transferred || 0}
                        </div>
                      </div>
                      <div>
                        <label className="form-label">Remaining</label>
                        <div className="text-lg font-semibold text-orange-600">
                          {(() => {
                            const received = article.floorQuantities?.finalChecking?.received || 0;
                            const transferred = article.floorQuantities?.finalChecking?.transferred || 0;
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
                            allowDecimals
                          />
                          <small className="text-yellow-600">To be reviewed</small>
                          
                          {/* M2 Status Card */}
                          {(() => {
                            const m2Quantity = article.floorQuantities?.finalChecking?.m2Quantity || article.m2Quantity || 0;
                            const m2Transferred = article.floorQuantities?.finalChecking?.m2Transferred || 0;
                            // According to docs: m2Remaining = m2Quantity (since m2Quantity is already reduced when items are sent)
                            const m2Remaining = article.floorQuantities?.finalChecking?.m2Remaining ?? m2Quantity;
                            const previousFloor = getPreviousFloor('Final Checking', article.linkingType);
                            
                            // Show M2 status card if there are current M2 items OR if items have been sent for repair
                            if (m2Quantity > 0 || m2Transferred > 0) {
                              return (
                                <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                  <div className="text-xs font-semibold text-yellow-800 mb-2">M2 Repairable Items</div>
                                  <div className="space-y-1 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Current M2:</span>
                                      <span className="font-medium">{m2Quantity}</span>
                                      {m2Transferred > 0 && (
                                        <span className="text-gray-500 ml-2">({m2Transferred} sent for repair)</span>
                                      )}
                                    </div>
                                    {m2Transferred > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Total Sent for Repair:</span>
                                        <span className="font-medium text-yellow-700">{m2Transferred}</span>
                                      </div>
                                    )}
                                  </div>
                                  {m2Remaining > 0 && previousFloor && (
                                    <button
                                      type="button"
                                      className="ti-btn ti-btn-warning ti-btn w-full mt-2"
                                      onClick={() => {
                                        setSelectedRepairArticle({
                                          articleId: article._id || article.id,
                                          articleNumber: article.articleNumber,
                                          orderId: selectedOrder.id,
                                          linkingType: article.linkingType
                                        });
                                        setShowRepairModal(true);
                                      }}
                                    >
                                      <i className="ri-tools-line me-1"></i>
                                      Send M2 for Repair
                                    </button>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        
                        <div>
                          <label className="form-label text-orange-700 font-medium">M3 - Minor Defects</label>
                          <NumericInput
                            className="border-orange-300 focus:border-orange-500"
                            value={currentUpdateData.m3Quantity}
                            onChange={(value) => handleM3QuantityChange(articleId, value)}
                            allowDecimals
                          />
                          <small className="text-orange-600">Can be fixed</small>
                        </div>
                        
                        <div>
                          <label className="form-label text-red-700 font-medium">M4 - Major Defects</label>
                          <NumericInput
                            className="border-red-300 focus:border-red-500"
                            value={currentUpdateData.m4Quantity}
                            onChange={(value) => handleM4QuantityChange(articleId, value)}
                            allowDecimals
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
                                  allowDecimals
                                />
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-success  "
                                  onClick={() => applyShift(articleId, 'm2ToM1')}
                                  disabled={!shiftInputs[articleId]?.m2ToM1 || shiftInputs[articleId].m2ToM1 <= 0}
                                >
                                  Apply
                                </button>
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-primary  "
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
                                  allowDecimals
                                />
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-warning  "
                                  onClick={() => applyShift(articleId, 'm2ToM3')}
                                  disabled={!shiftInputs[articleId]?.m2ToM3 || shiftInputs[articleId].m2ToM3 <= 0}
                                >
                                  Apply
                                </button>
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-primary  "
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
                                  allowDecimals
                                />
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-danger  "
                                  onClick={() => applyShift(articleId, 'm2ToM4')}
                                  disabled={!shiftInputs[articleId]?.m2ToM4 || shiftInputs[articleId].m2ToM4 <= 0}
                                >
                                  Apply
                                </button>
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-primary  "
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
                                  allowDecimals
                                />
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-warning  "
                                  onClick={() => applyShift(articleId, 'm3ToM2')}
                                  disabled={!shiftInputs[articleId]?.m3ToM2 || shiftInputs[articleId].m3ToM2 <= 0}
                                >
                                  Apply
                                </button>
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-primary  "
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
                                  allowDecimals
                                />
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-danger  "
                                  onClick={() => applyShift(articleId, 'm4ToM3')}
                                  disabled={!shiftInputs[articleId]?.m4ToM3 || shiftInputs[articleId].m4ToM3 <= 0}
                                >
                                  Apply
                                </button>
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-primary  "
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


                    {/* View Logs Button and panel */}
                    {/* <div className="mt-4">
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
                              ((article as any).logs || [])
                                .slice()
                                .sort((a: any, b: any) => (a.date > b.date ? -1 : 1))
                            ).map((log: any) => (
                              <li key={log.id}>
                                {(log.fromFloor || 'Final Checking')} {log.action?.toLowerCase?.() || 'action'} {log.quantity.toLocaleString()} {log.toFloor ? `to ${log.toFloor}` : ''} on {log.date}
                                {log.remarks ? ` — ${log.remarks}` : ''}
                              </li>
                            ))}
                            {(((article as any).logs?.length || 0) === 0) && <li>No logs yet</li>}
                          </ul>
                        </div>
                      )}
                    </div> */}
                  </div>
                );
              })()}
            </div>

            </div>
            <div className="flex-shrink-0 flex justify-end gap-2 p-[10px] border-t border-gray-200">
              <button type="button" onClick={closeUpdateModal} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50">Cancel</button>
              <button
                type="button"
                onClick={handleUpdateSubmit}
                disabled={selectedOrder?.articles.some((article) => {
                  const articleId = article.id || article._id;
                  if (!articleId) return false;
                  const update = updateData[articleId];
                  if (!update) return false;
                  const received = article.floorQuantities?.finalChecking?.received || 0;
                  const transferred = article.floorQuantities?.finalChecking?.transferred || 0;
                  const remaining = received - transferred;
                  return update.m1Quantity > remaining;
                })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-[11px] font-bold rounded hover:bg-teal-700 shadow-sm disabled:opacity-50"
              >
                <i className="ri-save-line text-xs"></i> Update Order
              </button>
            </div>
          </div>
        </>
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="form-label">Planned Quantity</label>
                        <div className="text-lg font-semibold text-gray-900">{(article.plannedQuantity || 0).toLocaleString()}</div>
                      </div>
                      <div>
                        <label className="form-label">Received from Branding</label>
                        <ReceivedQuantityDisplay
                          received={article.floorQuantities?.finalChecking?.received || 0}
                          repairReceived={article.floorQuantities?.finalChecking?.repairReceived}
                          repairFromFloor={article.floorQuantities?.finalChecking?.repairFromFloor}
                          className="text-lg"
                        />
                      </div>
                      <div>
                        <label className="form-label">Final Checking Completed Quantity (M1 - Good Quality)</label>
                        <div className="text-lg font-semibold text-green-600">
                          {article.floorQuantities?.finalChecking?.m1Quantity || article.m1Quantity || 0}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Only M1 items pass to warehouse
                        </div>
                      </div>
                    </div>

                    {/* Quality Check Results */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className="form-label">M1 (Good Quality)</label>
                        <div className="text-lg font-semibold text-green-600">{article.floorQuantities?.finalChecking?.m1Quantity || article.m1Quantity || 0}</div>
                      </div>
                      <div>
                        <label className="form-label">M2 (Needs Repair)</label>
                        <div className="text-lg font-semibold text-yellow-600">{article.floorQuantities?.finalChecking?.m2Quantity || article.m2Quantity || 0}</div>
                      </div>
                      <div>
                        <label className="form-label">M3 (Minor Defects)</label>
                        <div className="text-lg font-semibold text-orange-600">{article.floorQuantities?.finalChecking?.m3Quantity || article.m3Quantity || 0}</div>
                      </div>
                      <div>
                        <label className="form-label">M4 (Major Defects)</label>
                        <div className="text-lg font-semibold text-red-600">{article.floorQuantities?.finalChecking?.m4Quantity || article.m4Quantity || 0}</div>
                      </div>
                    </div>

                    {article.finalQualityConfirmed && (
                      <div className="mb-4">
                        <label className="form-label">Final Quality Status</label>
                        <div className="p-3 bg-green-50 rounded-md text-sm text-green-700">
                          ✓ Quality Confirmed
                        </div>
                      </div>
                    )}

                    {((article as any).floorQuantities?.finalChecking?.repairStatus || (article as any).repairStatus) && ((article as any).floorQuantities?.finalChecking?.repairStatus || (article as any).repairStatus) !== 'Not Required' && (
                      <div className="mb-4">
                        <label className="form-label">Repair Status</label>
                        <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                          {(article as any).floorQuantities?.finalChecking?.repairStatus || (article as any).repairStatus}
                        </div>
                      </div>
                    )}

                    {((article as any).floorQuantities?.finalChecking?.repairRemarks || (article as any).repairRemarks) && (
                      <div className="mb-4">
                        <label className="form-label">Repair Remarks</label>
                        <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                          {(article as any).floorQuantities?.finalChecking?.repairRemarks || (article as any).repairRemarks}
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

                    {article.floorQuantities?.knitting?.m4Quantity && article.floorQuantities.knitting.m4Quantity > 0 && (
                      <div className="text-xs text-red-600 mt-1">
                        M4 Quantity In Knitting: {article.floorQuantities.knitting.m4Quantity}
                      </div>
                    )}

                    <div className="flex justify-between items-center text-sm text-gray-600">
                      <div>
                        Remaining: {(article.floorQuantities?.finalChecking?.remaining || 0).toLocaleString()}
                      </div>
                      <div>
                        Progress: {Math.round(((article.floorQuantities?.finalChecking?.m1Quantity || article.m1Quantity || 0) / (article.floorQuantities?.finalChecking?.received || 1)) * 100)}%
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
                          const receivedQty = article.floorQuantities?.finalChecking?.received || 0;
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

      {/* Repair Transfer Modal */}
      {showRepairModal && selectedRepairArticle && (
        <RepairTransferModal
          isOpen={showRepairModal}
          onClose={() => {
            setShowRepairModal(false);
            setSelectedRepairArticle(null);
          }}
          articleId={selectedRepairArticle.articleId}
          articleNumber={selectedRepairArticle.articleNumber}
          orderId={selectedRepairArticle.orderId}
          floor="FinalChecking"
          m2Remaining={(() => {
            const article = selectedOrder?.articles.find(a => (a._id || a.id) === selectedRepairArticle.articleId);
            if (!article) return 0;
            const m2Quantity = article.floorQuantities?.finalChecking?.m2Quantity || article.m2Quantity || 0;
            // According to docs: m2Remaining = m2Quantity (since m2Quantity is already reduced when items are sent)
            return article.floorQuantities?.finalChecking?.m2Remaining ?? m2Quantity;
          })()}
          previousFloor={(() => {
            const article = selectedOrder?.articles.find(a => (a._id || a.id) === selectedRepairArticle.articleId);
            if (!article) return 'Branding';
            const prevFloor = getPreviousFloor('Final Checking', article.linkingType);
            // Convert to API format (no spaces)
            if (prevFloor === 'Final Checking') return 'FinalChecking';
            return prevFloor || 'Branding';
          })()}
          onSuccess={() => {
            loadOrders();
          }}
        />
      )}
    </div>
  );
};

export default FinalCheckingFloorSupervisorPage;
