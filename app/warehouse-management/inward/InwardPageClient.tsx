"use client";

/**
 * Reads query params for deep links from Vendor Dispatch → WHMS inward receive.
 */
import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import WarehouseFloorSupervisorDashboard from "@/shared/components/production/warehouse-floor/WarehouseFloorSupervisorDashboard";
import WhmsInwardReceivedTab from "@/shared/components/production/warehouse-floor/WhmsInwardReceivedTab";
import { VendorFloorUpcomingContainersTab } from "@/app/vendor-po/components/VendorFloorUpcomingContainersTab";
import UpcomingTab from "@/app/production/floor-supervisor/components/UpcomingTab";

type InwardPageTab = "production" | "inward-received" | "upcoming";

/** Maps `?tab=` to an inward page tab, or null if missing/invalid. */
function tabFromQuery(raw: string | null): InwardPageTab | null {
  if (raw === "production" || raw === "inward-received" || raw === "upcoming") return raw;
  if (raw === "vendor-receive") return "inward-received";
  return null;
}

/** Tab shell: syncs active tab from the URL when using deep links from vendor dispatch. */
function InwardPageInner() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<InwardPageTab>("inward-received");
  const [upcomingMode, setUpcomingMode] = useState<"vendor" | "production">("vendor");

  const inwardSourceParam = searchParams?.get("inwardSource");
  const vendorFlowId = searchParams?.get("vendorProductionFlowId")?.trim() || undefined;

  const initialSourceFilter = useMemo((): "all" | "vendor" | "production" | undefined => {
    if (inwardSourceParam === "vendor") return "vendor";
    if (inwardSourceParam === "production") return "production";
    return undefined;
  }, [inwardSourceParam]);

  useEffect(() => {
    const t = tabFromQuery(searchParams?.get("tab") ?? null);
    if (t) setTab(t);
    if (inwardSourceParam === "vendor") setUpcomingMode("vendor");
    if (inwardSourceParam === "production") setUpcomingMode("production");
  }, [searchParams, inwardSourceParam]);

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Warehouse Inward" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 rounded-t">
        <div className="flex border-b border-gray-300 px-[10px] pt-1 flex-wrap gap-x-1">
          <button
            type="button"
            className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
              tab === "production"
                ? "border-teal-600 text-teal-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setTab("production")}
          >
            Production receiving
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
              tab === "inward-received"
                ? "border-teal-600 text-teal-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setTab("inward-received")}
          >
            Inward Received
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
              tab === "upcoming"
                ? "border-amber-600 text-amber-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setTab("upcoming")}
          >
            Upcoming
          </button>
        </div>

        {tab === "production" ? (
          <WarehouseFloorSupervisorDashboard
            showPageChrome={false}
            seoTitle="Warehouse Inward — Production"
            pageHeading="Warehouse Inward"
            helpTitle="Warehouse Inward — Production receiving"
          />
        ) : tab === "inward-received" ? (
          <WhmsInwardReceivedTab
            key={vendorFlowId ?? "default"}
            initialSourceFilter={initialSourceFilter}
            initialVendorProductionFlowId={vendorFlowId}
          />
        ) : (
          <div className="min-h-[280px] border-t border-gray-100 p-[10px] space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Upcoming view:</span>
              <button
                type="button"
                className={`px-2.5 py-1 text-[10px] font-bold rounded border ${
                  upcomingMode === "vendor"
                    ? "bg-teal-600 text-white border-teal-600"
                    : "bg-white text-gray-600 border-gray-300"
                }`}
                onClick={() => setUpcomingMode("vendor")}
              >
                Vendor bags (Warehouse Inward)
              </button>
              <button
                type="button"
                className={`px-2.5 py-1 text-[10px] font-bold rounded border ${
                  upcomingMode === "production"
                    ? "bg-teal-600 text-white border-teal-600"
                    : "bg-white text-gray-600 border-gray-300"
                }`}
                onClick={() => setUpcomingMode("production")}
              >
                Production (Warehouse)
              </button>
            </div>
            {upcomingMode === "vendor" ? (
              <VendorFloorUpcomingContainersTab floorName="Warehouse Inward" />
            ) : (
              <UpcomingTab floorName="Warehouse" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function InwardPageClient() {
  return (
    <Suspense
      fallback={
        <div className="main-content !p-[10px] flex flex-col items-center justify-center min-h-[240px]">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-teal-600 border-t-transparent mb-3" />
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Loading inward…</p>
        </div>
      }
    >
      <InwardPageInner />
    </Suspense>
  );
}
