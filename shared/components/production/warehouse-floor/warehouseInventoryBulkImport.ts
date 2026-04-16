import * as XLSX from "xlsx";
import type { WhmsWarehouseInventoryBulkImportItem } from "@/shared/services/whmsService";

const TEMPLATE_FILENAME = "warehouse-inventory-import-template.xlsx";

/** Normalize Excel/CSV header for matching (ignore spaces, case, underscores). */
function headerKey(cell: unknown): string {
  return String(cell ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "");
}

const HEADER_TO_FIELD: Record<string, keyof WhmsWarehouseInventoryBulkImportItem> = {
  stylecode: "styleCode",
  totalquantity: "totalQuantity",
  blockedquantity: "blockedQuantity",
};

function mapHeader(h: string): keyof WhmsWarehouseInventoryBulkImportItem | null {
  return HEADER_TO_FIELD[headerKey(h)] ?? null;
}

function num(v: unknown, fallback: number): number {
  if (v === "" || v === null || v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

export function downloadWarehouseInventoryImportTemplate(): void {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet([
    {
      styleCode: "ABC-123",
      totalQuantity: 100,
      blockedQuantity: 5,
    },
  ]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Items");
  XLSX.writeFile(workbook, TEMPLATE_FILENAME);
}

export function parseWarehouseInventoryImportFile(buf: ArrayBuffer): {
  items: WhmsWarehouseInventoryBulkImportItem[];
  errors: string[];
} {
  const errors: string[] = [];
  const wb = XLSX.read(buf, { type: "array" });
  const name = wb.SheetNames[0];
  if (!name) {
    errors.push("File has no sheets.");
    return { items: [], errors };
  }
  const ws = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: false });
  if (!rows.length) {
    errors.push("No data rows found (header only or empty).");
    return { items: [], errors };
  }

  const first = rows[0] as Record<string, unknown>;
  const colMap = new Map<keyof WhmsWarehouseInventoryBulkImportItem, string>();
  for (const key of Object.keys(first)) {
    const field = mapHeader(key);
    if (field) colMap.set(field, key);
  }

  if (colMap.size < 3) {
    errors.push(
      "Missing columns. Expected: styleCode, totalQuantity, blockedQuantity (aliases like Style Code are OK).",
    );
    return { items: [], errors };
  }

  const items: WhmsWarehouseInventoryBulkImportItem[] = [];
  rows.forEach((row, idx) => {
    const line = idx + 2;
    const styleCode = String(row[colMap.get("styleCode")!] ?? "").trim();
    if (!styleCode) return;

    const totalQuantity = num(row[colMap.get("totalQuantity")!], 0);
    const blockedQuantity = num(row[colMap.get("blockedQuantity")!], 0);

    if (Number.isNaN(totalQuantity) || Number.isNaN(blockedQuantity)) {
      errors.push(`Row ${line}: totalQuantity and blockedQuantity must be numbers.`);
      return;
    }
    if (totalQuantity < 0 || blockedQuantity < 0) {
      errors.push(`Row ${line}: quantities cannot be negative.`);
      return;
    }
    items.push({ styleCode, totalQuantity, blockedQuantity });
  });

  if (!items.length && !errors.length) {
    errors.push("No valid rows to import.");
  }

  return { items, errors };
}
