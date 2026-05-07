"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import yarnCatalogService, {
  type YarnCatalog,
} from "@/shared/services/yarnCatalogService";
import {
  yarnInventoryService,
  type YarnInventoryListResponse,
  type YarnInventoryGlobalSummaryResponse,
} from "../../services/yarnInventoryService";
import { SearchPickerDrawer, type PickerItem } from "./SearchPickerDrawer";

export type YarnOption = { value: string; label: string; catalog: YarnCatalog };

export interface YarnYarnDetailPanelProps {
  startDate: string;
  endDate: string;
  selected: YarnOption | null;
  onSelectedChange: (next: YarnOption | null) => void;
}

const safeNum = (v: unknown): number => {
  if (v === null || v === undefined || typeof v !== "number" || isNaN(v)) return 0;
  return v;
};

export function YarnYarnDetailPanel({
  startDate,
  endDate,
  selected,
  onSelectedChange,
}: YarnYarnDetailPanelProps) {
  const [summary, setSummary] = useState<YarnInventoryGlobalSummaryResponse | null>(null);
  const [inventoryRow, setInventoryRow] = useState<YarnInventoryListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [yarnDrawerOpen, setYarnDrawerOpen] = useState(false);

  useEffect(() => {
    if (!selected?.value) {
      setSummary(null);
      setInventoryRow(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [sum, inv] = await Promise.all([
          yarnInventoryService.getYarnInventoriesSummary({ yarn_id: selected.value }),
          yarnInventoryService.getYarnInventories({ yarn_id: selected.value, limit: 1, page: 1 }),
        ]);
        if (cancelled) return;
        setSummary(sum);
        setInventoryRow(inv);
      } catch (err) {
        if (cancelled) return;
        console.error("Yarn detail panel:", err);
        setError(err instanceof Error ? err.message : "Failed to load yarn details");
        setSummary(null);
        setInventoryRow(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selected?.value, startDate, endDate]);

  const fetchYarns = useCallback(
    async (params: { search: string; page: number; limit: number }) => {
      const res = await yarnCatalogService.getYarnCatalogs({
        yarnName: params.search || undefined,
        status: "active",
        limit: params.limit,
        page: params.page,
      });
      return {
        items: res.results.map((c) => ({
          id: c.id,
          label: c.yarnName,
          subtitle: [
            c.yarnType?.name,
            c.yarnSubtype?.name,
            c.blend?.name,
            c.countSize?.name,
          ]
            .filter(Boolean)
            .join(" · ") || undefined,
          _catalog: c,
        })),
        totalPages: res.totalPages,
        totalResults: res.totalResults,
        page: res.page,
      };
    },
    []
  );

  const handleYarnSelect = useCallback(
    async (item: PickerItem | null) => {
      if (!item) {
        onSelectedChange(null);
        return;
      }
      try {
        const catalog = await yarnCatalogService.getYarnCatalogById(item.id);
        onSelectedChange({ value: catalog.id, label: catalog.yarnName, catalog });
      } catch {
        onSelectedChange({
          value: item.id,
          label: item.label,
          catalog: { id: item.id, yarnName: item.label } as YarnCatalog,
        });
      }
    },
    [onSelectedChange]
  );

  const row = inventoryRow?.results?.[0];
  const liveDashboardHref = `/yarn-management/dashboard?yarn_id=${encodeURIComponent(
    selected?.value ?? ""
  )}${selected?.label ? `&yarn_name=${encodeURIComponent(selected.label)}` : ""}`;

  const buckets = summary
    ? [
        {
          label: "Long-term",
          value: `${safeNum(summary.totals.longTermKg).toLocaleString()} kg`,
          icon: "ri-archive-line",
          color: "text-blue-600",
          bg: "bg-blue-50",
        },
        {
          label: "Short-term",
          value: `${safeNum(summary.totals.shortTermKg).toLocaleString()} kg`,
          icon: "ri-inbox-line",
          color: "text-green-600",
          bg: "bg-green-50",
        },
        {
          label: "LT + ST Net",
          value: `${safeNum(summary.totals.ltPlusShortKg).toLocaleString()} kg`,
          icon: "ri-scales-3-line",
          color: "text-purple-600",
          bg: "bg-purple-50",
        },
        {
          label: "Unallocated",
          value: `${safeNum(summary.totals.unallocatedKg).toLocaleString()} kg`,
          icon: "ri-box-3-line",
          color: "text-amber-600",
          bg: "bg-amber-50",
        },
        {
          label: "Blocked",
          value: `${safeNum(summary.totals.blockedKg).toLocaleString()} kg`,
          icon: "ri-lock-line",
          color: "text-red-600",
          bg: "bg-red-50",
        },
        {
          label: "ST / Blocked Cones",
          value: `${safeNum(summary.cones.shortTerm)} / ${safeNum(summary.cones.blocked)}`,
          icon: "ri-stack-line",
          color: "text-cyan-600",
          bg: "bg-cyan-50",
        },
      ]
    : [];

  return (
    <section className="mb-5" role="region" aria-label="Selected yarn inventory detail">
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between gap-2 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600">
              <i className="ri-search-eye-line text-sm" aria-hidden />
            </div>
            <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
              Yarn Detail
            </span>
          </div>
          {selected && (
            <Link
              href={liveDashboardHref}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-600 text-white text-[10px] font-bold rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
            >
              <i className="ri-dashboard-2-line" aria-hidden />
              Live Dashboard
            </Link>
          )}
        </div>

        <div className="p-3">
          {/* Yarn picker button */}
          <div className="mb-3">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Select yarn catalog
            </label>
            <button
              type="button"
              onClick={() => setYarnDrawerOpen(true)}
              className={`flex items-center gap-2 w-full max-w-md py-2.5 px-3 border rounded-lg text-[12px] font-bold shadow-sm transition-all ${
                selected
                  ? "border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100"
                  : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              <i className="ri-shopping-bag-line text-sm" aria-hidden />
              <span className="flex-1 text-left truncate">
                {selected ? selected.label : "Search and select yarn…"}
              </span>
              <i className="ri-arrow-right-s-line text-sm text-gray-400" aria-hidden />
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2 mb-3 bg-red-50 rounded-lg border border-red-100" role="alert">
              <i className="ri-error-warning-line text-red-500" aria-hidden />
              <p className="text-[11px] text-red-700 font-medium">{error}</p>
            </div>
          )}

          {loading && selected && (
            <div className="flex items-center gap-2 py-3">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600" />
              <p className="text-[10px] text-gray-500 font-bold" role="status">
                Loading yarn details…
              </p>
            </div>
          )}

          {/* Bucket cards */}
          {buckets.length > 0 && !loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-3">
              {buckets.map((b) => (
                <div
                  key={b.label}
                  className={`rounded-lg border border-gray-100 p-2 ${b.bg} transition-shadow hover:shadow-sm`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <i className={`${b.icon} text-xs ${b.color}`} aria-hidden />
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                      {b.label}
                    </span>
                  </div>
                  <p className={`text-sm font-extrabold ${b.color} tabular-nums`}>{b.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Inventory row details */}
          {row && !loading && (
            <div className="flex flex-wrap items-center gap-4 text-[10px] text-gray-600 px-1">
              <span>
                <i className="ri-archive-line mr-1 text-blue-500" aria-hidden />
                <strong>LT cones:</strong> {row.longTermStorage.numberOfCones}
              </span>
              <span>
                <i className="ri-inbox-line mr-1 text-green-500" aria-hidden />
                <strong>ST cones:</strong> {row.shortTermStorage.numberOfCones}
              </span>
              <span>
                <i className="ri-checkbox-circle-line mr-1 text-purple-500" aria-hidden />
                <strong>Available (net):</strong>{" "}
                {Math.max(
                  0,
                  row.longTermStorage.netWeight +
                    row.shortTermStorage.netWeight -
                    (row.blockedQty ?? 0)
                ).toLocaleString()}{" "}
                kg
              </span>
            </div>
          )}
        </div>
      </div>

      <SearchPickerDrawer
        open={yarnDrawerOpen}
        title="Select Yarn"
        icon="ri-shopping-bag-line"
        selectedId={selected?.value || null}
        onSelect={handleYarnSelect}
        onClose={() => setYarnDrawerOpen(false)}
        fetchItems={fetchYarns}
      />
    </section>
  );
}
