"use client";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import VendorPOPurchaseListLayout from "../purchase-management/components/VendorPOPurchaseListLayout";
import { VendorGoodsReceivedModal } from "../components/VendorGoodsReceivedModal";
import { VendorPODetailsDrawer } from "../components/VendorPODetailsDrawer";
import { lotDetailsForBulkBoxes, mapVendorPurchaseOrderToUi, vendorPoUiStatusClass } from "../utils/vendorPoFlow";
import { vendorPoMatchesDateRange, vendorReceiveRowSummary } from "./receivePageUtils";
import { VendorPO, VendorPOStatus, VendorPOPriority } from "../raise/types";
import vendorPurchaseOrderService, { VendorPurchaseOrder } from "@/shared/services/vendorPurchaseOrderService";
import vendorBoxService from "@/shared/services/vendorBoxService";

const getDefaultStartDate = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return date.toISOString().split("T")[0];
};
const getDefaultEndDate = () => new Date().toISOString().split("T")[0];

const getPriorityColor = (priority: VendorPOPriority) => {
  switch (priority) {
    case "Urgent":
      return "bg-red-100 text-red-800";
    case "High":
      return "bg-orange-100 text-orange-800";
    case "Medium":
      return "bg-yellow-100 text-yellow-800";
    case "Low":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

/** Filters aligned with yarn PO Received (in transit → receipt → process). */
const RECEIVE_STATUS_OPTIONS: { value: "" | "Pending" | VendorPOStatus; label: string }[] = [
  { value: "", label: "All" },
  { value: "Pending", label: "In transit (pending receipt)" },
  { value: "In transit", label: "In transit" },
  { value: "Goods partially received", label: "Goods partially received" },
  { value: "Goods received", label: "Goods received" },
];

async function fetchInboundPurchaseOrders(): Promise<VendorPurchaseOrder[]> {
  const base = {
    page: 1,
    limit: 500,
    sortBy: "createdAt:desc" as const,
    populate: "vendor,poItems.productId",
  };
  const [a, b, c] = await Promise.all([
    vendorPurchaseOrderService.list({ ...base, currentStatus: "in_transit" }),
    vendorPurchaseOrderService.list({ ...base, currentStatus: "goods_partially_received" }),
    vendorPurchaseOrderService.list({ ...base, currentStatus: "goods_received" }),
  ]);
  const merged = new Map<string, VendorPurchaseOrder>();
  for (const res of [a, b, c]) {
    for (const po of res.results || []) {
      merged.set(po.id, po);
    }
  }
  return Array.from(merged.values());
}

const VendorPOReceivePage = () => {
  const router = useRouter();
  const { hasSubPermission, isLoading: permLoading } = useNavigation();
  const canAccess = hasSubPermission("/vendor-po", "Vendor PO Receive");
  const [orders, setOrders] = useState<VendorPO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "Pending" | VendorPOStatus>("");
  const [startDate, setStartDate] = useState<string>(getDefaultStartDate());
  const [endDate, setEndDate] = useState<string>(getDefaultEndDate());
  const [goodsModalPo, setGoodsModalPo] = useState<VendorPurchaseOrder | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [detailsOrder, setDetailsOrder] = useState<VendorPO | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await fetchInboundPurchaseOrders();
      setOrders(raw.map(mapVendorPurchaseOrderToUi));
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (!vendorPoMatchesDateRange(order, startDate, endDate)) return false;
      const matchesSearch =
        !searchTerm ||
        order.poNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.vendorName.toLowerCase().includes(searchTerm.toLowerCase());
      const pendingQty = order.totalQty - (order.receivedQty ?? 0);
      const isInboundPending =
        order.apiStatus === "in_transit" && pendingQty === order.totalQty && order.totalQty > 0;
      const matchesStatus =
        !statusFilter ||
        (statusFilter === "Pending" && isInboundPending) ||
        (statusFilter !== "Pending" && order.status === statusFilter);
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter, startDate, endDate]);

  const canOpenGoodsReceived = (order: VendorPO) => {
    const pending = order.totalQty - (order.receivedQty ?? 0);
    if (pending <= 0) return false;
    const a = order.apiStatus;
    return a === "in_transit" || a === "goods_partially_received" || (a === "goods_received" && pending > 0);
  };

  const canProcess = (order: VendorPO) => {
    const a = order.apiStatus;
    if (a !== "goods_partially_received" && a !== "goods_received") return false;
    const lots = order.rawPurchaseOrder?.receivedLotDetails;
    return !!(lots && lots.some((l) => l.lotNumber?.trim() && Number(l.numberOfBoxes) > 0));
  };

  const processPath = (orderId: string) => `/vendor-po/purchase-management/purchase-order-received/process/${orderId}`;

  const handleProcess = async (order: VendorPO) => {
    const raw = order.rawPurchaseOrder;
    if (!raw) {
      toast.error("Missing PO data");
      return;
    }
    const lots = raw.receivedLotDetails;
    if (!lots?.length) {
      toast.error("Record goods received (with lot details) before processing.");
      return;
    }
    setProcessingId(order.id);
    try {
      const full = await vendorPurchaseOrderService.getById(order.id);
      const lotDetails = lotDetailsForBulkBoxes(full.vpoNumber, full.receivedLotDetails);
      if (lotDetails.length === 0) {
        toast.error("No valid lots (lot number + number of boxes).");
        return;
      }
      const existing = await vendorBoxService.list({
        vpoNumber: full.vpoNumber,
        page: 1,
        limit: 500,
      });
      const existingCount = Array.isArray(existing)
        ? existing.length
        : (existing as { results?: unknown[] }).results?.length ?? 0;
      if (existingCount === 0) {
        await vendorBoxService.bulkCreate({
          vpoNumber: full.vpoNumber,
          lotDetails,
        });
        const totalBoxes = lotDetails.reduce((s, l) => s + l.numberOfBoxes, 0);
        toast.success(`${totalBoxes} box(es) created`);
      } else {
        toast.success("Boxes already exist for this PO");
      }
      router.push(processPath(order.id));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to start process");
    } finally {
      setProcessingId(null);
    }
  };

  const goodsReceivable = useMemo(
    () => filteredOrders.filter(canOpenGoodsReceived),
    [filteredOrders]
  );

  const handleReceiveAgainstPO = () => {
    if (goodsReceivable.length === 0) return;
    if (goodsReceivable.length === 1) {
      const raw = goodsReceivable[0].rawPurchaseOrder;
      if (raw) setGoodsModalPo(raw);
      return;
    }
    document.getElementById("receive-table")?.scrollIntoView({ behavior: "smooth" });
  };

  const selectCls =
    "bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-2 py-1.5 pr-7 focus:ring-0 focus:border-gray-300 appearance-none cursor-pointer max-w-[200px]";

  if (permLoading) {
    return (
      <div className="main-content flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="main-content">
        <Seo title="Purchase Order Received" />
        <div className="box">
          <div className="box-body text-center py-12">
            <p className="text-gray-500 mb-4">You don&apos;t have permission to access Purchase Order Received.</p>
            <Link href="/vendor-po/purchase-management" className="ti-btn ti-btn-primary ti-btn-sm">
              Back to Purchase Management
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Seo title="Purchase Order Received" />
      <VendorPOPurchaseListLayout
        listTitle="Purchase Order Received"
        count={loading ? 0 : filteredOrders.length}
        searchPlaceholder="Search PO or vendor…"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onClearDates={() => {
          setStartDate(getDefaultStartDate());
          setEndDate(getDefaultEndDate());
        }}
        headerActions={
          <button
            type="button"
            onClick={handleReceiveAgainstPO}
            disabled={goodsReceivable.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              goodsReceivable.length === 0
                ? "No POs with pending quantity to receive"
                : goodsReceivable.length === 1
                  ? `Goods received — ${goodsReceivable[0].poNo}`
                  : "Scroll to table to choose a PO"
            }
          >
            <i className="ri-inbox-archive-line text-xs" />
            Goods received
          </button>
        }
        filterSlot={
          <>
            <select
              className={selectCls}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "" | "Pending" | VendorPOStatus)}
            >
              {RECEIVE_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white text-gray-600 text-[10px] font-bold rounded border border-gray-200 hover:border-purple-300"
            >
              <i className="ri-download-line text-xs" />
              Export
            </button>
          </>
        }
      >
        <div id="receive-table">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
              <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading Data</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-inbox-line text-xl text-gray-200" />
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">DATA EMPTY</h3>
              <p className="text-[11px] text-gray-500 max-w-md">
                {searchTerm || statusFilter
                  ? "No orders match your criteria."
                  : "No POs in transit or with receipt activity."}
              </p>
            </div>
          ) : (
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50/30">
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    PO No
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    PO Date
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Est. delivery
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Vendor
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Status
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Priority
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Summary
                  </th>
                  <th className="px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Ordered
                  </th>
                  <th className="px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Pending
                  </th>
                  <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const pendingQty = order.totalQty - (order.receivedQty ?? 0);
                  const goodsDisabled = !canOpenGoodsReceived(order);
                  const processDisabled = !canProcess(order);
                  const sum = vendorReceiveRowSummary(order);
                  const est = order.estimatedOrderDeliveryDate;
                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-gray-50/50 transition-colors ${
                        detailsOpen && detailsOrder?.id === order.id ? "!bg-primary/5" : ""
                      }`}
                    >
                      <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">
                        {order.poNo}
                      </td>
                      <td className="px-1.5 py-2.5 text-[12px] text-gray-600 border border-gray-200">
                        {order.poDate
                          ? new Date(order.poDate).toLocaleDateString(undefined, {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-1.5 py-2.5 text-[12px] text-gray-600 border border-gray-200">
                        {est
                          ? new Date(est).toLocaleDateString(undefined, {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-1.5 py-2.5 text-[12px] text-gray-700 border border-gray-200">{order.vendorName}</td>
                      <td className="px-1.5 py-2.5 border border-gray-200">
                        <span
                          className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full ${vendorPoUiStatusClass(order.status)}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-200">
                        <span
                          className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full ${getPriorityColor(order.priority)}`}
                        >
                          {order.priority}
                        </span>
                      </td>
                      <td className="px-1.5 py-2.5 border border-gray-200">
                        <div className="flex flex-col gap-0.5 min-w-[7rem]">
                          <div className="text-[12px] font-bold text-gray-800">
                            ₹{sum.total.toLocaleString()}
                          </div>
                          {sum.received > 0 && (
                            <div className="text-[10px] font-medium text-gray-500">
                              Rec: {sum.received.toLocaleString()} pcs
                            </div>
                          )}
                          {sum.ordered > 0 && (
                            <div className="text-[10px] font-medium text-gray-500">
                              Ord: {sum.ordered.toLocaleString()} pcs
                            </div>
                          )}
                          {(sum.pending > 0 || (sum.ordered > 0 && sum.received === 0)) && (
                            <div
                              className={`text-[10px] font-medium ${
                                sum.pending > 0 ? "text-orange-600" : "text-green-600"
                              }`}
                            >
                              Pending: {sum.pending.toLocaleString()} pcs
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-1.5 py-2.5 text-[12px] text-gray-900 text-right border border-gray-200">
                        {order.totalQty.toLocaleString()}
                      </td>
                      <td className="px-1.5 py-2.5 text-[12px] text-gray-900 text-right border border-gray-200">
                        {pendingQty.toLocaleString()}
                      </td>
                      <td className="px-1.5 py-2.5 text-right border border-gray-200">
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setDetailsOrder(order);
                              setDetailsOpen(true);
                            }}
                            className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-400 border border-blue-100 rounded hover:bg-blue-100 transition-colors shrink-0"
                            title="View details"
                          >
                            <i className="ri-eye-line text-xs" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const raw = order.rawPurchaseOrder;
                              if (raw) setGoodsModalPo(raw);
                            }}
                            disabled={goodsDisabled}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-600 text-white text-[10px] font-bold rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={goodsDisabled ? "Nothing pending to receive" : "Record goods received (lot + qty)"}
                          >
                            <i className="ri-checkbox-circle-line text-xs" />
                            Goods received
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleProcess(order)}
                            disabled={processDisabled || processingId === order.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white text-gray-700 text-[10px] font-bold rounded border border-gray-200 hover:border-purple-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={
                              processDisabled
                                ? "Complete goods receipt with lot/boxes first"
                                : "Create boxes (if needed) and open process"
                            }
                          >
                            {processingId === order.id ? (
                              <i className="ri-loader-4-line animate-spin text-xs" />
                            ) : (
                              <i className="ri-box-3-line text-xs" />
                            )}
                            Process
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </VendorPOPurchaseListLayout>

      <VendorGoodsReceivedModal
        isOpen={!!goodsModalPo}
        purchaseOrder={goodsModalPo}
        onClose={() => setGoodsModalPo(null)}
        onSaved={() => void loadOrders()}
      />

      <VendorPODetailsDrawer
        isOpen={detailsOpen && !!detailsOrder}
        summary={detailsOrder}
        onClose={() => {
          setDetailsOpen(false);
          setDetailsOrder(null);
        }}
      />
    </>
  );
};

export default VendorPOReceivePage;
