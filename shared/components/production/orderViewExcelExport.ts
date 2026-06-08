import * as XLSX from "xlsx";
import type { ArticleProcess } from "@/shared/services/productionService";
import {
  floorKeyHasQualityMetrics,
  getArticleProcessRouteLabel,
  getFloorKeyDisplayName,
  resolveArticleDisplayFloorKeys,
  type LinkingType,
} from "@/shared/utils/productionUtils";
import type { OrderViewArticle, OrderViewOrderInfo } from "./OrderViewArticlesTab";

/**
 * Computes article progress percentage from API or planned/completed quantities.
 */
function calculateProgress(article: OrderViewArticle): number {
  if (article.progress !== undefined) return article.progress;
  if (!article.plannedQuantity) return 0;
  return Math.round(((article.completedQuantity || 0) / article.plannedQuantity) * 100);
}

/**
 * Formats an ISO date for Excel display.
 */
function formatExportDate(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

/**
 * Returns floor keys for export using process route + floorQuantities fallback.
 */
function getFloorKeysForExport(
  article: OrderViewArticle,
  processesByArticleId: Record<string, ArticleProcess[]>
): string[] {
  const articleId = article._id || article.id;
  return resolveArticleDisplayFloorKeys(
    article.floorQuantities,
    processesByArticleId[articleId],
    article.linkingType as LinkingType
  );
}

/**
 * Build and download a multi-sheet Excel workbook for one production order
 * (order summary, article summary, floor-wise progress per article).
 */
export function downloadOrderArticlesExcel(
  order: OrderViewOrderInfo,
  articles: OrderViewArticle[],
  processesByArticleId: Record<string, ArticleProcess[]>
): void {
  const wb = XLSX.utils.book_new();
  const dateStamp = new Date().toISOString().split("T")[0];
  const orderNumber = order.orderNumber || order.id;

  const orderRows: { Field: string; Value: string | number }[] = [
    { Field: "Order number", Value: orderNumber },
    { Field: "Order ID", Value: order.id },
    { Field: "Priority", Value: order.priority },
    { Field: "Status", Value: order.status },
    { Field: "Current floor", Value: order.currentFloor || order.floor || "" },
    { Field: "Article count", Value: articles.length },
    { Field: "Order note", Value: order.orderNote || "" },
    { Field: "Created at", Value: formatExportDate(order.createdAt) },
    { Field: "Updated at", Value: formatExportDate(order.updatedAt) },
    { Field: "Exported at", Value: new Date().toLocaleString() },
  ];

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orderRows), "Order");

  const articleRows = articles.map((article) => ({
    "Order number": orderNumber,
    "Order priority": order.priority,
    "Order status": order.status,
    "Order current floor": order.currentFloor || order.floor || "",
    "Article number": article.articleNumber || "",
    "Linking type": article.linkingType || "",
    "Article priority": article.priority || "",
    "Article status": article.status || "",
    "Current floor": article.currentFloor || "",
    "Planned qty": article.plannedQuantity ?? 0,
    "Completed qty": article.completedQuantity ?? 0,
    "Progress %": calculateProgress(article),
    "Final QC": article.finalQualityConfirmed === undefined
      ? ""
      : article.finalQualityConfirmed
        ? "Confirmed"
        : "Pending",
    "Knitting code": article.knittingCode || "",
    "Process route": getArticleProcessRouteLabel(
      article.floorQuantities,
      processesByArticleId[article._id || article.id],
      article.linkingType as LinkingType
    ),
    Remarks: article.remarks || "",
    "Created at": formatExportDate(article.createdAt),
    "Updated at": formatExportDate(article.updatedAt),
  }));

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(articleRows.length ? articleRows : [{ Message: "No articles" }]),
    "Articles"
  );

  const floorRows: Record<string, string | number>[] = [];
  for (const article of articles) {
    const floorKeys = getFloorKeysForExport(article, processesByArticleId);
    for (const floorKey of floorKeys) {
      const data = article.floorQuantities?.[floorKey];
      const hasQuality = floorKeyHasQualityMetrics(floorKey);
      floorRows.push({
        "Order number": orderNumber,
        "Article number": article.articleNumber || "",
        "Linking type": article.linkingType || "",
        "Article status": article.status || "",
        "Article current floor": article.currentFloor || "",
        Floor: getFloorKeyDisplayName(floorKey),
        Received: data?.received ?? 0,
        Completed: data?.completed ?? 0,
        Remaining: data?.remaining ?? Math.max(0, (data?.received ?? 0) - (data?.transferred ?? 0)),
        Transferred: data?.transferred ?? 0,
        M1: hasQuality ? (data?.m1Quantity ?? 0) : "",
        M2: hasQuality ? (data?.m2Quantity ?? 0) : "",
        M3: hasQuality ? (data?.m3Quantity ?? 0) : "",
        M4: hasQuality ? (data?.m4Quantity ?? 0) : "",
        "Repair status": data?.repairStatus || "",
        "Repair remarks": data?.repairRemarks || "",
      });
    }
  }

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(floorRows.length ? floorRows : [{ Message: "No floor progress" }]),
    "Floor Progress"
  );

  XLSX.writeFile(wb, `order-${orderNumber}-articles-${dateStamp}.xlsx`);
}
