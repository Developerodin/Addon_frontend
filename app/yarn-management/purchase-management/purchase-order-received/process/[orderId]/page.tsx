"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import yarnPurchaseOrderService, { PurchaseOrderStatus } from "@/shared/services/yarnPurchaseOrderService";
import yarnBoxService, { YarnBox, UpdateYarnBoxPayload } from "@/shared/services/yarnBoxService";

interface ReceivedItem {
  id: string;
  yarnCode: string;
  yarnName: string;
  sizeCount: string;
  shadeCode: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitPrice: number;
  totalPrice: number;
  qualityStatus: 'Approved' | 'Rejected' | 'Pending';
}

interface ReceivedLotDetail {
  lotNumber: string;
  numberOfCones: number;
  totalWeight: number;
  numberOfBoxes: number;
  status: 'lot_qc_pending' | 'lot_accepted' | 'lot_rejected';
}

interface ReceivedOrder {
  id: string;
  orderNumber: string;
  purchaseOrderNumber: string;
  supplier: string;
  receivedDate: string;
  receivedBy: string;
  status: PurchaseOrderStatus;
  totalAmount: number;
  items: ReceivedItem[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  packListDetails?: {
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
    'po_rejected': 'rejected',
    'po_accepted': 'po_accepted'
  };
  return statusMap[statusCode] || 'submitted to supplier';
};

// Helper function to map API response to ReceivedOrder format
const mapAPIOrderToReceivedOrder = (apiOrder: any): ReceivedOrder => {
  const poItems = apiOrder.poItems || apiOrder.items || apiOrder.orderItems || [];
  
  // Map receivedLotDetails if available
  const receivedLotDetails: ReceivedLotDetail[] | undefined = apiOrder.receivedLotDetails 
    ? apiOrder.receivedLotDetails.map((lot: any) => ({
        lotNumber: lot.lotNumber || lot.lot_number || '',
        numberOfCones: lot.numberOfCones || lot.number_of_cones || 0,
        totalWeight: lot.totalWeight || lot.total_weight || 0,
        numberOfBoxes: lot.numberOfBoxes || lot.number_of_boxes || 0,
        status: lot.status || 'lot_qc_pending' as 'lot_qc_pending' | 'lot_accepted' | 'lot_rejected'
      }))
    : undefined;
  
  return {
    id: apiOrder._id || apiOrder.id || '',
    orderNumber: apiOrder.poNumber || apiOrder.orderNumber || apiOrder.order_number || apiOrder.po_number || '',
    purchaseOrderNumber: apiOrder.poNumber || apiOrder.orderNumber || apiOrder.order_number || apiOrder.po_number || '',
    supplier: apiOrder.supplierName || apiOrder.supplier?.brandName || apiOrder.supplier?.name || apiOrder.supplier || '',
    receivedDate: apiOrder.createDate || apiOrder.orderDate || apiOrder.order_date || apiOrder.createdAt || new Date().toISOString(),
    receivedBy: apiOrder.receivedBy || apiOrder.received_by || apiOrder.updatedBy?.username || '',
    status: convertStatusFromAPI(apiOrder.currentStatus || apiOrder.status || apiOrder.status_code || 'in_transit'),
    totalAmount: apiOrder.total || apiOrder.totalAmount || apiOrder.total_amount || apiOrder.grandTotal || 0,
    items: poItems.map((item: any, index: number) => ({
      id: item._id || item.id || `${index}`,
      yarnCode: item.shadeCode || item.shade_code || item.shade || item.yarnCode || '',
      yarnName: item.yarnName || item.yarn?.yarnName || item.yarn_name || item.yarn?.name || '',
      sizeCount: item.sizeCount || item.size_count || item.countSize || '',
      shadeCode: item.shadeCode || item.shade_code || item.shade || '',
      orderedQuantity: item.quantity || 0,
      receivedQuantity: item.receivedQuantity || item.received_quantity || item.quantity || 0,
      unitPrice: item.rate || item.unitPrice || 0,
      totalPrice: item.subTotal || item.sub_total || (item.quantity * (item.rate || 0)) || 0,
      qualityStatus: item.qualityStatus || item.quality_status || 'Pending' as 'Approved' | 'Rejected' | 'Pending'
    })),
    notes: apiOrder.notes || apiOrder.remarks || '',
    createdAt: apiOrder.createDate || apiOrder.createdAt || apiOrder.created_at || new Date().toISOString(),
    updatedAt: apiOrder.lastUpdateDate || apiOrder.updatedAt || apiOrder.updated_at || new Date().toISOString(),
    packListDetails: (apiOrder.packListDetails || apiOrder.packlistDetails) ? {
      packingNumber: (apiOrder.packListDetails || apiOrder.packlistDetails)?.packingNumber || (apiOrder.packListDetails || apiOrder.packlistDetails)?.packing_number,
      trackingNumber: (apiOrder.packListDetails || apiOrder.packlistDetails)?.trackingNumber || (apiOrder.packListDetails || apiOrder.packlistDetails)?.tracking_number,
      courierName: (apiOrder.packListDetails || apiOrder.packlistDetails)?.courierName || (apiOrder.packListDetails || apiOrder.packlistDetails)?.courier_name,
      dispatchDate: (apiOrder.packListDetails || apiOrder.packlistDetails)?.dispatchDate || (apiOrder.packListDetails || apiOrder.packlistDetails)?.dispatch_date,
      estimatedDeliveryDate: (apiOrder.packListDetails || apiOrder.packlistDetails)?.estimatedDeliveryDate || (apiOrder.packListDetails || apiOrder.packlistDetails)?.estimated_delivery_date,
      expectedArrivalDate: (apiOrder.packListDetails || apiOrder.packlistDetails)?.expectedArrivalDate || (apiOrder.packListDetails || apiOrder.packlistDetails)?.expected_arrival_date,
      numberOfCones: (apiOrder.packListDetails || apiOrder.packlistDetails)?.numberOfCones || (apiOrder.packListDetails || apiOrder.packlistDetails)?.number_of_cones,
      numberOfBoxes: (apiOrder.packListDetails || apiOrder.packlistDetails)?.numberOfBoxes || (apiOrder.packListDetails || apiOrder.packlistDetails)?.number_of_boxes,
      totalWeight: (apiOrder.packListDetails || apiOrder.packListDetails)?.totalWeight || (apiOrder.packListDetails || apiOrder.packlistDetails)?.total_weight
    } : undefined,
    receivedLotDetails
  };
};

const ProcessOrderPage = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasSubPermission, isLoading } = useNavigation();
  const user = useSelector((state: any) => state.auth?.user);
  const orderId = params?.orderId as string;

  const [order, setOrder] = useState<ReceivedOrder | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [boxes, setBoxes] = useState<YarnBox[]>([]);
  const [isLoadingBoxes, setIsLoadingBoxes] = useState(false);
  const [activeBoxId, setActiveBoxId] = useState<string | null>(null);
  const [barcodeScanValue, setBarcodeScanValue] = useState<string>('');
  const [boxData, setBoxData] = useState<Record<string, {
    yarnName: string;
    shadeCode: string;
    orderQty: number;
    lotNumber: string;
    boxWeight: string;
    numberOfCones: string;
  }>>({});
  const [showProcessedModal, setShowProcessedModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<PurchaseOrderStatus | ''>('');
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);
  const [updatingBoxId, setUpdatingBoxId] = useState<string | null>(null);
  const [selectedBoxForDetails, setSelectedBoxForDetails] = useState<YarnBox | null>(null);
  const [isUpdatingOrderStatus, setIsUpdatingOrderStatus] = useState(false);
  const [lotData, setLotData] = useState<{
    poNumber: string;
    lotDetails: Array<{
      lotNumber: string;
      numberOfBoxes: number;
    }>;
  } | null>(null);

  // Check permission - allow if user has Purchase Management access
  const hasPurchaseManagement = hasSubPermission('/yarn-management', 'Purchase Management');
  const hasPurchaseOrderReceived = hasSubPermission('/yarn-management/purchase-management', 'Purchase Order Recevied');
  const hasPermission = hasPurchaseManagement || hasPurchaseOrderReceived;
  
  useEffect(() => {
    console.log('Process page - hasPurchaseManagement:', hasPurchaseManagement);
    console.log('Process page - hasPurchaseOrderReceived:', hasPurchaseOrderReceived);
    console.log('Process page - hasPermission:', hasPermission);
    console.log('Process page - isLoading:', isLoading);
    console.log('Process page - orderId from params:', orderId);
    console.log('Process page - params:', params);
  }, [hasPurchaseManagement, hasPurchaseOrderReceived, hasPermission, isLoading, orderId, params]);

  // Read lot data from query params
  useEffect(() => {
    const lotDataParam = searchParams?.get('lotData');
    if (lotDataParam) {
      try {
        const parsed = JSON.parse(lotDataParam);
        setLotData(parsed);
        console.log('Process page - Lot data received:', parsed);
      } catch (error) {
        console.error('Failed to parse lot data:', error);
      }
    }
  }, [searchParams]);

  // Reset selected status when modal opens
  useEffect(() => {
    if (showProcessedModal) {
      setSelectedStatus('');
      setIsSubmittingStatus(false);
    }
  }, [showProcessedModal]);

  // Fetch order from API
  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setIsLoadingOrder(false);
        return;
      }

      setIsLoadingOrder(true);
      try {
        console.log('Process page - fetching order with id:', orderId);
        const apiOrder = await yarnPurchaseOrderService.getPurchaseOrderById(orderId);
        console.log('Process page - API response:', apiOrder);
        
        const mappedOrder = mapAPIOrderToReceivedOrder(apiOrder);
        console.log('Process page - mapped order:', mappedOrder);
        
        setOrder(mappedOrder);
      } catch (error) {
        console.error('Process page - failed to fetch order:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to load order details');
        router.push('/yarn-management/purchase-management/purchase-order-received');
      } finally {
        setIsLoadingOrder(false);
      }
    };

    if (hasPermission && !isLoading) {
      fetchOrder();
    }
  }, [orderId, router, hasPermission, isLoading]);

  // Fetch boxes when order is loaded
  useEffect(() => {
    const fetchBoxes = async () => {
      if (!order?.orderNumber) return;

      setIsLoadingBoxes(true);
      try {
        const response = await yarnBoxService.getYarnBoxes({
          po_number: order.orderNumber
        });
        
        // Handle both array response and object with results
        let boxesData: YarnBox[] = [];
        if (Array.isArray(response)) {
          boxesData = response;
        } else if (response && typeof response === 'object' && 'results' in response) {
          boxesData = (response as any).results || [];
        } else if (response && typeof response === 'object') {
          boxesData = [response as YarnBox];
        }
        
        setBoxes(boxesData);
        
        // Initialize box data state
        const initialBoxData: Record<string, any> = {};
        boxesData.forEach((box) => {
          const boxId = box._id || box.id || box.boxId;
          if (boxId) {
            // Check if yarnName is a default placeholder (starts with "Yarn-PO-")
            const yarnName = box.yarnName && !box.yarnName.startsWith('Yarn-PO-') 
              ? box.yarnName 
              : '';
            
            initialBoxData[boxId] = {
              yarnName: yarnName,
              shadeCode: box.shadeCode || '',
              orderQty: box.orderQty || 0,
              lotNumber: box.lotNumber || '',
              boxWeight: box.boxWeight?.toString() || '',
              numberOfCones: box.numberOfCones?.toString() || ''
            };
          }
        });
        setBoxData(prev => ({ ...prev, ...initialBoxData }));
      } catch (error) {
        console.error('Failed to fetch boxes:', error);
        toast.error('Failed to load boxes');
      } finally {
        setIsLoadingBoxes(false);
      }
    };

    if (order?.orderNumber) {
      fetchBoxes();
    }
  }, [order?.orderNumber]);

  const getQualityStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'in transit': return 'bg-purple-100 text-purple-800';
      case 'partially delivered': return 'bg-yellow-100 text-yellow-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'QC pending': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'submitted to supplier': return 'bg-blue-100 text-blue-800';
      case 'stocked': return 'bg-emerald-100 text-emerald-800';
      case 'goods received': return 'bg-green-100 text-green-800';
      case 'goods partially received': return 'bg-yellow-100 text-yellow-800';
      case 'po_accepted': return 'bg-green-100 text-green-800';
      case 'po_rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get lot status by lot number
  const getLotStatus = (lotNumber: string): 'lot_qc_pending' | 'lot_accepted' | 'lot_rejected' | null => {
    if (!order?.receivedLotDetails || !lotNumber) return null;
    
    const normalizedLotNumber = lotNumber.trim().toUpperCase();
    const lot = order.receivedLotDetails.find(lot => {
      const receivedLotNumber = (lot.lotNumber || '').trim().toUpperCase();
      return receivedLotNumber === normalizedLotNumber;
    });
    
    return lot?.status || null;
  };

  // Get lot status display text and color
  const getLotStatusDisplay = (status: 'lot_qc_pending' | 'lot_accepted' | 'lot_rejected' | null) => {
    if (!status) return { text: 'Pending', color: 'bg-gray-100 text-gray-800' };
    
    switch (status) {
      case 'lot_qc_pending':
        return { text: 'QC Pending', color: 'bg-blue-100 text-blue-800' };
      case 'lot_accepted':
        return { text: 'Accepted', color: 'bg-green-100 text-green-800' };
      case 'lot_rejected':
        return { text: 'Rejected', color: 'bg-red-100 text-red-800' };
      default:
        return { text: 'Pending', color: 'bg-gray-100 text-gray-800' };
    }
  };

  // Handle barcode scan
  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && barcodeScanValue.trim()) {
      const scannedBarcode = barcodeScanValue.trim();
      const foundBox = boxes.find(box => box.barcode === scannedBarcode);
      
      if (foundBox) {
        const boxId = foundBox._id || foundBox.id || foundBox.boxId;
        setActiveBoxId(boxId);
        setBarcodeScanValue('');
        toast.success(`Box ${foundBox.boxId} activated`);
      } else {
        toast.error('Barcode not found');
        setBarcodeScanValue('');
      }
    }
  };

  // Get shade code for selected yarn name
  const getShadeCodeForYarn = (yarnName: string): string => {
    if (!order) return '';
    const item = order.items.find(item => item.yarnName === yarnName);
    return item?.shadeCode || '';
  };

  // Get order qty for selected yarn name
  const getOrderQtyForYarn = (yarnName: string): number => {
    if (!order) return 0;
    const item = order.items.find(item => item.yarnName === yarnName);
    return item?.orderedQuantity || 0;
  };

  // Handle yarn name change - auto-fill shade code and order qty
  const handleYarnNameChange = (boxId: string, yarnName: string) => {
    setBoxData(prev => ({
      ...prev,
      [boxId]: {
        ...prev[boxId],
        yarnName,
        shadeCode: getShadeCodeForYarn(yarnName),
        orderQty: getOrderQtyForYarn(yarnName)
      }
    }));
  };

  // Truncate ID/Barcode for display
  const truncateId = (id: string): string => {
    if (!id || id.length <= 7) return id;
    return `${id.substring(0, 4)}...${id.substring(id.length - 3)}`;
  };

  // Group boxes by lot number
  const boxesByLot = useMemo(() => {
    const grouped: Record<string, YarnBox[]> = {};
    const unassigned: YarnBox[] = [];

    boxes.forEach((box) => {
      const boxId = box._id || box.id || box.boxId;
      const data = boxData[boxId];
      const lotNumber = data?.lotNumber?.trim() || box.lotNumber?.trim() || '';

      if (lotNumber) {
        if (!grouped[lotNumber]) {
          grouped[lotNumber] = [];
        }
        grouped[lotNumber].push(box);
      } else {
        unassigned.push(box);
      }
    });

    // Sort lot numbers naturally (LOT1, LOT2, etc.)
    const sortedLots = Object.keys(grouped).sort((a, b) => {
      const aNum = parseInt(a.replace(/\D/g, '')) || 0;
      const bNum = parseInt(b.replace(/\D/g, '')) || 0;
      if (aNum !== bNum) return aNum - bNum;
      return a.localeCompare(b);
    });

    return { grouped, sortedLots, unassigned };
  }, [boxes, boxData]);

  // Check if all boxes have weight captured
  const areAllBoxesCompleted = useMemo(() => {
    if (boxes.length === 0) return false;
    
    return boxes.every((box) => {
      const boxId = box._id || box.id || box.boxId;
      const data = boxData[boxId];
      return data && 
             data.yarnName && 
             data.lotNumber && 
             data.boxWeight && 
             parseFloat(data.boxWeight) > 0 &&
             data.numberOfCones && 
             parseInt(data.numberOfCones) > 0;
    });
  }, [boxes, boxData]);

  // Convert status to API format
  const convertStatusToAPICode = (status: string): string => {
    const statusMap: Record<string, string> = {
      'goods_received': 'goods_received',
      'qc_pending': 'qc_pending',
      'po_rejected': 'po_rejected',
      'in transit': 'in_transit',
      'submitted to supplier': 'submitted_to_supplier',
      'delivered': 'delivered',
      'rejected': 'rejected',
      'QC pending': 'qc_pending',
      'partially delivered': 'partially_delivered',
      'stocked': 'stocked'
    };
    return statusMap[status] || status;
  };

  // Check if all boxes in a lot are completed
  const areAllBoxesInLotCompleted = (lotBoxes: YarnBox[]): boolean => {
    if (lotBoxes.length === 0) return false;
    
    return lotBoxes.every((box) => {
      const boxId = box._id || box.id || box.boxId;
      const data = boxData[boxId];
      return data && 
             data.yarnName && 
             data.lotNumber && 
             data.boxWeight && 
             parseFloat(data.boxWeight) > 0 &&
             data.numberOfCones && 
             parseInt(data.numberOfCones) > 0;
    });
  };

  // Handle sending lot for QC
  const handleSendLotForQC = async (lotNumber: string, lotBoxes: YarnBox[]) => {
    if (!order) {
      toast.error('Order information not available');
      return;
    }

    if (!areAllBoxesInLotCompleted(lotBoxes)) {
      toast.error(`All boxes in ${lotNumber} must be completed before sending for QC`);
      return;
    }

    setIsUpdatingOrderStatus(true);
    try {
      await yarnPurchaseOrderService.updateLotStatus(
        order.orderNumber,
        lotNumber,
        'lot_qc_pending'
      );

      toast.success(`Lot ${lotNumber} sent for QC successfully`);
      
      // Refresh order data
      const apiOrder = await yarnPurchaseOrderService.getPurchaseOrderById(orderId);
      const mappedOrder = mapAPIOrderToReceivedOrder(apiOrder);
      setOrder(mappedOrder);
    } catch (error) {
      console.error('Failed to send lot for QC:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send lot for QC');
    } finally {
      setIsUpdatingOrderStatus(false);
    }
  };

  // Handle rejecting lot
  const handleRejectLot = async (lotNumber: string, lotBoxes: YarnBox[]) => {
    if (!order) {
      toast.error('Order information not available');
      return;
    }

    if (!areAllBoxesInLotCompleted(lotBoxes)) {
      toast.error(`All boxes in ${lotNumber} must be completed before rejecting`);
      return;
    }

    const confirmReject = window.confirm(
      `Are you sure you want to reject Lot ${lotNumber}? This action will mark the lot as rejected.`
    );

    if (!confirmReject) return;

    setIsUpdatingOrderStatus(true);
    try {
      await yarnPurchaseOrderService.updateLotStatus(
        order.orderNumber,
        lotNumber,
        'lot_rejected'
      );

      toast.success(`Lot ${lotNumber} rejected successfully`);
      
      // Refresh order data
      const apiOrder = await yarnPurchaseOrderService.getPurchaseOrderById(orderId);
      const mappedOrder = mapAPIOrderToReceivedOrder(apiOrder);
      setOrder(mappedOrder);
    } catch (error) {
      console.error('Failed to reject lot:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reject lot');
    } finally {
      setIsUpdatingOrderStatus(false);
    }
  };

  // Update order status
  const handleUpdateOrderStatus = async (statusCode: 'goods_received' | 'qc_pending' | 'po_rejected', notes: string) => {
    if (!user || !user.id || !user.email) {
      toast.error('User information not available. Please login again.');
      return;
    }

    setIsUpdatingOrderStatus(true);
    try {
      // First, always update to goods_received if all boxes are completed
      if (areAllBoxesCompleted) {
        await yarnPurchaseOrderService.updatePurchaseOrderStatus(
          orderId,
          'goods received' as PurchaseOrderStatus,
          user.id,
          user.email,
          'All boxes processed and weight captured'
        );
      }

      // Then update to the target status if it's not goods_received
      if (statusCode !== 'goods_received') {
        const statusMap: Record<string, PurchaseOrderStatus> = {
          'qc_pending': 'QC pending',
          'po_rejected': 'rejected'
        };
        
        const targetStatus = statusMap[statusCode];
        if (targetStatus) {
          await yarnPurchaseOrderService.updatePurchaseOrderStatus(
            orderId,
            targetStatus,
            user.id,
            user.email,
            notes
          );
        }
      }

      toast.success(`Order status updated successfully`);
      
      // Refresh order data
      const apiOrder = await yarnPurchaseOrderService.getPurchaseOrderById(orderId);
      const mappedOrder = mapAPIOrderToReceivedOrder(apiOrder);
      setOrder(mappedOrder);
      
      // Navigate back to main page
      router.push('/yarn-management/purchase-management/purchase-order-received');
    } catch (error) {
      console.error('Failed to update order status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update order status');
    } finally {
      setIsUpdatingOrderStatus(false);
    }
  };

  // Update box data
  const handleUpdateBox = async (box: YarnBox) => {
    const boxId = box._id || box.id || box.boxId;
    if (!boxId) {
      toast.error('Box ID not found');
      return;
    }

    const data = boxData[boxId];
    if (!data) {
      toast.error('Box data not found');
      return;
    }

    if (!data.yarnName) {
      toast.error('Please select yarn name');
      return;
    }

    if (!data.lotNumber) {
      toast.error('Please enter lot number');
      return;
    }

    if (!data.boxWeight || parseFloat(data.boxWeight) <= 0) {
      toast.error('Please enter valid box weight');
      return;
    }

    if (!data.numberOfCones || parseFloat(data.numberOfCones) <= 0) {
      toast.error('Please enter valid number of cones');
      return;
    }

    setUpdatingBoxId(boxId);
    try {
      const payload: UpdateYarnBoxPayload = {
        yarnName: data.yarnName,
        shadeCode: data.shadeCode,
        orderQty: data.orderQty,
        lotNumber: data.lotNumber,
        boxWeight: parseFloat(data.boxWeight),
        numberOfCones: parseInt(data.numberOfCones)
      };

      // Use _id for API call if available, otherwise use boxId
      const apiBoxId = box._id || boxId;
      await yarnBoxService.updateYarnBox(apiBoxId, payload);
      toast.success(`Box ${box.boxId} updated successfully`);
      setActiveBoxId(null);
      
      // Refresh boxes
      if (order?.orderNumber) {
        const response = await yarnBoxService.getYarnBoxes({
          po_number: order.orderNumber
        });
        let boxesData: YarnBox[] = [];
        if (Array.isArray(response)) {
          boxesData = response;
        } else if (response && typeof response === 'object' && 'results' in response) {
          boxesData = (response as any).results || [];
        }
        setBoxes(boxesData);
        
        // Update box data state with refreshed data
        const updatedBoxData: Record<string, any> = {};
        boxesData.forEach((box) => {
          const refreshedBoxId = box._id || box.id || box.boxId;
          if (refreshedBoxId) {
            // Check if yarnName is a default placeholder (starts with "Yarn-PO-")
            const yarnName = box.yarnName && !box.yarnName.startsWith('Yarn-PO-') 
              ? box.yarnName 
              : '';
            
            updatedBoxData[refreshedBoxId] = {
              yarnName: yarnName,
              shadeCode: box.shadeCode || '',
              orderQty: box.orderQty || 0,
              lotNumber: box.lotNumber || '',
              boxWeight: box.boxWeight?.toString() || '',
              numberOfCones: box.numberOfCones?.toString() || ''
            };
          }
        });
        setBoxData(prev => ({ ...prev, ...updatedBoxData }));
        
        // Check if all boxes are now completed and auto-update status to goods_received
        const allCompleted = boxesData.every((b) => {
          const bId = b._id || b.id || b.boxId;
          const bData = updatedBoxData[bId] || {};
          return bData.yarnName && 
                 bData.lotNumber && 
                 bData.boxWeight && 
                 parseFloat(bData.boxWeight) > 0 &&
                 bData.numberOfCones && 
                 parseInt(bData.numberOfCones) > 0;
        });

        if (allCompleted && user && user.id && user.email) {
          // Auto-update to goods_received when all boxes are completed
          try {
            await yarnPurchaseOrderService.updatePurchaseOrderStatus(
              orderId,
              'goods received' as PurchaseOrderStatus,
              user.id,
              user.email,
              'All boxes processed and weight captured'
            );
            // Refresh order to get updated status
            const apiOrder = await yarnPurchaseOrderService.getPurchaseOrderById(orderId);
            const mappedOrder = mapAPIOrderToReceivedOrder(apiOrder);
            setOrder(mappedOrder);
            toast.success('All boxes completed! Order status updated to Goods Received');
          } catch (error) {
            console.error('Failed to auto-update status to goods_received:', error);
            // Don't show error toast for auto-update, just log it
          }
        }
      }
    } catch (error) {
      console.error('Failed to update box:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update box');
    } finally {
      setUpdatingBoxId(null);
    }
  };

  const handlePrintAllBarcodes = () => {
    if (!order || boxes.length === 0) {
      toast.error('No boxes available to print');
      return;
    }
    
    // Create a print-friendly HTML with all box barcodes grouped by lot
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print barcodes');
      return;
    }

    // Build lot-wise barcode sections
    const lotSections = boxesByLot.sortedLots.map((lotNumber) => {
      const lotBoxes = boxesByLot.grouped[lotNumber];
      return `
        <div class="lot-section" style="page-break-after: always; margin-bottom: 40px;">
          <h3 class="lot-header" style="background: #f0f0f0; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
            <i class="ri-box-3-line"></i> Lot Number: ${lotNumber} (${lotBoxes.length} boxes)
          </h3>
          <div class="barcode-container">
            ${lotBoxes.map((box) => {
              return `
                <div class="barcode-item">
                  <div class="barcode-label">Box ID</div>
                  <div class="box-info" style="font-weight: bold; margin-bottom: 10px;">${box.boxId}</div>
                  <div class="barcode-label">Barcode</div>
                  <div class="barcode-value">${box.barcode}</div>
                  <div class="box-info" style="margin-top: 5px; color: #666;">Lot: ${lotNumber}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    // Add unassigned boxes section if any
    const unassignedSection = boxesByLot.unassigned.length > 0 ? `
      <div class="lot-section" style="page-break-after: always; margin-bottom: 40px;">
        <h3 class="lot-header" style="background: #fff3cd; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
          <i class="ri-error-warning-line"></i> Unassigned Boxes (${boxesByLot.unassigned.length} boxes)
        </h3>
        <div class="barcode-container">
          ${boxesByLot.unassigned.map((box) => {
            return `
              <div class="barcode-item">
                <div class="barcode-label">Box ID</div>
                <div class="box-info" style="font-weight: bold; margin-bottom: 10px;">${box.boxId}</div>
                <div class="barcode-label">Barcode</div>
                <div class="barcode-value">${box.barcode}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    ` : '';

    const barcodeHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcodes - ${order.orderNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }
            .header-info {
              background: #e9ecef;
              padding: 15px;
              margin-bottom: 20px;
              border-radius: 5px;
            }
            .lot-section {
              margin-bottom: 40px;
            }
            .lot-header {
              background: #f0f0f0;
              padding: 15px;
              margin-bottom: 20px;
              border-radius: 5px;
              font-size: 18px;
              font-weight: bold;
            }
            .barcode-container {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin-top: 20px;
            }
            .barcode-item {
              border: 1px solid #ddd;
              padding: 15px;
              text-align: center;
              page-break-inside: avoid;
            }
            .barcode-label {
              font-size: 12px;
              color: #666;
              margin-bottom: 5px;
            }
            .barcode-value {
              font-family: 'Courier New', monospace;
              font-size: 18px;
              font-weight: bold;
              margin: 10px 0;
              padding: 10px;
              background: #f5f5f5;
              border: 1px dashed #ccc;
            }
            .box-info {
              font-size: 11px;
              color: #333;
              margin-top: 5px;
            }
            @media print {
              .barcode-container {
                grid-template-columns: repeat(3, 1fr);
              }
              .lot-section {
                page-break-after: always;
              }
              .lot-section:last-child {
                page-break-after: auto;
              }
            }
          </style>
        </head>
        <body>
          <div class="header-info">
            <h2 style="margin: 0 0 10px 0;">Box Barcodes - ${order.orderNumber}</h2>
            <p style="margin: 0;">PO Number: ${order.purchaseOrderNumber} | Supplier: ${order.supplier} | Total Boxes: ${boxes.length}</p>
          </div>
          ${lotSections}
          ${unassignedSection}
        </body>
      </html>
    `;

    printWindow.document.write(barcodeHTML);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
      toast.success(`${boxes.length} box barcode(s) printed successfully (grouped by lot)`);
    }, 250);
  };

  // Show loading state while permissions are being loaded
  if (isLoading || isLoadingOrder) {
    return (
      <div className="main-content">
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Temporarily allow access for debugging - remove permission check
  // if (!hasPermission) {
  //   return (
  //     <div className="main-content">
  //       <div className="text-center py-12">
  //         <div className="text-gray-400 mb-4">
  //           <i className="ri-lock-line text-6xl"></i>
  //         </div>
  //         <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
  //         <p className="text-gray-500 mb-4">You don't have permission to access Purchase Order Received.</p>
  //         <Link href="/yarn-management" className="ti-btn ti-btn-primary">
  //           <i className="ri-arrow-left-line me-2"></i>
  //           Back to Yarn Management
  //         </Link>
  //       </div>
  //     </div>
  //   );
  // }

  if (!order) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-error-warning-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Order Not Found</h3>
          <Link href="/yarn-management/purchase-management/purchase-order-received" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Received Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Seo title={`Process Order - ${order.orderNumber}`} />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* PO Details Section */}
          <div className="box mb-6">
            <div className="box-header flex justify-between items-center">
              <div className="flex items-center gap-2">
                  <Link
                    href="/yarn-management/purchase-management/purchase-order-received"
                    className="text-gray-500 hover:text-gray-700"
                  title="Back to received orders"
                  >
                  <i className="ri-arrow-left-line text-lg"></i>
                  </Link>
                <h3 className="box-title text-base">
                <i className="ri-file-text-line me-2"></i>
                Purchase Order Details
              </h3>
              </div>
            </div>
            <div className="box-body">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 py-2">
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-0.5">PO Number</p>
                  <p className="text-sm font-semibold text-gray-900">{order.purchaseOrderNumber}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-0.5">Supplier</p>
                  <p className="text-sm font-semibold text-gray-900">{order.supplier}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-0.5">Received Date</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(order.receivedDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-0.5">Status</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-0.5">Total Amount</p>
                  <p className="text-sm font-semibold text-gray-900">₹{order.totalAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-0.5">Total Items</p>
                  <p className="text-sm font-semibold text-gray-900">{order.items.length}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-0.5">Total Quantity</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {order.items.reduce((sum, item) => sum + item.orderedQuantity, 0).toLocaleString()} kg
                  </p>
                </div>
                {order.packListDetails?.numberOfBoxes && (
                  <div>
                    <p className="text-xs uppercase text-gray-500 mb-0.5">Total Boxes</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {order.packListDetails.numberOfBoxes}
                    </p>
                  </div>
                )}
                {order.packListDetails?.numberOfCones && (
                  <div>
                    <p className="text-xs uppercase text-gray-500 mb-0.5">Total Cones</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {order.packListDetails.numberOfCones}
                    </p>
                  </div>
                )}
                {order.packListDetails?.totalWeight && (
                  <div>
                    <p className="text-xs uppercase text-gray-500 mb-0.5">Total Weight</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {order.packListDetails.totalWeight} kg
                    </p>
                  </div>
                )}
              </div>
              {order.notes && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs uppercase text-gray-500 mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{order.notes}</p>
                </div>
              )}
            </div>
                    </div>

          {/* Boxes Table */}
          <div className="box">
            <div className="box-header flex justify-between items-center">
              <h3 className="box-title">
                <i className="ri-box-3-line me-2"></i>
                Boxes ({boxes.length} boxes)
              </h3>
              {boxes.length > 0 && (
                    <button
                  type="button"
                  onClick={handlePrintAllBarcodes}
                  className="ti-btn ti-btn-primary"
                  title="Print all box barcodes"
                >
                  <i className="ri-printer-line me-2"></i>
                  Print All Barcodes
                    </button>
              )}
                  </div>
            <div className="box-body">
              {/* Barcode Scanner Input */}
              <div className="mb-4">
                <label className="form-label">Scan Barcode</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Scan or enter barcode to activate row"
                  value={barcodeScanValue}
                  onChange={(e) => setBarcodeScanValue(e.target.value)}
                  onKeyDown={handleBarcodeScan}
                  autoFocus
                />
                </div>

              {isLoadingBoxes ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading boxes...</p>
              </div>
              ) : boxes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No boxes found for this order</p>
              </div>
              ) : (
              <div className="space-y-6">
                {/* Render boxes grouped by lot */}
                {boxesByLot.sortedLots.map((lotNumber) => {
                  const lotBoxes = boxesByLot.grouped[lotNumber];
                  const handlePrintLotBarcodes = () => {
                    if (!order || lotBoxes.length === 0) {
                      toast.error('No boxes available to print');
                      return;
                    }
                    
                    const printWindow = window.open('', '_blank');
                    if (!printWindow) {
                      toast.error('Please allow popups to print barcodes');
                      return;
                    }

                    const barcodeHTML = `
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <title>Print Barcodes - ${order.orderNumber} - ${lotNumber}</title>
                          <style>
                            body {
                              font-family: Arial, sans-serif;
                              padding: 20px;
                            }
                            .header-info {
                              background: #e9ecef;
                              padding: 15px;
                              margin-bottom: 20px;
                              border-radius: 5px;
                            }
                            .lot-header {
                              background: #f0f0f0;
                              padding: 15px;
                              margin-bottom: 20px;
                              border-radius: 5px;
                              font-size: 18px;
                              font-weight: bold;
                            }
                            .barcode-container {
                              display: grid;
                              grid-template-columns: repeat(3, 1fr);
                              gap: 20px;
                              margin-top: 20px;
                            }
                            .barcode-item {
                              border: 1px solid #ddd;
                              padding: 15px;
                              text-align: center;
                              page-break-inside: avoid;
                            }
                            .barcode-label {
                              font-size: 12px;
                              color: #666;
                              margin-bottom: 5px;
                            }
                            .barcode-value {
                              font-family: 'Courier New', monospace;
                              font-size: 18px;
                              font-weight: bold;
                              margin: 10px 0;
                              padding: 10px;
                              background: #f5f5f5;
                              border: 1px dashed #ccc;
                            }
                            .box-info {
                              font-size: 11px;
                              color: #333;
                              margin-top: 5px;
                            }
                            @media print {
                              .barcode-container {
                                grid-template-columns: repeat(3, 1fr);
                              }
                            }
                          </style>
                        </head>
                        <body>
                          <div class="header-info">
                            <h2 style="margin: 0 0 10px 0;">Box Barcodes - ${order.orderNumber}</h2>
                            <p style="margin: 0;">PO Number: ${order.purchaseOrderNumber} | Supplier: ${order.supplier}</p>
                          </div>
                          <div class="lot-header">
                            <i class="ri-box-3-line"></i> Lot Number: ${lotNumber} (${lotBoxes.length} boxes)
                          </div>
                          <div class="barcode-container">
                            ${lotBoxes.map((box) => {
                              return `
                                <div class="barcode-item">
                                  <div class="barcode-label">Box ID</div>
                                  <div class="box-info" style="font-weight: bold; margin-bottom: 10px;">${box.boxId}</div>
                                  <div class="barcode-label">Barcode</div>
                                  <div class="barcode-value">${box.barcode}</div>
                                  <div class="box-info" style="margin-top: 5px; color: #666;">Lot: ${lotNumber}</div>
                                </div>
                              `;
                            }).join('')}
                          </div>
                        </body>
                      </html>
                    `;

                    printWindow.document.write(barcodeHTML);
                    printWindow.document.close();
                    
                    setTimeout(() => {
                      printWindow.print();
                      toast.success(`${lotBoxes.length} box barcode(s) printed for ${lotNumber}`);
                    }, 250);
                  };

                  const isLotCompleted = areAllBoxesInLotCompleted(lotBoxes);

                  const lotStatus = getLotStatus(lotNumber);
                  const lotStatusDisplay = getLotStatusDisplay(lotStatus);

                  // Debug logging
                  if (process.env.NODE_ENV === 'development') {
                    console.log(`Lot ${lotNumber} status:`, lotStatus, 'from receivedLotDetails:', order?.receivedLotDetails);
                  }

                  return (
                    <div key={lotNumber} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-primary/10 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
                          <i className="ri-box-3-line text-primary"></i>
                          <span>Lot Number: <span className="text-primary font-bold">{lotNumber}</span></span>
                          {lotStatus && (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${lotStatusDisplay.color}`}>
                              <i className={`ri-${
                                lotStatus === 'lot_qc_pending' ? 'time-line' : 
                                lotStatus === 'lot_accepted' ? 'check-line' : 
                                'close-line'
                              }`}></i>
                              {lotStatusDisplay.text}
                            </span>
                          )}
                          <span className="text-xs font-normal text-gray-600 ml-2">
                            ({lotBoxes.length} {lotBoxes.length === 1 ? 'box' : 'boxes'})
                          </span>
                        </h4>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handlePrintLotBarcodes}
                            className="ti-btn ti-btn-sm ti-btn-primary"
                            title={`Print barcodes for ${lotNumber}`}
                          >
                            <i className="ri-printer-line me-1"></i>
                            Print Lot Barcodes
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendLotForQC(lotNumber, lotBoxes)}
                            disabled={!isLotCompleted || isUpdatingOrderStatus}
                            className={`ti-btn ti-btn-sm ${
                              isLotCompleted && !isUpdatingOrderStatus
                                ? 'ti-btn-success'
                                : 'ti-btn-light opacity-50 cursor-not-allowed'
                            }`}
                            title={`Send ${lotNumber} for QC`}
                          >
                            {isUpdatingOrderStatus ? (
                              <>
                                <i className="ri-loader-4-line animate-spin me-1"></i>
                                Sending...
                              </>
                            ) : (
                              <>
                                <i className="ri-checkbox-circle-line me-1"></i>
                                Send Lot for QC
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectLot(lotNumber, lotBoxes)}
                            disabled={!isLotCompleted || isUpdatingOrderStatus}
                            className={`ti-btn ti-btn-sm ${
                              isLotCompleted && !isUpdatingOrderStatus
                                ? 'ti-btn-danger'
                                : 'ti-btn-light opacity-50 cursor-not-allowed'
                            }`}
                            title={`Reject ${lotNumber}`}
                          >
                            {isUpdatingOrderStatus ? (
                              <>
                                <i className="ri-loader-4-line animate-spin me-1"></i>
                                Rejecting...
                              </>
                            ) : (
                              <>
                                <i className="ri-close-circle-line me-1"></i>
                                Reject Lot
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse border border-gray-300">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="border border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Box ID</th>
                              <th className="border border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Barcode</th>
                              <th className="border border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Yarn Name</th>
                              <th className="border border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shade Code</th>
                              <th className="border border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Qty</th>
                              <th className="border border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lot Number</th>
                              <th className="border border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Box Weight (kg)</th>
                              <th className="border border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. of Cones</th>
                              <th className="border border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {lotBoxes.map((box) => {
                        const boxId = box._id || box.id || box.boxId;
                        const isActive = activeBoxId === boxId;
                        // Check if yarnName is a default placeholder (starts with "Yarn-PO-")
                        const defaultYarnName = box.yarnName && !box.yarnName.startsWith('Yarn-PO-') 
                          ? box.yarnName 
                          : '';
                        
                        const data = boxData[boxId] || {
                          yarnName: defaultYarnName,
                          shadeCode: box.shadeCode || '',
                          orderQty: box.orderQty || 0,
                          lotNumber: box.lotNumber || '',
                          boxWeight: box.boxWeight?.toString() || '',
                          numberOfCones: box.numberOfCones?.toString() || ''
                        };
                        const isUpdating = updatingBoxId === boxId;

                      return (
                      <tr 
                            key={boxId}
                            className={`hover:bg-gray-50 ${
                              isActive ? 'bg-blue-50 border-2 border-blue-400' : ''
                            }`}
                          >
                            <td className="border border-gray-300 px-4 py-3">
                              <button
                                onClick={() => setSelectedBoxForDetails(box)}
                                className="text-sm font-medium text-primary hover:text-primary-dark hover:underline cursor-pointer"
                                title="Click to view full details"
                              >
                                {truncateId(box.boxId)}
                              </button>
                        </td>
                            <td className="border border-gray-300 px-4 py-3">
                              <button
                                onClick={() => setSelectedBoxForDetails(box)}
                                className="text-sm text-gray-900 font-mono text-primary hover:text-primary-dark hover:underline cursor-pointer"
                                title="Click to view full details"
                              >
                                {truncateId(box.barcode)}
                              </button>
                            </td>
                            <td className="border border-gray-300 px-4 py-3">
                              {isActive ? (
                                <select
                                  className="form-select text-sm"
                                  value={data.yarnName}
                                  onChange={(e) => handleYarnNameChange(boxId, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const nextInput = (e.target as HTMLElement).parentElement?.nextElementSibling?.querySelector('input');
                                      if (nextInput) {
                                        (nextInput as HTMLInputElement).focus();
                                      }
                                    }
                                  }}
                                >
                                  <option value="">Select Yarn Name</option>
                                  {order?.items.map((item) => (
                                    <option key={item.id} value={item.yarnName}>
                          {item.yarnName}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-sm text-gray-900">{data.yarnName || '-'}</span>
                              )}
                        </td>
                            <td className="border border-gray-300 px-4 py-3">
                              {isActive ? (
                                <input
                                  type="text"
                                  className="form-control text-sm"
                                  value={data.shadeCode}
                                  readOnly
                                  tabIndex={-1}
                                />
                              ) : (
                                <span className="text-sm text-gray-900">{data.shadeCode || '-'}</span>
                              )}
                        </td>
                            <td className="border border-gray-300 px-4 py-3">
                              {isActive ? (
                                <input
                                  type="number"
                                  className="form-control text-sm"
                                  value={data.orderQty}
                                  readOnly
                                  tabIndex={-1}
                                />
                              ) : (
                                <span className="text-sm text-gray-900">{data.orderQty || '-'}</span>
                              )}
                        </td>
                            <td className="border border-gray-300 px-4 py-3">
                              {isActive ? (
                                <input
                                  type="text"
                                  className="form-control text-sm"
                                  value={data.lotNumber}
                                  onChange={(e) => {
                                    setBoxData(prev => ({
                                      ...prev,
                                      [boxId]: { ...prev[boxId], lotNumber: e.target.value }
                                    }));
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const nextInput = (e.target as HTMLElement).parentElement?.nextElementSibling?.querySelector('input');
                                      if (nextInput) {
                                        (nextInput as HTMLInputElement).focus();
                                      }
                                    }
                                  }}
                                  placeholder="Enter lot number"
                                />
                              ) : (
                                <span className="text-sm text-gray-900">{data.lotNumber || '-'}</span>
                          )}
                        </td>
                            <td className="border border-gray-300 px-4 py-3">
                              {isActive ? (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                                  className="form-control text-sm"
                                  value={data.boxWeight}
                                  onChange={(e) => {
                                    setBoxData(prev => ({
                                      ...prev,
                                      [boxId]: { ...prev[boxId], boxWeight: e.target.value }
                                    }));
                                  }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const nextInput = (e.target as HTMLElement).parentElement?.nextElementSibling?.querySelector('input');
                                      if (nextInput) {
                                        (nextInput as HTMLInputElement).focus();
                                      }
                                    }
                                  }}
                              placeholder="0.00"
                            />
                          ) : (
                                <span className="text-sm text-gray-900">{data.boxWeight || '-'}</span>
                              )}
                            </td>
                            <td className="border border-gray-300 px-4 py-3">
                              {isActive ? (
                                <input
                                  type="number"
                                  min="0"
                                  className="form-control text-sm"
                                  value={data.numberOfCones}
                                  onChange={(e) => {
                                    setBoxData(prev => ({
                                      ...prev,
                                      [boxId]: { ...prev[boxId], numberOfCones: e.target.value }
                                    }));
                                  }}
                                  onKeyDown={async (e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      await handleUpdateBox(box);
                                    }
                                  }}
                                  placeholder="0"
                                />
                              ) : (
                                <span className="text-sm text-gray-900">{data.numberOfCones || '-'}</span>
                              )}
                            </td>
                            <td className="border border-gray-300 px-4 py-3">
                              {isUpdating ? (
                                <div className="flex items-center gap-2">
                                  <i className="ri-loader-4-line animate-spin text-primary"></i>
                                  <span className="text-xs text-gray-500">Updating...</span>
                                </div>
                              ) : isActive ? (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                  Active
                                </span>
                              ) : data.yarnName && data.lotNumber && data.boxWeight && data.numberOfCones ? (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  Completed
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                  Pending
                            </span>
                          )}
                        </td>
                          </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
                })}

                {/* Unassigned boxes section */}
                {boxesByLot.unassigned.length > 0 && (
                  <div className="border border-yellow-200 rounded-lg overflow-hidden bg-yellow-50/30">
                    <div className="bg-yellow-100 px-4 py-3 border-b border-yellow-200">
                      <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <i className="ri-error-warning-line text-yellow-600"></i>
                        Unassigned Boxes
                        <span className="text-xs font-normal text-gray-600 ml-2">
                          ({boxesByLot.unassigned.length} {boxesByLot.unassigned.length === 1 ? 'box' : 'boxes'} - Please assign lot numbers)
                        </span>
                      </h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse border border-gray-300">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="border border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Box ID</th>
                            <th className="border border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Barcode</th>
                            <th className="border border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Yarn Name</th>
                            <th className="border border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shade Code</th>
                            <th className="border border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Qty</th>
                            <th className="border border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lot Number</th>
                            <th className="border border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Box Weight (kg)</th>
                            <th className="border border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. of Cones</th>
                            <th className="border border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {boxesByLot.unassigned.map((box) => {
                            const boxId = box._id || box.id || box.boxId;
                            const isActive = activeBoxId === boxId;
                            const defaultYarnName = box.yarnName && !box.yarnName.startsWith('Yarn-PO-') 
                              ? box.yarnName 
                              : '';
                            
                            const data = boxData[boxId] || {
                              yarnName: defaultYarnName,
                              shadeCode: box.shadeCode || '',
                              orderQty: box.orderQty || 0,
                              lotNumber: box.lotNumber || '',
                              boxWeight: box.boxWeight?.toString() || '',
                              numberOfCones: box.numberOfCones?.toString() || ''
                            };
                            const isUpdating = updatingBoxId === boxId;

                            return (
                              <tr 
                                key={boxId}
                                className={`hover:bg-gray-50 ${
                                  isActive ? 'bg-blue-50 border-2 border-blue-400' : ''
                                }`}
                              >
                                <td className="border border-gray-300 px-4 py-3">
                                  <button
                                    onClick={() => setSelectedBoxForDetails(box)}
                                    className="text-sm font-medium text-primary hover:text-primary-dark hover:underline cursor-pointer"
                                    title="Click to view full details"
                                  >
                                    {truncateId(box.boxId)}
                                  </button>
                                </td>
                                <td className="border border-gray-300 px-4 py-3">
                                  <button
                                    onClick={() => setSelectedBoxForDetails(box)}
                                    className="text-sm text-gray-900 font-mono text-primary hover:text-primary-dark hover:underline cursor-pointer"
                                    title="Click to view full details"
                                  >
                                    {truncateId(box.barcode)}
                                  </button>
                                </td>
                                <td className="border border-gray-300 px-4 py-3">
                                  {isActive ? (
                                    <select
                                      className="form-select text-sm"
                                      value={data.yarnName}
                                      onChange={(e) => handleYarnNameChange(boxId, e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          const nextInput = (e.target as HTMLElement).parentElement?.nextElementSibling?.querySelector('input');
                                          if (nextInput) {
                                            (nextInput as HTMLInputElement).focus();
                                          }
                                        }
                                      }}
                                    >
                                      <option value="">Select Yarn Name</option>
                                      {order?.items.map((item) => (
                                        <option key={item.id} value={item.yarnName}>
                                          {item.yarnName}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="text-sm text-gray-900">{data.yarnName || '-'}</span>
                                  )}
                                </td>
                                <td className="border border-gray-300 px-4 py-3">
                                  {isActive ? (
                                    <input
                                      type="text"
                                      className="form-control text-sm"
                                      value={data.shadeCode}
                                      readOnly
                                      tabIndex={-1}
                                    />
                                  ) : (
                                    <span className="text-sm text-gray-900">{data.shadeCode || '-'}</span>
                                  )}
                                </td>
                                <td className="border border-gray-300 px-4 py-3">
                                  {isActive ? (
                                    <input
                                      type="number"
                                      className="form-control text-sm"
                                      value={data.orderQty}
                                      readOnly
                                      tabIndex={-1}
                                    />
                                  ) : (
                                    <span className="text-sm text-gray-900">{data.orderQty || '-'}</span>
                                  )}
                                </td>
                                <td className="border border-gray-300 px-4 py-3">
                                  {isActive ? (
                                    <input
                                      type="text"
                                      className="form-control text-sm border-yellow-300 focus:border-yellow-500"
                                      value={data.lotNumber}
                                      onChange={(e) => {
                                        setBoxData(prev => ({
                                          ...prev,
                                          [boxId]: { ...prev[boxId], lotNumber: e.target.value }
                                        }));
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          const nextInput = (e.target as HTMLElement).parentElement?.nextElementSibling?.querySelector('input');
                                          if (nextInput) {
                                            (nextInput as HTMLInputElement).focus();
                                          }
                                        }
                                      }}
                                      placeholder="Enter lot number"
                                    />
                                  ) : (
                                    <span className="text-sm text-yellow-600 font-medium">{data.lotNumber || 'Not assigned'}</span>
                                  )}
                                </td>
                                <td className="border border-gray-300 px-4 py-3">
                                  {isActive ? (
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      className="form-control text-sm"
                                      value={data.boxWeight}
                                      onChange={(e) => {
                                        setBoxData(prev => ({
                                          ...prev,
                                          [boxId]: { ...prev[boxId], boxWeight: e.target.value }
                                        }));
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          const nextInput = (e.target as HTMLElement).parentElement?.nextElementSibling?.querySelector('input');
                                          if (nextInput) {
                                            (nextInput as HTMLInputElement).focus();
                                          }
                                        }
                                      }}
                                      placeholder="0.00"
                                    />
                                  ) : (
                                    <span className="text-sm text-gray-900">{data.boxWeight || '-'}</span>
                                  )}
                                </td>
                                <td className="border border-gray-300 px-4 py-3">
                                  {isActive ? (
                                    <input
                                      type="number"
                                      min="0"
                                      className="form-control text-sm"
                                      value={data.numberOfCones}
                                      onChange={(e) => {
                                        setBoxData(prev => ({
                                          ...prev,
                                          [boxId]: { ...prev[boxId], numberOfCones: e.target.value }
                                        }));
                                      }}
                                      onKeyDown={async (e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          await handleUpdateBox(box);
                                        }
                                      }}
                                      placeholder="0"
                                    />
                                  ) : (
                                    <span className="text-sm text-gray-900">{data.numberOfCones || '-'}</span>
                                  )}
                                </td>
                                <td className="border border-gray-300 px-4 py-3">
                                  {isUpdating ? (
                                    <div className="flex items-center gap-2">
                                      <i className="ri-loader-4-line animate-spin text-primary"></i>
                                      <span className="text-xs text-gray-500">Updating...</span>
                                    </div>
                                  ) : isActive ? (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                      Active
                                    </span>
                                  ) : data.yarnName && data.lotNumber && data.boxWeight && data.numberOfCones ? (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                      Completed
                                    </span>
                                  ) : (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                      Pending
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Box Details Modal */}
      {selectedBoxForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <i className="ri-information-line text-primary"></i>
                  Box Details
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Full information for {selectedBoxForDetails.boxId}
                </p>
              </div>
                            <button
                onClick={() => setSelectedBoxForDetails(null)}
                className="text-gray-400 hover:text-gray-600 transition"
                aria-label="Close modal"
              >
                <i className="ri-close-line text-xl"></i>
                            </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 uppercase">Box ID</label>
                  <div className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded border">
                    {selectedBoxForDetails.boxId}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 uppercase">Barcode</label>
                  <div className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded border">
                    {selectedBoxForDetails.barcode}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 uppercase">PO Number</label>
                  <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                    {selectedBoxForDetails.poNumber}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 uppercase">Yarn Name</label>
                  <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                    {(() => {
                      const boxId = selectedBoxForDetails._id || selectedBoxForDetails.id || selectedBoxForDetails.boxId;
                      return boxData[boxId]?.yarnName || selectedBoxForDetails.yarnName || '-';
                    })()}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 uppercase">Shade Code</label>
                  <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                    {(() => {
                      const boxId = selectedBoxForDetails._id || selectedBoxForDetails.id || selectedBoxForDetails.boxId;
                      return boxData[boxId]?.shadeCode || selectedBoxForDetails.shadeCode || '-';
                    })()}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 uppercase">Order Qty</label>
                  <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                    {(() => {
                      const boxId = selectedBoxForDetails._id || selectedBoxForDetails.id || selectedBoxForDetails.boxId;
                      return boxData[boxId]?.orderQty || selectedBoxForDetails.orderQty || 0;
                    })()}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 uppercase">Lot Number</label>
                  <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                    {(() => {
                      const boxId = selectedBoxForDetails._id || selectedBoxForDetails.id || selectedBoxForDetails.boxId;
                      return boxData[boxId]?.lotNumber || selectedBoxForDetails.lotNumber || '-';
                    })()}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 uppercase">Box Weight (kg)</label>
                  <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                    {(() => {
                      const boxId = selectedBoxForDetails._id || selectedBoxForDetails.id || selectedBoxForDetails.boxId;
                      return boxData[boxId]?.boxWeight || selectedBoxForDetails.boxWeight || '-';
                    })()}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 uppercase">Number of Cones</label>
                  <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                    {(() => {
                      const boxId = selectedBoxForDetails._id || selectedBoxForDetails.id || selectedBoxForDetails.boxId;
                      return boxData[boxId]?.numberOfCones || selectedBoxForDetails.numberOfCones || '-';
                    })()}
                  </div>
                </div>
                {selectedBoxForDetails.receivedDate && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase">Received Date</label>
                    <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                      {new Date(selectedBoxForDetails.receivedDate).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {selectedBoxForDetails.orderDate && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase">Order Date</label>
                    <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                      {new Date(selectedBoxForDetails.orderDate).toLocaleDateString()}
              </div>
            </div>
                )}
                {selectedBoxForDetails.conesIssued !== undefined && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase">Cones Issued</label>
                    <div className="mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedBoxForDetails.conesIssued 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedBoxForDetails.conesIssued ? 'Yes' : 'No'}
                      </span>
          </div>
                  </div>
                )}
        </div>
      </div>

            <div className="border-t border-gray-100 px-6 py-4 flex justify-end">
              <button
                type="button"
                className="ti-btn ti-btn-light"
                onClick={() => setSelectedBoxForDetails(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All Items Processed Modal */}
      {showProcessedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                  <i className="ri-checkbox-circle-line text-4xl text-green-600"></i>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  All Items Processed
                </h3>
                <p className="text-sm text-gray-600">
                  All items have been weighed and processed successfully. Please select the next status.
                </p>
              </div>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="form-label">
                    Update Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as PurchaseOrderStatus | '')}
                    className="form-select"
                    disabled={isSubmittingStatus}
                  >
                    <option value="">Select status...</option>
                    <option value="QC pending">Send for QC</option>
                    <option value="rejected">Reject</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowProcessedModal(false);
                    setSelectedStatus('');
                  }}
                  className="ti-btn ti-btn-light"
                  disabled={isSubmittingStatus}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!selectedStatus) {
                      toast.error('Please select a status');
                      return;
                    }

                    setIsSubmittingStatus(true);
                    try {
                      if (!user || !user.id || !user.email) {
                        toast.error('User information not available. Please login again.');
                        setIsSubmittingStatus(false);
                        return;
                      }

                      // Update order status via API
                      await yarnPurchaseOrderService.updatePurchaseOrderStatus(
                        orderId,
                        selectedStatus as PurchaseOrderStatus,
                        user.id,
                        user.email,
                        `Status updated to ${selectedStatus}`
                      );

                      // Mark order as processed in localStorage
                      const processedOrders = JSON.parse(localStorage.getItem('processedOrders') || '[]');
                      if (!processedOrders.includes(orderId)) {
                        processedOrders.push(orderId);
                        localStorage.setItem('processedOrders', JSON.stringify(processedOrders));
                      }

                      // Dispatch custom events to notify parent page
                      window.dispatchEvent(new Event('processedOrdersUpdated'));

                      toast.success(`Order status updated to ${selectedStatus === 'QC pending' ? 'Send for QC' : 'Rejected'}`);
                      
                      // Navigate back to main page
                      router.push('/yarn-management/purchase-management/purchase-order-received');
                    } catch (error) {
                      console.error('Failed to update status:', error);
                      toast.error(error instanceof Error ? error.message : 'Failed to update status');
                      setIsSubmittingStatus(false);
                    }
                  }}
                  className="ti-btn ti-btn-primary"
                  disabled={isSubmittingStatus || !selectedStatus}
                >
                  {isSubmittingStatus ? (
                    <>
                      <i className="ri-loader-4-line animate-spin me-2"></i>
                      Updating...
                    </>
                  ) : (
                    <>
                      <i className="ri-check-line me-2"></i>
                      Update Status
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessOrderPage;

