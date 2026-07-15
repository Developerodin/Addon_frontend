import type {
  ReceivedDataRow,
  TransferredDataRow,
  VendorBrandingType,
  VendorProductionFlow,
  VendorTransferItem,
} from "@/shared/services/vendorProductionFlowService";
import type { StyleCodeByVendorRow } from "@/shared/services/productService";

/** Draft row for style + qty lines (PATCH stores StyleCode id in `styleCode`). */
export type TransferredStyleRowDraft = {
  styleCodeId: string;
  brand: string;
  transferred: number;
  /** Heat Transfer → Final Checking; Embroidery → Re-Boarding → Final Checking. */
  brandingType?: VendorBrandingType;
  /** Populated for rows loaded from API `transferredData` (branding drawer: read-only). */
  fromServer?: boolean;
};

/** Backend may return `id` or `_id` for StyleCode — must match `<option value>` and PATCH `styleCode`. */
export function styleOptionId(s: StyleCodeByVendorRow): string {
  const raw = s.id ?? s._id;
  if (raw == null) return "";
  return String(raw).trim();
}

/** One brand per dropdown row (first matching style id when brands repeat). */
export type BrandSelectOption = { brand: string; styleCodeId: string };

/**
 * Builds brand-only select options from style catalog rows.
 * @param styleOptions - Style codes from vendor catalog API
 * @param allowedStyleCodeIds - When set, only include these style ids (e.g. inbound filter)
 */
export function buildBrandSelectOptions(
  styleOptions: StyleCodeByVendorRow[],
  allowedStyleCodeIds?: Set<string>,
): BrandSelectOption[] {
  const seenBrands = new Set<string>();
  const out: BrandSelectOption[] = [];

  for (const s of styleOptions) {
    const styleCodeId = styleOptionId(s);
    if (!styleCodeId) continue;
    if (allowedStyleCodeIds?.size && !allowedStyleCodeIds.has(styleCodeId)) {
      continue;
    }
    const brand = (s.brand ?? "").trim();
    if (!brand || seenBrands.has(brand)) continue;
    seenBrands.add(brand);
    out.push({ brand, styleCodeId });
  }

  return out.sort((a, b) => a.brand.localeCompare(b.brand));
}

/**
 * Display label for a stored style id — brand only (no style code).
 * @param styleOptions - Style catalog for lookup
 * @param styleCodeId - Stored style master id
 * @param fallbackBrand - Row `brand` field when catalog lookup fails
 */
export function brandLabelForStyleId(
  styleOptions: StyleCodeByVendorRow[],
  styleCodeId: string,
  fallbackBrand?: string,
): string {
  const sid = styleCodeId.trim();
  if (!sid) return fallbackBrand?.trim() || "—";
  const opt = styleOptions.find((o) => styleOptionId(o) === sid);
  if (opt?.brand?.trim()) return opt.brand.trim();
  return fallbackBrand?.trim() || "—";
}

export function rowsFromTransferredApi(
  data: TransferredDataRow[] | undefined,
  opts?: { markRowsFromServer?: boolean },
): TransferredStyleRowDraft[] {
  if (!data?.length) return [{ styleCodeId: "", brand: "", transferred: 0 }];
  const mark = opts?.markRowsFromServer ?? false;
  return data.map((r) => ({
    styleCodeId: (r.styleCode ?? "").trim(),
    brand: (r.brand ?? "").trim(),
    transferred: Math.max(0, Number(r.transferred) || 0),
    brandingType: r.brandingType,
    ...(mark ? { fromServer: true as const } : {}),
  }));
}

/** New (non-server) row with qty or style chosen — exclude blank spacer rows from PATCH. */
export function isMeaningfulEditableTransferredRow(
  r: TransferredStyleRowDraft,
): boolean {
  const t = Math.max(0, Number(r.transferred) || 0);
  if (t > 0) return true;
  return Boolean(r.styleCodeId.trim());
}

/**
 * Sum qty on read-only rows loaded from API `transferredData` (`fromServer`).
 * @param rows - Drawer breakdown rows
 */
