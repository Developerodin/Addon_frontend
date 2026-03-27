"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  getMachineAuditLogsByMachineId,
  OrderStatus,
  type MachineAuditLogChangeType,
  type MachineAuditLogsResponse,
  type MachineOrderAssignmentLog,
  type OrderStatusType,
} from "@/shared/services/machineOrderAssignmentService";

export interface MachineAuditLogsDrawerProps {
  open: boolean;
  onClose: () => void;
  machineId: string | null;
  /** Fallback label before API returns machine */
  machineLabel?: string;
}

const formatDate = (v?: string) =>
  v
    ? new Date(v).toLocaleString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

type LogChange = {
  field?: string;
  previousValue?: unknown;
  newValue?: unknown;
};

function stringifyValue(v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function parseKeyStatusChanges(changes: unknown): {
  orderStatus?: { prev: string; next: string };
  yarnIssueStatus?: { prev: string; next: string };
  yarnReturnStatus?: { prev: string; next: string };
} {
  if (!Array.isArray(changes)) return {};
  const out: {
    orderStatus?: { prev: string; next: string };
    yarnIssueStatus?: { prev: string; next: string };
    yarnReturnStatus?: { prev: string; next: string };
  } = {};
  for (const raw of changes as LogChange[]) {
    const field = String(raw?.field ?? "");
    const prev = stringifyValue(raw?.previousValue);
    const next = stringifyValue(raw?.newValue);
    if (field.endsWith(".status")) out.orderStatus = { prev, next };
    if (field.endsWith(".yarnIssueStatus")) out.yarnIssueStatus = { prev, next };
    if (field.endsWith(".yarnReturnStatus")) out.yarnReturnStatus = { prev, next };
  }
  return out;
}

function getOrderArticleLine(log: MachineOrderAssignmentLog, data: MachineAuditLogsResponse | null): string | null {
  const c0 = Array.isArray(log.changes) ? (log.changes[0] as Record<string, any>) : null;
  const order =
    log.orderNumber ?? c0?.orderNumber ?? c0?.productionOrder?.orderNumber ?? data?.assignment?.productionOrderItems?.[0]?.orderNumber;
  const article =
    log.articleNumber ?? c0?.articleNumber ?? c0?.article?.articleNumber ?? data?.assignment?.productionOrderItems?.[0]?.articleNumber;
  if (!order && !article) return null;
  return `${order ?? "—"} · ${article ?? "—"}`;
}

function defaultDateRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 7);
  const isoDay = (d: Date) => d.toISOString().slice(0, 10);
  return { dateFrom: isoDay(from), dateTo: isoDay(to) };
}

type DraftFilters = {
  dateFrom: string;
  dateTo: string;
  action: string;
  changeType: MachineAuditLogChangeType;
  orderStatus: OrderStatusType | "";
  yarnIssueStatus: string;
  yarnReturnStatus: string;
};

function emptyDraft(): DraftFilters {
  const d = defaultDateRange();
  return {
    dateFrom: d.dateFrom,
    dateTo: d.dateTo,
    action: "",
    changeType: "all",
    orderStatus: "",
    yarnIssueStatus: "",
    yarnReturnStatus: "",
  };
}

const CHANGE_TYPES: { value: MachineAuditLogChangeType; label: string }[] = [
  { value: "all", label: "All changes" },
  { value: "order_status", label: "Order status" },
  { value: "yarn_issue", label: "Yarn issue" },
  { value: "yarn_return", label: "Yarn return" },
  { value: "removal", label: "Removal" },
];

const ORDER_STATUSES: OrderStatusType[] = [
  OrderStatus.PENDING,
  OrderStatus.IN_PROGRESS,
  OrderStatus.COMPLETED,
  OrderStatus.ON_HOLD,
  OrderStatus.CANCELLED,
];

const YARN_ISSUE_OPTS = ["Not Started", "In Progress", "Completed"] as const;
const YARN_RETURN_OPTS = ["Pending", "In Progress", "Completed"] as const;

