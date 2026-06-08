"use client";
import React, { useState, useEffect, useMemo } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";
import yarnPurchaseOrderService, { PurchaseOrderStatus } from "@/shared/services/yarnPurchaseOrderService";
import { YarnQcHistoryDrawer } from "./YarnQcHistoryDrawer";

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
    'po_rejected': 'rejected',
    'po_accepted': 'po_accepted',
    'po_accepted_partially': 'po_accepted_partially'
  };
  return statusMap[statusCode] || 'submitted to supplier';
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

const YarnQCPage = () => {
  const router = useRouter();
  const { hasSubPermission, isLoading } = useNavigation();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [sortField, setSortField] = useState<OrderSortField>("orderDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [showQcHistory, setShowQcHistory] = useState(false);
  
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
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch purchase orders with multiple statuses from API
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

      // Fetch orders with all required statuses
      const statusesToFetch = [
        'goods_partially_received',
        'goods_received',
        'qc_pending',
        'po_rejected',
        'po_accepted',
        'po_accepted_partially'
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

      // Filter orders to only show those with at least one lot having status "lot_qc_pending"
      const ordersWithQCPendingLots = uniqueOrders.filter((order) => {
        const receivedLotDetails = order.receivedLotDetails || [];
        return receivedLotDetails.some((lot: any) => lot.status === "lot_qc_pending");
      });
      
      const mappedOrders = ordersWithQCPendingLots.map(mapAPIOrderToComponent);
      setOrders(mappedOrders);
    } catch (error) {
      console.error('Failed to fetch purchase orders:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load purchase orders');
      setOrders([]);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Check permission
  const hasPermission = hasSubPermission('/yarn-management/purchase-management', 'Yarn QC');

  // Fetch orders on mount and when filters change
  useEffect(() => {
    if (hasPermission && !isLoading) {
      fetchPurchaseOrders();
    }
  }, [hasPermission, isLoading, startDate, endDate]);

  const filteredAndSortedOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = orders.filter(order => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        order.orderNumber.toLowerCase().includes(normalizedSearch) ||
        order.supplier.toLowerCase().includes(normalizedSearch);

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
      return <i className="ri-arrow-up-down-line text-gray-400 text-[10px]"></i>;
    }
    return sortDirection === "asc" ? (
      <i className="ri-arrow-up-line text-purple-600 text-[10px]"></i>
    ) : (
      <i className="ri-arrow-down-line text-purple-600 text-[10px]"></i>
    );
  };

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
      case 'po_accepted': return 'bg-green-100 text-green-800';
      case 'po_accepted_partially': return 'bg-cyan-100 text-cyan-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-lock-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500 mb-4">You don't have permission to access Yarn QC.</p>
          <Link href="/yarn-management/purchase-management" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Purchase Management
          </Link>
        </div>
      </div>
    );
  }

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

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredAndSortedOrders.slice(startIndex, endIndex);

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Yarn QC" />
      
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          {/* Header Section */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Yarn QC</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {filteredAndSortedOrders.length}
              </span>
            </div>

            <div className="flex flex-1 flex-wrap items-center justify-end gap-2 min-w-0">
              {/* Search Bar */}
              <div className="relative w-full min-w-[200px] max-w-md sm:w-auto sm:flex-1 sm:max-w-xs">
                <style dangerouslySetInnerHTML={{ __html: `
                  input.yarn-qc-search:focus {
                    border-width: 2px !important;
                    border-color: #4b5563 !important;
                    outline: none !important;
                    box-shadow: none !important;
                  }
                `}} />
                <input
                  type="text"
                  className="yarn-qc-search w-full bg-white border-2 border-gray-600 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:!border-2 focus:!border-gray-600 focus:outline-none placeholder:text-gray-600 transition-all font-medium"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
                <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs"></i>
              </div>

              {/* Show items per page */}
              <div className="relative group">
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 appearance-none cursor-pointer"
                >
                  <option value={10}>Show 10</option>
                  <option value={25}>Show 25</option>
                  <option value={50}>Show 50</option>
                  <option value={100}>Show 100</option>
                </select>
                <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none group-hover:text-gray-600 transition-colors"></i>
              </div>

              <button
                type="button"
                onClick={() => setShowQcHistory(true)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded border border-gray-300 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                aria-label="Open QC history"
              >
                <i className="ri-history-line text-sm text-purple-600" aria-hidden />
                QC History
              </button>
            </div>
          </div>

          {/* Date Filters Row */}
          <div className="flex items-center justify-between border-b border-gray-100 mb-4 pb-3">
            <div className="flex">
              <button className="px-3 py-2 border-b-2 border-transparent text-gray-800 text-[11px] font-bold relative group">
                All
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-t-full"></div>
              </button>
            </div>

            <div className="flex items-center gap-3 pr-2">
              <div className="flex items-center gap-1.5 bg-gray-50/50 px-2 py-1 rounded border border-gray-100 border-dashed">
                <i className="ri-calendar-line text-[10px] text-gray-400"></i>
                <input
                  type="date"
                  className="bg-transparent border-none text-[10px] font-bold text-gray-600 p-0 outline-none w-24 cursor-pointer"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                />
                <span className="text-gray-300 text-[10px]">~</span>
                <input
                  type="date"
                  className="bg-transparent border-none text-[10px] font-bold text-gray-600 p-0 outline-none w-24 cursor-pointer"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate(getDefaultStartDate());
                    setEndDate(getDefaultEndDate());
                    setCurrentPage(1);
                  }}
                  className="text-[9px] text-purple-400 hover:text-purple-600 font-bold uppercase transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto min-h-[300px]">
          {isLoadingOrders ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50"></div>
              <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading Data</p>
            </div>
          ) : filteredAndSortedOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-inbox-line text-xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">DATA EMPTY</h3>
            </div>
          ) : (
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50/30">
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 cursor-pointer hover:bg-gray-100" onClick={() => handleSort("orderNumber")}>
                    <div className="flex items-center gap-1">
                      PO Number
                      <SortIcon field="orderNumber" />
                    </div>
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 cursor-pointer hover:bg-gray-100" onClick={() => handleSort("supplier")}>
                    <div className="flex items-center gap-1">
                      Supplier
                      <SortIcon field="supplier" />
                    </div>
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 cursor-pointer hover:bg-gray-100" onClick={() => handleSort("orderDate")}>
                    <div className="flex items-center gap-1">
                      Order Date
                      <SortIcon field="orderDate" />
                    </div>
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 cursor-pointer hover:bg-gray-100" onClick={() => handleSort("expectedDelivery")}>
                    <div className="flex items-center gap-1">
                      Expected Delivery
                      <SortIcon field="expectedDelivery" />
                    </div>
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 cursor-pointer hover:bg-gray-100" onClick={() => handleSort("status")}>
                    <div className="flex items-center gap-1">
                      Status
                      <SortIcon field="status" />
                    </div>
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 cursor-pointer hover:bg-gray-100" onClick={() => handleSort("totalAmount")}>
                    <div className="flex items-center gap-1">
                      Total Amount
                      <SortIcon field="totalAmount" />
                    </div>
                  </th>
                  <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">
                      {order.orderNumber}
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-semibold text-gray-600 border border-gray-200">
                      {order.supplier}
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-400 border border-gray-200">
                      {new Date(order.orderDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-400 border border-gray-200">
                      {new Date(order.expectedDelivery).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-1.5 py-2.5 text-left border border-gray-200">
                      <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-800 border border-gray-200">
                      ₹{order.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                      <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => {
                            router.push(`/yarn-management/purchase-management/yarn-qc/process/${order.id}`);
                          }}
                          disabled={processingOrderId === order.id}
                          className="flex items-center gap-1 px-2 py-1 bg-purple-600 text-white text-[10px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Process QC"
                        >
                          {processingOrderId === order.id ? (
                            <>
                              <i className="ri-loader-4-line animate-spin text-xs"></i>
                              Processing...
                            </>
                          ) : (
                            <>
                              <i className="ri-box-3-line text-xs"></i>
                              Process
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Section */}
        <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white">
          <div className="text-[11px] font-medium text-[#495057] tracking-tight">
            Showing <span className="">{startIndex + 1} to {Math.min(endIndex, filteredAndSortedOrders.length)}</span> of <span className="">{filteredAndSortedOrders.length}</span> entries <span className="ml-1 opacity-50">→</span>
          </div>

          <div className="flex items-center">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>

            <div className="flex items-center gap-1 mx-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded transition-all ${currentPage === page
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'text-gray-400 hover:bg-gray-50'
                        }`}
                    >
                      {page}
                    </button>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} className="text-gray-300 text-[10px]">...</span>;
                }
                return null;
              })}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <YarnQcHistoryDrawer
        isOpen={showQcHistory}
        onClose={() => setShowQcHistory(false)}
      />
    </div>
  );
};

export default YarnQCPage;

