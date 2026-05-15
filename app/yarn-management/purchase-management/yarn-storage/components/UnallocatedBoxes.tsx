"use client";
import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import yarnPurchaseOrderService from "@/shared/services/yarnPurchaseOrderService";
import { PurchaseOrder } from "@/shared/services/yarnPurchaseOrderService";
import yarnBoxService, { YarnBox } from "@/shared/services/yarnBoxService";
import PurchaseOrderSelectDrawer from "@/shared/components/PurchaseOrderSelectDrawer";
import AllocateBoxDrawer from "./AllocateBoxDrawer";

interface UnallocatedBoxesProps {
  onBoxAllocate?: (orderId: string) => void;
}

/**
 * True when API reports net weight and cone count both exactly zero (fully used).
 * Missing fields are not treated as zero, so incomplete rows still show.
 * @param box - Yarn box from API
 */
function isZeroNetWeightAndCones(box: YarnBox): boolean {
  if (box.boxWeight == null || Number(box.boxWeight) !== 0) {
    return false;
  }
  const cones = box.numberOfCones ?? box.coneData?.numberOfCones;
  if (cones == null || Number(cones) !== 0) {
    return false;
  }
  return true;
}

/**
 * True when initial net weight was captured and net weight is now zero (fully used box).
 * @param box - Yarn box from API
 */
function isFullyUsedAfterInitialCaptureForUnallocated(box: YarnBox): boolean {
  const initialRaw = box.initialBoxWeight;
  const initial = initialRaw != null && initialRaw !== '' ? Number(initialRaw) : NaN;
  const w = Number(box.boxWeight ?? 0);
  return Number.isFinite(initial) && initial > 0 && Number.isFinite(w) && w <= 0;
}

/**
 * Eligible for “allocate to storage” on the unallocated list: not vendor-returned, not fully used
 * after initial capture, not net-zero weight with zero cones (nothing left to allocate).
 * Uses `isActiveForProcessing` when API sends it; otherwise mirrors vendor + fully-used rules.
 * @param box - Yarn box from API
 */
function isYarnBoxEligibleForUnallocatedStorage(box: YarnBox): boolean {
  const vendorReturn = (box as { returnedToVendorAt?: string | null }).returnedToVendorAt;
  if (vendorReturn != null && String(vendorReturn).trim() !== '') {
    return false;
  }
  if (isFullyUsedAfterInitialCaptureForUnallocated(box)) {
    return false;
  }
  if (isZeroNetWeightAndCones(box)) {
    return false;
  }
  if (typeof box.isActiveForProcessing === 'boolean') {
    return box.isActiveForProcessing;
  }
  return true;
}

/**
 * Formats a numeric weight field for kg display (treats 0 as valid).
 * @param value - Weight from API (`boxWeight` / `grossWeight` / `initialBoxWeight`)
 */
function formatWeightKg(value: number | undefined | null): string {
  const n = value == null ? NaN : Number(value);
  if (Number.isNaN(n)) {
    return "-";
  }
  return `${n} kg`;
}

/**
 * @param boxesData - Raw boxes for the PO
 * @param acceptedLotNumbers - Lots accepted on the PO receive flow
 */
function filterBoxesForUnallocatedAllocation(
  boxesData: YarnBox[],
  acceptedLotNumbers: string[]
): YarnBox[] {
  return boxesData.filter((box) => {
    const isUnallocated = box.storedStatus === false || box.storedStatus === undefined;
    const isFromAcceptedLot = Boolean(
      box.lotNumber && acceptedLotNumbers.includes(box.lotNumber)
    );
    return (
      isUnallocated &&
      isFromAcceptedLot &&
      isYarnBoxEligibleForUnallocatedStorage(box)
    );
  });
}

