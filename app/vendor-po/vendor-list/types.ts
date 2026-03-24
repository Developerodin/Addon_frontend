/** Single contact row (API + UI). */
export interface VendorContactPerson {
  contactName: string;
  phone: string;
  email?: string;
}

/** Flat vendor row for tables, modals, and Vendor PO dropdowns. */
export interface Vendor {
  id: string;
  vendorCode: string;
  vendorName: string;
  contactPerson: string;
  phone: string;
  city?: string;
  state?: string;
  notes?: string;
  gstin?: string;
  status: 'active' | 'inactive';
  email?: string;
  address?: string;
  /** Full list when loaded from API (view/edit). */
  contactPersons?: VendorContactPerson[];
  createdAt?: string;
  updatedAt?: string;
}

export type VendorFormData = Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>;
