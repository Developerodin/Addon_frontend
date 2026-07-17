"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PickListBatch } from "@/shared/services/whmsPickListBatchService";

const th =
  "px-3 py-2.5 text-left text-[11px] font-bold text-gray-600 uppercase tracking-wide border-b border-gray-200";
const td = "px-3 py-2.5 text-[12px] text-gray-700 border-b border-gray-100";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    picking: "bg-amber-100 text-amber-800",
    "sent-to-scanning": "bg-indigo-100 text-indigo-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${map[status] || "bg-gray-100 text-gray-700"}`}>
      {status.replace(/-/g, " ")}
    </span>
  );
}

export type PickBatchTableVariant = "active" | "history";

export interface PickBatchTableProps {
  batches: PickListBatch[];
  loading: boolean;
  variant?: PickBatchTableVariant;
}

/**
 * Table of pick-list batches — row click opens batch detail page.
 */
export default function PickBatchTable({ batches, loading, variant = "active" }: PickBatchTableProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="py-16 text-center text-gray-500">
        <i className="ri-loader-4-line animate-spin text-xl" aria-hidden />
        <p className="mt-2 text-sm">Loading pick lists…</p>
      </div>
    );
  }

  if (!batches.length) {
    return (
      <div className="py-16 text-center">
        <div className="w-12 h-12 mx-auto mb-3 bg-gray-50 rounded-full flex items-center justify-center">
          <i className="ri-inbox-line text-2xl text-gray-300" aria-hidden />
        </div>
        <p className="text-sm font-semibold text-gray-600">
          {variant === "history" ? "No completed pick lists yet" : "No active pick lists"}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {variant === "history" ? (
            "Fully picked batches appear here once all quantities are saved."
          ) : (
            <>
              Select orders on the{" "}
              <Link href="/warehouse-management/orders" className="text-purple-600 hover:underline">
                Orders
              </Link>{" "}
              page and generate a pick list.
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px]">
        <thead className="bg-gray-50/80">
          <tr>
            <th className={th}>Batch #</th>
            <th className={th}>Type</th>
            <th className={th}>Orders</th>
            <th className={th}>Items</th>
            <th className={th}>Progress</th>
            <th className={th}>Status</th>
            <th className={th}>Created</th>
          </tr>
        </thead>
        <tbody>
          {batches.map((batch) => {
            const summary = batch.summary;
            const progress = summary?.pickedProgressPct ?? 0;
            return (
              <tr
                key={batch.id}
                onClick={() => router.push(`/warehouse-management/pick-pack/${batch.id}`)}
                className="hover:bg-purple-50/40 cursor-pointer transition-colors"
                role="link"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/warehouse-management/pick-pack/${batch.id}`);
                  }
                }}
                aria-label={`Open pick list ${batch.batchNumber}`}
              >
                <td className={`${td} font-bold text-gray-900`}>{batch.batchNumber}</td>
                <td className={td}>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      batch.type === "combined" ? "bg-violet-100 text-violet-800" : "bg-sky-100 text-sky-800"
                    }`}
                  >
                    {batch.type === "combined" ? "Combined" : "Single"}
                  </span>
                </td>
                <td className={td}>
                  <span className="line-clamp-2 text-[11px]">{(batch.orderNumbers || []).join(", ")}</span>
                </td>
                <td className={td}>{summary?.itemCount ?? batch.items?.length ?? 0}</td>
                <td className={td}>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[100px]">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-gray-500 whitespace-nowrap">
                      {summary?.totalPicked ?? 0}/{summary?.totalRequired ?? 0}
                    </span>
                  </div>
                </td>
                <td className={td}>{statusBadge(batch.status)}</td>
                <td className={td}>
                  {batch.createdAt ? new Date(batch.createdAt).toLocaleString() : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
