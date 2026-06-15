import type { VendorPoApiStatus } from "@/shared/services/vendorPurchaseOrderService";

/** Role-based form modes for vendor PO raise add/edit. */
export type VendorPoRaiseFormMode = "full" | "user_draft" | "accounts_draft";

/** Field-level permissions derived from role + PO status. */
export type VendorPoFormFieldAccess = {
  mode: VendorPoRaiseFormMode;
  canEditHeader: boolean;
  canEditUserLineFields: boolean;
  canEditPricingFields: boolean;
  canEditRemarks: boolean;
  canAddLines: boolean;
  canRemoveLines: boolean;
  showPricingColumns: boolean;
  showOrderTotals: boolean;
  showSaveDraft: boolean;
  showSubmitToVendor: boolean;
};

/** Roles with unrestricted vendor PO raise access (same as legacy admin UI). */
const VENDOR_PO_FULL_ACCESS_ROLES = new Set(["admin", "super_admin"]);

/**
 * Normalize role slug from auth/API (handles casing and legacy variants).
 * @param role - Raw role from auth state
 */
export function normalizeUserRole(role?: string | null): string {
  const raw = String(role || "").trim().toLowerCase();
  if (!raw) return "user";
  const slug = raw.replace(/[\s-]+/g, "_");
  if (slug === "superadmin" || slug === "super_admin") return "super_admin";
  return slug;
}

/**
 * Whether role has full vendor PO raise field access.
 * @param role - User role from auth state
 */
export function hasFullVendorPoRaiseAccess(role?: string | null): boolean {
  return VENDOR_PO_FULL_ACCESS_ROLES.has(normalizeUserRole(role));
}

/**
 * Resolve vendor PO raise form mode from authenticated user role.
 * @param role - User role from auth state
 */
export function getVendorPoRaiseFormMode(role?: string | null): VendorPoRaiseFormMode {
  const r = normalizeUserRole(role);
  if (hasFullVendorPoRaiseAccess(r)) return "full";
  if (r === "accounts") return "accounts_draft";
  if (r === "user") return "user_draft";
  return "full";
}

/**
 * Whether the role may open the add PO page.
 * @param role - User role
 */
export function canAccessVendorPoRaiseAdd(role?: string | null): boolean {
  return getVendorPoRaiseFormMode(role) !== "accounts_draft";
}

/**
 * Whether the role may open edit for a given API status.
 * @param role - User role
 * @param apiStatus - PO currentStatus from API
 */
export function canAccessVendorPoRaiseEdit(role?: string | null, apiStatus?: VendorPoApiStatus | null): boolean {
  const mode = getVendorPoRaiseFormMode(role);
  if (mode === "full") return true;
  return apiStatus === "draft";
}

/**
 * Whether list row should show the edit action for this PO.
 * @param role - User role
 * @param apiStatus - PO currentStatus from API
 */
export function canShowVendorPoRaiseEditLink(
  role?: string | null,
  apiStatus?: VendorPoApiStatus | null
): boolean {
  const mode = getVendorPoRaiseFormMode(role);
  if (mode === "full") {
    return apiStatus === "draft" || apiStatus === "submitted_to_vendor";
  }
  return apiStatus === "draft";
}

/**
 * Build granular field access for the PO form UI.
 * @param mode - Form mode from role
 * @param apiStatus - Existing PO status; omit on create (treated as draft)
 * @param workflowLocked - True when PO is past editable workflow (e.g. in transit)
 */
export function getVendorPoFormFieldAccess(
  mode: VendorPoRaiseFormMode,
  apiStatus?: VendorPoApiStatus | null,
  workflowLocked = false
): VendorPoFormFieldAccess {
  const isDraft = !apiStatus || apiStatus === "draft";
  const editable = isDraft && !workflowLocked;

  if (mode === "full") {
    return {
      mode,
      canEditHeader: !workflowLocked,
      canEditUserLineFields: !workflowLocked,
      canEditPricingFields: !workflowLocked,
      canEditRemarks: !workflowLocked,
      canAddLines: !workflowLocked,
      canRemoveLines: !workflowLocked,
      showPricingColumns: true,
      showOrderTotals: true,
      showSaveDraft: editable,
      showSubmitToVendor: !workflowLocked,
    };
  }

  if (mode === "user_draft") {
    return {
      mode,
      canEditHeader: editable,
      canEditUserLineFields: editable,
      canEditPricingFields: false,
      canEditRemarks: false,
      canAddLines: editable,
      canRemoveLines: editable,
      showPricingColumns: false,
      showOrderTotals: false,
      showSaveDraft: editable,
      showSubmitToVendor: false,
    };
  }

  return {
    mode: "accounts_draft",
    canEditHeader: false,
    canEditUserLineFields: false,
    canEditPricingFields: editable,
    canEditRemarks: false,
    canAddLines: false,
    canRemoveLines: editable,
    showPricingColumns: true,
    showOrderTotals: true,
    showSaveDraft: editable,
    showSubmitToVendor: editable,
  };
}

/**
 * Human-readable role label for list badges.
 * @param role - Stored user role slug
 */
export function formatVendorPoRoleLabel(role?: string | null): string {
  const r = String(role || "").trim();
  if (!r) return "User";
  return r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
