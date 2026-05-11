import type { CriticalRow } from "../hooks/useCriticalRequisitionList";
import type { Supplier, SupplierYarnDetail } from "@/shared/services/supplierService";

/**
 * Stable label compare: trim, lowercase, collapse inner whitespace (matches typical catalog naming drift).
 */
function normalizeYarnLabel(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Parses a Mongo/ObjectId-ish value from populated catalog refs.
 */
function yarnCatalogStringId(raw: unknown): string | undefined {
  if (!raw || raw === "") return undefined;
  if (typeof raw === "string") {
    const t = raw.trim().toLowerCase();
    return t || undefined;
  }
  if (typeof raw === "object" && raw !== null) {
    const o = raw as Record<string, unknown>;
    if (typeof o.$oid === "string") {
      const t = o.$oid.trim().toLowerCase();
      return t || undefined;
    }
    return (
      yarnCatalogStringId(o._id) ??
      yarnCatalogStringId(o.id)
    );
  }
  return undefined;
}

/**
 * Resolves normalized catalog id from a supplier yarn line (direct field or embedded catalog).
 */
function detailCatalogId(detail: SupplierYarnDetail): string | undefined {
  const direct = yarnCatalogStringId(detail.yarnCatalogId);
  if (direct) return direct;
  const ref = detail.yarnCatalog;
  if (typeof ref === "string") {
    const t = ref.trim().toLowerCase();
    return t || undefined;
  }
  if (ref && typeof ref === "object") {
    return yarnCatalogStringId(ref);
  }
  return undefined;
}

/**
 * Yarn display name from a supplier detail line (`yarnName` preferred; falls back to `yarn` string field).
 */
function detailYarnName(detail: SupplierYarnDetail): string {
  if (detail.yarnName) return normalizeYarnLabel(detail.yarnName);
  if (typeof detail.yarn === "string") return normalizeYarnLabel(detail.yarn);
  return "";
}

/**
 * True when the supplier carries this requisition yarn in embedded `yarnDetails`.
 * Prefers catalog id match when both sides expose it; otherwise compares normalized yarn names.
 */
export function supplierListsThisCriticalYarn(supplier: Supplier, row: CriticalRow): boolean {
  const details = supplier.yarnDetails;
  if (!details?.length) return false;

  const rowCatalog = row.yarnCatalogId
    ? String(row.yarnCatalogId).trim().toLowerCase()
    : "";
  const rowName = normalizeYarnLabel(row.yarnName);

  for (const d of details) {
    const dCat = detailCatalogId(d);
    if (rowCatalog && dCat && rowCatalog === dCat) {
      return true;
    }
  }

  if (rowCatalog) {
    /* Supplier line may omit catalog ref but match by yarn label (migration / legacy data). */
    for (const d of details) {
      const dCat = detailCatalogId(d);
      if (dCat) continue;
      const dn = detailYarnName(d);
      if (dn && rowName && dn === rowName) {
        return true;
      }
    }
    return false;
  }

  if (!rowName) return false;

  for (const d of details) {
    const dn = detailYarnName(d);
    if (dn === rowName) return true;
  }
  return false;
}

/** Minimal shape rendered in `<select>` options. */
export type VendorDropdownOption = Pick<Supplier, "id" | "brandName">;

/**
 * Vendors eligible for the row dropdown: suppliers whose `yarnDetails` include this yarn.
 * If a saved preferred vendor no longer qualifies, it is still listed last so the current value stays valid.
 *
 * @param row - Mapped requisition table row (`yarnCatalogId` when API provides it).
 * @param allSuppliers - Loaded supplier list including `yarnDetails`.
 */
export function vendorsForCriticalRow(
  row: CriticalRow,
  allSuppliers: Supplier[]
): VendorDropdownOption[] {
  const filtered = allSuppliers
    .filter((s) => supplierListsThisCriticalYarn(s, row))
    .map((s) => ({
      id: s.id,
      brandName: s.brandName?.trim() || s.id,
    }))
    .sort((a, b) => (a.brandName || "").localeCompare(b.brandName || "", undefined, { sensitivity: "base" }));

  const prefId = row.preferredSupplierId?.trim();
  if (!prefId) return filtered;

  if (filtered.some((x) => x.id === prefId)) return filtered;

  const prefFull = allSuppliers.find((s) => s.id === prefId);
  const baseName =
    prefFull?.brandName?.trim() ||
    row.preferredSupplierDisplayName?.trim() ||
    prefId;

  return [...filtered, { id: prefId, brandName: `${baseName} (not catalogued for this yarn)` }];
}
