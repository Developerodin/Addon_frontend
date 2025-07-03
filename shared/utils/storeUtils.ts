import { CreateStoreData, Store } from '@/shared/services/storeService';
import * as XLSX from 'xlsx';

export interface StoreImportRow {
  storeId: string;
  storeName: string;
  city: string;
  addressLine1: string;
  addressLine2?: string;
  storeNumber: string;
  pincode: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  creditRating: string;
  isActive: string;
}

export const validateStoreData = (data: StoreImportRow): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.storeId?.trim()) {
    errors.push('Store ID is required');
  } else if (!/^[A-Z0-9]+$/.test(data.storeId)) {
    errors.push('Store ID must contain only uppercase letters and numbers');
  }

  if (!data.storeName?.trim()) {
    errors.push('Store name is required');
  }

  if (!data.city?.trim()) {
    errors.push('City is required');
  }

  if (!data.addressLine1?.trim()) {
    errors.push('Address is required');
  }

  if (!data.storeNumber?.trim()) {
    errors.push('Store number is required');
  }

  if (!data.pincode?.trim()) {
    errors.push('Pincode is required');
  } else if (!/^\d{6}$/.test(data.pincode)) {
    errors.push('Pincode must be exactly 6 digits');
  }

  if (!data.contactPerson?.trim()) {
    errors.push('Contact person is required');
  }

  if (!data.contactEmail?.trim()) {
    errors.push('Contact email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail)) {
    errors.push('Please enter a valid email address');
  }

  if (!data.contactPhone?.trim()) {
    errors.push('Contact phone is required');
  } else if (!/^[\+]?[0-9\s\-\(\)]{10,15}$/.test(data.contactPhone.replace(/\s/g, ''))) {
    errors.push('Please enter a valid phone number');
  }

  const validCreditRatings = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'];
  if (!data.creditRating || !validCreditRatings.includes(data.creditRating)) {
    errors.push('Credit rating must be one of: A+, A, A-, B+, B, B-, C+, C, C-, D, F');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const parseExcelFile = (file: File): Promise<{ data: StoreImportRow[]; errors: string[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as StoreImportRow[];

        const errors: string[] = [];
        const validData: StoreImportRow[] = [];

        jsonData.forEach((row, index) => {
          const validation = validateStoreData(row);
          if (!validation.isValid) {
            errors.push(`Row ${index + 2}: ${validation.errors.join(', ')}`);
          } else {
            validData.push(row);
          }
        });

        resolve({ data: validData, errors });
      } catch (error) {
        reject(new Error('Failed to parse Excel file'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

export const convertToCreateStoreData = (row: StoreImportRow): CreateStoreData => {
  return {
    storeId: row.storeId.toUpperCase(),
    storeName: row.storeName.trim(),
    city: row.city.trim(),
    addressLine1: row.addressLine1.trim(),
    addressLine2: row.addressLine2?.trim() || '',
    storeNumber: row.storeNumber.trim(),
    pincode: row.pincode.trim(),
    contactPerson: row.contactPerson.trim(),
    contactEmail: row.contactEmail.toLowerCase().trim(),
    contactPhone: row.contactPhone.trim(),
    creditRating: row.creditRating as CreateStoreData['creditRating'],
    isActive: row.isActive?.toLowerCase() === 'true' || row.isActive?.toLowerCase() === 'yes' || row.isActive?.toLowerCase() === '1'
  };
};

export const exportStoresToExcel = (stores: Store[], filename: string = 'stores-export.xlsx') => {
  const exportData = stores.map(store => ({
    'Store ID': store.storeId,
    'Store Name': store.storeName,
    'City': store.city,
    'Address Line 1': store.addressLine1,
    'Address Line 2': store.addressLine2 || '',
    'Store Number': store.storeNumber,
    'Pincode': store.pincode,
    'Contact Person': store.contactPerson,
    'Contact Email': store.contactEmail,
    'Contact Phone': store.contactPhone,
    'Credit Rating': store.creditRating,
    'Status': store.isActive ? 'Active' : 'Inactive',
    'Created At': new Date(store.createdAt).toLocaleDateString(),
    'Updated At': new Date(store.updatedAt).toLocaleDateString()
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Stores');
  
  // Auto-size columns
  const maxWidth = exportData.reduce((w, r) => Math.max(w, r['Store Name'].length), 10);
  worksheet['!cols'] = [{ wch: maxWidth }];

  XLSX.writeFile(workbook, filename);
};

export const generateSampleTemplate = () => {
  const sampleData = [
    {
      'Store ID': 'STORE001',
      'Store Name': 'Main Street Store',
      'City': 'Mumbai',
      'Address Line 1': '123 Main Street',
      'Address Line 2': 'Building A',
      'Store Number': 'A101',
      'Pincode': '400001',
      'Contact Person': 'John Doe',
      'Contact Email': 'john.doe@store.com',
      'Contact Phone': '+91-9876543210',
      'Credit Rating': 'A+',
      'Is Active': 'true'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
  
  XLSX.writeFile(workbook, 'store-import-template.xlsx');
}; 