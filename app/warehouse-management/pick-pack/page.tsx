"use client";

import React, { useCallback, useEffect, useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast, Toaster } from "react-hot-toast";
import PickBatchTable from "./components/PickBatchTable";
import {
  whmsPickListBatches,
  type PickListBatch,
  type PickListBatchStatus,
} from "@/shared/services/whmsPickListBatchService";

type PickPackTab = "active" | "history";

const PickPackPage = () => {
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<PickListBatch[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tab, setTab] = useState<PickPackTab>("active");
  const [statusFilter, setStatusFilter] = useState<"" | PickListBatchStatus>("");
  const [q, setQ] = useState("");

  const loadBatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await whmsPickListBatches.list({
        page,
        limit: 20,
        pickComplete: tab === "history",
        ...(tab === "history" && statusFilter ? { status: statusFilter } : {}),
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
  }, [page, statusFilter, q, tab]);

  useEffect(() => {
    const t = setTimeout(() => void loadBatches(), 300);
    return () => clearTimeout(t);
  }, [loadBatches]);

  const handleTabChange = (next: PickPackTab) => {
    setTab(next);
    setPage(1);
    if (next === "active") setStatusFilter("");
  };

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
                {tab === "history" && (
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as "" | PickListBatchStatus);
                      setPage(1);
                    }}
                    className="border border-gray-200 rounded px-3 py-1.5 text-sm"
                    aria-label="Filter history by status"
                  >
                    <option value="">All completed</option>
                    <option value="picking">Fully picked</option>
                    <option value="sent-to-scanning">Sent to scanning</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          <div className="box">
            <div className="box-body">
              <div
                className="flex gap-2 mb-4 border-b border-gray-100 pb-2"
                role="tablist"
                aria-label="Pick list views"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "active"}
                  onClick={() => handleTabChange("active")}
                  className={`px-3 py-1.5 text-[12px] font-semibold rounded ${
                    tab === "active" ? "bg-violet-100 text-violet-800" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "history"}
                  onClick={() => handleTabChange("history")}
                  className={`px-3 py-1.5 text-[12px] font-semibold rounded ${
                    tab === "history" ? "bg-violet-100 text-violet-800" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  History
                </button>
              </div>

              <PickBatchTable batches={batches} loading={loading} variant={tab} />
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
