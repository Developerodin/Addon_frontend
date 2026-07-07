import type { CatalogueAttrsEntry } from "@/shared/services/whmsWarehouseOrderService";
import type {
  WarehouseOrderStyleCodeMultiPairRow,
  WarehouseOrderStyleCodeSinglePairRow,
} from "@/shared/services/whmsWarehouseOrderService";

/** Field keys that can be highlighted when a row has issues. */
export type WarehouseOrderRowField =
  | "styleCode"
  | "pack"
  | "colour"
  | "type"
  | "pattern"
  | "quantity";

export type WarehouseOrderRowIssue = {
  field?: WarehouseOrderRowField;
  message: string;
  severity: "error" | "warning";
};

export type WarehouseOrderRowDiagnostics = {
  issues: WarehouseOrderRowIssue[];
  invalidFields: Set<WarehouseOrderRowField>;
};

/**
 * Build per-field diagnostics for a single-pair warehouse order line.
 * @param row - Form row
 * @param catalogue - Catalogue attrs/diagnostics from WHMS API (keyed by styleCodeId)
 */
export function diagnoseSinglePairRow(
  row: WarehouseOrderStyleCodeSinglePairRow,
  catalogue?: CatalogueAttrsEntry,
): WarehouseOrderRowDiagnostics {
  const issues: WarehouseOrderRowIssue[] = [];
  const invalidFields = new Set<WarehouseOrderRowField>();
  const code = String(row.styleCode || "").trim();
  const styleCodeId = String(row.styleCodeId || "").trim();

  if (!code && !styleCodeId) {
    return { issues, invalidFields };
  }

  if (code && !styleCodeId) {
    issues.push({
      field: "styleCode",
      severity: "error",
      message: `Style code "${code}" is not linked — use Pick style code or add "${code}" in Catalog → Style codes first.`,
    });
    invalidFields.add("styleCode");
    return { issues, invalidFields };
  }

  if (styleCodeId && catalogue && !catalogue.styleCodeExists) {
    issues.push({
      field: "styleCode",
      severity: "error",
      message: `Style code "${code || styleCodeId}" is not in the system — add it in Catalog → Style codes first.`,
    });
    invalidFields.add("styleCode");
    return { issues, invalidFields };
  }

  if (styleCodeId && catalogue && !catalogue.hasLinkedProduct) {
    issues.push({
      field: "styleCode",
      severity: "error",
      message: `Style code "${code}" is in Style Code master but no product is linked in Catalog → Products. Link a product (with Color & Pattern) to auto-fill this row.`,
    });
    invalidFields.add("styleCode");
    if (!String(row.colour || "").trim()) invalidFields.add("colour");
    if (!String(row.pattern || "").trim()) invalidFields.add("pattern");
    return { issues, invalidFields };
  }

  if (!String(row.colour || "").trim()) {
    issues.push({
      field: "colour",
      severity: "warning",
      message: "Colour is empty — set it on the linked product or enter manually.",
    });
    invalidFields.add("colour");
  }

  if (!String(row.pattern || "").trim()) {
    issues.push({
      field: "pattern",
      severity: "warning",
      message: "Pattern is empty — set it on the linked product or enter manually.",
    });
    invalidFields.add("pattern");
  }

  if (!String(row.type || "").trim()) {
    issues.push({
      field: "type",
      severity: "warning",
      message: "Type (brand) is empty — re-pick the style code from catalog or enter manually.",
    });
    invalidFields.add("type");
  }

  if (styleCodeId && catalogue && catalogue.hasLinkedProduct && catalogue.availableStock <= 0) {
    issues.push({
      severity: "warning",
      message: `No warehouse stock for "${code}" — inward inventory in WHMS → Stock before pick & pack.`,
    });
  }

  return { issues, invalidFields };
}

/**
 * Build diagnostics for a multi-pair warehouse order line.
 * @param row - Form row
 */
export function diagnoseMultiPairRow(
  row: WarehouseOrderStyleCodeMultiPairRow,
): WarehouseOrderRowDiagnostics {
  const issues: WarehouseOrderRowIssue[] = [];
  const invalidFields = new Set<WarehouseOrderRowField>();
  const code = String(row.styleCode || "").trim();
  const pairId = String(row.styleCodeMultiPairId || "").trim();

  if (!code && !pairId) {
    return { issues, invalidFields };
  }

  if (code && !pairId) {
    issues.push({
      field: "styleCode",
      severity: "error",
      message: `Pair "${code}" is not linked — use Pick pair or add it in Catalog → Style code pairs first.`,
    });
    invalidFields.add("styleCode");
  }

  return { issues, invalidFields };
}
