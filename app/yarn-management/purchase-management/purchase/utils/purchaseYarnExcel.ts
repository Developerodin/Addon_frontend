/**
 * Excel template and import for purchase order yarn items.
 * Columns: Shade Code, Count size, Yarn Type, Rate (empty in template), Quantity (empty), GST (5), Estimated Delivery Date (1 month forward).
 * Yarn Name is mapped automatically from shade code + count size + yarn type after import.
 */

import * as XLSX from "xlsx";

export const YARN_ITEMS_TEMPLATE_SHEET = "Yarn Items";
const TEMPLATE_HEADERS = [
  "Shade Code",
  "Count size",
  "Yarn Type",
  "Rate",
  "Quantity",
  "GST (%)",
  "Estimated Delivery Date",
];

export interface ParsedYarnRow {
  shadeCode: string;
  countSize: string;
  yarnType: string;
  rate: number;
  quantity: number;
  gst: number;
  estimatedDeliveryDate: string;
}

/** Default estimated delivery: first day of next month. */
function defaultEstDelivery(): string {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  return first.toISOString().split("T")[0];
}

/**
 * Build and download the yarn items Excel template.
 * Shade Code and Count size: user fills. Rate & Quantity: empty. GST 5 and Est. Delivery (1 month forward) pre-filled.
 */
export function downloadYarnItemsTemplate(): void {
  const wb = XLSX.utils.book_new();
  const sampleRow = [
    "e.g. SC-001",
    "e.g. 40s",
    "e.g. Nylon",
    "", // Rate - empty
    "", // Quantity - empty
    5, // GST (%)
    defaultEstDelivery(),
  ];
  const data = [TEMPLATE_HEADERS, sampleRow];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [
    { wch: 15 },
    { wch: 15 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, YARN_ITEMS_TEMPLATE_SHEET);
  XLSX.writeFile(wb, "purchase_yarn_items_template.xlsx");
}

/**
 * Export current yarn item rows so user can correct and re-import.
 */
export function downloadYarnItemsData(
  rows: ParsedYarnRow[],
  filename = "purchase_yarn_items_export.xlsx"
): void {
  const wb = XLSX.utils.book_new();
  const data = [
    TEMPLATE_HEADERS,
    ...rows.map((row) => [
      row.shadeCode || "",
      row.countSize || "",
      row.yarnType || "",
      row.rate ?? "",
      row.quantity ?? "",
      row.gst ?? 5,
      row.estimatedDeliveryDate || defaultEstDelivery(),
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [
    { wch: 15 },
    { wch: 15 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, YARN_ITEMS_TEMPLATE_SHEET);
  XLSX.writeFile(wb, filename);
}

/**
 * Parse Excel serial date or date string to ISO date (YYYY-MM-DD).
 */
function parseExcelDate(value: unknown): string {
  if (value == null || value === "") return "";
  const dateStr = String(value).trim();
  if (!dateStr) return "";

  if (/^\d+\.?\d*$/.test(dateStr)) {
    const serial = parseFloat(dateStr);
    if (serial > 0 && serial < 100000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const d = new Date(
        excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000
      );
      if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    }
  }

  const parts = dateStr.match(/^(\d{1,4})[-\/](\d{1,2})[-\/](\d{1,4})$/);
  if (parts) {
    const p1 = parseInt(parts[1], 10);
    const p2 = parseInt(parts[2], 10);
    const p3 = parseInt(parts[3], 10);
    let y: number, m: number, day: number;
    if (parts[1].length === 4) {
      y = p1;
      m = p2 - 1;
      day = p3;
    } else {
      day = p1;
      m = p2 - 1;
      y = p3;
      if (y < 100) y = y < 50 ? 2000 + y : 1900 + y;
    }
    const d = new Date(Date.UTC(y, m, day));
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }

  return dateStr;
}

function num(val: unknown): number {
  if (val == null || val === "") return 0;
  if (typeof val === "number" && !isNaN(val)) return val;
  const n = parseFloat(String(val).replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

function str(val: unknown): string {
  if (val == null) return "";
  return String(val).trim();
}

/**
 * Parse an uploaded Excel file and return rows for yarn items.
 * Expects first row to be headers; maps by header name (case-insensitive match on trimmed).
 */
export function parseYarnItemsExcelFile(
  file: File
): Promise<{ rows: ParsedYarnRow[]; errors: string[] }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    const errors: string[] = [];

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          resolve({ rows: [], errors: ["Could not read file."] });
          return;
        }
        const wb = XLSX.read(data, { type: "binary" });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const json: unknown[] = XLSX.utils.sheet_to_json(ws, {
          defval: "",
          raw: false,
        });
        if (!json.length) {
          resolve({ rows: [], errors: ["No data rows in the sheet."] });
          return;
        }

        const rows: ParsedYarnRow[] = [];
        const get = (row: Record<string, unknown>, keys: string[]) => {
          const key = Object.keys(row).find(
            (k) => keys.includes(k.trim().toLowerCase())
          );
          return key != null ? row[key] : undefined;
        };

        for (let i = 0; i < json.length; i++) {
          const row = json[i] as Record<string, unknown>;
          const shadeCode = str(
            get(row, ["shade code", "shadecode", "shade_code", "shade"])
          );
          const countSize = str(
            get(row, ["count size", "countsize", "count_size", "count", "size"])
          );
          const yarnType = str(
            get(row, ["yarn type", "yarntype", "yarn_type", "type"])
          );
          const rate = num(get(row, ["rate", "rate (₹)"]));
          const quantity = num(
            get(row, ["quantity", "quantity (kg)", "qty", "qty (kg)"])
          );
          const gst = num(get(row, ["gst (%)", "gst", "gst%"]));
          const estimatedDeliveryDate = parseExcelDate(
            get(row, [
              "estimated delivery date",
              "estimated delivery",
              "est. delivery",
              "delivery date",
            ])
          );

          if (!shadeCode && !countSize) {
            errors.push(`Row ${i + 2}: Shade Code or Count size is required.`);
            continue;
          }
          if (!estimatedDeliveryDate) {
            errors.push(
              `Row ${i + 2}: Estimated Delivery Date is required.`
            );
            continue;
          }

          rows.push({
            shadeCode,
            countSize,
            yarnType,
            rate,
            quantity,
            gst: gst >= 0 ? gst : 5,
            estimatedDeliveryDate,
          });
        }

        resolve({ rows, errors });
      } catch (err) {
        resolve({
          rows: [],
          errors: [
            err instanceof Error ? err.message : "Failed to parse Excel file.",
          ],
        });
      }
    };

    reader.onerror = () =>
      resolve({ rows: [], errors: ["Failed to read file."] });
    reader.readAsBinaryString(file);
  });
}
