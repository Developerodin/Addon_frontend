"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { PurchaseOrderStatus } from "@/shared/services/yarnPurchaseOrderService";
import PacklistModal, { PacklistDetails } from "./components/PacklistModal";
import UpdatePacklistModal from "./components/UpdatePacklistModal";
import yarnPurchaseOrderService from "@/shared/services/yarnPurchaseOrderService";

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
      trackingNumber?: string; // Legacy field name from API
      courierName?: string;
      courierNumber?: string;
      vehicleNumber?: string;
      challanNumber?: string;
      dispatchDate?: string;
      estimatedDeliveryDate?: string;
      expectedArrivalDate?: string; // Legacy field name from API
      numberOfBoxes?: number;
      totalWeight?: number;
      notes?: string;
    };
    packListDetailsArray?: Array<{
      packingNumber?: string;
      courierName?: string;
      courierNumber?: string;
      vehicleNumber?: string;
      challanNumber?: string;
      dispatchDate?: string;
      estimatedDeliveryDate?: string;
      numberOfBoxes?: number;
      totalWeight?: number;
      notes?: string;
    }>;
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
    'po_accepted': 'PO accepted',
    'po_accepted_partially': 'PO accepted partially',
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
    'rejected': 'po_rejected',
    'QC pending': 'qc_pending',
    'partially delivered': 'partially_delivered',
    'stocked': 'stocked',
    'goods received': 'goods_received',
    'goods partially received': 'goods_partially_received',
    'PO accepted': 'po_accepted',
    'PO accepted partially': 'po_accepted_partially',
    'po_accepted': 'po_accepted',
    'po_rejected': 'po_rejected'
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
    packlistDetails: (() => {
      const packListData = apiOrder.packListDetails || apiOrder.packlistDetails;
      if (!packListData) return undefined;
      
      // Handle array case (new backend format)
      if (Array.isArray(packListData) && packListData.length > 0) {
        // Return the first entry for backward compatibility
        const firstEntry = packListData[0];
        return {
          packingNumber: firstEntry?.packingNumber || firstEntry?.packing_number || firstEntry?.trackingNumber || firstEntry?.tracking_number || '',
          trackingNumber: firstEntry?.trackingNumber || firstEntry?.tracking_number || firstEntry?.packingNumber || firstEntry?.packing_number || '',
          courierName: firstEntry?.courierName || firstEntry?.courier_name || '',
          courierNumber: firstEntry?.courierNumber || firstEntry?.courier_number || '',
          vehicleNumber: firstEntry?.vehicleNumber || firstEntry?.vehicle_number || '',
          challanNumber: firstEntry?.challanNumber || firstEntry?.challan_number || '',
          dispatchDate: firstEntry?.dispatchDate || firstEntry?.dispatch_date || '',
          estimatedDeliveryDate: firstEntry?.estimatedDeliveryDate || firstEntry?.estimated_delivery_date || firstEntry?.expectedArrivalDate || firstEntry?.expected_arrival_date || '',
          expectedArrivalDate: firstEntry?.expectedArrivalDate || firstEntry?.expected_arrival_date || firstEntry?.estimatedDeliveryDate || firstEntry?.estimated_delivery_date || '',
          numberOfBoxes: firstEntry?.numberOfBoxes || firstEntry?.number_of_boxes || 0,
          totalWeight: firstEntry?.totalWeight || firstEntry?.total_weight || 0,
          notes: firstEntry?.notes || ''
        };
      }
      
      // Handle single object case (legacy format)
      return {
        packingNumber: packListData?.packingNumber || packListData?.packing_number || packListData?.trackingNumber || packListData?.tracking_number || '',
        trackingNumber: packListData?.trackingNumber || packListData?.tracking_number || packListData?.packingNumber || packListData?.packing_number || '',
        courierName: packListData?.courierName || packListData?.courier_name || '',
        courierNumber: packListData?.courierNumber || packListData?.courier_number || '',
        vehicleNumber: packListData?.vehicleNumber || packListData?.vehicle_number || '',
        challanNumber: packListData?.challanNumber || packListData?.challan_number || '',
        dispatchDate: packListData?.dispatchDate || packListData?.dispatch_date || '',
        estimatedDeliveryDate: packListData?.estimatedDeliveryDate || packListData?.estimated_delivery_date || packListData?.expectedArrivalDate || packListData?.expected_arrival_date || '',
        expectedArrivalDate: packListData?.expectedArrivalDate || packListData?.expected_arrival_date || packListData?.estimatedDeliveryDate || packListData?.estimated_delivery_date || '',
        numberOfBoxes: packListData?.numberOfBoxes || packListData?.number_of_boxes || 0,
        totalWeight: packListData?.totalWeight || packListData?.total_weight || 0,
        notes: packListData?.notes || ''
      };
    })(),
    packListDetailsArray: (() => {
      const packListData = apiOrder.packListDetails || apiOrder.packlistDetails;
      if (!packListData) return undefined;
      
      // If it's an array, return it as-is
      if (Array.isArray(packListData)) {
        return packListData.map((entry: any) => ({
          packingNumber: entry?.packingNumber || entry?.packing_number || entry?.trackingNumber || entry?.tracking_number || '',
          courierName: entry?.courierName || entry?.courier_name || '',
          courierNumber: entry?.courierNumber || entry?.courier_number || '',
          vehicleNumber: entry?.vehicleNumber || entry?.vehicle_number || '',
          challanNumber: entry?.challanNumber || entry?.challan_number || '',
          dispatchDate: entry?.dispatchDate || entry?.dispatch_date || '',
          estimatedDeliveryDate: entry?.estimatedDeliveryDate || entry?.estimated_delivery_date || entry?.expectedArrivalDate || entry?.expected_arrival_date || '',
          numberOfBoxes: entry?.numberOfBoxes || entry?.number_of_boxes || 0,
          totalWeight: entry?.totalWeight || entry?.total_weight || 0,
          notes: entry?.notes || '',
          poItems: entry?.poItems || (Array.isArray(entry?.poItems) ? entry.poItems : [])
        }));
      }
      
      // If it's a single object, convert to array
      return [{
        packingNumber: packListData?.packingNumber || packListData?.packing_number || packListData?.trackingNumber || packListData?.tracking_number || '',
        courierName: packListData?.courierName || packListData?.courier_name || '',
        courierNumber: packListData?.courierNumber || packListData?.courier_number || '',
        vehicleNumber: packListData?.vehicleNumber || packListData?.vehicle_number || '',
        challanNumber: packListData?.challanNumber || packListData?.challan_number || '',
        dispatchDate: packListData?.dispatchDate || packListData?.dispatch_date || '',
        estimatedDeliveryDate: packListData?.estimatedDeliveryDate || packListData?.estimated_delivery_date || packListData?.expectedArrivalDate || packListData?.expected_arrival_date || '',
        numberOfBoxes: packListData?.numberOfBoxes || packListData?.number_of_boxes || 0,
        totalWeight: packListData?.totalWeight || packListData?.total_weight || 0,
        notes: packListData?.notes || '',
        poItems: packListData?.poItems || (Array.isArray(packListData?.poItems) ? packListData.poItems : [])
      }];
    })()
  };
};

