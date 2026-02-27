export interface Vendor {
  id: string;
  vendorCode: string;
  vendorName: string;
  contactPerson: string;
  phone: string;
  city?: string;
  status: 'active' | 'inactive';
  email?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type VendorFormData = Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>;
