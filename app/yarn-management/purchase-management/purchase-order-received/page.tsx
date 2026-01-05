"use client";
import React, { useEffect, useMemo, useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import yarnPurchaseOrderService, { 
  PurchaseOrderStatus,
  ReceivedLotDetail,
  UpdatePurchaseOrderWithReceivedLotsPayload
} from "@/shared/services/yarnPurchaseOrderService";
import yarnBoxService, { CreateBulkYarnBoxPayload } from "@/shared/services/yarnBoxService";

interface ReceiptProcessingDetails {
  processedBy: string;
  processedDate: string;
  notes?: string;
  qcAssignedTo?: string;
  qcNotes?: string;
  lastAction?: "Mark as Received" | "Send to QC";
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplier: string;
  supplierId: string;
  orderDate: string;
  expectedDelivery: string;
  status: PurchaseOrderStatus;
  totalAmount: number;
  subTotal: number;
  totalGst: number;
  items: PurchaseItem[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  packlistDetails?: {
    packingNumber?: string;
    trackingNumber?: string;
    courierName?: string;
    dispatchDate?: string;
    estimatedDeliveryDate?: string;
    expectedArrivalDate?: string;
    numberOfCones?: number;
    numberOfBoxes?: number;
    totalWeight?: number;
  };
  receivedLotDetails?: ReceivedLotDetail[];
}

interface PurchaseItem {
  id: string;
  yarnName: string;
  sizeCount: string;
  shadeCode: string;
  quantity: number;
  rate: number;
  gst: number;
  subTotal: number;
  estimatedDeliveryDate: string;
}

interface PackBox {
  id: string;
  boxNumber: number;
  barcode: string;
  status: "pending" | "scanned" | "weighed";
  generatedAt: string;
  scannedAt?: string;
  weight?: number;
}

type OrderSortField =
  | "orderNumber"
  | "supplier"
  | "orderDate"
  | "expectedDelivery"
  | "status"
  | "totalAmount";

type SortDirection = "asc" | "desc";

// Helper function to convert API status code to display format
const convertStatusFromAPI = (statusCode: string): PurchaseOrderStatus => {
  const statusMap: Record<string, PurchaseOrderStatus> = {
    'submitted_to_supplier': 'submitted to supplier',
    'in_transit': 'in transit',
    'delivered': 'delivered',
    'rejected': 'rejected',
    'qc_pending': 'QC pending',
    'partially_delivered': 'partially delivered',
    'stocked': 'stocked',
    'goods_received': 'goods received',
    'goods_partially_received': 'goods partially received',
    'po_rejected': 'rejected'
  };
  return statusMap[statusCode] || 'submitted to supplier';
};

// Helper function to convert display status to API status code
const convertStatusToAPI = (status: PurchaseOrderStatus): string => {
  const statusMap: Record<PurchaseOrderStatus, string> = {
    'submitted to supplier': 'submitted_to_supplier',
    'in transit': 'in_transit',
    'delivered': 'delivered',
    'rejected': 'rejected',
    'QC pending': 'qc_pending',
    'partially delivered': 'partially_delivered',
    'stocked': 'stocked',
    'goods received': 'goods_received',
    'goods partially received': 'goods_partially_received'
  };
  return statusMap[status] || 'submitted_to_supplier';
};

// Helper function to map API response to component format
const mapAPIOrderToComponent = (apiOrder: any): PurchaseOrder => {
  const poItems = apiOrder.poItems || apiOrder.items || apiOrder.orderItems || [];
  
  // Get the latest estimated delivery date from items, or use a default
  const latestDeliveryDate = poItems.length > 0 
    ? poItems.reduce((latest: string, item: any) => {
        const itemDate = item.estimatedDeliveryDate || item.estimated_delivery_date;
        return itemDate && (!latest || new Date(itemDate) > new Date(latest)) ? itemDate : latest;
      }, '')
    : new Date().toISOString();

  return {
    id: apiOrder._id || apiOrder.id || '',
    orderNumber: apiOrder.poNumber || apiOrder.orderNumber || apiOrder.order_number || apiOrder.po_number || '',
    supplier: apiOrder.supplierName || apiOrder.supplier?.brandName || apiOrder.supplier?.name || apiOrder.supplier || '',
    supplierId: apiOrder.supplier?._id || apiOrder.supplier?.id || apiOrder.supplierId || apiOrder.supplier_id || '',
    orderDate: apiOrder.createDate || apiOrder.orderDate || apiOrder.order_date || apiOrder.createdAt || new Date().toISOString(),
    expectedDelivery: latestDeliveryDate || apiOrder.expectedDelivery || apiOrder.expected_delivery || new Date().toISOString(),
    status: convertStatusFromAPI(apiOrder.currentStatus || apiOrder.status || apiOrder.status_code || 'submitted_to_supplier'),
    totalAmount: apiOrder.total || apiOrder.totalAmount || apiOrder.total_amount || apiOrder.grandTotal || 0,
    subTotal: apiOrder.subTotal || apiOrder.sub_total || apiOrder.subtotal || 0,
    totalGst: apiOrder.gst || apiOrder.totalGst || apiOrder.total_gst || apiOrder.gstAmount || 0,
    items: poItems.map((item: any) => ({
      id: item._id || item.id || '',
      yarnName: item.yarnName || item.yarn?.yarnName || item.yarn_name || item.yarn?.name || '',
      sizeCount: item.sizeCount || item.size_count || item.countSize || '',
      shadeCode: item.shadeCode || item.shade_code || item.shade || '',
      quantity: item.quantity || 0,
      rate: item.rate || item.unitPrice || 0,
      gst: item.gstRate || item.gst || item.gst_rate || 18,
      subTotal: item.subTotal || item.sub_total || (item.quantity * (item.rate || 0)) || 0,
      estimatedDeliveryDate: item.estimatedDeliveryDate || item.estimated_delivery_date || item.expectedDelivery || ''
    })),
    notes: apiOrder.notes || apiOrder.remarks || '',
    createdAt: apiOrder.createDate || apiOrder.createdAt || apiOrder.created_at || new Date().toISOString(),
    updatedAt: apiOrder.lastUpdateDate || apiOrder.updatedAt || apiOrder.updated_at || new Date().toISOString(),
    packlistDetails: (apiOrder.packListDetails || apiOrder.packlistDetails) ? {
      packingNumber: (apiOrder.packListDetails || apiOrder.packlistDetails)?.packingNumber || (apiOrder.packListDetails || apiOrder.packlistDetails)?.packing_number || (apiOrder.packListDetails || apiOrder.packlistDetails)?.trackingNumber || (apiOrder.packListDetails || apiOrder.packlistDetails)?.tracking_number,
      trackingNumber: (apiOrder.packListDetails || apiOrder.packlistDetails)?.trackingNumber || (apiOrder.packListDetails || apiOrder.packlistDetails)?.tracking_number || (apiOrder.packListDetails || apiOrder.packlistDetails)?.packingNumber || (apiOrder.packListDetails || apiOrder.packlistDetails)?.packing_number,
      courierName: (apiOrder.packListDetails || apiOrder.packlistDetails)?.courierName || (apiOrder.packListDetails || apiOrder.packlistDetails)?.courier_name,
      dispatchDate: (apiOrder.packListDetails || apiOrder.packlistDetails)?.dispatchDate || (apiOrder.packListDetails || apiOrder.packlistDetails)?.dispatch_date,
      estimatedDeliveryDate: (apiOrder.packListDetails || apiOrder.packlistDetails)?.estimatedDeliveryDate || (apiOrder.packListDetails || apiOrder.packlistDetails)?.estimated_delivery_date || (apiOrder.packListDetails || apiOrder.packlistDetails)?.expectedArrivalDate || (apiOrder.packListDetails || apiOrder.packlistDetails)?.expected_arrival_date,
      expectedArrivalDate: (apiOrder.packListDetails || apiOrder.packlistDetails)?.expectedArrivalDate || (apiOrder.packListDetails || apiOrder.packlistDetails)?.expected_arrival_date || (apiOrder.packListDetails || apiOrder.packlistDetails)?.estimatedDeliveryDate || (apiOrder.packListDetails || apiOrder.packlistDetails)?.estimated_delivery_date,
      numberOfCones: (apiOrder.packListDetails || apiOrder.packlistDetails)?.numberOfCones || (apiOrder.packListDetails || apiOrder.packlistDetails)?.number_of_cones,
      numberOfBoxes: (apiOrder.packListDetails || apiOrder.packlistDetails)?.numberOfBoxes || (apiOrder.packListDetails || apiOrder.packlistDetails)?.number_of_boxes,
      totalWeight: (apiOrder.packListDetails || apiOrder.packlistDetails)?.totalWeight || (apiOrder.packListDetails || apiOrder.packlistDetails)?.total_weight
    } : undefined,
    receivedLotDetails: apiOrder.receivedLotDetails || apiOrder.received_lot_details || undefined
  };
};

const getOrderSortValue = (order: PurchaseOrder, field: OrderSortField) => {
  switch (field) {
    case "totalAmount":
      return order.totalAmount;
    case "orderDate":
      return new Date(order.orderDate).getTime();
    case "expectedDelivery":
      return new Date(order.expectedDelivery).getTime();
    case "orderNumber":
    case "supplier":
    case "status":
    default:
      return (order[field] as string).toLowerCase();
  }
};

const PurchaseOrderReceivedPage = () => {
  const router = useRouter();
  const { hasSubPermission, isLoading } = useNavigation();
  const user = useSelector((state: any) => state.auth?.user);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Set default dates: one month ago to today
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  };
  
  const getDefaultEndDate = () => {
    return new Date().toISOString().split('T')[0];
  };
  
  const [startDate, setStartDate] = useState<string>(getDefaultStartDate());
  const [endDate, setEndDate] = useState<string>(getDefaultEndDate());
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [processedOrders, setProcessedOrders] = useState<string[]>([]);

  // Check permission
  const hasPermission = hasSubPermission('/yarn-management/purchase-management', 'Purchase Order Recevied');

  // Fetch purchase orders with "in_transit", "goods_received", and "goods_partially_received" status from API
  const fetchPurchaseOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const baseParams: any = {};

      // Add date filters if provided
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        baseParams.start_date = start.toISOString();
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        baseParams.end_date = end.toISOString();
      }

      // Fetch orders with "in_transit" status
      const inTransitParams = { ...baseParams, status_code: 'in_transit' };
      const inTransitResponse = await yarnPurchaseOrderService.getPurchaseOrders(inTransitParams);
      const inTransitData = Array.isArray(inTransitResponse) ? inTransitResponse : (inTransitResponse.results || []);

      // Fetch orders with "goods_received" status
      const goodsReceivedParams = { ...baseParams, status_code: 'goods_received' };
      const goodsReceivedResponse = await yarnPurchaseOrderService.getPurchaseOrders(goodsReceivedParams);
      const goodsReceivedData = Array.isArray(goodsReceivedResponse) ? goodsReceivedResponse : (goodsReceivedResponse.results || []);

      // Fetch orders with "goods_partially_received" status
      const goodsPartiallyReceivedParams = { ...baseParams, status_code: 'goods_partially_received' };
      const goodsPartiallyReceivedResponse = await yarnPurchaseOrderService.getPurchaseOrders(goodsPartiallyReceivedParams);
      const goodsPartiallyReceivedData = Array.isArray(goodsPartiallyReceivedResponse) ? goodsPartiallyReceivedResponse : (goodsPartiallyReceivedResponse.results || []);

      // Combine all results
      const allOrdersData = [...inTransitData, ...goodsReceivedData, ...goodsPartiallyReceivedData];
      
      // Remove duplicates based on order ID
      const uniqueOrders = allOrdersData.filter((order, index, self) => 
        index === self.findIndex((o) => (o._id || o.id) === (order._id || order.id))
      );
      
      const mappedOrders = uniqueOrders.map(mapAPIOrderToComponent);
      setOrders(mappedOrders);
    } catch (error) {
      console.error('Failed to fetch purchase orders:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load purchase orders');
      setOrders([]);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Fetch orders on mount and when filters change
  useEffect(() => {
    if (hasPermission && !isLoading) {
      fetchPurchaseOrders();
    }
  }, [hasPermission, isLoading, startDate, endDate]);

  // Load processed orders from localStorage on mount and when page becomes visible
  useEffect(() => {
    const loadProcessedOrders = () => {
      const stored = localStorage.getItem('processedOrders');
      if (stored) {
        try {
          setProcessedOrders(JSON.parse(stored));
        } catch (error) {
          console.error('Error loading processed orders:', error);
        }
      }
    };

    loadProcessedOrders();

    // Listen for custom event when order is processed
    const handleProcessedOrdersUpdate = () => {
      loadProcessedOrders();
    };

    window.addEventListener('processedOrdersUpdated', handleProcessedOrdersUpdate);
    window.addEventListener('focus', loadProcessedOrders);

    return () => {
      window.removeEventListener('processedOrdersUpdated', handleProcessedOrdersUpdate);
      window.removeEventListener('focus', loadProcessedOrders);
    };
  }, []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [packLists, setPackLists] = useState<Record<string, PackBox[]>>({});
  const [boxCountInput, setBoxCountInput] = useState<number>(0);
  const [scanValue, setScanValue] = useState("");
  const [weightModalOpen, setWeightModalOpen] = useState(false);
  const [activeBox, setActiveBox] = useState<PackBox | null>(null);
  const [capturedWeight, setCapturedWeight] = useState<number | null>(null);
  const [isReadingWeight, setIsReadingWeight] = useState(false);
  const [weightError, setWeightError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<OrderSortField>("orderDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [isProcessModalOpen, setProcessModalOpen] = useState(false);
  const [statusModalContext, setStatusModalContext] = useState<{
    order: PurchaseOrder;
    targetStatus: string;
  } | null>(null);
  const [isStatusSubmitting, setIsStatusSubmitting] = useState(false);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [goodsReceivedModalOpen, setGoodsReceivedModalOpen] = useState(false);
  const [orderForGoodsReceived, setOrderForGoodsReceived] = useState<PurchaseOrder | null>(null);
  const [isSubmittingGoodsReceived, setIsSubmittingGoodsReceived] = useState(false);

  const selectedOrder = useMemo(
    () => orders.find(order => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  );

  const selectedPackList = useMemo(() => {
    if (!selectedOrderId) {
      return [] as PackBox[];
    }
    return packLists[selectedOrderId] ?? [];
  }, [packLists, selectedOrderId]);

  const packStatusCounts = useMemo(() => {
    return selectedPackList.reduce(
      (acc, box) => {
        acc[box.status] += 1;
        return acc;
      },
      { pending: 0, scanned: 0, weighed: 0 }
    );
  }, [selectedPackList]);

  const filteredAndSortedOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = orders.filter(order => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        order.orderNumber.toLowerCase().includes(normalizedSearch) ||
        order.supplier.toLowerCase().includes(normalizedSearch);

      // All orders are "in transit" status, so no need to filter by status
      return matchesSearch;
    });

    const sorted = [...filtered].sort((a, b) => {
      const aValue = getOrderSortValue(a, sortField);
      const bValue = getOrderSortValue(b, sortField);

      if (typeof aValue === "string" && typeof bValue === "string") {
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === "asc" ? comparison : -comparison;
      }

      const numericComparison = Number(aValue) - Number(bValue);
      if (numericComparison === 0) {
        return 0;
      }
      return sortDirection === "asc" ? numericComparison : -numericComparison;
    });

    return sorted;
  }, [orders, searchTerm, sortField, sortDirection]);

  // Show loading state while permissions are being loaded
  if (isLoading) {
    return (
      <div className="main-content">
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  const safeRandomSegment = () => {
    try {
      if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID().slice(0, 4).toUpperCase();
      }
    } catch (error) {
      console.warn("Falling back to Math.random for barcode generation", error);
    }
    return Math.random().toString(36).slice(2, 6).toUpperCase();
  };

  const buildBarcode = (order: PurchaseOrder, index: number) => {
    const prefix = order.orderNumber.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    const serial = String(index + 1).padStart(3, "0");
    return `${prefix}-${serial}-${safeRandomSegment()}`;
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    const existingBoxes = packLists[orderId] ?? [];
    setBoxCountInput(existingBoxes.length);
    setScanValue("");
    setActiveBox(null);
    setCapturedWeight(null);
    setWeightError(null);
    setProcessModalOpen(true);
  };

  const handleCloseProcessModal = () => {
    setProcessModalOpen(false);
    setSelectedOrderId(null);
    setBoxCountInput(0);
    setScanValue("");
    setActiveBox(null);
    setCapturedWeight(null);
    setWeightError(null);
    setWeightModalOpen(false);
  };

  const handleGenerateBarcodes = () => {
    if (!selectedOrder) {
      toast.error("Select a purchase order first");
      return;
    }
    if (!boxCountInput || boxCountInput <= 0) {
      toast.error("Enter a valid number of boxes");
      return;
    }
    const shouldRegenerate =
      (packLists[selectedOrder.id]?.length ?? 0) > 0
        ? confirm("Existing barcodes will be replaced. Continue?")
        : true;
    if (!shouldRegenerate) {
      return;
    }

    const generatedAt = new Date().toISOString();
    const newBoxes: PackBox[] = Array.from({ length: boxCountInput }, (_, idx) => ({
      id: `${selectedOrder.id}-${idx + 1}`,
      boxNumber: idx + 1,
      barcode: buildBarcode(selectedOrder, idx),
      status: "pending",
      generatedAt,
    }));

    setPackLists(prev => ({
      ...prev,
      [selectedOrder.id]: newBoxes,
    }));
    toast.success(`${newBoxes.length} barcodes generated`);
  };

  const updateBox = (orderId: string, boxId: string, updates: Partial<PackBox>) => {
    setPackLists(prev => {
      const boxes = prev[orderId] ?? [];
      return {
        ...prev,
        [orderId]: boxes.map(box =>
          box.id === boxId
            ? {
                ...box,
                ...updates,
              }
            : box
        ),
      };
    });
  };

  const handleScanSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOrderId || !selectedOrder) {
      toast.error("Select an order before scanning");
      return;
    }
    if (!scanValue.trim()) {
      return;
    }

    const boxes = packLists[selectedOrderId];
    if (!boxes || boxes.length === 0) {
      toast.error("Generate barcodes before scanning");
      return;
    }

    const barcode = scanValue.trim();
    const box = boxes.find(item => item.barcode === barcode);
    if (!box) {
      toast.error("Scanned barcode does not match this receipt");
      return;
    }
    if (box.status === "weighed") {
      toast.success("Box already weighed");
      setScanValue("");
      return;
    }

    const scannedAt = new Date().toISOString();
    updateBox(selectedOrderId, box.id, {
      status: "scanned",
      scannedAt,
    });
    setActiveBox({ ...box, status: "scanned", scannedAt });
    setWeightModalOpen(true);
    setCapturedWeight(box.weight ?? null);
    setWeightError(null);
  };

  const handleCloseWeightModal = () => {
    setWeightModalOpen(false);
    setActiveBox(null);
    setCapturedWeight(null);
    setWeightError(null);
  };

  const readWeightFromDevice = async () => {
    if (typeof navigator === "undefined" || !(navigator as Navigator & { serial?: unknown }).serial) {
      setWeightError("Connected device not supported in this browser. Enter weight manually.");
      toast.error("Scale connection not supported");
      return;
    }
    const serialNavigator = navigator as Navigator & { serial: any };
    setIsReadingWeight(true);
    try {
      const port = await serialNavigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      const decoder = new TextDecoder();
      const reader = port.readable?.getReader();
      let weightValue: number | null = null;

      while (reader) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        const textChunk = decoder.decode(value);
        const match = textChunk.match(/(\d+(\.\d+)?)/);
        if (match) {
          weightValue = parseFloat(match[1]);
          break;
        }
      }

      reader?.releaseLock();
      await port.close();

      if (weightValue == null || Number.isNaN(weightValue)) {
        throw new Error("Unable to parse weight data from device");
      }

      setCapturedWeight(weightValue);
      toast.success(`Weight captured: ${weightValue.toFixed(2)} kg`);
      setWeightError(null);
    } catch (error: any) {
      console.error("Failed to read weight:", error);
      setWeightError(error?.message ?? "Failed to read weight from device. Please enter manually.");
      toast.error("Failed to read weight from device");
    } finally {
      setIsReadingWeight(false);
    }
  };

  const handleConfirmWeight = () => {
    if (!selectedOrderId || !activeBox) {
      return;
    }
    if (capturedWeight == null || Number.isNaN(capturedWeight) || capturedWeight <= 0) {
      setWeightError("Enter a valid weight before confirming.");
      return;
    }

    updateBox(selectedOrderId, activeBox.id, {
      status: "weighed",
      weight: capturedWeight,
    });
    toast.success("Box weighed and recorded");
    handleCloseWeightModal();
    setScanValue("");
  };

  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-lock-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500 mb-4">You don't have permission to access Purchase Order Received.</p>
          <Link href="/yarn-management" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Yarn Management
          </Link>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'submitted to supplier': return 'bg-blue-100 text-blue-800';
      case 'in transit': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'QC pending': return 'bg-yellow-100 text-yellow-800';
      case 'partially delivered': return 'bg-orange-100 text-orange-800';
      case 'stocked': return 'bg-emerald-100 text-emerald-800';
      case 'goods received': return 'bg-green-100 text-green-800';
      case 'goods partially received': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCloseStatusModal = () => {
    setStatusModalContext(null);
  };

  const handleStatusModalSubmit = async (details: ReceiptProcessingDetails) => {
    if (!statusModalContext || !user || !user.id || !user.email) {
      toast.error('User information not available. Please login again.');
      return;
    }
    const { order, targetStatus } = statusModalContext;
    setIsStatusSubmitting(true);
    try {
      // Update order status via API
      await yarnPurchaseOrderService.updatePurchaseOrderStatus(
        order.id,
        targetStatus as PurchaseOrderStatus,
        user.id,
        user.email,
        details.notes || `Status updated to ${targetStatus}`
      );

      // Refresh orders list
      await fetchPurchaseOrders();
      
      toast.success(`Order status updated to ${targetStatus}`);
      setStatusModalContext(null);
    } catch (error) {
      console.error("Failed to update order status:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update status");
    } finally {
      setIsStatusSubmitting(false);
    }
  };

  const handleOpenGoodsReceivedModal = async (order: PurchaseOrder) => {
    try {
      // Fetch full order details to get latest receivedLotDetails
      const fullOrderDetails = await yarnPurchaseOrderService.getPurchaseOrderById(order.id);
      const mappedOrder = mapAPIOrderToComponent(fullOrderDetails);
      setOrderForGoodsReceived(mappedOrder);
      setGoodsReceivedModalOpen(true);
    } catch (error) {
      console.error('Failed to fetch order details:', error);
      toast.error('Failed to load order details');
      // Fallback to using the order from list
      setOrderForGoodsReceived(order);
      setGoodsReceivedModalOpen(true);
    }
  };

  const handleGoodsReceivedSubmit = async (payload: UpdatePurchaseOrderWithReceivedLotsPayload) => {
    if (!orderForGoodsReceived) {
      toast.error('Order not found');
      return;
    }

    setIsSubmittingGoodsReceived(true);
    try {
      await yarnPurchaseOrderService.updatePurchaseOrderWithReceivedLots(
        orderForGoodsReceived.id,
        payload
      );

      // Refresh orders list
      await fetchPurchaseOrders();
      
      toast.success('Purchase order updated with received lot details successfully');
      setGoodsReceivedModalOpen(false);
      setOrderForGoodsReceived(null);
    } catch (error) {
      console.error('Failed to update order:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update order');
    } finally {
      setIsSubmittingGoodsReceived(false);
    }
  };

  const handleSort = (field: OrderSortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(field);
    setSortDirection("asc");
  };

  const SortIcon = ({ field }: { field: OrderSortField }) => {
    if (sortField !== field) {
      return <i className="ri-arrow-up-down-line text-gray-400"></i>;
    }
    return sortDirection === "asc" ? (
      <i className="ri-arrow-up-line text-primary"></i>
    ) : (
      <i className="ri-arrow-down-line text-primary"></i>
    );
  };

  return (
    <>
      <div className="main-content">
      <Seo title="Purchase Order Received" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Purchase Order Received</h1>
                <p className="text-gray-600 mt-1">Track and manage received purchase orders</p>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="box">
            <div className="box-body">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by order number, PO number or supplier..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button className="ti-btn ti-btn-light">
                    <i className="ri-download-line me-1"></i>
                    Export
                  </button>
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-4 mt-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="form-label text-xs text-gray-600">Start Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="form-label text-xs text-gray-600">End Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  {(startDate || endDate) && (
                    <button
                      className="ti-btn ti-btn-light self-end"
                      onClick={() => {
                        setStartDate(getDefaultStartDate());
                        setEndDate(getDefaultEndDate());
                      }}
                    >
                      <i className="ri-close-line me-1"></i>
                      Clear Dates
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Received Orders Table */}
          <div className="box">
            <div className="box-header">
              <h3 className="box-title">Received Orders ({filteredAndSortedOrders.length})</h3>
            </div>
            <div className="box-body">
              {isLoadingOrders ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading purchase orders...</p>
                </div>
              ) : filteredAndSortedOrders.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <i className="ri-inbox-line text-4xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm
                      ? "No orders match your search criteria. Try adjusting your search term."
                      : "No purchase orders found (In Transit, Goods Received, or Goods Partially Received) for the selected period."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse border border-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("orderNumber")}
                        >
                          <div className="flex items-center gap-2">
                            PO Number
                            <SortIcon field="orderNumber" />
                          </div>
                        </th>
                        <th
                          className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("supplier")}
                        >
                          <div className="flex items-center gap-2">
                            Supplier
                            <SortIcon field="supplier" />
                          </div>
                        </th>
                        <th
                          className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("orderDate")}
                        >
                          <div className="flex items-center gap-2">
                            Order Date
                            <SortIcon field="orderDate" />
                          </div>
                        </th>
                        <th
                          className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("expectedDelivery")}
                        >
                          <div className="flex items-center gap-2">
                            Expected Delivery
                            <SortIcon field="expectedDelivery" />
                          </div>
                        </th>
                        <th
                          className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("status")}
                        >
                          <div className="flex items-center gap-2">
                            Status
                            <SortIcon field="status" />
                          </div>
                        </th>
                        <th
                          className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("totalAmount")}
                        >
                          <div className="flex items-center gap-2">
                            Total Amount
                            <SortIcon field="totalAmount" />
                          </div>
                        </th>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {filteredAndSortedOrders.map((order) => {
                        return (
                          <tr
                            key={order.id}
                            className={`hover:bg-gray-50 ${
                              selectedOrderId === order.id ? "!bg-primary/5" : ""
                            }`}
                          >
                          <td className="border border-gray-300 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {order.orderNumber}
                          </td>
                          <td className="border border-gray-300 px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {order.supplier}
                          </td>
                          <td className="border border-gray-300 px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(order.orderDate).toLocaleDateString()}
                          </td>
                          <td className="border border-gray-300 px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(order.expectedDelivery).toLocaleDateString()}
                          </td>
                          <td className="border border-gray-300 px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="border border-gray-300 px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{order.totalAmount.toLocaleString()}
                          </td>
                          <td className="border border-gray-300 px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              {/* For "in transit" status: show only "Goods Received" button */}
                              {order.status === 'in transit' && (
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    await handleOpenGoodsReceivedModal(order);
                                  }}
                                  className="inline-flex items-center justify-center gap-2 rounded-md border border-primary bg-primary text-white px-3 py-1 text-sm hover:bg-primary/90 transition h-8"
                                  title="Mark goods as received"
                                >
                                  <i className="ri-checkbox-circle-line"></i>
                                  Goods Received
                                </button>
                              )}

                              {/* For "goods partially received" or "goods received" status: show both "Process" and "Goods Received" buttons */}
                              {(order.status === 'goods partially received' || order.status === 'goods received') && (
                                <>
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      
                                      if (processingOrderId === order.id) {
                                        console.log('Already processing this order');
                                        return;
                                      }
                                      
                                      console.log('Process button clicked for order:', order.id, order.orderNumber);
                                      setProcessingOrderId(order.id);
                                      
                                      try {
                                        // Fetch full order details to get receivedLotDetails
                                        const fullOrderDetails = await yarnPurchaseOrderService.getPurchaseOrderById(order.id);
                                        const mappedOrder = mapAPIOrderToComponent(fullOrderDetails);
                                        
                                        // Check if receivedLotDetails exist
                                        if (!mappedOrder.receivedLotDetails || mappedOrder.receivedLotDetails.length === 0) {
                                          toast.error('Please fill Goods Received details first before processing');
                                          setProcessingOrderId(null);
                                          return;
                                        }

                                        // Format lot details for process page - ensure proper structure
                                        const lotDetails = mappedOrder.receivedLotDetails
                                          .filter(lot => lot.lotNumber && lot.numberOfBoxes > 0) // Filter out invalid lots
                                          .map(lot => ({
                                            lotNumber: lot.lotNumber.trim(),
                                            numberOfBoxes: lot.numberOfBoxes
                                          }));

                                        // Validate that we have at least one valid lot
                                        if (lotDetails.length === 0) {
                                          toast.error('No valid lot details found. Please ensure all lots have a lot number and number of boxes.');
                                          setProcessingOrderId(null);
                                          return;
                                        }

                                        // Create process data payload with correct structure
                                        const processData = {
                                          poNumber: mappedOrder.orderNumber,
                                          lotDetails: lotDetails
                                        };

                                        console.log('Process data to pass:', JSON.stringify(processData, null, 2));

                                        // Check if boxes already exist for this order
                                        console.log('Checking for existing boxes...');
                                        const existingBoxes = await yarnBoxService.getYarnBoxes({
                                          po_number: mappedOrder.orderNumber,
                                          cones_issued: false
                                        });
                                        console.log('Existing boxes response:', existingBoxes);

                                        // If boxes don't exist, create them based on lot details
                                        if (!existingBoxes.results || existingBoxes.results.length === 0) {
                                          console.log('No existing boxes found, creating bulk boxes...');
                                          
                                          // Validate that we have lot details
                                          if (lotDetails.length === 0) {
                                            toast.error('Cannot create boxes without lot details. Please check lot details.');
                                            setProcessingOrderId(null);
                                            return;
                                          }

                                          // Create bulk payload with lotDetails structure
                                          const bulkPayload: CreateBulkYarnBoxPayload = {
                                            poNumber: mappedOrder.orderNumber,
                                            lotDetails: lotDetails
                                          };
                                          console.log('Bulk payload:', JSON.stringify(bulkPayload, null, 2));

                                          const result = await yarnBoxService.createBulkYarnBoxes(bulkPayload);
                                          console.log('Bulk boxes created:', result);
                                          const totalBoxesCreated = lotDetails.reduce((sum, lot) => sum + lot.numberOfBoxes, 0);
                                          toast.success(`${totalBoxesCreated} yarn box(es) created successfully`);
                                        } else {
                                          console.log('Boxes already exist, skipping creation');
                                          toast.success('Boxes already exist for this order');
                                        }

                                        // Navigate to process page with lot details as query params
                                        console.log('Navigating to process page with lot details...');
                                        const queryParams = new URLSearchParams({
                                          lotData: JSON.stringify(processData)
                                        });
                                        router.push(`/yarn-management/purchase-management/purchase-order-received/process/${order.id}?${queryParams.toString()}`);
                                      } catch (error) {
                                        console.error('Failed to process order:', error);
                                        toast.error(error instanceof Error ? error.message : 'Failed to process order');
                                        setProcessingOrderId(null);
                                      }
                                    }}
                                    disabled={processingOrderId === order.id}
                                    className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:border-primary hover:text-primary transition h-8 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Process receipt workflow"
                                  >
                                    {processingOrderId === order.id ? (
                                      <>
                                        <i className="ri-loader-4-line animate-spin"></i>
                                        Processing...
                                      </>
                                    ) : (
                                      <>
                                        <i className="ri-box-3-line"></i>
                                        Process
                                      </>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      await handleOpenGoodsReceivedModal(order);
                                    }}
                                    className="inline-flex items-center justify-center gap-2 rounded-md border border-primary bg-primary text-white px-3 py-1 text-sm hover:bg-primary/90 transition h-8"
                                    title="Mark goods as received"
                                  >
                                    <i className="ri-checkbox-circle-line"></i>
                                    Goods Received
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      </div>

      {selectedOrder && (
        <ProcessModal
          isOpen={isProcessModalOpen}
          onClose={handleCloseProcessModal}
          order={selectedOrder}
          boxCountInput={boxCountInput}
          onBoxCountChange={(value) => setBoxCountInput(value)}
          onGenerateBarcodes={handleGenerateBarcodes}
          scanValue={scanValue}
          onScanValueChange={setScanValue}
          onScanSubmit={handleScanSubmit}
          selectedPackList={selectedPackList}
          packStatusCounts={packStatusCounts}
          getStatusColor={getStatusColor}
        />
      )}

      {statusModalContext && (
        <ReceiptStatusModal
          isOpen={!!statusModalContext}
          order={statusModalContext.order}
          targetStatus={statusModalContext.targetStatus}
          onClose={handleCloseStatusModal}
          onSubmit={handleStatusModalSubmit}
          isSubmitting={isStatusSubmitting}
        />
      )}

      {weightModalOpen && activeBox ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <i className="ri-scales-2-line text-primary"></i>
                  Weigh Box {activeBox?.boxNumber}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Barcode: <span className="font-mono">{activeBox?.barcode}</span>
                </p>
              </div>
              <button
                onClick={handleCloseWeightModal}
                className="text-gray-400 hover:text-gray-600 transition"
                aria-label="Close weight modal"
              >
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="flex items-start gap-3 rounded-md border border-blue-100 bg-blue-50 p-3">
                <i className="ri-information-line text-xl text-blue-500 mt-0.5"></i>
                <p className="text-sm text-blue-700">
                  Connect the weighing scale and click <span className="font-semibold">Read Weight</span>.
                  If the device is not available, enter the weight manually.
                </p>
              </div>

              <div className="space-y-2">
                <label className="form-label">Captured Weight (kg)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={capturedWeight ?? ""}
                  onChange={(event) => {
                    const { value } = event.target;
                    setCapturedWeight(value === "" ? null : parseFloat(value));
                  }}
                  className="form-control"
                  placeholder="0.00"
                />
              </div>

              {weightError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {weightError}
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 px-6 py-4 flex flex-wrap gap-3 justify-end">
              <button
                type="button"
                className="ti-btn ti-btn-outline-secondary"
                onClick={handleCloseWeightModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-outline-primary"
                onClick={readWeightFromDevice}
                disabled={isReadingWeight}
              >
                {isReadingWeight ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="animate-spin rounded-full border-2 border-primary border-t-transparent h-4 w-4 inline-block"></span>
                    Reading...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <i className="ri-sensor-line"></i>
                    Read Weight
                  </span>
                )}
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-primary"
                onClick={handleConfirmWeight}
              >
                <i className="ri-check-line me-1"></i>
                Confirm Weight
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {orderForGoodsReceived && (
        <GoodsReceivedModal
          isOpen={goodsReceivedModalOpen}
          onClose={() => {
            setGoodsReceivedModalOpen(false);
            setOrderForGoodsReceived(null);
          }}
          order={orderForGoodsReceived}
          onSubmit={handleGoodsReceivedSubmit}
          isSubmitting={isSubmittingGoodsReceived}
        />
      )}
    </>
  );
};

interface ProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder;
  boxCountInput: number;
  onBoxCountChange: (value: number) => void;
  onGenerateBarcodes: () => void;
  scanValue: string;
  onScanValueChange: (value: string) => void;
  onScanSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  selectedPackList: PackBox[];
  packStatusCounts: {
    pending: number;
    scanned: number;
    weighed: number;
  };
  getStatusColor: (status: PurchaseOrderStatus) => string;
}

const ProcessModal: React.FC<ProcessModalProps> = ({
  isOpen,
  onClose,
  order,
  boxCountInput,
  onBoxCountChange,
  onGenerateBarcodes,
  scanValue,
  onScanValueChange,
  onScanSubmit,
  selectedPackList,
  packStatusCounts,
  getStatusColor,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <i className="ri-truck-line text-primary"></i>
              Unloading &amp; Verification
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Follow the guided workflow to unload, verify packs, and capture weights for{" "}
              <span className="font-medium text-gray-700">{order.orderNumber}</span>.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            aria-label="Close processing modal"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <div className="px-6 py-5 space-y-6 overflow-y-auto">
          <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-xs uppercase text-gray-500">Supplier</p>
                <p className="text-sm font-semibold text-gray-800">{order.supplier}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Order Date</p>
                <p className="text-sm font-semibold text-gray-800">{new Date(order.orderDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Expected Delivery</p>
                <p className="text-sm font-semibold text-gray-800">{new Date(order.expectedDelivery).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Status</p>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-gray-200 p-3 bg-white">
              <p className="text-xs uppercase text-gray-500">Pending</p>
              <p className="text-xl font-semibold text-gray-800">{packStatusCounts.pending}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3 bg-white">
              <p className="text-xs uppercase text-gray-500">Scanned</p>
              <p className="text-xl font-semibold text-gray-800">{packStatusCounts.scanned}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3 bg-white">
              <p className="text-xs uppercase text-gray-500">Weighed</p>
              <p className="text-xl font-semibold text-gray-800">{packStatusCounts.weighed}</p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="form-label">Total Boxes (per supplier pack list)</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="number"
                min={0}
                className="form-control"
                value={boxCountInput}
                onChange={(event) => {
                  const parsed = parseInt(event.target.value, 10);
                  onBoxCountChange(Number.isNaN(parsed) ? 0 : Math.max(0, parsed));
                }}
                placeholder="Enter number of boxes unloaded"
              />
              <button
                type="button"
                className="ti-btn ti-btn-primary whitespace-nowrap"
                onClick={onGenerateBarcodes}
              >
                <i className="ri-barcode-line me-1"></i>
                Generate Barcodes
              </button>
            </div>
            <p className="text-xs text-gray-500">
              The system creates unique barcodes for each box so they can be scanned during weighing.
            </p>
          </div>

          <div className="space-y-3">
            <form onSubmit={onScanSubmit} className="space-y-3">
              <div>
                <label className="form-label">Scan or Enter Barcode</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Scan box barcode"
                    value={scanValue}
                    onChange={(event) => onScanValueChange(event.target.value)}
                    disabled={selectedPackList.length === 0}
                  />
                  <button
                    type="submit"
                    className="ti-btn ti-btn-outline-primary whitespace-nowrap"
                    disabled={selectedPackList.length === 0 || !scanValue.trim()}
                  >
                    <i className="ri-qr-scan-2-line me-1"></i>
                    Scan
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                After every successful scan, connect to the weighing scale to capture box weight automatically.
              </p>
            </form>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <i className="ri-list-ordered"></i>
              Supplier Pack List
            </h4>
            {selectedPackList.length === 0 ? (
              <p className="text-xs text-gray-500">
                Generate barcodes to populate the pack list and begin scanning.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                <ul className="divide-y divide-gray-200">
                  {selectedPackList.map((box) => (
                    <li key={box.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">Box {box.boxNumber}</p>
                        <p className="text-xs text-gray-500">{box.barcode}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase text-gray-500">Status</p>
                        <p
                          className={`text-sm font-semibold ${
                            box.status === "weighed"
                              ? "text-green-600"
                              : box.status === "scanned"
                              ? "text-orange-500"
                              : "text-gray-500"
                          }`}
                        >
                          {box.status === "weighed"
                            ? "Weighed"
                            : box.status === "scanned"
                            ? "Scanned"
                            : "Pending"}
                        </p>
                        {typeof box.weight === "number" && (
                          <p className="text-xs text-gray-500">
                            {box.weight.toFixed(2)} kg
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 px-6 py-4 flex justify-end">
          <button type="button" className="ti-btn ti-btn-light" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

interface ReceiptStatusModalProps {
  isOpen: boolean;
  order: PurchaseOrder;
  targetStatus: string;
  onClose: () => void;
  onSubmit: (details: ReceiptProcessingDetails) => Promise<void>;
  isSubmitting: boolean;
}

const ReceiptStatusModal: React.FC<ReceiptStatusModalProps> = ({
  isOpen,
  order,
  targetStatus,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [processedBy, setProcessedBy] = useState("");
  const [processedDate, setProcessedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [qcAssignedTo, setQcAssignedTo] = useState("");
  const [qcNotes, setQcNotes] = useState("");

  const isSendToQc = targetStatus === "Pending Inspection";

  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split("T")[0];
      setProcessedBy("");
      setProcessedDate(today);
      setNotes("");
      setQcAssignedTo("");
      setQcNotes("");
    }
  }, [isOpen, order, targetStatus]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!processedBy.trim()) {
      toast.error("Received by is required");
      return;
    }
    if (!processedDate) {
      toast.error("Processed date is required");
      return;
    }
    if (isSendToQc && !qcAssignedTo.trim()) {
      toast.error("Assign QC owner before sending to QC");
      return;
    }

    const payload: ReceiptProcessingDetails = {
      processedBy: processedBy.trim(),
      processedDate,
      lastAction: isSendToQc ? "Send to QC" : "Mark as Received",
    };

    if (notes.trim()) {
      payload.notes = notes.trim();
    }
    if (isSendToQc) {
      payload.qcAssignedTo = qcAssignedTo.trim();
      if (qcNotes.trim()) {
        payload.qcNotes = qcNotes.trim();
      }
    }

    await onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
        <form onSubmit={handleSubmit}>
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <i className="ri-refresh-line text-primary"></i>
                {isSendToQc ? "Send to QC" : "Mark as Received"}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {order.orderNumber} &bull; {order.supplier}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Current Status: {order.status}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
              aria-label="Close status modal"
              disabled={isSubmitting}
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="form-label">
                  Received / Processed By <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={processedBy}
                  onChange={(event) => setProcessedBy(event.target.value)}
                  placeholder="Enter receiver name"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="form-label">
                  Processed Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={processedDate}
                  onChange={(event) => setProcessedDate(event.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Notes</label>
              <textarea
                className="form-control"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add remarks for this update..."
                disabled={isSubmitting}
              />
            </div>

            {isSendToQc && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="form-label">
                    QC Owner <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={qcAssignedTo}
                    onChange={(event) => setQcAssignedTo(event.target.value)}
                    placeholder="Enter QC owner name"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="form-label">QC Notes</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={qcNotes}
                    onChange={(event) => setQcNotes(event.target.value)}
                    placeholder="Share QC instructions..."
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
            <button
              type="button"
              className="ti-btn ti-btn-light"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ti-btn ti-btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <i className="ri-loader-4-line animate-spin"></i>
                  Updating...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <i className="ri-check-line"></i>
                  {isSendToQc ? "Send to QC" : "Mark as Received"}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface GoodsReceivedModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder;
  onSubmit: (payload: UpdatePurchaseOrderWithReceivedLotsPayload) => Promise<void>;
  isSubmitting: boolean;
}

const GoodsReceivedModal: React.FC<GoodsReceivedModalProps> = ({
  isOpen,
  onClose,
  order,
  onSubmit,
  isSubmitting
}) => {
  const [lots, setLots] = useState<ReceivedLotDetail[]>([
    {
      lotNumber: '',
      numberOfCones: 0,
      totalWeight: 0,
      numberOfBoxes: 0,
      poItems: [],
      status: 'lot_qc_pending'
    }
  ]);
  const [currentStatus, setCurrentStatus] = useState<'goods_received' | 'goods_partially_received'>('goods_partially_received');

  useEffect(() => {
    if (isOpen) {
      // Load existing data if available, otherwise reset form
      if (order.receivedLotDetails && order.receivedLotDetails.length > 0) {
        // Load existing received lot details
        setLots(order.receivedLotDetails.map(lot => ({
          lotNumber: lot.lotNumber || '',
          numberOfCones: lot.numberOfCones || 0,
          totalWeight: lot.totalWeight || 0,
          numberOfBoxes: lot.numberOfBoxes || 0,
          poItems: lot.poItems || [],
          status: lot.status || 'lot_qc_pending'
        })));
        
        // Set current status based on order status
        if (order.status === 'goods received') {
          setCurrentStatus('goods_received');
        } else {
          setCurrentStatus('goods_partially_received');
        }
      } else {
        // Reset form when modal opens with no existing data
        setLots([{
          lotNumber: '',
          numberOfCones: 0,
          totalWeight: 0,
          numberOfBoxes: 0,
          poItems: [],
          status: 'lot_qc_pending'
        }]);
        setCurrentStatus('goods_partially_received');
      }
    }
  }, [isOpen, order]);

  if (!isOpen) return null;

  const addLot = () => {
    setLots([...lots, {
      lotNumber: '',
      numberOfCones: 0,
      totalWeight: 0,
      numberOfBoxes: 0,
      poItems: [],
      status: 'lot_qc_pending'
    }]);
  };

  const removeLot = (index: number) => {
    if (lots.length > 1) {
      setLots(lots.filter((_, i) => i !== index));
    }
  };

  const updateLot = (index: number, field: keyof ReceivedLotDetail, value: any) => {
    const updatedLots = [...lots];
    updatedLots[index] = { ...updatedLots[index], [field]: value };
    setLots(updatedLots);
  };

  const addPoItemToLot = (lotIndex: number) => {
    const updatedLots = [...lots];
    updatedLots[lotIndex].poItems.push({
      poItem: '',
      receivedQuantity: 0
    });
    setLots(updatedLots);
  };

  const removePoItemFromLot = (lotIndex: number, poItemIndex: number) => {
    const updatedLots = [...lots];
    updatedLots[lotIndex].poItems = updatedLots[lotIndex].poItems.filter((_, i) => i !== poItemIndex);
    setLots(updatedLots);
  };

  const updatePoItem = (lotIndex: number, poItemIndex: number, field: 'poItem' | 'receivedQuantity', value: string | number) => {
    const updatedLots = [...lots];
    updatedLots[lotIndex].poItems[poItemIndex] = {
      ...updatedLots[lotIndex].poItems[poItemIndex],
      [field]: value
    };
    setLots(updatedLots);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    for (let i = 0; i < lots.length; i++) {
      const lot = lots[i];
      if (!lot.lotNumber.trim()) {
        toast.error(`Lot ${i + 1}: Lot Number is required`);
        return;
      }
      if (lot.numberOfCones <= 0) {
        toast.error(`Lot ${i + 1}: Number of Cones must be greater than 0`);
        return;
      }
      if (lot.totalWeight <= 0) {
        toast.error(`Lot ${i + 1}: Total Weight must be greater than 0`);
        return;
      }
      if (lot.numberOfBoxes <= 0) {
        toast.error(`Lot ${i + 1}: Number of Boxes must be greater than 0`);
        return;
      }
      if (lot.poItems.length === 0) {
        toast.error(`Lot ${i + 1}: At least one PO Item is required`);
        return;
      }
      for (let j = 0; j < lot.poItems.length; j++) {
        const poItem = lot.poItems[j];
        if (!poItem.poItem) {
          toast.error(`Lot ${i + 1}, PO Item ${j + 1}: PO Item is required`);
          return;
        }
        if (poItem.receivedQuantity <= 0) {
          toast.error(`Lot ${i + 1}, PO Item ${j + 1}: Received Quantity must be greater than 0`);
          return;
        }
      }
    }

    const payload: UpdatePurchaseOrderWithReceivedLotsPayload = {
      receivedLotDetails: lots,
      currentStatus
    };

    await onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Goods Received - {order.orderNumber}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500"
                  disabled={isSubmitting}
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>

              {/* Order Details */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Order Details</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <label className="text-xs font-medium text-gray-600">PO Number</label>
                    <div className="mt-1 text-gray-900 font-medium">{order.orderNumber}</div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Supplier</label>
                    <div className="mt-1 text-gray-900">{order.supplier}</div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Order Date</label>
                    <div className="mt-1 text-gray-900">{new Date(order.orderDate).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Total Amount</label>
                    <div className="mt-1 text-gray-900 font-medium">₹{order.totalAmount.toLocaleString()}</div>
                  </div>
                </div>
                {order.items && order.items.length > 0 && (
                  <div className="mt-4">
                    <label className="text-xs font-medium text-gray-600 mb-2 block">Order Items</label>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs border border-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-2 py-1 text-left border border-gray-200">Yarn Name</th>
                            <th className="px-2 py-1 text-left border border-gray-200">Size/Count</th>
                            <th className="px-2 py-1 text-left border border-gray-200">Shade Code</th>
                            <th className="px-2 py-1 text-right border border-gray-200">Quantity</th>
                            <th className="px-2 py-1 text-right border border-gray-200">Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item, idx) => (
                            <tr key={idx} className="bg-white">
                              <td className="px-2 py-1 border border-gray-200">{item.yarnName}</td>
                              <td className="px-2 py-1 border border-gray-200">{item.sizeCount}</td>
                              <td className="px-2 py-1 border border-gray-200">{item.shadeCode}</td>
                              <td className="px-2 py-1 text-right border border-gray-200">{item.quantity.toLocaleString()}</td>
                              <td className="px-2 py-1 text-right border border-gray-200">₹{item.rate.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Current Status */}
              <div className="mb-6">
                <label className="form-label">
                  Current Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={currentStatus}
                  onChange={(e) => setCurrentStatus(e.target.value as 'goods_received' | 'goods_partially_received')}
                  className="form-select"
                  required
                >
                  <option value="goods_partially_received">Goods Partially Received</option>
                  <option value="goods_received">Goods Received</option>
                </select>
              </div>

              {/* Lots */}
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-semibold text-gray-700">Received Lot Details</h4>
                  <button
                    type="button"
                    onClick={addLot}
                    className="ti-btn ti-btn-primary whitespace-nowrap"
                  >
                    <i className="ri-add-line me-2"></i>
                    Add Lot
                  </button>
                </div>

                {lots.map((lot, lotIndex) => (
                  <div key={lotIndex} className="border border-gray-200 rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h5 className="text-sm font-medium text-gray-800">Lot {lotIndex + 1}</h5>
                      {lots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLot(lotIndex)}
                          className="ti-btn ti-btn-outline-danger whitespace-nowrap"
                          title="Remove Lot"
                        >
                          <i className="ri-delete-bin-line me-2"></i>
                          Remove Lot
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">
                          Lot Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={lot.lotNumber}
                          onChange={(e) => updateLot(lotIndex, 'lotNumber', e.target.value)}
                          className="form-control"
                          placeholder="Enter lot number"
                          required
                        />
                      </div>

                      <div>
                        <label className="form-label">
                          Status <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={lot.status}
                          onChange={(e) => updateLot(lotIndex, 'status', e.target.value)}
                          className="form-select"
                          required
                        >
                          <option value="lot_qc_pending">Lot QC Pending</option>
                          <option value="lot_accepted">Lot Accepted</option>
                          <option value="lot_rejected">Lot Rejected</option>
                        </select>
                      </div>

                      <div>
                        <label className="form-label">
                          Number of Cones <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={lot.numberOfCones}
                          onChange={(e) => updateLot(lotIndex, 'numberOfCones', parseInt(e.target.value) || 0)}
                          className="form-control"
                          required
                        />
                      </div>

                      <div>
                        <label className="form-label">
                          Total Weight (kg) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={lot.totalWeight}
                          onChange={(e) => updateLot(lotIndex, 'totalWeight', parseFloat(e.target.value) || 0)}
                          className="form-control"
                          required
                        />
                      </div>

                      <div>
                        <label className="form-label">
                          Number of Boxes <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={lot.numberOfBoxes}
                          onChange={(e) => updateLot(lotIndex, 'numberOfBoxes', parseInt(e.target.value) || 0)}
                          className="form-control"
                          required
                        />
                      </div>
                    </div>

                    {/* PO Items */}
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <label className="form-label">PO Items <span className="text-red-500">*</span></label>
                        <button
                          type="button"
                          onClick={() => addPoItemToLot(lotIndex)}
                          className="ti-btn ti-btn-outline-primary whitespace-nowrap"
                        >
                          <i className="ri-add-line me-2"></i>
                          Add PO Item
                        </button>
                      </div>

                      {lot.poItems.map((poItem, poItemIndex) => (
                        <div key={poItemIndex} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 p-3 bg-gray-50 rounded">
                          <div>
                            <label className="form-label">
                              PO Item <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={poItem.poItem}
                              onChange={(e) => updatePoItem(lotIndex, poItemIndex, 'poItem', e.target.value)}
                              className="form-select"
                              required
                            >
                              <option value="">Select PO Item</option>
                              {order.items.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.yarnName} - {item.sizeCount} - {item.shadeCode} (Qty: {item.quantity})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="form-label">
                              Received Quantity <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={poItem.receivedQuantity}
                              onChange={(e) => updatePoItem(lotIndex, poItemIndex, 'receivedQuantity', parseInt(e.target.value) || 0)}
                              className="form-control"
                              required
                            />
                          </div>

                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => removePoItemFromLot(lotIndex, poItemIndex)}
                              className="ti-btn ti-btn-outline-danger whitespace-nowrap w-full"
                            >
                              <i className="ri-delete-bin-line me-2"></i>
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}

                      {lot.poItems.length === 0 && (
                        <p className="text-xs text-gray-500">No PO items added. Click "Add PO Item" to add items.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                className="ti-btn ti-btn-primary w-full sm:ml-3 sm:w-auto"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <i className="ri-loader-4-line animate-spin me-2"></i>
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="ri-check-line me-2"></i>
                    Update Order
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="ti-btn ti-btn-light mt-3 sm:mt-0 w-full sm:w-auto"
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderReceivedPage;