const PurchasePage = () => {
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
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>(getDefaultStartDate());
  const [endDate, setEndDate] = useState<string>(getDefaultEndDate());
  const [packlistModalOpen, setPacklistModalOpen] = useState(false);
  const [orderForPacklist, setOrderForPacklist] = useState<PurchaseOrder | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [updatePacklistModalOpen, setUpdatePacklistModalOpen] = useState(false);
  const [orderForUpdatePacklist, setOrderForUpdatePacklist] = useState<PurchaseOrder | null>(null);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailedOrderData, setDetailedOrderData] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [isPrinting, setIsPrinting] = useState(false);

  // Check permission
  const hasPermission = hasSubPermission('/yarn-management/purchase-management', 'Purchase Order');

  // Fetch purchase orders from API
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

      // If "all" is selected, fetch all statuses
      if (statusFilter === "all") {
        const statusesToFetch = [
          'submitted_to_supplier',
          'in_transit',
          'goods_partially_received',
          'goods_received',
          'qc_pending',
          'po_accepted',
          'po_accepted_partially',
          'po_rejected'
        ];

        // Fetch all statuses in parallel
        const responses = await Promise.all(
          statusesToFetch.map(status => 
            yarnPurchaseOrderService.getPurchaseOrders({ ...baseParams, status_code: status })
          )
        );

        // Combine results from all API calls
        const allOrders: any[] = [];
        responses.forEach((response) => {
          const ordersData = Array.isArray(response) ? response : (response.results || []);
          allOrders.push(...ordersData);
        });

        // Deduplicate by order ID
        const uniqueOrders = allOrders.filter((order, index, self) => 
          index === self.findIndex((o) => (o._id || o.id) === (order._id || order.id))
        );
        
        const mappedOrders = uniqueOrders.map(mapAPIOrderToComponent);
        setOrders(mappedOrders);
      } else {
        // Filter by selected status
        baseParams.status_code = convertStatusToAPI(statusFilter as PurchaseOrderStatus);
        const response = await yarnPurchaseOrderService.getPurchaseOrders(baseParams);
        
        // Handle both array and object with results property
        const ordersData = Array.isArray(response) ? response : (response.results || []);
        const mappedOrders = ordersData.map(mapAPIOrderToComponent);
        setOrders(mappedOrders);
      }
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
  }, [hasPermission, isLoading, startDate, endDate, statusFilter]);

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

  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-lock-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500 mb-4">You don't have permission to access Purchase Order.</p>
          <Link href="/yarn-management" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Yarn Management
          </Link>
        </div>
      </div>
    );
  }

  const handlePrintInvoice = async (order: PurchaseOrder) => {
    setIsPrinting(true);
    try {
      // Fetch detailed order data to get complete supplier information
      let detailedOrderData: any = null;
      try {
        detailedOrderData = await yarnPurchaseOrderService.getPurchaseOrderById(order.id);
      } catch (error) {
        console.error('Failed to fetch detailed order data:', error);
        toast.error('Failed to fetch order details for printing');
        setIsPrinting(false);
        return;
      }

      // Fetch the HTML template
      const response = await fetch('/templates/yarn-purchase-invoice.html');
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

      // Get supplier details from API response
      const supplierData = detailedOrderData?.supplier || {};
      const supplierName = detailedOrderData?.supplierName || supplierData?.brandName || order.supplier || 'N/A';
      const supplierAddress = supplierData?.address || 'N/A';
      const supplierCity = supplierData?.city || '';
      const supplierState = supplierData?.state || '';
      const supplierLocation = [supplierCity, supplierState].filter(Boolean).join(', ') || 'N/A';
      const supplierContact = supplierData?.contactNumber || 'N/A';
      const supplierGST = supplierData?.gstin || supplierData?.gst || 'N/A';

      // Get order details from API response
      const orderItems = detailedOrderData?.poItems || order.items || [];
      const poNumber = detailedOrderData?.poNumber || order.orderNumber || 'N/A';
      const orderDate = detailedOrderData?.createDate || order.orderDate;
      const subTotal = detailedOrderData?.subTotal || order.subTotal || 0;
      const totalGst = detailedOrderData?.gst || order.totalGst || 0;
      const totalAmount = detailedOrderData?.total || order.totalAmount || 0;
      const notes = detailedOrderData?.notes || order.notes || '';

      // Get packlist details
      const packlistDetails = detailedOrderData?.packListDetails?.[0] || order.packlistDetails;
      const dispatchNumber = packlistDetails?.packingNumber || packlistDetails?.trackingNumber || 'N/A';
      const dispatchDate = packlistDetails?.dispatchDate ? formatDate(packlistDetails.dispatchDate) : 'N/A';

      // Calculate GST - check if same state (CGST/SGST) or different state (IGST)
      const isSameState = supplierState?.toLowerCase() === 'maharashtra' || supplierState?.toLowerCase() === 'mh';
      let taxRowHtml = '';
      
      if (isSameState && orderItems.length > 0) {
        // Same state: Split GST into SGST and CGST
        const avgGstRate = orderItems.reduce((sum: number, item: any) => sum + (item.gstRate || item.gst || 0), 0) / orderItems.length;
        const sgstRate = avgGstRate / 2;
        const cgstRate = avgGstRate / 2;
        const sgstAmount = totalGst / 2;
        const cgstAmount = totalGst / 2;
        taxRowHtml = `<tr><td>SGST ${sgstRate.toFixed(2)}%</td><td>${subTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td><td>${sgstAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td><td>0.00</td></tr><tr><td>CGST ${cgstRate.toFixed(2)}%</td><td>........</td><td>0.00</td><td>${cgstAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td></tr>`;
      } else if (orderItems.length > 0) {
        // Different state: Use IGST
        const avgGstRate = orderItems.reduce((sum: number, item: any) => sum + (item.gstRate || item.gst || 0), 0) / orderItems.length;
        const igstAmount = totalGst;
        taxRowHtml = `<tr><td>IGST ${avgGstRate.toFixed(2)}%</td><td>${subTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td><td>0.00</td><td>${igstAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td></tr>`;
      } else {
        taxRowHtml = `<tr><td>IGST 5%</td><td>........</td><td>0.00</td><td>0.00</td></tr>`;
      }

      // Replace supplier information
      htmlTemplate = htmlTemplate.replace(
        /<b>Valson Polyester Pvt Ltd<\/b><br>[\s\S]*?<b>GST :<\/b> 26AAACV4941Q1ZS/g,
        `<b>${supplierName}</b><br>${supplierAddress}<br>${supplierLocation}<br><br><b>PHON :</b><br><b>MOB :</b> ${supplierContact}<br><b>GST :</b> ${supplierGST}`
      );

      // Replace invoice details
      const invoiceDate = formatDate(orderDate);
      htmlTemplate = htmlTemplate.replace(/<b>Invoice No :<\/b><br>P\/25-26\/00478/g, `<b>Invoice No :</b><br>${poNumber}`);
      htmlTemplate = htmlTemplate.replace(/<b>Dated :<\/b><br>30-10-2025/g, `<b>Dated :</b><br>${invoiceDate}`);
      htmlTemplate = htmlTemplate.replace(/<b>Delivery Note :<\/b><br>/g, `<b>Delivery Note :</b><br>${dispatchNumber}`);
      htmlTemplate = htmlTemplate.replace(/<b>Mode\/Terms of Payment :<\/b><br>/g, `<b>Mode/Terms of Payment :</b><br>Credit`);
      htmlTemplate = htmlTemplate.replace(/<b>Suppliers Ref :<\/b><br>/g, `<b>Suppliers Ref :</b><br>N/A`);
      htmlTemplate = htmlTemplate.replace(/<b>Other References\/PO No :<\/b><br>/g, `<b>Other References/PO No :</b><br>${poNumber}`);
      htmlTemplate = htmlTemplate.replace(/<b>Buyers Order No :<\/b><br>/g, `<b>Buyers Order No :</b><br>${poNumber}`);
      htmlTemplate = htmlTemplate.replace(/<b>Dated :<\/b><br>/g, `<b>Dated :</b><br>${invoiceDate}`);
      htmlTemplate = htmlTemplate.replace(/<b>Despatch Document No :<\/b><br>/g, `<b>Despatch Document No :</b><br>${dispatchNumber}`);
      htmlTemplate = htmlTemplate.replace(/<b>Delivery Note Date :<\/b><br>/g, `<b>Delivery Note Date :</b><br>${dispatchDate}`);

      // Replace consignee email
      htmlTemplate = htmlTemplate.replace(/<b>E-Mail :<\/b>/g, `<b>E-Mail :</b> info@addon.in`);

      // Generate items rows - replace the example rows
      let itemsHtml = '';
      orderItems.forEach((item: any, index: number) => {
        const yarnName = item.yarnName || item.yarn?.yarnName || 'N/A';
        const sizeCount = item.sizeCount || 'N/A';
        const shadeCode = item.shadeCode || 'N/A';
        const quantity = item.quantity || 0;
        const rate = item.rate || 0;
        const amount = quantity * rate;
        
        itemsHtml += `<tr><td>${index + 1}</td><td>${shadeCode}</td><td>${yarnName}${sizeCount !== 'N/A' ? ' - ' + sizeCount : ''}</td><td>${quantity.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td><td>${rate.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td><td>KGS</td><td>${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td></tr>`;
      });
      
      // Replace the example product rows
      htmlTemplate = htmlTemplate.replace(
        /<tr>\s*<td>1<\/td>[\s\S]*?<td>15,067\.22<\/td>\s*<\/tr>/g,
        itemsHtml
      );

      // Replace totals
      const totalQuantity = orderItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
      htmlTemplate = htmlTemplate.replace(/TOTAL QTY : 190\.5700/g, `TOTAL QTY : ${totalQuantity.toLocaleString('en-IN', { maximumFractionDigits: 4 })}`);
      htmlTemplate = htmlTemplate.replace(/TOTAL AMOUNT : 72,988\.30/g, `TOTAL AMOUNT : ${subTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
      htmlTemplate = htmlTemplate.replace(/<td colspan="6">SHIPPING<\/td>\s*<td>572\.00<\/td>/g, `<td colspan="6">SHIPPING</td><td>0.00</td>`);

      // Replace tax section
      htmlTemplate = htmlTemplate.replace(/<tr><td>IGST 5%<\/td>[\s\S]*?<td>3,678\.01<\/td><\/tr>/g, taxRowHtml);
      htmlTemplate = htmlTemplate.replace(/<tr><td colspan="3" class="tax-total">TOTAL<\/td><td>77,238\.00<\/td><\/tr>/g, `<tr><td colspan="3" class="tax-total">TOTAL</td><td>${totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td></tr>`);

      // Replace amount in words
      htmlTemplate = htmlTemplate.replace(/<div><b>Net Amount Total :-<\/b> Seventy Seven Thousand Two Hundred Thirty Eight Only<\/div>/g, `<div><b>Net Amount Total :-</b> ${numberToWords(totalAmount)} Only</div>`);

      // Replace narration
      const narrationText = notes || 'N/A';
      htmlTemplate = htmlTemplate.replace(/<div style="margin-top:6px;"><b>NARRATION:<\/b> Inv No P28345 Dt 29\.10\.2025 Rcvd 30\.10\.2025<\/div>/g, `<div style="margin-top:6px;"><b>NARRATION:</b> ${narrationText}</div>`);

      // Open print window
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlTemplate);
        printWindow.document.close();
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            setIsPrinting(false);
          }, 250);
        };
      } else {
        setIsPrinting(false);
        toast.error('Please allow popups to print invoice');
      }
    } catch (error) {
      console.error('Error printing invoice:', error);
      toast.error('Failed to load invoice template');
      setIsPrinting(false);
    }
  };

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

  const updateOrderStatus = async (orderId: string, newStatus: PurchaseOrderStatus) => {
    if (!user || !user.id || !user.email) {
      toast.error('User information not available. Please login again.');
      return;
    }

    setIsUpdatingStatus(true);
    try {
      await yarnPurchaseOrderService.updatePurchaseOrderStatus(
        orderId,
        newStatus,
        user.id,
        user.email,
        `Status updated to ${newStatus}`
      );
      
      await fetchPurchaseOrders();
      toast.success('Purchase order status updated successfully');
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: PurchaseOrderStatus) => {
    // If updating to "in transit", show packlist modal
    if (newStatus === 'in transit') {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        setOrderForPacklist(order);
        setPacklistModalOpen(true);
      }
      return;
    }

    // For other status updates, proceed directly
    await updateOrderStatus(orderId, newStatus);
  };

  const handlePacklistSubmit = async (details: PacklistDetails[]) => {
    if (!orderForPacklist) {
      toast.error('Order not found');
      return;
    }

    if (!user || !user.id || !user.email) {
      toast.error('User information not available. Please login again.');
      return;
    }

    if (!details || details.length === 0) {
      toast.error('At least one packlist entry is required');
      return;
    }

    setIsUpdatingStatus(true);
    try {
      // Handle file upload if packlist file is provided (from any entry)
      const entryWithFile = details.find(d => d.packlistFile);
      if (entryWithFile?.packlistFile) {
        // TODO: Implement API call to upload packlist file
        // Example: await uploadPacklistFile(orderForPacklist.id, entryWithFile.packlistFile);
        console.log('Packlist file to upload:', {
          fileName: entryWithFile.packlistFileName,
          fileSize: entryWithFile.packlistFile.size,
          fileType: entryWithFile.packlistFile.type
        });
      }

      // First API call: Update order with packlist details (array)
      await yarnPurchaseOrderService.updatePurchaseOrderWithPacklist(
        orderForPacklist.id,
        details
      );

      // Combine notes from all entries for status update
      const combinedNotes = details
        .map(d => d.notes)
        .filter(Boolean)
        .join('; ') || 'Shipment collected by courier';

      // Second API call: Update status to "in transit"
      await yarnPurchaseOrderService.updatePurchaseOrderStatus(
        orderForPacklist.id,
        'in transit',
        user.id,
        user.email, // Using email as username, adjust if your API expects different field
        combinedNotes
      );
      
      // Refresh orders list
      await fetchPurchaseOrders();
      
      toast.success(`Purchase order updated with ${details.length} packlist ${details.length === 1 ? 'entry' : 'entries'} and marked as in transit successfully`);
      setPacklistModalOpen(false);
      setOrderForPacklist(null);
    } catch (error) {
      console.error('Failed to update order:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update order');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleUpdatePacklistSubmit = async (details: PacklistDetails[]) => {
    if (!orderForUpdatePacklist) {
      toast.error('Order not found');
      return;
    }

    if (!details || details.length === 0) {
      toast.error('At least one packlist entry is required');
      return;
    }

    setIsUpdatingStatus(true);
    try {
      // Handle file upload if packlist file is provided (from any entry)
      const entryWithFile = details.find(d => d.packlistFile);
      if (entryWithFile?.packlistFile) {
        // TODO: Implement API call to upload packlist file
        console.log('Packlist file to upload:', {
          fileName: entryWithFile.packlistFileName,
          fileSize: entryWithFile.packlistFile.size,
          fileType: entryWithFile.packlistFile.type
        });
      }

      // Update order with packlist details (array) - no status change
      await yarnPurchaseOrderService.updatePurchaseOrderWithPacklist(
        orderForUpdatePacklist.id,
        details
      );
      
      // Refresh orders list
      await fetchPurchaseOrders();
      
      toast.success(`Packlist details updated successfully with ${details.length} ${details.length === 1 ? 'entry' : 'entries'}`);
      setUpdatePacklistModalOpen(false);
      setOrderForUpdatePacklist(null);
    } catch (error) {
      console.error('Failed to update packlist:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update packlist');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteOrder = async (order: PurchaseOrder) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete Purchase Order ${order.orderNumber}?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      await yarnPurchaseOrderService.deletePurchaseOrder(order.id);
      toast.success(`Purchase Order ${order.orderNumber} deleted successfully`);
      // Refresh orders list
      await fetchPurchaseOrders();
    } catch (error) {
      console.error('Failed to delete purchase order:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete purchase order');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'submitted to supplier': return 'bg-blue-100 text-blue-800';
      case 'in transit': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'QC pending': return 'bg-yellow-100 text-yellow-800';
      case 'partially delivered': return 'bg-orange-100 text-orange-800';
      case 'stocked': return 'bg-emerald-100 text-emerald-800';
      case 'goods received': return 'bg-teal-100 text-teal-800';
      case 'goods partially received': return 'bg-amber-100 text-amber-800';
      case 'PO accepted': return 'bg-green-100 text-green-800';
      case 'PO accepted partially': return 'bg-lime-100 text-lime-800';
      case 'po_accepted': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getNextStatusOptions = (currentStatus: PurchaseOrderStatus): PurchaseOrderStatus[] => {
    switch (currentStatus) {
      case 'submitted to supplier':
        return ['in transit', 'rejected'];
      case 'in transit':
        return ['delivered', 'partially delivered'];
      case 'delivered':
        return ['QC pending'];
      case 'QC pending':
        return ['stocked', 'rejected'];
      case 'partially delivered':
        return ['delivered', 'QC pending'];
      default:
        return [];
    }
  };

  return (
    <div className="main-content">
      <Seo title="Purchase Order" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Purchase Order</h1>
                <p className="text-gray-600 mt-1">Manage yarn procurement and purchase orders</p>
              </div>
              <div className="box-tools">
                <Link 
                  href="/yarn-management/purchase-management/purchase/add"
                  className="ti-btn ti-btn-primary"
                >
                  <i className="ri-add-line me-1"></i>
                  New Order
                </Link>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="box">
            <div className="box-body">
              <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by order number or supplier..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                  <div className="flex gap-2">
                    <select
                      className="form-select"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All Orders</option>
                      <option value="submitted to supplier">Submitted to Supplier</option>
                      <option value="in transit">In Transit</option>
                      <option value="goods partially received">Goods Partially Received</option>
                      <option value="goods received">Goods Received</option>
                      <option value="QC pending">QC Pending</option>
                      <option value="PO accepted">PO Accepted</option>
                      <option value="PO accepted partially">PO Accepted Partially</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  <button className="ti-btn ti-btn-light">
                    <i className="ri-download-line me-1"></i>
                    Export
                  </button>
                </div>
              </div>
                <div className="flex flex-col md:flex-row gap-4">
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
                          setStartDate("");
                          setEndDate("");
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
          </div>

          {/* Purchase Orders Table */}
          <div className="box">
            <div className="box-header">
              <h3 className="box-title">Purchase Orders ({filteredOrders.length})</h3>
            </div>
            <div className="box-body">
              {isLoadingOrders ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading purchase orders...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <i className="ri-shopping-cart-line text-4xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Purchase Orders</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm
                      ? "No orders match your search criteria. Try adjusting your search term."
                      : "No purchase orders found for the selected period."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse border border-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          PO Number
                        </th>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Supplier
                        </th>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order Date
                        </th>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expected Delivery
                        </th>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Amount
                        </th>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {filteredOrders.map((order) => {
                        return (
                          <tr key={order.id} className="hover:bg-gray-50">
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
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={async () => {
                                    setSelectedOrder(order);
                                    setActiveTab('details');
                                    setDetailsModalOpen(true);
                                    setIsLoadingDetails(true);
                                    try {
                                      const detailedData = await yarnPurchaseOrderService.getPurchaseOrderById(order.id);
                                      setDetailedOrderData(detailedData);
                                    } catch (error) {
                                      console.error('Failed to fetch order details:', error);
                                      toast.error('Failed to load order details');
                                      setDetailedOrderData(null);
                                    } finally {
                                      setIsLoadingDetails(false);
                                    }
                                  }}
                                  className="text-purple-600 hover:text-purple-900 flex items-center justify-center"
                                  title="View Details"
                                >
                                  <i className="ri-eye-line text-lg"></i>
                                </button>
                                <button
                                  onClick={() => handlePrintInvoice(order)}
                                  className="text-blue-600 hover:text-blue-900 flex items-center justify-center"
                                  title="Print Invoice"
                                  disabled={isPrinting}
                                >
                                  {isPrinting ? (
                                    <i className="ri-loader-4-line text-lg animate-spin"></i>
                                  ) : (
                                    <i className="ri-printer-line text-lg"></i>
                                  )}
                                </button>
                                <Link
                                  href={`/yarn-management/purchase-management/purchase/edit/${order.id}`}
                                  className="text-green-600 hover:text-green-900 flex items-center justify-center"
                                  title="Edit"
                                >
                                  <i className="ri-edit-line text-lg"></i>
                                </Link>
                                <button
                                  onClick={() => handleDeleteOrder(order)}
                                  className="text-red-600 hover:text-red-900 flex items-center justify-center"
                                  title="Delete"
                                  disabled={isDeleting}
                                >
                                  <i className="ri-delete-bin-line text-lg"></i>
                                </button>
                                {order.status === 'submitted to supplier' && (
                                  <button
                                    onClick={() => handleStatusUpdate(order.id, 'in transit')}
                                    className="text-xs border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded px-3 py-1 h-7 font-medium"
                                    title="Mark in Transit"
                                  >
                                    Mark in Transit
                                  </button>
                                )}
                                {(order.status === 'goods received' || 
                                  order.status === 'in transit' || 
                                  order.status === 'goods partially received') && (
                                  <button
                                    onClick={() => {
                                      setOrderForUpdatePacklist(order);
                                      setUpdatePacklistModalOpen(true);
                                    }}
                                    className="text-xs border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded px-3 py-1 h-7 font-medium"
                                    title="Update Packlist"
                                  >
                                    Update Packlist
                                  </button>
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

      {/* Packlist Modal */}
      {orderForPacklist && (
        <PacklistModal
          isOpen={packlistModalOpen}
          onClose={() => {
            setPacklistModalOpen(false);
            setOrderForPacklist(null);
          }}
          onSubmit={handlePacklistSubmit}
          order={{
            id: orderForPacklist.id,
            orderNumber: orderForPacklist.orderNumber,
            supplier: orderForPacklist.supplier,
            orderDate: orderForPacklist.orderDate,
            expectedDelivery: orderForPacklist.expectedDelivery,
            totalAmount: orderForPacklist.totalAmount,
            items: orderForPacklist.items.map(item => ({
              id: item.id,
              yarnName: item.yarnName,
              sizeCount: item.sizeCount,
              shadeCode: item.shadeCode,
              quantity: item.quantity,
              rate: item.rate
            }))
          }}
          isSubmitting={isUpdatingStatus}
        />
      )}

      {/* Update Packlist Modal */}
      {orderForUpdatePacklist && (
        <UpdatePacklistModal
          isOpen={updatePacklistModalOpen}
          onClose={() => {
            setUpdatePacklistModalOpen(false);
            setOrderForUpdatePacklist(null);
          }}
          onSubmit={handleUpdatePacklistSubmit}
          order={{
            id: orderForUpdatePacklist.id,
            orderNumber: orderForUpdatePacklist.orderNumber,
            supplier: orderForUpdatePacklist.supplier,
            orderDate: orderForUpdatePacklist.orderDate,
            expectedDelivery: orderForUpdatePacklist.expectedDelivery,
            totalAmount: orderForUpdatePacklist.totalAmount,
            items: orderForUpdatePacklist.items.map(item => ({
              id: item.id,
              yarnName: item.yarnName,
              sizeCount: item.sizeCount,
              shadeCode: item.shadeCode,
              quantity: item.quantity,
              rate: item.rate
            }))
          }}
          existingPacklistData={orderForUpdatePacklist.packListDetailsArray || (orderForUpdatePacklist.packlistDetails ? [orderForUpdatePacklist.packlistDetails] : undefined)}
          isSubmitting={isUpdatingStatus}
        />
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className={`fixed inset-0 z-50 overflow-y-auto ${detailsModalOpen ? '' : 'hidden'}`}>
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => {
                setDetailsModalOpen(false);
                setSelectedOrder(null);
                setDetailedOrderData(null);
              }}
            ></div>

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
              {/* Header */}
              <div className="bg-primary text-white px-6 py-4">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Purchase Order Details</h3>
                    <p className="text-sm text-white/80 mt-1">{selectedOrder.orderNumber}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handlePrintInvoice(selectedOrder)}
                      className="text-white hover:text-gray-200 transition-colors flex items-center gap-2 px-3 py-1.5 rounded hover:bg-white/10"
                      title="Print Invoice"
                      disabled={isPrinting}
                    >
                      {isPrinting ? (
                        <i className="ri-loader-4-line text-lg animate-spin"></i>
                      ) : (
                        <i className="ri-printer-line text-lg"></i>
                      )}
                      <span className="text-sm">{isPrinting ? 'Printing...' : 'Print'}</span>
                    </button>
                    <button
                      onClick={() => {
                        setDetailsModalOpen(false);
                        setSelectedOrder(null);
                        setDetailedOrderData(null);
                        setActiveTab('details');
                      }}
                      className="text-white hover:text-gray-200 transition-colors"
                    >
                      <i className="ri-close-line text-xl"></i>
                    </button>
                  </div>
                </div>
                {/* Tabs */}
                <div className="flex gap-1 border-b border-white/20">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === 'details'
                        ? 'text-white border-b-2 border-white'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    Order Details
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === 'history'
                        ? 'text-white border-b-2 border-white'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    Status History
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                {isLoadingDetails ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading order details...</p>
                  </div>
                ) : (
                  <>
                    {/* Order Details Tab */}
                    {activeTab === 'details' && (
                      <>
                        {/* Order Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">PO Number</label>
                          <div className="mt-1 text-sm text-gray-900 font-medium">
                            {detailedOrderData?.poNumber || selectedOrder.orderNumber}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Supplier</label>
                          <div className="mt-1 text-sm text-gray-900">
                            {detailedOrderData?.supplierName || detailedOrderData?.supplier?.brandName || selectedOrder.supplier}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Order Date</label>
                          <div className="mt-1 text-sm text-gray-900">
                            {new Date(detailedOrderData?.createDate || selectedOrder.orderDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Expected Delivery</label>
                          <div className="mt-1 text-sm text-gray-900">
                            {detailedOrderData?.poItems && detailedOrderData.poItems.length > 0 ? (
                              new Date(
                                detailedOrderData.poItems.reduce((latest: string, item: any) => {
                                  const itemDate = item.estimatedDeliveryDate;
                                  return itemDate && (!latest || new Date(itemDate) > new Date(latest)) ? itemDate : latest;
                                }, '')
                              ).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })
                            ) : (
                              new Date(selectedOrder.expectedDelivery).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Status</label>
                          <div className="mt-1">
                            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(convertStatusFromAPI(detailedOrderData?.currentStatus || selectedOrder.status))}`}>
                              {convertStatusFromAPI(detailedOrderData?.currentStatus || selectedOrder.status)}
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Sub Total</label>
                          <div className="mt-1 text-sm text-gray-900">₹{(detailedOrderData?.subTotal || selectedOrder.subTotal).toLocaleString()}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">GST</label>
                          <div className="mt-1 text-sm text-gray-900">₹{(detailedOrderData?.gst || selectedOrder.totalGst).toLocaleString()}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Total Amount</label>
                          <div className="mt-1 text-sm text-gray-900 font-semibold text-lg">₹{(detailedOrderData?.total || selectedOrder.totalAmount).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>

                    {/* Supplier Details */}
                    {detailedOrderData?.supplier && (
                      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <label className="text-sm font-medium text-gray-700 mb-3 block">Supplier Details</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {detailedOrderData.supplier.brandName && (
                            <div>
                              <label className="text-xs font-medium text-gray-600">Brand Name</label>
                              <div className="mt-1 text-sm text-gray-900">{detailedOrderData.supplier.brandName}</div>
                            </div>
                          )}
                          {detailedOrderData.supplier.contactPersonName && (
                            <div>
                              <label className="text-xs font-medium text-gray-600">Contact Person</label>
                              <div className="mt-1 text-sm text-gray-900">{detailedOrderData.supplier.contactPersonName}</div>
                            </div>
                          )}
                          {detailedOrderData.supplier.contactNumber && (
                            <div>
                              <label className="text-xs font-medium text-gray-600">Contact Number</label>
                              <div className="mt-1 text-sm text-gray-900">{detailedOrderData.supplier.contactNumber}</div>
                            </div>
                          )}
                          {detailedOrderData.supplier.email && (
                            <div>
                              <label className="text-xs font-medium text-gray-600">Email</label>
                              <div className="mt-1 text-sm text-gray-900">{detailedOrderData.supplier.email}</div>
                            </div>
                          )}
                          {detailedOrderData.supplier.address && (
                            <div className="md:col-span-2">
                              <label className="text-xs font-medium text-gray-600">Address</label>
                              <div className="mt-1 text-sm text-gray-900 whitespace-pre-line">
                                {detailedOrderData.supplier.address}
                                {detailedOrderData.supplier.city && `, ${detailedOrderData.supplier.city}`}
                                {detailedOrderData.supplier.state && `, ${detailedOrderData.supplier.state}`}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {(detailedOrderData?.notes || selectedOrder.notes) && (
                      <div className="mb-6">
                        <label className="text-sm font-medium text-gray-600">Notes</label>
                        <div className="mt-1 p-3 bg-gray-50 rounded text-sm text-gray-900">
                          {detailedOrderData?.notes || selectedOrder.notes}
                        </div>
                      </div>
                    )}

                    {/* Items Table */}
                    <div className="mb-6">
                      <label className="text-sm font-medium text-gray-600 mb-3 block">Order Items</label>
                      <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse border border-gray-300">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="border border-gray-300 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Yarn Name</th>
                              <th className="border border-gray-300 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Size/Count</th>
                              <th className="border border-gray-300 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Shade Code</th>
                              <th className="border border-gray-300 px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                              <th className="border border-gray-300 px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                              <th className="border border-gray-300 px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">GST %</th>
                              <th className="border border-gray-300 px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Sub Total</th>
                              <th className="border border-gray-300 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Est. Delivery</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {(detailedOrderData?.poItems || selectedOrder.items).map((item: any, index: number) => {
                              const yarnName = item.yarnName || item.yarn?.yarnName || '';
                              const sizeCount = item.sizeCount || '';
                              const shadeCode = item.shadeCode || '';
                              const quantity = item.quantity || 0;
                              const rate = item.rate || 0;
                              const gstRate = item.gstRate || item.gst || 18;
                              const subTotal = item.subTotal || (quantity * rate);
                              const estimatedDelivery = item.estimatedDeliveryDate || '';
                              
                              return (
                                <tr key={item.id || item._id || index} className="hover:bg-gray-50">
                                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">{yarnName}</td>
                                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">{sizeCount}</td>
                                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">{shadeCode}</td>
                                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900 text-right">{quantity.toLocaleString()}</td>
                                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900 text-right">₹{rate.toLocaleString()}</td>
                                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900 text-right">{gstRate}%</td>
                                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900 text-right">₹{subTotal.toLocaleString()}</td>
                                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                                    {estimatedDelivery ? new Date(estimatedDelivery).toLocaleDateString() : '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                {/* Packlist Details */}
                {((selectedOrder.packListDetailsArray && selectedOrder.packListDetailsArray.length > 0) || selectedOrder.packlistDetails) && (
                  <div className="mb-6">
                    <label className="text-sm font-medium text-gray-700 mb-3 block">
                      Packlist Details
                      {selectedOrder.packListDetailsArray && selectedOrder.packListDetailsArray.length > 0 && (
                        <span className="text-xs text-gray-500 ml-2">
                          ({selectedOrder.packListDetailsArray.length} {selectedOrder.packListDetailsArray.length === 1 ? 'entry' : 'entries'})
                        </span>
                      )}
                    </label>
                    
                    {/* Display all packlist entries from array */}
                    {selectedOrder.packListDetailsArray && selectedOrder.packListDetailsArray.length > 0 ? (
                      <div className="space-y-4">
                        {selectedOrder.packListDetailsArray.map((packlistEntry, index) => (
                          <div key={index} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-semibold text-gray-800">
                                Packlist Entry {index + 1}
                              </h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {packlistEntry.packingNumber && (
                                <div>
                                  <label className="text-xs font-medium text-gray-600">Packing Number</label>
                                  <div className="mt-1 text-sm text-gray-900">{packlistEntry.packingNumber}</div>
                                </div>
                              )}
                              {packlistEntry.courierName && (
                                <div>
                                  <label className="text-xs font-medium text-gray-600">Courier Name</label>
                                  <div className="mt-1 text-sm text-gray-900">{packlistEntry.courierName}</div>
                                </div>
                              )}
                              {packlistEntry.courierNumber && (
                                <div>
                                  <label className="text-xs font-medium text-gray-600">Courier Number</label>
                                  <div className="mt-1 text-sm text-gray-900">{packlistEntry.courierNumber}</div>
                                </div>
                              )}
                              {packlistEntry.vehicleNumber && (
                                <div>
                                  <label className="text-xs font-medium text-gray-600">Vehicle Number</label>
                                  <div className="mt-1 text-sm text-gray-900">{packlistEntry.vehicleNumber}</div>
                                </div>
                              )}
                              {packlistEntry.challanNumber && (
                                <div>
                                  <label className="text-xs font-medium text-gray-600">Challan Number</label>
                                  <div className="mt-1 text-sm text-gray-900">{packlistEntry.challanNumber}</div>
                                </div>
                              )}
                              {packlistEntry.dispatchDate && (
                                <div>
                                  <label className="text-xs font-medium text-gray-600">Dispatch Date</label>
                                  <div className="mt-1 text-sm text-gray-900">
                                    {new Date(packlistEntry.dispatchDate).toLocaleDateString()}
                                  </div>
                                </div>
                              )}
                              {packlistEntry.estimatedDeliveryDate && (
                                <div>
                                  <label className="text-xs font-medium text-gray-600">Estimated Delivery Date</label>
                                  <div className="mt-1 text-sm text-gray-900">
                                    {new Date(packlistEntry.estimatedDeliveryDate).toLocaleDateString()}
                                  </div>
                                </div>
                              )}
                              {packlistEntry.numberOfBoxes !== undefined && packlistEntry.numberOfBoxes > 0 && (
                                <div>
                                  <label className="text-xs font-medium text-gray-600">Number of Boxes</label>
                                  <div className="mt-1 text-sm text-gray-900">{packlistEntry.numberOfBoxes}</div>
                                </div>
                              )}
                              {packlistEntry.totalWeight !== undefined && packlistEntry.totalWeight > 0 && (
                                <div>
                                  <label className="text-xs font-medium text-gray-600">Total Weight (kg)</label>
                                  <div className="mt-1 text-sm text-gray-900">{packlistEntry.totalWeight}</div>
                                </div>
                              )}
                              {packlistEntry.poItems && Array.isArray(packlistEntry.poItems) && packlistEntry.poItems.length > 0 && (
                                <div className="md:col-span-2">
                                  <label className="text-xs font-medium text-gray-600 mb-2 block">PO Items ({packlistEntry.poItems.length})</label>
                                  <div className="mt-1">
                                    {selectedOrder.items
                                      .filter(item => packlistEntry.poItems?.includes(item.id))
                                      .map((item, idx) => (
                                        <div key={idx} className="text-sm text-gray-900 mb-1">
                                          • {item.yarnName} - {item.sizeCount} - {item.shadeCode} (Qty: {item.quantity})
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}
                              {packlistEntry.notes && (
                                <div className="md:col-span-2">
                                  <label className="text-xs font-medium text-gray-600">Notes</label>
                                  <div className="mt-1 text-sm text-gray-900 p-2 bg-white rounded border border-gray-200">
                                    {packlistEntry.notes}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Fallback to single packlistDetails for backward compatibility */
                      selectedOrder.packlistDetails && (
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(selectedOrder.packlistDetails.packingNumber || selectedOrder.packlistDetails.trackingNumber) && (
                              <div>
                                <label className="text-xs font-medium text-gray-600">Packing/Tracking Number</label>
                                <div className="mt-1 text-sm text-gray-900">{selectedOrder.packlistDetails.packingNumber || selectedOrder.packlistDetails.trackingNumber}</div>
                              </div>
                            )}
                            {selectedOrder.packlistDetails.courierName && (
                              <div>
                                <label className="text-xs font-medium text-gray-600">Courier</label>
                                <div className="mt-1 text-sm text-gray-900">{selectedOrder.packlistDetails.courierName}</div>
                              </div>
                            )}
                            {selectedOrder.packlistDetails.courierNumber && (
                              <div>
                                <label className="text-xs font-medium text-gray-600">Courier Number</label>
                                <div className="mt-1 text-sm text-gray-900">{selectedOrder.packlistDetails.courierNumber}</div>
                              </div>
                            )}
                            {selectedOrder.packlistDetails.vehicleNumber && (
                              <div>
                                <label className="text-xs font-medium text-gray-600">Vehicle Number</label>
                                <div className="mt-1 text-sm text-gray-900">{selectedOrder.packlistDetails.vehicleNumber}</div>
                              </div>
                            )}
                            {selectedOrder.packlistDetails.challanNumber && (
                              <div>
                                <label className="text-xs font-medium text-gray-600">Challan Number</label>
                                <div className="mt-1 text-sm text-gray-900">{selectedOrder.packlistDetails.challanNumber}</div>
                              </div>
                            )}
                            {selectedOrder.packlistDetails.dispatchDate && (
                              <div>
                                <label className="text-xs font-medium text-gray-600">Dispatch Date</label>
                                <div className="mt-1 text-sm text-gray-900">
                                  {new Date(selectedOrder.packlistDetails.dispatchDate).toLocaleDateString()}
                                </div>
                              </div>
                            )}
                            {(selectedOrder.packlistDetails.estimatedDeliveryDate || selectedOrder.packlistDetails.expectedArrivalDate) && (
                              <div>
                                <label className="text-xs font-medium text-gray-600">Expected Arrival</label>
                                <div className="mt-1 text-sm text-gray-900">
                                  {new Date(selectedOrder.packlistDetails.estimatedDeliveryDate || selectedOrder.packlistDetails.expectedArrivalDate || '').toLocaleDateString()}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}

                        {/* Timestamps */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500 pt-4 border-t">
                          <div>
                            <span className="font-medium">Created:</span> {new Date(detailedOrderData?.createDate || selectedOrder.createdAt).toLocaleString()}
                          </div>
                          <div>
                            <span className="font-medium">Last Updated:</span> {new Date(detailedOrderData?.lastUpdateDate || selectedOrder.updatedAt).toLocaleString()}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Status History Tab */}
                    {activeTab === 'history' && (
                      <>
                        {detailedOrderData?.statusLogs && detailedOrderData.statusLogs.length > 0 ? (
                          <div className="mb-6">
                            <label className="text-sm font-medium text-gray-600 mb-3 block">Status History</label>
                            <div className="space-y-3">
                              {detailedOrderData.statusLogs.map((log: any, index: number) => (
                                <div key={index} className="p-3 bg-gray-50 rounded-lg border-l-4 border-primary">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(convertStatusFromAPI(log.statusCode))}`}>
                                          {convertStatusFromAPI(log.statusCode)}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {new Date(log.updatedAt).toLocaleString()}
                                        </span>
                                      </div>
                                      {log.updatedBy?.username && (
                                        <div className="text-xs text-gray-600 mt-1">
                                          Updated by: <span className="font-medium">{log.updatedBy.username}</span>
                                        </div>
                                      )}
                                      {log.notes && (
                                        <div className="text-sm text-gray-700 mt-2">{log.notes}</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <div className="text-gray-400 mb-4">
                              <i className="ri-history-line text-4xl"></i>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Status History</h3>
                            <p className="text-gray-500">No status changes have been recorded for this purchase order.</p>
                          </div>
                        )}

                        {/* Timestamps */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500 pt-4 border-t">
                          <div>
                            <span className="font-medium">Created:</span> {new Date(detailedOrderData?.createDate || selectedOrder.createdAt).toLocaleString()}
                          </div>
                          <div>
                            <span className="font-medium">Last Updated:</span> {new Date(detailedOrderData?.lastUpdateDate || selectedOrder.updatedAt).toLocaleString()}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setDetailsModalOpen(false);
                    setSelectedOrder(null);
                    setDetailedOrderData(null);
                    setActiveTab('details');
                  }}
                  className="ti-btn ti-btn-light"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchasePage;
