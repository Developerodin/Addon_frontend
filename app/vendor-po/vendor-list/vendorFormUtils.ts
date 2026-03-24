import type { VendorManagementDocument } from "@/shared/services/vendorManagementService";
import { getProductById } from "@/shared/services/productService";
import type { CatalogProductPick } from "./components/CatalogProductPickerDrawer";
import { createEmptyContactRow, type ContactRow, type VendorFormData } from "./vendorFormTypes";
import { isGstinOptional, isPhonePolicyOk } from "./vendorValidation";

/** Client validation — same rules as add page. */
export function validateVendorForm(formData: VendorFormData): Record<string, string> {
  const newErrors: Record<string, string> = {};
  if (!formData.vendorCode.trim()) {
    newErrors.vendorCode = "Vendor Code is required";
  }
  if (!formData.vendorName.trim()) {
    newErrors.vendorName = "Vendor Name is required";
  }
  if (!isGstinOptional(formData.gstin)) {
    newErrors.gstin = "Enter a valid 15-character GSTIN or leave empty";
  }
  const firstContact = formData.contacts[0];
  if (!firstContact.contactName.trim()) {
    newErrors.contact_0_name = "At least one contact name is required";
  }
  if (!firstContact.phone.trim()) {
    newErrors.contact_0_phone = "At least one contact phone is required";
  } else if (!isPhonePolicyOk(firstContact.phone)) {
    newErrors.contact_0_phone = "Phone must be 10–15 digits (digits/spaces/dashes allowed)";
  }
  for (let i = 1; i < formData.contacts.length; i++) {
    const c = formData.contacts[i];
    if (c.phone.trim() && !isPhonePolicyOk(c.phone)) {
      newErrors[`contact_${i}_phone`] = "Phone must be 10–15 digits";
    }
  }
  return newErrors;
}

/** Map API vendor document to form state (edit page load). */
export function vendorManagementDocToForm(doc: VendorManagementDocument): VendorFormData {
  const h = doc.header;
  const persons = doc.contactPersons ?? [];
  const contacts: ContactRow[] = persons.length
    ? persons.map((c, i) => ({
        id: `contact-${i}-${String(c.phone ?? i)}`,
        contactName: c.contactName ?? "",
        phone: c.phone ?? "",
        email: c.email ?? "",
      }))
    : [createEmptyContactRow()];
  return {
    vendorCode: h.vendorCode,
    vendorName: h.vendorName,
    status: h.status?.toLowerCase() === "inactive" ? "inactive" : "active",
    notes: h.notes ?? "",
    city: h.city ?? "",
    state: h.state ?? "",
    address: h.address ?? "",
    gstin: h.gstin ?? "",
    contacts,
  };
}

/** First non-empty string among keys (camelCase + snake_case). */
function pickProductString(o: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return undefined;
}

/**
 * Map linked products (ids or populated objects) to catalog picker rows.
 * Factory column uses only `factoryCode` / `factory_code` (not software/internal — `enrichCatalogPicks` fills via GET product).
 */
export function mapDocProductsToCatalogPicks(doc: VendorManagementDocument): CatalogProductPick[] {
  const raw = doc.products ?? [];
  return raw.map((p) => {
    if (typeof p === "string") {
      return { id: p, name: "—", factoryCode: undefined, vendorCode: undefined };
    }
    const o = p as Record<string, unknown>;
    const id = String(o.id ?? o._id ?? "");
    const name = pickProductString(o, ["name"]) ?? "—";
    /** Only real factory fields — never software/internal (different semantics; populate often omits factoryCode). */
    const factoryCode = pickProductString(o, ["factoryCode", "factory_code"]);
    const vendorCode = pickProductString(o, ["vendorCode", "vendor_code"]);
    return {
      id,
      name,
      factoryCode,
      vendorCode,
    };
  });
}

/**
 * When vendor `populate=products` omits factory/vendor codes (or uses partial fields), load full product rows.
 */
export async function enrichCatalogPicks(picks: CatalogProductPick[]): Promise<CatalogProductPick[]> {
  return Promise.all(
    picks.map(async (p) => {
      const hasFactory = !!(p.factoryCode && String(p.factoryCode).trim());
      const hasVendor = !!(p.vendorCode && String(p.vendorCode).trim());
      if (hasFactory && hasVendor) return p;
      const detail = await getProductById(p.id);
      if (!detail) return p;
      const o = detail as Record<string, unknown>;
      const factoryCode = hasFactory
        ? p.factoryCode
        : pickProductString(o, ["factoryCode", "factory_code"]);
      const vendorCode = hasVendor
        ? p.vendorCode
        : pickProductString(o, ["vendorCode", "vendor_code"]);
      const name =
        p.name && p.name !== "—" ? p.name : pickProductString(o, ["name"]) ?? p.name;
      return {
        ...p,
        name,
        factoryCode: factoryCode ?? p.factoryCode,
        vendorCode: vendorCode ?? p.vendorCode,
      };
    })
  );
}
