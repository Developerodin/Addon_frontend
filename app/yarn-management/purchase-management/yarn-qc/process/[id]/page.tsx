"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import yarnPurchaseOrderService, { PurchaseOrderStatus } from "@/shared/services/yarnPurchaseOrderService";
import yarnBoxService, { YarnBox } from "@/shared/services/yarnBoxService";
import { FileUploadService } from "@/shared/services/fileUploadService";

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

interface ReceivedLotPoItem {
  poItem: string;
  receivedQuantity: number;
}

interface ReceivedLotDetail {
  lotNumber: string;
  numberOfCones: number;
  totalWeight: number;
  numberOfBoxes: number;
  status: 'lot_qc_pending' | 'lot_accepted' | 'lot_rejected';
  poItems: ReceivedLotPoItem[];
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
    'po_rejected': 'rejected'
  };
  return statusMap[statusCode] || 'submitted to supplier';
};

// Helper function to map API response to ReceivedOrder format
const mapAPIOrderToReceivedOrder = (apiOrder: any): ReceivedOrder => {
  const poItems = apiOrder.poItems || apiOrder.items || apiOrder.orderItems || [];
  
  // Map received lot details
  const receivedLotDetails: ReceivedLotDetail[] = (apiOrder.receivedLotDetails || []).map((lot: any) => ({
    lotNumber: lot.lotNumber || lot.lot_number || '',
    numberOfCones: lot.numberOfCones || lot.number_of_cones || 0,
    totalWeight: lot.totalWeight || lot.total_weight || 0,
    numberOfBoxes: lot.numberOfBoxes || lot.number_of_boxes || 0,
    status: lot.status || 'lot_qc_pending',
    poItems: (lot.poItems || []).map((poItem: any) => ({
      poItem: poItem.poItem || poItem.po_item || '',
      receivedQuantity: poItem.receivedQuantity || poItem.received_quantity || 0
    }))
  }));
  
  return {
    id: apiOrder._id || apiOrder.id || '',
    orderNumber: apiOrder.poNumber || apiOrder.orderNumber || apiOrder.order_number || apiOrder.po_number || '',
    purchaseOrderNumber: apiOrder.poNumber || apiOrder.orderNumber || apiOrder.order_number || apiOrder.po_number || '',
    supplier: apiOrder.supplierName || apiOrder.supplier?.brandName || apiOrder.supplier?.name || apiOrder.supplier || '',
    receivedDate: apiOrder.createDate || apiOrder.orderDate || apiOrder.order_date || apiOrder.createdAt || new Date().toISOString(),
    receivedBy: apiOrder.receivedBy || apiOrder.received_by || apiOrder.updatedBy?.username || '',
    status: convertStatusFromAPI(apiOrder.currentStatus || apiOrder.status || apiOrder.status_code || 'qc_pending'),
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
    receivedLotDetails: receivedLotDetails.length > 0 ? receivedLotDetails : undefined
  };
};

interface UploadedMediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  fileName: string;
  fileKey: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

