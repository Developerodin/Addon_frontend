"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  listMachineOrderAssignments,
  OrderStatus,
  type MachineOrderAssignment,
  type ProductionOrderItem,
} from "@/shared/services/machineOrderAssignmentService";
import { machinesService } from "@/shared/services/machinesService";
import { productionService, type ProductionOrder, type Article } from "@/shared/services/productionService";
import { getProductsByFactoryCodes } from "@/shared/services/productService";

export interface PlanningRow {
  machineId: string;
  machineCode: string;
  running: string;
  type: string;
  needle: string;
  existingPlan: string;
  existingQty: string;
  nextPlan: string;
  nextQty: string;
}

export interface MachineArticlePlanningTabProps {
  /** When this changes, data is refetched (e.g. after update in parent). */
  refreshTrigger?: number;
}

export default function MachineArticlePlanningTab({ refreshTrigger }: MachineArticlePlanningTabProps) {
  const [rows, setRows] = useState<PlanningRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [machinesRes, assignmentsData] = await Promise.all([
        machinesService.getMachines(1, 500, ""),
        listMachineOrderAssignments({ page: 1, limit: 500 }),
      ]);

      const machinesList = (machinesRes.results ?? []).map((m: { id?: string; _id?: string; machineCode?: string; name?: string }) => ({
        id: m.id ?? m._id,
        machineCode: m.machineCode ?? m.name ?? "",
        name: m.name,
      }));
      machinesList.sort((a: { machineCode?: string }, b: { machineCode?: string }) =>
        (a.machineCode ?? "").localeCompare(b.machineCode ?? "", undefined, { numeric: true })
      );

      const assignmentByMachineId = new Map<string, MachineOrderAssignment>();
      for (const a of assignmentsData.results ?? []) {
        const mid =
          typeof a.machine === "object" && a.machine
            ? (a.machine as { id?: string }).id ?? (a.machine as { _id?: string })._id
            : a.machine;
        if (mid) assignmentByMachineId.set(String(mid), a);
      }

      function getOrderId(item: ProductionOrderItem): string {
        const po = item.productionOrder;
        if (typeof po === "string") return po;
        return (po as { id?: string; _id?: string })?.id ?? (po as { id?: string; _id?: string })?._id ?? "";
      }
      function getArticleId(item: ProductionOrderItem): string {
        const a = item.article;
        if (typeof a === "string") return a;
        return (a as { id?: string; _id?: string })?.id ?? (a as { id?: string; _id?: string })?._id ?? "";
      }

      const orderIds = new Set<string>();
      for (const m of machinesList) {
        const assignment = assignmentByMachineId.get(m.id);
        if (!assignment) continue;
        const items = (assignment.productionOrderItems ?? [])
          .filter((i) => i.priority != null && i.status !== OrderStatus.ON_HOLD)
          .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
        for (const item of items.slice(0, 5)) {
          const oid = getOrderId(item);
          if (oid) orderIds.add(oid);
        }
      }

      const ordersMap = new Map<string, ProductionOrder>();
      await Promise.all(
        Array.from(orderIds).map(async (oid) => {
          try {
            const res = await productionService.getOrder(oid);
            if (res.success && res.data) ordersMap.set(oid, res.data);
          } catch {
            // skip failed
          }
        })
      );

      const articleByOrderArticle = new Map<string, Article>();
      for (const [oid, order] of ordersMap) {
        for (const article of order.articles ?? []) {
          const aid = article.id ?? article._id;
          if (aid) articleByOrderArticle.set(`${oid}:${aid}`, article);
        }
      }

      /** Collect factory codes from running articles only (In Progress) */
      const runningFactoryCodes = new Set<string>();
      for (const m of machinesList) {
        const assignment = assignmentByMachineId.get(m.id);
        if (!assignment) continue;
        const items = (assignment.productionOrderItems ?? [])
          .filter((i) => i.priority != null && i.status !== OrderStatus.ON_HOLD)
          .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
        const runningItem = items.find((i) => i.status === OrderStatus.IN_PROGRESS);
        if (runningItem) {
          const runningArticle = articleByOrderArticle.get(`${getOrderId(runningItem)}:${getArticleId(runningItem)}`);
          const fc = runningItem.articleNumber ?? runningArticle?.articleNumber ?? "";
          if (fc.trim()) runningFactoryCodes.add(fc.trim());
        }
      }

      /** Fetch products by factory codes for attributes (Type, Season) */
      const productByFactoryCode = new Map<string, { Type?: string; Season?: string }>();
      if (runningFactoryCodes.size > 0) {
        try {
          const products = await getProductsByFactoryCodes(Array.from(runningFactoryCodes));
          for (const p of products) {
            const fc = (p.factoryCode ?? "").trim();
            if (fc) {
              productByFactoryCode.set(fc.toLowerCase(), (p.attributes ?? {}) as { Type?: string; Season?: string });
              productByFactoryCode.set(fc, (p.attributes ?? {}) as { Type?: string; Season?: string });
            }
          }
        } catch {
          // ignore – attributes optional
        }
      }

      const planningRows: PlanningRow[] = [];

      for (const m of machinesList) {
        const assignment = assignmentByMachineId.get(m.id);
        const machineCode = m.machineCode ?? m.name ?? m.id ?? "-";

        if (!assignment) {
          planningRows.push({
            machineId: m.id,
            machineCode,
            running: "-",
            type: "-",
            needle: "-",
            existingPlan: "-",
            existingQty: "-",
            nextPlan: "-",
            nextQty: "-",
          });
          continue;
        }

        const items = (assignment.productionOrderItems ?? [])
          .filter((i) => i.priority != null && i.status !== OrderStatus.ON_HOLD)
          .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));

        /** RUNNING PLAN: only the item that is In Progress */
        const runningItem = items.find((i) => i.status === OrderStatus.IN_PROGRESS);
        /** NXT PLAN: the item that is Pending (to be started next) */
        const nextItem = items.find((i) => i.status === OrderStatus.PENDING);

        const runningArticle = runningItem
          ? articleByOrderArticle.get(`${getOrderId(runningItem)}:${getArticleId(runningItem)}`)
          : undefined;
        const nextArticle = nextItem
          ? articleByOrderArticle.get(`${getOrderId(nextItem)}:${getArticleId(nextItem)}`)
          : undefined;

        /** Running article attributes (Type, Season) from products API */
        const runningFactoryCode = runningItem
          ? (runningItem.articleNumber ?? runningArticle?.articleNumber ?? "").trim()
          : "";
        const attrs = runningFactoryCode
          ? productByFactoryCode.get(runningFactoryCode) ?? productByFactoryCode.get(runningFactoryCode.toLowerCase())
          : undefined;
        const running = attrs?.Season ?? "-";
        const type = attrs?.Type ?? "-";
        const needle = (assignment.activeNeedle ?? "").trim() || "-";
        const existingPlan = runningItem ? (runningItem.articleNumber ?? runningArticle?.articleNumber ?? "-") : "-";
        const existingProd = runningArticle?.plannedQuantity;
        const existingRem = runningArticle?.floorQuantities?.knitting?.remaining ?? existingProd;
        const existingQty =
          existingProd != null
            ? `${(existingRem ?? existingProd).toLocaleString()} / ${existingProd.toLocaleString()}`
            : "-";
        const nextPlan = nextItem ? (nextItem.articleNumber ?? nextArticle?.articleNumber ?? "-") : "-";
        const nextProd = nextArticle?.plannedQuantity;
        const nextRem = nextArticle?.floorQuantities?.knitting?.remaining ?? nextProd;
        const nextQty =
          nextProd != null
            ? `${(nextRem ?? nextProd).toLocaleString()} / ${nextProd.toLocaleString()}`
            : "-";

        planningRows.push({
          machineId: m.id,
          machineCode,
          running: running || "-",
          type: type || "-",
          needle: needle || "-",
          existingPlan: existingPlan || "-",
          existingQty: existingQty || "-",
          nextPlan: nextPlan || "-",
          nextQty: nextQty || "-",
        });
      }

      setRows(planningRows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load planning data");
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);

  const handlePrint = useCallback(() => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked. Allow popups to print.");
      return;
    }
    const dateStr = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Planning Working - ${dateStr}</title>
          <style>
            @page { size: A4; margin: 10mm; }
            * { box-sizing: border-box; }
            body { margin: 0; font-family: system-ui, sans-serif; font-size: 9px; }
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
            h1 { margin: 0; font-size: 13px; font-weight: bold; }
            .date { font-size: 10px; color: #444; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #333; padding: 2px 4px; text-align: left; }
            th { background: #f0f0f0; font-weight: bold; font-size: 8px; }
            tr:nth-child(even) { background: #f9f9f9; }
            .no-print { display: none; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Planning Working</h1>
            <span class="date">${dateStr}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Running</th>
                <th>Type</th>
                <th>Needle</th>
                <th>M/c No.</th>
                <th colspan="2" style="text-align:center">RUNNING PLAN</th>
                <th colspan="2" style="text-align:center">NXT PLAN</th>
              </tr>
              <tr>
                <th></th><th></th><th></th><th></th>
                <th>Existing Plan</th><th>Rem / Prod</th>
                <th>Plan 1</th><th>Rem / Prod</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (r) =>
                    `<tr>
                <td>${r.running}</td>
                <td>${r.type}</td>
                <td>${r.needle}</td>
                <td>${r.machineCode}</td>
                <td>${r.existingPlan}</td>
                <td>${r.existingQty}</td>
                <td>${r.nextPlan}</td>
                <td>${r.nextQty}</td>
              </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }, [rows]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
        <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading</p>
      </div>
    );
  }

  return (
    <div className="p-[10px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[12px] font-bold text-gray-800">Planning Working</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            disabled={rows.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[11px] font-bold rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="ri-printer-line text-xs" />
            Print
          </button>
          <button
            type="button"
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[11px] font-bold rounded hover:bg-gray-50"
          >
            <i className={`ri-refresh-line text-xs ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-300 rounded">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-2 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider border-b border-r border-gray-300">
                Running
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider border-b border-r border-gray-300">
                Type
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider border-b border-r border-gray-300">
                Needle
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider border-b border-r border-gray-300">
                M/c No.
              </th>
              <th className="px-2 py-2 text-center text-[10px] font-bold text-gray-700 uppercase tracking-wider border-b border-r border-gray-300" colSpan={2}>
                RUNNING PLAN
              </th>
              <th className="px-2 py-2 text-center text-[10px] font-bold text-gray-700 uppercase tracking-wider border-b border-gray-300" colSpan={2}>
                NXT PLAN
              </th>
            </tr>
            <tr className="bg-gray-50">
              <th className="px-2 py-1.5 border-b border-r border-gray-300" />
              <th className="px-2 py-1.5 border-b border-r border-gray-300" />
              <th className="px-2 py-1.5 border-b border-r border-gray-300" />
              <th className="px-2 py-1.5 border-b border-r border-gray-300" />
              <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-600 border-b border-r border-gray-300">
                Existing Plan
              </th>
              <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-600 border-b border-r border-gray-300">
                Rem / Prod
              </th>
              <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-600 border-b border-r border-gray-300">
                Plan 1
              </th>
              <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-600 border-b border-gray-300">
                Rem / Prod
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.machineId}
                className={idx % 2 === 1 ? "bg-gray-50/50" : ""}
              >
                <td className="px-2 py-2 text-[11px] text-gray-800 border-b border-r border-gray-300">
                  {row.running}
                </td>
                <td className="px-2 py-2 text-[11px] text-gray-800 border-b border-r border-gray-300">
                  {row.type}
                </td>
                <td className="px-2 py-2 text-[11px] text-gray-800 border-b border-r border-gray-300">
                  {row.needle}
                </td>
                <td className="px-2 py-2 text-[11px] font-medium text-gray-800 border-b border-r border-gray-300">
                  {row.machineCode}
                </td>
                <td className="px-2 py-2 text-[11px] text-gray-800 border-b border-r border-gray-300">
                  {row.existingPlan}
                </td>
                <td className="px-2 py-2 text-[11px] text-gray-800 border-b border-r border-gray-300">
                  {row.existingQty}
                </td>
                <td className="px-2 py-2 text-[11px] text-gray-800 border-b border-r border-gray-300">
                  {row.nextPlan}
                </td>
                <td className="px-2 py-2 text-[11px] text-gray-800 border-b border-gray-300">
                  {row.nextQty}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && !isLoading && (
        <p className="py-8 text-center text-[11px] text-gray-500">No machines or assignments found.</p>
      )}
    </div>
  );
}
