"use client";

import React, { useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InwardRecord, InwardStatus } from "./types";

// Mock data for inward list
const MOCK_INWARD: InwardRecord[] = [
  {
    id: "inv-1",
    grnNumber: "GRN-2024-001",
    reference: "PO-12345",
    date: "2024-02-15T10:00:00Z",
    supplier: "ABC Supplies",
    status: "pending",
    items: [],
    totalItems: 12,
  },
  {
    id: "inv-2",
    grnNumber: "GRN-2024-002",
    reference: "PO-12346",
    date: "2024-02-14T14:30:00Z",
    supplier: "XYZ Traders",
    status: "partial",
    items: [],
    totalItems: 8,
  },
  {
    id: "inv-3",
    grnNumber: "GRN-2024-003",
    date: "2024-02-13T09:00:00Z",
    supplier: "Global Imports",
    status: "completed",
    items: [],
    totalItems: 24,
  },
];

const statusBadge: Record<InwardStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  partial: "bg-blue-100 text-blue-800",
  received: "bg-purple-100 text-purple-800",
  "qc-pending": "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
};

export default function InwardListPage() {
  const router = useRouter();
  const [inward] = useState<InwardRecord[]>(MOCK_INWARD);

  const handleRowClick = (id: string) => {
    router.push(`/warehouse-management/orders/inward/${id}`);
  };

  return (
    <>
      <Seo title="Inward Receiving" />
      <div className="box">
        <div className="box-header flex items-center justify-between">
          <h3 className="box-title">Inward Dashboard</h3>
          <Link
            href="/warehouse-management/orders/inward/new"
            className="ti-btn ti-btn-primary-full"
          >
            <i className="ri-add-line me-2"></i>
            New Inward
          </Link>
        </div>
        <div className="box-body">
          {inward.length === 0 ? (
            <div className="text-center py-12">
              <i className="ri-inbox-line text-4xl text-gray-400 mb-4"></i>
              <p className="text-gray-600">No inward records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>GRN Number</th>
                    <th>Reference</th>
                    <th>Date</th>
                    <th>Supplier</th>
                    <th>Status</th>
                    <th>Items</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inward.map((row) => (
                    <tr
                      key={row.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleRowClick(row.id)}
                    >
                      <td className="font-medium">{row.grnNumber}</td>
                      <td>{row.reference ?? "—"}</td>
                      <td>{new Date(row.date).toLocaleDateString()}</td>
                      <td>{row.supplier}</td>
                      <td>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${statusBadge[row.status]}`}
                        >
                          {row.status.toUpperCase()}
                        </span>
                      </td>
                      <td>{row.totalItems}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleRowClick(row.id)}
                          className="ti-btn ti-btn-sm ti-btn-info"
                          title="View / Receive"
                        >
                          <i className="ri-eye-line"></i>
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
    </>
  );
}
