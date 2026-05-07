"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";
import yarnCatalogService from "@/shared/services/yarnCatalogService";
import {
  yarnInventoryService,
  type PoAnalyticsResponse,
  type YarnTransactionAnalyticsResponse,
  type YarnClosingTrendResponse,
} from "../services/yarnInventoryService";
import type { YarnPoStatus } from "./yarnPoStatuses";
import { YarnAnalyticsToolbar } from "./components/YarnAnalyticsToolbar";
import { YarnAnalyticsKpiSection } from "./components/YarnAnalyticsKpiSection";
import { YarnPoAnalyticsCharts } from "./components/YarnPoAnalyticsCharts";
import {
  YarnYarnDetailPanel,
  type YarnOption,
} from "./components/YarnYarnDetailPanel";
import { YarnPoHistorySection } from "./components/YarnPoHistorySection";
import { PoDrillDownDrawer } from "./components/PoDrillDownDrawer";
import HelpIcon from "@/shared/components/HelpIcon";

type AnalyticsTab = "purchase-orders" | "yarn";

const TABS: { key: AnalyticsTab; label: string; icon: string }[] = [
  { key: "purchase-orders", label: "Purchase Orders", icon: "ri-file-list-3-line" },
  { key: "yarn", label: "Yarn Analytics", icon: "ri-shopping-bag-line" },
];

const DEFAULT_YARN_ANALYTICS_START = "2025-09-08";
const FILTER_DEBOUNCE_MS = 380;

const formatLocalYmd = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

