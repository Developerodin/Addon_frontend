import type { CoreReportMetrics, CoreReportRow } from "@/shared/services/productionService";
import { datedXlsxFilename, downloadXlsxAoa } from "@/shared/utils/xlsxExport";

/**
 * Downloads Core Report rows as an Excel workbook.
 * @param rows Rows to export (current page or full matching set)
 * @param totals Filter-wide totals
 * @param vendorColumns Dynamic vendor header names
 * @param scope Filename suffix: this page vs full report
 */
export function downloadCoreReportExcel(
  rows: CoreReportRow[],
  totals: CoreReportMetrics,
  vendorColumns: string[],
  scope: "page" | "full" = "full",
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

  downloadXlsxAoa(datedXlsxFilename(`core-report-${scope}`), "Core Report", [headers, ...body]);
}
