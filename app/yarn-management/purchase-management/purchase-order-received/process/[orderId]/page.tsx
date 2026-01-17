"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import JsBarcode from "jsbarcode";
import yarnPurchaseOrderService, { PurchaseOrderStatus } from "@/shared/services/yarnPurchaseOrderService";
import yarnBoxService, { YarnBox, UpdateYarnBoxPayload } from "@/shared/services/yarnBoxService";
import { QZTrayLoader, QZTrayStatus } from "@/shared/components/qzTray";
import { printMultipleBarcodes, connectQZ, getDefaultPrinter, isQZLoaded, getAvailablePrinters, PrinterInfo } from "@/shared/utils/qzTray";

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
  status: 'lot_pending' | 'lot_qc_pending' | 'lot_accepted' | 'lot_rejected';
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
    ? apiOrder.receivedLotDetails.map((lot: any) => {
        const normalizedStatus: ReceivedLotDetail['status'] = ['lot_pending', 'lot_qc_pending', 'lot_accepted', 'lot_rejected'].includes(lot.status)
          ? lot.status
          : 'lot_pending';

        return {
          lotNumber: lot.lotNumber || lot.lot_number || '',
          numberOfCones: lot.numberOfCones || lot.number_of_cones || 0,
          totalWeight: lot.totalWeight || lot.total_weight || 0,
          numberOfBoxes: lot.numberOfBoxes || lot.number_of_boxes || 0,
          status: normalizedStatus
        };
      })
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
  const [rawApiOrder, setRawApiOrder] = useState<any>(null); // Store raw API response for accessing receivedLotDetails with poItems
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [boxes, setBoxes] = useState<YarnBox[]>([]);
  const [isLoadingBoxes, setIsLoadingBoxes] = useState(false);
  const [activeBoxId, setActiveBoxId] = useState<string | null>(null);
  const [barcodeScanValue, setBarcodeScanValue] = useState<string>('');
  const [boxData, setBoxData] = useState<Record<string, {
    yarnName: string;
    shadeCode: string;
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
  // Store raw input values as strings to allow typing "0" and "0.5"
  const [rawInputValues, setRawInputValues] = useState<Record<string, string>>({});
  const [isFetchingWeight, setIsFetchingWeight] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [qzStatus, setQzStatus] = useState<{
    scriptLoaded: boolean;
    connected: boolean;
    printer: PrinterInfo | null;
    printers: PrinterInfo[];
  }>({
    scriptLoaded: false,
    connected: false,
    printer: null,
    printers: [],
  });

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

  // Focus barcode input on page load and when boxes are loaded
  useEffect(() => {
    if (!isLoadingBoxes && boxes.length > 0 && barcodeInputRef.current && !activeBoxId) {
      barcodeInputRef.current.focus();
    }
  }, [isLoadingBoxes, boxes.length, activeBoxId]);

  // Focus weight input when a box is activated
  useEffect(() => {
    if (activeBoxId) {
      // Use multiple attempts to ensure DOM is updated and input is available
      const focusWeightInput = () => {
        const weightInput = document.querySelector(`input[data-box-weight="${activeBoxId}"]`) as HTMLInputElement;
        if (weightInput) {
          weightInput.focus();
          weightInput.select(); // Select the text if any
          return true;
        }
        return false;
      };

      // Try immediately
      if (!focusWeightInput()) {
        // Try after a short delay
        setTimeout(() => {
          if (!focusWeightInput()) {
            // Try one more time after a longer delay
            setTimeout(() => {
              focusWeightInput();
            }, 200);
          }
        }, 100);
      }
    }
  }, [activeBoxId]);

  // Fetch weight automatically when a row is activated
  useEffect(() => {
    const autoFillWeight = async () => {
      if (!activeBoxId) return;

      const weight = await fetchLatestWeight();
      if (weight !== null && weight > 0) {
        // Find the box to get its current data
        const box = boxes.find(b => {
          const bId = b._id || b.id || b.boxId;
          return bId === activeBoxId;
        });

        if (box) {
          const defaultYarnName = box.yarnName && !box.yarnName.startsWith('Yarn-PO-') 
            ? box.yarnName 
            : '';
          
          // Update boxData with fetched weight, ensuring all fields exist
          setBoxData(prev => ({
            ...prev,
            [activeBoxId]: {
              yarnName: prev[activeBoxId]?.yarnName || defaultYarnName,
              shadeCode: prev[activeBoxId]?.shadeCode || box.shadeCode || '',
              lotNumber: prev[activeBoxId]?.lotNumber || box.lotNumber || '',
              boxWeight: weight.toString(),
              numberOfCones: prev[activeBoxId]?.numberOfCones || box.numberOfCones?.toString() || ''
            }
          }));
          
          // Also update rawInputValues to show the weight in the input field
          setRawInputValues(prev => ({
            ...prev,
            [`box-${activeBoxId}-boxWeight`]: weight.toString()
          }));
          
          // Auto-focus cones input after weight is fetched
          setTimeout(() => {
            const coneInput = document.querySelector(`input[data-box-cones="${activeBoxId}"]`) as HTMLInputElement;
            if (coneInput) {
              coneInput.focus();
              coneInput.select();
            }
          }, 300);
        }
      }
    };

    autoFillWeight();
  }, [activeBoxId, boxes]);

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
        
        // Store raw API response for accessing receivedLotDetails with poItems
        setRawApiOrder(apiOrder);
        
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
        
        // Initialize box data state, preserving existing data
        setBoxData(prev => {
          const initialBoxData: Record<string, any> = { ...prev };
          boxesData.forEach((box) => {
            const boxId = box._id || box.id || box.boxId;
            if (boxId) {
              // Get existing data for this box
              const existingData = prev[boxId] || {};
              
              // Check if yarnName is a default placeholder (starts with "Yarn-PO-")
              const yarnName = box.yarnName && !box.yarnName.startsWith('Yarn-PO-') 
                ? box.yarnName 
                : '';
              
              // Auto-fill from PO items if lot number exists
              let autoFilledYarnName = yarnName;
              let autoFilledShadeCode = box.shadeCode || '';
              const boxLotNumber = box.lotNumber || '';
              
              if (boxLotNumber && rawApiOrder) {
                const poItemData = getPOItemDataFromLotNumber(boxLotNumber);
                if (poItemData) {
                  autoFilledYarnName = poItemData.yarnName;
                  autoFilledShadeCode = poItemData.shadeCode;
                }
              }
              
              // Only set if box doesn't have existing data, or preserve existing data if it exists
              if (!existingData.yarnName && !existingData.shadeCode && !existingData.lotNumber) {
                // No existing data, use initialized values
                initialBoxData[boxId] = {
                  yarnName: autoFilledYarnName,
                  shadeCode: autoFilledShadeCode,
                  lotNumber: boxLotNumber,
                  boxWeight: box.boxWeight?.toString() || '',
                  numberOfCones: box.numberOfCones?.toString() || ''
                };
              } else {
                // Preserve existing data, only update if server has new data
                initialBoxData[boxId] = {
                  yarnName: existingData.yarnName || autoFilledYarnName,
                  shadeCode: existingData.shadeCode || autoFilledShadeCode,
                  lotNumber: existingData.lotNumber || boxLotNumber,
                  boxWeight: existingData.boxWeight || box.boxWeight?.toString() || '',
                  numberOfCones: existingData.numberOfCones || box.numberOfCones?.toString() || ''
                };
              }
            }
          });
          return initialBoxData;
        });
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
  }, [order?.orderNumber, rawApiOrder]);

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
  const getLotStatus = (lotNumber: string): ReceivedLotDetail['status'] | null => {
    if (!order?.receivedLotDetails || !lotNumber) return null;
    
    const normalizedLotNumber = lotNumber.trim().toUpperCase();
    const lot = order.receivedLotDetails.find(lot => {
      const receivedLotNumber = (lot.lotNumber || '').trim().toUpperCase();
      return receivedLotNumber === normalizedLotNumber;
    });
    
    return lot?.status || null;
  };

  // Get lot status display text and color
  const getLotStatusDisplay = (status: ReceivedLotDetail['status'] | null) => {
    if (!status) return { text: 'Pending', color: 'bg-gray-100 text-gray-800' };
    
    switch (status) {
      case 'lot_pending':
        return { text: 'Pending', color: 'bg-gray-100 text-gray-800' };
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

  // Fetch latest weight from API
  const fetchLatestWeight = async (): Promise<number | null> => {
    try {
      setIsFetchingWeight(true);
      const response = await fetch('http://localhost:7001/api/weight/latest', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // Extract weight from response: {"weight":0.65,"weightUnit":"kg",...}
      const weight = data.weight;
      
      if (weight !== undefined && weight !== null) {
        return parseFloat(weight);
      }
      
      return null;
    } catch (error) {
      console.error('Failed to fetch weight:', error);
      // Don't show error toast, just log it - weight fetching is optional
      return null;
    } finally {
      setIsFetchingWeight(false);
    }
  };

  // Get PO item data from lot number using receivedLotDetails
  const getPOItemDataFromLotNumber = (lotNumber: string): { yarnName: string; shadeCode: string } | null => {
    if (!rawApiOrder || !rawApiOrder.receivedLotDetails || !rawApiOrder.poItems) {
      return null;
    }

    // Find the lot in receivedLotDetails
    const lot = rawApiOrder.receivedLotDetails.find((l: any) => 
      (l.lotNumber || '').trim().toUpperCase() === lotNumber.trim().toUpperCase()
    );

    if (!lot || !lot.poItems || lot.poItems.length === 0) {
      return null;
    }

    // Get the first PO item ID from the lot (assuming one PO item per lot)
    const poItemId = lot.poItems[0]?.poItem;
    if (!poItemId) {
      return null;
    }

    // Find the PO item in poItems array
    const poItem = rawApiOrder.poItems.find((item: any) => 
      String(item._id || item.id) === String(poItemId)
    );

    if (!poItem) {
      return null;
    }

    return {
      yarnName: poItem.yarnName || '',
      shadeCode: poItem.shadeCode || ''
    };
  };

  // Handle barcode scan
  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && barcodeScanValue.trim()) {
      const scannedBarcode = barcodeScanValue.trim();
      const foundBox = boxes.find(box => box.barcode === scannedBarcode);
      
      if (foundBox) {
        const boxId = foundBox._id || foundBox.id || foundBox.boxId;
        
        // Get lot number from box (check boxData first, then box.lotNumber)
        const existingData = boxData[boxId];
        const lotNumber = existingData?.lotNumber?.trim() || foundBox.lotNumber?.trim() || '';
        
        // Auto-fill data from PO items if lot number exists
        let autoFilledData = {
          yarnName: existingData?.yarnName || '',
          shadeCode: existingData?.shadeCode || '',
          lotNumber: lotNumber
        };

        if (lotNumber && rawApiOrder) {
          const poItemData = getPOItemDataFromLotNumber(lotNumber);
          if (poItemData) {
            autoFilledData.yarnName = poItemData.yarnName;
            autoFilledData.shadeCode = poItemData.shadeCode;
          }
        }

        // Update boxData with auto-filled values
        setBoxData(prev => ({
          ...prev,
          [boxId]: {
            ...prev[boxId],
            yarnName: autoFilledData.yarnName,
            shadeCode: autoFilledData.shadeCode,
            lotNumber: autoFilledData.lotNumber,
            boxWeight: prev[boxId]?.boxWeight || '',
            numberOfCones: prev[boxId]?.numberOfCones || ''
          }
        }));

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

  // Get unique yarn names from PO items
  const getUniqueYarnNames = (): string[] => {
    if (!order || !order.items) return [];
    const uniqueNames = Array.from(new Set(order.items.map(item => item.yarnName).filter(Boolean)));
    return uniqueNames;
  };

  // Check if there are multiple yarn names in the PO
  const hasMultipleYarnNames = (): boolean => {
    return getUniqueYarnNames().length > 1;
  };

  // Handle yarn name change - auto-fill shade code
  const handleYarnNameChange = (boxId: string, yarnName: string) => {
    setBoxData(prev => ({
      ...prev,
      [boxId]: {
        ...prev[boxId],
        yarnName,
        shadeCode: getShadeCodeForYarn(yarnName)
      }
    }));
  };


  // Helper function to validate and sanitize numeric input
  const validateNumericInput = (value: string, allowDecimal: boolean = true): string => {
    // Allow empty string
    if (value === '') return '';
    
    // Remove any non-numeric characters except decimal point if allowed
    let sanitized = value;
    if (allowDecimal) {
      // Allow digits, single decimal point, and leading minus (if needed)
      sanitized = value.replace(/[^\d.]/g, '');
      // Ensure only one decimal point
      const parts = sanitized.split('.');
      if (parts.length > 2) {
        sanitized = parts[0] + '.' + parts.slice(1).join('');
      }
    } else {
      // Only allow digits
      sanitized = value.replace(/[^\d]/g, '');
    }
    
    return sanitized;
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
             parseFloat(data.numberOfCones) > 0;
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
             parseFloat(data.numberOfCones) > 0;
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
        lotNumber: data.lotNumber,
        boxWeight: parseFloat(data.boxWeight),
        numberOfCones: parseFloat(data.numberOfCones)
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
        
        // Update box data state with refreshed data, preserving existing data for other boxes
        let calculatedBoxData: Record<string, any> = {};
        setBoxData(prev => {
          const updatedBoxData: Record<string, any> = { ...prev };
          boxesData.forEach((box) => {
            const refreshedBoxId = box._id || box.id || box.boxId;
            if (refreshedBoxId) {
              // Get existing data for this box
              const existingData = prev[refreshedBoxId] || {};
              
              // Check if yarnName is a default placeholder (starts with "Yarn-PO-")
              const refreshedYarnName = box.yarnName && !box.yarnName.startsWith('Yarn-PO-') 
                ? box.yarnName 
                : '';
              
              // For the box that was just updated, use server data
              // For other boxes, preserve existing data if it exists and is not empty
              if (refreshedBoxId === boxId) {
                // This is the box that was just updated - use server data
                updatedBoxData[refreshedBoxId] = {
                  yarnName: refreshedYarnName,
                  shadeCode: box.shadeCode || '',
                  lotNumber: box.lotNumber || '',
                  boxWeight: box.boxWeight?.toString() || '',
                  numberOfCones: box.numberOfCones?.toString() || ''
                };
              } else {
                // This is another box - preserve existing data if it exists
                updatedBoxData[refreshedBoxId] = {
                  yarnName: existingData.yarnName || refreshedYarnName,
                  shadeCode: existingData.shadeCode || box.shadeCode || '',
                  lotNumber: existingData.lotNumber || box.lotNumber || '',
                  boxWeight: existingData.boxWeight || box.boxWeight?.toString() || '',
                  numberOfCones: existingData.numberOfCones || box.numberOfCones?.toString() || ''
                };
              }
            }
          });
          calculatedBoxData = updatedBoxData;
          return updatedBoxData;
        });
        
        // Check if all boxes are now completed and auto-update status to goods_received
        const allCompleted = boxesData.every((b) => {
          const bId = b._id || b.id || b.boxId;
          const bData = calculatedBoxData[bId] || {};
          return bData.yarnName && 
                 bData.lotNumber && 
                 bData.boxWeight && 
                 parseFloat(bData.boxWeight) > 0 &&
                 bData.numberOfCones && 
                 parseFloat(bData.numberOfCones) > 0;
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

  // Helper function to generate barcode SVG
  const generateBarcodeSVG = (barcodeValue: string): string => {
    try {
      // Create a temporary container div
      const tempDiv = document.createElement('div');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      tempDiv.appendChild(svg);
      
      // Generate barcode
      JsBarcode(svg, barcodeValue, {
        format: "CODE128",
        width: 2,
        height: 60,
        displayValue: true,
        fontSize: 14,
        margin: 10,
        background: "transparent"
      });
      
      // Get the SVG HTML
      const svgHTML = svg.outerHTML;
      
      // Clean up
      tempDiv.remove();
      
      return svgHTML;
    } catch (error) {
      console.error('Error generating barcode:', error);
      // Fallback to text if barcode generation fails
      return `<div style="font-family: 'Courier New', monospace; font-size: 18px; font-weight: bold; padding: 10px;">${barcodeValue}</div>`;
    }
  };

  // Helper function to get box details for printing
  const getBoxPrintDetails = (box: YarnBox) => {
    const boxId = box._id || box.id || box.boxId;
    const data = boxData[boxId];
    const yarnName = data?.yarnName || box.yarnName || '';
    const shadeCode = data?.shadeCode || box.shadeCode || '';
    
    // Try to find matching order item to get additional details
    let yarnColour = '';
    let shadeName = '';
    
    if (order && yarnName) {
      const matchingItem = order.items.find(item => item.yarnName === yarnName);
      if (matchingItem) {
        // Use yarnCode as shade number if available
        shadeName = matchingItem.shadeCode || shadeCode || '';
        
        // Try to extract yarn colour from yarnName (format: count/size-colour-type/sub-type)
        // Yarn name format is typically: "40s-Red-Cotton/Combed" or similar
        if (matchingItem.yarnCode) {
          // yarnCode might contain shade information
          shadeName = matchingItem.yarnCode;
        }
        
        // Extract colour from yarnName if it follows the pattern
        if (yarnName.includes('-')) {
          const parts = yarnName.split('-');
          // Usually format is: count-colour-type/subtype
          if (parts.length >= 2) {
            yarnColour = parts[1] || '';
          }
        }
      }
    }
    
    // If yarnName contains colour info, try to extract it
    if (!yarnColour && yarnName) {
      const parts = yarnName.split('-');
      if (parts.length >= 2) {
        yarnColour = parts[1] || '';
      }
    }
    
    // Use shadeCode as shade number (shade number = shade code)
    const shadeNumber = shadeCode || '-';
    
    return {
      yarnName: yarnName || '-',
      shadeCode: shadeNumber,
      shadeNumber: shadeNumber,
      yarnColour: yarnColour || shadeCode || '-',
      shadeName: shadeName || shadeCode || '-'
    };
  };

  const handlePrintAllBarcodes = async () => {
    if (!order || boxes.length === 0) {
      toast.error('No boxes available to print');
      return;
    }

    try {
      // Check script status first
      if (!isQZLoaded()) {
        toast.error('QZ Tray script not loaded. Please wait a moment and try again.');
        return;
      }

      // Check connection status - same method as HTML test file
      const isActive = typeof window !== 'undefined' && 
                      typeof window.qz !== 'undefined' &&
                      window.qz.websocket &&
                      window.qz.websocket.isActive() === true;
      
      if (!isActive) {
        // Connect to QZ Tray
        toast.loading('Connecting to QZ Tray...');
        
        // Add timeout for connection
        const connectionPromise = connectQZ();
        const timeoutPromise = new Promise<{ isConnected: false; error: string }>((resolve) => {
          setTimeout(() => {
            resolve({
              isConnected: false,
              error: 'Connection timeout. Please ensure QZ Tray is running and try again.'
            });
          }, 10000); // 10 second timeout
        });

        const connection = await Promise.race([connectionPromise, timeoutPromise]);
        
        if (!connection.isConnected) {
          toast.dismiss();
          const errorMessage = connection.error || 'QZ Tray is not running. Please install and start QZ Tray from https://qz.io/download/';
          
          // Enhanced error handling for certificate issues
          if (errorMessage.includes('certificate') || errorMessage.includes('trust') || errorMessage.includes('untrusted') || errorMessage.includes('denied')) {
            toast.error(
              `🔒 Certificate Approval Required\n\nWhen the security prompt appears:\n1. Click "Allow"\n2. ✅ CHECK "Remember this decision" (CRITICAL!)\n3. Click "Allow" again\n\n${errorMessage.split('\n\n🔧')[1] || 'If prompt keeps appearing, check the console for detailed instructions.'}`,
              { 
                duration: 10000,
                style: { maxWidth: '550px', whiteSpace: 'pre-line', fontSize: '13px' }
              }
            );
          } else if (errorMessage.includes('timeout') || errorMessage.includes('not running')) {
            toast.error(
              `QZ Tray Connection Failed\n\n${errorMessage}\n\n🔧 Troubleshooting:\n1. Ensure QZ Tray is installed and running\n2. Check if QZ Tray icon is in system tray/menu bar\n3. Restart QZ Tray if needed\n4. Try again or use browser print as fallback`,
              { 
                duration: 8000,
                style: { maxWidth: '500px', whiteSpace: 'pre-line' }
              }
            );
          } else {
            toast.error(errorMessage, { duration: 6000 });
          }
          console.error('QZ Tray connection error:', errorMessage);
          return;
        }
      }

      // Get default printer
      toast.loading('Detecting printer...');
      const defaultPrinter = await getDefaultPrinter();
      
      if (!defaultPrinter) {
        toast.dismiss();
        toast.error(
          'No printer found\n\nPlease set a default printer in your system settings:\n• Windows: Settings → Printers & scanners\n• macOS: System Preferences → Printers & Scanners\n• Linux: System Settings → Printers',
          { 
            duration: 6000,
            style: { maxWidth: '400px', whiteSpace: 'pre-line' }
          }
        );
        return;
      }

      // Prepare barcodes for printing
      const barcodesToPrint = boxes.map((box) => {
        const details = getBoxPrintDetails(box);
        return {
          barcodeValue: box.barcode,
          boxId: box.boxId,
          supplier: order.supplier || '',
          yarnName: details.yarnName,
          shadeCode: details.shadeCode,
          yarnColour: details.yarnColour,
          shadeName: details.shadeName,
          lotNumber: box.lotNumber || '',
        };
      });

      // Print all barcodes
      toast.loading(`Printing ${barcodesToPrint.length} barcode(s) to ${defaultPrinter.name}...`);
      const result = await printMultipleBarcodes(barcodesToPrint, {
        printerName: defaultPrinter.name,
        delayBetweenPrints: 500,
      });

      toast.dismiss();

      if (result.success) {
        toast.success(`Successfully printed ${result.printed} barcode(s)`, { duration: 3000 });
      } else {
        if (result.printed > 0) {
          toast.success(`Printed ${result.printed} barcode(s)`, { duration: 2000 });
          toast.error(`Failed to print ${result.errors.length} barcode(s): ${result.errors[0] || 'Unknown error'}`, { duration: 5000 });
        } else {
          const errorMsg = result.errors.length > 0 ? result.errors[0] : 'Unknown error occurred';
          toast.error(`Failed to print barcodes: ${errorMsg}`, { duration: 5000 });
        }
        if (result.errors.length > 0) {
          console.error('Print errors:', result.errors);
        }
      }
    } catch (error) {
      toast.dismiss();
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred while printing';
      
      // Check if it's a certificate/connection error
      if (errorMessage.includes('certificate') || errorMessage.includes('trust') || errorMessage.includes('untrusted') || errorMessage.includes('WebSocket')) {
        toast.error(
          `Print Failed: Connection Issue\n\n${errorMessage}\n\n💡 Try:\n1. Ensure QZ Tray is running\n2. Use HTTPS URL (not HTTP)\n3. Accept certificate when prompted\n4. Use browser print as fallback`,
          { 
            duration: 8000,
            style: { maxWidth: '500px', whiteSpace: 'pre-line' }
          }
        );
      } else {
        toast.error(`Print failed: ${errorMessage}`, { duration: 5000 });
      }
      console.error('Print error:', error);
    }
  };

  // Legacy browser print function (kept as fallback)
  const handlePrintAllBarcodesBrowser = () => {
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
              const barcodeSVG = generateBarcodeSVG(box.barcode);
              const details = getBoxPrintDetails(box);
              return `
                <div class="barcode-item">
                  <div class="box-header-info">
                    <div class="barcode-label">Box ID</div>
                    <div class="box-info" style="font-weight: bold; font-size: 14px; margin-bottom: 8px;">${box.boxId}</div>
                  </div>
                  <div class="barcode-section">
                    <div class="barcode-label">Barcode</div>
                    <div class="barcode-value">
                      ${barcodeSVG}
                    </div>
                  </div>
                  <div class="box-details-section">
                    <div class="detail-row">
                      <span class="detail-label">Supplier:</span>
                      <span class="detail-value">${order.supplier || '-'}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Yarn Name:</span>
                      <span class="detail-value">${details.yarnName}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Shade Number:</span>
                      <span class="detail-value">${details.shadeCode}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Yarn Colour:</span>
                      <span class="detail-value">${details.yarnColour}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Shade Name:</span>
                      <span class="detail-value">${details.shadeName}</span>
                    </div>
                    <div class="detail-row lot-info">
                      <span class="detail-label">Lot:</span>
                      <span class="detail-value">${lotNumber}</span>
                    </div>
                  </div>
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
            const barcodeSVG = generateBarcodeSVG(box.barcode);
            const details = getBoxPrintDetails(box);
            return `
              <div class="barcode-item">
                <div class="box-header-info">
                  <div class="barcode-label">Box ID</div>
                  <div class="box-info" style="font-weight: bold; font-size: 14px; margin-bottom: 8px;">${box.boxId}</div>
                </div>
                <div class="barcode-section">
                  <div class="barcode-label">Barcode</div>
                  <div class="barcode-value">
                    ${barcodeSVG}
                  </div>
                </div>
                <div class="box-details-section">
                  <div class="detail-row">
                    <span class="detail-label">Supplier:</span>
                    <span class="detail-value">${order.supplier || '-'}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Yarn Name:</span>
                    <span class="detail-value">${details.yarnName}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Shade Number:</span>
                    <span class="detail-value">${details.shadeCode}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Yarn Colour:</span>
                    <span class="detail-value">${details.yarnColour}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Shade Name:</span>
                    <span class="detail-value">${details.shadeName}</span>
                  </div>
                </div>
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
              grid-template-columns: repeat(2, 1fr);
              gap: 25px;
              margin-top: 20px;
            }
            .barcode-item {
              border: 2px solid #ddd;
              padding: 20px;
              text-align: center;
              page-break-inside: avoid;
              min-height: 400px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              background: #fff;
              border-radius: 8px;
            }
            .box-header-info {
              margin-bottom: 12px;
            }
            .barcode-label {
              font-size: 11px;
              color: #666;
              margin-bottom: 5px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .barcode-section {
              margin: 15px 0;
            }
            .barcode-value {
              font-family: 'Courier New', monospace;
              margin: 10px 0;
              padding: 15px;
              background: #f5f5f5;
              border: 1px dashed #ccc;
              display: flex;
              justify-content: center;
              align-items: center;
              border-radius: 4px;
            }
            .barcode-value svg {
              max-width: 100%;
              height: auto;
            }
            .box-details-section {
              margin-top: 15px;
              padding-top: 15px;
              border-top: 1px solid #e0e0e0;
              text-align: left;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 8px;
              font-size: 13px;
            }
            .detail-row:last-child {
              margin-bottom: 0;
            }
            .detail-label {
              font-weight: 600;
              color: #555;
              min-width: 100px;
            }
            .detail-value {
              color: #333;
              font-weight: 500;
              text-align: right;
              flex: 1;
              word-break: break-word;
            }
            .detail-row.lot-info {
              margin-top: 10px;
              padding-top: 10px;
              border-top: 1px solid #e0e0e0;
              font-weight: 600;
            }
            .box-info {
              font-size: 13px;
              color: #333;
            }
            @media print {
              .barcode-container {
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
              }
              .barcode-item {
                min-height: 420px;
                padding: 18px;
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
    <div className="main-content !p-[10px]">
      <QZTrayLoader />
      <Seo title={`Process Order - ${order.orderNumber}`} />
      
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          {/* Header Section */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Link
                href="/yarn-management/purchase-management/purchase-order-received"
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title="Back to received orders"
              >
                <i className="ri-arrow-left-line text-sm"></i>
              </Link>
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Process Order</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {order.purchaseOrderNumber}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* QZ Tray Status */}
              <div className="bg-gray-50 px-2 py-1 rounded border border-gray-200">
                <QZTrayStatus onStatusChange={setQzStatus} />
              </div>

              {boxes.length > 0 && (
                <button
                  type="button"
                  onClick={handlePrintAllBarcodes}
                  disabled={!qzStatus.connected || !qzStatus.printer}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-white text-[11px] font-bold rounded transition-colors shadow-sm ${
                    qzStatus.connected && qzStatus.printer
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                  title={
                    !qzStatus.connected
                      ? 'QZ Tray not connected'
                      : !qzStatus.printer
                      ? 'No printer detected'
                      : 'Print all box barcodes'
                  }
                >
                  <i className="ri-printer-line text-xs"></i>
                  Print All Barcodes
                </button>
              )}
            </div>
          </div>

          {/* Order Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-0.5">PO Number</p>
              <p className="text-xs font-bold text-gray-900">{order.purchaseOrderNumber}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-0.5">Supplier</p>
              <p className="text-xs font-bold text-gray-900">{order.supplier}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-0.5">Received Date</p>
              <p className="text-xs font-bold text-gray-900">
                {new Date(order.receivedDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-0.5">Status</p>
              <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-0.5">Total Amount</p>
              <p className="text-xs font-bold text-gray-900">₹{order.totalAmount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-0.5">Total Items</p>
              <p className="text-xs font-bold text-gray-900">{order.items.length}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-0.5">Total Quantity</p>
              <p className="text-xs font-bold text-gray-900">
                {order.items.reduce((sum, item) => sum + item.orderedQuantity, 0).toLocaleString()} kg
              </p>
            </div>
            {order.packListDetails?.numberOfBoxes && (
              <div>
                <p className="text-[10px] uppercase text-gray-500 mb-0.5">Total Boxes</p>
                <p className="text-xs font-bold text-gray-900">
                  {order.packListDetails.numberOfBoxes}
                </p>
              </div>
            )}
            {order.packListDetails?.numberOfCones && (
              <div>
                <p className="text-[10px] uppercase text-gray-500 mb-0.5">Total Cones</p>
                <p className="text-xs font-bold text-gray-900">
                  {order.packListDetails.numberOfCones}
                </p>
              </div>
            )}
            {order.packListDetails?.totalWeight && (
              <div>
                <p className="text-[10px] uppercase text-gray-500 mb-0.5">Total Weight</p>
                <p className="text-xs font-bold text-gray-900">
                  {order.packListDetails.totalWeight} kg
                </p>
              </div>
            )}
          </div>
          {order.notes && (
            <div className="mb-4 p-2 bg-gray-50 rounded border border-gray-200">
              <p className="text-[10px] uppercase text-gray-500 mb-1">Notes</p>
              <p className="text-xs text-gray-700">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Boxes Section */}
        <div className="p-[10px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-800">
              Boxes ({boxes.length} boxes)
            </h3>
          </div>

          {/* Barcode Scanner Input */}
          <div className="mb-3">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Scan Barcode</label>
            <input
              ref={barcodeInputRef}
              type="text"
              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
              placeholder="Scan or enter barcode to activate row"
              value={barcodeScanValue}
              onChange={(e) => setBarcodeScanValue(e.target.value)}
              onKeyDown={handleBarcodeScan}
              autoFocus
            />
          </div>

          {/* Weighing Process Indicator */}
          {activeBoxId && (() => {
            const activeBox = boxes.find(b => {
              const bId = b._id || b.id || b.boxId;
              return bId === activeBoxId;
            });
            if (!activeBox) return null;
            
            const activeBoxData = boxData[activeBoxId] || {};
            const hasWeight = activeBoxData.boxWeight && parseFloat(activeBoxData.boxWeight) > 0;
            const hasCones = activeBoxData.numberOfCones && parseFloat(activeBoxData.numberOfCones) > 0;
            
            // Show indicator only when weight hasn't been entered yet
            if (!hasWeight) {
              return (
                <div className="mb-3 animate-pulse">
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-2 rounded-r-lg shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex-shrink-0">
                        <i className="ri-scales-3-line text-lg text-blue-600"></i>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-semibold text-blue-900 mb-0.5">
                          Place the box on the weighing scale
                        </h4>
                        <p className="text-[10px] text-blue-700">
                          Box ID: <span className="font-mono font-semibold">{activeBox.boxId}</span> - Waiting for weight...
                        </p>
                      </div>
                      {isFetchingWeight && (
                        <div className="flex-shrink-0">
                          <i className="ri-loader-4-line animate-spin text-blue-600 text-sm"></i>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {isLoadingBoxes ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50"></div>
              <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading Data</p>
            </div>
          ) : boxes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-inbox-line text-xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">NO BOXES FOUND</h3>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Render boxes grouped by lot */}
              {boxesByLot.sortedLots.map((lotNumber) => {
                const lotBoxes = boxesByLot.grouped[lotNumber];
                const handlePrintLotBarcodes = async () => {
                    if (!order || lotBoxes.length === 0) {
                      toast.error('No boxes available to print');
                      return;
                    }

                    try {
                      // Check script status first
                      if (!isQZLoaded()) {
                        toast.error('QZ Tray script not loaded. Please wait a moment and try again.');
                        return;
                      }

                      // Check connection status - same method as HTML test file
                      const isActive = typeof window !== 'undefined' && 
                                      typeof window.qz !== 'undefined' &&
                                      window.qz.websocket &&
                                      window.qz.websocket.isActive() === true;
                      
                      if (!isActive) {
                        // Connect to QZ Tray
                        toast.loading('Connecting to QZ Tray...');
                        
                        // Add timeout for connection
                        const connectionPromise = connectQZ();
                        const timeoutPromise = new Promise<{ isConnected: false; error: string }>((resolve) => {
                          setTimeout(() => {
                            resolve({
                              isConnected: false,
                              error: 'Connection timeout. Please ensure QZ Tray is running and try again.'
                            });
                          }, 10000); // 10 second timeout
                        });

                        const connection = await Promise.race([connectionPromise, timeoutPromise]);
                        
                        if (!connection.isConnected) {
                          toast.dismiss();
                          const errorMessage = connection.error || 'QZ Tray is not running. Please install and start QZ Tray from https://qz.io/download/';
                          
                          // Enhanced error handling for certificate issues
                          if (errorMessage.includes('certificate') || errorMessage.includes('trust') || errorMessage.includes('untrusted') || errorMessage.includes('denied')) {
                            toast.error(
                              `🔒 Certificate Approval Required\n\nWhen the security prompt appears:\n1. Click "Allow"\n2. ✅ CHECK "Remember this decision" (CRITICAL!)\n3. Click "Allow" again\n\n${errorMessage.split('\n\n🔧')[1] || 'If prompt keeps appearing, check the console for detailed instructions.'}`,
                              { 
                                duration: 10000,
                                style: { maxWidth: '550px', whiteSpace: 'pre-line', fontSize: '13px' }
                              }
                            );
                          } else if (errorMessage.includes('timeout') || errorMessage.includes('not running')) {
                            toast.error(
                              `QZ Tray Connection Failed\n\n${errorMessage}\n\n🔧 Troubleshooting:\n1. Ensure QZ Tray is installed and running\n2. Check if QZ Tray icon is in system tray/menu bar\n3. Restart QZ Tray if needed\n4. Try again or use browser print as fallback`,
                              { 
                                duration: 8000,
                                style: { maxWidth: '500px', whiteSpace: 'pre-line' }
                              }
                            );
                          } else {
                            toast.error(errorMessage, { duration: 6000 });
                          }
                          console.error('QZ Tray connection error:', errorMessage);
                          return;
                        }
                      }

                      // Get default printer
                      toast.loading('Detecting printer...');
                      const defaultPrinter = await getDefaultPrinter();
                      
                      if (!defaultPrinter) {
                        toast.dismiss();
                        toast.error(
                          'No printer found\n\nPlease set a default printer in your system settings:\n• Windows: Settings → Printers & scanners\n• macOS: System Preferences → Printers & Scanners\n• Linux: System Settings → Printers',
                          { 
                            duration: 6000,
                            style: { maxWidth: '400px', whiteSpace: 'pre-line' }
                          }
                        );
                        return;
                      }

                      // Prepare barcodes for printing
                      const barcodesToPrint = lotBoxes.map((box) => {
                        const details = getBoxPrintDetails(box);
                        return {
                          barcodeValue: box.barcode,
                          boxId: box.boxId,
                          supplier: order.supplier || '',
                          yarnName: details.yarnName,
                          shadeCode: details.shadeCode,
                          yarnColour: details.yarnColour,
                          shadeName: details.shadeName,
                          lotNumber: lotNumber,
                        };
                      });

                      // Print all barcodes for this lot
                      toast.loading(`Printing ${barcodesToPrint.length} barcode(s) for ${lotNumber} to ${defaultPrinter.name}...`);
                      const result = await printMultipleBarcodes(barcodesToPrint, {
                        printerName: defaultPrinter.name,
                        delayBetweenPrints: 500,
                      });

                      toast.dismiss();

                      if (result.success) {
                        toast.success(`${result.printed} box barcode(s) printed for ${lotNumber}`, { duration: 3000 });
                      } else {
                        if (result.printed > 0) {
                          toast.success(`Printed ${result.printed} barcode(s)`, { duration: 2000 });
                          toast.error(`Failed to print ${result.errors.length} barcode(s): ${result.errors[0] || 'Unknown error'}`, { duration: 5000 });
                        } else {
                          const errorMsg = result.errors.length > 0 ? result.errors[0] : 'Unknown error occurred';
                          toast.error(`Failed to print barcodes: ${errorMsg}`, { duration: 5000 });
                        }
                        if (result.errors.length > 0) {
                          console.error('Print errors:', result.errors);
                        }
                      }
                    } catch (error) {
                      toast.dismiss();
                      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred while printing';
                      
                      // Check if it's a certificate/connection error
                      if (errorMessage.includes('certificate') || errorMessage.includes('trust') || errorMessage.includes('untrusted') || errorMessage.includes('WebSocket')) {
                        toast.error(
                          `Print Failed: Connection Issue\n\n${errorMessage}\n\n💡 Try:\n1. Ensure QZ Tray is running\n2. Use HTTPS URL (not HTTP)\n3. Accept certificate when prompted\n4. Use browser print as fallback`,
                          { 
                            duration: 8000,
                            style: { maxWidth: '500px', whiteSpace: 'pre-line' }
                          }
                        );
                      } else {
                        toast.error(`Print failed: ${errorMessage}`, { duration: 5000 });
                      }
                      console.error('Print error:', error);
                    }
                  };

                  // Legacy browser print function (kept as fallback)
                  const handlePrintLotBarcodesBrowser = () => {
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
                              grid-template-columns: repeat(2, 1fr);
                              gap: 25px;
                              margin-top: 20px;
                            }
                            .barcode-item {
                              border: 2px solid #ddd;
                              padding: 20px;
                              text-align: center;
                              page-break-inside: avoid;
                              min-height: 400px;
                              display: flex;
                              flex-direction: column;
                              justify-content: space-between;
                              background: #fff;
                              border-radius: 8px;
                            }
                            .box-header-info {
                              margin-bottom: 12px;
                            }
                            .barcode-label {
                              font-size: 11px;
                              color: #666;
                              margin-bottom: 5px;
                              font-weight: 600;
                              text-transform: uppercase;
                              letter-spacing: 0.5px;
                            }
                            .barcode-section {
                              margin: 15px 0;
                            }
                            .barcode-value {
                              font-family: 'Courier New', monospace;
                              margin: 10px 0;
                              padding: 15px;
                              background: #f5f5f5;
                              border: 1px dashed #ccc;
                              display: flex;
                              justify-content: center;
                              align-items: center;
                              border-radius: 4px;
                            }
                            .barcode-value svg {
                              max-width: 100%;
                              height: auto;
                            }
                            .box-details-section {
                              margin-top: 15px;
                              padding-top: 15px;
                              border-top: 1px solid #e0e0e0;
                              text-align: left;
                            }
                            .detail-row {
                              display: flex;
                              justify-content: space-between;
                              align-items: center;
                              margin-bottom: 8px;
                              font-size: 13px;
                            }
                            .detail-row:last-child {
                              margin-bottom: 0;
                            }
                            .detail-label {
                              font-weight: 600;
                              color: #555;
                              min-width: 100px;
                            }
                            .detail-value {
                              color: #333;
                              font-weight: 500;
                              text-align: right;
                              flex: 1;
                              word-break: break-word;
                            }
                            .detail-row.lot-info {
                              margin-top: 10px;
                              padding-top: 10px;
                              border-top: 1px solid #e0e0e0;
                              font-weight: 600;
                            }
                            .box-info {
                              font-size: 13px;
                              color: #333;
                            }
                            @media print {
                              .barcode-container {
                                grid-template-columns: repeat(2, 1fr);
                                gap: 20px;
                              }
                              .barcode-item {
                                min-height: 420px;
                                padding: 18px;
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
                              const barcodeSVG = generateBarcodeSVG(box.barcode);
                              const details = getBoxPrintDetails(box);
                              return `
                                <div class="barcode-item">
                                  <div class="box-header-info">
                                    <div class="barcode-label">Box ID</div>
                                    <div class="box-info" style="font-weight: bold; font-size: 14px; margin-bottom: 8px;">${box.boxId}</div>
                                  </div>
                                  <div class="barcode-section">
                                    <div class="barcode-label">Barcode</div>
                                    <div class="barcode-value">
                                      ${barcodeSVG}
                                    </div>
                                  </div>
                                  <div class="box-details-section">
                                    <div class="detail-row">
                                      <span class="detail-label">Supplier:</span>
                                      <span class="detail-value">${order.supplier || '-'}</span>
                                    </div>
                                    <div class="detail-row">
                                      <span class="detail-label">Yarn Name:</span>
                                      <span class="detail-value">${details.yarnName}</span>
                                    </div>
                                    <div class="detail-row">
                                      <span class="detail-label">Shade Number:</span>
                                      <span class="detail-value">${details.shadeCode}</span>
                                    </div>
                                    <div class="detail-row">
                                      <span class="detail-label">Yarn Colour:</span>
                                      <span class="detail-value">${details.yarnColour}</span>
                                    </div>
                                    <div class="detail-row">
                                      <span class="detail-label">Shade Name:</span>
                                      <span class="detail-value">${details.shadeName}</span>
                                    </div>
                                    <div class="detail-row lot-info">
                                      <span class="detail-label">Lot:</span>
                                      <span class="detail-value">${lotNumber}</span>
                                    </div>
                                  </div>
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
                    <div className="bg-purple-50/30 px-3 py-2 border-b border-gray-200 flex justify-between items-center">
                      <h4 className="text-xs font-bold text-gray-900 flex items-center gap-2 flex-wrap">
                        <i className="ri-box-3-line text-purple-600 text-xs"></i>
                        <span>Lot Number: <span className="text-purple-600 font-bold">{lotNumber}</span></span>
                        {lotStatus && (
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold rounded-full ${lotStatusDisplay.color}`}>
                            <i className={`ri-${
                              lotStatus === 'lot_qc_pending' || lotStatus === 'lot_pending' ? 'time-line' : 
                              lotStatus === 'lot_accepted' ? 'check-line' : 
                              'close-line'
                            } text-[9px]`}></i>
                            {lotStatusDisplay.text}
                          </span>
                        )}
                        <span className="text-[10px] font-normal text-gray-600 ml-2">
                          ({lotBoxes.length} {lotBoxes.length === 1 ? 'box' : 'boxes'})
                        </span>
                      </h4>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={handlePrintLotBarcodes}
                          disabled={!qzStatus.connected || !qzStatus.printer}
                          className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded transition-colors shadow-sm ${
                            qzStatus.connected && qzStatus.printer
                              ? 'bg-purple-600 text-white hover:bg-purple-700'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                          title={
                            !qzStatus.connected
                              ? 'QZ Tray not connected'
                              : !qzStatus.printer
                              ? 'No printer detected'
                              : `Print barcodes for ${lotNumber}`
                          }
                        >
                          <i className="ri-printer-line text-xs"></i>
                          Print
                        </button>
                        {/* Show Send/Reject when not processed or still pending */}
                        {(!lotStatus || lotStatus === 'lot_pending') && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSendLotForQC(lotNumber, lotBoxes)}
                              disabled={!isLotCompleted || isUpdatingOrderStatus}
                              className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded transition-colors shadow-sm ${
                                isLotCompleted && !isUpdatingOrderStatus
                                  ? 'bg-green-600 text-white hover:bg-green-700'
                                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              }`}
                              title={`Send ${lotNumber} for QC`}
                            >
                              {isUpdatingOrderStatus ? (
                                <>
                                  <i className="ri-loader-4-line animate-spin text-xs"></i>
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <i className="ri-checkbox-circle-line text-xs"></i>
                                  Send QC
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectLot(lotNumber, lotBoxes)}
                              disabled={!isLotCompleted || isUpdatingOrderStatus}
                              className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded transition-colors shadow-sm ${
                                isLotCompleted && !isUpdatingOrderStatus
                                  ? 'bg-red-600 text-white hover:bg-red-700'
                                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              }`}
                              title={`Reject ${lotNumber}`}
                            >
                              {isUpdatingOrderStatus ? (
                                <>
                                  <i className="ri-loader-4-line animate-spin text-xs"></i>
                                  Rejecting...
                                </>
                              ) : (
                                <>
                                  <i className="ri-close-circle-line text-xs"></i>
                                  Reject
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-200">
                        <thead>
                          <tr className="bg-gray-50/30">
                            <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Box ID</th>
                            <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Barcode</th>
                            <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Yarn Name</th>
                            <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Shade Code</th>
                            <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Lot Number</th>
                            <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Box Weight (kg)</th>
                            <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">No. of Cones</th>
                            <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                          </tr>
                        </thead>
                        <tbody>
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
                          lotNumber: box.lotNumber || '',
                          boxWeight: box.boxWeight?.toString() || '',
                          numberOfCones: box.numberOfCones?.toString() || ''
                        };
                        const isUpdating = updatingBoxId === boxId;

                  return (
                    <tr 
                      key={boxId}
                      className={`hover:bg-gray-50/50 transition-colors group ${
                        isActive ? 'bg-blue-50 border-2 border-blue-400' : ''
                      }`}
                    >
                      <td className="px-1.5 py-2 border border-gray-200">
                        <button
                          onClick={() => setSelectedBoxForDetails(box)}
                          className="text-[12px] font-bold text-purple-600 hover:text-purple-700 hover:underline cursor-pointer"
                          title="Click to view full details"
                        >
                          {truncateId(box.boxId)}
                        </button>
                      </td>
                      <td className="px-1.5 py-2 border border-gray-200">
                        <button
                          onClick={() => setSelectedBoxForDetails(box)}
                          className="text-[12px] text-gray-900 font-mono text-purple-600 hover:text-purple-700 hover:underline cursor-pointer"
                          title="Click to view full details"
                        >
                          {truncateId(box.barcode)}
                        </button>
                      </td>
                      <td className="px-1.5 py-2 border border-gray-200">
                        {isActive && hasMultipleYarnNames() ? (
                          <select
                            className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
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
                            {getUniqueYarnNames().map((yarnName) => (
                              <option key={yarnName} value={yarnName}>
                                {yarnName}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[12px] text-gray-900">{data.yarnName || '-'}</span>
                        )}
                      </td>
                      <td className="px-1.5 py-2 border border-gray-200">
                        <span className="text-[12px] text-gray-900">{data.shadeCode || '-'}</span>
                      </td>
                      <td className="px-1.5 py-2 border border-gray-200">
                        <span className="text-[12px] text-gray-900">{data.lotNumber || '-'}</span>
                      </td>
                      <td className="px-1.5 py-2 border border-gray-200">
                        {isActive ? (
                          <input
                            type="text"
                            className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
                            data-box-weight={boxId}
                            value={rawInputValues[`box-${boxId}-boxWeight`] !== undefined 
                              ? rawInputValues[`box-${boxId}-boxWeight`] 
                              : (data.boxWeight === '' || data.boxWeight === '0' ? '' : data.boxWeight)}
                            onChange={(e) => {
                              const value = e.target.value;
                              const sanitizedValue = validateNumericInput(value, true);
                              const key = `box-${boxId}-boxWeight`;
                              
                              setRawInputValues(prev => ({
                                ...prev,
                                [key]: sanitizedValue
                              }));
                              
                              setBoxData(prev => ({
                                ...prev,
                                [boxId]: { ...prev[boxId], boxWeight: sanitizedValue }
                              }));
                            }}
                            onBlur={(e) => {
                              const value = e.target.value;
                              const key = `box-${boxId}-boxWeight`;
                              const numValue = parseFloat(value);
                              
                              setRawInputValues(prev => {
                                const newValues = { ...prev };
                                delete newValues[key];
                                return newValues;
                              });
                              
                              if (value === '' || isNaN(numValue) || numValue <= 0) {
                                setBoxData(prev => ({
                                  ...prev,
                                  [boxId]: { ...prev[boxId], boxWeight: '' }
                                }));
                              } else {
                                setBoxData(prev => ({
                                  ...prev,
                                  [boxId]: { ...prev[boxId], boxWeight: value }
                                }));
                                
                                // Auto-focus cones input when valid weight is entered
                                setTimeout(() => {
                                  const coneInput = document.querySelector(`input[data-box-cones="${boxId}"]`) as HTMLInputElement;
                                  if (coneInput) {
                                    coneInput.focus();
                                    coneInput.select();
                                  }
                                }, 100);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                setTimeout(() => {
                                  const coneInput = document.querySelector(`input[data-box-cones="${boxId}"]`) as HTMLInputElement;
                                  if (coneInput) {
                                    coneInput.focus();
                                    coneInput.select();
                                  }
                                }, 50);
                              }
                            }}
                            placeholder="0.00"
                          />
                        ) : (
                          <span className="text-[12px] text-gray-900">{data.boxWeight || '-'}</span>
                        )}
                      </td>
                      <td className="px-1.5 py-2 border border-gray-200">
                        {isActive ? (
                          <input
                            type="text"
                            className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
                            data-box-cones={boxId}
                            value={rawInputValues[`box-${boxId}-numberOfCones`] !== undefined 
                              ? rawInputValues[`box-${boxId}-numberOfCones`] 
                              : (data.numberOfCones === '' || data.numberOfCones === '0' ? '' : data.numberOfCones)}
                            onChange={(e) => {
                              const value = e.target.value;
                              const sanitizedValue = validateNumericInput(value, true);
                              const key = `box-${boxId}-numberOfCones`;
                              
                              setRawInputValues(prev => ({
                                ...prev,
                                [key]: sanitizedValue
                              }));
                              
                              setBoxData(prev => ({
                                ...prev,
                                [boxId]: { ...prev[boxId], numberOfCones: sanitizedValue }
                              }));
                            }}
                            onBlur={(e) => {
                              const value = e.target.value;
                              const key = `box-${boxId}-numberOfCones`;
                              const numValue = parseFloat(value);
                              
                              setRawInputValues(prev => {
                                const newValues = { ...prev };
                                delete newValues[key];
                                return newValues;
                              });
                              
                              if (value === '' || isNaN(numValue) || numValue <= 0) {
                                setBoxData(prev => ({
                                  ...prev,
                                  [boxId]: { ...prev[boxId], numberOfCones: '' }
                                }));
                              } else {
                                setBoxData(prev => ({
                                  ...prev,
                                  [boxId]: { ...prev[boxId], numberOfCones: value }
                                }));
                              }
                            }}
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                await handleUpdateBox(box);
                                
                                // Reset state and focus back to barcode input
                                setActiveBoxId(null);
                                setBarcodeScanValue('');
                                
                                // Focus back to barcode input after update
                                setTimeout(() => {
                                  if (barcodeInputRef.current) {
                                    barcodeInputRef.current.focus();
                                  }
                                }, 150);
                              }
                            }}
                            placeholder="0"
                          />
                        ) : (
                          <span className="text-[12px] text-gray-900">{data.numberOfCones || '-'}</span>
                        )}
                      </td>
                      <td className="px-1.5 py-2 border border-gray-200">
                        {isUpdating ? (
                          <div className="flex items-center gap-1.5">
                            <i className="ri-loader-4-line animate-spin text-purple-600 text-xs"></i>
                            <span className="text-[10px] text-gray-500">Updating...</span>
                          </div>
                        ) : isActive ? (
                          <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-blue-100 text-blue-800">
                            Active
                          </span>
                        ) : data.yarnName && data.lotNumber && data.boxWeight && data.numberOfCones ? (
                          <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-green-100 text-green-800">
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-gray-100 text-gray-800">
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
                  <div className="bg-yellow-100 px-3 py-2 border-b border-yellow-200">
                    <h4 className="text-xs font-bold text-gray-900 flex items-center gap-2">
                      <i className="ri-error-warning-line text-yellow-600 text-xs"></i>
                      Unassigned Boxes
                      <span className="text-[10px] font-normal text-gray-600 ml-2">
                        ({boxesByLot.unassigned.length} {boxesByLot.unassigned.length === 1 ? 'box' : 'boxes'} - Please assign lot numbers)
                      </span>
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50/30">
                          <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Box ID</th>
                          <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Barcode</th>
                          <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Yarn Name</th>
                          <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Shade Code</th>
                          <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Lot Number</th>
                          <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Box Weight (kg)</th>
                          <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">No. of Cones</th>
                          <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                          {boxesByLot.unassigned.map((box) => {
                            const boxId = box._id || box.id || box.boxId;
                            const isActive = activeBoxId === boxId;
                            const defaultYarnName = box.yarnName && !box.yarnName.startsWith('Yarn-PO-') 
                              ? box.yarnName 
                              : '';
                            
                            const data = boxData[boxId] || {
                              yarnName: defaultYarnName,
                              shadeCode: box.shadeCode || '',
                              lotNumber: box.lotNumber || '',
                              boxWeight: box.boxWeight?.toString() || '',
                              numberOfCones: box.numberOfCones?.toString() || ''
                            };
                            const isUpdating = updatingBoxId === boxId;

                            return (
                              <tr 
                                key={boxId}
                                className={`hover:bg-gray-50/50 transition-colors group ${
                                  isActive ? 'bg-blue-50 border-2 border-blue-400' : ''
                                }`}
                              >
                                <td className="px-1.5 py-2 border border-gray-200">
                                  <button
                                    onClick={() => setSelectedBoxForDetails(box)}
                                    className="text-[12px] font-bold text-purple-600 hover:text-purple-700 hover:underline cursor-pointer"
                                    title="Click to view full details"
                                  >
                                    {truncateId(box.boxId)}
                                  </button>
                                </td>
                                <td className="px-1.5 py-2 border border-gray-200">
                                  <button
                                    onClick={() => setSelectedBoxForDetails(box)}
                                    className="text-[12px] text-gray-900 font-mono text-purple-600 hover:text-purple-700 hover:underline cursor-pointer"
                                    title="Click to view full details"
                                  >
                                    {truncateId(box.barcode)}
                                  </button>
                                </td>
                                <td className="px-1.5 py-2 border border-gray-200">
                                  {isActive && hasMultipleYarnNames() ? (
                                    <select
                                      className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
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
                                      {getUniqueYarnNames().map((yarnName) => (
                                        <option key={yarnName} value={yarnName}>
                                          {yarnName}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="text-[12px] text-gray-900">{data.yarnName || '-'}</span>
                                  )}
                                </td>
                                <td className="px-1.5 py-2 border border-gray-200">
                                  <span className="text-[12px] text-gray-900">{data.shadeCode || '-'}</span>
                                </td>
                                <td className="px-1.5 py-2 border border-gray-200">
                                  <span className="text-[12px] text-yellow-600 font-medium">{data.lotNumber || 'Not assigned'}</span>
                                </td>
                                <td className="px-1.5 py-2 border border-gray-200">
                                  {isActive ? (
                                    <input
                                      type="text"
                                      className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
                                      data-box-weight={boxId}
                                      value={rawInputValues[`box-${boxId}-boxWeight`] !== undefined 
                                        ? rawInputValues[`box-${boxId}-boxWeight`] 
                                        : (data.boxWeight === '' || data.boxWeight === '0' ? '' : data.boxWeight)}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        const sanitizedValue = validateNumericInput(value, true);
                                        const key = `box-${boxId}-boxWeight`;
                                        
                                        setRawInputValues(prev => ({
                                          ...prev,
                                          [key]: sanitizedValue
                                        }));
                                        
                                        setBoxData(prev => ({
                                          ...prev,
                                          [boxId]: { ...prev[boxId], boxWeight: sanitizedValue }
                                        }));
                                      }}
                                      onBlur={(e) => {
                                        const value = e.target.value;
                                        const key = `box-${boxId}-boxWeight`;
                                        const numValue = parseFloat(value);
                                        
                                        setRawInputValues(prev => {
                                          const newValues = { ...prev };
                                          delete newValues[key];
                                          return newValues;
                                        });
                                        
                                        if (value === '' || isNaN(numValue) || numValue <= 0) {
                                          setBoxData(prev => ({
                                            ...prev,
                                            [boxId]: { ...prev[boxId], boxWeight: '' }
                                          }));
                                        } else {
                                          setBoxData(prev => ({
                                            ...prev,
                                            [boxId]: { ...prev[boxId], boxWeight: value }
                                          }));
                                          
                                          // Auto-focus cones input when valid weight is entered
                                          setTimeout(() => {
                                            const coneInput = document.querySelector(`input[data-box-cones="${boxId}"]`) as HTMLInputElement;
                                            if (coneInput) {
                                              coneInput.focus();
                                              coneInput.select();
                                            }
                                          }, 100);
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          setTimeout(() => {
                                            const coneInput = document.querySelector(`input[data-box-cones="${boxId}"]`) as HTMLInputElement;
                                            if (coneInput) {
                                              coneInput.focus();
                                              coneInput.select();
                                            }
                                          }, 50);
                                        }
                                      }}
                                      placeholder="0.00"
                                    />
                                  ) : (
                                    <span className="text-[12px] text-gray-900">{data.boxWeight || '-'}</span>
                                  )}
                                </td>
                                <td className="px-1.5 py-2 border border-gray-200">
                                  {isActive ? (
                                    <input
                                      type="text"
                                      className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
                                      data-box-cones={boxId}
                                      value={rawInputValues[`box-${boxId}-numberOfCones`] !== undefined 
                                        ? rawInputValues[`box-${boxId}-numberOfCones`] 
                                        : (data.numberOfCones === '' || data.numberOfCones === '0' ? '' : data.numberOfCones)}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        const sanitizedValue = validateNumericInput(value, true);
                                        const key = `box-${boxId}-numberOfCones`;
                                        
                                        setRawInputValues(prev => ({
                                          ...prev,
                                          [key]: sanitizedValue
                                        }));
                                        
                                        setBoxData(prev => ({
                                          ...prev,
                                          [boxId]: { ...prev[boxId], numberOfCones: sanitizedValue }
                                        }));
                                      }}
                                      onBlur={(e) => {
                                        const value = e.target.value;
                                        const key = `box-${boxId}-numberOfCones`;
                                        const numValue = parseFloat(value);
                                        
                                        setRawInputValues(prev => {
                                          const newValues = { ...prev };
                                          delete newValues[key];
                                          return newValues;
                                        });
                                        
                                        if (value === '' || isNaN(numValue) || numValue <= 0) {
                                          setBoxData(prev => ({
                                            ...prev,
                                            [boxId]: { ...prev[boxId], numberOfCones: '' }
                                          }));
                                        } else {
                                          setBoxData(prev => ({
                                            ...prev,
                                            [boxId]: { ...prev[boxId], numberOfCones: value }
                                          }));
                                        }
                                      }}
                                      onKeyDown={async (e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          await handleUpdateBox(box);
                                          
                                          // Reset state and focus back to barcode input
                                          setActiveBoxId(null);
                                          setBarcodeScanValue('');
                                          
                                          // Focus back to barcode input after update
                                          setTimeout(() => {
                                            if (barcodeInputRef.current) {
                                              barcodeInputRef.current.focus();
                                            }
                                          }, 150);
                                        }
                                      }}
                                      placeholder="0"
                                    />
                                  ) : (
                                    <span className="text-[12px] text-gray-900">{data.numberOfCones || '-'}</span>
                                  )}
                                </td>
                                <td className="px-1.5 py-2 border border-gray-200">
                                  {isUpdating ? (
                                    <div className="flex items-center gap-1.5">
                                      <i className="ri-loader-4-line animate-spin text-purple-600 text-xs"></i>
                                      <span className="text-[10px] text-gray-500">Updating...</span>
                                    </div>
                                  ) : isActive ? (
                                    <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-blue-100 text-blue-800">
                                      Active
                                    </span>
                                  ) : data.yarnName && data.lotNumber && data.boxWeight && data.numberOfCones ? (
                                    <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-green-100 text-green-800">
                                      Completed
                                    </span>
                                  ) : (
                                    <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-yellow-100 text-yellow-800">
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

      {/* Box Details Modal - Side Drawer */}
      {selectedBoxForDetails && (
        <div className={`fixed inset-0 z-50 overflow-hidden ${selectedBoxForDetails ? '' : 'pointer-events-none'}`}>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity duration-300 ${
              selectedBoxForDetails ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={() => setSelectedBoxForDetails(null)}
          ></div>

          {/* Side Modal */}
          <div
            className={`fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl transform transition-transform duration-300 ease-in-out overflow-hidden flex flex-col ${
              selectedBoxForDetails ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* Header */}
            <div className="bg-primary text-white px-4 py-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Box Details</h3>
                  <p className="text-xs text-white/80 mt-0.5">{selectedBoxForDetails.boxId}</p>
                </div>
                <button
                  onClick={() => setSelectedBoxForDetails(null)}
                  className="text-white hover:text-gray-200 transition-colors"
                  aria-label="Close modal"
                >
                  <i className="ri-close-line text-lg"></i>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Box ID</label>
                  <div className="mt-0.5 text-xs text-gray-900 font-mono bg-gray-50 p-1.5 rounded border border-gray-200">
                    {selectedBoxForDetails.boxId}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Barcode</label>
                  <div className="mt-0.5 text-xs text-gray-900 font-mono bg-gray-50 p-1.5 rounded border border-gray-200">
                    {selectedBoxForDetails.barcode}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">PO Number</label>
                  <div className="mt-0.5 text-xs text-gray-900 bg-gray-50 p-1.5 rounded border border-gray-200">
                    {selectedBoxForDetails.poNumber}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Yarn Name</label>
                  <div className="mt-0.5 text-xs text-gray-900 bg-gray-50 p-1.5 rounded border border-gray-200">
                    {(() => {
                      const boxId = selectedBoxForDetails._id || selectedBoxForDetails.id || selectedBoxForDetails.boxId;
                      return boxData[boxId]?.yarnName || selectedBoxForDetails.yarnName || '-';
                    })()}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Shade Code</label>
                  <div className="mt-0.5 text-xs text-gray-900 bg-gray-50 p-1.5 rounded border border-gray-200">
                    {(() => {
                      const boxId = selectedBoxForDetails._id || selectedBoxForDetails.id || selectedBoxForDetails.boxId;
                      return boxData[boxId]?.shadeCode || selectedBoxForDetails.shadeCode || '-';
                    })()}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Lot Number</label>
                  <div className="mt-0.5 text-xs text-gray-900 bg-gray-50 p-1.5 rounded border border-gray-200">
                    {(() => {
                      const boxId = selectedBoxForDetails._id || selectedBoxForDetails.id || selectedBoxForDetails.boxId;
                      return boxData[boxId]?.lotNumber || selectedBoxForDetails.lotNumber || '-';
                    })()}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Box Weight (kg)</label>
                  <div className="mt-0.5 text-xs text-gray-900 bg-gray-50 p-1.5 rounded border border-gray-200">
                    {(() => {
                      const boxId = selectedBoxForDetails._id || selectedBoxForDetails.id || selectedBoxForDetails.boxId;
                      return boxData[boxId]?.boxWeight || selectedBoxForDetails.boxWeight || '-';
                    })()}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Number of Cones</label>
                  <div className="mt-0.5 text-xs text-gray-900 bg-gray-50 p-1.5 rounded border border-gray-200">
                    {(() => {
                      const boxId = selectedBoxForDetails._id || selectedBoxForDetails.id || selectedBoxForDetails.boxId;
                      return boxData[boxId]?.numberOfCones || selectedBoxForDetails.numberOfCones || '-';
                    })()}
                  </div>
                </div>
                {selectedBoxForDetails.receivedDate && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Received Date</label>
                    <div className="mt-0.5 text-xs text-gray-900 bg-gray-50 p-1.5 rounded border border-gray-200">
                      {new Date(selectedBoxForDetails.receivedDate).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {selectedBoxForDetails.orderDate && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Order Date</label>
                    <div className="mt-0.5 text-xs text-gray-900 bg-gray-50 p-1.5 rounded border border-gray-200">
                      {new Date(selectedBoxForDetails.orderDate).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {selectedBoxForDetails.conesIssued !== undefined && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Cones Issued</label>
                    <div className="mt-0.5">
                      <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
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

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-3 flex justify-end gap-2 flex-shrink-0 border-t border-gray-200">
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
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

