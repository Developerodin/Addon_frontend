"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  containersMasterService,
  type ContainerMaster,
} from "@/shared/services/containersMasterService";
import { PRODUCTION_FLOORS } from "@/shared/services/teamMasterService";

export interface FloorUpcomingSummary {
  floor: string;
  containerCount: number;
  totalQty: number;
  loading: boolean;
  error?: string;
}

/**
 * Sums active line quantities across containers on a floor.
 */
function computeContainerTotals(containers: ContainerMaster[]): {
  containerCount: number;
  totalQty: number;
} {
  let totalQty = 0;

  for (const container of containers) {
    const items = container.activeItems?.length
      ? container.activeItems
      : container.activeArticle
        ? [{ quantity: container.quantity ?? 0 }]
        : [];

    for (const item of items) {
      totalQty += item.quantity ?? 0;
    }
  }

  return {
    containerCount: containers.length,
    totalQty,
  };
}

/**
 * Production supervisor overview — upcoming ACTIVE containers and qty per floor.
 */
export default function SupervisorUpcomingViewTab() {
  const [loading, setLoading] = useState(false);
  const [summaries, setSummaries] = useState<FloorUpcomingSummary[]>(() =>
    PRODUCTION_FLOORS.map((floor) => ({
      floor,
      containerCount: 0,
      totalQty: 0,
      loading: false,
    })),
  );

  const load = useCallback(async () => {
    setLoading(true);
    setSummaries(
      PRODUCTION_FLOORS.map((floor) => ({
        floor,
        containerCount: 0,
        totalQty: 0,
        loading: true,
      })),
    );

    const results = await Promise.allSettled(
      PRODUCTION_FLOORS.map(async (floor) => {
        const data = await containersMasterService.getByFloorWithArticles(floor, {
          status: "ACTIVE",
          contentDomain: "production",
        });
        const totals = computeContainerTotals(data.containers ?? []);
        return {
          floor,
          containerCount: data.count ?? totals.containerCount,
          totalQty: totals.totalQty,
        };
      }),
    );

    const nextSummaries: FloorUpcomingSummary[] = results.map((result, index) => {
      const floor = PRODUCTION_FLOORS[index];
      if (result.status === "fulfilled") {
        return {
          floor,
          containerCount: result.value.containerCount,
          totalQty: result.value.totalQty,
          loading: false,
        };
      }

      const message =
        result.reason instanceof Error
          ? result.reason.message
          : "Failed to load upcoming data";

      return {
        floor,
        containerCount: 0,
        totalQty: 0,
        loading: false,
        error: message,
      };
    });

    const failedCount = nextSummaries.filter((row) => row.error).length;
    if (failedCount > 0 && failedCount < PRODUCTION_FLOORS.length) {
      toast.error(`${failedCount} floor(s) failed to load`);
    } else if (failedCount === PRODUCTION_FLOORS.length) {
      toast.error("Failed to load upcoming view");
    }

    setSummaries(nextSummaries);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(
    () =>
      summaries.reduce(
        (acc, row) => ({
          containerCount: acc.containerCount + row.containerCount,
          totalQty: acc.totalQty + row.totalQty,
        }),
        { containerCount: 0, totalQty: 0 },
      ),
    [summaries],
  );

  const floorsWithUpcoming = summaries.filter(
    (row) => row.containerCount > 0 || row.totalQty > 0,
  ).length;

  return (
    <div className="p-[10px]">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-[11px] text-[#495057]">
          Upcoming on each floor (ACTIVE containers)
          {" · "}
          <span className="font-medium">{floorsWithUpcoming}</span> floor
          {floorsWithUpcoming !== 1 ? "s" : ""} with work
          {" · "}
          <span className="font-medium">{totals.containerCount.toLocaleString()}</span> container
          {totals.containerCount !== 1 ? "s" : ""}
          {" · "}
          <span className="font-medium">{totals.totalQty.toLocaleString()}</span> total qty
        </p>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
          aria-label="Refresh upcoming view by floor"
        >
          <i className={`ri-refresh-line text-xs ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {loading && summaries.every((row) => row.loading) ? (
        <div className="flex flex-col items-center justify-center py-16" role="status" aria-live="polite">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-2" />
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Loading</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded">
          <table className="w-full border-collapse text-[11px]" aria-label="Upcoming containers and quantity by floor">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200">
                <th className="text-left pl-[10px] pr-2 py-2.5 font-bold text-[#495057] uppercase tracking-wider border-r border-gray-200">
                  Floor
                </th>
                <th className="text-right px-2 py-2.5 font-bold text-[#495057] uppercase tracking-wider border-r border-gray-200">
                  Containers
                </th>
                <th className="text-right px-2 py-2.5 pr-[10px] font-bold text-[#495057] uppercase tracking-wider">
                  Total Qty
                </th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((row) => (
                <tr
                  key={row.floor}
                  className="border-b border-gray-100 hover:bg-gray-50/50"
                >
                  <td className="pl-[10px] pr-2 py-2.5 border-r border-gray-100 font-medium text-gray-900">
                    {row.floor}
                    {row.error ? (
                      <span className="block text-[10px] font-normal text-red-600 mt-0.5">{row.error}</span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2.5 border-r border-gray-100 text-right tabular-nums text-gray-800">
                    {row.loading ? "…" : row.containerCount.toLocaleString()}
                  </td>
                  <td className="px-2 py-2.5 pr-[10px] text-right tabular-nums font-semibold text-gray-900">
                    {row.loading ? "…" : row.totalQty.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-purple-50/60 border-t border-gray-200">
                <td className="pl-[10px] pr-2 py-2.5 border-r border-gray-200 font-bold text-purple-900 uppercase tracking-wide">
                  Total
                </td>
                <td className="px-2 py-2.5 border-r border-gray-200 text-right tabular-nums font-bold text-purple-900">
                  {totals.containerCount.toLocaleString()}
                </td>
                <td className="px-2 py-2.5 pr-[10px] text-right tabular-nums font-bold text-purple-900">
                  {totals.totalQty.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