export function sumRecordedTransferredRows(
  rows: TransferredStyleRowDraft[],
): number {
  return rows
    .filter((r) => r.fromServer)
    .reduce((sum, r) => sum + Math.max(0, Number(r.transferred) || 0), 0);
}

/**
 * Sum qty on new editable rows only (delta PATCH / staging payload).
 * @param rows - Drawer breakdown rows
 */
export function sumDeltaTransferredRows(
  rows: TransferredStyleRowDraft[],
): number {
  return rows
    .filter((r) => !r.fromServer && isMeaningfulEditableTransferredRow(r))
    .reduce((sum, r) => sum + Math.max(0, Number(r.transferred) || 0), 0);
}

export type TransferredBreakdownValidation = {
  recordedTotal: number;
  deltaTotal: number;
  projectedLineTotal: number;
  receivedCap: number;
  remainingCap: number;
  deltaOverRemaining: boolean;
  projectedOverReceived: boolean;
  isValid: boolean;
};

/**
 * Validates branding / re-boarding breakdown: recorded lines are already persisted;
 * only delta qty is checked against `remainingCap`. Projected total must stay ≤ received
 * (matches backend merge + lineSum cap).
 * @param rows - Drawer breakdown rows
 * @param receivedCap - Floor `received` scalar
 * @param remainingCap - Floor `remaining` scalar (max new qty this session)
 */
/**
 * Sum delta qty on editable rows, optionally excluding one row index.
 * @param rows - Drawer breakdown rows
 * @param excludeIndex - Row index to omit (e.g. the row being edited)
 */
export function sumOtherDeltaTransferredRows(
  rows: TransferredStyleRowDraft[],
  excludeIndex?: number,
): number {
  return rows.reduce((sum, r, i) => {
    if (r.fromServer || i === excludeIndex) return sum;
    if (!isMeaningfulEditableTransferredRow(r)) return sum;
    return sum + Math.max(0, Number(r.transferred) || 0);
  }, 0);
}

/**
 * Max qty allowed on one editable row given other delta lines and floor caps.
 * @param rows - Drawer breakdown rows
 * @param rowIndex - Editable row index
 * @param receivedCap - Floor `received` scalar
 * @param remainingCap - Floor `remaining` scalar
 */
export function getEditableRowQtyCap(
  rows: TransferredStyleRowDraft[],
  rowIndex: number,
  receivedCap: number,
  remainingCap: number,
): number {
  const recordedTotal = sumRecordedTransferredRows(rows);
  const otherDeltaTotal = sumOtherDeltaTransferredRows(rows, rowIndex);
  const received = Math.max(0, receivedCap);
  const remaining = Math.max(0, remainingCap);
  const maxByRemaining = Math.max(0, remaining - otherDeltaTotal);
  const maxByReceived = Math.max(0, received - recordedTotal - otherDeltaTotal);
  return Math.min(maxByRemaining, maxByReceived);
}

/**
 * Inline qty error for one editable row — null when value is within caps.
 * @param rows - Drawer breakdown rows
 * @param rowIndex - Editable row index
 * @param receivedCap - Floor `received` scalar
 * @param remainingCap - Floor `remaining` scalar
 */
export function getEditableRowQtyError(
  rows: TransferredStyleRowDraft[],
  rowIndex: number,
  receivedCap: number,
  remainingCap: number,
): string | null {
  const row = rows[rowIndex];
  if (!row || row.fromServer) return null;

  const qty = Math.max(0, Number(row.transferred) || 0);
  if (qty <= 0) return null;

  const recordedTotal = sumRecordedTransferredRows(rows);
  const otherDeltaTotal = sumOtherDeltaTransferredRows(rows, rowIndex);
  const received = Math.max(0, receivedCap);
  const remaining = Math.max(0, remainingCap);
  const maxByRemaining = Math.max(0, remaining - otherDeltaTotal);
  const maxByReceived = Math.max(0, received - recordedTotal - otherDeltaTotal);
  const cap = Math.min(maxByRemaining, maxByReceived);

  if (qty <= cap) return null;

  if (qty > maxByRemaining && maxByRemaining <= maxByReceived) {
    return `Max ${maxByRemaining.toLocaleString()} — exceeds remaining`;
  }
  if (qty > maxByReceived && maxByReceived < maxByRemaining) {
    return `Max ${maxByReceived.toLocaleString()} — exceeds received cap`;
  }
  return `Max ${cap.toLocaleString()} — exceeds allowed qty`;
}