const UnallocatedBoxes: React.FC<UnallocatedBoxesProps> = ({
  onBoxAllocate,
}) => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPO, setSelectedPO] = useState<string>("");
  const [boxes, setBoxes] = useState<YarnBox[]>([]);
  const [isLoadingBoxes, setIsLoadingBoxes] = useState(false);
  const [allocatingBoxId, setAllocatingBoxId] = useState<string | null>(null);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [storageRackCode, setStorageRackCode] = useState("");
  const [isAllocating, setIsAllocating] = useState(false);

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
  const [poDrawerOpen, setPoDrawerOpen] = useState(false);

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

  // Fetch orders with multiple statuses
  const fetchUnallocatedOrders = useCallback(async () => {
    setIsLoading(true);
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
        'po_accepted',
        'po_accepted_partially',
        'goods_partially_received',
        'goods_received'
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
      
      // Map API response to component format
      const mappedOrders = uniqueOrders.map(mapAPIOrderToComponent);
      setOrders(mappedOrders);
    } catch (error) {
      console.error("Failed to fetch unallocated orders:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load unallocated orders"
      );
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchUnallocatedOrders();
  }, [fetchUnallocatedOrders]);

  // Fetch boxes when PO is selected
  useEffect(() => {
    const fetchBoxes = async () => {
      if (!selectedPO) {
        setBoxes([]);
        return;
      }

      setIsLoadingBoxes(true);
      try {
        // Find the selected order to get its ID
        const selectedOrder = orders.find(order => order.orderNumber === selectedPO);
        if (!selectedOrder) {
          toast.error("Selected purchase order not found");
          setBoxes([]);
          setIsLoadingBoxes(false);
          return;
        }

        // Fetch full order details to get receivedLotDetails
        const fullOrderDetails = await yarnPurchaseOrderService.getPurchaseOrderById(selectedOrder.id);
        
        // Get accepted lot numbers from receivedLotDetails
        const acceptedLotNumbers: string[] = [];
        if (fullOrderDetails && (fullOrderDetails as any).receivedLotDetails) {
          const receivedLotDetails = (fullOrderDetails as any).receivedLotDetails || [];
          acceptedLotNumbers.push(
            ...receivedLotDetails
              .filter((lot: any) => lot.status === 'lot_accepted')
              .map((lot: any) => lot.lotNumber)
          );
        }

        // If no accepted lots found, show no boxes
        if (acceptedLotNumbers.length === 0) {
          setBoxes([]);
          setIsLoadingBoxes(false);
          return;
        }

        // Fetch boxes for the selected PO
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

        setBoxes(filterBoxesForUnallocatedAllocation(boxesData, acceptedLotNumbers));
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
  }, [selectedPO, orders]);

  // Use all orders for the dropdown (no filtering needed)
  // Handle allocate button click
  const handleAllocateClick = (boxId: string) => {
    setAllocatingBoxId(boxId);
    setStorageRackCode("");
    setShowAllocateModal(true);
  };

  // Handle allocate confirmation
  const handleAllocateConfirm = async () => {
    if (!allocatingBoxId || !storageRackCode.trim()) {
      toast.error("Please enter a storage rack code");
      return;
    }

    setIsAllocating(true);
    try {
      // Get the box ID (_id or id)
      const box = boxes.find(
        (b) => (b._id || b.id || b.boxId) === allocatingBoxId
      );
      if (!box) {
        toast.error("Box not found");
        return;
      }

      const boxId = box._id || box.id;
      if (!boxId) {
        toast.error("Invalid box ID");
        return;
      }

      // Call PATCH API
      await yarnBoxService.updateYarnBox(boxId, {
        storageLocation: storageRackCode.trim(),
        storedStatus: true,
      });

      toast.success(
        `Box ${box.boxId || box.barcode} allocated to storage location ${storageRackCode}`
      );

      // Close modal and refresh boxes
      setShowAllocateModal(false);
      setAllocatingBoxId(null);
      setStorageRackCode("");

      // Find the selected order to get its ID
      const selectedOrder = orders.find(order => order.orderNumber === selectedPO);
      if (!selectedOrder) {
        toast.error("Selected purchase order not found");
        return;
      }

      // Fetch full order details to get receivedLotDetails
      const fullOrderDetails = await yarnPurchaseOrderService.getPurchaseOrderById(selectedOrder.id);
      
      // Get accepted lot numbers from receivedLotDetails
      const acceptedLotNumbers: string[] = [];
      if (fullOrderDetails && (fullOrderDetails as any).receivedLotDetails) {
        const receivedLotDetails = (fullOrderDetails as any).receivedLotDetails || [];
        acceptedLotNumbers.push(
          ...receivedLotDetails
            .filter((lot: any) => lot.status === 'lot_accepted')
            .map((lot: any) => lot.lotNumber)
        );
      }

      // Fetch boxes for the selected PO
      const response = await yarnBoxService.getYarnBoxes({
        po_number: selectedPO,
      });

      let boxesData: YarnBox[] = [];
      if (Array.isArray(response)) {
        boxesData = response;
      } else if (response && typeof response === 'object' && 'results' in response) {
        boxesData = (response as any).results || [];
      } else if (response && typeof response === 'object') {
        boxesData = [response as YarnBox];
      }

      setBoxes(filterBoxesForUnallocatedAllocation(boxesData, acceptedLotNumbers));
    } catch (error) {
      console.error("Failed to allocate box:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to allocate box to storage"
      );
    } finally {
      setIsAllocating(false);
    }
  };

  // Handle modal close
  const handleModalClose = () => {
    if (!isAllocating) {
      setShowAllocateModal(false);
      setAllocatingBoxId(null);
      setStorageRackCode("");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-xs font-bold text-gray-800">Unallocated Boxes</h3>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Purchase orders with PO Accepted, Partially Accepted, Goods Received, or Partially Received status — boxes from accepted lots only, excluding vendor-returned boxes, fully consumed boxes, and rows with net weight 0 and 0 cones
          </p>
        </div>
        <button
          onClick={fetchUnallocatedOrders}
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

        {/* PO Select — opens drawer for search + pick (handles 300+ POs) */}
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
            <>
              <button
                type="button"
                onClick={() => orders.length > 0 && setPoDrawerOpen(true)}
                disabled={orders.length === 0}
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300 text-left flex items-center justify-between gap-2 bg-white disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed hover:border-gray-300"
              >
                <span className="truncate">
                  {selectedPO
                    ? `${selectedPO}${orders.find((o) => o.orderNumber === selectedPO) ? ` · ${orders.find((o) => o.orderNumber === selectedPO)?.supplier}` : ""}`
                    : "-- Select a Purchase Order --"}
                </span>
                <i className="ri-arrow-right-s-line text-gray-400 shrink-0" />
              </button>
              {orders.length === 0 && (
                <p className="text-xs text-gray-500 mt-1.5">
                  No purchase orders found for the selected date range.
                </p>
              )}
            </>
          )}
        </div>
        <PurchaseOrderSelectDrawer
          isOpen={poDrawerOpen}
          onClose={() => setPoDrawerOpen(false)}
          orders={orders}
          selectedOrderNumber={selectedPO}
          onSelect={setSelectedPO}
          title="Select Purchase Order"
          emptyMessage="No purchase orders found for the selected date range."
        />

        {/* Boxes Table */}
        {selectedPO && (
          <div className="mt-4">
            <h4 className="text-xs font-bold text-gray-800 mb-3">
              Unallocated Boxes for PO: {selectedPO}
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
                  No Unallocated Boxes
                </h3>
                <p className="text-xs text-gray-500">
                  All boxes for this purchase order have been allocated to storage.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50/30">
                      <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Box ID</th>
                      <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Barcode</th>
                      <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Yarn Name</th>
                      <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Shade Code</th>
                      <th
                        scope="col"
                        className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200"
                        aria-label="Initial long-term net weight in kilograms when first stored in LT"
                      >
                        Initial LT weight (kg)
                      </th>
                      <th
                        scope="col"
                        className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200"
                      >
                        Net Weight (kg)
                      </th>
                      <th
                        scope="col"
                        className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200"
                      >
                        Gross Weight (kg)
                      </th>
                      <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Number of Cones</th>
                      <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Lot Number</th>
                      <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Received Date</th>
                      <th className="px-1.5 py-2 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
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
                          <td className="px-1.5 py-2 border border-gray-200 text-xs text-gray-900">
                            {box.yarnName || "-"}
                          </td>
                          <td className="px-1.5 py-2 border border-gray-200 text-xs text-gray-900">
                            {box.shadeCode || "-"}
                          </td>
                          <td className="px-1.5 py-2 border border-gray-200 text-xs text-gray-900">
                            {formatWeightKg(box.initialBoxWeight)}
                          </td>
                          <td className="px-1.5 py-2 border border-gray-200 text-xs text-gray-900">
                            {formatWeightKg(box.boxWeight)}
                          </td>
                          <td className="px-1.5 py-2 border border-gray-200 text-xs text-gray-900">
                            {formatWeightKg(box.grossWeight)}
                          </td>
                          <td className="px-1.5 py-2 border border-gray-200 text-xs text-gray-900">
                            {box.numberOfCones ?? "-"}
                          </td>
                          <td className="px-1.5 py-2 border border-gray-200 text-xs text-gray-900">
                            {box.lotNumber || "-"}
                          </td>
                          <td className="px-1.5 py-2 border border-gray-200 text-xs text-gray-900">
                            {box.receivedDate
                              ? new Date(box.receivedDate).toLocaleDateString()
                              : "-"}
                          </td>
                          <td className="px-1.5 py-2 text-right pr-[10px] border border-gray-200">
                            <button
                              onClick={() => handleAllocateClick(boxId)}
                              className="flex items-center gap-1 px-2 py-1 bg-purple-600 text-white text-[10px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
                              title="Allocate to storage"
                            >
                              <i className="ri-map-pin-line text-xs"></i>
                              Allocate
                            </button>
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

        <AllocateBoxDrawer
          isOpen={showAllocateModal}
          onClose={handleModalClose}
          rackCode={storageRackCode}
          onRackCodeChange={setStorageRackCode}
          onConfirm={handleAllocateConfirm}
          isAllocating={isAllocating}
        />

        {!selectedPO && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-3">
              <i className="ri-arrow-down-line text-3xl"></i>
            </div>
            <p className="text-xs text-gray-500">
              Please select a purchase order to view unallocated boxes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnallocatedBoxes;

