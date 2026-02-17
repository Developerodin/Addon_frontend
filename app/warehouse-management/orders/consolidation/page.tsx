"use client";

import React, { useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";

interface ConsolidationRecord {
  id: string;
  batchCode: string;
  orderCount: number;
  totalItems: number;
  status: "draft" | "ready" | "dispatched";
  createdAt: string;
}

const MOCK_CONSOLIDATION: ConsolidationRecord[] = [
  {
    id: "con-1",
    batchCode: "BATCH-2024-001",
    orderCount: 12,
    totalItems: 48,
    status: "ready",
    createdAt: "2024-02-15T08:00:00Z",
  },
  {
    id: "con-2",
    batchCode: "BATCH-2024-002",
    orderCount: 8,
    totalItems: 22,
    status: "draft",
    createdAt: "2024-02-14T16:00:00Z",
  },
];

const statusClass: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  ready: "bg-blue-100 text-blue-800",
  dispatched: "bg-green-100 text-green-800",
};

export default function ConsolidationPage() {
  const [list] = useState<ConsolidationRecord[]>(MOCK_CONSOLIDATION);

  return (
    <>
      <Seo title="Consolidation" />
      <div className="box">
        <div className="box-header">
          <h3 className="box-title">Consolidation</h3>
          <p className="text-gray-600 mt-1 text-sm">
            Batches and consolidated orders for dispatch.
          </p>
        </div>
        <div className="box-body">
          {list.length === 0 ? (
            <div className="text-center py-12">
              <i className="ri-stack-line text-4xl text-gray-400 mb-4"></i>
              <p className="text-gray-600">No consolidation batches</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Batch Code</th>
                    <th>Orders</th>
                    <th>Total Items</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row) => (
                    <tr key={row.id}>
                      <td className="font-medium">{row.batchCode}</td>
                      <td>{row.orderCount}</td>
                      <td>{row.totalItems}</td>
                      <td>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${statusClass[row.status]}`}
                        >
                          {row.status.toUpperCase()}
                        </span>
                      </td>
                      <td>{new Date(row.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button
                          type="button"
                          className="ti-btn ti-btn-sm ti-btn-info"
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
