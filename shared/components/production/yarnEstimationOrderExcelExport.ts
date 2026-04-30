import * as XLSX from "xlsx";
import type { OrderEstimation } from "@/shared/services/yarnEstimationService";

/** @returns finite number or 0 */
function nz(n: number | undefined | null): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

/**
 * Build and download a multi-sheet Excel workbook for one yarn-estimation order
 * (order summary, per-article totals, flattened yarn lines).
 *
 * @param order - Response from `yarnEstimationService.getByOrder`
 */
export function downloadYarnEstimationOrderExcel(order: OrderEstimation): void {
  const wb = XLSX.utils.book_new();
  const dateStamp = new Date().toISOString().split("T")[0];
  const o = order.orderTotals;
  const ofp = order.orderFloorProgress;
  const orderRows: { Field: string; Value: string | number }[] = [
    { Field: "Order number", Value: order.orderNumber },
    { Field: "Order ID", Value: String(order.orderId) },
    { Field: "Status", Value: order.status },
    ...(order.priority ? [{ Field: "Priority", Value: order.priority }] : []),
    { Field: "Issued net (kg)", Value: nz(o?.issued?.netWeight) },
    { Field: "Issued cones", Value: nz(o?.issued?.cones) },
    { Field: "Returned net (kg)", Value: nz(o?.returned?.netWeight) },
    { Field: "Returned cones", Value: nz(o?.returned?.cones) },
    { Field: "Consumption net (kg)", Value: nz(o?.consumption?.netWeight) },
    { Field: "Consumption cones", Value: nz(o?.consumption?.cones) },
  ];

  if (ofp) {
    const m4 = ofp.knittingM4QuantityTotal ?? 0;
    orderRows.push(
      { Field: "Planned qty (order total)", Value: nz(ofp.plannedQuantityTotal) },
      { Field: "Knitting completed (order total)", Value: nz(ofp.knittingCompletedTotal) },
      { Field: "Knitting M4 (order total)", Value: m4 },
      {
        Field: "Knitting floor qty (completed + M4)",
        Value: nz(ofp.knittingCompletedTotal) + m4,
      },
      { Field: "Knitting batch weight (kg, order total)", Value: nz(ofp.knittingBatchWeightTotal) }
    );
  }

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orderRows), "Order");

  const articleRows = order.articles.map((a) => {
    const fp = a.floorProgress;
    const k = fp?.knitting;
    return {
      "Article number": a.articleNumber,
      "Planned qty": nz(a.plannedQuantity),
      "Knitting completed": nz(k?.completed),
      "Knitting M4": nz(k?.m4Quantity),
      "Knitting received": nz(k?.received),
      "Knitting remaining": nz(k?.remaining),
      "Knitting weight (kg)": nz(k?.weight),
      "Issued net (kg)": nz(a.totals?.issued?.netWeight),
      "Returned net (kg)": nz(a.totals?.returned?.netWeight),
      "Consumption net (kg)": nz(a.totals?.consumption?.netWeight),
      "Issued cones": nz(a.totals?.issued?.cones),
      "Returned cones": nz(a.totals?.returned?.cones),
      "Consumption cones": nz(a.totals?.consumption?.cones),
    };
  });
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(articleRows.length ? articleRows : [{ Message: "No articles" }]),
    "Articles"
  );

  const yarnRows: Record<string, string | number>[] = [];
  for (const a of order.articles) {
    for (const y of a.yarns) {
      yarnRows.push({
        "Order number": order.orderNumber,
        "Article number": a.articleNumber,
        "Yarn name": y.yarnName,
        "BOM qty": nz(y.bomQuantity),
        "Issued net (kg)": nz(y.issued?.netWeight),
        "Issued cones": nz(y.issued?.cones),
        "Returned net (kg)": nz(y.returned?.netWeight),
        "Returned cones": nz(y.returned?.cones),
        "Consumption net (kg)": nz(y.consumption?.netWeight),
        "Consumption cones": nz(y.consumption?.cones),
      });
    }
  }
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(yarnRows.length ? yarnRows : [{ Message: "No yarn rows" }]),
    "Yarn lines"
  );

  const safeName = order.orderNumber.replace(/[/\\?%*:|"<>]/g, "-");
  XLSX.writeFile(wb, `yarn-estimation_${safeName}_${dateStamp}.xlsx`);
}
