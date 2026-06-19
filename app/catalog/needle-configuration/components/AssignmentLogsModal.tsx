"use client";

import React, { useState, useEffect } from "react";
import {
  getAssignmentLogs,
  MachineOrderAssignmentLog,
} from "@/shared/services/machineOrderAssignmentService";

export interface AssignmentLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: string;
  assignmentLabel?: string;
}

/** Never render a raw object as a child: extract a name/email/id, else a dash. */
const renderUser = (u: unknown): string => {
  if (u == null || u === "") return "-";
  if (typeof u === "object") {
    const o = u as { name?: string; fullName?: string; email?: string; userName?: string; id?: string; _id?: string };
    return o.name ?? o.fullName ?? o.email ?? o.userName ?? o.id ?? o._id ?? "-";
  }
  return String(u);
};

const formatDate = (v?: string) =>
  v
    ? new Date(v).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

export default function AssignmentLogsModal({
  isOpen,
  onClose,
  assignmentId,
  assignmentLabel,
}: AssignmentLogsModalProps) {
  const [logs, setLogs] = useState<MachineOrderAssignmentLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchLogs = async () => {
    if (!assignmentId) return;
    setLoading(true);
    try {
      const { results } = await getAssignmentLogs(assignmentId, {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        limit: 100,
      });
      setLogs(results);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && assignmentId) fetchLogs();
  }, [isOpen, assignmentId]);

  useEffect(() => {
    if (isOpen && assignmentId && (dateFrom || dateTo)) {
      fetchLogs();
    }
  }, [dateFrom, dateTo]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-white shadow-2xl flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">
            Logs {assignmentLabel ? `– ${assignmentLabel}` : ""}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <i className="ri-close-line text-2xl" />
          </button>
        </div>
        <div className="p-4 border-b flex flex-wrap gap-2 items-center shrink-0">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={fetchLogs}
              disabled={loading}
              className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              {loading ? "Loading…" : "Apply"}
            </button>
        </div>
        <div className="p-4 overflow-auto flex-1 min-h-0">
            {loading && logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Loading logs…</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No logs found.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b text-gray-600">
                    <th className="pb-2 pr-2">Time</th>
                    <th className="pb-2 pr-2">User</th>
                    <th className="pb-2 pr-2">Action</th>
                    <th className="pb-2">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => (
                    <tr key={log.id ?? idx} className="border-b border-gray-100">
                      <td className="py-1.5 pr-2 text-gray-600">
                        {formatDate(log.timestamp ?? log.createdAt)}
                      </td>
                      <td className="py-1.5 pr-2">
                        {renderUser(log.userName ?? log.userId)}
                      </td>
                      <td className="py-1.5 pr-2">{log.action ?? "-"}</td>
                      <td className="py-1.5">
                        {log.changes?.length
                          ? JSON.stringify(log.changes)
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      </div>
    </>
  );
}
