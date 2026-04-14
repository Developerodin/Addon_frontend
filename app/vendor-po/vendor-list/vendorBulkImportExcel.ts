import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import type { BulkImportVendorsBody, BulkVendorItem } from "@/shared/services/vendorManagementService";

/**
 * Vendor bulk Excel — one row per vendor. Products are column-wise: factoryCode1, factoryCode2, …
 * (Optional legacy: a single `factoryCode` column if no numbered columns are present.)
 */

const VENDORS_SHEET = "Vendors";

/** How many factoryCodeN columns appear on the downloadable template (users may add more columns in Excel). */
const TEMPLATE_FACTORY_CODE_COLUMNS = 8;

function str(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return "";
}

/** Match header variants: factoryCode1, factory_code_1, Factory Code 1, … */
function parseFactoryCodeColumnIndex(headerKey: string): number | null {
  const key = headerKey.trim();
  if (!key) return null;
  const compact = key.replace(/\s+/g, "").replace(/_/g, "");
  const m = /^factorycode(\d+)$/i.exec(compact);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Collect `{ factoryCode }[]` from factoryCode1…factoryCodeN columns (sorted by index).
 * If any numbered column has a value, only numbered columns are used.
 * Otherwise falls back to a single `factoryCode` / `Factory Code` column.
 */
function collectProductsFromRow(row: Record<string, unknown>): { factoryCode: string }[] {
  const byIndex = new Map<number, string>();

  for (const [headerKey, raw] of Object.entries(row)) {
    const idx = parseFactoryCodeColumnIndex(headerKey);
    if (idx === null) continue;
    const v = raw !== undefined && raw !== null ? String(raw).trim() : "";
    if (v) byIndex.set(idx, v);
  }

  if (byIndex.size > 0) {
    const sorted = [...byIndex.keys()].sort((a, b) => a - b);
    return sorted.map((i) => ({ factoryCode: byIndex.get(i)! }));
  }

  const legacy = str(row, "factoryCode", "FactoryCode", "factory_code", "Factory Code");
  if (legacy) return [{ factoryCode: legacy }];
  return [];
}

function isBlankRow(row: Record<string, unknown>): boolean {
  const code = str(row, "vendorCode", "VendorCode", "vendor_code", "Vendor Code");
  const name = str(row, "vendorName", "VendorName", "vendor_name", "Vendor Name");
  if (code || name) return false;
  if (collectProductsFromRow(row).length > 0) return false;
  return Object.values(row).every((v) => v === undefined || v === null || String(v).trim() === "");
}

function buildTemplateDataRow(
  base: Record<string, string>,
  factorySamples: string[]
): Record<string, string> {
  const row: Record<string, string> = { ...base };
  for (let i = 0; i < TEMPLATE_FACTORY_CODE_COLUMNS; i++) {
    const key = `factoryCode${i + 1}`;
    row[key] = factorySamples[i] ?? "";
  }
  return row;
}

export function downloadVendorBulkExcelTemplate(): void {
  const vendorsSheet = [
    buildTemplateDataRow(
      {
        vendorCode: "V001",
        vendorName: "Example Vendor Pvt Ltd",
        status: "active",
        city: "Surat",
        state: "GJ",
        notes: "",
        address: "",
        gstin: "",
        contactName: "Primary contact",
        phone: "9876543210",
        email: "",
      },
      ["FC-1001", "FC-1002", "", "", "", "", "", ""]
    ),
    buildTemplateDataRow(
      {
        vendorCode: "V002",
        vendorName: "Second Example Vendor",
        status: "active",
        city: "Mumbai",
        state: "MH",
        notes: "",
        address: "",
        gstin: "",
        contactName: "Another contact",
        phone: "9123456789",
        email: "",
      },
      ["FC-2001", "", "", "", "", "", "", ""]
    ),
  ];

  const instructions = [
    {
      Field: "LAYOUT",
      Description:
        "One row per vendor. Use columns factoryCode1, factoryCode2, factoryCode3, … for multiple products (same row). Add more factoryCodeN columns in Excel if needed.",
    },
    {
      Field: "vendorCode",
      Description: "Required. Unique vendor code.",
    },
    {
      Field: "vendorName, status",
      Description: "Required. status: active or inactive.",
    },
    {
      Field: "contactName, phone",
      Description: "Required. email optional.",
    },
    {
      Field: "factoryCode1 … factoryCodeN",
      Description:
        "Optional columns: catalog factory codes for product 1, product 2, … Leave blank if unused. At least one product column (or legacy single factoryCode) required per row.",
    },
    {
      Field: "city, state, notes, address, gstin",
      Description: "Optional header fields.",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(vendorsSheet);
  const wsInst = XLSX.utils.json_to_sheet(instructions);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, VENDORS_SHEET);
  XLSX.utils.book_append_sheet(wb, wsInst, "Instructions");
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([wbout], { type: "application/octet-stream" }),
    "vendor-bulk-import-template.xlsx"
  );
}

/**
 * Reads the first worksheet (or sheet named "Vendors" if present) and builds the bulk API body.
 */
export function parseVendorBulkExcelToBody(buffer: ArrayBuffer): BulkImportVendorsBody {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName =
    wb.SheetNames.find((n) => n.trim().toLowerCase() === VENDORS_SHEET.toLowerCase()) ??
    wb.SheetNames[0];
  if (!sheetName) {
    throw new Error("The Excel file has no worksheets.");
  }
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName] || {}, {
    defval: "",
    raw: false,
  });
  if (!rawRows.length) {
    throw new Error("No data rows found. Use the Template and fill the Vendors sheet.");
  }

  const vendors: BulkVendorItem[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (isBlankRow(row)) continue;

    const vendorCode = str(row, "vendorCode", "VendorCode", "vendor_code", "Vendor Code");
    if (!vendorCode) {
      throw new Error(
        `Excel row ${i + 2}: vendorCode is required on each vendor row (column-wise products: use factoryCode1, factoryCode2, … on the same row).`
      );
    }

    const vendorName = str(row, "vendorName", "VendorName", "vendor_name", "Vendor Name");
    const statusRaw = str(row, "status", "Status");
    const status = statusRaw || "active";
    const contactName = str(row, "contactName", "ContactName", "contact_name", "Contact Name");
    const phone = str(row, "phone", "Phone");
    const email = str(row, "email", "Email");
    const city = str(row, "city", "City");
    const state = str(row, "state", "State");
    const notes = str(row, "notes", "Notes");
    const address = str(row, "address", "Address");
    const gstin = str(row, "gstin", "GSTIN", "Gstin");

    if (!vendorName) {
      throw new Error(`Excel row ${i + 2}: vendorName is required.`);
    }
    if (!contactName || !phone) {
      throw new Error(`Excel row ${i + 2}: contactName and phone are required.`);
    }

    const products = collectProductsFromRow(row);
    if (products.length === 0) {
      throw new Error(
        `Excel row ${i + 2} (${vendorCode}): add at least one factory code in factoryCode1, factoryCode2, … (or the legacy factoryCode column).`
      );
    }

    const header: BulkVendorItem["header"] = {
      vendorCode,
      vendorName,
      status,
      ...(city ? { city } : {}),
      ...(state ? { state } : {}),
      ...(notes ? { notes } : {}),
      ...(address ? { address } : {}),
      ...(gstin ? { gstin } : {}),
    };

    vendors.push({
      header,
      contactPersons: [
        {
          contactName,
          phone,
          ...(email ? { email } : {}),
        },
      ],
      products,
    });
  }

  if (vendors.length === 0) {
    throw new Error("No vendors parsed. Fill at least one row with vendorCode.");
  }

  return { vendors };
}
