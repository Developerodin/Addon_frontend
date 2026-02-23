"use client";

import React, { useMemo, useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import type { DispatchApprovalRecord } from "../types";

type ApprovalTypeFilter = "variance" | "dispatch" | "all";

interface VarianceApprovalRecord {
  id: string;
  reference: string;
  type: "order" | "grn";
  variance: string;
  requestedBy: string;
  date: string;
  status: "pending" | "approved" | "rejected";
}

const MOCK_VARIANCE: VarianceApprovalRecord[] = [
  { id: "apr-1", reference: "ORD-1001", type: "order", variance: "Qty +5 units", requestedBy: "John Doe", date: "2024-02-15T09:00:00Z", status: "pending" },
  { id: "apr-2", reference: "GRN-2024-002", type: "grn", variance: "Price variance ₹200", requestedBy: "Jane Smith", date: "2024-02-14T14:00:00Z", status: "pending" },
];

const MOCK_DISPATCH: DispatchApprovalRecord[] = [
  { id: "disp-1", orderId: "ORD-2001", channel: "Website", requestedBy: "Warehouse User", pendingApprover: "sales", status: "pending", requestedAt: "2024-02-15T10:00:00Z" },
  { id: "disp-2", orderId: "ORD-2002", channel: "Amazon", requestedBy: "Warehouse User", pendingApprover: "accounts", status: "pending", requestedAt: "2024-02-15T11:00:00Z" },
  { id: "disp-3", orderId: "ORD-2003", channel: "Retail", requestedBy: "Warehouse User", pendingApprover: "both", status: "pending", requestedAt: "2024-02-14T16:00:00Z" },
];

const statusClass: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function ApprovalsPage() {
  const [approvalType, setApprovalType] = useState<ApprovalTypeFilter>("all");
  const [varianceApprovals, setVarianceApprovals] = useState<VarianceApprovalRecord[]>(MOCK_VARIANCE);
  const [dispatchApprovals, setDispatchApprovals] = useState<DispatchApprovalRecord[]>(MOCK_DISPATCH);

  const handleVarianceApprove = (id: string) => {
    setVarianceApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "approved" as const } : a))
    );
    toast.success("Variance approved");
  };

  const handleVarianceReject = (id: string) => {
    setVarianceApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "rejected" as const } : a))
    );
    toast.error("Variance rejected");
  };

  const handleDispatchApprove = (id: string) => {
    setDispatchApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "approved" as const } : a))
    );
    toast.success("Dispatch approved");
  };

  const handleDispatchReject = (id: string) => {
    setDispatchApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "rejected" as const } : a))
    );
    toast.error("Dispatch rejected");
  };

  const variancePending = useMemo(() => varianceApprovals.filter((a) => a.status === "pending").length, [varianceApprovals]);
  const dispatchPending = useMemo(() => dispatchApprovals.filter((a) => a.status === "pending").length, [dispatchApprovals]);
  const stats = useMemo(
    () => ({
      total: varianceApprovals.length + dispatchApprovals.length,
      pending: variancePending + dispatchPending,
      approved: varianceApprovals.filter((a) => a.status === "approved").length + dispatchApprovals.filter((a) => a.status === "approved").length,
      rejected: varianceApprovals.filter((a) => a.status === "rejected").length + dispatchApprovals.filter((a) => a.status === "rejected").length,
    }),
    [varianceApprovals, dispatchApprovals, variancePending, dispatchPending]
  );

  return (
    <>
      <Seo title="Approvals" />
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
        <div className="box-header flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="box-title">Approvals</h3>
            <p className="text-gray-600 mt-1 text-sm">
              Variance approvals (orders/inward) and dispatch approvals (Sales & Accounts).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Type:</span>
            <select
              value={approvalType}
              onChange={(e) => setApprovalType(e.target.value as ApprovalTypeFilter)}
              className="ti-form-input !h-9 !text-[12px] w-auto min-w-[180px]"
            >
              <option value="all">All</option>
              <option value="variance">Variance Approval</option>
              <option value="dispatch">Dispatch Approval</option>
            </select>
          </div>
        </div>
        <div className="box-body">
          {(approvalType === "all" || approvalType === "variance") && (
            <>
              <h4 className="text-[12px] font-bold text-gray-700 mb-3 flex items-center gap-2">
                <i className="ri-file-list-3-line"></i>
                Variance Approval
              </h4>
              {varianceApprovals.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-[12px]">No variance requests.</div>
              ) : (
                <div className="overflow-x-auto min-h-[120px] mb-6">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50/30">
                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Reference</th>
                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Type</th>
                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Variance</th>
                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Requested By</th>
                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Date</th>
                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                        <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {varianceApprovals.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">{row.reference}</td>
                          <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-400 border border-gray-200 capitalize">{row.type}</td>
                          <td className="px-1.5 py-2.5 text-[12px] font-semibold text-gray-600 border border-gray-200">{row.variance}</td>
                          <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-400 border border-gray-200">{row.requestedBy}</td>
                          <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-400 border border-gray-200">{new Date(row.date).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}</td>
                          <td className="px-1.5 py-2.5 text-left border border-gray-200">
                            <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${statusClass[row.status]}`}>{row.status}</span>
                          </td>
                          <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                            {row.status === "pending" ? (
                              <div className="flex items-center justify-end gap-1">
                                <button type="button" onClick={() => handleVarianceApprove(row.id)} className="h-7 px-2 text-[9px] font-bold bg-white text-green-600 border border-green-200 rounded hover:bg-green-50 uppercase">Approve</button>
                                <button type="button" onClick={() => handleVarianceReject(row.id)} className="h-7 px-2 text-[9px] font-bold bg-white text-red-600 border border-red-200 rounded hover:bg-red-50 uppercase">Reject</button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-500">{row.status}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {(approvalType === "all" || approvalType === "dispatch") && (
            <>
              <h4 className="text-[12px] font-bold text-gray-700 mb-3 flex items-center gap-2">
                <i className="ri-truck-line"></i>
                Dispatch Approval
              </h4>
              <p className="text-[11px] text-gray-500 mb-2">Warehouse marks order ready for dispatch. Sales and Accounts must approve before dispatch.</p>
              {dispatchApprovals.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-[12px]">No dispatch approval requests.</div>
              ) : (
                <div className="overflow-x-auto min-h-[200px]">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50/30">
                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Order ID</th>
                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Channel</th>
                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Requested By</th>
                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Pending Approver</th>
                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                        <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dispatchApprovals.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">{row.orderId}</td>
                          <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-400 border border-gray-200">{row.channel}</td>
                          <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-400 border border-gray-200">{row.requestedBy}</td>
                          <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200 capitalize">{row.pendingApprover}</td>
                          <td className="px-1.5 py-2.5 text-left border border-gray-200">
                            <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${statusClass[row.status]}`}>{row.status}</span>
                          </td>
                          <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                            {row.status === "pending" ? (
                              <div className="flex items-center justify-end gap-1">
                                <button type="button" onClick={() => handleDispatchApprove(row.id)} className="h-7 px-2 text-[9px] font-bold bg-white text-green-600 border border-green-200 rounded hover:bg-green-50 uppercase">Approve</button>
                                <button type="button" onClick={() => handleDispatchReject(row.id)} className="h-7 px-2 text-[9px] font-bold bg-white text-red-600 border border-red-200 rounded hover:bg-red-50 uppercase">Reject</button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-500">{row.status}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
