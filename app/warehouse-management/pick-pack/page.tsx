"use client";

import React, { useCallback, useEffect, useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast, Toaster } from "react-hot-toast";
import PickBatchTable from "./components/PickBatchTable";
import {
  whmsPickListBatches,
  type PickListBatch,
} from "@/shared/services/whmsPickListBatchService";

const PickPackPage = () => {
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<PickListBatch[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"" | "picking" | "sent-to-scanning">("");
  const [q, setQ] = useState("");

  const loadBatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await whmsPickListBatches.list({
        page,
        limit: 20,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(q.trim() ? { q: q.trim() } : {}),
      });
      setBatches(res.results || []);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load pick lists");
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, q]);

  useEffect(() => {
    const t = setTimeout(() => void loadBatches(), 300);
    return () => clearTimeout(t);
  }, [loadBatches]);

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Pick&Pack" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex flex-wrap items-center justify-between gap-3">
              <h1 className="box-title text-2xl font-semibold">Pick & Pack</h1>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="search"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search batch # or order…"
                  className="border border-gray-200 rounded px-3 py-1.5 text-sm min-w-[180px]"
                  aria-label="Search pick lists"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as "" | "picking" | "sent-to-scanning");
                    setPage(1);
                  }}
                  className="border border-gray-200 rounded px-3 py-1.5 text-sm"
                  aria-label="Filter by status"
                >
                  <option value="">All statuses</option>
                  <option value="picking">Picking</option>
                  <option value="sent-to-scanning">Sent to scanning</option>
                </select>
              </div>
            </div>
          </div>

          <div className="box">
            <div className="box-body">
              <PickBatchTable batches={batches} loading={loading} />
              {!loading && totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1 text-sm font-medium disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span className="text-sm text-gray-500 py-1">
                    Page {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1 text-sm font-medium disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PickPackPage;
