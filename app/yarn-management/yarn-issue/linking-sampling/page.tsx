"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Toaster } from "react-hot-toast";
import Seo from "@/shared/layout-components/seo/seo";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { LinkingSamplingIssuePanel } from "@/app/yarn-management/yarn-issue/linking-sampling/LinkingSamplingIssuePanel";
import { LinkingSamplingHistory } from "@/app/yarn-management/yarn-issue/linking-sampling/LinkingSamplingHistory";

const TABS = [
  {
    key: "linking" as const,
    label: "Linking",
    short: "Linking floor",
    icon: "ri-links-line",
    panelId: "yarn-issue-linking-panel",
    description: "Scan a cone and confirm weight to issue yarn to the linking floor.",
  },
  {
    key: "sampling" as const,
    label: "Sampling",
    short: "Sampling",
    icon: "ri-flask-line",
    panelId: "yarn-issue-sampling-panel",
    description: "Scan a cone and confirm weight to issue yarn for sampling.",
  },
];

type LinkingSamplingTab = (typeof TABS)[number]["key"];

/**
 * Yarn issue entry point for linking and sampling (separate production-order flow stays on /yarn-issue).
 * Layout and type scale mirror `yarn-issue/page.tsx` (Issue for orders).
 */
function YarnIssueLinkingSamplingContent() {
  const { hasSubPermission } = useNavigation();
  const allowed = hasSubPermission("/yarn-management/yarn-issue", "Linking & sampling");
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<LinkingSamplingTab>("linking");
  const [historyRefresh, setHistoryRefresh] = useState(0);

  const bumpHistory = useCallback(() => {
    setHistoryRefresh((k) => k + 1);
  }, []);

  useEffect(() => {
    const raw = searchParams?.get("tab");
    if (raw === "linking" || raw === "sampling") {
      setActiveTab(raw);
    }
  }, [searchParams]);

  const handleTabChange = useCallback((key: LinkingSamplingTab) => {
    setActiveTab(key);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", key);
    window.history.replaceState(null, "", url.pathname + url.search);
  }, []);

  if (!allowed) {
    return (
      <div className="main-content !p-[10px]">
        <Seo title="Yarn Issue — Linking & sampling" />
        <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 p-[10px]">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-gray-400 mb-4">
              <i className="ri-lock-line text-5xl" aria-hidden />
            </div>
            <h3 className="text-xs font-bold text-gray-400 mb-1">Access Restricted</h3>
            <p className="text-[11px] text-gray-500 mb-4 max-w-sm">
              You don&apos;t have permission for Yarn Issue — Linking &amp; sampling.
            </p>
            <Link
              href="/yarn-management/yarn-issue"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700"
            >
              <i className="ri-arrow-left-line" aria-hidden />
              Back to Yarn Issue
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Yarn Issue — Linking & sampling" />
      <Toaster
        position="top-center"
        containerStyle={{ zIndex: 100000 }}
        toastOptions={{
          duration: 7000,
          style: { fontSize: "13px", maxWidth: "min(28rem, 92vw)" },
          error: { duration: 9000 },
        }}
      />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px] border-b border-gray-100">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 shrink-0 mb-1">
                <div className="w-[3px] h-5 bg-purple-600 rounded-full" aria-hidden />
                <h1 className="text-sm font-bold text-gray-800">Yarn Issue · Linking &amp; sampling</h1>
              </div>
              <p className="text-[12px] text-gray-600 pl-[14px] leading-snug">
                Choose <span className="font-semibold text-gray-700">linking</span> or{" "}
                <span className="font-semibold text-gray-700">sampling</span>. Production orders stay on{" "}
                <span className="font-semibold text-gray-800">Issue for orders</span>.
              </p>
            </div>
            <Link
              href="/yarn-management/yarn-issue"
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-[11px] font-bold text-gray-700 rounded hover:bg-gray-50 transition-colors"
              aria-label="Open yarn issue for production orders"
            >
              <i className="ri-external-link-line" aria-hidden />
              Issue for orders
            </Link>
          </div>
        </div>

        <div className="border-b border-gray-100 bg-gray-50/40">
          <nav
            className="flex gap-0 px-[10px]"
            aria-label="Linking and sampling sections"
            role="tablist"
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const tabId = `yarn-issue-tab-${tab.key}`;
              return (
                <button
                  key={tab.key}
                  type="button"
                  id={tabId}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={tab.panelId}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => handleTabChange(tab.key)}
                  className={`relative flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 focus-visible:ring-offset-2 rounded-t-md ${
                    isActive
                      ? "text-purple-700"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  <i className={`${tab.icon} text-sm`} aria-hidden />
                  {tab.label}
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-2 right-2 h-0.5 bg-purple-600 rounded-t-full"
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-[10px]">
          {(() => {
            const tabMeta = TABS.find((t) => t.key === activeTab) ?? TABS[0];
            return (
              <div
                id={tabMeta.panelId}
                role="tabpanel"
                aria-labelledby={`yarn-issue-tab-${activeTab}`}
              >
                <p className="text-[11px] text-gray-500 mb-3">{tabMeta.description}</p>
                <LinkingSamplingIssuePanel
                  key={activeTab}
                  floor={activeTab}
                  floorLabel={tabMeta.label}
                  onIssueSuccess={bumpHistory}
                />
                <LinkingSamplingHistory floor={activeTab} refreshKey={historyRefresh} />
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

/**
 * Suspense boundary required by Next.js when the subtree calls `useSearchParams`.
 */
const YarnIssueLinkingSamplingPage = () => (
  <Suspense
    fallback={
      <div className="main-content !p-[10px]">
        <Seo title="Yarn Issue — Linking & sampling" />
        <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 p-[10px]">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
            <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading</p>
          </div>
        </div>
      </div>
    }
  >
    <YarnIssueLinkingSamplingContent />
  </Suspense>
);

export default YarnIssueLinkingSamplingPage;
