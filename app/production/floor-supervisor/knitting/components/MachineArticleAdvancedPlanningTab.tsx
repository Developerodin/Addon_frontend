"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  listMachineOrderAssignments,
  type MachineOrderAssignment,
} from "@/shared/services/machineOrderAssignmentService";
import { machinesService } from "@/shared/services/machinesService";
import { getProductsByFactoryCodes } from "@/shared/services/productService";
import ArticlePlanCell from "./ArticlePlanCell";
import ArticleProductImageModal from "./ArticleProductImageModal";
import {
  collectPlanFactoryCodes,
  getAssignmentMachineId,
  getMaxOtherPlanCount,
  getQueuedPlanItems,
  padOtherPlans,
  printAdvancedPlanningTable,
  splitRunningAndOtherPlans,
  toPlanSlot,
  type AdvancedPlanningRow,
} from "../utils/machinePlanningHelpers";

interface ProductCatalogInfo {
  Type?: string;
  Season?: string;
  image?: string;
  name?: string;
}

interface ImageModalState {
  factoryCode: string;
  imageUrl?: string;
  productName?: string;
}

export interface MachineArticleAdvancedPlanningTabProps {
  /** When this changes, data is refetched (e.g. after update in parent). */
  refreshTrigger?: number;
}

/**
 * Knitting floor table of every machine's running plan plus the full remaining queue.
 */
