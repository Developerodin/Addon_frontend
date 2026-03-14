"use client";

import React, { useState } from "react";
import type { ActivityLogEntry } from "@/shared/types/userActivityLog";

interface ActivityLogsTableProps {
  logs: ActivityLogEntry[];
  loading: boolean;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
  } | null;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

const LogRow: React.FC<{ log: ActivityLogEntry }> = ({ log }) => {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = (log.requestMeta && Object.keys(log.requestMeta).length > 0) || log.errorMessage;
  return (
    <>
      <tr className="hover:bg-gray-50/50 transition-colors">
        <td className="px-1.5 py-2.5 border border-gray-200 text-[11px] text-gray-700 whitespace-nowrap">
          {formatDateTime(log.createdAt)}
        </td>
        <td className="px-1.5 py-2.5 border border-gray-200">
          <div className="text-[12px] font-medium text-gray-900">{log.userId?.name ?? "-"}</div>
          <div className="text-[10px] text-gray-500">{log.userId?.email ?? "-"}</div>
        </td>
        <td className="px-1.5 py-2.5 border border-gray-200">
          <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded ${getMethodColor(log.method)}`}>
            {log.method}
          </span>
        </td>
        <td className="px-1.5 py-2.5 border border-gray-200">
          <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded ${getActionColor(log.action)}`}>
            {log.action}
          </span>
        </td>
        <td className="px-1.5 py-2.5 border border-gray-200 text-[11px] text-gray-700">
          {log.resource}
          {log.resourceId && <span className="text-gray-500 ml-1">({log.resourceId})</span>}
        </td>
        <td className="px-1.5 py-2.5 border border-gray-200 text-[11px] text-gray-600 font-mono max-w-[200px] truncate" title={log.path}>
          {log.path}
        </td>
        <td className="px-1.5 py-2.5 border border-gray-200">
          <span className={`text-[11px] font-medium ${log.statusCode >= 400 ? "text-red-600" : "text-green-600"}`}>
            {log.statusCode}
          </span>
        </td>
        <td className="px-1.5 py-2.5 border border-gray-200 text-[11px] text-gray-600">{log.durationMs}ms</td>
        <td className="px-1.5 py-2.5 border border-gray-200 text-[11px] text-gray-500 font-mono">{log.ip}</td>
        <td className="px-1.5 py-2.5 border border-gray-200">
          {hasDetails && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="w-7 h-7 flex items-center justify-center rounded text-purple-600 hover:bg-purple-50"
              title={expanded ? "Hide details" : "Show details"}
            >
              <i className={`ri-${expanded ? "arrow-up-s" : "arrow-down-s"}-line text-sm`} />
            </button>
          )}
        </td>
      </tr>
      {expanded && hasDetails && (
        <tr>
          <td colSpan={10} className="px-3 py-2 border border-gray-200 bg-gray-50 text-[11px]">
            {log.errorMessage && (
              <div className="mb-2">
                <span className="font-bold text-red-600">Error: </span>
                <span className="text-red-700">{log.errorMessage}</span>
              </div>
            )}
            {log.requestMeta && Object.keys(log.requestMeta).length > 0 && (
              <details open>
                <summary className="cursor-pointer font-medium text-gray-700">Request meta</summary>
                <pre className="mt-1 p-2 bg-white rounded border text-gray-600 overflow-x-auto">
                  {JSON.stringify(log.requestMeta, null, 2)}
                </pre>
              </details>
            )}
          </td>
        </tr>
      )}
    </>
  );
};

const getActionColor = (action: string) => {
  const map: Record<string, string> = {
    create: "bg-green-100 text-green-800",
    read: "bg-cyan-100 text-cyan-800",
    update: "bg-blue-100 text-blue-800",
    delete: "bg-red-100 text-red-800",
    list: "bg-amber-100 text-amber-800",
    login: "bg-indigo-100 text-indigo-800",
    logout: "bg-gray-100 text-gray-800",
    other: "bg-gray-100 text-gray-600",
  };
  return map[action] || "bg-gray-100 text-gray-600";
};

const formatDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const getMethodColor = (method: string) => {
  const map: Record<string, string> = {
    GET: "bg-green-50 text-green-700",
    POST: "bg-blue-50 text-blue-700",
    PATCH: "bg-amber-50 text-amber-700",
    PUT: "bg-purple-50 text-purple-700",
    DELETE: "bg-red-50 text-red-700",
  };
  return map[method] || "bg-gray-50 text-gray-600";
};

const ActivityLogsTable: React.FC<ActivityLogsTableProps> = ({
  logs,
  loading,
  pagination,
  onPageChange,
  onLimitChange,
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
        <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">
          Loading Logs
        </p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-gray-400 mb-4">
          <i className="ri-file-list-line text-5xl" />
        </div>
        <h3 className="text-xs font-bold text-gray-400 mb-1">No activity logs found</h3>
        <p className="text-[11px] text-gray-500">
          Activity will appear here when you perform actions in the system.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-50/30">
            <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
              Time
            </th>
            <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
              User
            </th>
            <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
              Method
            </th>
            <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
              Action
            </th>
            <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
              Resource
            </th>
            <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
              Path
            </th>
            <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
              Status
            </th>
            <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
              Duration
            </th>
            <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
              IP
            </th>
            <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 w-10">
              Details
            </th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <LogRow key={log.id} log={log} />
          ))}
        </tbody>
      </table>

      {pagination && pagination.totalResults > 0 && (
        <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white">
          <div className="text-[11px] font-medium text-[#495057] tracking-tight">
            Showing{" "}
            {((pagination.page - 1) * pagination.limit) + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.totalResults)} of{" "}
            {pagination.totalResults.toLocaleString()} logs
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-medium text-gray-600">Rows:</label>
            <select
              className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 w-16"
              value={pagination.limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>
              <div className="flex items-center gap-1 mx-2">
                {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (pagination.totalPages <= 7) pageNum = i + 1;
                  else if (pagination.page <= 4) pageNum = i + 1;
                  else if (pagination.page >= pagination.totalPages - 3)
                    pageNum = pagination.totalPages - 6 + i;
                  else pageNum = pagination.page - 3 + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange(pageNum)}
                      className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded transition-all ${
                        pagination.page === pageNum
                          ? "bg-purple-600 text-white shadow-md"
                          : "text-gray-400 hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLogsTable;
