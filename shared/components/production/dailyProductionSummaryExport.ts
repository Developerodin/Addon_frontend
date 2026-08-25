import type { DailyProductionSummaryResponse } from "@/shared/services/productionService";
import { formatDateHeader, getQualifiedRowLabel } from "./dailyProductionSummaryRows";

/**
 * Escapes a CSV cell (quotes values that contain commas, quotes, or newlines).
 * @param value Cell value
 */
function csvCell(value: string | number): string {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Rounds a qty for export; future dates (null) export as an empty cell.
 * @param value Qty or null
 */
function exportQty(value: number | null | undefined): string | number {
  return value == null ? "" : Math.round(value);
}

/**
 * Downloads the Details × date daily production matrix as an Excel-compatible CSV.
 * Layout mirrors the on-screen table: one row per Details line, one column per IST date.
 * @param report Loaded report payload
 */
export function downloadDailyProductionSummaryCsv(report: DailyProductionSummaryResponse): void {
  const { dates, rows, columnTotals, grandTotal, year, month } = report;

  const headers = ["Details", ...dates.map(formatDateHeader), "Total"];

  const body = rows.map((row) => [
    getQualifiedRowLabel(row),
    ...dates.map((date) => exportQty(row.values[date])),
    Math.round(row.total),
  ]);

  const totalsRow = [
    "Total",
    ...dates.map((date) => exportQty(columnTotals[date])),
    Math.round(grandTotal),
  ];

  const csvContent = [headers, ...body, totalsRow]
    .map((line) => line.map(csvCell).join(","))
    .join("\n");

  const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `daily-production-summary-${year}${String(month).padStart(2, "0")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
