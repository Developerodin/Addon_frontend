import type { OrderSummaryMetrics, OrderSummaryRow } from "@/shared/services/productionService";
import { datedXlsxFilename, downloadXlsxAoa } from "@/shared/utils/xlsxExport";

/**
 * Downloads order-summary rows as an Excel workbook.
 * @param rows Rows to export (current page or full matching set)
 * @param totals Filter-wide totals footer row
 * @param scope Filename suffix: this page vs full report
 */
export function downloadOrderSummaryExcel(
  rows: OrderSummaryRow[],
  totals: OrderSummaryMetrics,
  scope: "page" | "full" = "full",
): void {
  const headers = [
    "Order number",
    "Order name",
    "Priority",
    "Status",
    "Articles",
    "Total qty",
    "All remaining",
    "Knit pending on machine",
    "Knit pending unplanned",
    "Knit pending",
    "Short close qty",
    "Closed on machine qty",
    "On hold qty",
    "WIP qty",
    "Transfer qty",
    "Knit pending (legacy)",
  ];

  /** Numeric columns in header order, so rows and the totals row cannot drift. */
  const metricCells = (m: OrderSummaryMetrics) => [
    m.articleCount,
    m.totalQty,
    m.knitPendingWithHold,
    m.knitPendingOnMachine,
    m.knitPendingUnplanned,
    m.knitPendingQty,
    m.holdQty,
    m.closedOnMachineQty,
    m.onHoldQty,
    m.wipQty,
    m.transferQty,
    m.knitPendingWithoutHold,
  ];

  const body: (string | number)[][] = rows.map((row) => [
    row.orderNumber || row.orderId,
    row.orderNote ?? "",
    row.priority ?? "",
    row.status ?? "",
    ...metricCells(row),
  ]);

  body.push(["TOTAL (all matching)", "", "", "", ...metricCells(totals)]);

  downloadXlsxAoa(
    datedXlsxFilename(`production-order-summary-${scope}`),
    "Order Summary",
    [headers, ...body],
  );
}
