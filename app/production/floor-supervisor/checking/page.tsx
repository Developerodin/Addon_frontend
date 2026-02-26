"use client";
import React, { useState, useEffect, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import FloorProgression from "@/shared/components/production/FloorProgression";
import { productionService, ProductionOrder, FloorOrderFilters, type Article } from "@/shared/services/productionService";
import { API_BASE_URL } from "@/shared/data/utilities/api";
import NumericInput from "@/shared/utils/numericInput";
import RepairTransferModal from "@/shared/components/production/RepairTransferModal";
import { getPreviousFloor } from "@/shared/utils/productionUtils";
import ReceivedQuantityDisplay from "@/shared/components/production/ReceivedQuantityDisplay";
import ArticleViewTab from "./components/ArticleViewTab";
import MyTeamTab from "./components/MyTeamTab";
import { containersMasterService, type ContainerMaster } from "@/shared/services/containersMasterService";
import { teamMasterService, type TeamMaster, PRODUCTION_FLOORS } from "@/shared/services/teamMasterService";

type CheckingTab = "orders" | "article-view" | "my-team";

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
  m2Transferred?: number;
  m2Remaining?: number;
  repairReceived?: number;
  repairFromFloor?: string;
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
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [selectedRepairArticle, setSelectedRepairArticle] = useState<{
    articleId: string;
    articleNumber: string;
    orderId: string;
    linkingType: 'Auto Linking' | 'Rosso Linking' | 'Hand Linking';
  } | null>(null);

  // Tabs: Orders | Article view | My Team (like linking)
  const [activeTab, setActiveTab] = useState<CheckingTab>("article-view");
  // Scan container flow (Article view): barcode -> get container -> Accept Article Quantity for Checking
  const [showContainerScanDrawer, setShowContainerScanDrawer] = useState(false);
  const [containerScanBarcode, setContainerScanBarcode] = useState("");
  const [containerScanLoading, setContainerScanLoading] = useState(false);
  const [containerScanned, setContainerScanned] = useState<{ container: ContainerMaster; article: Article | null } | null>(null);
  const [acceptArticleLoading, setAcceptArticleLoading] = useState(false);
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  // Assign drawer
  const [showAssignDrawer, setShowAssignDrawer] = useState(false);
  const [assignTeamMembers, setAssignTeamMembers] = useState<TeamMaster[]>([]);
  const [assignTeamLoading, setAssignTeamLoading] = useState(false);
  const [confirmAssignModal, setConfirmAssignModal] = useState<{ teamMemberName: string; teamMemberId: string; articleId: string } | null>(null);
  const [assigningInProgress, setAssigningInProgress] = useState(false);
  const [removingArticleMemberId, setRemovingArticleMemberId] = useState<string | null>(null);
  // Update order: scan container/bag before submit (like linking)
  const [showUpdateContainerModal, setShowUpdateContainerModal] = useState(false);
  const [updateContainerBarcode, setUpdateContainerBarcode] = useState("");
  const [updateContainerCheckStatus, setUpdateContainerCheckStatus] = useState<"idle" | "loading" | "not-found" | "already-filled" | "ok">("idle");
  const [updateContainerFetched, setUpdateContainerFetched] = useState<{ activeArticle?: string; activeFloor?: string } | null>(null);
  const [updateContainerArticleId, setUpdateContainerArticleId] = useState("");
  const [updateContainerNextFloor, setUpdateContainerNextFloor] = useState("Washing");
  const [updateContainerSubmitting, setUpdateContainerSubmitting] = useState(false);

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

  // Update container modal: debounced barcode check
  useEffect(() => {
    if (!showUpdateContainerModal) {
      setUpdateContainerCheckStatus("idle");
      setUpdateContainerFetched(null);
      return;
    }
    const barcode = updateContainerBarcode.trim();
    if (!barcode) {
      setUpdateContainerCheckStatus("idle");
      setUpdateContainerFetched(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      setUpdateContainerCheckStatus("loading");
      setUpdateContainerFetched(null);
      containersMasterService
        .getByBarcode(barcode)
        .then((container) => {
          if (cancelled) return;
          const hasActive = !!(container.activeArticle?.trim() || container.activeFloor?.trim());
          if (hasActive) {
            setUpdateContainerCheckStatus("already-filled");
            setUpdateContainerFetched({ activeArticle: container.activeArticle, activeFloor: container.activeFloor });
          } else {
            setUpdateContainerCheckStatus("ok");
            setUpdateContainerFetched(null);
          }
        })
        .catch((err) => {
          if (cancelled) return;
          const msg = err instanceof Error ? err.message : String(err);
          setUpdateContainerCheckStatus(msg.includes("404") ? "not-found" : "idle");
          setUpdateContainerFetched(null);
          if (!msg.includes("404")) toast.error(msg);
        });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [showUpdateContainerModal, updateContainerBarcode]);

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
    setShowUpdateContainerModal(false);
    setUpdateContainerBarcode("");
    setUpdateContainerCheckStatus("idle");
    setUpdateContainerFetched(null);
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

  const findArticleInOrders = useCallback((articleId: string): Article | null => {
    for (const order of paginatedOrders) {
      const a = order.articles.find((ar) => (ar._id || ar.id) === articleId);
      if (a) return a as Article;
    }
    return null;
  }, [paginatedOrders]);

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
        floor: "Checking",
        receivedData: {
          receivedStatusFromPreviousFloor: "Completed",
          receivedInContainerId: containerScanned.container._id ?? null,
          receivedTimestamp: new Date().toISOString(),
        },
      });
      if (res.success) {
        const barcode = containerScanned.container.barcode;
        try {
          await containersMasterService.clearActiveByBarcode(barcode);
        } catch {
          // Accept succeeded; clear-active is best-effort
        }
        toast.success("Article quantity accepted.");
        setActiveArticleId(String(articleId));
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

  const handleOpenAssignDrawer = useCallback(async () => {
    setShowAssignDrawer(true);
    setAssignTeamLoading(true);
    try {
      const data = await teamMasterService.list({ workingFloor: "Checking", limit: 200 });
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
    setConfirmAssignModal({ teamMemberName: member.teamMemberName, teamMemberId: member._id, articleId: activeArticleId });
  };

  const handleConfirmAssign = async () => {
    if (!confirmAssignModal?.articleId) return;
    setAssigningInProgress(true);
    try {
      await teamMasterService.addActiveArticle(confirmAssignModal.teamMemberId, confirmAssignModal.articleId);
      toast.success(`Article assigned to ${confirmAssignModal.teamMemberName}`);
      setConfirmAssignModal(null);
      setAssignTeamMembers((prev) =>
        prev.map((m) =>
          m._id === confirmAssignModal.teamMemberId
            ? { ...m, articleData: [...(m.articleData || []), { activeArticle: confirmAssignModal.articleId }] }
            : m
        )
      );
      const data = await teamMasterService.list({ workingFloor: "Checking", limit: 200 });
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
      const data = await teamMasterService.list({ workingFloor: "Checking", limit: 200 });
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
      <Seo title="Checking Floor Supervisor Dashboard"/>

      <div className="bg-white shadow-sm border border-gray-300 overflow-hidden mx-0">
        <div className="p-[10px]">
          {/* Page Header - design spec like linking */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-blue-600 rounded-full" />
              <h1 className="text-sm font-bold text-gray-800">Checking Floor Supervisor</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {totalResults}
              </span>
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
                        <li><strong>Article view:</strong> Scan container, accept article, assign to team member</li>
                        <li><strong>My Team:</strong> View active articles and mark article complete</li>
                        <li><strong>Update Progress:</strong> Scan container then update M1-M4 and transfer to next floor</li>
                        <li><strong>Filter & Search:</strong> Use filters and search to find specific orders</li>
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

          {/* Small stat cards - design spec */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <div className="bg-blue-50 border border-blue-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">In Progress</span>
              <span className="text-sm font-bold text-blue-900">{orders.filter(o => o.status === 'In Progress').length}</span>
            </div>
            <div className="bg-green-50 border border-green-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-green-700 uppercase tracking-wide">M1 Good</span>
              <span className="text-sm font-bold text-green-900">
                {orders.reduce((sum, order) => sum + order.articles.reduce((articleSum, article) => {
                  const cf = getCheckingFloorData(article);
                  return articleSum + (cf.data?.m1Quantity ?? (article as any).m1Quantity ?? 0);
                }, 0), 0)}
              </span>
            </div>
            <div className="bg-yellow-50 border border-yellow-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-yellow-700 uppercase tracking-wide">M2 Repair</span>
              <span className="text-sm font-bold text-yellow-900">
                {orders.reduce((sum, order) => sum + order.articles.reduce((articleSum, article) => {
                  const cf = getCheckingFloorData(article);
                  return articleSum + (cf.data?.m2Quantity ?? (article as any).m2Quantity ?? 0);
                }, 0), 0)}
              </span>
            </div>
            <div className="bg-red-50 border border-red-100 rounded p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-red-700 uppercase tracking-wide">M3+M4</span>
              <span className="text-sm font-bold text-red-900">
                {orders.reduce((sum, order) => sum + order.articles.reduce((articleSum, article) => {
                  const cf = getCheckingFloorData(article);
                  return articleSum + (cf.data?.m3Quantity ?? (article as any).m3Quantity ?? 0) + (cf.data?.m4Quantity ?? (article as any).m4Quantity ?? 0);
                }, 0), 0)}
              </span>
            </div>
          </div>

          {/* Tabs: Orders | Article view | My Team */}
          <div className="flex border-b border-gray-300 mb-0">
            <button
              type="button"
              className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${activeTab === "orders" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              onClick={() => setActiveTab("orders")}
            >
              Orders
            </button>
            <button
              type="button"
              className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${activeTab === "article-view" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              onClick={() => setActiveTab("article-view")}
            >
              Article view
            </button>
            <button
              type="button"
              className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${activeTab === "my-team" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              onClick={() => setActiveTab("my-team")}
            >
              My Team
            </button>
          </div>
        </div>

        {/* Content */}
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
              activeArticleId={activeArticleId}
              onAssignClick={handleOpenAssignDrawer}
              onScanContainerClick={handleScanContainerClick}
            />
          ) : (
            <>
          <div className="p-[10px] flex flex-wrap items-center gap-2 border-b border-gray-300">
            <button
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border transition-colors ${showFilters ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 text-[#495057] hover:bg-gray-50'}`}
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
                className="bg-white border border-gray-300 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-1 focus:ring-blue-300 focus:border-blue-500 w-full placeholder:text-gray-400 font-medium"
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4 opacity-50"></div>
              <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-file-list-line text-xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">NO ORDERS FOUND</h3>
              <p className="text-[10px] text-gray-500">
                {hasActiveFilters ? 'Try adjusting filters or search' : 'No orders on Checking floor'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50/30">
                    <th className="pl-[10px] pr-1 py-2.5 w-10 border border-gray-300">
                      <input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="rounded border-gray-300 text-blue-600 focus:ring-0 h-3.5 w-3.5" />
                    </th>
                    <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Order Info</th>
                    <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Articles</th>
                    <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Status</th>
                    <th className="px-1.5 py-2.5 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="pl-[10px] pr-1 py-2.5 border border-gray-300">
                        <input type="checkbox" checked={selectedOrders.includes(order.id)} onChange={() => handleOrderSelect(order.id)} className="rounded border-gray-300 text-blue-600 focus:ring-0 h-3.5 w-3.5" />
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-300">
                        <div className="text-[12px] font-bold text-gray-900">{order.orderNumber || order.id}</div>
                        {order.orderNote && <span className="text-[10px] text-gray-500">({order.orderNote})</span>}
                        <div className="text-[10px] text-gray-500">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : (order.articles?.[0]?.createdAt ? new Date(order.articles[0].createdAt).toLocaleDateString() : 'N/A')}</div>
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-300">
                        <div className="text-[12px] font-medium text-gray-600">{order.articles.length} Article{order.articles.length !== 1 ? 's' : ''} · Qty {order.articles.reduce((s, a) => s + (a.plannedQuantity || 0), 0).toLocaleString()}</div>
                        {order.articles.some(a => (a as any).floorQuantities?.checking) && (
                          <div className="text-[10px] text-blue-600 mt-0.5">
                            R:{order.articles.reduce((s, a) => s + ((a as any).floorQuantities?.checking?.received || 0), 0)} Trf:{order.articles.reduce((s, a) => s + ((a as any).floorQuantities?.checking?.transferred || 0), 0)} Rem:{order.articles.reduce((s, a) => s + ((a as any).floorQuantities?.checking?.remaining ?? 0), 0)}
                          </div>
                        )}
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-300">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${getStatusBadge(order.status)}`}>{order.status}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ml-1 ${getPriorityBadge(order.priority)}`}>{order.priority}</span>
                      </td>
                      <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-300">
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
            <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-300">
              <div className="text-[11px] font-medium text-[#495057]">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalResults)} of {totalResults} entries
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1} className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30">Prev</button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const pageNum = totalPages <= 7 ? i + 1 : currentPage <= 4 ? i + 1 : currentPage >= totalPages - 3 ? totalPages - 6 + i : currentPage - 3 + i;
                  return (
                    <button key={pageNum} onClick={() => handlePageChange(pageNum)} className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded ${currentPage === pageNum ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>{pageNum}</button>
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
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col overflow-hidden animate-slide-in-right">
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
                    className="w-full border border-gray-200 rounded pl-3 pr-3 py-1.5 text-[11px] font-medium focus:ring-0 focus:border-blue-300 placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    disabled={!containerScanBarcode.trim() || containerScanLoading}
                    onClick={handleGetContainerByBarcode}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-blue-600 text-white hover:bg-blue-700 shadow-sm w-full"
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
                        <div><span className="font-bold text-[#495057]">Checking received:</span> {(containerScanned.article as any).floorQuantities?.checking?.received ?? 0}</div>
                      </div>
                      <button
                        type="button"
                        disabled={acceptArticleLoading}
                        onClick={handleAcceptArticleQuantity}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 w-full"
                      >
                        {acceptArticleLoading ? "Accepting..." : "Accept Article Quantity"}
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

      {/* Assign drawer */}
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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4 opacity-50" />
                  <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading</p>
                </div>
              ) : assignTeamMembers.length === 0 ? (
                <p className="text-[11px] text-[#495057]">No team members on Checking floor.</p>
              ) : (
                <ul className="space-y-2">
                  {assignTeamMembers.map((member) => {
                    const hasActiveArticle = Boolean(activeArticleId && member.articleData?.some((d) => d.activeArticle === activeArticleId));
                    return (
                      <li key={member._id} className="flex items-center justify-between gap-2 p-2 border border-gray-200 rounded hover:bg-gray-50">
                        <div>
                          <span className="text-[12px] font-medium text-gray-900">{member.teamMemberName}</span>
                          <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold ${member.role === "Supervisor" ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-gray-50 text-gray-600 border border-gray-200"}`}>{member.role}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {hasActiveArticle ? (
                            <button type="button" onClick={() => handleArticleReceived(member)} disabled={removingArticleMemberId === member._id} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm disabled:opacity-50">
                              {removingArticleMemberId === member._id ? "..." : "Article received"}
                            </button>
                          ) : (
                            <button type="button" onClick={() => handleAssignToMember(member)} disabled={!activeArticleId} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-blue-600 text-white hover:bg-blue-700 shadow-sm disabled:opacity-50">Assign</button>
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

      {/* Confirm assign modal */}
      {confirmAssignModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={() => setConfirmAssignModal(null)}>
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-[10px] border-b border-gray-200">
              <h4 className="text-sm font-bold text-gray-800">Confirm assign</h4>
            </div>
            <p className="p-[10px] text-[11px] text-[#495057]">
              Assigning this article to <strong>{confirmAssignModal.teamMemberName}</strong>?
            </p>
            <div className="flex justify-end gap-2 p-[10px] border-t border-gray-200">
              <button type="button" onClick={() => setConfirmAssignModal(null)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 shadow-sm">Cancel</button>
              <button type="button" onClick={handleConfirmAssign} disabled={assigningInProgress} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[11px] font-bold rounded hover:bg-blue-700 shadow-sm">
                {assigningInProgress ? "Assigning..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scan container/bag before update order – modal */}
      {showUpdateContainerModal && selectedOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={() => { setShowUpdateContainerModal(false); setUpdateContainerCheckStatus("idle"); setUpdateContainerFetched(null); }} aria-hidden>
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-sm p-[10px] flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-2">Scan bag / container</h4>
            <p className="text-[11px] text-[#495057]">Scan or enter the container/bag code in which you put the checking articles for transfer to next floor.</p>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Container barcode</label>
              <input type="text" placeholder="Scan or enter barcode" value={updateContainerBarcode} onChange={(e) => setUpdateContainerBarcode(e.target.value)} className="w-full border border-gray-200 rounded px-3 py-1.5 text-[11px] focus:ring-0 focus:border-blue-300" />
              {updateContainerCheckStatus === "loading" && <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1"><span className="animate-spin rounded-full h-3 w-3 border-2 border-gray-400 border-t-transparent" /> Checking...</p>}
              {updateContainerCheckStatus === "not-found" && <p className="text-[11px] text-red-600 mt-1">Container not found.</p>}
              {updateContainerCheckStatus === "already-filled" && <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mt-1">Container already filled. Use another.</p>}
              {updateContainerCheckStatus === "ok" && <p className="text-[11px] text-green-600 mt-1">Container available.</p>}
            </div>
            <div className={updateContainerCheckStatus !== "ok" ? "opacity-60 pointer-events-none" : ""}>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Article in container</label>
              <select value={updateContainerArticleId} onChange={(e) => setUpdateContainerArticleId(e.target.value)} className="w-full border border-gray-200 rounded px-3 py-1.5 text-[11px]">
                <option value="">Select article</option>
                {selectedOrder.articles.map((a) => { const id = a._id || a.id; if (!id) return null; return <option key={id} value={id}>{a.articleNumber || id}</option>; })}
              </select>
            </div>
            <div className={updateContainerCheckStatus !== "ok" ? "opacity-60 pointer-events-none" : ""}>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Next floor</label>
              <select value={updateContainerNextFloor} onChange={(e) => setUpdateContainerNextFloor(e.target.value)} className="w-full border border-gray-200 rounded px-3 py-1.5 text-[11px]">
                {PRODUCTION_FLOORS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => { setShowUpdateContainerModal(false); setUpdateContainerCheckStatus("idle"); setUpdateContainerFetched(null); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50">Cancel</button>
              <button
                type="button"
                disabled={updateContainerCheckStatus !== "ok" || !updateContainerBarcode.trim() || !updateContainerArticleId || !updateContainerNextFloor.trim() || updateContainerSubmitting}
                onClick={async () => {
                  const barcode = updateContainerBarcode.trim();
                  const articleId = updateContainerArticleId;
                  const floor = updateContainerNextFloor.trim();
                  if (!barcode || !articleId || !floor) return;
                  setUpdateContainerSubmitting(true);
                  try {
                    await containersMasterService.updateByBarcode(barcode, { activeArticle: articleId, activeFloor: floor });
                    toast.success("Container updated");
                    setShowUpdateContainerModal(false);
                    setUpdateContainerBarcode("");
                    setUpdateContainerArticleId("");
                    setUpdateContainerNextFloor("Washing");
                    setUpdateContainerCheckStatus("idle");
                    setUpdateContainerFetched(null);
                    setUpdateContainerSubmitting(false);
                    handleUpdateSubmit();
                  } catch (err) {
                    setUpdateContainerSubmitting(false);
                    const msg = err instanceof Error ? err.message : String(err);
                    if (msg.includes("404")) toast.error("Container not found");
                    else toast.error(msg);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[11px] font-bold rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {updateContainerSubmitting ? <span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" /> : <i className="ri-save-line text-xs" />}
                Update & submit order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Order – drawer, clear sections & user guidance */}
      {showUpdateModal && selectedOrder && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeUpdateModal} aria-hidden />
          <div className="fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-xl z-50 flex flex-col overflow-hidden animate-slide-in-right border-l-2 border-gray-300">
            <div className="flex items-center justify-between px-3 py-2 border-b-2 border-gray-300 bg-gray-50 flex-shrink-0">
              <h3 className="text-sm font-bold text-gray-800">Update Order — {selectedOrder.orderNumber}</h3>
              <button onClick={closeUpdateModal} className="text-gray-500 hover:text-gray-800 p-1 rounded border-2 border-gray-300 hover:bg-gray-100">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
            {/* Short intro so user knows what to do */}
            <div className="mb-4 px-3 py-2 rounded-md bg-blue-50 border-2 border-blue-200 text-[11px] text-blue-900">
              <strong>How to update:</strong> Select an article below, then (1) enter how many good pieces go to next floor (M1), (2) enter how many you checked in each quality category (M1–M4), (3) optionally move pieces between categories, then click Update Order.
            </div>
            <section className="mb-4 rounded-md border-2 border-gray-300 bg-gray-50 overflow-hidden">
              <div className="px-3 py-1.5 bg-gray-200 border-b-2 border-gray-300 text-[11px] font-bold text-gray-800 uppercase">1. Order info</div>
              <div className="grid grid-cols-2 gap-3 p-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Priority</label>
                  <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium border-2 border-gray-300 ${getPriorityBadge(selectedOrder.priority)}`}>{selectedOrder.priority}</span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Status</label>
                  <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium border-2 border-gray-300 ${getStatusBadge(selectedOrder.status)}`}>{selectedOrder.status}</span>
                </div>
              </div>
            </section>
            <section className="mb-4 rounded-md border-2 border-gray-300 overflow-hidden">
              <div className="px-3 py-1.5 bg-gray-200 border-b-2 border-gray-300 text-[11px] font-bold text-gray-800 uppercase">2. Choose article to update</div>
              <div className="p-2 flex gap-1.5 flex-wrap">
                {selectedOrder.articles.map((article, idx) => (
                  <button
                    key={article.id}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded border-2 ${
                      idx === activeUpdateTabIndex ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                    }`}
                    onClick={() => { setActiveUpdateTabIndex(idx); setShowLogs(false); }}
                    title={article.articleNumber}
                  >
                    {article.articleNumber || `Art ${idx + 1}`}
                  </button>
                ))}
              </div>
            </section>
              {(() => {
                const article = selectedOrder.articles[activeUpdateTabIndex];
                if (!article) return null;
                const articleId = article.id || article._id;
                if (!articleId) return null;
                const checkingFloor = getCheckingFloorData(article);
                const currentUpdateData = updateData[articleId] || { 
                  remarks: article.remarks || '',
                  m1Quantity: 0,
                  m2Quantity: checkingFloor.data?.m2Quantity ?? article.m2Quantity ?? 0,
                  m3Quantity: checkingFloor.data?.m3Quantity ?? article.m3Quantity ?? 0,
                  m4Quantity: checkingFloor.data?.m4Quantity ?? article.m4Quantity ?? 0,
                  repairStatus: checkingFloor.data?.repairStatus || article.repairStatus || 'Not Required',
                  repairRemarks: checkingFloor.data?.repairRemarks || article.repairRemarks || ''
                };
                return (
                  <>
            <section className="mb-4 rounded-md border-2 border-gray-300 overflow-hidden">
              <div className="px-3 py-1.5 bg-gray-200 border-b-2 border-gray-300 text-[11px] font-bold text-gray-800 uppercase">3. Current quantities for this article</div>
              <p className="px-3 py-1 text-[10px] text-gray-500 bg-gray-50 border-b border-gray-200"><span className="font-semibold text-gray-700">Article: {article.articleNumber}</span> — Planned = order qty · Received = on checking · Transferred = already sent to next floor · Remaining = still to transfer.</p>
              <div className="p-2">
                <table className="w-full border-collapse text-[11px] border-2 border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border-2 border-gray-300 px-2 py-1 text-left font-bold text-gray-700">Planned</th>
                      <th className="border-2 border-gray-300 px-2 py-1 text-left font-bold text-gray-700">Received</th>
                      <th className="border-2 border-gray-300 px-2 py-1 text-left font-bold text-gray-700">Transferred</th>
                      <th className="border-2 border-gray-300 px-2 py-1 text-left font-bold text-gray-700">Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border-2 border-gray-300 px-2 py-1">{(article.plannedQuantity || 0).toLocaleString()}</td>
                      <td className="border-2 border-gray-300 px-2 py-1"><ReceivedQuantityDisplay received={checkingFloor.data?.received || 0} repairReceived={checkingFloor.data?.repairReceived} repairFromFloor={checkingFloor.data?.repairFromFloor} className="text-[11px]" /></td>
                      <td className="border-2 border-gray-300 px-2 py-1 text-green-700 font-medium">{checkingFloor.data?.transferred || 0}</td>
                      <td className="border-2 border-gray-300 px-2 py-1 text-orange-700 font-medium">{(checkingFloor.data?.received || 0) - (checkingFloor.data?.transferred || 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
            {/* 4. M1 — quantity to send to next floor */}
            <section className="mb-4 rounded-md border-2 border-green-300 overflow-hidden">
              <div className="px-3 py-1.5 bg-green-100 border-b-2 border-green-300 text-[11px] font-bold text-green-900">4. Good quality (M1) — how many to send to next floor?</div>
              <p className="px-3 py-1 text-[10px] text-gray-600 bg-green-50/50 border-b border-green-200">Only good-quality pieces (M1) go to the next floor. Enter the quantity you are transferring now. Cannot exceed Remaining above.</p>
              <div className="p-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-green-800 block mb-0.5">Quantity to transfer</label>
                        {(() => {
                          const received = checkingFloor.data?.received || 0;
                          const transferred = checkingFloor.data?.transferred || 0;
                          const remaining = received - transferred;
                          const isFullyTransferred = remaining <= 0;
                          return (
                            <>
                              <span className="text-[10px] text-gray-500 block mb-0.5">(Max: {remaining})</span>
                              <NumericInput
                                className={`py-1.5 px-2 text-[12px] w-24 border-2 rounded ${isFullyTransferred ? 'bg-gray-100 border-gray-300 cursor-not-allowed' : currentUpdateData.m1Quantity > remaining ? 'border-red-500' : 'border-gray-300'}`}
                                value={currentUpdateData.m1Quantity}
                                onChange={(value) => { if (!isFullyTransferred && value <= remaining) handleM1QuantityChange(articleId, value); }}
                                placeholder={isFullyTransferred ? 'Done' : `Max ${remaining}`}
                                disabled={isFullyTransferred}
                                allowDecimals
                              />
                              {isFullyTransferred ? <div className="text-[10px] text-green-600 mt-0.5 font-medium">✓ All transferred</div> : currentUpdateData.m1Quantity > remaining ? <div className="text-[10px] text-red-600 font-medium">Max {remaining}</div> : null}
                            </>
                          );
                        })()}
                      </div>
                    </div>
              </div>
            </section>
            <section className="mb-4 rounded-md border-2 border-gray-400 overflow-hidden">
              <div className="px-3 py-1.5 bg-gray-300 border-b-2 border-gray-400 text-[11px] font-bold text-gray-900">5. Quality categories — how many in each?</div>
              <p className="px-3 py-1.5 text-[10px] text-gray-600 bg-gray-50 border-b-2 border-gray-300">After checking, enter how many pieces fall in each category. M1 = Good (goes to next floor) · M2 = Needs repair · M3 = Minor defects · M4 = Major defects.</p>
              <div className="p-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="border-2 border-green-300 rounded p-2 bg-green-50/50">
                          <label className="block text-[10px] font-bold text-green-800 mb-0.5">M1 Good</label>
                          <p className="text-[9px] text-green-700 mb-1">Passes to next floor</p>
                          <NumericInput className="py-1.5 px-2 text-[12px] w-full border-2 border-green-200 rounded" value={currentUpdateData.m1Quantity} onChange={(v) => handleM1QuantityChange(articleId, v)} allowDecimals />
                        </div>
                        <div className="border-2 border-yellow-400 rounded p-2 bg-yellow-50/50">
                          <label className="block text-[10px] font-bold text-yellow-800 mb-0.5">M2 Repair</label>
                          <p className="text-[9px] text-yellow-800 mb-1">Needs repair</p>
                          <NumericInput className="py-1.5 px-2 text-[12px] w-full border-2 border-yellow-300 rounded" value={currentUpdateData.m2Quantity} onChange={(value) => handleM2QuantityChange(articleId, value)} allowDecimals />
                        </div>
                        <div className="border-2 border-orange-300 rounded p-2 bg-orange-50/50">
                          <label className="block text-[10px] font-bold text-orange-800 mb-0.5">M3 Minor</label>
                          <p className="text-[9px] text-orange-800 mb-1">Minor defects</p>
                          <NumericInput className="py-1.5 px-2 text-[12px] w-full border-2 border-orange-200 rounded" value={currentUpdateData.m3Quantity} onChange={(value) => handleM3QuantityChange(articleId, value)} allowDecimals />
                        </div>
                        <div className="border-2 border-red-300 rounded p-2 bg-red-50/50">
                          <label className="block text-[10px] font-bold text-red-800 mb-0.5">M4 Major</label>
                          <p className="text-[9px] text-red-800 mb-1">Major defects</p>
                          <NumericInput className="py-1.5 px-2 text-[12px] w-full border-2 border-red-200 rounded" value={currentUpdateData.m4Quantity} onChange={(value) => handleM4QuantityChange(articleId, value)} allowDecimals />
                        </div>
                      </div>
            </section>
                          {/* M2 Repairable */}
                          {(() => {
                            const m2Quantity = checkingFloor.data?.m2Quantity || article.m2Quantity || 0;
                            const m2Transferred = checkingFloor.data?.m2Transferred || 0;
                            const m2Remaining = checkingFloor.data?.m2Remaining ?? m2Quantity;
                            const previousFloor = getPreviousFloor('Checking', article.linkingType);
                            if (m2Quantity > 0 || m2Transferred > 0) {
                              return (
                                <section className="mb-4 rounded-md border-2 border-yellow-400 overflow-hidden">
                                  <div className="px-3 py-1.5 bg-yellow-100 border-b-2 border-yellow-400 text-[11px] font-bold text-yellow-900">M2 — Repairable items (send back for repair)</div>
                                  <div className="p-2 flex flex-wrap items-center gap-3">
                                    <span className="text-[11px] text-gray-700">Current M2: <strong>{m2Quantity}</strong></span>
                                    {m2Transferred > 0 && <span className="text-[11px] text-yellow-800">Sent for repair: <strong>{m2Transferred}</strong></span>}
                                    {m2Remaining > 0 && previousFloor && (
                                      <button type="button" className="px-3 py-1.5 text-[11px] font-bold rounded bg-amber-500 text-white border-2 border-amber-600 hover:bg-amber-600" onClick={() => { setSelectedRepairArticle({ articleId: article._id || article.id, articleNumber: article.articleNumber, orderId: selectedOrder.id, linkingType: article.linkingType }); setShowRepairModal(true); }}>Send M2 for Repair</button>
                                    )}
                                  </div>
                                </section>
                              );
                            }
                            return null;
                          })()}

            <section className="mb-4 rounded-md border-2 border-blue-200 overflow-hidden">
              <div className="px-3 py-1.5 bg-blue-100 border-b-2 border-blue-300 text-[11px] font-bold text-blue-900">6. Reclassify between categories (optional)</div>
              <p className="px-3 py-1 text-[10px] text-gray-600 bg-blue-50/50 border-b-2 border-blue-200">e.g. After repair, move pieces from M2→M1. Enter quantity, click Apply. +1 adds one quickly.</p>
              <div className="p-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {currentUpdateData.m2Quantity > 0 && (
                            <div className="bg-white border-2 border-gray-300 rounded p-2">
                              <label className="block text-[10px] font-bold text-yellow-800 mb-1">M2→M1</label>
                              <div className="flex gap-1 mt-0.5 items-center">
                                <NumericInput className="flex-1 min-w-0 py-0.5 text-[10px] h-6 border border-gray-200 rounded" placeholder="Qty" min={0} max={currentUpdateData.m2Quantity} value={shiftInputs[articleId]?.m2ToM1 || 0} onChange={(v) => handleShiftInputChange(articleId, 'm2ToM1', v)} allowDecimals />
                                <button type="button" className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-green-600 text-white hover:bg-green-700" onClick={() => applyShift(articleId, 'm2ToM1')} disabled={!shiftInputs[articleId]?.m2ToM1 || shiftInputs[articleId].m2ToM1 <= 0}>Apply</button>
                                <button type="button" className="px-1 py-0.5 text-[10px] font-bold rounded bg-blue-500 text-white" onClick={() => handleShiftM2Items(articleId, 'M1', Math.min(currentUpdateData.m2Quantity, 1))} disabled={currentUpdateData.m2Quantity === 0}>+1</button>
                              </div>
                            </div>
                          )}
                          {currentUpdateData.m2Quantity > 0 && (
                            <div className="bg-white border border-orange-200 rounded p-1.5">
                              <label className="text-[10px] font-bold text-orange-700">M2→M3</label>
                              <div className="flex gap-1 mt-0.5 items-center">
                                <NumericInput className="flex-1 min-w-0 py-0.5 text-[10px] h-6 border border-gray-200 rounded" placeholder="Qty" min={0} max={currentUpdateData.m2Quantity} value={shiftInputs[articleId]?.m2ToM3 || 0} onChange={(v) => handleShiftInputChange(articleId, 'm2ToM3', v)} allowDecimals />
                                <button type="button" className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-500 text-white" onClick={() => applyShift(articleId, 'm2ToM3')} disabled={!shiftInputs[articleId]?.m2ToM3 || shiftInputs[articleId].m2ToM3 <= 0}>Apply</button>
                                <button type="button" className="px-1 py-0.5 text-[10px] font-bold rounded bg-blue-500 text-white" onClick={() => handleShiftM2Items(articleId, 'M3', Math.min(currentUpdateData.m2Quantity, 1))} disabled={currentUpdateData.m2Quantity === 0}>+1</button>
                              </div>
                            </div>
                          )}
                          {currentUpdateData.m2Quantity > 0 && (
                            <div className="bg-white border border-red-200 rounded p-1.5">
                              <label className="text-[10px] font-bold text-red-700">M2→M4</label>
                              <div className="flex gap-1 mt-0.5 items-center">
                                <NumericInput className="flex-1 min-w-0 py-0.5 text-[10px] h-6 border border-gray-200 rounded" placeholder="Qty" min={0} max={currentUpdateData.m2Quantity} value={shiftInputs[articleId]?.m2ToM4 || 0} onChange={(v) => handleShiftInputChange(articleId, 'm2ToM4', v)} allowDecimals />
                                <button type="button" className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-600 text-white" onClick={() => applyShift(articleId, 'm2ToM4')} disabled={!shiftInputs[articleId]?.m2ToM4 || shiftInputs[articleId].m2ToM4 <= 0}>Apply</button>
                                <button type="button" className="px-1 py-0.5 text-[10px] font-bold rounded bg-blue-500 text-white" onClick={() => handleShiftM2Items(articleId, 'M4', Math.min(currentUpdateData.m2Quantity, 1))} disabled={currentUpdateData.m2Quantity === 0}>+1</button>
                              </div>
                            </div>
                          )}
                          {/* M3 to M2 */}
                          {currentUpdateData.m3Quantity > 0 && (
                            <div className="bg-white border border-orange-200 rounded p-1.5">
                              <label className="text-[10px] font-bold text-orange-700">M3→M2</label>
                              <div className="flex gap-1 mt-0.5 items-center">
                                <NumericInput className="flex-1 min-w-0 py-0.5 text-[10px] h-6 border border-gray-200 rounded" placeholder="Qty" min={0} max={currentUpdateData.m3Quantity} value={shiftInputs[articleId]?.m3ToM2 || 0} onChange={(v) => handleShiftInputChange(articleId, 'm3ToM2', v)} allowDecimals />
                                <button type="button" className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-500 text-white" onClick={() => applyShift(articleId, 'm3ToM2')} disabled={!shiftInputs[articleId]?.m3ToM2 || shiftInputs[articleId].m3ToM2 <= 0}>Apply</button>
                                <button type="button" className="px-1 py-0.5 text-[10px] font-bold rounded bg-blue-500 text-white" onClick={() => { const q = Math.min(currentUpdateData.m3Quantity, 1); setUpdateData(prev => { const u = { ...prev[articleId] }; u.m3Quantity = u.m3Quantity - q; u.m2Quantity = u.m2Quantity + q; return { ...prev, [articleId]: u }; }); }} disabled={currentUpdateData.m3Quantity === 0}>+1</button>
                              </div>
                            </div>
                          )}
                          {currentUpdateData.m4Quantity > 0 && (
                            <div className="bg-white border border-red-200 rounded p-1.5">
                              <label className="text-[10px] font-bold text-red-700">M4→M3</label>
                              <div className="flex gap-1 mt-0.5 items-center">
                                <NumericInput className="flex-1 min-w-0 py-0.5 text-[10px] h-6 border border-gray-200 rounded" placeholder="Qty" min={0} max={currentUpdateData.m4Quantity} value={shiftInputs[articleId]?.m4ToM3 || 0} onChange={(v) => handleShiftInputChange(articleId, 'm4ToM3', v)} allowDecimals />
                                <button type="button" className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-600 text-white" onClick={() => applyShift(articleId, 'm4ToM3')} disabled={!shiftInputs[articleId]?.m4ToM3 || shiftInputs[articleId].m4ToM3 <= 0}>Apply</button>
                                <button type="button" className="px-1 py-0.5 text-[10px] font-bold rounded bg-blue-500 text-white" onClick={() => { const q = Math.min(currentUpdateData.m4Quantity, 1); setUpdateData(prev => { const u = { ...prev[articleId] }; u.m4Quantity = u.m4Quantity - q; u.m3Quantity = u.m3Quantity + q; return { ...prev, [articleId]: u }; }); }} disabled={currentUpdateData.m4Quantity === 0}>+1</button>
                              </div>
                            </div>
                          )}
                        </div>
            </section>

            {/* M2 Repair review */}
            {currentUpdateData.m2Quantity > 0 && (
              <section className="mb-4 rounded-md border-2 border-yellow-300 overflow-hidden">
                <div className="px-3 py-1.5 bg-yellow-100 border-b-2 border-yellow-300 text-[11px] font-bold text-yellow-900">M2 Repair review</div>
                <div className="p-2 space-y-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Repair status</label>
                    <select className="w-full py-1.5 px-2 text-[11px] border-2 border-gray-300 rounded" value={currentUpdateData.repairStatus} onChange={(e) => handleRepairStatusChange(articleId, e.target.value as 'Not Required' | 'In Review' | 'Repaired' | 'Rejected')}>
                      <option value="Not Required">Not Required</option>
                      <option value="In Review">In Review</option>
                      <option value="Repaired">Repaired</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Repair remarks</label>
                    <textarea className="w-full py-1.5 px-2 text-[11px] border-2 border-gray-300 rounded resize-none" rows={2} placeholder="Remarks..." value={currentUpdateData.repairRemarks} onChange={(e) => handleRepairRemarksChange(articleId, e.target.value)} />
                  </div>
                </div>
              </section>
            )}

            <section className="mb-4 rounded-md border-2 border-gray-300 overflow-hidden">
              <div className="px-3 py-1.5 bg-gray-200 border-b-2 border-gray-300 text-[11px] font-bold text-gray-800">7. Summary — then click Update Order</div>
              <p className="px-3 py-1 text-[10px] text-gray-500 bg-gray-50 border-b border-gray-200">Totals below will be saved. Add remarks if needed.</p>
              <div className="p-2">
                <div className="grid grid-cols-4 gap-2 text-center mb-2">
                  <div className="border-2 border-green-300 rounded py-1.5 bg-green-50 text-[11px] font-bold text-green-800">M1: {currentUpdateData.m1Quantity}</div>
                  <div className="border-2 border-yellow-300 rounded py-1.5 bg-yellow-50 text-[11px] font-bold text-yellow-800">M2: {currentUpdateData.m2Quantity}</div>
                  <div className="border-2 border-orange-300 rounded py-1.5 bg-orange-50 text-[11px] font-bold text-orange-800">M3: {currentUpdateData.m3Quantity}</div>
                  <div className="border-2 border-red-300 rounded py-1.5 bg-red-50 text-[11px] font-bold text-red-800">M4: {currentUpdateData.m4Quantity}</div>
                </div>
                <div className="text-center text-[11px] text-gray-600 border-t-2 border-gray-200 pt-1.5">Total checked: {currentUpdateData.m1Quantity + currentUpdateData.m2Quantity + currentUpdateData.m3Quantity + currentUpdateData.m4Quantity} / {article.plannedQuantity}</div>
                <div className="mt-2">
                  <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Remarks</label>
                  <textarea className="w-full py-1.5 px-2 text-[11px] border-2 border-gray-300 rounded resize-none" rows={2} placeholder="Remarks for this article..." value={currentUpdateData.remarks} onChange={(e) => handleRemarksChange(articleId, e.target.value)} />
                </div>
              </div>
            </section>
                  </>
                );
              })()}
            </div>

            <div className="flex justify-end gap-2 p-3 border-t-2 border-gray-300 bg-gray-50 flex-shrink-0">
              <button onClick={closeUpdateModal} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-gray-300 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-100 shadow-sm">Cancel</button>
              <button
                onClick={() => {
                  if (!selectedOrder) return;
                  const invalid = selectedOrder.articles.some(article => {
                    const articleId = article.id || article._id;
                    if (!articleId) return false;
                    const update = updateData[articleId];
                    if (!update) return false;
                    const checkingFloor = getCheckingFloorData(article);
                    const received = checkingFloor.data?.received || 0;
                    const transferred = checkingFloor.data?.transferred || 0;
                    const remaining = received - transferred;
                    return update.m1Quantity > remaining;
                  });
                  if (invalid) {
                    toast.error("Cannot submit: Some articles have M1 quantities exceeding remaining quantities");
                    return;
                  }
                  setUpdateContainerBarcode("");
                  setUpdateContainerCheckStatus("idle");
                  setUpdateContainerFetched(null);
                  const first = selectedOrder.articles[0];
                  setUpdateContainerArticleId(first?._id || first?.id || "");
                  setUpdateContainerNextFloor("Washing");
                  setShowUpdateContainerModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[11px] font-bold rounded hover:bg-blue-700 shadow-sm disabled:opacity-50"
                disabled={
                  selectedOrder.articles.some(article => {
                    const articleId = article.id || article._id;
                    if (!articleId) return false;
                    const update = updateData[articleId];
                    if (!update) return false;
                    const checkingFloor = getCheckingFloorData(article);
                    const received = checkingFloor.data?.received || 0;
                    const transferred = checkingFloor.data?.transferred || 0;
                    const remaining = received - transferred;
                    return update.m1Quantity > remaining;
                  })
                }
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
                        <ReceivedQuantityDisplay
                          received={checkingFloor.data?.received || 0}
                          repairReceived={checkingFloor.data?.repairReceived}
                          repairFromFloor={checkingFloor.data?.repairFromFloor}
                          className="text-lg"
                        />
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
          floor="Checking"
          m2Remaining={(() => {
            const article = selectedOrder?.articles.find(a => (a._id || a.id) === selectedRepairArticle.articleId);
            if (!article) return 0;
            const checkingFloor = getCheckingFloorData(article);
            const m2Quantity = checkingFloor.data?.m2Quantity || article.m2Quantity || 0;
            // According to docs: m2Remaining = m2Quantity (since m2Quantity is already reduced when items are sent)
            return checkingFloor.data?.m2Remaining ?? m2Quantity;
          })()}
          previousFloor={(() => {
            const prevFloor = getPreviousFloor('Checking', selectedRepairArticle.linkingType);
            // Convert to API format (no spaces)
            if (prevFloor === 'Final Checking') return 'FinalChecking';
            return prevFloor || 'Linking';
          })()}
          onSuccess={() => {
            loadOrders();
          }}
        />
      )}
    </div>
  );
};

export default CheckingFloorSupervisorPage;