export default function MachineArticleAdvancedPlanningTab({
  refreshTrigger,
}: MachineArticleAdvancedPlanningTabProps) {
  const [rows, setRows] = useState<AdvancedPlanningRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [productByFactoryCode, setProductByFactoryCode] = useState<Map<string, ProductCatalogInfo>>(
    new Map(),
  );
  const [imageModal, setImageModal] = useState<ImageModalState | null>(null);

  const maxOtherPlans = useMemo(() => getMaxOtherPlanCount(rows), [rows]);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [machinesRes, assignmentsData] = await Promise.all([
        machinesService.getMachines(1, 500, ""),
        listMachineOrderAssignments({ page: 1, limit: 500 }),
      ]);

      const machinesList = (machinesRes.results ?? []).map(
        (m: { id?: string; _id?: string; machineCode?: string; name?: string }) => ({
          id: String(m.id ?? m._id ?? ""),
          machineCode: m.machineCode ?? m.name ?? "",
          name: m.name,
        }),
      );
      machinesList.sort((a: { machineCode?: string }, b: { machineCode?: string }) =>
        (a.machineCode ?? "").localeCompare(b.machineCode ?? "", undefined, { numeric: true }),
      );

      const assignmentByMachineId = new Map<string, MachineOrderAssignment>();
      for (const assignment of assignmentsData.results ?? []) {
        const mid = getAssignmentMachineId(assignment);
        if (mid) assignmentByMachineId.set(String(mid), assignment);
      }

      const allQueuedItems = (assignmentsData.results ?? []).flatMap((a) => getQueuedPlanItems(a));
      const planFactoryCodes = collectPlanFactoryCodes(allQueuedItems);
      const productMap = new Map<string, ProductCatalogInfo>();
      if (planFactoryCodes.length > 0) {
        try {
          const products = await getProductsByFactoryCodes(planFactoryCodes);
          for (const p of products) {
            const fc = (p.factoryCode ?? "").trim();
            if (!fc) continue;
            const info: ProductCatalogInfo = {
              ...((p.attributes ?? {}) as { Type?: string; Season?: string }),
              image: typeof p.image === "string" ? p.image.trim() : undefined,
              name: typeof p.name === "string" ? p.name.trim() : undefined,
            };
            productMap.set(fc.toLowerCase(), info);
            productMap.set(fc, info);
          }
        } catch (err) {
          console.warn("Catalog lookup failed for advanced planning", err);
        }
      }
      setProductByFactoryCode(productMap);

      const planningRows: AdvancedPlanningRow[] = machinesList
        .filter((m: { id: string }) => m.id)
        .map((m: { id: string; machineCode?: string; name?: string }) => {
          const machineCode = m.machineCode ?? m.name ?? m.id ?? "-";
          const assignment = assignmentByMachineId.get(m.id);
          if (!assignment) {
            return {
              machineId: m.id,
              machineCode,
              season: "-",
              type: "-",
              needle: "-",
              runningPlan: { articleNumber: "-", qty: "-" },
              otherPlans: [],
            };
          }

          const queued = getQueuedPlanItems(assignment);
          const { running, other } = splitRunningAndOtherPlans(queued);
          const runningFactoryCode = running ? (running.articleNumber ?? "").trim() : "";
          const attrs = runningFactoryCode
            ? productMap.get(runningFactoryCode) ?? productMap.get(runningFactoryCode.toLowerCase())
            : undefined;

          return {
            machineId: m.id,
            machineCode,
            season: attrs?.Season?.trim() || "-",
            type: attrs?.Type?.trim() || "-",
            needle: (assignment.activeNeedle ?? "").trim() || "-",
            runningPlan: toPlanSlot(running),
            otherPlans: other.map((item) => toPlanSlot(item)),
          };
        });

      setRows(planningRows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load advanced planning data");
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);

  /** Opens the product image modal for a planning-table article code. */
  const handleArticleInfoClick = useCallback(
    (factoryCode: string) => {
      const info =
        productByFactoryCode.get(factoryCode) ?? productByFactoryCode.get(factoryCode.toLowerCase());
      setImageModal({
        factoryCode,
        imageUrl: info?.image,
        productName: info?.name,
      });
    },
    [productByFactoryCode],
  );

  /** Opens a landscape print view of the full machine queue table. */
  const handlePrint = useCallback(() => {
    try {
      printAdvancedPlanningTable(rows, maxOtherPlans);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to print");
    }
  }, [rows, maxOtherPlans]);

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
        <h3 className="text-[12px] font-bold text-gray-800">Advanced Planning</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            disabled={rows.length === 0}
            aria-label="Print advanced planning table"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[11px] font-bold rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="ri-printer-line text-xs" aria-hidden />
            Print
          </button>
          <button
            type="button"
            onClick={fetchData}
            disabled={isLoading}
            aria-label="Refresh advanced planning"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[11px] font-bold rounded hover:bg-gray-50"
          >
            <i className={`ri-refresh-line text-xs ${isLoading ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-300 rounded">
        <table className="w-full border-collapse min-w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-2 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider border-b border-r border-gray-300 whitespace-nowrap">
                Season
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider border-b border-r border-gray-300 whitespace-nowrap">
                Type
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider border-b border-r border-gray-300 whitespace-nowrap">
                Needle
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider border-b border-r border-gray-300 whitespace-nowrap">
                M/c No.
              </th>
              <th
                className="px-2 py-2 text-center text-[10px] font-bold text-gray-700 uppercase tracking-wider border-b border-r border-gray-300 whitespace-nowrap"
                colSpan={2}
              >
                RUNNING PLAN
              </th>
              {Array.from({ length: maxOtherPlans }, (_, i) => (
                <th
                  key={`plan-group-${i}`}
                  className="px-2 py-2 text-center text-[10px] font-bold text-gray-700 uppercase tracking-wider border-b border-r last:border-r-0 border-gray-300 whitespace-nowrap"
                  colSpan={2}
                >
                  PLAN {i + 1}
                </th>
              ))}
            </tr>
            <tr className="bg-gray-50">
              <th className="px-2 py-1.5 border-b border-r border-gray-300" />
              <th className="px-2 py-1.5 border-b border-r border-gray-300" />
              <th className="px-2 py-1.5 border-b border-r border-gray-300" />
              <th className="px-2 py-1.5 border-b border-r border-gray-300" />
              <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-600 border-b border-r border-gray-300 whitespace-nowrap">
                Existing Plan
              </th>
              <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-600 border-b border-r border-gray-300 whitespace-nowrap">
                Rem / Prod
              </th>
              {Array.from({ length: maxOtherPlans }, (_, i) => (
                <React.Fragment key={`plan-sub-${i}`}>
                  <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-600 border-b border-r border-gray-300 whitespace-nowrap">
                    Plan {i + 1}
                  </th>
                  <th className="px-2 py-1.5 text-[10px] font-semibold text-gray-600 border-b border-r last:border-r-0 border-gray-300 whitespace-nowrap">
                    Rem / Prod
                  </th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const others = padOtherPlans(row.otherPlans, maxOtherPlans);
              return (
                <tr key={row.machineId} className={idx % 2 === 1 ? "bg-gray-50/50" : ""}>
                  <td className="px-2 py-2 text-[11px] text-gray-800 border-b border-r border-gray-300 whitespace-nowrap">
                    {row.season}
                  </td>
                  <td className="px-2 py-2 text-[11px] text-gray-800 border-b border-r border-gray-300 whitespace-nowrap">
                    {row.type}
                  </td>
                  <td className="px-2 py-2 text-[11px] text-gray-800 border-b border-r border-gray-300 whitespace-nowrap">
                    {row.needle}
                  </td>
                  <td className="px-2 py-2 text-[11px] font-medium text-gray-800 border-b border-r border-gray-300 whitespace-nowrap">
                    {row.machineCode}
                  </td>
                  <td className="px-2 py-2 text-[11px] text-gray-800 border-b border-r border-gray-300 whitespace-nowrap">
                    <ArticlePlanCell
                      factoryCode={row.runningPlan.articleNumber}
                      onInfoClick={handleArticleInfoClick}
                    />
                  </td>
                  <td className="px-2 py-2 text-[11px] text-gray-800 border-b border-r border-gray-300 whitespace-nowrap">
                    {row.runningPlan.qty}
                  </td>
                  {others.map((slot, planIdx) => (
                    <React.Fragment key={`${row.machineId}-plan-${planIdx}`}>
                      <td className="px-2 py-2 text-[11px] text-gray-800 border-b border-r border-gray-300 whitespace-nowrap">
                        <ArticlePlanCell
                          factoryCode={slot.articleNumber}
                          onInfoClick={handleArticleInfoClick}
                        />
                      </td>
                      <td className="px-2 py-2 text-[11px] text-gray-800 border-b border-r last:border-r-0 border-gray-300 whitespace-nowrap">
                        {slot.qty}
                      </td>
                    </React.Fragment>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && !isLoading && (
        <p className="py-8 text-center text-[11px] text-gray-500">No machines or assignments found.</p>
      )}

      {imageModal && (
        <ArticleProductImageModal
          factoryCode={imageModal.factoryCode}
          productName={imageModal.productName}
          imageUrl={imageModal.imageUrl}
          onClose={() => setImageModal(null)}
        />
      )}
    </div>
  );
}
