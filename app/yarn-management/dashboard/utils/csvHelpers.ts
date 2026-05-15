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
 * Parses a CSV/API weight field to a finite number; empty strings and non-numbers become NaN.
 * @param value - Raw box or gross weight from the API.
 */
function parseKgField(value: unknown): number {
  if (value === null || value === undefined) return Number.NaN;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : Number.NaN;
  }
  const s = String(value).trim();
  if (s === "") return Number.NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : Number.NaN;
}

/**
 * Kg counted toward dashboard unallocated for this box (boxWeight only; gross ignored).
 * @param box - Yarn box without storage slot.
 */
function effectiveUnallocatedKg(box: YarnBox): number {
  const net = parseKgField(box.boxWeight);
  if (Number.isFinite(net) && net > 0) return net;
  return 0;
}

/**
 * True when the box has positive net box weight (gross-only rows are excluded).
 * @param box - Yarn box without storage slot.
 */
function hasPositiveBoxWeight(box: YarnBox): boolean {
  const net = parseKgField(box.boxWeight);
  return Number.isFinite(net) && net > 0;
}

/**
 * Maps yarn boxes without storage to one CSV row per box (PO / lot / QC context for ops).
 * Omits boxes with no positive boxWeight.
 */
export function buildUnallocatedBoxExportRows(
  boxes: YarnBox[]
): Record<string, string | number | boolean>[] {
  return boxes.filter(hasPositiveBoxWeight).map((box) => ({
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
    "Unallocated kg (box weight only)": effectiveUnallocatedKg(box),
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
