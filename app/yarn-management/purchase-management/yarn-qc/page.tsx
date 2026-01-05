"use client";
import React, { useState, useEffect, useMemo } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";
import yarnPurchaseOrderService, { PurchaseOrderStatus } from "@/shared/services/yarnPurchaseOrderService";

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
      return <i className="ri-arrow-up-down-line text-gray-400"></i>;
    }
    return sortDirection === "asc" ? (
      <i className="ri-arrow-up-line text-primary"></i>
    ) : (
      <i className="ri-arrow-down-line text-primary"></i>
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

  return (
    <div className="main-content">
      <Seo title="Yarn QC" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Yarn QC</h1>
                <p className="text-gray-600 mt-1">Quality control for yarn purchases - Orders pending QC, received, and QC processed</p>
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

          {/* QC Orders Table */}
          <div className="box">
            <div className="box-header">
              <h3 className="box-title">QC Orders ({filteredAndSortedOrders.length})</h3>
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No QC Orders Found</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm
                      ? "No orders match your search criteria. Try adjusting your search term."
                      : "No purchase orders found with QC pending, received, or processed statuses for the selected period."}
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
                      {filteredAndSortedOrders.map((order) => (
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
                            <button
                              type="button"
                              onClick={() => {
                                router.push(`/yarn-management/purchase-management/yarn-qc/process/${order.id}`);
                              }}
                              disabled={processingOrderId === order.id}
                              className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:border-primary hover:text-primary transition h-8 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Process QC"
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
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YarnQCPage;

