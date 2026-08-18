"use client";

import React, { useState } from "react";
import Link from "next/link";
import Seo from "@/shared/layout-components/seo/seo";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import SendTab from "./components/SendTab";
import ReceiveTab from "./components/ReceiveTab";
import AtVendorTab from "./components/AtVendorTab";
import NotesTab from "./components/NotesTab";

type VendorTab = "send" | "at-vendor" | "receive" | "notes";

/**
 * Yarn to Vendor — send boxes to a processor and receive them onto an LT rack.
 */
const YarnToVendorPage: React.FC = () => {
  const { hasSubPermission } = useNavigation();
  const [activeTab, setActiveTab] = useState<VendorTab>("send");
  const [refreshKey, setRefreshKey] = useState(0);

  const hasPermission = hasSubPermission("/yarn-management/purchase-management", "Yarn to Vendor");

  /**
   * Bumps list tabs after send/receive.
   */
  const bumpLists = () => setRefreshKey((k) => k + 1);

  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="py-12 text-center">
          <div className="mb-4 text-gray-400">
            <i className="ri-lock-line text-6xl" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">Access Restricted</h3>
          <p className="mb-4 text-gray-500">You don&apos;t have permission to access Yarn to Vendor.</p>
          <Link href="/yarn-management/purchase-management" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2" />
            Back to Purchase Management
          </Link>
        </div>
      </div>
    );
  }

  const tabs: { id: VendorTab; label: string; icon: string }[] = [
    { id: "send", label: "Send", icon: "ri-send-plane-line" },
    { id: "at-vendor", label: "At vendor", icon: "ri-truck-line" },
    { id: "receive", label: "Receive", icon: "ri-inbox-archive-line" },
    { id: "notes", label: "Notes", icon: "ri-file-list-3-line" },
  ];

  return (
    <div className="main-content !p-[10px] relative">
      <Seo title="Yarn to Vendor" />
      <div className="mx-0 overflow-hidden border border-gray-100 bg-white shadow-sm">
        <div className="p-[10px]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-5 w-[3px] rounded-full bg-purple-600" />
              <h1 className="text-sm font-bold text-gray-800">Yarn to Vendor</h1>
            </div>
          </div>

          <div className="mb-4 flex border-b border-gray-100" role="tablist" aria-label="Yarn to Vendor sections">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3 py-2 text-[11px] font-bold transition-colors ${
                  activeTab === tab.id ? "text-purple-600" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <i className={`${tab.icon} me-1.5 text-xs`} />
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 h-0.5 w-full rounded-t-full bg-purple-600" />
                )}
              </button>
            ))}
          </div>

          <div className="px-[10px] pb-[10px]">
            {activeTab === "send" && <SendTab onSent={bumpLists} />}
            {activeTab === "at-vendor" && <AtVendorTab refreshKey={refreshKey} />}
            {activeTab === "receive" && <ReceiveTab onReceived={bumpLists} />}
            {activeTab === "notes" && <NotesTab refreshKey={refreshKey} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default YarnToVendorPage;
