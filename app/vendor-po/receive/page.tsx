"use client";
import React, { useState, useMemo, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { VendorPO, VendorPOStatus, VendorPOPriority } from "../raise/types";
import { getStoredOrders } from "../raise/data";
import { MOCK_VENDOR_POS } from "../raise/data";

const getDefaultStartDate = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return date.toISOString().split("T")[0];
};
const getDefaultEndDate = () => new Date().toISOString().split("T")[0];

const getStatusColor = (status: VendorPOStatus) => {
  switch (status) {
    case "Draft":
      return "bg-gray-100 text-gray-800";
    case "Approved":
      return "bg-blue-100 text-blue-800";
    case "Partially Received":
      return "bg-orange-100 text-orange-800";
    case "Fully Received":
      return "bg-green-100 text-green-800";
    case "Closed":
      return "bg-slate-100 text-slate-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

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

/** Pending = Approved with no receive yet; show as "Pending" in filter */
const RECEIVE_STATUS_OPTIONS: { value: "" | "Pending" | VendorPOStatus; label: string }[] = [
  { value: "", label: "All" },
  { value: "Pending", label: "Pending" },
  { value: "Partially Received", label: "Partially Received" },
  { value: "Fully Received", label: "Fully Received" },
];

const VendorPOReceivePage = () => {
  const router = useRouter();
  const [orders, setOrders] = useState<VendorPO[]>(MOCK_VENDOR_POS);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "Pending" | VendorPOStatus>("");
  const [startDate, setStartDate] = useState<string>(getDefaultStartDate());
  const [endDate, setEndDate] = useState<string>(getDefaultEndDate());

  useEffect(() => {
    const stored = getStoredOrders();
    if (stored?.length) setOrders(stored);
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        !searchTerm ||
        order.poNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.vendorName.toLowerCase().includes(searchTerm.toLowerCase());
      const pendingQty = order.totalQty - (order.receivedQty ?? 0);
      const isPending = order.status === "Approved" && pendingQty === order.totalQty;
      const matchesStatus =
        !statusFilter ||
        (statusFilter === "Pending" && isPending) ||
        (statusFilter !== "Pending" && order.status === statusFilter);
      const poDate = new Date(order.poDate).getTime();
      const matchesDate =
        (!startDate || poDate >= new Date(startDate).setHours(0, 0, 0, 0)) &&
        (!endDate || poDate <= new Date(endDate).setHours(23, 59, 59, 999));
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [orders, searchTerm, statusFilter, startDate, endDate]);

  const canReceive = (order: VendorPO) => {
    if (order.status !== "Approved" && order.status !== "Partially Received") return false;
    const pending = order.totalQty - (order.receivedQty ?? 0);
    return pending > 0;
  };

  const handleReceive = (order: VendorPO) => {
    if (!canReceive(order)) return;
    router.push(`/vendor-po/receive/process/${order.id}`);
  };

  /** POs that have pending qty and can be received */
  const receivableOrders = useMemo(
    () => filteredOrders.filter(canReceive),
    [filteredOrders]
  );

  const handleReceiveAgainstPO = () => {
    if (receivableOrders.length === 0) {
      return; // Table is the only way when none receivable
    }
    if (receivableOrders.length === 1) {
      router.push(`/vendor-po/receive/process/${receivableOrders[0].id}`);
      return;
    }
    document.getElementById("receive-table")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="main-content">
      <Seo title="Vendor PO Receiving" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header - same as Purchase Order Received */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Vendor PO Receiving</h1>
                <p className="text-gray-600 mt-1">Goods inward – receive against vendor POs</p>
              </div>
              <div className="box-tools">
                <button
                  type="button"
                  onClick={handleReceiveAgainstPO}
                  disabled={receivableOrders.length === 0}
                  className="ti-btn ti-btn-primary inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  title={receivableOrders.length === 0 ? "No POs with pending quantity" : receivableOrders.length === 1 ? "Receive against " + receivableOrders[0].poNo : "Scroll to table to choose a PO"}
                >
                  <i className="ri-add-line me-1"></i>
                  Receive Against PO
                </button>
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
                    placeholder="Search by PO No or Vendor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    className="form-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as "" | "Pending" | VendorPOStatus)}
                  >
                    {RECEIVE_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value || "all"} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="ti-btn ti-btn-light inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap">
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
                      type="button"
                      className="ti-btn ti-btn-light inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap self-end"
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

          {/* Table */}
          <div id="receive-table" className="box">
            <div className="box-header">
              <h3 className="box-title">POs for Receiving ({filteredOrders.length})</h3>
            </div>
            <div className="box-body">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <i className="ri-inbox-line text-4xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No POs to Receive</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm || statusFilter
                      ? "No orders match your criteria. Try adjusting filters."
                      : "No vendor POs in Approved or Partially Received status for the selected period."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse border border-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          PO No
                        </th>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vendor
                        </th>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="border border-gray-300 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ordered Qty
                        </th>
                        <th className="border border-gray-300 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Received Qty
                        </th>
                        <th className="border border-gray-300 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pending Qty
                        </th>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {filteredOrders.map((order) => {
                        const pendingQty = order.totalQty - (order.receivedQty ?? 0);
                        const receiveDisabled = !canReceive(order);
                        return (
                          <tr key={order.id} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {order.poNo}
                            </td>
                            <td className="border border-gray-300 px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {order.vendorName}
                            </td>
                            <td className="border border-gray-300 px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(order.priority)}`}>
                                {order.priority}
                              </span>
                            </td>
                            <td className="border border-gray-300 px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              {order.totalQty.toLocaleString()}
                            </td>
                            <td className="border border-gray-300 px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              {(order.receivedQty ?? 0).toLocaleString()}
                            </td>
                            <td className="border border-gray-300 px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              {pendingQty.toLocaleString()}
                            </td>
                            <td className="border border-gray-300 px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleReceive(order)}
                                  disabled={receiveDisabled}
                                  className="ti-btn ti-btn-primary inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={receiveDisabled ? "No pending qty" : "Receive"}
                                >
                                  <i className="ri-inbox-line me-1"></i>
                                  Receive
                                </button>
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
    </div>
  );
};

export default VendorPOReceivePage;
