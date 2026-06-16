import type {
  ReceivedDataRow,
  TransferredDataRow,
  VendorTransferItem,
} from "@/shared/services/vendorProductionFlowService";
import type { StyleCodeByVendorRow } from "@/shared/services/productService";

/** Draft row for style + qty lines (PATCH stores StyleCode id in `styleCode`). */
export type TransferredStyleRowDraft = {
  styleCodeId: string;
  brand: string;
  transferred: number;
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
 * Branding PATCH: send only new (non-server) lines with qty &gt; 0. Server merges into
 * existing `transferredData` by trimmed styleCode + brand (see vendor branding floor API).
 */
export function brandingDeltaTransferredRows(
  rows: TransferredStyleRowDraft[],
  styleOptions: StyleCodeByVendorRow[],
): TransferredDataRow[] {
  const editable = rows.filter(
    (r) => !r.fromServer && isMeaningfulEditableTransferredRow(r),
  );
  return toTransferredPayloadRows(editable, styleOptions).filter(
    (row) => (Number(row.transferred) || 0) > 0,
  );
}

export function toTransferredPayloadRows(
  rows: TransferredStyleRowDraft[],
  styleOptions: StyleCodeByVendorRow[],
): TransferredDataRow[] {
  return rows.map((r) => {
    let styleCode = r.styleCodeId.trim();
    let brand = r.brand.trim();
    if (styleCode && !brand) {
      const opt = styleOptions.find((o) => styleOptionId(o) === styleCode);
      if (opt) brand = (opt.brand ?? "").trim();
    }
    return {
      transferred: Math.max(0, Number(r.transferred) || 0),
      styleCode,
      brand,
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

/** List cell / chip label — `styleCode` field is often an ObjectId. */
export function formatTransferredRowLabel(
  row: TransferredDataRow | ReceivedDataRow,
): string {
  const qty = row.transferred ?? 0;
  const brand = row.brand?.trim();
  const sc = row.styleCode?.trim();
  if (brand && sc) return `${brand} · ${qty.toLocaleString()}`;
  if (brand) return `${brand} · ${qty.toLocaleString()}`;
  if (sc) return `${sc.slice(0, 10)}… · ${qty.toLocaleString()}`;
  return qty.toLocaleString();
}
