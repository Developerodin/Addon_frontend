"use client";

/**
 * Warehouse Management → Inward: production receiving + WHMS inward-receive list + upcoming containers.
 */
import React, { useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import WarehouseFloorSupervisorDashboard from "@/shared/components/production/warehouse-floor/WarehouseFloorSupervisorDashboard";
import WhmsInwardReceivedTab from "@/shared/components/production/warehouse-floor/WhmsInwardReceivedTab";
import UpcomingTab from "@/app/production/floor-supervisor/components/UpcomingTab";

type InwardPageTab = "production" | "inward-received" | "upcoming";

export default function WarehouseManagementInwardPage() {
  const [tab, setTab] = useState<InwardPageTab>("inward-received");

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Warehouse Inward" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 rounded-t">
        <div className="flex border-b border-gray-300 px-[10px] pt-1 flex-wrap gap-x-1">
          <button
            type="button"
            className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
              tab === "production" ? "border-teal-600 text-teal-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setTab("production")}
          >
            Production receiving
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
              tab === "inward-received" ? "border-teal-600 text-teal-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setTab("inward-received")}
          >
            Inward Received
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
              tab === "upcoming" ? "border-amber-600 text-amber-600" : "border-transparent text-gray-500 hover:text-gray-700"
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
          <WhmsInwardReceivedTab />
        ) : (
          <div className="min-h-[280px] border-t border-gray-100">
            <UpcomingTab floorName="Warehouse" />
          </div>
        )}
      </div>
    </div>
  );
}
