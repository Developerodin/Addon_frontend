"use client";

import React, { useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";

interface ApprovalRecord {
  id: string;
  reference: string;
  type: "order" | "grn";
  variance: string;
  requestedBy: string;
  date: string;
  status: "pending" | "approved" | "rejected";
}

const MOCK_APPROVALS: ApprovalRecord[] = [
  {
    id: "apr-1",
    reference: "ORD-1001",
    type: "order",
    variance: "Qty +5 units",
    requestedBy: "John Doe",
    date: "2024-02-15T09:00:00Z",
    status: "pending",
  },
  {
    id: "apr-2",
    reference: "GRN-2024-002",
    type: "grn",
    variance: "Price variance ₹200",
    requestedBy: "Jane Smith",
    date: "2024-02-14T14:00:00Z",
    status: "pending",
  },
];

const statusClass: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalRecord[]>(MOCK_APPROVALS);

  const handleApprove = (id: string) => {
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "approved" as const } : a))
    );
    toast.success("Variance approved");
  };

  const handleReject = (id: string) => {
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "rejected" as const } : a))
    );
    toast.error("Variance rejected");
  };

  const stats = {
    total: approvals.length,
    pending: approvals.filter((a) => a.status === "pending").length,
    approved: approvals.filter((a) => a.status === "approved").length,
    rejected: approvals.filter((a) => a.status === "rejected").length,
  };

  return (
    <>
      <Seo title="Supervisor Variance Approvals" />
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="box bg-blue-50 border-blue-200">
          <div className="box-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Requests</p>
                <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              </div>
              <i className="ri-file-list-line text-3xl text-blue-400"></i>
            </div>
          </div>
        </div>
        <div className="box bg-yellow-50 border-yellow-200">
          <div className="box-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <i className="ri-time-line text-3xl text-yellow-400"></i>
            </div>
          </div>
        </div>
        <div className="box bg-green-50 border-green-200">
          <div className="box-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <i className="ri-checkbox-circle-line text-3xl text-green-400"></i>
            </div>
          </div>
        </div>
        <div className="box bg-red-50 border-red-200">
          <div className="box-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <i className="ri-close-circle-line text-3xl text-red-400"></i>
            </div>
          </div>
        </div>
      </div>

      <div className="box">
        <div className="box-header flex items-center justify-between">
          <div>
            <h3 className="box-title">Supervisor Variance Approvals</h3>
            <p className="text-gray-600 mt-1 text-sm">
              Review and approve variance requests from orders and inward.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
              {approvals.filter(a => a.status === "pending").length} Pending
            </span>
          </div>
        </div>
        <div className="box-body">
          {approvals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-checkbox-circle-line text-xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">DATA EMPTY</h3>
            </div>
          ) : (
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50/30">
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                      Reference
                    </th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                      Type
                    </th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                      Variance
                    </th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                      Requested By
                    </th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                      Date
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
                  {approvals.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">
                        {row.reference}
                      </td>
                      <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-400 border border-gray-200 capitalize">
                        {row.type}
                      </td>
                      <td className="px-1.5 py-2.5 text-[12px] font-semibold text-gray-600 border border-gray-200">
                        {row.variance}
                      </td>
                      <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-400 border border-gray-200">
                        {row.requestedBy}
                      </td>
                      <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-400 border border-gray-200">
                        {new Date(row.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-1.5 py-2.5 text-left border border-gray-200">
                        <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${statusClass[row.status]}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                        {row.status === "pending" ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleApprove(row.id)}
                              className="h-7 px-2 text-[9px] font-bold bg-white text-green-600 border border-green-200 rounded hover:bg-green-50 transition-colors uppercase shadow-sm"
                              title="Approve variance"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(row.id)}
                              className="h-7 px-2 text-[9px] font-bold bg-white text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors uppercase shadow-sm"
                              title="Reject variance"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-500">
                            {row.status === "approved" ? (
                              <i className="ri-checkbox-circle-line text-success me-1"></i>
                            ) : (
                              <i className="ri-close-circle-line text-danger me-1"></i>
                            )}
                            {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
