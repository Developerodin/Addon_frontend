"use client";
import React, { useState, useMemo, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { VendorPO, VendorPOStatus, VendorPOPriority } from "./types";
import { MOCK_VENDOR_POS, getStoredOrders, setStoredOrders } from "./data";

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

const VendorPORaisePage = () => {
  const [orders, setOrders] = useState<VendorPO[]>(MOCK_VENDOR_POS);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [vendorFilter, setVendorFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(getDefaultStartDate());
  const [endDate, setEndDate] = useState<string>(getDefaultEndDate());
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<VendorPO | null>(null);

  useEffect(() => {
    const stored = getStoredOrders();
    if (stored?.length) setOrders(stored);
  }, []);

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
      const poDate = new Date(order.poDate).getTime();
      const matchesDate =
        (!startDate || poDate >= new Date(startDate).setHours(0, 0, 0, 0)) &&
        (!endDate || poDate <= new Date(endDate).setHours(23, 59, 59, 999));
      return matchesSearch && matchesStatus && matchesPriority && matchesVendor && matchesDate;
    });
  }, [orders, searchTerm, statusFilter, priorityFilter, vendorFilter, startDate, endDate]);

  const uniqueVendors = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach((o) => map.set(o.vendorId, o.vendorName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [orders]);

  const handleApprove = (order: VendorPO) => {
    if (order.status !== "Draft") return;
    const next = orders.map((o) => (o.id === order.id ? { ...o, status: "Approved" as VendorPOStatus } : o));
    setOrders(next);
    setStoredOrders(next);
    if (selectedOrder?.id === order.id) setSelectedOrder((prev) => (prev ? { ...prev, status: "Approved" } : null));
    toast.success(`PO ${order.poNo} approved`);
  };

  const handleClose = (order: VendorPO) => {
    const next = orders.map((o) => (o.id === order.id ? { ...o, status: "Closed" as VendorPOStatus } : o));
    setOrders(next);
    setStoredOrders(next);
    if (selectedOrder?.id === order.id) setSelectedOrder((prev) => (prev ? { ...prev, status: "Closed" } : null));
    toast.success(`PO ${order.poNo} closed`);
  };

  return (
    <div className="main-content">
      <Seo title="Vendor POs" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header - same as Purchase Order */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Vendor POs</h1>
                <p className="text-gray-600 mt-1">Manage vendor purchase orders</p>
              </div>
              <div className="box-tools">
                <Link href="/vendor-po/raise/add" className="ti-btn ti-btn-primary inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap">
                  <i className="ri-add-line me-1"></i>
                  Create PO
                </Link>
              </div>
            </div>
          </div>

          {/* Search and Filters - same layout as Purchase Order */}
          <div className="box">
            <div className="box-body">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search by PO No, Vendor or Article..."
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
                      <option value="">All Status</option>
                      <option value="Draft">Draft</option>
                      <option value="Approved">Approved</option>
                      <option value="Partially Received">Partially Received</option>
                      <option value="Fully Received">Fully Received</option>
                      <option value="Closed">Closed</option>
                    </select>
                    <select
                      className="form-select"
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                    >
                      <option value="">All Priority</option>
                      <option value="Urgent">Urgent</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                    <select
                      className="form-select"
                      value={vendorFilter}
                      onChange={(e) => setVendorFilter(e.target.value)}
                    >
                      <option value="">All Vendors</option>
                      {uniqueVendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="ti-btn ti-btn-light">
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
                        type="button"
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
          </div>

          {/* Vendor POs Table - same table style as Purchase Order */}
          <div className="box">
            <div className="box-header">
              <h3 className="box-title">Vendor POs ({filteredOrders.length})</h3>
            </div>
            <div className="box-body">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <i className="ri-shopping-cart-line text-4xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Vendor POs</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm || statusFilter || priorityFilter || vendorFilter
                      ? "No orders match your search criteria. Try adjusting your search term."
                      : "No vendor purchase orders found for the selected period."}
                  </p>
                  <Link href="/vendor-po/raise/add" className="ti-btn ti-btn-primary inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap">
                    <i className="ri-add-line me-1"></i>
                    Create PO
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse border border-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO No</th>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Date</th>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                        <th className="border border-gray-300 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Qty</th>
                        <th className="border border-gray-300 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Received Qty</th>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {filteredOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {order.poNo}
                          </td>
                          <td className="border border-gray-300 px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(order.poDate).toLocaleDateString()}
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
                            {order.receivedQty.toLocaleString()}
                          </td>
                          <td className="border border-gray-300 px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="border border-gray-300 px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setDetailsModalOpen(true);
                                }}
                                className="text-purple-600 hover:text-purple-900 flex items-center justify-center"
                                title="View Details"
                              >
                                <i className="ri-eye-line text-lg"></i>
                              </button>
                              {order.status === "Draft" && (
                                <Link
                                  href={`/vendor-po/raise/edit/${order.id}`}
                                  className="text-green-600 hover:text-green-900 flex items-center justify-center"
                                  title="Edit"
                                >
                                  <i className="ri-edit-line text-lg"></i>
                                </Link>
                              )}
                              {order.status === "Draft" && (
                                <button
                                  type="button"
                                  onClick={() => handleApprove(order)}
                                  className="text-xs border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded px-3 py-1 h-7 font-medium"
                                  title="Approve"
                                >
                                  Approve
                                </button>
                              )}
                              {order.status !== "Closed" && order.status !== "Draft" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Close PO ${order.poNo}?`)) handleClose(order);
                                  }}
                                  className="text-xs border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 rounded px-3 py-1 h-7 font-medium"
                                  title="Close"
                                >
                                  Close
                                </button>
                              )}
                            </div>
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

      {/* View Details Modal - same pattern as Purchase Order */}
      {selectedOrder && (
        <div className={`fixed inset-0 z-50 overflow-y-auto ${detailsModalOpen ? "" : "hidden"}`}>
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => {
                setDetailsModalOpen(false);
                setSelectedOrder(null);
              }}
            />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
              <div className="bg-primary text-white px-6 py-4 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Vendor PO Details</h3>
                  <p className="text-sm text-white/80 mt-1">{selectedOrder.poNo}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDetailsModalOpen(false);
                    setSelectedOrder(null);
                  }}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
              <div className="px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">PO No</label>
                    <div className="mt-1 text-sm text-gray-900 font-medium">{selectedOrder.poNo}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">PO Date</label>
                    <div className="mt-1 text-sm text-gray-900">
                      {new Date(selectedOrder.poDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Vendor</label>
                    <div className="mt-1 text-sm text-gray-900">{selectedOrder.vendorName}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Priority</label>
                    <div className="mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(selectedOrder.priority)}`}>
                        {selectedOrder.priority}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Total Qty</label>
                    <div className="mt-1 text-sm text-gray-900">{selectedOrder.totalQty.toLocaleString()}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Received Qty</label>
                    <div className="mt-1 text-sm text-gray-900">{selectedOrder.receivedQty.toLocaleString()}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <div className="mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedOrder.status)}`}>
                        {selectedOrder.status}
                      </span>
                    </div>
                  </div>
                  {selectedOrder.articleSummary && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-600">Articles</label>
                      <div className="mt-1 text-sm text-gray-900">{selectedOrder.articleSummary}</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                {selectedOrder.status === "Draft" && (
                  <Link
                    href={`/vendor-po/raise/edit/${selectedOrder.id}`}
                    className="ti-btn ti-btn-primary inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
                  >
                    <i className="ri-edit-line me-1"></i>
                    Edit
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setDetailsModalOpen(false);
                    setSelectedOrder(null);
                  }}
                  className="ti-btn ti-btn-light inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
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

export default VendorPORaisePage;