function YarnAnalyticsPageContent() {
  const { hasSubPermission } = useNavigation();
  const hasPermission = hasSubPermission("/yarn-management", "Analytics & reports");
  const searchParams = useSearchParams();
  const yarnParam = searchParams?.get("yarn_catalog_id") ?? searchParams?.get("yarn_id") ?? null;

  const now = new Date();
  const todayStr = formatLocalYmd(now);

  const [activeTab, setActiveTab] = useState<AnalyticsTab>("purchase-orders");
  const [startDate, setStartDate] = useState(() => {
    const start =
      DEFAULT_YARN_ANALYTICS_START > todayStr ? todayStr : DEFAULT_YARN_ANALYTICS_START;
    return start;
  });
  const [endDate, setEndDate] = useState(todayStr);

  // PO tab filters
  const [dateMode, setDateMode] = useState<"created" | "received">("created");
  const [includeDraft, setIncludeDraft] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [supplierLabel, setSupplierLabel] = useState("");
  const [statuses, setStatuses] = useState<YarnPoStatus[]>([]);

  // PO tab data
  const [poLoading, setPoLoading] = useState(false);
  const [analytics, setAnalytics] = useState<PoAnalyticsResponse | null>(null);

  // Yarn tab data
  const [selectedYarn, setSelectedYarn] = useState<YarnOption | null>(null);
  const [yarnLoading, setYarnLoading] = useState(false);
  const [txnAnalytics, setTxnAnalytics] = useState<YarnTransactionAnalyticsResponse | null>(null);
  const [closingTrend, setClosingTrend] = useState<YarnClosingTrendResponse | null>(null);

  // PO drill-down
  const [drillOpen, setDrillOpen] = useState(false);
  const [drillTitle, setDrillTitle] = useState("");
  const [drillSlice, setDrillSlice] = useState<{
    group_by?: "supplier" | "status" | "yarn";
    group_id?: string;
  } | null>(null);

  // Drill-down params use PO filters only (no yarn filter)
  const drillLoadParams = useMemo(() => {
    if (!drillOpen) return null;
    return {
      start_date: startDate,
      end_date: endDate,
      date_mode: dateMode,
      supplier_id: supplierId || undefined,
      status: statuses.length ? statuses.join(",") : undefined,
      include_draft: includeDraft,
      ...(drillSlice?.group_by && drillSlice.group_id
        ? { group_by: drillSlice.group_by, group_id: drillSlice.group_id }
        : {}),
    };
  }, [drillOpen, startDate, endDate, dateMode, supplierId, statuses, includeDraft, drillSlice]);

  const handleSupplierSelect = useCallback((id: string, label: string) => {
    setSupplierId(id);
    setSupplierLabel(label);
  }, []);

  // ─── PO analytics fetch (no yarn filter — returns ALL POs) ───
  const fetchPoAnalytics = useCallback(
    async (showToast: boolean) => {
      if (startDate > endDate) {
        if (showToast) toast.error("Start date must be before or equal to end date");
        return;
      }
      setPoLoading(true);
      try {
        const po = await yarnInventoryService.getPoAnalytics({
          start_date: startDate,
          end_date: endDate,
          date_mode: dateMode,
          supplier_id: supplierId || undefined,
          status: statuses.length ? statuses.join(",") : undefined,
          include_draft: includeDraft,
        });
        setAnalytics(po);
        if (showToast) toast.success("PO analytics updated");
      } catch (err) {
        console.error("PO analytics:", err);
        toast.error(err instanceof Error ? err.message : "Failed to load PO analytics");
        setAnalytics(null);
      } finally {
        setPoLoading(false);
      }
    },
    [startDate, endDate, dateMode, supplierId, statuses, includeDraft]
  );

  // ─── Yarn analytics fetch (uses selectedYarn) ───
  const fetchYarnAnalytics = useCallback(async () => {
    if (startDate > endDate) return;
    setYarnLoading(true);
    try {
      const [ta, ct] = await Promise.all([
        yarnInventoryService.getYarnTransactionAnalytics({
          start_date: startDate,
          end_date: endDate,
          yarn_catalog_id: selectedYarn?.value || undefined,
        }),
        selectedYarn?.value
          ? yarnInventoryService.getYarnClosingTrend({
              yarn_catalog_id: selectedYarn.value,
              start_date: startDate,
              end_date: endDate,
            })
          : Promise.resolve(null),
      ]);
      setTxnAnalytics(ta);
      setClosingTrend(ct);
    } catch (err) {
      console.error("Yarn analytics:", err);
      setTxnAnalytics(null);
      setClosingTrend(null);
    } finally {
      setYarnLoading(false);
    }
  }, [startDate, endDate, selectedYarn?.value]);

  // Refresh button fetches data for the active tab
  const handleRefresh = useCallback(async () => {
    if (activeTab === "purchase-orders") {
      await fetchPoAnalytics(true);
    } else {
      await fetchYarnAnalytics();
      toast.success("Yarn analytics updated");
    }
  }, [activeTab, fetchPoAnalytics, fetchYarnAnalytics]);

  // Preselect yarn from URL only (no auto-select of first yarn)
  useEffect(() => {
    if (!hasPermission || !yarnParam) return;
    let cancelled = false;
    (async () => {
      try {
        const c = await yarnCatalogService.getYarnCatalogById(yarnParam);
        if (!cancelled) {
          setSelectedYarn({ value: c.id, label: c.yarnName, catalog: c });
          setActiveTab("yarn");
        }
      } catch (err) {
        if (!cancelled) console.error("Yarn preselect:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [hasPermission, yarnParam]);

  // Auto-fetch PO analytics when PO filters change
  useEffect(() => {
    if (!hasPermission || startDate > endDate) return;
    const t = window.setTimeout(() => { void fetchPoAnalytics(false); }, FILTER_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [hasPermission, startDate, endDate, dateMode, supplierId, statuses, includeDraft, fetchPoAnalytics]);

  // Auto-fetch yarn analytics when yarn selection or dates change
  useEffect(() => {
    if (!hasPermission || startDate > endDate) return;
    const t = window.setTimeout(() => { void fetchYarnAnalytics(); }, FILTER_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [hasPermission, startDate, endDate, selectedYarn?.value, fetchYarnAnalytics]);

  const openAllPoDrill = () => {
    setDrillTitle("Purchase orders in range");
    setDrillSlice(null);
    setDrillOpen(true);
  };

  const onSupplierBarSelect = useCallback((sid: string | null, name: string) => {
    if (!sid) {
      toast.error("Cannot drill: supplier id missing for this row");
      return;
    }
    setDrillTitle(`POs — ${name}`);
    setDrillSlice({ group_by: "supplier", group_id: sid });
    setDrillOpen(true);
  }, []);

  const closeDrill = () => {
    setDrillOpen(false);
    setDrillSlice(null);
    setDrillTitle("");
  };

  const loading = poLoading || yarnLoading;

  if (!hasPermission) {
    return (
      <div className="main-content !p-[10px]">
        <div className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden mx-0 p-[10px]">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <i className="ri-lock-line text-2xl text-gray-400" />
            </div>
            <h3 className="text-sm font-bold text-gray-500 mb-1">Access Restricted</h3>
            <p className="text-[11px] text-gray-400 mb-4">
              You need Analytics &amp; reports permission.
            </p>
            <Link
              href="/yarn-management/dashboard"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-[11px] font-bold rounded-lg hover:bg-purple-700 shadow-sm transition-colors"
            >
              <i className="ri-arrow-left-line" /> Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Yarn Analytics" />

      <div className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden mx-0">
        {/* ─── Page header ─── */}
        <div className="p-[10px] border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link
              href="/yarn-management/dashboard"
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
              aria-label="Back to dashboard"
            >
              <i className="ri-arrow-left-line text-lg" />
            </Link>
            <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
            <h1 className="text-sm font-bold text-gray-800">Yarn Analytics</h1>
            <HelpIcon
              title="Yarn Analytics"
              content={
                <div>
                  <p className="mb-4">
                    Comprehensive analytics for yarn purchase orders, inventory movements, and stock trends.
                  </p>
                  <h4 className="font-semibold mb-2">Purchase Orders tab:</h4>
                  <ul className="list-disc list-inside mb-4 space-y-1">
                    <li><strong>KPIs:</strong> PO counts, quantities, fulfilment rate</li>
                    <li><strong>Supplier chart:</strong> Click bars to drill into POs</li>
                    <li><strong>Status donut:</strong> See PO status distribution</li>
                    <li><strong>Top yarns:</strong> Most ordered yarn catalogs</li>
                  </ul>
                  <h4 className="font-semibold mb-2">Yarn Analytics tab:</h4>
                  <ul className="list-disc list-inside mb-4 space-y-1">
                    <li><strong>Yarn picker:</strong> Search any yarn for inventory detail</li>
                    <li><strong>Inventory buckets:</strong> LT, ST, blocked, unallocated</li>
                    <li><strong>Movements:</strong> Transaction type breakdown</li>
                    <li><strong>Closing trend:</strong> Daily closing stock chart</li>
                  </ul>
                  <h4 className="font-semibold mb-2">Tips:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Date range is shared across both tabs</li>
                    <li>Filters auto-apply after a short delay</li>
                  </ul>
                </div>
              }
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-gray-600 whitespace-nowrap">From</span>
            <input
              type="date"
              className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[11px] focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none bg-white shadow-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              aria-label="Analytics start date"
            />
            <span className="text-[11px] font-medium text-gray-600">To</span>
            <input
              type="date"
              className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[11px] focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none bg-white shadow-sm"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              aria-label="Analytics end date"
            />
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-purple-200 text-purple-700 text-[11px] font-bold rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              aria-label="Refresh analytics"
            >
              {loading ? (
                <i className="ri-loader-4-line animate-spin text-sm" aria-hidden />
              ) : (
                <i className="ri-refresh-line text-sm" aria-hidden />
              )}
              Refresh
            </button>
          </div>
        </div>

        {/* ─── Tab bar ─── */}
        <div className="border-b border-gray-200 bg-gray-50/50">
          <nav className="flex px-[10px]" aria-label="Analytics tabs" role="tablist">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    relative flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-bold transition-colors
                    ${isActive
                      ? "text-purple-700"
                      : "text-gray-500 hover:text-gray-800"
                    }
                  `}
                >
                  <i className={`${tab.icon} text-sm`} aria-hidden />
                  {tab.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-purple-600 rounded-t-full" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ─── Tab content ─── */}
        <div className="p-[10px]">
          {/* ═══ PURCHASE ORDERS TAB ═══ */}
          {activeTab === "purchase-orders" && (
            <div role="tabpanel" aria-label="Purchase Orders">
              {/* Loading skeleton (initial PO load) */}
              {poLoading && !analytics && (
                <div className="flex flex-col items-center justify-center py-20 mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
                  <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">
                    Loading PO Analytics
                  </p>
                </div>
              )}

              {/* Updating indicator */}
              {poLoading && analytics && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-purple-600" />
                  <p className="text-[10px] text-purple-700 font-bold">Updating PO charts…</p>
                </div>
              )}

              <YarnAnalyticsToolbar
                dateMode={dateMode}
                onDateModeChange={setDateMode}
                includeDraft={includeDraft}
                onIncludeDraftChange={setIncludeDraft}
                supplierId={supplierId}
                supplierLabel={supplierLabel}
                onSupplierSelect={handleSupplierSelect}
                statuses={statuses}
                onStatusesChange={setStatuses}
              />

              <YarnAnalyticsKpiSection data={analytics} />

              <YarnPoAnalyticsCharts
                analytics={analytics}
                transactionAnalytics={null}
                closingTrend={null}
                onSupplierBarSelect={onSupplierBarSelect}
              />

              {analytics && (
                <div className="flex justify-center mb-4">
                  <button
                    type="button"
                    onClick={openAllPoDrill}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors shadow-sm"
                  >
                    <i className="ri-list-check text-sm" aria-hidden />
                    View all POs in range ({analytics.cards.poCount})
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ═══ YARN ANALYTICS TAB ═══ */}
          {activeTab === "yarn" && (
            <div role="tabpanel" aria-label="Yarn Analytics">
              {/* Updating indicator */}
              {yarnLoading && txnAnalytics && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-purple-600" />
                  <p className="text-[10px] text-purple-700 font-bold">Updating yarn charts…</p>
                </div>
              )}

              <YarnYarnDetailPanel
                startDate={startDate}
                endDate={endDate}
                selected={selectedYarn}
                onSelectedChange={setSelectedYarn}
              />

              {selectedYarn && (
                <YarnPoHistorySection
                  yarnCatalogId={selectedYarn.value}
                  yarnName={selectedYarn.label}
                />
              )}

              <YarnPoAnalyticsCharts
                analytics={null}
                transactionAnalytics={txnAnalytics}
                closingTrend={closingTrend}
                onSupplierBarSelect={undefined}
              />
            </div>
          )}
        </div>
      </div>

      <PoDrillDownDrawer
        open={drillOpen}
        title={drillTitle}
        onClose={closeDrill}
        loadParams={drillLoadParams}
      />
    </div>
  );
}

export default function YarnAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="main-content !p-[10px]">
          <div className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden p-8">
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
              <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">
                Loading Yarn Analytics
              </p>
            </div>
          </div>
        </div>
      }
    >
      <YarnAnalyticsPageContent />
    </Suspense>
  );
}
