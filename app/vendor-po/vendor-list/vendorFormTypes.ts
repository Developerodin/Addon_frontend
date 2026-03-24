/** Shared vendor add/edit form shape. */

export interface ContactRow {
  id: string;
  contactName: string;
  phone: string;
  email: string;
}

export interface VendorFormData {
  vendorCode: string;
  vendorName: string;
  status: "active" | "inactive";
  notes: string;
  city: string;
  state: string;
  address: string;
  gstin: string;
  contacts: ContactRow[];
}

export const createEmptyContactRow = (): ContactRow => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  contactName: "",
  phone: "",
  email: "",
});
