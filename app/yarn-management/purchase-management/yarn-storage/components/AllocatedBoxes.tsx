"use client";
import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import yarnPurchaseOrderService from "@/shared/services/yarnPurchaseOrderService";
import { PurchaseOrder } from "@/shared/services/yarnPurchaseOrderService";
import yarnBoxService, { YarnBox } from "@/shared/services/yarnBoxService";

interface AllocatedBoxesProps {
  onBoxView?: (boxId: string) => void;
}

const AllocatedBoxes: React.FC<AllocatedBoxesProps> = ({
  onBoxView,
}) => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPO, setSelectedPO] = useState<string>("");
  const [boxes, setBoxes] = useState<YarnBox[]>([]);
  const [isLoadingBoxes, setIsLoadingBoxes] = useState(false);

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

  // Helper function to convert API status code to display format
  const convertStatusFromAPI = (statusCode: string): string => {
    const statusMap: Record<string, string> = {
      submitted_to_supplier: "submitted to supplier",
      in_transit: "in transit",
      delivered: "delivered",
      rejected: "rejected",
      qc_pending: "QC pending",
      partially_delivered: "partially delivered",
      stocked: "stocked",
      po_accepted: "PO Accepted",
      po_rejected: "PO Rejected",
    };
    return statusMap[statusCode] || statusCode;
  };

  // Map API response to component format
  const mapAPIOrderToComponent = (apiOrder: any): PurchaseOrder => {
    const poItems = apiOrder.poItems || apiOrder.items || apiOrder.orderItems || [];

    const latestDeliveryDate =
      poItems.length > 0
        ? poItems.reduce((latest: string, item: any) => {
            const itemDate =
              item.estimatedDeliveryDate || item.estimated_delivery_date;
            return itemDate && (!latest || new Date(itemDate) > new Date(latest))
              ? itemDate
              : latest;
          }, "")
        : new Date().toISOString();

    return {
      id: apiOrder._id || apiOrder.id || "",
      orderNumber:
        apiOrder.poNumber ||
        apiOrder.orderNumber ||
        apiOrder.order_number ||
        apiOrder.po_number ||
        "",
      supplier:
        apiOrder.supplierName ||
        apiOrder.supplier?.brandName ||
        apiOrder.supplier?.name ||
        apiOrder.supplier ||
        "",
      supplierId:
        apiOrder.supplier?._id ||
        apiOrder.supplier?.id ||
        apiOrder.supplierId ||
        apiOrder.supplier_id ||
        "",
      orderDate:
        apiOrder.createDate ||
        apiOrder.orderDate ||
        apiOrder.order_date ||
        apiOrder.createdAt ||
        new Date().toISOString(),
      expectedDelivery:
        latestDeliveryDate ||
        apiOrder.expectedDelivery ||
        apiOrder.expected_delivery ||
        new Date().toISOString(),
      status: (apiOrder.currentStatus ||
        apiOrder.status ||
        apiOrder.status_code ||
        "po_accepted") as PurchaseOrder["status"],
      totalAmount:
        apiOrder.total ||
        apiOrder.totalAmount ||
        apiOrder.total_amount ||
        apiOrder.grandTotal ||
        0,
      subTotal:
        apiOrder.subTotal ||
        apiOrder.sub_total ||
        apiOrder.subtotal ||
        0,
      totalGst:
        apiOrder.gst ||
        apiOrder.totalGst ||
        apiOrder.total_gst ||
        apiOrder.gstAmount ||
        0,
      items: poItems.map((item: any) => ({
        id: item._id || item.id || "",
        yarnName:
          item.yarnName ||
          item.yarn?.yarnName ||
          item.yarn_name ||
          item.yarn?.name ||
          "",
        sizeCount: item.sizeCount || item.size_count || item.countSize || "",
        shadeCode: item.shadeCode || item.shade_code || item.shade || "",
        quantity: item.quantity || 0,
        rate: item.rate || item.unitPrice || 0,
        gst: item.gstRate || item.gst || item.gst_rate || 18,
        subTotal:
          item.subTotal ||
          item.sub_total ||
          item.quantity * (item.rate || 0) ||
          0,
        estimatedDeliveryDate:
          item.estimatedDeliveryDate ||
          item.estimated_delivery_date ||
          item.expectedDelivery ||
          "",
      })),
      notes: apiOrder.notes || apiOrder.remarks || "",
      createdAt:
        apiOrder.createDate ||
        apiOrder.createdAt ||
        apiOrder.created_at ||
        new Date().toISOString(),
      updatedAt:
        apiOrder.lastUpdateDate ||
        apiOrder.updatedAt ||
        apiOrder.updated_at ||
        new Date().toISOString(),
    };
  };

  // Fetch PO accepted orders
  const fetchAllocatedOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {
        status_code: "po_accepted",
      };

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

      const response = await yarnPurchaseOrderService.getPurchaseOrders(params);

      // Handle both array and object with results property
      const ordersData = Array.isArray(response)
        ? response
        : response.results || [];
      
      // Map API response to component format
      const mappedOrders = ordersData.map(mapAPIOrderToComponent);
      setOrders(mappedOrders);
    } catch (error) {
      console.error("Failed to fetch allocated orders:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load allocated orders"
      );
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchAllocatedOrders();
  }, [fetchAllocatedOrders]);

  // Fetch boxes when PO is selected
  useEffect(() => {
    const fetchBoxes = async () => {
      if (!selectedPO) {
        setBoxes([]);
        return;
      }

      setIsLoadingBoxes(true);
      try {
        const response = await yarnBoxService.getYarnBoxes({
          po_number: selectedPO,
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

        // Filter boxes where storedStatus is true
        const allocatedBoxes = boxesData.filter(
          (box: any) => box.storedStatus === true
        );

        setBoxes(allocatedBoxes);
      } catch (error) {
        console.error("Failed to fetch boxes:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load boxes"
        );
        setBoxes([]);
      } finally {
        setIsLoadingBoxes(false);
      }
    };

    fetchBoxes();
  }, [selectedPO]);

  // Use all orders for the dropdown (no filtering needed)
  const filteredOrders = orders;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-xs font-bold text-gray-800">Allocated Boxes</h3>
          <p className="text-[10px] text-gray-500 mt-0.5">
            View boxes that have been allocated to storage racks
          </p>
        </div>
        <button
          onClick={fetchAllocatedOrders}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 border border-gray-200 text-[11px] font-bold rounded hover:bg-gray-50 transition-colors shadow-sm"
          title="Refresh"
        >
          <i className="ri-refresh-line text-xs"></i>
          Refresh
        </button>
      </div>

      <div>
        {/* Date Filters */}
        <div className="mb-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] font-medium text-gray-600 mb-0.5 block">Start Date</label>
              <input
                type="date"
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-medium text-gray-600 mb-0.5 block">End Date</label>
              <input
                type="date"
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            {(startDate || endDate) && (
              <button
                className="flex items-center gap-1 px-2 py-1.5 bg-white text-gray-700 border border-gray-200 text-[11px] font-bold rounded hover:bg-gray-50 transition-colors shadow-sm self-end"
                onClick={() => {
                  setStartDate(getDefaultStartDate());
                  setEndDate(getDefaultEndDate());
                }}
                title="Reset to default dates"
              >
                <i className="ri-refresh-line text-xs"></i>
                Reset
              </button>
            )}
          </div>
        </div>

        {/* PO Select Dropdown */}
        <div className="mb-4">
          <label className="text-xs font-medium text-gray-700 mb-1.5 block">
            Select Purchase Order
          </label>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
              <span className="text-xs text-gray-600">Loading orders...</span>
            </div>
          ) : (
            <select
              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
              value={selectedPO}
              onChange={(e) => setSelectedPO(e.target.value)}
            >
              <option value="">-- Select a Purchase Order --</option>
              {filteredOrders.map((order) => (
                <option key={order.id} value={order.orderNumber}>
                  {order.orderNumber} - {order.supplier} (₹{order.totalAmount.toLocaleString()})
                </option>
              ))}
            </select>
          )}
          {filteredOrders.length === 0 && !isLoading && (
            <p className="text-xs text-gray-500 mt-1.5">
              No purchase orders with PO Accepted status found for the selected date range.
            </p>
          )}
        </div>

        {/* Boxes Table */}
        {selectedPO && (
          <div className="mt-4">
            <h4 className="text-xs font-bold text-gray-800 mb-3">
              Allocated Boxes for PO: {selectedPO}
            </h4>
            {isLoadingBoxes ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3"></div>
                <p className="text-xs text-gray-600">Loading boxes...</p>
              </div>
            ) : boxes.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-3">
                  <i className="ri-inbox-line text-3xl"></i>
                </div>
                <h3 className="text-xs font-bold text-gray-900 mb-1">
                  No Allocated Boxes
                </h3>
                <p className="text-xs text-gray-500">
                  No boxes have been allocated to storage for this purchase order.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50/30">
                      <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Box ID</th>
                      <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Barcode</th>
                      <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Storage Location</th>
                      <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Yarn Name</th>
                      <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Shade Code</th>
                      <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Box Weight (kg)</th>
                      <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Number of Cones</th>
                      <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Order Qty</th>
                      <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Lot Number</th>
                      <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Received Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boxes.map((box) => {
                      const boxId = box._id || box.id || box.boxId;
                      return (
                        <tr key={boxId} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-1.5 py-2 border border-gray-200 text-xs font-medium text-gray-900">
                            {box.boxId}
                          </td>
                          <td className="px-1.5 py-2 border border-gray-200 text-xs text-gray-900 font-mono">
                            {box.barcode}
                          </td>
                          <td className="px-1.5 py-2 border border-gray-200">
                            <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-green-100 text-green-800">
                              {box.storageLocation || "-"}
                            </span>
                          </td>
                          <td className="px-1.5 py-2 border border-gray-200 text-xs text-gray-900">
                            {box.yarnName || "-"}
                          </td>
                          <td className="px-1.5 py-2 border border-gray-200 text-xs text-gray-900">
                            {box.shadeCode || "-"}
                          </td>
                          <td className="px-1.5 py-2 border border-gray-200 text-xs text-gray-900">
                            {box.boxWeight ? `${box.boxWeight} kg` : "-"}
                          </td>
                          <td className="px-1.5 py-2 border border-gray-200 text-xs text-gray-900">
                            {box.numberOfCones || "-"}
                          </td>
                          <td className="px-1.5 py-2 border border-gray-200 text-xs text-gray-900">
                            {box.orderQty || "-"}
                          </td>
                          <td className="px-1.5 py-2 border border-gray-200 text-xs text-gray-900">
                            {box.lotNumber || "-"}
                          </td>
                          <td className="px-1.5 py-2 border border-gray-200 text-xs text-gray-900">
                            {box.receivedDate
                              ? new Date(box.receivedDate).toLocaleDateString()
                              : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {!selectedPO && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-3">
              <i className="ri-arrow-down-line text-3xl"></i>
            </div>
            <p className="text-xs text-gray-500">
              Please select a purchase order to view allocated boxes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllocatedBoxes;


