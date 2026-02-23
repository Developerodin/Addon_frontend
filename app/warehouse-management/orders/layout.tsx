"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ORDER_TABS = [
  { 
    key: "orders", 
    label: "Orders", 
    icon: "ri-shopping-bag-line",
    path: "/warehouse-management/orders" 
  },
  { 
    key: "inward", 
    label: "Inward", 
    icon: "ri-inbox-line",
    path: "/warehouse-management/orders/inward" 
  },
  { 
    key: "approvals", 
    label: "Approvals", 
    icon: "ri-checkbox-circle-line",
    path: "/warehouse-management/orders/approvals" 
  },
  { 
    key: "consolidation", 
    label: "Consolidation", 
    icon: "ri-stack-line",
    path: "/warehouse-management/orders/consolidation" 
  },
] as const;

function isTabActive(pathname: string, tabPath: string): boolean {
  const base = "/warehouse-management/orders";
  if (tabPath === base) {
    return (
      pathname === base ||
      pathname.startsWith(base + "/add") ||
      pathname.startsWith(base + "/edit/")
    );
  }
  return pathname === tabPath || pathname.startsWith(tabPath + "/");
}

export default function OrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="main-content !p-[10px]">
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          {/* Header Section */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Order Receiving & Consolidation</h1>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {ORDER_TABS.map((tab) => {
              const active = isTabActive(pathname, tab.path);
              return (
                <Link
                  key={tab.key}
                  href={tab.path}
                  className={`px-3 py-2 text-[11px] font-bold transition-colors relative ${
                    active
                      ? "text-purple-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <i className={`${tab.icon} me-1.5 text-xs`}></i>
                  {tab.label}
                  {active && (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 rounded-t-full"></div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-[10px]">
          {children}
        </div>
      </div>
    </div>
  );
}