const ProcessQCOrderPage = () => {
  const params = useParams();
  const router = useRouter();
  const { hasSubPermission, isLoading } = useNavigation();
  const user = useSelector((state: any) => state.auth?.user);
  const orderId = params?.id as string;

  const [order, setOrder] = useState<ReceivedOrder | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [barcodeScanValue, setBarcodeScanValue] = useState<string>('');
  const [scannedBox, setScannedBox] = useState<YarnBox | null>(null);
  const [isLoadingBox, setIsLoadingBox] = useState(false);
  const [qcStatus, setQcStatus] = useState<'QC Accepted' | 'QC Rejected' | ''>('');
  const [qcNotes, setQcNotes] = useState("");
  const [qcBy, setQcBy] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMediaItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Check permission - allow if user has Purchase Management access
  const hasPurchaseManagement = hasSubPermission('/yarn-management', 'Purchase Management');
  const hasYarnQC = hasSubPermission('/yarn-management/purchase-management', 'Yarn QC');
  const hasPermission = hasPurchaseManagement || hasYarnQC;
  
  // Fetch order from API
  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        console.log('QC Process page - No orderId provided');
        setIsLoadingOrder(false);
        return;
      }

      setIsLoadingOrder(true);
      try {
        console.log('QC Process page - fetching order with id:', orderId);
        console.log('QC Process page - API URL will be:', `/v1/yarn-management/yarn-purchase-orders/${orderId}`);
        
        const apiOrder = await yarnPurchaseOrderService.getPurchaseOrderById(orderId);
        console.log('QC Process page - API response:', apiOrder);
        
        const mappedOrder = mapAPIOrderToReceivedOrder(apiOrder);
        console.log('QC Process page - mapped order:', mappedOrder);
        
        setOrder(mappedOrder);
        toast.success('Order details loaded successfully');
      } catch (error) {
        console.error('QC Process page - failed to fetch order:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to load order details');
        // Don't redirect immediately, let user see the error
      } finally {
        setIsLoadingOrder(false);
      }
    };

    // Fetch order when orderId is available
    // Wait for navigation to finish loading before making API call
    if (orderId) {
      // Small delay to ensure route params are fully loaded
      const timer = setTimeout(() => {
        console.log('QC Process page - Calling fetchOrder, orderId:', orderId);
        fetchOrder();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [orderId]);

  const getStatusColor = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'in transit': return 'bg-purple-100 text-purple-800';
      case 'partially delivered': return 'bg-yellow-100 text-yellow-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'QC pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'submitted to supplier': return 'bg-blue-100 text-blue-800';
      case 'stocked': return 'bg-emerald-100 text-emerald-800';
      case 'goods received': return 'bg-green-100 text-green-800';
      case 'goods partially received': return 'bg-amber-100 text-amber-800';
      case 'po_accepted': return 'bg-green-100 text-green-800';
      case 'po_rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLotStatusColor = (status: string) => {
    switch (status) {
      case 'lot_qc_pending': return 'bg-yellow-100 text-yellow-800';
      case 'lot_accepted': return 'bg-green-100 text-green-800';
      case 'lot_rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLotStatusDisplay = (status: string) => {
    switch (status) {
      case 'lot_qc_pending': return 'QC Pending';
      case 'lot_accepted': return 'Accepted';
      case 'lot_rejected': return 'Rejected';
      default: return status;
    }
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

  // Helper to get PO item details by ID
  const getPoItemDetails = (poItemId: string) => {
    return order?.items.find(item => item.id === poItemId);
  };

  // Handle barcode scan - fetch box details by barcode
  const handleBarcodeScan = async (e?: React.KeyboardEvent<HTMLInputElement> | React.MouseEvent<HTMLButtonElement>) => {
    // Allow both Enter key and button click
    if (e && 'key' in e && e.key !== 'Enter') {
      return;
    }
    
    if (!barcodeScanValue.trim()) {
      toast.error('Please enter a barcode');
      return;
    }

    const scannedBarcode = barcodeScanValue.trim();
    setIsLoadingBox(true);
    
    try {
      console.log('Fetching box by barcode:', scannedBarcode);
      // Get box details by barcode using /barcode/:barcode API
      const boxDetails = await yarnBoxService.getYarnBoxByBarcode(scannedBarcode);
      console.log('Box details received:', boxDetails);
      
      setScannedBox(boxDetails);
      
      // If QC is already done, pre-fill the form with existing QC data
      if (boxDetails.qcData) {
        setQcStatus(boxDetails.qcData.status === 'qc_approved' ? 'QC Accepted' : 'QC Rejected');
        setQcNotes(boxDetails.qcData.remarks || '');
        setQcBy(boxDetails.qcData.username || '');
        toast.success(`Box ${boxDetails.boxId} found - QC already completed`);
      } else {
        toast.success(`Box ${boxDetails.boxId} found`);
      }
    } catch (error) {
      console.error('Failed to fetch box details:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch box details');
      setScannedBox(null);
    } finally {
      setIsLoadingBox(false);
      // Don't clear barcode value, keep it for reference
    }
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        try {
          // Upload file to S3
          const uploadedFile = await FileUploadService.uploadFile(file);
          
          return {
            id: `media-${Date.now()}-${Math.random()}`,
            type: uploadedFile.mimeType.startsWith('video/') ? 'video' as const : 'image' as const,
            url: uploadedFile.url,
            fileName: uploadedFile.originalName,
            fileKey: uploadedFile.key,
            mimeType: uploadedFile.mimeType,
            size: uploadedFile.size,
            uploadedAt: new Date().toISOString()
          };
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          toast.error(`Failed to upload ${file.name}`);
          throw error;
        }
      });

      const newMedia = await Promise.all(uploadPromises);
      setUploadedMedia(prev => [...prev, ...newMedia]);
      toast.success(`${newMedia.length} file(s) uploaded successfully`);
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Failed to upload some files');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle remove media
  const handleRemoveMedia = async (mediaId: string) => {
    const mediaToRemove = uploadedMedia.find((m) => m.id === mediaId);
    if (!mediaToRemove) {
      return;
    }

    try {
      await FileUploadService.deleteFile(mediaToRemove.fileKey);
      setUploadedMedia(prev => prev.filter(m => m.id !== mediaId));
      toast.success("File removed");
    } catch (error) {
      console.error(`Failed to delete file with key ${mediaToRemove.fileKey}:`, error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete file');
    }
  };

  // Handle submit QC
  const handleSubmitQC = async () => {
    if (!scannedBox) {
      toast.error("Please scan a box first");
      return;
    }

    if (!qcStatus) {
      toast.error("Please select QC status");
      return;
    }

    if (!qcBy.trim()) {
      toast.error("Please enter QC inspector name");
      return;
    }

    if (!user || !user.id || !user.email) {
      toast.error('User information not available. Please login again.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Check if lot number is available
      if (!scannedBox.lotNumber) {
        toast.error('Lot number is missing from box details. Cannot update QC status.');
        setIsSubmitting(false);
        return;
      }

      // Prepare mediaUrl object from uploadedMedia
      const mediaUrl: Record<string, string> = {};
      uploadedMedia.forEach((media) => {
        const existingIndex = Number(
          Object.keys(mediaUrl)
            .filter((key) => key.startsWith(media.type === 'video' ? 'video' : 'image'))
            .length
        );
        const keyPrefix = media.type === 'video' ? 'video' : 'image';
        mediaUrl[`${keyPrefix}${existingIndex + 1}`] = media.url;
      });

      // Map QC status to lot status format
      const lotStatus: 'lot_accepted' | 'lot_rejected' = qcStatus === 'QC Accepted' ? 'lot_accepted' : 'lot_rejected';
      
      // Prepare payload for lot status QC approve API
      const lotStatusPayload = {
        poNumber: scannedBox.poNumber,
        lotNumber: scannedBox.lotNumber,
        lotStatus: lotStatus,
        updated_by: {
          username: user.email || user.username || qcBy.trim(),
          user_id: user.id
        },
        notes: qcNotes.trim() || `QC ${qcStatus === 'QC Accepted' ? 'approved' : 'rejected'}`,
        remarks: qcNotes.trim() || undefined,
        mediaUrl: Object.keys(mediaUrl).length > 0 ? mediaUrl : undefined
      };

      console.log('Updating lot QC status with payload:', lotStatusPayload);
      
      // Call API to update lot QC status (primary API call - replaces box QC status API)
      // This API handles the lot status update and PO status update internally
      await yarnPurchaseOrderService.updateLotStatusQCApprove(lotStatusPayload);
      console.log('Lot status and PO status updated successfully');
      
      toast.success(`QC ${qcStatus === 'QC Accepted' ? 'accepted' : 'rejected'} successfully`);
      
      // Navigate back after a short delay
      setTimeout(() => {
        router.push('/yarn-management/purchase-management/yarn-qc');
      }, 1500);
    } catch (error) {
      console.error('Failed to update QC status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update QC status');
      setIsSubmitting(false);
    }
  };

  // Show loading state while permissions or order are being loaded
  if (isLoading || isLoadingOrder) {
    return (
      <div className="main-content">
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">
              {isLoading ? 'Loading permissions...' : 'Loading order details...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check permission after loading
  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-lock-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500 mb-4">You don't have permission to access Yarn QC.</p>
          <Link href="/yarn-management/purchase-management/yarn-qc" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to QC Orders
          </Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-error-warning-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Order Not Found</h3>
          <p className="text-gray-500 mb-4">Order ID: {orderId}</p>
          <Link href="/yarn-management/purchase-management/yarn-qc" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to QC Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content !p-[10px]">
      <Seo title={`QC Process Order - ${order.orderNumber}`} />
      
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          {/* Header Section */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Link
                href="/yarn-management/purchase-management/yarn-qc"
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title="Back to QC orders"
              >
                <i className="ri-arrow-left-line text-sm"></i>
              </Link>
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">QC Process Order</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {order.purchaseOrderNumber}
              </span>
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

        {/* Received Lot Details Section */}
        {order.receivedLotDetails && order.receivedLotDetails.length > 0 && (
          <div className="p-[10px] border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-800 mb-3">
              Received Lot Details ({order.receivedLotDetails.length})
            </h3>
            <div className="space-y-3">
              {order.receivedLotDetails.map((lot, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-purple-100 text-purple-600 rounded-full w-6 h-6 flex items-center justify-center font-bold text-[10px]">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900">Lot: {lot.lotNumber}</h4>
                        <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded-full mt-0.5 ${getLotStatusColor(lot.status)}`}>
                          {getLotStatusDisplay(lot.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div>
                      <p className="text-[10px] uppercase text-gray-500 mb-0.5">Number of Boxes</p>
                      <p className="text-xs font-bold text-gray-900">{lot.numberOfBoxes}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-gray-500 mb-0.5">Number of Cones</p>
                      <p className="text-xs font-bold text-gray-900">{lot.numberOfCones}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-gray-500 mb-0.5">Total Weight (kg)</p>
                      <p className="text-xs font-bold text-gray-900">{lot.totalWeight}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-gray-500 mb-0.5">PO Items</p>
                      <p className="text-xs font-bold text-gray-900">{lot.poItems.length}</p>
                    </div>
                  </div>

                  {/* PO Items in this lot */}
                  {lot.poItems.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-[10px] uppercase text-gray-500 mb-2 font-bold">PO Items in this Lot</p>
                      <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse border border-gray-200">
                          <thead className="bg-gray-50/30">
                            <tr>
                              <th className="px-1.5 py-1.5 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Yarn Name</th>
                              <th className="px-1.5 py-1.5 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Size/Count</th>
                              <th className="px-1.5 py-1.5 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Shade Code</th>
                              <th className="px-1.5 py-1.5 text-right text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Received Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lot.poItems.map((poItem, poItemIndex) => {
                              const itemDetails = getPoItemDetails(poItem.poItem);
                              return (
                                <tr key={poItemIndex} className="hover:bg-gray-50/50">
                                  <td className="px-1.5 py-1.5 text-xs text-gray-900 border border-gray-200">
                                    {itemDetails?.yarnName || 'N/A'}
                                  </td>
                                  <td className="px-1.5 py-1.5 text-xs text-gray-600 border border-gray-200">
                                    {itemDetails?.sizeCount || 'N/A'}
                                  </td>
                                  <td className="px-1.5 py-1.5 text-xs text-gray-600 border border-gray-200">
                                    {itemDetails?.shadeCode || 'N/A'}
                                  </td>
                                  <td className="px-1.5 py-1.5 text-xs text-right text-gray-900 font-bold border border-gray-200">
                                    {poItem.receivedQuantity} kg
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
              ))}
            </div>
          </div>
        )}

        {/* Barcode Scanner Section */}
        <div className="p-[10px] border-t border-gray-100">
          <h3 className="text-xs font-bold text-gray-800 mb-3">Scan Box Barcode</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <input
                type="text"
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
                placeholder="Scan or enter box barcode"
                value={barcodeScanValue}
                onChange={(e) => setBarcodeScanValue(e.target.value)}
                onKeyDown={handleBarcodeScan}
                disabled={isLoadingBox}
                autoFocus
              />
            </div>
            <button
              type="button"
              onClick={handleBarcodeScan}
              disabled={isLoadingBox || !barcodeScanValue.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isLoadingBox ? (
                <>
                  <i className="ri-loader-4-line animate-spin text-xs"></i>
                  Scanning...
                </>
              ) : (
                <>
                  <i className="ri-qr-scan-2-line text-xs"></i>
                  Scan
                </>
              )}
            </button>
          </div>
          {isLoadingBox && (
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
              <i className="ri-loader-4-line animate-spin"></i>
              <span>Loading box details...</span>
            </div>
          )}
        </div>

        {/* Scanned Box Details */}
        {scannedBox && (
          <div className="p-[10px] border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-800">Box Details</h3>
              <button
                type="button"
                onClick={() => {
                  setScannedBox(null);
                  setBarcodeScanValue('');
                }}
                className="text-gray-400 hover:text-gray-600 transition text-xs"
                title="Clear box details"
              >
                <i className="ri-close-line"></i>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-medium text-gray-600 mb-1 block">Box ID</label>
                <div className="mt-0.5 text-xs text-gray-900 font-mono bg-gray-50 p-1.5 rounded border border-gray-200">
                  {scannedBox.boxId}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-600 mb-1 block">Barcode</label>
                <div className="mt-0.5 text-xs text-gray-900 font-mono bg-gray-50 p-1.5 rounded border border-gray-200">
                  {scannedBox.barcode}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-600 mb-1 block">PO Number</label>
                <div className="mt-0.5 text-xs text-gray-900 bg-gray-50 p-1.5 rounded border border-gray-200">
                  {scannedBox.poNumber}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-600 mb-1 block">Yarn Name</label>
                <div className="mt-0.5 text-xs text-gray-900 bg-gray-50 p-1.5 rounded border border-gray-200">
                  {scannedBox.yarnName || '-'}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-600 mb-1 block">Shade Code</label>
                <div className="mt-0.5 text-xs text-gray-900 bg-gray-50 p-1.5 rounded border border-gray-200">
                  {scannedBox.shadeCode || '-'}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-600 mb-1 block">Order Qty (kg)</label>
                <div className="mt-0.5 text-xs text-gray-900 bg-gray-50 p-1.5 rounded border border-gray-200">
                  {scannedBox.orderQty || 0}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-600 mb-1 block">Lot Number</label>
                <div className="mt-0.5 text-xs text-gray-900 bg-gray-50 p-1.5 rounded border border-gray-200">
                  {scannedBox.lotNumber || '-'}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-600 mb-1 block">Box Weight (kg)</label>
                <div className="mt-0.5 text-xs text-gray-900 bg-gray-50 p-1.5 rounded border border-gray-200">
                  {scannedBox.boxWeight || '-'}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-600 mb-1 block">Number of Cones</label>
                <div className="mt-0.5 text-xs text-gray-900 bg-gray-50 p-1.5 rounded border border-gray-200">
                  {scannedBox.numberOfCones || '-'}
                </div>
              </div>
              {scannedBox.receivedDate && (
                <div>
                  <label className="text-[10px] font-medium text-gray-600 mb-1 block">Received Date</label>
                  <div className="mt-0.5 text-xs text-gray-900 bg-gray-50 p-1.5 rounded border border-gray-200">
                    {new Date(scannedBox.receivedDate).toLocaleDateString()}
                  </div>
                </div>
              )}
              {scannedBox.orderDate && (
                <div>
                  <label className="text-[10px] font-medium text-gray-600 mb-1 block">Order Date</label>
                  <div className="mt-0.5 text-xs text-gray-900 bg-gray-50 p-1.5 rounded border border-gray-200">
                    {new Date(scannedBox.orderDate).toLocaleDateString()}
                  </div>
                </div>
              )}
              {scannedBox.conesIssued !== undefined && (
                <div>
                  <label className="text-[10px] font-medium text-gray-600 mb-1 block">Cones Issued</label>
                  <div className="mt-0.5">
                    <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                      scannedBox.conesIssued 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {scannedBox.conesIssued ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            {/* QC Data Section - Show if QC already done */}
            {scannedBox.qcData && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <i className="ri-checkbox-circle-line text-blue-600 text-xs"></i>
                    <h4 className="text-xs font-bold text-blue-900">QC Status - Already Completed</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] font-medium text-blue-700 mb-0.5 block">QC Status</label>
                      <div className="mt-0.5">
                        <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                          scannedBox.qcData.status === 'qc_approved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {scannedBox.qcData.status === 'qc_approved' ? 'QC Approved' : 'QC Rejected'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-blue-700 mb-0.5 block">QC Date</label>
                      <div className="mt-0.5 text-xs text-blue-900">
                        {new Date(scannedBox.qcData.date).toLocaleDateString()} {new Date(scannedBox.qcData.date).toLocaleTimeString()}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-blue-700 mb-0.5 block">QC Inspector</label>
                      <div className="mt-0.5 text-xs text-blue-900">
                        {scannedBox.qcData.username}
                      </div>
                    </div>
                    {scannedBox.qcData.remarks && (
                      <div className="md:col-span-2 lg:col-span-4">
                        <label className="text-[10px] font-medium text-blue-700 mb-0.5 block">QC Remarks</label>
                        <div className="mt-0.5 text-xs text-blue-900 bg-white p-1.5 rounded border border-blue-200">
                          {scannedBox.qcData.remarks}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Media Upload Section - Show when box is scanned */}
        {scannedBox && (
          <div className="p-[10px] border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-800 mb-3">Upload Images & Videos</h3>
            <div className="mb-3">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Upload QC Images/Videos</label>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Upload images or videos showing the quality inspection of this box
              </p>
            </div>

            {uploadedMedia.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
                {uploadedMedia.map((media) => (
                  <div key={media.id} className="relative group">
                    {media.type === 'image' ? (
                      <img
                        src={media.url}
                        alt={media.fileName}
                        className="w-full h-24 object-cover rounded-lg border border-gray-200"
                      />
                    ) : (
                      <video
                        src={media.url}
                        className="w-full h-24 object-cover rounded-lg border border-gray-200"
                        controls
                      />
                    )}
                    <button
                      onClick={() => handleRemoveMedia(media.id)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove"
                    >
                      <i className="ri-close-line text-[10px]"></i>
                    </button>
                    <p className="text-[10px] text-gray-500 mt-1 truncate">{media.fileName}</p>
                    <p className="text-[9px] text-gray-400">
                      {FileUploadService.formatFileSize(media.size)} • {media.mimeType}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* QC Status Update Section - Only show if QC not already done */}
        {scannedBox && !scannedBox.qcData && (
          <div className="p-[10px] border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-800 mb-3">Update QC Status</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  QC Status <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setQcStatus('QC Accepted')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded transition-colors ${
                      qcStatus === 'QC Accepted'
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-white text-purple-600 border border-purple-200 hover:bg-purple-50'
                    }`}
                    disabled={isSubmitting}
                  >
                    <i className="ri-checkbox-circle-line text-xs"></i>
                    QC Accepted
                  </button>
                  <button
                    type="button"
                    onClick={() => setQcStatus('QC Rejected')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded transition-colors ${
                      qcStatus === 'QC Rejected'
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
                    }`}
                    disabled={isSubmitting}
                  >
                    <i className="ri-close-circle-line text-xs"></i>
                    QC Rejected
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  QC Inspector Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
                  value={qcBy}
                  onChange={(e) => setQcBy(e.target.value)}
                  placeholder="Enter QC inspector name"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">QC Notes</label>
                <textarea
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
                  rows={3}
                  value={qcNotes}
                  onChange={(e) => setQcNotes(e.target.value)}
                  placeholder="Add any notes or observations about the quality inspection..."
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-gray-200">
                <Link
                  href="/yarn-management/purchase-management/yarn-qc"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
                  onClick={(e) => {
                    if (isSubmitting) {
                      e.preventDefault();
                    }
                  }}
                >
                  Cancel
                </Link>
                <button
                  type="button"
                  onClick={handleSubmitQC}
                  disabled={isSubmitting || !qcStatus || !qcBy.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <i className="ri-loader-4-line animate-spin text-xs"></i>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <i className="ri-check-line text-xs"></i>
                      Update QC Status
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessQCOrderPage;

