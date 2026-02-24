"use client";

import React, { useState, useEffect, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InwardRecord, InwardStatus } from "./types";
import { whmsInward, WhmsInwardRecord } from "@/shared/services/whmsService";
import { toast } from "react-hot-toast";

function mapWhmsToInwardRecord(r: WhmsInwardRecord): InwardRecord {
  const statusMap: Record<string, InwardStatus> = {
    pending: "pending",
    partial: "partial",
    received: "received",
    "qc-pending": "qc-pending",
    completed: "completed",
  };
  const status = (statusMap[r.status] ?? "pending") as InwardStatus;
  const items = (r.items || []).map((i) => ({
    sku: i.sku,
    name: i.name ?? i.sku,
    orderedQty: i.orderedQty ?? 0,
    receivedQty: i.receivedQty ?? i.acceptedQty ?? 0,
    acceptedQty: i.acceptedQty ?? 0,
    rejectedQty: i.rejectedQty ?? 0,
    unit: i.unit,
  }));
  const totalItems = r.totalItems ?? items.reduce((s, i) => s + i.orderedQty, 0);
  return {
    id: r.id,
    grnNumber: r.grnNumber,
    reference: r.reference,
    date: r.date,
    supplier: r.supplier ?? "",
    status,
    items,
    totalItems,
    notes: r.notes,
  };
}

const statusBadge: Record<InwardStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  partial: "bg-blue-100 text-blue-800",
  received: "bg-purple-100 text-purple-800",
  "qc-pending": "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
};

export default function InwardListPage() {
  const router = useRouter();
  const [inward, setInward] = useState<InwardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInward = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await whmsInward.list({ page: 1, limit: 100 });
      setInward((data.results || []).map(mapWhmsToInwardRecord));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load inward";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInward();
  }, [fetchInward]);

  const handleRowClick = (id: string) => {
    router.push(`/warehouse-management/orders/inward/${id}`);
  };

  const stats = {
    total: inward.length,
    pending: inward.filter((r) => r.status === "pending").length,
    partial: inward.filter((r) => r.status === "partial").length,
    completed: inward.filter((r) => r.status === "completed").length,
  };

  return (
    <>
      <Seo title="Inward Receiving" />
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="box bg-blue-50 border-blue-200">
          <div className="box-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total GRNs</p>
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
        <div className="box bg-purple-50 border-purple-200">
          <div className="box-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Partial</p>
                <p className="text-2xl font-bold text-purple-600">{stats.partial}</p>
              </div>
              <i className="ri-inbox-2-line text-3xl text-purple-400"></i>
            </div>
          </div>
        </div>
        <div className="box bg-green-50 border-green-200">
          <div className="box-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <i className="ri-checkbox-circle-line text-3xl text-green-400"></i>
            </div>
          </div>
        </div>
      </div>

      <div className="box">
        <div className="box-header flex items-center justify-between">
          <div>
            <h3 className="box-title">Inward Dashboard</h3>
            <p className="text-gray-600 mt-1 text-sm">
              Manage incoming stock receipts and GRN entries.
            </p>
          </div>
          <Link
            href="/warehouse-management/orders/inward/new"
            className="ti-btn ti-btn-primary-full"
          >
            <i className="ri-add-line me-2"></i>
            New Inward
          </Link>
        </div>
        <div className="box-body">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
              <p className="text-[10px] text-gray-400 font-bold uppercase">Loading...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-red-600 text-sm mb-2">{error}</p>
              <button type="button" onClick={fetchInward} className="ti-btn ti-btn-primary">Retry</button>
            </div>
          ) : inward.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-inbox-line text-xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">DATA EMPTY</h3>
            </div>
          ) : (
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50/30">
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                      GRN Number
                    </th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                      Reference
                    </th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                      Date
                    </th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                      Supplier
                    </th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                      Status
                    </th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                      Items
                    </th>
                    <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {inward.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                      onClick={() => handleRowClick(row.id)}
                    >
                      <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">
                        {row.grnNumber}
                      </td>
                      <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-800 border border-gray-200">
                        {row.reference ?? "—"}
                      </td>
                      <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-800 border border-gray-200">
                        {new Date(row.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-1.5 py-2.5 text-[12px] font-semibold text-gray-600 border border-gray-200">
                        {row.supplier}
                      </td>
                      <td className="px-1.5 py-2.5 text-left border border-gray-200">
                        <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${statusBadge[row.status]}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">
                        {row.totalItems}
                      </td>
                      <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleRowClick(row.id)}
                            className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-400 border border-blue-100 rounded hover:bg-blue-100 transition-colors"
                            title="View / Receive"
                          >
                            <i className="ri-eye-line text-xs"></i>
                          </button>
                          {row.status === "pending" && (
                            <button
                              type="button"
                              onClick={() => handleRowClick(row.id)}
                              className="w-7 h-7 flex items-center justify-center bg-green-50 text-green-400 border border-green-100 rounded hover:bg-green-100 transition-colors"
                              title="Start Receiving"
                            >
                              <i className="ri-play-line text-xs"></i>
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
    </>
  );
}
