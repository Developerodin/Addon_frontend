"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";
import {
  containersMasterService,
  type ContainerActiveArticlePopulated,
  type ContainerMaster,
} from "@/shared/services/containersMasterService";

export interface UpcomingTabProps {
  /** Must match backend / container `activeFloor` (e.g. "Final Checking", "Branding"). */
  floorName: string;
}

type ArticleLike = ContainerActiveArticlePopulated & {
  orderId?: { orderNumber?: string } | string;
};

function getOrderNumber(article: ArticleLike | null | undefined): string {
  if (!article?.orderId) return "—";
  if (typeof article.orderId === "object" && article.orderId?.orderNumber) {
    return String(article.orderId.orderNumber);
  }
  return "—";
}

function getArticleNumber(
  article: string | ContainerActiveArticlePopulated | undefined
): string {
  if (!article) return "—";
  if (typeof article === "string") return article;
  return article.articleNumber ?? article._id ?? "—";
}

/** Safe filename segment from floor label */
function floorSlug(label: string): string {
  const t = label.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_");
  return t || "floor";
}

/**
 * Lists containers on this floor with ACTIVE status and their active articles (upcoming on floor).
 */
export default function UpcomingTab({ floorName }: UpcomingTabProps) {
  const [loading, setLoading] = useState(false);
  const [floorLabel, setFloorLabel] = useState<string>(floorName);
  const [containerCount, setContainerCount] = useState(0);
  const [containers, setContainers] = useState<ContainerMaster[]>([]);

  const load = useCallback(async () => {
    if (!floorName.trim()) return;
    setLoading(true);
    try {
      const data = await containersMasterService.getByFloorWithArticles(floorName.trim(), {
        status: "ACTIVE",
      });
      setFloorLabel(data.floor ?? floorName);
      setContainerCount(data.count ?? data.containers?.length ?? 0);
      setContainers(data.containers ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
      setContainers([]);
      setContainerCount(0);
    } finally {
      setLoading(false);
    }
  }, [floorName]);

  useEffect(() => {
    load();
  }, [load]);

  const rows: Array<{
    container: ContainerMaster;
    qty: number;
    article: string | ContainerActiveArticlePopulated;
  }> = [];
  for (const c of containers) {
    const items = c.activeItems?.length
      ? c.activeItems
      : c.activeArticle
        ? [
            {
              article: c.activeArticle as string | ContainerActiveArticlePopulated,
              quantity: c.quantity ?? 0,
            },
          ]
        : [];
    for (const item of items) {
      rows.push({ container: c, qty: item.quantity ?? 0, article: item.article });
    }
  }

  const downloadExcel = () => {
    if (rows.length === 0) {
      toast.error("No upcoming rows to export");
      return;
    }
    const exportRows = rows.map((row) => {
      const art = typeof row.article === "object" ? (row.article as ArticleLike) : null;
      return {
        Container: row.container.containerName ?? "",
        Barcode: row.container.barcode,
        Article: getArticleNumber(row.article),
        Qty: row.qty,
        "Order #": getOrderNumber(art),
        Status: row.container.status ?? "",
        Type: row.container.type ?? "",
        "Active floor": row.container.activeFloor ?? floorLabel,
      };
    });
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Upcoming");
    const date = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `upcoming_${floorSlug(floorLabel)}_${date}.xlsx`);
    toast.success("Excel downloaded");
  };

  return (
    <div className="p-[10px]">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-[11px] text-[#495057]">
          Floor: <span className="font-bold text-gray-900">{floorLabel}</span>
          {" · "}
          <span className="font-medium">{containerCount}</span> container
          {containerCount !== 1 ? "s" : ""}
          {rows.length > 0 ? (
            <>
              {" · "}
              <span className="font-medium">{rows.length}</span> active line
              {rows.length !== 1 ? "s" : ""}
            </>
          ) : null}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={downloadExcel}
            disabled={loading || rows.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 disabled:opacity-50 disabled:pointer-events-none"
          >
            <i className="ri-file-excel-2-line text-xs" />
            Download Excel
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border border-gray-200 bg-white hover:bg-gray-50"
          >
            <i className={`ri-refresh-line text-xs ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mb-2" />
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Loading</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-[11px] text-gray-500">
          No containers with active articles on this floor.
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200">
                <th className="text-left px-2 py-2 font-bold text-[#495057] uppercase tracking-wider border-r border-gray-200">
                  Container
                </th>
                <th className="text-left px-2 py-2 font-bold text-[#495057] uppercase tracking-wider border-r border-gray-200">
                  Barcode
                </th>
                <th className="text-left px-2 py-2 font-bold text-[#495057] uppercase tracking-wider border-r border-gray-200">
                  Article
                </th>
                <th className="text-right px-2 py-2 font-bold text-[#495057] uppercase tracking-wider border-r border-gray-200">
                  Qty
                </th>
                <th className="text-left px-2 py-2 font-bold text-[#495057] uppercase tracking-wider border-r border-gray-200">
                  Order #
                </th>
                <th className="text-left px-2 py-2 font-bold text-[#495057] uppercase tracking-wider border-r border-gray-200">
                  Status
                </th>
                <th className="text-left px-2 py-2 font-bold text-[#495057] uppercase tracking-wider">
                  Type
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const art = typeof row.article === "object" ? (row.article as ArticleLike) : null;
                return (
                  <tr key={`${row.container._id ?? row.container.barcode}-${idx}`} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="px-2 py-2 border-r border-gray-100 font-medium text-gray-900">
                      {row.container.containerName ?? "—"}
                    </td>
                    <td className="px-2 py-2 border-r border-gray-100 text-gray-700 font-mono">
                      {row.container.barcode}
                    </td>
                    <td className="px-2 py-2 border-r border-gray-100">{getArticleNumber(row.article)}</td>
                    <td className="px-2 py-2 border-r border-gray-100 text-right tabular-nums">{row.qty}</td>
                    <td className="px-2 py-2 border-r border-gray-100">{getOrderNumber(art)}</td>
                    <td className="px-2 py-2 border-r border-gray-100">{row.container.status ?? "—"}</td>
                    <td className="px-2 py-2">{row.container.type ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
