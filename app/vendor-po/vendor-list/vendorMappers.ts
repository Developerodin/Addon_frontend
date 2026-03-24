import type { VendorManagementDocument } from '@/shared/services/vendorManagementService';
import type { Vendor, VendorContactPerson } from './types';

/** Normalize API status to UI literal. */
function normalizeStatus(s: string | undefined): 'active' | 'inactive' {
  return s?.toLowerCase() === 'inactive' ? 'inactive' : 'active';
}

/**
 * Maps a vendor-management API document to the flat `Vendor` shape used in tables and PO dropdowns.
 */
export function mapVendorDocToVendor(doc: VendorManagementDocument): Vendor {
  const h = doc.header;
  const persons = doc.contactPersons ?? [];
  const first = persons[0];
  return {
    id: doc.id,
    vendorCode: h.vendorCode,
    vendorName: h.vendorName,
    status: normalizeStatus(h.status),
    city: h.city,
    state: h.state,
    notes: h.notes,
    address: h.address,
    gstin: h.gstin,
    contactPerson: first?.contactName ?? '',
    phone: first?.phone ?? '',
    email: first?.email,
    contactPersons: persons.map(
      (p): VendorContactPerson => ({
        contactName: p.contactName,
        phone: p.phone,
        email: p.email,
      })
    ),
  };
}