export default function MachineAuditLogsDrawer({
  open,
  onClose,
  machineId,
  machineLabel,
}: MachineAuditLogsDrawerProps) {
  const [draft, setDraft] = useState<DraftFilters>(emptyDraft);
  const [applied, setApplied] = useState<DraftFilters>(emptyDraft);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MachineAuditLogsResponse | null>(null);

  useEffect(() => {
    if (open && machineId) {
      const init = emptyDraft();
      setDraft(init);
      setApplied(init);
      setPage(1);
      setLimit(10);
      setData(null);
      setError(null);
    }
  }, [open, machineId]);

  const fetchWith = useCallback(
    async (filters: DraftFilters, pageNum: number, pageSize: number) => {
      if (!machineId || !open) return;
      setLoading(true);
      setError(null);
      try {
        const res = await getMachineAuditLogsByMachineId(machineId, {
          dateFrom: filters.dateFrom ? `${filters.dateFrom}T00:00:00.000Z` : undefined,
          dateTo: filters.dateTo ? `${filters.dateTo}T23:59:59.999Z` : undefined,
          action: filters.action.trim() || undefined,
          changeType: filters.changeType,
          orderStatus: filters.orderStatus || undefined,
          yarnIssueStatus: filters.yarnIssueStatus || undefined,
          yarnReturnStatus: filters.yarnReturnStatus || undefined,
          page: pageNum,
          limit: pageSize,
          sortBy: "createdAt:desc",
        });
        setData(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load logs");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [machineId, open]
  );

  useEffect(() => {
    if (open && machineId) {
      fetchWith(applied, page, limit);
    }
  }, [open, machineId, page, limit, applied, fetchWith]);

  const applyFilters = useCallback(() => {
    setApplied({ ...draft });
    setPage(1);
  }, [draft]);

  const resetFilters = useCallback(() => {
    const init = emptyDraft();
    setDraft(init);
    setApplied(init);
    setPage(1);
    setLimit(10);
  }, []);

  const headerMachine =
    (data?.machine as { machineCode?: string; name?: string } | null)?.machineCode ??
    (data?.machine as { machineCode?: string; name?: string } | null)?.name ??
    machineLabel ??
    "Machine";

  const logs = data?.logs?.results ?? [];
  const totalPages = Math.max(1, data?.logs?.totalPages ?? 1);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[55]" onClick={onClose} aria-hidden />
      <div
        className="fixed inset-y-0 right-0 w-full max-w-[780px] shadow-2xl z-[56] flex flex-col bg-white border-l border-gray-200"
        role="dialog"
        aria-labelledby="machine-audit-logs-title"
      >
        <div className="p-4 border-b shrink-0 flex items-start justify-between gap-2">
          <div>
            <h2 id="machine-audit-logs-title" className="text-lg font-bold text-gray-900">
              Machine logs
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{headerMachine}</p>
            {data?.message ? (
              <p className="text-[11px] text-amber-700 mt-1">{data.message}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
            aria-label="Close"
          >
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        <div className="p-3 border-b bg-gray-50 space-y-2 max-h-[45vh] overflow-y-auto shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] font-semibold text-gray-600">
              From
              <input
                type="date"
                value={draft.dateFrom}
                onChange={(e) => setDraft((d) => ({ ...d, dateFrom: e.target.value }))}
                className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1 text-[11px]"
              />
            </label>
            <label className="text-[10px] font-semibold text-gray-600">
              To
              <input
                type="date"
                value={draft.dateTo}
                onChange={(e) => setDraft((d) => ({ ...d, dateTo: e.target.value }))}
                className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1 text-[11px]"
              />
            </label>
          </div>
          <label className="text-[10px] font-semibold text-gray-600 block">
            Action (exact)
            <input
              type="text"
              value={draft.action}
              onChange={(e) => setDraft((d) => ({ ...d, action: e.target.value }))}
              placeholder="e.g. Assignment Item Status Changed"
              className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1 text-[11px]"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] font-semibold text-gray-600">
              Change type
              <select
                value={draft.changeType}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, changeType: e.target.value as MachineAuditLogChangeType }))
                }
                className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1 text-[11px] bg-white"
              >
                {CHANGE_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[10px] font-semibold text-gray-600">
              Order line status
              <select
                value={draft.orderStatus}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    orderStatus: (e.target.value || "") as OrderStatusType | "",
                  }))
                }
                className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1 text-[11px] bg-white"
              >
                <option value="">Any</option>
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] font-semibold text-gray-600">
              Yarn issue
              <select
                value={draft.yarnIssueStatus}
                onChange={(e) => setDraft((d) => ({ ...d, yarnIssueStatus: e.target.value }))}
                className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1 text-[11px] bg-white"
              >
                <option value="">Any</option>
                {YARN_ISSUE_OPTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[10px] font-semibold text-gray-600">
              Yarn return
              <select
                value={draft.yarnReturnStatus}
                onChange={(e) => setDraft((d) => ({ ...d, yarnReturnStatus: e.target.value }))}
                className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1 text-[11px] bg-white"
              >
                <option value="">Any</option>
                {YARN_RETURN_OPTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={applyFilters}
              disabled={loading}
              className="px-3 py-1.5 text-[11px] font-bold bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? "Loading…" : "Apply filters"}
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="px-3 py-1.5 text-[11px] font-medium bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Reset
            </button>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="text-[11px] border border-gray-300 rounded px-2 py-1 bg-white"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-3">
          {error && (
            <div className="mb-2 text-[11px] text-red-600 font-medium">{error}</div>
          )}
          {loading && logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500 text-sm">
              <span className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent mb-2" />
              Loading logs…
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">No logs for this range.</p>
          ) : (
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="text-left border-b border-gray-200 text-gray-600">
                  <th className="pb-2 pr-2 font-semibold">Time</th>
                  <th className="pb-2 pr-2 font-semibold">User</th>
                  <th className="pb-2 pr-2 font-semibold">Action</th>
                  <th className="pb-2 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: MachineOrderAssignmentLog, idx: number) => (
                  (() => {
                    const keyChanges = parseKeyStatusChanges(log.changes);
                    const orderArticleLine = getOrderArticleLine(log, data);
                    return (
                  <tr key={log.id ?? idx} className="border-b border-gray-100 align-top">
                    <td className="py-2 pr-2 text-gray-600 whitespace-nowrap">
                      {formatDate(log.timestamp ?? log.createdAt)}
                    </td>
                    <td className="py-2 pr-2 break-words max-w-[100px]">
                      {log.userName ?? log.userId ?? "—"}
                    </td>
                    <td className="py-2 pr-2">{log.action ?? "—"}</td>
                    <td className="py-2 text-gray-700 break-words">
                      <div className="space-y-1">
                        {orderArticleLine ? (
                          <div className="text-[10px] text-gray-800">
                            <span className="font-semibold">Order · Article:</span> {orderArticleLine}
                          </div>
                        ) : null}
                        {log.remarks ? (
                          <div className="text-[10px] text-gray-700">
                            <span className="font-semibold">Remarks:</span> {log.remarks}
                          </div>
                        ) : null}
                        {keyChanges.orderStatus ? (
                          <div className="text-[10px]">
                            <span className="font-semibold text-indigo-700">Order:</span>{" "}
                            <span>{keyChanges.orderStatus.prev}</span>
                            <span className="text-gray-500"> → </span>
                            <span className="font-semibold">{keyChanges.orderStatus.next}</span>
                          </div>
                        ) : null}
                        {keyChanges.yarnIssueStatus ? (
                          <div className="text-[10px]">
                            <span className="font-semibold text-amber-700">Yarn Issue:</span>{" "}
                            <span>{keyChanges.yarnIssueStatus.prev}</span>
                            <span className="text-gray-500"> → </span>
                            <span className="font-semibold">{keyChanges.yarnIssueStatus.next}</span>
                          </div>
                        ) : null}
                        {keyChanges.yarnReturnStatus ? (
                          <div className="text-[10px]">
                            <span className="font-semibold text-emerald-700">Yarn Return:</span>{" "}
                            <span>{keyChanges.yarnReturnStatus.prev}</span>
                            <span className="text-gray-500"> → </span>
                            <span className="font-semibold">{keyChanges.yarnReturnStatus.next}</span>
                          </div>
                        ) : null}
                        {log.changes?.length ? (
                          <pre className="text-[10px] whitespace-pre-wrap font-mono bg-gray-50 p-1 rounded max-h-32 overflow-auto">
                            {JSON.stringify(log.changes, null, 2)}
                          </pre>
                        ) : (
                          "—"
                        )}
                      </div>
                    </td>
                  </tr>
                    );
                  })()
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-3 border-t bg-gray-50 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-gray-600">
            {data?.logs?.totalResults != null ? `${data.logs.totalResults} entries` : null}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2 py-1 text-[11px] border rounded disabled:opacity-40"
            >
              Prev
            </button>
            <span className="text-[11px] text-gray-600">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="px-2 py-1 text-[11px] border rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
