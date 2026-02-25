"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import yarnPurchaseOrderService, { PurchaseOrderStatus } from "@/shared/services/yarnPurchaseOrderService";
import yarnBoxService, { YarnBox, UpdateYarnBoxPayload, BulkMatchUpdateItem } from "@/shared/services/yarnBoxService";
import { QZTrayLoader, QZTrayStatus, QZTrayUntrustedWarning, QZTrayRequestBlocked } from "@/shared/components/qzTray";
import { printCones, connectQZ, getDefaultPrinter, isQZLoaded, getAvailablePrinters, PrinterInfo } from "@/shared/utils/qzTray";
import { fetchWeightLatest } from "@/shared/data/utilities/weightApi";
import * as XLSX from "xlsx";

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

  // Map receivedLotDetails if available and calculate received quantities
  const receivedQuantitiesMap = new Map<string, number>();
  const receivedLotDetails: ReceivedLotDetail[] | undefined = apiOrder.receivedLotDetails
    ? apiOrder.receivedLotDetails.map((lot: any) => {
      const normalizedStatus: ReceivedLotDetail['status'] = ['lot_pending', 'lot_qc_pending', 'lot_accepted', 'lot_rejected'].includes(lot.status)
        ? lot.status
        : 'lot_pending';

      // Map poItems and calculate received quantities
      const mappedPoItems = (lot.poItems || []).map((poItem: any) => {
        const poItemId = String(poItem.poItem || poItem.po_item || '');
        const receivedQty = poItem.receivedQuantity || poItem.received_quantity || 0;

        // Accumulate received quantities for each poItem
        if (poItemId) {
          const currentQty = receivedQuantitiesMap.get(poItemId) || 0;
          receivedQuantitiesMap.set(poItemId, currentQty + receivedQty);
        }

        return {
          poItem: poItemId,
          receivedQuantity: receivedQty
        };
      });

      return {
        lotNumber: lot.lotNumber || lot.lot_number || '',
        numberOfCones: lot.numberOfCones || lot.number_of_cones || 0,
        totalWeight: lot.totalWeight || lot.total_weight || 0,
        numberOfBoxes: lot.numberOfBoxes || lot.number_of_boxes || 0,
        status: normalizedStatus,
        poItems: mappedPoItems
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
    items: poItems.map((item: any, index: number) => {
      const itemId = String(item._id || item.id || `${index}`);
      const receivedQuantity = receivedQuantitiesMap.get(itemId) || item.receivedQuantity || item.received_quantity || 0;

      return {
        id: itemId,
        yarnCode: item.shadeCode || item.shade_code || item.shade || item.yarnCode || '',
        yarnName: item.yarnName || item.yarn?.yarnName || item.yarn_name || item.yarn?.name || '',
        sizeCount: item.sizeCount || item.size_count || item.countSize || '',
        shadeCode: item.shadeCode || item.shade_code || item.shade || '',
        orderedQuantity: item.quantity || 0,
        receivedQuantity: receivedQuantity,
        unitPrice: item.rate || item.unitPrice || 0,
        totalPrice: item.subTotal || item.sub_total || (item.quantity * (item.rate || 0)) || 0,
        qualityStatus: item.qualityStatus || item.quality_status || 'Pending' as 'Approved' | 'Rejected' | 'Pending'
      };
    }),
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
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExportingBoxes, setIsExportingBoxes] = useState(false);
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
  const [isOrderItemsSummaryOpen, setIsOrderItemsSummaryOpen] = useState(false);
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

  // Print settings modal state
  const [showPrintSettingsModal, setShowPrintSettingsModal] = useState(false);
  const [printSettings, setPrintSettings] = useState({
    paperSize: '50mm * 70mm' as '4x6' | '6x4' | '1.96x2.75' | '50mm * 70mm' | '50mm * 25mm',
    paperWidth: 398,  // 50mm approx
    paperHeight: 558, // 70mm approx
    labelsPerPage: 1,
    columnsPerRow: 1,
    firstLabelTopMargin: 0,
    supplierFontSize: 20,
    detailsFontSize: 20,
    boxIdFontSize: 20,
    rackCodeFontSize: 40,
    zoneFontSize: 30,
    barcodeHeight: 100,
    barcodeWidth: 3,
    qrCodeSize: 5,
    supplierYPos: 30,
    boxIdYPos: 65,
    yarnYPos: 120,
    lotYPos: 160,
    shadeYPos: 200,
    barcodeYPos: 300,
    footerYPos: 400,
    orientation: 'vertical' as 'horizontal' | 'vertical',
  });
  const [isTestPrint, setIsTestPrint] = useState(false);
  // When set, modal prints only this lot; when { type: 'all' }, prints all boxes. For 'lot', selectedBoxIds = which boxes to print.
  const [printModalContext, setPrintModalContext] = useState<{ type: 'all' } | { type: 'lot'; lotNumber: string; lotBoxes: YarnBox[]; selectedBoxIds: string[] } | null>(null);

  // Match Excel upload: bulk-match-update from Excel
  const matchExcelInputRef = useRef<HTMLInputElement>(null);
  const [isMatchExcelUploading, setIsMatchExcelUploading] = useState(false);
  const [matchExcelErrorDrawerOpen, setMatchExcelErrorDrawerOpen] = useState(false);
  const [matchExcelErrors, setMatchExcelErrors] = useState<string[]>([]);

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

  // Derive lot data from fetched order (avoids passing large payload in URL which breaks in production)
  useEffect(() => {
    if (!order?.orderNumber || !order.receivedLotDetails?.length) return;
    const details = order.receivedLotDetails
      .filter((lot) => lot.lotNumber && lot.numberOfBoxes > 0)
      .map((lot) => ({
        lotNumber: lot.lotNumber.trim(),
        numberOfBoxes: lot.numberOfBoxes,
      }));
    if (details.length > 0) {
      setLotData({ poNumber: order.orderNumber, lotDetails: details });
    }
  }, [order?.orderNumber, order?.receivedLotDetails]);

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

              // Auto-fill from lot PO items if lot number exists
              let autoFilledYarnName = yarnName;
              let autoFilledShadeCode = box.shadeCode || '';
              const boxLotNumber = box.lotNumber || '';

              if (boxLotNumber && rawApiOrder) {
                const poItemOptions = getPOItemsDataFromLotNumber(boxLotNumber);
                if (poItemOptions.length > 0) {
                  // Default to first yarn from lot's PO items
                  autoFilledYarnName = poItemOptions[0].yarnName;
                  autoFilledShadeCode = poItemOptions[0].shadeCode;
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

  // Fetch latest weight from box scale API (192.168.0.105:7001, then localhost:7001)
  const fetchLatestWeight = async (): Promise<number | null> => {
    try {
      setIsFetchingWeight(true);
      const weight = await fetchWeightLatest('boxes');
      return weight;
    } catch (error) {
      console.error('Failed to fetch weight:', error);
      return null;
    } finally {
      setIsFetchingWeight(false);
    }
  };

  // Get PO item yarn options from lot number using receivedLotDetails
  const getPOItemsDataFromLotNumber = (lotNumber: string): Array<{ yarnName: string; shadeCode: string }> => {
    if (!rawApiOrder || !rawApiOrder.receivedLotDetails || !rawApiOrder.poItems) {
      return [];
    }

    // Find the lot in receivedLotDetails
    const lot = rawApiOrder.receivedLotDetails.find((l: any) =>
      (l.lotNumber || '').trim().toUpperCase() === lotNumber.trim().toUpperCase()
    );

    if (!lot || !lot.poItems || lot.poItems.length === 0) {
      return [];
    }

    // Get PO item IDs from lot and preserve order
    const poItemIds = (lot.poItems || [])
      .map((poItem: any) => String(poItem?.poItem || poItem?.po_item || ''))
      .filter(Boolean);

    if (poItemIds.length === 0) {
      return [];
    }

    const poItemsById = new Map<string, any>(
      (rawApiOrder.poItems || []).map((item: any) => [String(item._id || item.id), item])
    );

    const seen = new Set<string>();
    const options: Array<{ yarnName: string; shadeCode: string }> = [];

    poItemIds.forEach((poItemId: string) => {
      const poItem = poItemsById.get(poItemId);
      if (!poItem) return;

      const yarnName = poItem.yarnName || '';
      const shadeCode = poItem.shadeCode || '';
      const key = `${yarnName}__${shadeCode}`;
      if (yarnName && !seen.has(key)) {
        seen.add(key);
        options.push({ yarnName, shadeCode });
      }
    });

    return options;
  };

  // Get first PO item data from lot number (default selection)
  const getPOItemDataFromLotNumber = (lotNumber: string): { yarnName: string; shadeCode: string } | null => {
    const options = getPOItemsDataFromLotNumber(lotNumber);
    return options.length > 0 ? options[0] : null;
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

        // Auto-fill data from lot PO items if lot number exists
        let autoFilledData = {
          yarnName: existingData?.yarnName || '',
          shadeCode: existingData?.shadeCode || '',
          lotNumber: lotNumber
        };

        if (lotNumber && rawApiOrder) {
          const poItemOptions = getPOItemsDataFromLotNumber(lotNumber);
          if (poItemOptions.length > 0) {
            // Default to first yarn from lot's PO items
            autoFilledData.yarnName = poItemOptions[0].yarnName;
            autoFilledData.shadeCode = poItemOptions[0].shadeCode;
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

  // Handle yarn name change - auto-fill shade code
  const handleYarnNameChange = (boxId: string, yarnName: string, lotNumber?: string) => {
    const lotOptions = lotNumber ? getPOItemsDataFromLotNumber(lotNumber) : [];
    const lotMatch = lotOptions.find(option => option.yarnName === yarnName);

    setBoxData(prev => ({
      ...prev,
      [boxId]: {
        ...prev[boxId],
        yarnName,
        shadeCode: lotMatch?.shadeCode || getShadeCodeForYarn(yarnName)
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
  // Helper function to convert number to words (simple version)
  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (num === 0) return 'Zero';
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
    if (num < 1000) {
      const hundred = Math.floor(num / 100);
      const remainder = num % 100;
      return ones[hundred] + ' Hundred' + (remainder !== 0 ? ' ' + numberToWords(remainder) : '');
    }
    if (num < 100000) {
      const thousand = Math.floor(num / 1000);
      const remainder = num % 1000;
      return numberToWords(thousand) + ' Thousand' + (remainder !== 0 ? ' ' + numberToWords(remainder) : '');
    }
    if (num < 10000000) {
      const lakh = Math.floor(num / 100000);
      const remainder = num % 100000;
      return numberToWords(lakh) + ' Lakh' + (remainder !== 0 ? ' ' + numberToWords(remainder) : '');
    }
    const crore = Math.floor(num / 10000000);
    const remainder = num % 10000000;
    return numberToWords(crore) + ' Crore' + (remainder !== 0 ? ' ' + numberToWords(remainder) : '');
  };

  const handlePrintOrderSummary = async () => {
    if (!order || !rawApiOrder) {
      toast.error('Order data not available');
      return;
    }

    setIsPrinting(true);
    try {
      // Fetch the NEW HTML template
      const response = await fetch('/templates/goods-received-note.html');
      if (!response.ok) throw new Error('Failed to load template');
      let htmlTemplate = await response.text();

      // Helper function to format date as DD-MM-YYYY
      const formatDate = (date: string | Date): string => {
        if (!date) return 'N/A';
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'N/A';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
      };

      // Get supplier details from raw API response
      const supplierData = rawApiOrder?.supplier || {};
      const supplierName = rawApiOrder?.supplierName || supplierData?.brandName || order.supplier || 'N/A';
      const supplierAddress = supplierData?.address || 'N/A';
      const supplierCity = supplierData?.city || '';
      const supplierState = supplierData?.state || '';
      const supplierLocation = [supplierCity, supplierState].filter(Boolean).join(', ') || 'N/A';
      const supplierContactNumber = supplierData?.contactNumber || 'N/A';
      const supplierContactName = supplierData?.contactPersonName || '';
      const supplierEmail = supplierData?.email || 'N/A';
      const supplierGST = supplierData?.gstNo || supplierData?.gstin || supplierData?.gst || 'N/A';

      // Replace Supplier Info
      htmlTemplate = htmlTemplate.replace(/id="supplier-name".*?>.*?<\/div>/, `id="supplier-name">${supplierName}</div>`);
      htmlTemplate = htmlTemplate.replace(/id="supplier-address".*?>[\s\S]*?<\/div>/, `id="supplier-address">${supplierAddress}<br>${supplierLocation}</div>`);
      htmlTemplate = htmlTemplate.replace(/id="supplier-email".*?>.*?<\/span>/, `id="supplier-email">${supplierEmail}</span>`);
      htmlTemplate = htmlTemplate.replace(/id="supplier-mob".*?>.*?<\/span>/, `id="supplier-mob">${supplierContactNumber}</span>`);
      htmlTemplate = htmlTemplate.replace(/id="supplier-gst".*?>.*?<\/span>/, `id="supplier-gst">${supplierGST}</span>`);

      // Consignee is fixed to ADDON HOLDINGS as per image, but we can ensure state code/gst is correct
      htmlTemplate = htmlTemplate.replace(/id="consignee-state-code".*?>.*?<\/span>/, `id="consignee-state-code">27</span>`);
      htmlTemplate = htmlTemplate.replace(/id="consignee-gst".*?>.*?<\/span>/, `id="consignee-gst">27AAACA8827A1ZZ</span>`);

      // Get order details
      const orderItems = rawApiOrder?.poItems || rawApiOrder?.items || [];
      const poNumber = rawApiOrder?.poNumber || order.orderNumber || 'N/A';
      const orderDate = rawApiOrder?.createDate || order.receivedDate;
      const subTotal = rawApiOrder?.subTotal || 0;
      const totalGst = rawApiOrder?.gst || 0;
      const totalAmount = rawApiOrder?.total || order.totalAmount || 0;
      const notes = rawApiOrder?.notes || order.notes || '';

      // Get packlist details
      const packlistDetails = rawApiOrder?.packListDetails?.[0] || order.packListDetails;
      const invoiceNo = rawApiOrder?.invoiceNo || rawApiOrder?.billNo || poNumber;
      const dispatchDoc = packlistDetails?.trackingNumber || 'N/A';
      const deliveryNote = '';

      // Header Grid values
      htmlTemplate = htmlTemplate.replace(/id="invoice-no".*?>.*?<\/div>/, `id="invoice-no">${invoiceNo}</div>`);
      htmlTemplate = htmlTemplate.replace(/id="invoice-date".*?>.*?<\/div>/, `id="invoice-date">${formatDate(orderDate)}</div>`);
      htmlTemplate = htmlTemplate.replace(/id="delivery-note".*?>.*?<\/div>/, `id="delivery-note">${deliveryNote}</div>`);
      htmlTemplate = htmlTemplate.replace(/id="po-no".*?>.*?<\/div>/, `id="po-no">${poNumber}</div>`);
      htmlTemplate = htmlTemplate.replace(/id="po-date".*?>.*?<\/div>/, `id="po-date">${formatDate(orderDate)}</div>`);
      htmlTemplate = htmlTemplate.replace(/id="dispatch-doc".*?>.*?<\/div>/, `id="dispatch-doc">${dispatchDoc}</div>`);
      htmlTemplate = htmlTemplate.replace(/id="delivery-date".*?>.*?<\/div>/, `id="delivery-date">${packlistDetails?.estimatedDeliveryDate ? formatDate(packlistDetails.estimatedDeliveryDate) : 'N/A'}</div>`);

      // Generation of items rows
      let itemsHtml = '';
      let totalQty = 0;
      orderItems.forEach((item: any, index: number) => {
        const yarnName = item.yarnName || item.yarn?.yarnName || 'N/A';
        const sizeCount = item.sizeCount || 'N/A';
        const shadeCode = item.shadeCode || 'N/A';
        const quantity = item.quantity || 0;
        const rate = item.rate || 0;
        const amount = quantity * rate;
        totalQty += quantity;

        itemsHtml += `
          <tr>
            <td class="text-center" style="border: 1px solid #000; padding: 4px;">${index + 1}</td>
            <td class="text-center" style="border: 1px solid #000; padding: 4px;">${shadeCode}</td>
            <td style="border: 1px solid #000; padding: 4px;">${yarnName}${sizeCount !== 'N/A' ? ' - ' + sizeCount : ''}</td>
            <td class="text-right" style="border: 1px solid #000; padding: 4px;">${quantity.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-right" style="border: 1px solid #000; padding: 4px;">${rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-center" style="border: 1px solid #000; padding: 4px;">KGS</td>
            <td class="text-right" style="border: 1px solid #000; padding: 4px;">${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>`;
      });

      htmlTemplate = htmlTemplate.replace(/<tbody id="items-body">[\s\S]*?<\/tbody>/, `<tbody id="items-body">${itemsHtml}</tbody>`);
      htmlTemplate = htmlTemplate.replace(/id="total-qty".*?>.*?<\/td>/, `id="total-qty">${totalQty.toLocaleString('en-IN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>`);
      htmlTemplate = htmlTemplate.replace(/id="total-amount".*?>.*?<\/td>/, `id="total-amount">${subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>`);

      // Round off calculation
      const roundOff = totalAmount - (subTotal + totalGst);
      htmlTemplate = htmlTemplate.replace(/id="round-off".*?>.*?<\/td>/, `id="round-off" style="padding: 1px 4px; font-size: 8px;">${roundOff.toFixed(2)}</td>`);

      // Calculate GST
      const isSameState = supplierState?.toLowerCase() === 'maharashtra' || supplierState?.toLowerCase() === 'mh';
      const avgGstRate = orderItems.length > 0 ? (orderItems.reduce((sum: number, item: any) => sum + (item.gstRate || item.gst || 18), 0) / orderItems.length) : 0;

      let taxLabel = isSameState ? `GST ${avgGstRate.toFixed(1)}%` : `IGST ${avgGstRate.toFixed(1)}%`;
      let sgst = isSameState ? (totalGst / 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
      let igst = isSameState ? (totalGst / 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      htmlTemplate = htmlTemplate.replace(/id="tax-rate-label".*?>.*?<\/td>/, `id="tax-rate-label">${taxLabel}</td>`);
      htmlTemplate = htmlTemplate.replace(/id="taxable-value".*?>.*?<\/td>/, `id="taxable-value">${subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>`);
      htmlTemplate = htmlTemplate.replace(/id="sgst-amount".*?>.*?<\/td>/, `id="sgst-amount">${sgst}</td>`);
      htmlTemplate = htmlTemplate.replace(/id="igst-amount".*?>.*?<\/td>/, `id="igst-amount">${igst}</td>`);
      htmlTemplate = htmlTemplate.replace(/id="grand-total".*?>.*?<\/td>/, `id="grand-total" style="width: 16%;">${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>`);

      // Amount in words
      const rupees = Math.floor(totalAmount);
      const paise = Math.round((totalAmount - rupees) * 100);
      let amountInWords = `${numberToWords(rupees)} Only`;
      if (paise > 0) {
        amountInWords = `${numberToWords(rupees)} and ${numberToWords(paise)} Paise Only`;
      }
      htmlTemplate = htmlTemplate.replace(/id="total-in-words">.*?<\/span>/, `id="total-in-words">${amountInWords}</span>`);
      htmlTemplate = htmlTemplate.replace(/id="narration">.*?<\/span>/, `id="narration">${notes || 'N/A'}</span>`);

      // Open print window
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlTemplate);
        printWindow.document.close();
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            setIsPrinting(false);
          }, 500);
        };
      } else {
        setIsPrinting(false);
        toast.error('Please allow popups to print summary');
      }
    } catch (error) {
      console.error('Error printing summary:', error);
      toast.error('Failed to load summary template');
      setIsPrinting(false);
    }
  };

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

  // Map box print settings to cone label customSettings (for QR code printing)
  const getBoxConePrintSettings = () => ({
    paperWidth: printSettings.paperWidth,
    paperHeight: printSettings.paperHeight,
    orientation: printSettings.orientation,
    labelsPerPage: printSettings.labelsPerPage,
    columnsPerRow: printSettings.columnsPerRow ?? 2,
    firstLabelTopMargin: printSettings.firstLabelTopMargin,
    showCutLines: false,
    qrCodeSize: printSettings.qrCodeSize ?? 5,
    titleFontSize: printSettings.detailsFontSize,
    detailsFontSize: printSettings.detailsFontSize,
    boxIdFontSize: printSettings.boxIdFontSize,
    yarnFontSize: printSettings.detailsFontSize,
    supplierFontSize: printSettings.supplierFontSize,
    shadeLotFontSize: printSettings.detailsFontSize,
    barcodeHeight: printSettings.barcodeHeight,
    barcodeWidth: printSettings.barcodeWidth,
  });

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
      shadeName: shadeName || shadeCode || '-',
      boxWeight: data?.boxWeight || box.boxWeight?.toString() || ''
    };
  };

  /** Get paper size in mm for browser print preview (like LongTermStorageLayout) */
  const getPaperSizeMm = (): { paperW: number; paperH: number } => {
    const isSmall = printSettings.paperSize === '50mm * 25mm';
    let paperW = 101.6; // 4"
    let paperH = 152.4; // 6"

    if (isSmall) { paperW = 50; paperH = 25; }
    else if (printSettings.paperSize === '6x4') { paperW = 152.4; paperH = 101.6; }
    else if (printSettings.paperSize === '1.96x2.75' || printSettings.paperSize === '50mm * 70mm') { paperW = 50; paperH = 70; }

    return { paperW, paperH };
  };

  /**
   * Build browser print preview HTML (LongTermStorageLayout-style: @page, mm layout, auto window.print()).
   * This matches the 'storage' behavior: direct print, no toolbar, auto-close.
   */
  const getBrowserPrintPreviewHTML = (
    boxesWithLot: Array<{ box: YarnBox; lotLabel: string }>,
    title: string
  ): string => {
    if (boxesWithLot.length === 0) return '';
    const { paperW, paperH } = getPaperSizeMm();
    const isSmall = printSettings.paperSize === '50mm * 25mm';
    const isVertical = printSettings.orientation === 'vertical';

    const cols = printSettings.columnsPerRow ?? 1;
    const labelsPerPage = printSettings.labelsPerPage ?? 1;
    const rowsPerPage = Math.ceil(labelsPerPage / cols);
    const labelW = paperW / cols;
    const labelH = paperH / rowsPerPage;

    let idx = 0;
    const labelHtml = (box: YarnBox, lotLabel: string) => {
      const details = getBoxPrintDetails(box);
      const uniqueId = `bc-${idx++}`;
      return `
        <div class="label">
          <div class="content">
            <div class="code">${(box.boxId || '').replace(/</g, '&lt;')}</div>
            <div class="supplier">${(order?.supplier || '-').split(' ').slice(0, 2).join(' ').replace(/</g, '&lt;')}</div>
            <div class="details">
              Yarn: ${(details.yarnName || '-').replace(/</g, '&lt;')}<br/>
              L: ${(lotLabel || '-').replace(/</g, '&lt;')}<br/>
              S: ${(details.shadeCode || '-').replace(/</g, '&lt;')}
              ${details.boxWeight ? `<br/>WT: ${details.boxWeight} kg` : ''}
            </div>
            <div class="barcode"><svg id="${uniqueId}"></svg></div>
          </div>
        </div>`;
    };

    let pagesHtml = '';
    for (let i = 0; i < boxesWithLot.length; i += labelsPerPage) {
      pagesHtml += '<div class="page">';
      for (let j = 0; j < labelsPerPage && (i + j) < boxesWithLot.length; j++) {
        const { box, lotLabel } = boxesWithLot[i + j];
        pagesHtml += labelHtml(box, lotLabel);
      }
      pagesHtml += '</div>';
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Browser Print - Box Labels</title>
          <style>
            @page { size: ${paperW}mm ${paperH}mm; margin: 0; }
            body { margin: 0; padding: 0; font-family: sans-serif; -webkit-print-color-adjust: exact; }
            .page {
              width: ${paperW}mm;
              height: ${paperH}mm;
              position: relative;
              page-break-after: always;
              overflow: hidden;
            }
            .label {
              width: ${labelW}mm;
              height: ${labelH}mm;
              float: left;
              box-sizing: border-box;
              padding: 1.5mm;
              display: flex;
              justify-content: center;
              align-items: center;
              border: 0.1mm dotted #eee;
              overflow: hidden;
            }
            @media print { .label { border: none; } }
            .content {
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              text-align: center;
              width: 100%;
              height: 100%;
              ${isVertical ? `
                transform: rotate(-90deg);
                width: ${labelH}mm;
                height: ${labelW}mm;
              ` : ''}
            }
            .code { font-weight: bold; font-size: ${isSmall ? '13pt' : '21pt'}; margin-bottom: 1mm; line-height: 1.1; }
            .supplier { font-size: ${isSmall ? '8pt' : '12pt'}; color: #666; margin-bottom: 1mm; white-space: nowrap; font-weight: normal; }
            .details { font-size: ${isSmall ? '10pt' : '16pt'}; margin-bottom: 2mm; white-space: normal; font-weight: normal; }
            .barcode { width: 100%; max-height: 45%; display: flex; justify-content: center; align-items: center; }
            svg { width: 90%; height: auto; max-height: 100%; }
          </style>
        </head>
        <body>
          ${pagesHtml}
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <script>
            window.onload = function() {
              const boxes = ${JSON.stringify(boxesWithLot.map(b => ({ barcode: b.box.barcode }))).replace(/<\/script>/g, '<\\/script>')};
              boxes.forEach((b, idx) => {
                const el = document.getElementById('bc-' + idx);
                if (el && b.barcode) {
                  JsBarcode(el, b.barcode, {
                    format: "CODE128",
                    width: 2,
                    height: ${isSmall ? 40 : 60},
                    displayValue: true,
                    fontSize: ${isSmall ? 10 : 14},
                    margin: 0
                  });
                }
              });
              setTimeout(() => { window.print(); window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;
  };

  const handlePaperSizeChange = (size: '4x6' | '6x4' | '1.96x2.75' | '50mm * 70mm' | '50mm * 25mm') => {
    if (size === '4x6') {
      setPrintSettings({
        ...printSettings,
        paperSize: '4x6',
        paperWidth: 812,
        paperHeight: 1218,
        orientation: 'horizontal',
      });
    } else if (size === '6x4') {
      setPrintSettings({
        ...printSettings,
        paperSize: '6x4',
        paperWidth: 1218,
        paperHeight: 812,
        orientation: 'horizontal',
      });
    } else if (size === '1.96x2.75' || size === '50mm * 70mm') {
      setPrintSettings({
        ...printSettings,
        paperSize: size,
        paperWidth: 398,  // 1.96 inches × 203 DPI
        paperHeight: 558, // 2.75 inches × 203 DPI
        labelsPerPage: 1,
        columnsPerRow: 1,
        orientation: 'vertical',
        firstLabelTopMargin: 20,
        rackCodeFontSize: 40,
        barcodeHeight: 100,
        detailsFontSize: 20,
        supplierFontSize: 20,
        boxIdFontSize: 19,
        barcodeWidth: 3,
        barcodeYPos: 300,
        footerYPos: 400,
      });

    } else if (size === '50mm * 25mm') {
      setPrintSettings({
        ...printSettings,
        paperSize: '50mm * 25mm',
        paperWidth: 406,  // 2 inches
        paperHeight: 203, // 1 inch
        labelsPerPage: 1,
        columnsPerRow: 1,
        barcodeHeight: 40,
        barcodeWidth: 2,
        orientation: 'horizontal',
      });
    }
  };

  const handleOrientationChange = (orientation: 'horizontal' | 'vertical') => {
    let newWidth = printSettings.paperWidth;
    let newHeight = printSettings.paperHeight;

    if (printSettings.paperSize === '50mm * 70mm' || printSettings.paperSize === '1.96x2.75') {
      newWidth = orientation === 'horizontal' ? 560 : 400; // 70mm vs 50mm
      newHeight = orientation === 'horizontal' ? 400 : 560; // 50mm vs 70mm
    } else {
      // 4x6 / 6x4
      // Max dimension 1218, min 812
      const max = Math.max(printSettings.paperWidth, printSettings.paperHeight);
      const min = Math.min(printSettings.paperWidth, printSettings.paperHeight);
      newWidth = orientation === 'horizontal' ? max : min;
      newHeight = orientation === 'horizontal' ? min : max;
    }

    setPrintSettings({
      ...printSettings,
      orientation,
      paperWidth: newWidth,
      paperHeight: newHeight,
    });
  };

  const handlePrintAllBarcodes = async () => {
    setIsTestPrint(false); // Reset test print flag
    if (!order || boxes.length === 0) {
      toast.error('No boxes available to print');
      return;
    }
    setPrintModalContext({ type: 'all' });
    setShowPrintSettingsModal(true);
  };

  const openPrintModalForLot = (lotNumber: string, lotBoxes: YarnBox[]) => {
    setIsTestPrint(false);
    if (!order || lotBoxes.length === 0) {
      toast.error('No boxes available to print for this lot');
      return;
    }
    const allIds = lotBoxes.map((b) => b._id || b.id || b.boxId || '').filter(Boolean);
    setPrintModalContext({ type: 'lot', lotNumber, lotBoxes, selectedBoxIds: allIds });
    setShowPrintSettingsModal(true);
  };

  const handleTestPrint = () => {
    setIsTestPrint(true);
    setShowPrintSettingsModal(true);
  };

  const executePrintWithSettings = async () => {
    const context = printModalContext;
    setShowPrintSettingsModal(false);

    // If Test Print
    if (isTestPrint) {
      try {
        if (!isQZLoaded()) {
          toast.error('QZ Tray script not loaded. Please wait a moment and try again.');
          return;
        }
        const isActive = typeof window !== 'undefined' && typeof window.qz !== 'undefined' && window.qz.websocket && window.qz.websocket.isActive() === true;
        if (!isActive) {
          toast.loading('Connecting to QZ Tray...');
          const connection = await connectQZ();
          if (!connection.isConnected) {
            toast.dismiss();
            toast.error(connection.error || 'QZ Tray not connected');
            return;
          }
        }
        toast.loading('Detecting printer...');
        const defaultPrinter = await getDefaultPrinter();
        toast.dismiss();
        if (!defaultPrinter) {
          toast.error('No printer found. Please set a default printer in your system settings.');
          return;
        }
        const dummyBox = {
          barcode: 'TEST-123456789',
          boxId: 'TEST-BOX-001',
          yarnName: 'Test Yarn Name',
          shadeCode: 'TEST-SHADE',
          lotNumber: 'TEST-LOT',
          supplierName: 'Test Supplier',
          poNumber: 'PO-TEST-001',
        };
        const result = await printCones([dummyBox], {
          customSettings: getBoxConePrintSettings(),
        });
        if (result.success) {
          toast.success('Test label printed successfully');
        } else {
          toast.error('Failed to print test label: ' + (result.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Test print failed:', error);
        toast.error(error instanceof Error ? error.message : 'Test print failed');
      }
      return;
    }

    let boxesToPrint: YarnBox[] = [];
    if (context?.type === 'lot') {
      const idSet = new Set(context.selectedBoxIds);
      boxesToPrint = context.lotBoxes.filter((b) => idSet.has(b._id || b.id || b.boxId || ''));
      if (boxesToPrint.length === 0) {
        toast.error('Select at least one box to print');
        return;
      }
    } else {
      // For 'all' or default: print lot-wise
      boxesByLot.sortedLots.forEach((lotNum) => {
        boxesByLot.grouped[lotNum].forEach((box) => boxesToPrint.push(box));
      });
      // Add unassigned boxes at the end
      boxesByLot.unassigned.forEach((box) => boxesToPrint.push(box));
    }
    if (!order || boxesToPrint.length === 0) {
      toast.error('No boxes available to print');
      return;
    }

    setIsPrinting(true);
    try {
      // Check script status first
      if (!isQZLoaded()) {
        toast.error('QZ Tray script not loaded. Please wait a moment and try again.');
        setIsPrinting(false);
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
          setIsPrinting(false);
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
        setIsPrinting(false);
        return;
      }

      // Prepare box labels for printing (QR code encodes box barcode; same details as before)
      const conesToPrint = boxesToPrint
        .filter((box) => box.barcode)
        .map((box) => {
          const details = getBoxPrintDetails(box);
          return {
            barcode: String(box.barcode),
            boxId: box.boxId,
            yarnName: details.yarnName,
            shadeCode: details.shadeCode,
            weight: details.boxWeight ? parseFloat(details.boxWeight) : undefined,
            lotNumber: context?.type === 'lot' ? context.lotNumber : (box.lotNumber || ''),
            supplierName: (order.supplier || '').split(' ').slice(0, 2).join(' '),
            poNumber: order.orderNumber || '',
          };
        });

      if (conesToPrint.length === 0) {
        toast.dismiss();
        toast.error('No boxes with barcodes to print');
        setIsPrinting(false);
        return;
      }

      const pageCount = Math.ceil(conesToPrint.length / printSettings.labelsPerPage);
      const scopeLabel = context?.type === 'lot' ? ` for Lot ${context.lotNumber}` : '';
      toast.loading(`Printing ${conesToPrint.length} label(s) on ${pageCount} page(s) (${printSettings.labelsPerPage} labels/page) to ${defaultPrinter.name}${scopeLabel}...`);

      // Match cone page: pass only customSettings so printCones uses getDefault() internally (same path as working cone print)
      const result = await printCones(conesToPrint, {
        customSettings: getBoxConePrintSettings(),
      });

      toast.dismiss();

      if (result.success) {
        const scopeMsg = context?.type === 'lot' ? ` for Lot ${context.lotNumber}` : '';
        toast.success(`Successfully printed ${result.printed} label(s)${scopeMsg}`, { duration: 3000 });
      } else {
        toast.error(result.error || 'Failed to print labels', { duration: 5000 });
        if (result.error) console.error('Print error:', result.error);
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
    } finally {
      setIsPrinting(false);
    }
  };

  /** Open browser print preview (LongTermStorageLayout-style: @page, mm layout, preview only with Print/Close). */
  const handlePrintAllBarcodesBrowser = () => {
    if (!order || boxes.length === 0) {
      toast.error('No boxes available to print');
      return;
    }
    const boxesWithLot: Array<{ box: YarnBox; lotLabel: string }> = [];
    boxesByLot.sortedLots.forEach((lotNumber) => {
      boxesByLot.grouped[lotNumber].forEach((box) => boxesWithLot.push({ box, lotLabel: lotNumber }));
    });
    boxesByLot.unassigned.forEach((box) => boxesWithLot.push({ box, lotLabel: '—' }));
    const html = getBrowserPrintPreviewHTML(boxesWithLot, order.orderNumber || 'Box Labels');
    if (!html) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print labels');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    toast.success('Print preview opened. It will auto-print and close.');
  };

  const handlePrintLotBarcodesBrowser = (lotNumber: string, lotBoxes: YarnBox[], selectedBoxIds?: string[]) => {
    if (!order || lotBoxes.length === 0) {
      toast.error('No boxes available to print for this lot');
      return;
    }
    const toPrint = selectedBoxIds?.length
      ? lotBoxes.filter((b) => selectedBoxIds.includes(b._id || b.id || b.boxId || ''))
      : lotBoxes;
    if (toPrint.length === 0) {
      toast.error('Select at least one box to print');
      return;
    }
    const boxesWithLot = toPrint.map((box) => ({ box, lotLabel: lotNumber }));
    const html = getBrowserPrintPreviewHTML(boxesWithLot, `Lot ${lotNumber}`);
    if (!html) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print barcodes');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    toast.success('Print preview opened. It will auto-print and close.');
  };

  /** Export all boxes data lot-wise to Excel. */
  const handleExportBoxesToExcel = () => {
    if (!order || boxes.length === 0) {
      toast.error('No boxes to export');
      return;
    }
    setIsExportingBoxes(true);
    try {
      const rows: Array<Record<string, string | number>> = [];
      const addBoxRow = (box: YarnBox, lotNumber: string) => {
        const boxId = box._id || box.id || box.boxId;
        const data = boxData[boxId];
        const lotStatus = getLotStatus(lotNumber);
        rows.push({
          "Lot Number": lotNumber,
          "Lot Status": lotStatus ? getLotStatusDisplay(lotStatus).text : "",
          "Box ID": box.boxId ?? "",
          "Barcode": box.barcode ?? "",
          "PO Number": order.purchaseOrderNumber ?? "",
          "Supplier": order.supplier ?? "",
          "Yarn Name": data?.yarnName ?? box.yarnName ?? "",
          "Shade Code": data?.shadeCode ?? box.shadeCode ?? "",
          "Box Weight (kg)": data?.boxWeight ? parseFloat(data.boxWeight) : (box.boxWeight ?? ""),
          "Number of Cones": data?.numberOfCones ?? box.numberOfCones ?? "",
          "Received Date": order.receivedDate ? new Date(order.receivedDate).toLocaleDateString() : "",
        });
      };
      boxesByLot.sortedLots.forEach((lotNum) => {
        boxesByLot.grouped[lotNum].forEach((box) => addBoxRow(box, lotNum));
      });
      boxesByLot.unassigned.forEach((box) => addBoxRow(box, "Unassigned"));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Boxes by Lot");
      const fileName = `boxes_lotwise_${order.purchaseOrderNumber}_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(`Exported ${rows.length} boxes to ${fileName}`);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to export Excel");
    } finally {
      setIsExportingBoxes(false);
    }
  };

  /** Parse Excel file for Match Excel Upload. Expects columns: Lot Number, Box ID, Barcode, PO Number, Yarn Name, Shade Code, Box Weight (kg), Number of Cones. */
  const parseMatchExcel = (file: File): Promise<BulkMatchUpdateItem[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            reject(new Error("Failed to read file"));
            return;
          }
          const wb = XLSX.read(data, { type: "binary" });
          const firstSheet = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
          const get = (row: Record<string, unknown>, ...keys: string[]) => {
            for (const k of keys) {
              const v = row[k];
              if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
            }
            return "";
          };
          const num = (row: Record<string, unknown>, ...keys: string[]) => {
            const s = get(row, ...keys);
            const n = parseFloat(s);
            return Number.isFinite(n) ? n : 0;
          };
          const items: BulkMatchUpdateItem[] = [];
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const lotNumber = get(row, "Lot Number", "lotNumber", "LotNumber");
            const boxId = get(row, "Box ID", "boxId", "Box ID", "BoxId");
            const barcode = get(row, "Barcode", "barcode");
            const poNumber = get(row, "PO Number", "poNumber", "PO Number", "PONumber");
            const yarnName = get(row, "Yarn Name", "yarnName", "YarnName");
            const shadeCode = get(row, "Shade Code", "shadeCode", "ShadeCode");
            const boxWeight = num(row, "Box Weight (kg)", "Box Weight (kg)", "boxWeight", "Box Weight");
            const numberOfCones = num(row, "Number of Cones", "numberOfCones", "Number of Cones", "NumberOfCones");
            if (!boxId && !barcode) continue; // skip empty rows
            items.push({
              lotNumber: lotNumber || "",
              poNumber: poNumber || "",
              yarnName: yarnName || "",
              shadeCode: shadeCode || "",
              boxWeight,
              numberOfCones: Math.round(numberOfCones),
              barcode: barcode || "",
              boxId: boxId || "",
            });
          }
          if (items.length === 0) reject(new Error("No valid rows in Excel (need at least Box ID or Barcode)."));
          resolve(items);
        } catch (err) {
          reject(err instanceof Error ? err : new Error("Failed to parse Excel"));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsBinaryString(file);
    });
  };

  const handleMatchExcelUpload = async (file: File) => {
    if (!order) return;
    setIsMatchExcelUploading(true);
    setMatchExcelErrors([]);
    setMatchExcelErrorDrawerOpen(false);
    try {
      const items = await parseMatchExcel(file);
      await yarnBoxService.bulkMatchUpdate({ items });
      toast.success(`Bulk match update completed for ${items.length} row(s).`);
      fetchBoxes();
    } catch (err: unknown) {
      let errorList: string[] = [];
      if (err && typeof err === "object" && Array.isArray((err as { errors?: string[] }).errors)) {
        errorList = (err as { errors: string[] }).errors;
      } else {
        const message = err instanceof Error ? err.message : "Bulk match update failed.";
        errorList = message.includes("\n") ? message.split("\n").filter(Boolean) : [message];
      }
      setMatchExcelErrors(errorList);
      setMatchExcelErrorDrawerOpen(true);
      toast.error("Match Excel update failed. See errors.");
    } finally {
      setIsMatchExcelUploading(false);
      if (matchExcelInputRef.current) matchExcelInputRef.current.value = "";
    }
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
      <QZTrayUntrustedWarning />
      <QZTrayRequestBlocked />
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

              <input
                type="file"
                ref={matchExcelInputRef}
                className="hidden"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleMatchExcelUpload(f);
                }}
              />
              {boxes.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportBoxesToExcel}
                  disabled={isExportingBoxes}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded transition-colors shadow-sm ${!isExportingBoxes ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                  title={isExportingBoxes ? 'Exporting...' : 'Export all boxes (lot-wise) to Excel'}
                >
                  {isExportingBoxes ? (
                    <i className="ri-loader-4-line animate-spin text-xs"></i>
                  ) : (
                    <i className="ri-file-excel-2-line text-xs"></i>
                  )}
                  {isExportingBoxes ? 'Exporting...' : 'Export to Excel'}
                </button>
              )}
              <button
                type="button"
                onClick={() => matchExcelInputRef.current?.click()}
                disabled={isMatchExcelUploading}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded transition-colors shadow-sm ${!isMatchExcelUploading ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                title={isMatchExcelUploading ? 'Uploading...' : 'Upload Excel to bulk match/update boxes (Lot Number, Box ID, Barcode, PO Number, Yarn Name, Shade Code, Box Weight, Number of Cones)'}
              >
                {isMatchExcelUploading ? (
                  <i className="ri-loader-4-line animate-spin text-xs"></i>
                ) : (
                  <i className="ri-upload-2-line text-xs"></i>
                )}
                {isMatchExcelUploading ? 'Uploading...' : 'Match Excel Upload'}
              </button>

              {boxes.length > 0 && (
                <button
                  type="button"
                  onClick={handlePrintAllBarcodes}
                  disabled={!qzStatus.connected || !qzStatus.printer || isPrinting}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-white text-[11px] font-bold rounded transition-colors shadow-sm ${qzStatus.connected && qzStatus.printer && !isPrinting
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  title={
                    isPrinting
                      ? 'Printing in progress...'
                      : !qzStatus.connected
                        ? 'QZ Tray not connected'
                        : !qzStatus.printer
                          ? 'No printer detected'
                          : 'Print all box barcodes'
                  }
                >
                  {isPrinting ? (
                    <i className="ri-loader-4-line animate-spin text-xs"></i>
                  ) : (
                    <i className="ri-printer-line text-xs"></i>
                  )}
                  {isPrinting ? 'Printing Barcodes...' : 'Print All Barcodes'}
                </button>
              )}
              <button
                type="button"
                onClick={handlePrintOrderSummary}
                disabled={isPrinting}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-white text-[11px] font-bold rounded transition-colors shadow-sm ${!isPrinting ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'}`}
                title="Print Order Summary (PDF)"
              >
                {isPrinting ? (
                  <i className="ri-loader-4-line animate-spin text-xs"></i>
                ) : (
                  <i className="ri-file-pdf-line text-xs"></i>
                )}
                {isPrinting ? 'Processing...' : 'Print Summary'}
              </button>
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

          {/* Order Items Summary - Accordion */}
          {order.items && order.items.length > 0 && (
            <div className="mb-4 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setIsOrderItemsSummaryOpen(!isOrderItemsSummaryOpen)}
                className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <h4 className="text-xs font-bold text-gray-800">Order Items Summary</h4>
                <i className={`ri-arrow-${isOrderItemsSummaryOpen ? 'up' : 'down'}-s-line text-gray-600 text-sm transition-transform`}></i>
              </button>
              {isOrderItemsSummaryOpen && (
                <div className="px-3 pb-3">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50/30">
                          <th className="px-2 py-1.5 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Yarn Name</th>
                          <th className="px-2 py-1.5 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Size/Count</th>
                          <th className="px-2 py-1.5 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Shade Code</th>
                          <th className="px-2 py-1.5 text-right text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Ordered (kg)</th>
                          <th className="px-2 py-1.5 text-right text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Received (kg)</th>
                          <th className="px-2 py-1.5 text-right text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Pending (kg)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item, idx) => {
                          const pendingQuantity = Math.max(0, item.orderedQuantity - item.receivedQuantity);
                          return (
                            <tr key={item.id || idx} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-2 py-1.5 border border-gray-200 text-xs text-gray-900">{item.yarnName}</td>
                              <td className="px-2 py-1.5 border border-gray-200 text-xs text-gray-900">{item.sizeCount}</td>
                              <td className="px-2 py-1.5 border border-gray-200 text-xs text-gray-900">{item.shadeCode}</td>
                              <td className="px-2 py-1.5 text-right border border-gray-200 text-xs text-gray-900 font-medium">{item.orderedQuantity.toLocaleString()}</td>
                              <td className="px-2 py-1.5 text-right border border-gray-200 text-xs text-gray-900">{item.receivedQuantity.toLocaleString()}</td>
                              <td className={`px-2 py-1.5 text-right border border-gray-200 text-xs font-medium ${pendingQuantity > 0 ? 'text-orange-600' : 'text-green-600'
                                }`}>
                                {pendingQuantity.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-100/50">
                          <td colSpan={3} className="px-2 py-1.5 border border-gray-200 text-xs font-bold text-gray-900 text-right">Total:</td>
                          <td className="px-2 py-1.5 text-right border border-gray-200 text-xs font-bold text-gray-900">
                            {order.items.reduce((sum, item) => sum + item.orderedQuantity, 0).toLocaleString()}
                          </td>
                          <td className="px-2 py-1.5 text-right border border-gray-200 text-xs font-bold text-gray-900">
                            {order.items.reduce((sum, item) => sum + item.receivedQuantity, 0).toLocaleString()}
                          </td>
                          <td className={`px-2 py-1.5 text-right border border-gray-200 text-xs font-bold ${order.items.reduce((sum, item) => sum + Math.max(0, item.orderedQuantity - item.receivedQuantity), 0) > 0
                            ? 'text-orange-600'
                            : 'text-green-600'
                            }`}>
                            {order.items.reduce((sum, item) => sum + Math.max(0, item.orderedQuantity - item.receivedQuantity), 0).toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

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
                            <i className={`ri-${lotStatus === 'lot_qc_pending' || lotStatus === 'lot_pending' ? 'time-line' :
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
                          onClick={() => openPrintModalForLot(lotNumber, lotBoxes)}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded transition-colors shadow-sm bg-purple-600 text-white hover:bg-purple-700"
                          title={`Open print options for Lot ${lotNumber} (QZ Tray or browser)`}
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
                              className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded transition-colors shadow-sm ${isLotCompleted && !isUpdatingOrderStatus
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
                              className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded transition-colors shadow-sm ${isLotCompleted && !isUpdatingOrderStatus
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
                                className={`hover:bg-gray-50/50 transition-colors group ${isActive ? 'bg-blue-50 border-2 border-blue-400' : ''
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
                                  {(() => {
                                    const yarnOptionsForLot = data.lotNumber ? getPOItemsDataFromLotNumber(data.lotNumber) : [];
                                    const showLotDropdown = yarnOptionsForLot.length > 1;

                                    if (showLotDropdown) {
                                      return (
                                        <select
                                          className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
                                          value={data.yarnName}
                                          onChange={(e) => handleYarnNameChange(boxId, e.target.value, data.lotNumber)}
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
                                          {yarnOptionsForLot.map((option) => (
                                            <option key={`${option.yarnName}-${option.shadeCode}`} value={option.yarnName}>
                                              {option.yarnName}
                                            </option>
                                          ))}
                                        </select>
                                      );
                                    }

                                    return <span className="text-[12px] text-gray-900">{data.yarnName || '-'}</span>;
                                  })()}
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
                              className={`hover:bg-gray-50/50 transition-colors group ${isActive ? 'bg-blue-50 border-2 border-blue-400' : ''
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
                                {(() => {
                                  const yarnOptionsForLot = data.lotNumber ? getPOItemsDataFromLotNumber(data.lotNumber) : [];
                                  const showLotDropdown = yarnOptionsForLot.length > 1;

                                  if (showLotDropdown) {
                                    return (
                                      <select
                                        className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
                                        value={data.yarnName}
                                        onChange={(e) => handleYarnNameChange(boxId, e.target.value, data.lotNumber)}
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
                                        {yarnOptionsForLot.map((option) => (
                                          <option key={`${option.yarnName}-${option.shadeCode}`} value={option.yarnName}>
                                            {option.yarnName}
                                          </option>
                                        ))}
                                      </select>
                                    );
                                  }

                                  return <span className="text-[12px] text-gray-900">{data.yarnName || '-'}</span>;
                                })()}
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

      {/* Match Excel Error Drawer */}
      {matchExcelErrorDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={() => setMatchExcelErrorDrawerOpen(false)}
          />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col">
            <div className="bg-amber-500 text-white px-4 py-3 flex-shrink-0 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Match Excel – Errors</h3>
              <button
                type="button"
                onClick={() => setMatchExcelErrorDrawerOpen(false)}
                className="text-white hover:text-gray-200"
                aria-label="Close"
              >
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-xs text-gray-600 mb-3">Fix these issues and try again:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-800">
                {matchExcelErrors.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Box Details Modal - Side Drawer */}
      {selectedBoxForDetails && (
        <div className={`fixed inset-0 z-50 overflow-hidden ${selectedBoxForDetails ? '' : 'pointer-events-none'}`}>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity duration-300 ${selectedBoxForDetails ? 'opacity-100' : 'opacity-0'
              }`}
            onClick={() => setSelectedBoxForDetails(null)}
          ></div>

          {/* Side Modal */}
          <div
            className={`fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl transform transition-transform duration-300 ease-in-out overflow-hidden flex flex-col ${selectedBoxForDetails ? 'translate-x-0' : 'translate-x-full'
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
                      <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${selectedBoxForDetails.conesIssued
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

      {/* Print Settings Modal */}
      {showPrintSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Print Settings</h3>
                {printModalContext?.type === 'lot' && (
                  <p className="text-sm text-purple-600 font-medium mt-0.5">
                    Lot: {printModalContext.lotNumber} ({printModalContext.selectedBoxIds.length} of {printModalContext.lotBoxes.length} selected)
                  </p>
                )}
              </div>
              <button
                onClick={() => { setShowPrintSettingsModal(false); setPrintModalContext(null); }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Lot: select which boxes to print */}
              {printModalContext?.type === 'lot' && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase">Select boxes to print</h4>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2 bg-gray-50/50">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setPrintModalContext((prev) => prev && prev.type === 'lot' ? { ...prev, selectedBoxIds: prev.lotBoxes.map((b) => b._id || b.id || b.boxId || '').filter(Boolean) } : prev)}
                        className="text-xs px-2 py-1 text-purple-700 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100"
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrintModalContext((prev) => prev && prev.type === 'lot' ? { ...prev, selectedBoxIds: [] } : prev)}
                        className="text-xs px-2 py-1 text-gray-700 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
                      >
                        Deselect all
                      </button>
                    </div>
                    <div className="flex flex-col gap-1">
                      {printModalContext.lotBoxes.map((box) => {
                        const boxId = box._id || box.id || box.boxId || '';
                        const isSelected = printModalContext.selectedBoxIds.includes(boxId);
                        return (
                          <label key={boxId} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-white cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setPrintModalContext((prev) => {
                                  if (!prev || prev.type !== 'lot') return prev;
                                  const next = isSelected ? prev.selectedBoxIds.filter((id) => id !== boxId) : [...prev.selectedBoxIds, boxId];
                                  return { ...prev, selectedBoxIds: next };
                                });
                              }}
                              className="w-4 h-4 text-purple-600 focus:ring-purple-500 rounded"
                            />
                            <span className="text-sm font-mono text-gray-800">{box.boxId || box.barcode || boxId}</span>
                            {box.barcode && box.boxId !== box.barcode && <span className="text-xs text-gray-500">({box.barcode})</span>}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Paper Size Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-700 uppercase">Paper Settings</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Paper Size
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="paperSize"
                          value="4x6"
                          checked={printSettings.paperSize === '4x6'}
                          onChange={() => handlePaperSizeChange('4x6')}
                          className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">4" × 6" (Portrait)</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="paperSize"
                          value="6x4"
                          checked={printSettings.paperSize === '6x4'}
                          onChange={() => handlePaperSizeChange('6x4')}
                          className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">6" × 4" (Landscape)</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="paperSize"
                          value="50mm * 70mm"
                          checked={printSettings.paperSize === '50mm * 70mm'}
                          onChange={() => handlePaperSizeChange('50mm * 70mm')}
                          className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">50mm × 70mm</span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Current: {printSettings.paperWidth} × {printSettings.paperHeight} dots
                    </p>
                  </div>

                  {/* Orientation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Orientation
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="orientation"
                          value="vertical"
                          checked={printSettings.orientation === 'vertical'}
                          onChange={() => handleOrientationChange('vertical')}
                          className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Vertical (Portrait)</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="orientation"
                          value="horizontal"
                          checked={printSettings.orientation === 'horizontal'}
                          onChange={() => handleOrientationChange('horizontal')}
                          className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Horizontal (Landscape)</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Top Margin for First Label
                      <span className="text-xs text-gray-500 ml-1">(for small roll sizes)</span>
                    </label>
                    <input
                      type="number"
                      value={printSettings.firstLabelTopMargin}
                      onChange={(e) => setPrintSettings({ ...printSettings, firstLabelTopMargin: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min="0"
                      max="200"
                      placeholder="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Adds space at top of first label only (dots)
                    </p>
                  </div>
                </div>

                {/* Labels Per Page */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Labels Per Page
                  </label>
                  <select
                    value={printSettings.labelsPerPage}
                    onChange={(e) => setPrintSettings({ ...printSettings, labelsPerPage: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                  >
                    <option value={1}>1 Label per page (Full size)</option>
                    <option value={2}>2 Labels per page (Default)</option>
                    <option value={3}>3 Labels per page</option>
                    <option value={4}>4 Labels per page</option>
                    <option value={5}>5 Labels per page</option>
                    <option value={6}>6 Labels per page</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Choose how many labels to fit on a single sheet
                  </p>
                </div>
              </div>

              {/* Font Sizes Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-700 uppercase">Font Sizes</h4>

                <div className="grid grid-cols-2 gap-4">
                  {printSettings.paperSize !== '50mm * 70mm' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Supplier Name Font Size
                        </label>
                        <input
                          type="number"
                          value={printSettings.supplierFontSize}
                          onChange={(e) => setPrintSettings({ ...printSettings, supplierFontSize: parseInt(e.target.value) || 27 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          min="10"
                          max="100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Box ID Font Size
                        </label>
                        <input
                          type="number"
                          value={printSettings.boxIdFontSize ?? 22}
                          onChange={(e) => setPrintSettings({ ...printSettings, boxIdFontSize: parseInt(e.target.value) || 22 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          min="10"
                          max="100"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {printSettings.paperSize === '50mm * 70mm' ? 'Text Font Size (Shade | Lot)' : 'Details Font Size (Box, Yarn, Lot, Shade)'}
                    </label>
                    <input
                      type="number"
                      value={printSettings.detailsFontSize}
                      onChange={(e) => setPrintSettings({ ...printSettings, detailsFontSize: parseInt(e.target.value) || 30 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min="10"
                      max="100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Barcode Width (module width, 1-10)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={printSettings.barcodeWidth ?? 3}
                      onChange={(e) => setPrintSettings({ ...printSettings, barcodeWidth: parseInt(e.target.value) || 3 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min="1"
                      max="5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Barcode Height (dots)
                    </label>
                    <input
                      type="number"
                      value={printSettings.barcodeHeight}
                      onChange={(e) => setPrintSettings({ ...printSettings, barcodeHeight: parseInt(e.target.value) || 100 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min="50"
                      max="200"
                    />
                  </div>
                </div>
              </div>

              {/* Y-Positions Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-700 uppercase">Y-Positions (Vertical Spacing)</h4>

                <div className="grid grid-cols-2 gap-4">
                  {printSettings.paperSize !== '50mm * 70mm' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Supplier Y Position
                        </label>
                        <input
                          type="number"
                          value={printSettings.supplierYPos}
                          onChange={(e) => setPrintSettings({ ...printSettings, supplierYPos: parseInt(e.target.value) || 30 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          min="0"
                          max="600"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Box ID Y Position
                        </label>
                        <input
                          type="number"
                          value={printSettings.boxIdYPos}
                          onChange={(e) => setPrintSettings({ ...printSettings, boxIdYPos: parseInt(e.target.value) || 65 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          min="0"
                          max="600"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Yarn Y Position
                        </label>
                        <input
                          type="number"
                          value={printSettings.yarnYPos}
                          onChange={(e) => setPrintSettings({ ...printSettings, yarnYPos: parseInt(e.target.value) || 120 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          min="0"
                          max="600"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Lot Y Position
                        </label>
                        <input
                          type="number"
                          value={printSettings.lotYPos}
                          onChange={(e) => setPrintSettings({ ...printSettings, lotYPos: parseInt(e.target.value) || 160 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          min="0"
                          max="600"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Shade Y Position
                        </label>
                        <input
                          type="number"
                          value={printSettings.shadeYPos}
                          onChange={(e) => setPrintSettings({ ...printSettings, shadeYPos: parseInt(e.target.value) || 200 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          min="0"
                          max="600"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Barcode Y Position
                    </label>
                    <input
                      type="number"
                      value={printSettings.barcodeYPos}
                      onChange={(e) => setPrintSettings({ ...printSettings, barcodeYPos: parseInt(e.target.value) || 260 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min="0"
                      max="600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Footer Y Position
                    </label>
                    <input
                      type="number"
                      value={printSettings.footerYPos}
                      onChange={(e) => setPrintSettings({ ...printSettings, footerYPos: parseInt(e.target.value) || 400 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min="0"
                      max="600"
                    />
                  </div>
                </div>
              </div>

              {/* Reset to Default Button */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => setPrintSettings({
                    paperSize: '50mm * 70mm',
                    paperWidth: 398,
                    paperHeight: 558,
                    labelsPerPage: 1,
                    columnsPerRow: 1,
                    firstLabelTopMargin: 20,
                    supplierFontSize: 20,
                    detailsFontSize: 20,
                    boxIdFontSize: 20,
                    rackCodeFontSize: 40,
                    zoneFontSize: 30,
                    barcodeHeight: 100,
                    barcodeWidth: 3,
                    qrCodeSize: 5,
                    supplierYPos: 30,
                    boxIdYPos: 65,
                    yarnYPos: 120,
                    lotYPos: 160,
                    shadeYPos: 200,
                    barcodeYPos: 300,
                    footerYPos: 400,
                    orientation: 'vertical',
                  })}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  <i className="ri-restart-line mr-2"></i>
                  Reset to Default
                </button>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  if (printModalContext?.type === 'lot' && printModalContext.selectedBoxIds.length === 0) {
                    toast.error('Select at least one box to print');
                    return;
                  }
                  setShowPrintSettingsModal(false);
                  if (printModalContext?.type === 'lot') {
                    handlePrintLotBarcodesBrowser(printModalContext.lotNumber, printModalContext.lotBoxes, printModalContext.selectedBoxIds);
                  } else {
                    handlePrintAllBarcodesBrowser();
                  }
                  setPrintModalContext(null);
                }}
                className="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 rounded-md transition-colors mr-auto"
                title="Open print preview in a new window (no QZ Tray required)"
              >
                <i className="ri-window-line mr-2"></i>
                Browser Print (Auto)
              </button>
              <button
                onClick={() => { setShowPrintSettingsModal(false); setPrintModalContext(null); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (printModalContext?.type === 'lot' && printModalContext.selectedBoxIds.length === 0) {
                    toast.error('Select at least one box to print');
                    return;
                  }
                  executePrintWithSettings();
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors"
              >
                <i className="ri-printer-line mr-2"></i>
                {isTestPrint ? 'Print Test Label' : 'Print with These Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessOrderPage;

