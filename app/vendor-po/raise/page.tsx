"use client";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import VendorPOPurchaseListLayout from "../purchase-management/components/VendorPOPurchaseListLayout";
import { VendorPacklistModal } from "../components/VendorPacklistModal";
import { VendorPODetailsDrawer } from "../components/VendorPODetailsDrawer";
import { mapVendorPurchaseOrderToUi, vendorPoUiStatusClass } from "../utils/vendorPoFlow";
import { VendorPO, VendorPOStatus, VendorPOPriority } from "./types";
import vendorPurchaseOrderService, { VendorPurchaseOrder } from "@/shared/services/vendorPurchaseOrderService";
import type { VendorPackListEntry } from "@/shared/services/vendorPurchaseOrderService";

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

const VendorPORaisePage = () => {
  const { hasSubPermission, isLoading: permLoading } = useNavigation();
  const canAccess = hasSubPermission("/vendor-po", "Vendor PO Raise");
  const [orders, setOrders] = useState<VendorPO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [vendorFilter, setVendorFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(getDefaultStartDate());
  const [endDate, setEndDate] = useState<string>(getDefaultEndDate());
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<VendorPO | null>(null);
  const [packlistFor, setPacklistFor] = useState<VendorPurchaseOrder | null>(null);
  const [packlistSubmitting, setPacklistSubmitting] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await vendorPurchaseOrderService.list({
        page: 1,
        limit: 500,
        sortBy: "createdAt:desc",
        populate: "vendor,poItems.productId",
      });
      setOrders((response.results || []).map(mapVendorPurchaseOrderToUi));
    } catch (error: any) {
      toast.error(error?.message || "Failed to load vendor purchase orders");
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
      const matchesSearch =
        !searchTerm ||
        order.poNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.articleSummary && order.articleSummary.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = !statusFilter || order.status === statusFilter;
      const matchesPriority = !priorityFilter || order.priority === priorityFilter;
      const matchesVendor = !vendorFilter || order.vendorId === vendorFilter || order.vendorName === vendorFilter;
      return matchesSearch && matchesStatus && matchesPriority && matchesVendor;
    });
  }, [orders, searchTerm, statusFilter, priorityFilter, vendorFilter]);

  const uniqueVendors = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach((o) => map.set(o.vendorId, o.vendorName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [orders]);

  const handlePacklistSubmit = async (entries: VendorPackListEntry[]) => {
    if (!packlistFor) return;
    setPacklistSubmitting(true);
    try {
      const preserveLots =
        packlistFor.currentStatus === "goods_partially_received" && packlistFor.receivedLotDetails?.length
          ? { receivedLotDetails: packlistFor.receivedLotDetails }
          : {};
      await vendorPurchaseOrderService.update(packlistFor.id, {
        packListDetails: entries,
        ...(packlistFor.currentStatus === "submitted_to_vendor" ? { currentStatus: "in_transit" as const } : {}),
        ...preserveLots,
      });
      const n = entries.length;
      toast.success(
        packlistFor.currentStatus === "submitted_to_vendor"
          ? `PO updated with ${n} packlist ${n === 1 ? "entry" : "entries"} — marked in transit`
          : `Packlist updated (${n} ${n === 1 ? "entry" : "entries"})`
      );
      setPacklistFor(null);
      await loadOrders();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to update PO");
    } finally {
      setPacklistSubmitting(false);
    }
  };

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
        <Seo title="Purchase Order" />
        <div className="box">
          <div className="box-body text-center py-12">
            <p className="text-gray-500 mb-4">You don&apos;t have permission to access Purchase Order.</p>
            <Link href="/vendor-po/purchase-management" className="ti-btn ti-btn-primary ti-btn-sm">
              Back to Purchase Management
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const selectCls =
    "bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-2 py-1.5 pr-7 focus:ring-0 focus:border-gray-300 appearance-none cursor-pointer max-w-[140px]";

  return (
    <>
      <Seo title="Purchase Order" />
      <VendorPOPurchaseListLayout
        listTitle="Purchase Order"
        count={loading ? 0 : filteredOrders.length}
        searchPlaceholder="Search PO, vendor, article…"
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
          <Link
            href="/vendor-po/purchase-management/purchase/add"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
          >
            <i className="ri-add-line text-xs" />
            New Order
          </Link>
        }
        filterSlot={
          <>
            <select
              className={selectCls}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Status</option>
              <option value="Submitted to vendor">Submitted to vendor</option>
              <option value="In transit">In transit</option>
              <option value="Goods partially received">Goods partially received</option>
              <option value="Goods received">Goods received</option>
              <option value="QC pending">QC pending</option>
              <option value="Rejected">Rejected</option>
            </select>
            <select
              className={selectCls}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="">Priority</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <select
              className={selectCls}
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
            >
              <option value="">Vendor</option>
              {uniqueVendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
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
        {loading ? (
          <div className="py-16 text-center text-gray-500 text-sm">Loading purchase orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <i className="ri-inbox-line text-xl text-gray-200" />
            </div>
            <h3 className="text-xs font-bold text-gray-400 mb-1">DATA EMPTY</h3>
            <p className="text-[11px] text-gray-500 mb-4 max-w-md">
              {searchTerm || statusFilter || priorityFilter || vendorFilter
                ? "No orders match your filters."
                : "No vendor purchase orders for this range."}
            </p>
            <Link
              href="/vendor-po/purchase-management/purchase/add"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700"
            >
              <i className="ri-add-line text-xs" />
              New Order
            </Link>
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
                  Vendor
                </th>
                <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Priority
                </th>
                <th className="px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Total Qty
                </th>
                <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Status
                </th>
                <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">{order.poNo}</td>
                  <td className="px-1.5 py-2.5 text-[12px] text-gray-600 border border-gray-200">
                    {new Date(order.poDate).toLocaleDateString()}
                  </td>
                  <td className="px-1.5 py-2.5 text-[12px] text-gray-700 border border-gray-200">{order.vendorName}</td>
                  <td className="px-1.5 py-2.5 border border-gray-200">
                    <span
                      className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full ${getPriorityColor(order.priority)}`}
                    >
                      {order.priority}
                    </span>
                  </td>
                  <td className="px-1.5 py-2.5 text-[12px] text-gray-900 text-right border border-gray-200">
                    {order.totalQty.toLocaleString()}
                  </td>
                  <td className="px-1.5 py-2.5 border border-gray-200">
                    <span
                      className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full ${vendorPoUiStatusClass(order.status)}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-1.5 py-2.5 text-right border border-gray-200">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOrder(order);
                          setDetailsModalOpen(true);
                        }}
                        className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-400 border border-blue-100 rounded hover:bg-blue-100 transition-colors"
                        title="View details"
                      >
                        <i className="ri-eye-line text-xs" />
                      </button>
                      {order.status === "Submitted to vendor" && (
                        <Link
                          href={`/vendor-po/purchase-management/purchase/edit/${order.id}`}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="Edit"
                        >
                          <i className="ri-edit-line text-base" />
                        </Link>
                      )}
                      {(order.status === "Submitted to vendor" ||
                        order.status === "Goods partially received" ||
                        order.status === "In transit") &&
                        order.rawPurchaseOrder && (
                          <button
                            type="button"
                            onClick={() => setPacklistFor(order.rawPurchaseOrder!)}
                            className="h-7 px-2 text-[9px] font-bold bg-white text-purple-600 border border-purple-200 rounded hover:bg-purple-50 transition-colors uppercase shadow-sm"
                            title={
                              order.status === "Submitted to vendor"
                                ? "Packlist — mark in transit"
                                : "Add or update packlist entries"
                            }
                          >
                            Mark in transit
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </VendorPOPurchaseListLayout>

      <VendorPODetailsDrawer
        isOpen={detailsModalOpen && !!selectedOrder}
        summary={selectedOrder}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedOrder(null);
        }}
      />

      <VendorPacklistModal
        isOpen={!!packlistFor}
        purchaseOrder={packlistFor}
        existingPacklistData={packlistFor?.packListDetails ?? null}
        onClose={() => setPacklistFor(null)}
        onSubmit={handlePacklistSubmit}
        isSubmitting={packlistSubmitting}
      />
    </>
  );
};

export default VendorPORaisePage;
