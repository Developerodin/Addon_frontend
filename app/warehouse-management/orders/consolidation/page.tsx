"use client";

import React, { useState, useEffect, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { whmsConsolidation, WhmsConsolidationBatch } from "@/shared/services/whmsService";
import { toast } from "react-hot-toast";

interface ConsolidationRecord {
  id: string;
  batchCode: string;
  orderCount: number;
  totalItems: number;
  status: "draft" | "ready" | "dispatched";
  createdAt: string;
}

function mapBatch(b: WhmsConsolidationBatch): ConsolidationRecord {
  return {
    id: b.id,
    batchCode: b.batchCode,
    orderCount: b.orderIds?.length ?? b.orderCount ?? 0,
    totalItems: b.totalItems ?? 0,
    status: (b.status as "draft" | "ready" | "dispatched") ?? "draft",
    createdAt: b.createdAt ?? "",
  };
}

const statusClass: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  ready: "bg-blue-100 text-blue-800",
  dispatched: "bg-green-100 text-green-800",
};

export default function ConsolidationPage() {
  const [list, setList] = useState<ConsolidationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await whmsConsolidation.list({ page: 1, limit: 100 });
      setList((data.results || []).map(mapBatch));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load consolidation");
      toast.error("Failed to load consolidation");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleRowClick = (id: string) => {
    // TODO: Navigate to batch details
    console.log("View batch:", id);
  };

  const stats = {
    total: list.length,
    draft: list.filter((b) => b.status === "draft").length,
    ready: list.filter((b) => b.status === "ready").length,
    dispatched: list.filter((b) => b.status === "dispatched").length,
    totalOrders: list.reduce((sum, b) => sum + b.orderCount, 0),
    totalItems: list.reduce((sum, b) => sum + b.totalItems, 0),
  };

  return (
    <>
      <Seo title="Consolidation" />
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="box bg-blue-50 border-blue-200">
          <div className="box-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Batches</p>
                <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              </div>
              <i className="ri-stack-line text-3xl text-blue-400"></i>
            </div>
          </div>
        </div>
        <div className="box bg-gray-50 border-gray-200">
          <div className="box-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Draft</p>
                <p className="text-2xl font-bold text-gray-600">{stats.draft}</p>
              </div>
              <i className="ri-file-edit-line text-3xl text-gray-400"></i>
            </div>
          </div>
        </div>
        <div className="box bg-purple-50 border-purple-200">
          <div className="box-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Ready</p>
                <p className="text-2xl font-bold text-purple-600">{stats.ready}</p>
              </div>
              <i className="ri-checkbox-circle-line text-3xl text-purple-400"></i>
            </div>
          </div>
        </div>
        <div className="box bg-green-50 border-green-200">
          <div className="box-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Dispatched</p>
                <p className="text-2xl font-bold text-green-600">{stats.dispatched}</p>
              </div>
              <i className="ri-truck-line text-3xl text-green-400"></i>
            </div>
          </div>
        </div>
      </div>

      <div className="box">
        <div className="box-header flex items-center justify-between">
          <div>
            <h3 className="box-title">Consolidation</h3>
            <p className="text-gray-600 mt-1 text-sm">
              Batches and consolidated orders for dispatch.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="ti-btn ti-btn-primary"
              title="Create new batch"
            >
              <i className="ri-add-line me-2"></i>
              New Batch
            </button>
          </div>
        </div>
        <div className="box-body">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50" />
              <p className="text-[10px] text-gray-400 font-bold uppercase mt-2">Loading...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-red-600 text-sm mb-2">{error}</p>
              <button type="button" onClick={fetchList} className="ti-btn ti-btn-primary">Retry</button>
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-stack-line text-xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">DATA EMPTY</h3>
            </div>
          ) : (
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50/30">
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                      Batch Code
                    </th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                      Orders
                    </th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                      Total Items
                    </th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                      Status
                    </th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                      Created
                    </th>
                    <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row) => (
                    <tr 
                      key={row.id} 
                      className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                      onClick={() => handleRowClick(row.id)}
                    >
                      <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">
                        {row.batchCode}
                      </td>
                      <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">
                        {row.orderCount}
                      </td>
                      <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">
                        {row.totalItems}
                      </td>
                      <td className="px-1.5 py-2.5 text-left border border-gray-200">
                        <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${statusClass[row.status]}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-400 border border-gray-200">
                        {new Date(row.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleRowClick(row.id)}
                            className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-400 border border-blue-100 rounded hover:bg-blue-100 transition-colors"
                            title="View batch details"
                          >
                            <i className="ri-eye-line text-xs"></i>
                          </button>
                          {row.status === "ready" && (
                            <button
                              type="button"
                              className="w-7 h-7 flex items-center justify-center bg-green-50 text-green-400 border border-green-100 rounded hover:bg-green-100 transition-colors"
                              title="Dispatch batch"
                            >
                              <i className="ri-truck-line text-xs"></i>
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
