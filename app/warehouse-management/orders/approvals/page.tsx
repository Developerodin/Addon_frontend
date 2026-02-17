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

  return (
    <>
      <Seo title="Supervisor Variance Approvals" />
      <div className="box">
        <div className="box-header">
          <h3 className="box-title">Supervisor Variance Approvals</h3>
          <p className="text-gray-600 mt-1 text-sm">
            Review and approve variance requests from orders and inward.
          </p>
        </div>
        <div className="box-body">
          {approvals.length === 0 ? (
            <div className="text-center py-12">
              <i className="ri-checkbox-circle-line text-4xl text-gray-400 mb-4"></i>
              <p className="text-gray-600">No approval requests</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Type</th>
                    <th>Variance</th>
                    <th>Requested By</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approvals.map((row) => (
                    <tr key={row.id}>
                      <td className="font-medium">{row.reference}</td>
                      <td className="capitalize">{row.type}</td>
                      <td>{row.variance}</td>
                      <td>{row.requestedBy}</td>
                      <td>{new Date(row.date).toLocaleDateString()}</td>
                      <td>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${statusClass[row.status]}`}
                        >
                          {row.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {row.status === "pending" && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleApprove(row.id)}
                              className="ti-btn ti-btn-sm ti-btn-success"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(row.id)}
                              className="ti-btn ti-btn-sm ti-btn-danger"
                            >
                              Reject
                            </button>
                          </div>
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
