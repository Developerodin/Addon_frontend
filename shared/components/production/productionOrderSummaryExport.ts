import type { OrderSummaryMetrics, OrderSummaryRow } from "@/shared/services/productionService";

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
 * Downloads the current order-summary rows as a CSV file.
 * @param rows Page results to export
 * @param totals Filter-wide totals footer row
 */
export function downloadOrderSummaryCsv(rows: OrderSummaryRow[], totals: OrderSummaryMetrics): void {
  const headers = [
    "Order number",
    "Order name",
    "Priority",
    "Status",
    "Articles",
    "Total qty",
    "Hold qty",
    "Knit pending with hold",
    "Knit pending without hold",
    "WIP qty",
    "Transfer qty",
  ];

  const body = rows.map((row) => [
    row.orderNumber || row.orderId,
    row.orderNote ?? "",
    row.priority ?? "",
    row.status ?? "",
    row.articleCount,
    row.totalQty,
    row.holdQty,
    row.knitPendingWithHold,
    row.knitPendingWithoutHold,
    row.wipQty,
    row.transferQty,
  ]);

  body.push([
    "TOTAL (all matching)",
    "",
    "",
    "",
    totals.articleCount,
    totals.totalQty,
    totals.holdQty,
    totals.knitPendingWithHold,
    totals.knitPendingWithoutHold,
    totals.wipQty,
    totals.transferQty,
  ]);

  const csvContent = [headers.map(csvCell).join(","), ...body.map((r) => r.map(csvCell).join(","))].join("\n");
  const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const now = new Date();
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  a.href = url;
  a.download = `production-order-summary-${ts}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
