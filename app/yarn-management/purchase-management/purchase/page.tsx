"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { PurchaseOrderStatus } from "./components/PurchaseForm";
import PacklistModal, { PacklistDetails } from "./components/PacklistModal";
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
    dispatchDate?: string;
    estimatedDeliveryDate?: string;
    expectedArrivalDate?: string; // Legacy field name from API
    numberOfCones?: number;
    numberOfBoxes?: number;
    totalWeight?: number;
  };
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
    'po_accepted': 'po_accepted',
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
    } : undefined
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
  
  const [statusFilter, setStatusFilter] = useState<string>("submitted to supplier");
  const [startDate, setStartDate] = useState<string>(getDefaultStartDate());
  const [endDate, setEndDate] = useState<string>(getDefaultEndDate());
  const [packlistModalOpen, setPacklistModalOpen] = useState(false);
  const [orderForPacklist, setOrderForPacklist] = useState<PurchaseOrder | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailedOrderData, setDetailedOrderData] = useState<any>(null);

  // Check permission
  const hasPermission = hasSubPermission('/yarn-management/purchase-management', 'Purchase Order');

  // Fetch purchase orders from API
  const fetchPurchaseOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const params: any = {};

      // Add date filters if provided
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        params.start_date = start.toISOString();
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        params.end_date = end.toISOString();
      }

      // Filter by selected status
      params.status_code = convertStatusToAPI(statusFilter as PurchaseOrderStatus);

      const response = await yarnPurchaseOrderService.getPurchaseOrders(params);
      
      // Handle both array and object with results property
      const ordersData = Array.isArray(response) ? response : (response.results || []);
      const mappedOrders = ordersData.map(mapAPIOrderToComponent);
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
    try {
      // Fetch the HTML template
      const response = await fetch('/templates/yarn-purchase-invoice.html');
      let htmlTemplate = await response.text();

      // Get supplier details (you may need to fetch this from API)
      // For now, using order data
      const supplier = {
        name: order.supplier,
        address: {
          line1: '', // TODO: Get from supplier data
          line2: '',
          city: '',
          state: '',
          pin: ''
        },
        phone: '',
        mobile: '',
        gst: ''
      };

      // Calculate tax breakdown (assuming GST is split into SGST and CGST)
      const gstRate = order.items.length > 0 ? order.items[0].gst : 18;
      const sgstRate = gstRate / 2;
      const cgstRate = gstRate / 2;
      const sgstAmount = order.totalGst / 2;
      const cgstAmount = order.totalGst / 2;

      // Replace template variables
      htmlTemplate = htmlTemplate.replace(/\{\{supplier\.name\}\}/g, supplier.name || order.supplier);
      htmlTemplate = htmlTemplate.replace(/\{\{supplier\.address\.line1\}\}/g, supplier.address.line1 || '');
      htmlTemplate = htmlTemplate.replace(/\{\{supplier\.address\.line2\}\}/g, supplier.address.line2 || '');
      htmlTemplate = htmlTemplate.replace(/\{\{supplier\.address\.city\}\}/g, supplier.address.city || '');
      htmlTemplate = htmlTemplate.replace(/\{\{supplier\.address\.state\}\}/g, supplier.address.state || '');
      htmlTemplate = htmlTemplate.replace(/\{\{supplier\.address\.pin\}\}/g, supplier.address.pin || '');
      htmlTemplate = htmlTemplate.replace(/\{\{supplier\.phone\}\}/g, supplier.phone || '');
      htmlTemplate = htmlTemplate.replace(/\{\{supplier\.mobile\}\}/g, supplier.mobile || '');
      htmlTemplate = htmlTemplate.replace(/\{\{supplier\.gst\}\}/g, supplier.gst || '');

      // Invoice details
      htmlTemplate = htmlTemplate.replace(/\{\{invoice\.number\}\}/g, order.orderNumber);
      htmlTemplate = htmlTemplate.replace(/\{\{invoice\.date\}\}/g, new Date(order.orderDate).toLocaleDateString());
      htmlTemplate = htmlTemplate.replace(/\{\{invoice\.payment_terms\}\}/g, 'Credit');
      htmlTemplate = htmlTemplate.replace(/\{\{invoice\.supplier_ref\}\}/g, '');
      htmlTemplate = htmlTemplate.replace(/\{\{invoice\.po_number\}\}/g, order.orderNumber);

      // Delivery details
      htmlTemplate = htmlTemplate.replace(/\{\{delivery\.note\}\}/g, '');
      htmlTemplate = htmlTemplate.replace(/\{\{delivery\.date\}\}/g, new Date(order.expectedDelivery).toLocaleDateString());

      // Consignee (company details)
      htmlTemplate = htmlTemplate.replace(/\{\{consignee\.name\}\}/g, 'Addon holding pvt ltd');
      htmlTemplate = htmlTemplate.replace(/\{\{consignee\.address\.line1\}\}/g, '');
      htmlTemplate = htmlTemplate.replace(/\{\{consignee\.address\.line2\}\}/g, '');
      htmlTemplate = htmlTemplate.replace(/\{\{consignee\.address\.city\}\}/g, '');
      htmlTemplate = htmlTemplate.replace(/\{\{consignee\.address\.state\}\}/g, '');
      htmlTemplate = htmlTemplate.replace(/\{\{consignee\.address\.pin\}\}/g, '');
      htmlTemplate = htmlTemplate.replace(/\{\{consignee\.state_code\}\}/g, 'MH');
      htmlTemplate = htmlTemplate.replace(/\{\{consignee\.phone\}\}/g, '+91 9898989898');
      htmlTemplate = htmlTemplate.replace(/\{\{consignee\.email\}\}/g, 'info@addon.in');
      htmlTemplate = htmlTemplate.replace(/\{\{consignee\.gstin\}\}/g, '');

      // Order details
      htmlTemplate = htmlTemplate.replace(/\{\{order\.number\}\}/g, order.orderNumber);
      htmlTemplate = htmlTemplate.replace(/\{\{order\.date\}\}/g, new Date(order.orderDate).toLocaleDateString());

      // Despatch details
      htmlTemplate = htmlTemplate.replace(/\{\{despatch\.number\}\}/g, order.packlistDetails?.packingNumber || order.packlistDetails?.trackingNumber || '');

      // Generate items rows
      let itemsHtml = '';
      order.items.forEach((item, index) => {
        itemsHtml += `
          <tr>
            <td>${index + 1}</td>
            <td>${item.shadeCode || ''}</td>
            <td>${item.yarnName} - ${item.sizeCount}</td>
            <td class="numeric">${item.quantity}</td>
            <td class="numeric">₹${item.rate.toLocaleString()}</td>
            <td class="numeric">₹${(item.rate * item.quantity).toLocaleString()}</td>
          </tr>
        `;
      });
      htmlTemplate = htmlTemplate.replace(/<!-- Repeat this <tr> block for each line item -->[\s\S]*?<!-- Add additional rows as needed -->/g, itemsHtml);

      // Summary totals
      const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
      htmlTemplate = htmlTemplate.replace(/\{\{summary\.total_quantity\}\}/g, totalQuantity.toString());
      htmlTemplate = htmlTemplate.replace(/\{\{summary\.subtotal\}\}/g, `₹${order.subTotal.toLocaleString()}`);
      htmlTemplate = htmlTemplate.replace(/\{\{summary\.shipping\}\}/g, '₹0');
      htmlTemplate = htmlTemplate.replace(/\{\{summary\.round_off\}\}/g, '₹0');
      htmlTemplate = htmlTemplate.replace(/\{\{summary\.taxable_value\}\}/g, `₹${order.subTotal.toLocaleString()}`);
      htmlTemplate = htmlTemplate.replace(/\{\{summary\.grand_total\}\}/g, `₹${order.totalAmount.toLocaleString()}`);

      // Tax details
      htmlTemplate = htmlTemplate.replace(/\{\{tax\.sgst_rate\}\}/g, sgstRate.toString());
      htmlTemplate = htmlTemplate.replace(/\{\{tax\.sgst_amount\}\}/g, `₹${sgstAmount.toLocaleString()}`);
      htmlTemplate = htmlTemplate.replace(/\{\{tax\.cgst_rate\}\}/g, cgstRate.toString());
      htmlTemplate = htmlTemplate.replace(/\{\{tax\.cgst_amount\}\}/g, `₹${cgstAmount.toLocaleString()}`);
      htmlTemplate = htmlTemplate.replace(/\{\{tax\.igst_rate\}\}/g, '0');
      htmlTemplate = htmlTemplate.replace(/\{\{tax\.igst_amount\}\}/g, '₹0');

      // Amount in words (simple conversion - you may want to use a library)
      htmlTemplate = htmlTemplate.replace(/\{\{summary\.amount_in_words\}\}/g, `Rupees ${numberToWords(order.totalAmount)} only`);

      // Narration
      htmlTemplate = htmlTemplate.replace(/\{\{narration\}\}/g, order.notes || '');

      // Signatures
      htmlTemplate = htmlTemplate.replace(/\{\{signatures\.prepared_by\}\}/g, '');
      htmlTemplate = htmlTemplate.replace(/\{\{signatures\.verified_by\}\}/g, '');
      htmlTemplate = htmlTemplate.replace(/\{\{signatures\.authorised_date\}\}/g, new Date().toLocaleDateString());

      // Open print window
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlTemplate);
        printWindow.document.close();
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };
      }
    } catch (error) {
      console.error('Error printing invoice:', error);
      toast.error('Failed to load invoice template');
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

  const handlePacklistSubmit = async (details: PacklistDetails) => {
    if (!orderForPacklist) {
      toast.error('Order not found');
      return;
    }

    if (!user || !user.id || !user.email) {
      toast.error('User information not available. Please login again.');
      return;
    }

    setIsUpdatingStatus(true);
    try {
      // Handle file upload if packlist file is provided
      if (details.packlistFile) {
        // TODO: Implement API call to upload packlist file
        // Example: await uploadPacklistFile(orderForPacklist.id, details.packlistFile);
        console.log('Packlist file to upload:', {
          fileName: details.packlistFileName,
          fileSize: details.packlistFile.size,
          fileType: details.packlistFile.type
        });
      }

      // First API call: Update order with packlist details
      await yarnPurchaseOrderService.updatePurchaseOrderWithPacklist(
        orderForPacklist.id,
        details
      );

      // Second API call: Update status to "in transit"
      await yarnPurchaseOrderService.updatePurchaseOrderStatus(
        orderForPacklist.id,
        'in transit',
        user.id,
        user.email, // Using email as username, adjust if your API expects different field
        details.notes || 'Shipment collected by courier'
      );
      
      // Refresh orders list
      await fetchPurchaseOrders();
      
      toast.success('Purchase order updated and marked as in transit successfully');
      setPacklistModalOpen(false);
      setOrderForPacklist(null);
    } catch (error) {
      console.error('Failed to update order:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update order');
    } finally {
      setIsUpdatingStatus(false);
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
                      <option value="submitted to supplier">Submitted to Supplier</option>
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
                                >
                                  <i className="ri-printer-line text-lg"></i>
                                </button>
                                <Link
                                  href={`/yarn-management/purchase-management/purchase/edit/${order.id}`}
                                  className="text-green-600 hover:text-green-900 flex items-center justify-center"
                                  title="Edit"
                                >
                                  <i className="ri-edit-line text-lg"></i>
                                </Link>
                                {order.status === 'submitted to supplier' && (
                                  <button
                                    onClick={() => handleStatusUpdate(order.id, 'in transit')}
                                    className="text-xs border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded px-3 py-1 h-7 font-medium"
                                    title="Mark in Transit"
                                  >
                                    Mark in Transit
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
              <div className="bg-primary text-white px-6 py-4 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Purchase Order Details</h3>
                  <p className="text-sm text-white/80 mt-1">{selectedOrder.orderNumber}</p>
                </div>
                <button
                  onClick={() => {
                    setDetailsModalOpen(false);
                    setSelectedOrder(null);
                  }}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
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
                {selectedOrder.packlistDetails && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                    <label className="text-sm font-medium text-gray-700 mb-3 block">Packlist Details</label>
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
                )}

                    {/* Status Logs */}
                    {detailedOrderData?.statusLogs && detailedOrderData.statusLogs.length > 0 && (
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
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setDetailsModalOpen(false);
                    setSelectedOrder(null);
                    setDetailedOrderData(null);
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
