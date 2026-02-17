"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ORDER_TABS = [
  { key: "orders", label: "Orders", path: "/warehouse-management/orders" },
  { key: "inward", label: "Inward", path: "/warehouse-management/orders/inward" },
  { key: "approvals", label: "Approvals", path: "/warehouse-management/orders/approvals" },
  { key: "consolidation", label: "Consolidation", path: "/warehouse-management/orders/consolidation" },
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
    <div className="main-content">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header with Workflow Tabs */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header">
              <h1 className="box-title text-2xl font-semibold">
                Order Receiving & Consolidation
              </h1>
              <p className="text-gray-600 mt-2">
                Manage orders, inward receiving, approvals, and consolidation.
              </p>
            </div>
            <div className="border-b border-gray-200 mt-4">
              <nav className="flex flex-wrap gap-1" aria-label="Workflow tabs">
                {ORDER_TABS.map((tab) => {
                  const active = isTabActive(pathname, tab.path);
                  return (
                    <Link
                      key={tab.key}
                      href={tab.path}
                      className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                        active
                          ? "bg-primary text-white"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                    >
                      {tab.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Nested route content */}
          {children}
        </div>
      </div>
    </div>
  );
}
