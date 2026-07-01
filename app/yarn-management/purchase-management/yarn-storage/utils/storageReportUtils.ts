/**
 * Utilities for yarn storage slot reports (Excel export, summary calculation).
 */
import * as XLSX from "xlsx";
import { BoxInSlot, ConeInSlot, StorageSlot } from "@/shared/services/storageSlotService";
import {
  resolveBoxGrossWeightKg,
  resolveBoxNetWeightKg,
  resolveConeNetWeightKg,
} from "./boxWeightDisplay";
import {
  buildZoneReportBoxExcelRow,
  buildZoneReportConeExcelRow,
} from "./zoneReportExcelRows";

export interface SlotReportSummary {
  totalItems: number;
  totalWeight: number;
  yarnTypesCount: number;
  yarnBreakdown: Array<{
    yarnName: string;
    count: number;
    weight: number;
    cones?: number;
  }>;
}

/** Compute summary from boxes in slot */
export function computeBoxSummary(boxes: BoxInSlot[]): SlotReportSummary {
  const yarnMap = new Map<string, { count: number; weight: number }>();
  let totalWeight = 0;

  for (const b of boxes) {
    totalWeight += resolveBoxNetWeightKg(b) ?? 0;
    const key = b.yarnName || "Unknown";
    const existing = yarnMap.get(key) || { count: 0, weight: 0 };
    yarnMap.set(key, {
      count: existing.count + 1,
      weight: existing.weight + (resolveBoxNetWeightKg(b) ?? 0),
    });
  }

  const yarnBreakdown = Array.from(yarnMap.entries()).map(([yarnName, data]) => ({
    yarnName,
    count: data.count,
    weight: data.weight,
  }));

  return {
    totalItems: boxes.length,
    totalWeight,
    yarnTypesCount: yarnMap.size,
    yarnBreakdown,
  };
}

/** Compute summary from cones in slot */
export function computeConeSummary(cones: ConeInSlot[]): SlotReportSummary {
  const yarnMap = new Map<string, { count: number; weight: number }>();
  let totalWeight = 0;

  for (const c of cones) {
    totalWeight += resolveConeNetWeightKg(c) ?? 0;
    const key = c.yarnName || "Unknown";
    const existing = yarnMap.get(key) || { count: 0, weight: 0 };
    yarnMap.set(key, {
      count: existing.count + 1,
      weight: existing.weight + (resolveConeNetWeightKg(c) ?? 0),
    });
  }

  const yarnBreakdown = Array.from(yarnMap.entries()).map(([yarnName, data]) => ({
    yarnName,
    count: data.count,
    weight: data.weight,
    cones: data.count,
  }));

  return {
    totalItems: cones.length,
    totalWeight,
    yarnTypesCount: yarnMap.size,
    yarnBreakdown,
  };
}

/** Export boxes to Excel */
export function exportBoxesToExcel(
  slot: StorageSlot,
  boxes: BoxInSlot[],
  zoneType: string
): void {
  const rows = boxes.map((b) => ({
    ...buildZoneReportBoxExcelRow({
      ...b,
      rackCode: slot?.label,
      rackBarcode: slot?.barcode,
    }),
    "QC Status": b.qcData?.status ?? "-",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Boxes");
  const safeLabel = (slot?.label || "report").replace(/[/\\?*:\[\]]/g, "_");
  const fileName = `rack_${safeLabel}_${zoneType}_boxes_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/** Export cones to Excel */
export function exportConesToExcel(
  slot: StorageSlot,
  cones: ConeInSlot[],
  zoneType: string
): void {
  const rows = cones.map((c) => {
    const row = buildZoneReportConeExcelRow(c);
    return {
      ...row,
      "Created At": c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "-",
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cones");
  const safeLabel = (slot?.label || "report").replace(/[/\\?*:\[\]]/g, "_");
  const fileName = `rack_${safeLabel}_${zoneType}_cones_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