export function validateTransferredBreakdown(
  rows: TransferredStyleRowDraft[],
  receivedCap: number,
  remainingCap: number,
): TransferredBreakdownValidation {
  const recordedTotal = sumRecordedTransferredRows(rows);
  const deltaTotal = sumDeltaTransferredRows(rows);
  const projectedLineTotal = recordedTotal + deltaTotal;
  const received = Math.max(0, receivedCap);
  const remaining = Math.max(0, remainingCap);
  const deltaOverRemaining = deltaTotal > remaining;
  const projectedOverReceived = projectedLineTotal > received;
  return {
    recordedTotal,
    deltaTotal,
    projectedLineTotal,
    receivedCap: received,
    remainingCap: remaining,
    deltaOverRemaining,
    projectedOverReceived,
    isValid: !deltaOverRemaining && !projectedOverReceived,
  };
}

/**
 * Branding PATCH: send only new (non-server) lines with qty &gt; 0. Server merges into
 * existing `transferredData` by trimmed styleCode + brand (see vendor branding floor API).
 */
export function brandingDeltaTransferredRows(
  rows: TransferredStyleRowDraft[],
  styleOptions: StyleCodeByVendorRow[],
  defaultBrandingType?: VendorBrandingType,
): TransferredDataRow[] {
  const editable = rows.filter(
    (r) => !r.fromServer && isMeaningfulEditableTransferredRow(r),
  );
  return toTransferredPayloadRows(editable, styleOptions, defaultBrandingType).filter(
    (row) => (Number(row.transferred) || 0) > 0,
  );
}

export function toTransferredPayloadRows(
  rows: TransferredStyleRowDraft[],
  styleOptions: StyleCodeByVendorRow[],
  defaultBrandingType?: VendorBrandingType,
): TransferredDataRow[] {
  return rows.map((r) => {
    let styleCode = r.styleCodeId.trim();
    let brand = r.brand.trim();
    if (styleCode && !brand) {
      const opt = styleOptions.find((o) => styleOptionId(o) === styleCode);
      if (opt) brand = (opt.brand ?? "").trim();
    }
    const brandingType = r.brandingType ?? defaultBrandingType;
    return {
      transferred: Math.max(0, Number(r.transferred) || 0),
      styleCode,
      brand,
      ...(brandingType ? { brandingType } : {}),
    };
  });
}

/**
 * Build `transferItems` for `PATCH .../transfer` (branding → finalChecking).
 * Prefer human `styleCode` + `brand` from catalog when available; otherwise fall back to draft ids.
 */
export function toVendorTransferItems(
  rows: TransferredStyleRowDraft[],
  styleOptions: StyleCodeByVendorRow[],
): VendorTransferItem[] {
  return rows
    .filter((r) => (Number(r.transferred) || 0) > 0)
    .map((r) => {
      const sid = r.styleCodeId.trim();
      const opt = sid
        ? styleOptions.find((o) => styleOptionId(o) === sid)
        : undefined;
      /** Style master id (Mongo/ObjectId string) — matches `transferredData.styleCode` and transfer API. */
      const styleCode = sid;
      const brand = (r.brand.trim() || opt?.brand?.trim() || "").trim();
      return {
        transferred: Math.max(0, Number(r.transferred) || 0),
        styleCode,
        brand,
      };
    });
}

const STYLE_BRAND_SEP = "\u0001";

/** Normalize branding type from a line or flow fallback. */
function normalizeBrandingType(
  brandingType?: string | null,
  flowFallback?: VendorBrandingType,
): VendorBrandingType | undefined {
  const bt = String(brandingType ?? "").trim();
  if (bt === "Heat Transfer" || bt === "Embroidery") return bt;
  const fb = String(flowFallback ?? "").trim();
  if (fb === "Heat Transfer" || fb === "Embroidery") return fb;
  return undefined;
}

