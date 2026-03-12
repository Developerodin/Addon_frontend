/**
 * Utilities for yarn storage slot reports (Excel export, summary calculation).
 */
import * as XLSX from "xlsx";
import { BoxInSlot, ConeInSlot, StorageSlot } from "@/shared/services/storageSlotService";

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
    totalWeight += b.boxWeight ?? 0;
    const key = b.yarnName || "Unknown";
    const existing = yarnMap.get(key) || { count: 0, weight: 0 };
    yarnMap.set(key, {
      count: existing.count + 1,
      weight: existing.weight + (b.boxWeight ?? 0),
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
    totalWeight += c.coneWeight ?? 0;
    const key = c.yarnName || "Unknown";
    const existing = yarnMap.get(key) || { count: 0, weight: 0 };
    yarnMap.set(key, {
      count: existing.count + 1,
      weight: existing.weight + (c.coneWeight ?? 0),
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
    "Box ID": b.boxId,
    Barcode: b.barcode,
    "PO Number": b.poNumber,
    "Yarn Name": b.yarnName,
    "Lot Number": b.lotNumber,
    "Shade Code": b.shadeCode,
    "Box Weight (kg)": b.boxWeight,
    "Number of Cones": b.numberOfCones,
    "QC Status": b.qcData?.status ?? "-",
    "Received Date": b.receivedDate ? new Date(b.receivedDate).toLocaleDateString() : "-",
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
  const rows = cones.map((c) => ({
    "Cone Barcode": c.barcode,
    "Box ID": c.boxId,
    "PO Number": c.poNumber,
    "Yarn Name": c.yarnName,
    "Shade Code": c.shadeCode,
    "Cone Weight (kg)": c.coneWeight,
    "Tear Weight": c.tearWeight,
    "Issue Status": c.issueStatus,
    "Return Status": c.returnStatus,
    "Created At": c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "-",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cones");
  const safeLabel = (slot?.label || "report").replace(/[/\\?*:\[\]]/g, "_");
  const fileName = `rack_${safeLabel}_${zoneType}_cones_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
