import type { CoreReportMetrics, CoreReportRow } from "@/shared/services/productionService";

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
 * Downloads the current Core Report page as a CSV file.
 * @param rows Page results
 * @param totals Filter-wide totals
 * @param vendorColumns Dynamic vendor header names
 */
export function downloadCoreReportCsv(
  rows: CoreReportRow[],
  totals: CoreReportMetrics,
  vendorColumns: string[],
): void {
  const headers = [
    "Brand",
    "Vendor Code / Internal Code",
    "Factory Code",
    "Color",
    "Type",
    "Design",
    "SAP Stock",
    "Inward Pending Quantity",
    "In Transit Quantity",
    "WIP",
    "Running on Machine",
    "Production Planning",
    "Total Inhand Stock",
    ...vendorColumns,
  ];

  /**
   * Numeric cells in header order so row and totals cannot drift.
   * @param m Metrics
   */
  const metricCells = (m: CoreReportMetrics): number[] => [
    m.sapStock,
    m.inwardPending,
    m.inTransit,
    m.wip,
    m.runningOnMachine,
    m.productionPlanning,
    m.totalInhand,
    ...vendorColumns.map((vendor) => m.vendorPending?.[vendor] ?? 0),
  ];

  const body: (string | number)[][] = rows.map((row) => [
    row.brand,
    row.vendorCode,
    row.factoryCode,
    row.color,
    row.type,
    row.design,
    ...metricCells(row),
  ]);

  body.push(["TOTAL (all matching)", "", "", "", "", "", ...metricCells(totals)]);

  const csvContent = [headers.map(csvCell).join(","), ...body.map((r) => r.map(csvCell).join(","))].join("\n");
  const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const now = new Date();
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  a.href = url;
  a.download = `core-report-${ts}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
