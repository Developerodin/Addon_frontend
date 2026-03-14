"use client";

import React from "react";
import type { ActivityStatsResponse } from "@/shared/types/userActivityLog";

interface ActivityLogsStatsProps {
  stats: ActivityStatsResponse | null;
  loading: boolean;
}

const ActivityLogsStats: React.FC<ActivityLogsStatsProps> = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const { totals, byAction, byResource } = stats;

  const statCards = [
    { label: "Total Calls", value: totals.totalCalls, color: "bg-purple-50 text-purple-700 border-purple-100" },
    { label: "Creates", value: totals.creates, color: "bg-green-50 text-green-700 border-green-100" },
    { label: "Updates", value: totals.updates, color: "bg-blue-50 text-blue-700 border-blue-100" },
    { label: "Deletes", value: totals.deletes, color: "bg-red-50 text-red-700 border-red-100" },
    { label: "Reads", value: totals.reads, color: "bg-cyan-50 text-cyan-700 border-cyan-100" },
    { label: "Lists", value: totals.lists, color: "bg-amber-50 text-amber-700 border-amber-100" },
    { label: "Logins", value: totals.logins, color: "bg-indigo-50 text-indigo-700 border-indigo-100" },
    { label: "Errors", value: totals.errors, color: "bg-red-50 text-red-700 border-red-100" },
  ];

  return (
    <div className="space-y-4 mb-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {statCards.map(({ label, value, color }) => (
          <div
            key={label}
            className={`rounded border px-3 py-2 ${color}`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">
              {label}
            </div>
            <div className="text-sm font-bold">{value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded border border-gray-200 p-3">
          <h4 className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-2">
            By Action
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {byAction.map(({ _id, count }) => (
              <span
                key={_id}
                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-white border border-gray-200 text-gray-700"
              >
                {_id}: {count}
              </span>
            ))}
            {byAction.length === 0 && (
              <span className="text-[11px] text-gray-500">No data</span>
            )}
          </div>
        </div>
        <div className="bg-gray-50 rounded border border-gray-200 p-3">
          <h4 className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-2">
            By Resource
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {byResource.map(({ _id, count }) => (
              <span
                key={_id}
                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-white border border-gray-200 text-gray-700"
              >
                {_id}: {count}
              </span>
            ))}
            {byResource.length === 0 && (
              <span className="text-[11px] text-gray-500">No data</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogsStats;
