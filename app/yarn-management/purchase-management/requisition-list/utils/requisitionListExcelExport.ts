import * as XLSX from "xlsx";
import {
  workflowStageLabel,
  type CriticalRow,
} from "../hooks/useCriticalRequisitionList";
import { formatStockKg } from "./formatStockKg";

/**
 * Builds alert status label string for export rows.
 * @param yarn - Critical requisition row
 */
function alertStatusLabel(yarn: CriticalRow): string {
  const badges: string[] = [];
  if (yarn.availableQty < yarn.minimumQty) badges.push("Below Minimum");
  if (yarn.blockedQty > yarn.availableQty) badges.push("Overblocked");
  if (badges.length === 0) badges.push("Healthy");
  return badges.join(" | ");
}

/**
 * Maps critical requisition rows to Excel sheet objects.
 * @param rows - Rows to export (matching current filters)
 */
function toSheetRows(rows: CriticalRow[]): Record<string, string | number>[] {
  return rows.map((yarn) => {
    const live = yarn.liveStock;
    return {
      "Yarn Name": yarn.yarnName,
      "Minimum Qty": yarn.minimumQty,
      "Avail @ create (snapshot)": formatStockKg(yarn.availableQty),
      "Blocked @ create (snapshot)": formatStockKg(yarn.blockedQty),
      "Live unallocated kg": live ? formatStockKg(live.unallocatedKg) : "",
      "Live LT kg": live ? formatStockKg(live.longTermKg) : "",
      "Live ST kg": live ? formatStockKg(live.shortTermKg) : "",
      "Live total kg (LT+ST)": live ? formatStockKg(live.totalStockKg) : "",
      "Live avail kg (LT+ST-blocked)": live ? formatStockKg(live.availableKg) : "",
      "Live blocked kg": live ? formatStockKg(live.blockedKg) : "",
      "Draft PO qty": yarn.draftPoQuantity != null ? formatStockKg(yarn.draftPoQuantity) : "",
      "Alert inventory": alertStatusLabel(yarn),
      "Procurement workflow": workflowStageLabel(yarn.workflowStage),
      "Vendor snapshot": yarn.preferredSupplierDisplayName || "",
      "Last Updated": yarn.lastUpdated
        ? new Date(yarn.lastUpdated).toLocaleString()
        : "",
    };
  });
}

/**
 * Downloads the requisition list as an `.xlsx` workbook.
 * @param rows - Filtered critical rows to include
 */
export function downloadRequisitionListExcel(rows: CriticalRow[]): void {
  const sheetData = toSheetRows(rows);
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(sheetData);

  const colWidths = Object.keys(sheetData[0] ?? { A: "" }).map((key) => ({
    wch: Math.min(Math.max(key.length + 2, 12), 36),
  }));
  worksheet["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, "Requisition list");
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  XLSX.writeFile(workbook, `requisition-list-${stamp}.xlsx`);
}
