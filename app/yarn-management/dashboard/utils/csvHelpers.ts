import type { YarnBox } from "@/shared/services/yarnBoxService";

/**
 * Formats an optional ISO-ish date string as YYYY-MM-DD for CSV.
 */
function formatDateForCsv(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

/** Display name for supplier column (box snapshot, populated supplier, or PO). */
function supplierLabel(box: YarnBox): string {
  return (
    box.supplierName ||
    box.supplier?.brandName ||
    box.supplier?.name ||
    box.purchaseOrder?.supplierName ||
    ""
  );
}

/**
 * Maps yarn boxes without storage to one CSV row per box (PO / lot / QC context for ops).
 */
export function buildUnallocatedBoxExportRows(
  boxes: YarnBox[]
): Record<string, string | number | boolean>[] {
  return boxes.map((box) => ({
    "Yarn Name": box.yarnName || "",
    "PO Number": box.poNumber || "",
    Supplier: supplierLabel(box),
    "PO Status": box.purchaseOrder?.currentStatus || "",
    "Box ID": box.boxId || "",
    Barcode: box.barcode || "",
    "Lot Number": box.lotNumber || "",
    "Shade Code": box.shadeCode || "",
    Cones: box.numberOfCones ?? "",
    "Box Weight (kg)": box.boxWeight ?? "",
    "Gross Weight (kg)": box.grossWeight ?? "",
    "QC Status": box.qcData?.status || "",
    "Received Date": formatDateForCsv(box.receivedDate ?? box.createdAt),
    "Stored Status": box.storedStatus === true ? "Allocated" : "Unallocated",
  }));
}

/**
 * Escapes a CSV cell value (RFC-style quoting for commas/quotes).
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Serialises an array of row objects to CSV text (first row = keys of first object).
 */
export function rowsToCsv(rows: Record<string, string | number | boolean>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  if (headers.length === 0) return "";
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((h) => escapeCsvCell(row[h])).join(",")
    ),
  ];
  return lines.join("\n");
}

/**
 * Triggers a browser download of CSV content as a file.
 */
export function downloadCsvFile(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
