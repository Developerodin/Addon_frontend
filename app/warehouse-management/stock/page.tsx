"use client";

/**
 * Warehouse Management → Stock: live warehouse inventory (WHMS API) + placeholder for other ops.
 */
import React, { useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import WhmsWarehouseInventoryTab from "@/shared/components/production/warehouse-floor/WhmsWarehouseInventoryTab";

type StockPageTab = "inventory" | "operations";

export default function WarehouseManagementStockPage() {
  const [tab, setTab] = useState<StockPageTab>("inventory");

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Warehouse Stock" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 rounded-t">
        <div className="flex border-b border-gray-300 px-[10px] pt-1 flex-wrap gap-x-1">
          <button
            type="button"
            className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
              tab === "inventory" ? "border-teal-600 text-teal-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setTab("inventory")}
          >
            Warehouse inventory
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-colors ${
              tab === "operations" ? "border-teal-600 text-teal-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setTab("operations")}
          >
            Operations
          </button>
        </div>

        {tab === "inventory" ? (
          <WhmsWarehouseInventoryTab />
        ) : (
          <div className="min-h-[280px] border-t border-gray-100 p-[10px] text-[11px] text-gray-600 space-y-2">
            <p className="font-semibold text-gray-800">Inbound / outbound flows</p>
            <p>
              Production receiving and inward lines live under{" "}
              <a href="/warehouse-management/inward" className="text-teal-700 font-bold hover:underline">
                Warehouse Inward
              </a>
              . Pick, pack, and orders use{" "}
              <a href="/warehouse-management/orders" className="text-teal-700 font-bold hover:underline">
                Orders
              </a>
              .
            </p>
            <p className="text-gray-400 text-[10px]">Static stock-in/out demos were removed in favor of WHMS warehouse-inventory APIs.</p>
          </div>
        )}
      </div>
    </div>
  );
}
