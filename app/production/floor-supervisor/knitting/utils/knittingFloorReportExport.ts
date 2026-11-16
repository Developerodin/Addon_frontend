import * as XLSX from "xlsx";
import type {
  KnittingFloorReportColumnTotals,
  KnittingFloorReportRow,
} from "@/shared/services/productionService";

/**
 * Downloads the knitting floor report for the selected IST date range.
 */
function computeTotals(rows: KnittingFloorReportRow[]): KnittingFloorReportColumnTotals {
  const seen = new Set<string>();
  let plannedQuantity = 0;
  let knittingOutput = 0;
  let m4Qty = 0;
  for (const row of rows) {
    knittingOutput += row.knittingOutput ?? 0;
    m4Qty += row.m4Qty ?? 0;
    const key = `${row.orderId}|${row.articleId}`;
    if (!seen.has(key)) {
      seen.add(key);
      plannedQuantity += row.plannedQuantity ?? 0;
    }
  }
  return { plannedQuantity, knittingOutput, m4Qty };
}

export function downloadKnittingFloorReportExcel(
  rows: KnittingFloorReportRow[],
  startDate: string,
  endDate: string
): void {
  const sheetData = rows.map((row) => ({
    "Order No.": row.orderNumber,
    Article: row.articleNumber,
    "M/c No.": row.machineCode,
    "Order Qty": row.plannedQuantity,
    "Knitting Output": row.knittingOutput,
    M4: row.m4Qty,
  }));

  if (rows.length > 0) {
    const totals = computeTotals(rows);
    sheetData.push({
      "Order No.": "Total",
      Article: "",
      "M/c No.": "",
      "Order Qty": totals.plannedQuantity,
      "Knitting Output": totals.knittingOutput,
      M4: totals.m4Qty,
    });
  }

  const ws = XLSX.utils.json_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Knitting report");
  XLSX.writeFile(wb, `knitting_report_${startDate}_${endDate}.xlsx`);
}