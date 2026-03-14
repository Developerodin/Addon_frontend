"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { userActivityLogService } from "@/shared/services/userActivityLogService";
import { userService } from "@/shared/services/userService";
import type { User } from "@/shared/services/userService";
import type { ActivityStatsResponse } from "@/shared/types/userActivityLog";
import ActivityLogsStats from "./ActivityLogsStats";
import ActivityLogsTable from "./ActivityLogsTable";
import {
  ACTIVITY_ACTIONS,
  HTTP_METHODS,
  SORT_BY_OPTIONS,
  SORT_ORDER_OPTIONS,
} from "@/shared/types/userActivityLog";

interface UserActivityLogsTabProps {
  /** Users list for admin selector; if empty and admin, will fetch */
  users?: User[];
}

const DEFAULT_DATE_RANGE = {
  dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  dateTo: new Date().toISOString().split("T")[0],
};

const UserActivityLogsTab: React.FC<UserActivityLogsTabProps> = ({ users: usersProp = [] }) => {
  const authUser = useSelector((state: any) => state.auth?.user);
  const isAdmin = authUser?.role === "super_admin" || authUser?.role === "admin";
  const [users, setUsers] = useState<User[]>(usersProp);

  useEffect(() => {
    if (isAdmin && usersProp.length === 0) {
      userService.getUsers({ limit: 500 }).then((r) => setUsers(r.results));
    } else if (usersProp.length > 0) {
      setUsers(usersProp);
    }
  }, [isAdmin, usersProp]);

  const [selectedUserId, setSelectedUserId] = useState<string>("me");
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<ActivityStatsResponse | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [formFilters, setFormFilters] = useState({
    action: "",
    resource: "",
    method: "",
    statusCode: "",
    errorsOnly: false,
    pathSearch: "",
    sortBy: "createdAt",
    sortOrder: "desc",
    dateFrom: DEFAULT_DATE_RANGE.dateFrom,
    dateTo: DEFAULT_DATE_RANGE.dateTo,
  });
  const [appliedFilters, setAppliedFilters] = useState({
    action: "",
    resource: "",
    method: "",
    statusCode: "",
    errorsOnly: false,
    pathSearch: "",
    sortBy: "createdAt",
    sortOrder: "desc",
    dateFrom: DEFAULT_DATE_RANGE.dateFrom,
    dateTo: DEFAULT_DATE_RANGE.dateTo,
    page: 1,
    limit: 50,
  });
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
  } | null>(null);

  const isAllLogs = selectedUserId === "all";
  const targetUser = selectedUserId === "me" ? "me" : selectedUserId;

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params = {
        page: appliedFilters.page,
        limit: appliedFilters.limit,
        action: appliedFilters.action || undefined,
        resource: appliedFilters.resource || undefined,
        method: appliedFilters.method || undefined,
        statusCode: appliedFilters.statusCode ? Number(appliedFilters.statusCode) : undefined,
        errorsOnly: appliedFilters.errorsOnly || undefined,
        pathSearch: appliedFilters.pathSearch || undefined,
        dateFrom: appliedFilters.dateFrom || undefined,
        dateTo: appliedFilters.dateTo || undefined,
        sortBy: appliedFilters.sortBy || undefined,
        sortOrder: appliedFilters.sortOrder || undefined,
      };
      const res = isAllLogs
        ? await userActivityLogService.getAllLogs(params)
        : await userActivityLogService.getLogs(targetUser, params);
      setLogs(res.results);
      setPagination({
        page: res.page,
        limit: res.limit,
        totalPages: res.totalPages,
        totalResults: res.totalResults,
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to load logs");
      setLogs([]);
      setPagination(null);
    } finally {
      setLogsLoading(false);
    }
  }, [targetUser, appliedFilters]);

  const loadStats = useCallback(async () => {
    if (isAllLogs) return;
    setStatsLoading(true);
    try {
      const res = await userActivityLogService.getStats(targetUser, {
        dateFrom: appliedFilters.dateFrom || undefined,
        dateTo: appliedFilters.dateTo || undefined,
        resource: appliedFilters.resource || undefined,
        action: appliedFilters.action || undefined,
        method: appliedFilters.method || undefined,
      });
      setStats(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load stats");
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [targetUser, isAllLogs, appliedFilters.dateFrom, appliedFilters.dateTo, appliedFilters.resource, appliedFilters.action, appliedFilters.method]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleFormFilterChange = (key: string, value: string | number | boolean) => {
    setFormFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setAppliedFilters((prev) => ({
      ...formFilters,
      page: 1,
      limit: prev.limit,
    }));
  };

  const handlePageChange = (page: number) => {
    setAppliedFilters((prev) => ({ ...prev, page }));
  };

  const handleLimitChange = (limit: number) => {
    setAppliedFilters((prev) => ({ ...prev, limit, page: 1 }));
  };

  const clearFilters = () => {
    setFormFilters({
      action: "",
      resource: "",
      method: "",
      statusCode: "",
      errorsOnly: false,
      pathSearch: "",
      sortBy: "createdAt",
      sortOrder: "desc",
      dateFrom: DEFAULT_DATE_RANGE.dateFrom,
      dateTo: DEFAULT_DATE_RANGE.dateTo,
    });
    setAppliedFilters((prev) => ({
      action: "",
      resource: "",
      method: "",
      statusCode: "",
      errorsOnly: false,
      pathSearch: "",
      sortBy: "createdAt",
      sortOrder: "desc",
      dateFrom: DEFAULT_DATE_RANGE.dateFrom,
      dateTo: DEFAULT_DATE_RANGE.dateTo,
      page: 1,
      limit: prev.limit,
    }));
  };

  const hasActiveFilters =
    formFilters.action ||
    formFilters.resource ||
    formFilters.method ||
    formFilters.statusCode ||
    formFilters.errorsOnly ||
    formFilters.pathSearch ||
    formFilters.sortBy !== "createdAt" ||
    formFilters.sortOrder !== "desc" ||
    formFilters.dateFrom !== DEFAULT_DATE_RANGE.dateFrom ||
    formFilters.dateTo !== DEFAULT_DATE_RANGE.dateTo;

  const selectedUserLabel =
    selectedUserId === "me"
      ? "My logs"
      : selectedUserId === "all"
        ? "All logs"
        : users.find((u) => u.id === selectedUserId)?.name ?? selectedUserId;

  return (
    <div className="p-[10px]">
      {/* User selector (admin only) */}
      {isAdmin && (
        <div className="mb-4">
          <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-1.5">
            View logs for
          </label>
          <select
            className="bg-white border border-gray-200 text-[11px] font-medium rounded px-3 py-1.5 w-full max-w-xs focus:ring-0 focus:border-purple-300"
            value={selectedUserId}
            onChange={(e) => {
              setSelectedUserId(e.target.value);
              setAppliedFilters((p) => ({ ...p, page: 1 }));
              if (e.target.value === "all") setStats(null);
            }}
          >
            <option value="me">My logs</option>
            {isAdmin && <option value="all">All logs (admin)</option>}
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Stats (hidden when viewing all logs) */}
      {!isAllLogs && <ActivityLogsStats stats={stats} loading={statsLoading} />}

      {/* Filters */}
      <div className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border transition-colors ${
                showFilters ? "bg-purple-100 text-purple-800 border-purple-200" : "border-gray-200 hover:bg-gray-50"
              }`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <i className="ri-filter-3-line" /> Filters {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors"
                onClick={clearFilters}
              >
                <i className="ri-close-line" /> Clear
              </button>
            )}
          </div>
          <div className="text-[11px] font-medium text-gray-500">
            Showing logs for: <span className="font-bold text-gray-700">{selectedUserLabel}</span>
          </div>
        </div>

        {showFilters && (
          <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              <div>
                <label className="text-[10px] font-medium text-gray-600 block mb-1">Action</label>
                <select
                  className="bg-white border border-gray-200 text-[11px] rounded px-2 py-1.5 w-full"
                  value={formFilters.action}
                  onChange={(e) => handleFormFilterChange("action", e.target.value)}
                >
                  <option value="">All</option>
                  {ACTIVITY_ACTIONS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-600 block mb-1">Resource</label>
                <input
                  type="text"
                  className="bg-white border border-gray-200 px-2 py-1.5 text-[11px] rounded focus:ring-0 w-full"
                  placeholder="e.g. products, orders"
                  value={formFilters.resource}
                  onChange={(e) => handleFormFilterChange("resource", e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-600 block mb-1">Method</label>
                <select
                  className="bg-white border border-gray-200 text-[11px] rounded px-2 py-1.5 w-full"
                  value={formFilters.method}
                  onChange={(e) => handleFormFilterChange("method", e.target.value)}
                >
                  <option value="">All</option>
                  {HTTP_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-600 block mb-1">Status Code</label>
                <input
                  type="number"
                  min={100}
                  max={599}
                  className="bg-white border border-gray-200 px-2 py-1.5 text-[11px] rounded focus:ring-0 w-full"
                  placeholder="100–599"
                  value={formFilters.statusCode}
                  onChange={(e) => handleFormFilterChange("statusCode", e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-600 block mb-1">Path Search</label>
                <input
                  type="text"
                  className="bg-white border border-gray-200 px-2 py-1.5 text-[11px] rounded focus:ring-0 w-full"
                  placeholder="Substring in path"
                  value={formFilters.pathSearch}
                  onChange={(e) => handleFormFilterChange("pathSearch", e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formFilters.errorsOnly}
                    onChange={(e) => handleFormFilterChange("errorsOnly", e.target.checked)}
                    className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5"
                  />
                  <span className="text-[10px] font-medium text-gray-600">Errors only</span>
                </label>
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-600 block mb-1">Date From</label>
                <input
                  type="date"
                  className="bg-white border border-gray-200 px-2 py-1.5 text-[11px] rounded focus:ring-0 w-full"
                  value={formFilters.dateFrom}
                  onChange={(e) => handleFormFilterChange("dateFrom", e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-600 block mb-1">Date To</label>
                <input
                  type="date"
                  className="bg-white border border-gray-200 px-2 py-1.5 text-[11px] rounded focus:ring-0 w-full"
                  value={formFilters.dateTo}
                  onChange={(e) => handleFormFilterChange("dateTo", e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-600 block mb-1">Sort By</label>
                <select
                  className="bg-white border border-gray-200 text-[11px] rounded px-2 py-1.5 w-full"
                  value={formFilters.sortBy}
                  onChange={(e) => handleFormFilterChange("sortBy", e.target.value)}
                >
                  {SORT_BY_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-600 block mb-1">Sort Order</label>
                <select
                  className="bg-white border border-gray-200 text-[11px] rounded px-2 py-1.5 w-full"
                  value={formFilters.sortOrder}
                  onChange={(e) => handleFormFilterChange("sortOrder", e.target.value)}
                >
                  {SORT_ORDER_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  className="px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700"
                  onClick={applyFilters}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Logs table */}
      <ActivityLogsTable
        logs={logs}
        loading={logsLoading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
      />
    </div>
  );
};

export default UserActivityLogsTab;
