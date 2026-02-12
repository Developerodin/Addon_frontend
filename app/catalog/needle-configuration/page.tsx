"use client";

import React, { useEffect, useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { Toaster } from "react-hot-toast";
import {
  listNeedleConfigurations,
  NeedleConfiguration,
} from "@/shared/services/needleConfigurationService";

const formatDate = (v?: string) =>
  v ? new Date(v).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "-";

const NeedleConfigurationPage = () => {
  const [rows, setRows] = useState<NeedleConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [search, setSearch] = useState("");

  const fetchList = async () => {
    try {
      setIsLoading(true);
      const data = await listNeedleConfigurations({ page, limit, search: search || undefined });
      setRows(data.results ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotalResults(data.totalResults ?? 0);
    } catch {
      setRows([]);
      setTotalPages(1);
      setTotalResults(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [page, limit, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  return (
    <div className="main-content">
      <Seo title="Needle Configuration" />
      <Toaster position="top-right" />

      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
            <h1 className="text-xl font-semibold text-gray-900">Needle Configuration</h1>
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {totalResults} total
            </span>
          </div>
          <p className="text-sm text-gray-600">
            View and manage needle configurations. Table only for now.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-sm rounded focus:ring-0 focus:border-purple-300 w-56"
            />
            <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          </div>
        </div>
      </div>

      <div className="box">
        <div className="box-header flex items-center justify-between">
          <h3 className="box-title">Needle Configuration List</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Page {page} of {totalPages}</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="bg-white border border-gray-200 text-[11px] rounded px-2 py-1 focus:ring-0 focus:border-gray-300"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>{n}/page</option>
              ))}
            </select>
          </div>
        </div>
        <div className="box-body p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mb-4 opacity-60" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Loading</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <p className="text-sm font-medium">No needle configurations found</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting the search.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-3 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">
                      #
                    </th>
                    <th className="px-3 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">
                      Needle Size
                    </th>
                    <th className="px-3 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">
                      Cutoff Qty
                    </th>
                    <th className="px-3 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">
                      Name / Code
                    </th>
                    <th className="px-3 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-100 hover:bg-gray-50/50"
                    >
                      <td className="px-3 py-2.5 text-sm text-gray-600">
                        {(page - 1) * limit + idx + 1}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-gray-800">
                        {row.needleSize ?? row.name ?? "-"}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-gray-800">
                        {row.cutoffQuantity ?? "-"}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-gray-800">
                        {row.name ?? row.code ?? "-"}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-gray-600">
                        {formatDate(row.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {totalPages > 1 && (
          <div className="box-footer flex items-center justify-between px-3 py-2 border-t border-gray-200">
            <span className="text-xs text-gray-500">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, totalResults)} of {totalResults}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2 py-1 text-xs font-medium rounded border border-gray-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-2 py-1 text-xs font-medium rounded border border-gray-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NeedleConfigurationPage;