/**
 * Stable style + brand key for sibling branding-type inference.
 * @param styleCode - Style master id
 * @param brand - Brand label
 */
function styleBrandKey(styleCode: string, brand: string): string {
  return `${styleCode.trim()}${STYLE_BRAND_SEP}${brand.trim()}`;
}

/**
 * Infer brandingType for one legacy branding `transferredData` row.
 * @param row - Row to infer
 * @param allRows - Full breakdown for sibling detection
 * @param flowFallback - Flow-level branding type
 */
function inferBrandingTransferredRowType(
  row: TransferredDataRow,
  allRows: TransferredDataRow[],
  flowFallback?: VendorBrandingType,
): VendorBrandingType | undefined {
  const existing =
    normalizeBrandingType(row.brandingType) ??
    normalizeBrandingType(undefined, flowFallback);
  if (existing) return existing;

  const k = styleBrandKey(String(row.styleCode ?? ""), String(row.brand ?? ""));
  const hasEmbroiderySibling = allRows.some((r) => {
    if (r === row) return false;
    const rk = styleBrandKey(String(r.styleCode ?? ""), String(r.brand ?? ""));
    return rk === k && normalizeBrandingType(r.brandingType) === "Embroidery";
  });
  if (hasEmbroiderySibling) return "Heat Transfer";

  return "Heat Transfer";
}

/**
 * Enrich branding floor `transferredData` with inferred `brandingType` for display.
 * Legacy HT lines saved before per-row type are stamped as Heat Transfer.
 * @param rows - Raw `branding.transferredData` from API
 * @param flow - Optional flow for flow-level fallback and mixed-row inference
 */
export function enrichBrandingTransferredDataForDisplay(
  rows: TransferredDataRow[] | undefined,
  flow?: VendorProductionFlow | null,
): TransferredDataRow[] {
  if (!rows?.length) return [];
  const flowFallback = normalizeBrandingType(flow?.brandingType);
  return rows.map((r) => {
    const existing = normalizeBrandingType(r.brandingType);
    const inferred =
      existing ?? inferBrandingTransferredRowType(r, rows, flowFallback);
    return inferred ? { ...r, brandingType: inferred } : r;
  });
}

/** List cell / chip label — `styleCode` field is often an ObjectId. */
export function formatTransferredRowLabel(
  row: TransferredDataRow | ReceivedDataRow,
  options?: { brandingType?: VendorBrandingType },
): string {
  const qty = row.transferred ?? 0;
  const brand = row.brand?.trim();
  const sc = row.styleCode?.trim();
  const resolvedType =
    ("brandingType" in row
      ? normalizeBrandingType(row.brandingType)
      : undefined) ?? options?.brandingType;
  const bt = resolvedType ? ` · ${resolvedType}` : "";
  if (brand && sc) return `${brand}${bt} · ${qty.toLocaleString()}`;
  if (brand) return `${brand}${bt} · ${qty.toLocaleString()}`;
  if (sc) return `${sc.slice(0, 10)}…${bt} · ${qty.toLocaleString()}`;
  return `${qty.toLocaleString()}${bt}`;
}

/**
 * Resolve staging destination label from delta transferredData rows.
 * @param rows - Delta lines with optional brandingType per row
 * @param flowFallback - Legacy flow-level branding type
 */
export function resolveBrandingStageTargetLabel(
  rows: TransferredDataRow[],
  flowFallback?: VendorBrandingType,
): "Re-Boarding" | "Final Checking" {
  const types = new Set<VendorBrandingType>();
  for (const r of rows) {
    const qty = Math.max(0, Number(r.transferred) || 0);
    if (qty <= 0) continue;
    const bt = r.brandingType ?? flowFallback;
    if (bt) types.add(bt);
  }
  if (types.size === 1 && types.has("Embroidery")) return "Re-Boarding";
  if (types.size === 1 && types.has("Heat Transfer")) return "Final Checking";
  if (flowFallback === "Embroidery") return "Re-Boarding";
  return "Final Checking";
}
