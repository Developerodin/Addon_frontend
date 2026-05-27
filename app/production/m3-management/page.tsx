"use client";

import React, { useCallback, useEffect, useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import {
  productionService,
  type M3ArticleRow,
  type M3ArticleSummary,
  type M3Statistics,
} from "@/shared/services/productionService";
import ArticleViewTab from "./components/ArticleViewTab";
import OrdersViewTab from "./components/OrdersViewTab";
import LogsTab from "./components/LogsTab";
import M3OutwardDrawer from "./components/M3OutwardDrawer";
import M3ArticleDetailDrawer from "./components/M3ArticleDetailDrawer";

type M3Tab = "orders" | "article-view" | "logs";

/**
 * M3 Management — track M3 quantity and ledger across production floors.
 */
export default function M3ManagementPage() {
  const [activeTab, setActiveTab] = useState<M3Tab>("article-view");
  const [rows, setRows] = useState<M3ArticleRow[]>([]);
  const [stats, setStats] = useState<M3Statistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [refreshKey, setRefreshKey] = useState(0);

  const [outwardRow, setOutwardRow] = useState<M3ArticleRow | null>(null);
  const [isOutwardSubmitting, setIsOutwardSubmitting] = useState(false);

  const [detailSummary, setDetailSummary] = useState<M3ArticleSummary | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [articlesRes, statsRes] = await Promise.all([
        productionService.getM3Articles({ limit: 2000 }),
        productionService.getM3Statistics(),
      ]);
      if (articlesRes.success && articlesRes.data) {
        setRows(articlesRes.data.results ?? []);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load M3 data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData, refreshKey]);

  const handleView = async (row: M3ArticleRow) => {
    setShowDetail(true);
    setDetailLoading(true);
    setDetailSummary(null);
    try {
      const id = row._id ?? row.id;
      const res = await productionService.getM3ArticleSummary(id, 30);
      if (res.success && res.data) {
        setDetailSummary(res.data);
      } else {
        toast.error("Failed to load article summary");
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOutwardSubmit = async (quantity: number, remarks: string) => {
    if (!outwardRow) return;
    setIsOutwardSubmitting(true);
    try {
      const id = outwardRow._id ?? outwardRow.id;
      const res = await productionService.markM3Outward(id, { quantity, remarks });
      if (!res.success) {
        throw new Error(res.error?.message || "Outward failed");
      }
      toast.success("M3 marked outward");
      setOutwardRow(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Outward failed");
    } finally {
      setIsOutwardSubmitting(false);
    }
  };

  return (
    <>
      <Seo title="M3 Management" />
      <div className="main-content !p-[10px]">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-[10px]">
          <header className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-3">
            <div className="w-1 h-8 bg-orange-600 rounded" aria-hidden="true" />
            <div>
              <h1 className="text-sm font-bold text-gray-900">M3 Management</h1>
              <p className="text-[10px] text-gray-500">
                Track minor defects (M3) by order and article — entries by floor &amp; outward ledger
              </p>
            </div>
          </header>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            {[
              { label: "Articles", value: stats?.articleCount ?? "—", accent: "border-gray-300" },
              { label: "M3 on hand", value: stats?.totalOnHand ?? "—", accent: "border-orange-200 bg-orange-50" },
              { label: "Outwarded", value: stats?.totalOutwarded ?? "—", accent: "border-orange-200 bg-orange-50" },
              { label: "Available", value: stats?.totalAvailable ?? "—", accent: "border-orange-300 bg-orange-50" },
            ].map((tile) => (
              <div key={tile.label} className={`rounded border-2 ${tile.accent} p-2`}>
                <div className="text-[10px] font-bold text-gray-600 uppercase">{tile.label}</div>
                <div className="text-lg font-bold text-gray-900">{tile.value}</div>
              </div>
            ))}
          </div>

          <div className="flex border-b border-gray-300 mb-3">
            <button
              type="button"
              className={`px-3 py-2 text-[11px] font-bold border-b-2 ${activeTab === "orders" ? "border-orange-600 text-orange-600" : "border-transparent text-gray-500"}`}
              onClick={() => setActiveTab("orders")}
            >
              Orders
            </button>
            <button
              type="button"
              className={`px-3 py-2 text-[11px] font-bold border-b-2 ${activeTab === "article-view" ? "border-orange-600 text-orange-600" : "border-transparent text-gray-500"}`}
              onClick={() => setActiveTab("article-view")}
            >
              Article View
            </button>
            <button
              type="button"
              className={`px-3 py-2 text-[11px] font-bold border-b-2 ${activeTab === "logs" ? "border-orange-600 text-orange-600" : "border-transparent text-gray-500"}`}
              onClick={() => setActiveTab("logs")}
            >
              Logs
            </button>
          </div>

          {activeTab === "orders" ? (
            <OrdersViewTab
              rows={rows}
              isLoading={isLoading}
              onView={handleView}
              onOutward={setOutwardRow}
            />
          ) : activeTab === "article-view" ? (
            <ArticleViewTab
              rows={rows}
              isLoading={isLoading}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={setItemsPerPage}
              onView={handleView}
              onOutward={setOutwardRow}
            />
          ) : (
            <LogsTab refreshKey={refreshKey} />
          )}
        </div>
      </div>

      {outwardRow && (
        <M3OutwardDrawer
          row={outwardRow}
          isSubmitting={isOutwardSubmitting}
          onClose={() => setOutwardRow(null)}
          onSubmit={handleOutwardSubmit}
        />
      )}

      {showDetail && (
        <M3ArticleDetailDrawer
          summary={detailSummary}
          isLoading={detailLoading}
          onClose={() => {
            setShowDetail(false);
            setDetailSummary(null);
          }}
        />
      )}
    </>
  );
}
